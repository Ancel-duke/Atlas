import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { createHash, timingSafeEqual } from "node:crypto";

import { parseServerEnvironment } from "@atlas/config";
import type {
  AuthTokenResponse,
  GitHubOAuthExchangeRequest,
  OrganizationSummary
} from "@atlas/contracts";
import { OrganizationRole as PrismaOrganizationRole } from "@atlas/database";
import { permissionsForRole, type OrganizationRole } from "@atlas/domain";

import { PrismaService } from "../../../infrastructure/database/prisma.service.js";
import { JwtVerifier } from "./jwt-verifier.js";

type ActiveMembershipRecord = {
  readonly organization: {
    readonly id: string;
    readonly slug: string;
    readonly displayName: string;
  };
  readonly role: PrismaOrganizationRole;
};

type UserRecord = {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
  readonly imageUrl: string | null;
  readonly memberships: readonly ActiveMembershipRecord[];
};

@Injectable()
export class IdentityService {
  private readonly environment = parseServerEnvironment(process.env);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly jwtVerifier: JwtVerifier
  ) {}

  public assertInternalSecret(headerValue: string | undefined): void {
    const expectedHash = Buffer.from(
      this.hashSecret(this.environment.ATLAS_INTERNAL_API_SECRET),
      "hex"
    );
    const actualHash = Buffer.from(this.hashSecret(headerValue ?? ""), "hex");

    if (!timingSafeEqual(expectedHash, actualHash)) {
      throw new UnauthorizedException("Internal authentication failed.");
    }
  }

  public async exchangeGitHubOAuth(
    input: GitHubOAuthExchangeRequest,
    correlationId: string
  ): Promise<AuthTokenResponse> {
    const normalizedEmail = input.email.toLowerCase();
    const user = await this.prisma.$transaction(async (tx) => {
      const existingAccount = await tx.externalAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "github",
            providerAccountId: input.providerAccountId
          }
        },
        include: {
          user: {
            include: {
              memberships: {
                where: { status: "active" },
                include: { organization: true },
                orderBy: { createdAt: "asc" }
              }
            }
          }
        }
      });

      if (existingAccount !== null) {
        await tx.user.update({
          where: { id: existingAccount.userId },
          data: {
            email: normalizedEmail,
            name: input.name,
            imageUrl: input.avatarUrl
          }
        });
        await tx.externalAccount.update({
          where: { id: existingAccount.id },
          data: {
            username: input.username,
            profileUrl: input.profileUrl,
            avatarUrl: input.avatarUrl
          }
        });

        return tx.user.findUniqueOrThrow({
          where: { id: existingAccount.userId },
          include: {
            memberships: {
              where: { status: "active" },
              include: { organization: true },
              orderBy: { createdAt: "asc" }
            }
          }
        });
      }

      const existingUser = await tx.user.findUnique({ where: { email: normalizedEmail } });
      const userRecord =
        existingUser ??
        (await tx.user.create({
          data: {
            email: normalizedEmail,
            name: input.name,
            imageUrl: input.avatarUrl
          }
        }));

      await tx.externalAccount.create({
        data: {
          userId: userRecord.id,
          provider: "github",
          providerAccountId: input.providerAccountId,
          username: input.username,
          profileUrl: input.profileUrl,
          avatarUrl: input.avatarUrl
        }
      });

      const activeMembershipCount = await tx.membership.count({
        where: { userId: userRecord.id, status: "active" }
      });

      if (activeMembershipCount === 0) {
        const organization = await tx.organization.create({
          data: {
            slug: await this.uniqueOrganizationSlug(input.username ?? normalizedEmail, tx),
            displayName: this.defaultOrganizationName(input.name, input.username, normalizedEmail)
          }
        });

        await tx.membership.create({
          data: {
            organizationId: organization.id,
            userId: userRecord.id,
            role: "owner",
            status: "active"
          }
        });

        await tx.auditEvent.create({
          data: {
            organizationId: organization.id,
            actorId: userRecord.id,
            eventName: "identity.github_oauth_first_organization_created",
            targetType: "organization",
            targetId: organization.id,
            correlationId,
            metadata: { provider: "github" }
          }
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: userRecord.id },
        include: {
          memberships: {
            where: { status: "active" },
            include: { organization: true },
            orderBy: { createdAt: "asc" }
          }
        }
      });
    });

    const selectedMembership = user.memberships[0];

    if (selectedMembership === undefined) {
      throw new ConflictException("Authenticated user has no active organization membership.");
    }

    await this.prisma.auditEvent.create({
      data: {
        organizationId: selectedMembership.organization.id,
        actorId: user.id,
        eventName: "identity.github_oauth_exchanged",
        targetType: "user",
        targetId: user.id,
        correlationId,
        metadata: { provider: "github" }
      }
    });

    return this.createTokenResponse(user, selectedMembership);
  }

  public async createTokenResponse(
    user: UserRecord,
    selectedMembership: ActiveMembershipRecord
  ): Promise<AuthTokenResponse> {
    const role = this.toDomainRole(selectedMembership.role);
    const token = await this.jwtVerifier.issueAccessToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      imageUrl: user.imageUrl,
      organizationId: selectedMembership.organization.id,
      organizationSlug: selectedMembership.organization.slug,
      role
    });

    const principal = {
      userId: user.id,
      email: user.email,
      name: user.name,
      imageUrl: user.imageUrl,
      organizationId: selectedMembership.organization.id,
      organizationSlug: selectedMembership.organization.slug,
      role,
      permissions: [...permissionsForRole(role)]
    };

    return {
      accessToken: token.accessToken,
      expiresAt: token.expiresAt.toISOString(),
      principal,
      organizations: user.memberships.map((membership) => this.toOrganizationSummary(membership))
    };
  }

  public toOrganizationSummary(membership: ActiveMembershipRecord): OrganizationSummary {
    const role = this.toDomainRole(membership.role);

    return {
      id: membership.organization.id,
      slug: membership.organization.slug,
      displayName: membership.organization.displayName,
      role,
      permissions: [...permissionsForRole(role)]
    };
  }

  public toDomainRole(role: PrismaOrganizationRole): OrganizationRole {
    return role satisfies OrganizationRole;
  }

  private hashSecret(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private defaultOrganizationName(
    name: string | null,
    username: string | null,
    email: string
  ): string {
    if (name !== null && name.trim().length > 0) {
      return `${name.trim()}'s Atlas Organization`;
    }

    if (username !== null && username.trim().length > 0) {
      return `${username.trim()}'s Atlas Organization`;
    }

    return `${email.split("@")[0]}'s Atlas Organization`;
  }

  private async uniqueOrganizationSlug(
    seed: string,
    tx: Pick<PrismaService, "organization">
  ): Promise<string> {
    const baseSlug = this.slugify(seed);

    for (let suffix = 0; suffix < 100; suffix += 1) {
      const candidate = suffix === 0 ? baseSlug : `${baseSlug}-${suffix + 1}`;
      const existing = await tx.organization.findUnique({ where: { slug: candidate } });

      if (existing === null) {
        return candidate;
      }
    }

    throw new ForbiddenException("Unable to allocate a unique organization slug.");
  }

  private slugify(value: string): string {
    const slug = value
      .toLowerCase()
      .replace(/@.*$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48)
      .replace(/-+$/g, "");

    return slug.length >= 2 ? slug : `atlas-${slug.padEnd(2, "0")}`;
  }
}
