import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { roleHasPermission, type OrganizationPermission } from "@atlas/domain";

import { JwtVerifier } from "../application/jwt-verifier.js";
import type { AuthenticatedRequest } from "./authenticated-request.js";
import { isPublicRouteMetadataKey } from "./public.decorator.js";
import { requiredPermissionsMetadataKey } from "./require-permission.decorator.js";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  public constructor(
    private readonly reflector: Reflector,
    private readonly jwtVerifier: JwtVerifier
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
    const requiredPermissions = this.reflector.getAllAndOverride<OrganizationPermission[]>(
      requiredPermissionsMetadataKey,
      [context.getHandler(), context.getClass()]
    );

    if (requiredPermissions !== undefined) {
      const isAuthorized = requiredPermissions.every((permission) =>
        roleHasPermission(principal.role, permission)
      );

      if (!isAuthorized) {
        throw new ForbiddenException("The authenticated principal lacks the required permission.");
      }
    }

    Object.defineProperty(request, "principal", {
      value: principal,
      enumerable: true,
      configurable: false,
      writable: false
    });

    return true;
  }
}
