import { Injectable, UnauthorizedException } from "@nestjs/common";
import { jwtVerify, SignJWT } from "jose";

import { parseServerEnvironment } from "@atlas/config";
import type { OrganizationPermission, OrganizationRole } from "@atlas/domain";
import { organizationRoles, permissionsForRole } from "@atlas/domain";

export type AuthenticatedPrincipal = {
  readonly userId: string;
  readonly email: string;
  readonly name: string | null;
  readonly imageUrl: string | null;
  readonly organizationId: string;
  readonly organizationSlug: string;
  readonly role: OrganizationRole;
  readonly permissions: readonly OrganizationPermission[];
  readonly issuer: string;
  readonly audience: string;
};

export type AccessTokenInput = {
  readonly userId: string;
  readonly email: string;
  readonly name: string | null;
  readonly imageUrl: string | null;
  readonly organizationId: string;
  readonly organizationSlug: string;
  readonly role: OrganizationRole;
};

export type AccessTokenResult = {
  readonly accessToken: string;
  readonly expiresAt: Date;
};

type AtlasJwtClaims = {
  readonly email?: unknown;
  readonly name?: unknown;
  readonly imageUrl?: unknown;
  readonly organizationId?: unknown;
  readonly organizationSlug?: unknown;
  readonly role?: unknown;
};

@Injectable()
export class JwtVerifier {
  private readonly environment = parseServerEnvironment(process.env);
  private readonly accessTokenLifetimeSeconds = 60 * 60;

  public async issueAccessToken(input: AccessTokenInput): Promise<AccessTokenResult> {
    const expiresAt = new Date(Date.now() + this.accessTokenLifetimeSeconds * 1000);
    const secret = new TextEncoder().encode(this.environment.ATLAS_JWT_SECRET);
    const accessToken = await new SignJWT({
      email: input.email,
      name: input.name,
      imageUrl: input.imageUrl,
      organizationId: input.organizationId,
      organizationSlug: input.organizationSlug,
      role: input.role
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(input.userId)
      .setIssuer(this.environment.ATLAS_JWT_ISSUER)
      .setAudience(this.environment.ATLAS_JWT_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .sign(secret);

    return { accessToken, expiresAt };
  }

  public async verify(authorizationHeader: string | undefined): Promise<AuthenticatedPrincipal> {
    if (authorizationHeader === undefined || !authorizationHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Bearer token is required.");
    }

    const token = authorizationHeader.slice("Bearer ".length);
    const secret = new TextEncoder().encode(this.environment.ATLAS_JWT_SECRET);
    const result = await jwtVerify(token, secret, {
      issuer: this.environment.ATLAS_JWT_ISSUER,
      audience: this.environment.ATLAS_JWT_AUDIENCE
    });

    const claims = result.payload as AtlasJwtClaims;
    const role = this.parseRole(claims.role);

    if (
      result.payload.sub === undefined ||
      typeof claims.email !== "string" ||
      typeof claims.organizationId !== "string" ||
      typeof claims.organizationSlug !== "string"
    ) {
      throw new UnauthorizedException("JWT is missing required Atlas identity claims.");
    }

    return {
      userId: result.payload.sub,
      email: claims.email,
      name: typeof claims.name === "string" ? claims.name : null,
      imageUrl: typeof claims.imageUrl === "string" ? claims.imageUrl : null,
      organizationId: claims.organizationId,
      organizationSlug: claims.organizationSlug,
      role,
      permissions: permissionsForRole(role),
      issuer: this.environment.ATLAS_JWT_ISSUER,
      audience: this.environment.ATLAS_JWT_AUDIENCE
    };
  }

  private parseRole(value: unknown): OrganizationRole {
    if (typeof value === "string" && organizationRoles.includes(value as OrganizationRole)) {
      return value as OrganizationRole;
    }

    throw new UnauthorizedException("JWT role claim is invalid.");
  }
}
