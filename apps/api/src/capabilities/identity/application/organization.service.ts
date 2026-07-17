import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";

import type {
  AcceptInvitationRequest,
  AuthTokenResponse,
  CreateInvitationRequest,
  CreateInvitationResponse,
  CreateOrganizationRequest,
  Invitation,
  Membership,
  OrganizationSummary,
  UpdateMembershipRequest
} from "@atlas/contracts";
import type { Prisma } from "@atlas/database";
import { permissionsForRole, roleHasPermission } from "@atlas/domain";

import { PrismaService } from "../../../infrastructure/database/prisma.service.js";
import type { AuthenticatedPrincipal } from "./jwt-verifier.js";
import { IdentityService } from "./identity.service.js";

@Injectable()
export class OrganizationService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly identityService: IdentityService
  ) {}

  public async listOrganizations(
    principal: AuthenticatedPrincipal
  ): Promise<OrganizationSummary[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId: principal.userId, status: "active" },
      include: { organization: true },
      orderBy: { createdAt: "asc" }
    });

    return memberships.map((membership) => this.identityService.toOrganizationSummary(membership));
  }

  public async createOrganization(
    principal: AuthenticatedPrincipal,
    input: CreateOrganizationRequest,
    correlationId: string
  ): Promise<AuthTokenResponse> {
    if (!roleHasPermission(principal.role, "organization:create")) {
      throw new ForbiddenException("The authenticated principal cannot create organizations.");
    }

    const organization = await this.prisma.organization.create({
      data: {
        slug: input.slug,
        displayName: input.displayName,
        memberships: {
          create: {
            userId: principal.userId,
            role: "owner",
            status: "active"
          }
        }
      }
    });

    await this.prisma.auditEvent.create({
      data: {
        organizationId: organization.id,
        actorId: principal.userId,
        eventName: "organization.created",
        targetType: "organization",
        targetId: organization.id,
        correlationId,
        metadata: { slug: organization.slug }
      }
    });

    return this.switchOrganization(principal.userId, organization.id, principal, correlationId);
  }

  public async switchOrganization(
    userId: string,
    organizationId: string,
    principal: AuthenticatedPrincipal | null,
    correlationId: string
  ): Promise<AuthTokenResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { status: "active" },
          include: { organization: true },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (user === null) {
      throw new NotFoundException("Authenticated user was not found.");
    }

    const selectedMembership = user.memberships.find(
      (membership) => membership.organizationId === organizationId
    );

    if (selectedMembership === undefined) {
      throw new ForbiddenException("The authenticated user is not a member of this organization.");
    }

    await this.prisma.auditEvent.create({
      data: {
        organizationId,
        actorId: userId,
        eventName: "organization.switched",
        targetType: "organization",
        targetId: organizationId,
        correlationId,
        metadata: {
          previousOrganizationId: principal?.organizationId ?? null
        }
      }
    });

    return this.identityService.createTokenResponse(user, selectedMembership);
  }

  public async listMemberships(
    principal: AuthenticatedPrincipal,
    organizationId: string
  ): Promise<Membership[]> {
    this.assertSameOrganization(principal, organizationId);

    const memberships = await this.prisma.membership.findMany({
      where: { organizationId },
      include: { user: true },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }]
    });

    return memberships.map((membership) => ({
      id: membership.id,
      organizationId: membership.organizationId,
      userId: membership.userId,
      email: membership.user.email,
      name: membership.user.name,
      imageUrl: membership.user.imageUrl,
      role: membership.role,
      status: membership.status,
      createdAt: membership.createdAt.toISOString()
    }));
  }

  public async updateMembership(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    membershipId: string,
    input: UpdateMembershipRequest,
    correlationId: string
  ): Promise<Membership> {
    this.assertSameOrganization(principal, organizationId);

    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
      include: { user: true }
    });

    if (membership === null || membership.organizationId !== organizationId) {
      throw new NotFoundException("Membership was not found.");
    }

    if (
      membership.userId === principal.userId &&
      membership.role === "owner" &&
      (input.role !== undefined || input.status === "disabled")
    ) {
      throw new ConflictException("Owners cannot demote or disable their own membership.");
    }

    const data: Prisma.MembershipUpdateInput = {};

    if (input.role !== undefined) {
      data.role = input.role;
    }

    if (input.status !== undefined) {
      data.status = input.status;
    }

    const updated = await this.prisma.membership.update({
      where: { id: membershipId },
      data,
      include: { user: true }
    });

    await this.prisma.auditEvent.create({
      data: {
        organizationId,
        actorId: principal.userId,
        eventName: "membership.updated",
        targetType: "membership",
        targetId: membershipId,
        correlationId,
        metadata: {
          previousRole: membership.role,
          newRole: updated.role,
          previousStatus: membership.status,
          newStatus: updated.status
        }
      }
    });

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      userId: updated.userId,
      email: updated.user.email,
      name: updated.user.name,
      imageUrl: updated.user.imageUrl,
      role: updated.role,
      status: updated.status,
      createdAt: updated.createdAt.toISOString()
    };
  }

  public async listInvitations(
    principal: AuthenticatedPrincipal,
    organizationId: string
  ): Promise<Invitation[]> {
    this.assertSameOrganization(principal, organizationId);

    const invitations = await this.prisma.invitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" }
    });

    return invitations.map((invitation) => ({
      id: invitation.id,
      organizationId: invitation.organizationId,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      invitedByUserId: invitation.invitedByUserId,
      acceptedByUserId: invitation.acceptedByUserId,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString()
    }));
  }

  public async createInvitation(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    input: CreateInvitationRequest,
    correlationId: string
  ): Promise<CreateInvitationResponse> {
    this.assertSameOrganization(principal, organizationId);

    const invitationToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitation = await this.prisma.invitation.create({
      data: {
        organizationId,
        email: input.email.toLowerCase(),
        role: input.role,
        tokenHash: this.hashInvitationToken(invitationToken),
        invitedByUserId: principal.userId,
        expiresAt
      }
    });

    await this.prisma.auditEvent.create({
      data: {
        organizationId,
        actorId: principal.userId,
        eventName: "invitation.created",
        targetType: "invitation",
        targetId: invitation.id,
        correlationId,
        metadata: { email: invitation.email, role: invitation.role }
      }
    });

    return {
      invitation: {
        id: invitation.id,
        organizationId: invitation.organizationId,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        invitedByUserId: invitation.invitedByUserId,
        acceptedByUserId: invitation.acceptedByUserId,
        expiresAt: invitation.expiresAt.toISOString(),
        createdAt: invitation.createdAt.toISOString()
      },
      invitationToken
    };
  }

  public async acceptInvitation(
    principal: AuthenticatedPrincipal,
    input: AcceptInvitationRequest,
    correlationId: string
  ): Promise<AuthTokenResponse> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: this.hashInvitationToken(input.invitationToken) }
    });

    if (invitation === null || invitation.status !== "pending") {
      throw new NotFoundException("Invitation was not found.");
    }

    if (invitation.expiresAt.getTime() <= Date.now()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "expired" }
      });
      throw new ConflictException("Invitation has expired.");
    }

    if (invitation.email.toLowerCase() !== principal.email.toLowerCase()) {
      throw new ForbiddenException("Invitation email does not match the authenticated user.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.membership.upsert({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId: principal.userId
          }
        },
        update: {
          role: invitation.role,
          status: "active"
        },
        create: {
          organizationId: invitation.organizationId,
          userId: principal.userId,
          role: invitation.role,
          status: "active"
        }
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: "accepted",
          acceptedByUserId: principal.userId
        }
      });

      await tx.auditEvent.create({
        data: {
          organizationId: invitation.organizationId,
          actorId: principal.userId,
          eventName: "invitation.accepted",
          targetType: "invitation",
          targetId: invitation.id,
          correlationId,
          metadata: { role: invitation.role }
        }
      });
    });

    return this.switchOrganization(
      principal.userId,
      invitation.organizationId,
      principal,
      correlationId
    );
  }

  public async getCurrentOrganization(
    principal: AuthenticatedPrincipal
  ): Promise<OrganizationSummary> {
    const membership = await this.prisma.membership.findFirst({
      where: {
        organizationId: principal.organizationId,
        userId: principal.userId,
        status: "active"
      },
      include: { organization: true }
    });

    if (membership === null) {
      throw new ForbiddenException("Current organization membership is not active.");
    }

    const role = membership.role;
    return {
      id: membership.organization.id,
      slug: membership.organization.slug,
      displayName: membership.organization.displayName,
      role,
      permissions: [...permissionsForRole(role)]
    };
  }

  private assertSameOrganization(principal: AuthenticatedPrincipal, organizationId: string): void {
    if (principal.organizationId !== organizationId) {
      throw new ForbiddenException("Cross-organization access is not permitted.");
    }
  }

  private hashInvitationToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
