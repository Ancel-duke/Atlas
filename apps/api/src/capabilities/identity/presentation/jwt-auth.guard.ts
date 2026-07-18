import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { permissionsForRole, roleHasPermission, type OrganizationPermission } from "@atlas/domain";

import { PrismaService } from "../../../infrastructure/database/prisma.service.js";
import { JwtVerifier } from "../application/jwt-verifier.js";
import type { AuthenticatedRequest } from "./authenticated-request.js";
import { isPublicRouteMetadataKey } from "./public.decorator.js";
import { requiredPermissionsMetadataKey } from "./require-permission.decorator.js";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  public constructor(
    private readonly reflector: Reflector,
    private readonly jwtVerifier: JwtVerifier,
    private readonly prisma: PrismaService
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(isPublicRouteMetadataKey, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic === true) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const principal = await this.jwtVerifier.verify(request.header("authorization"));
    const activePrincipal = await this.activePrincipal(principal);
    const requiredPermissions = this.reflector.getAllAndOverride<OrganizationPermission[]>(
      requiredPermissionsMetadataKey,
      [context.getHandler(), context.getClass()]
    );

    if (requiredPermissions !== undefined) {
      const isAuthorized = requiredPermissions.every((permission) =>
        roleHasPermission(activePrincipal.role, permission)
      );

      if (!isAuthorized) {
        throw new ForbiddenException("The authenticated principal lacks the required permission.");
      }
    }

    Object.defineProperty(request, "principal", {
      value: activePrincipal,
      enumerable: true,
      configurable: false,
      writable: false
    });

    return true;
  }

  private async activePrincipal(principal: AuthenticatedRequest["principal"]) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: principal.userId,
        organizationId: principal.organizationId,
        status: "active"
      },
      include: { organization: true }
    });

    if (membership === null) {
      throw new ForbiddenException("Current organization membership is not active.");
    }

    const role = membership.role;
    return {
      ...principal,
      organizationSlug: membership.organization.slug,
      role,
      permissions: [...permissionsForRole(role)]
    };
  }
}
