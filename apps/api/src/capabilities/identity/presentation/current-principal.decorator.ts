import { createParamDecorator, UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";

import type { AuthenticatedPrincipal } from "../application/jwt-verifier.js";
import type { AuthenticatedRequest } from "./authenticated-request.js";

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPrincipal => {
    const request = context.switchToHttp().getRequest<Partial<AuthenticatedRequest>>();

    if (request.principal === undefined) {
      throw new UnauthorizedException("Authenticated principal is required.");
    }

    return request.principal;
  }
);
