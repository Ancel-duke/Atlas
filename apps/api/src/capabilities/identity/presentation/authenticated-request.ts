import type { Request } from "express";

import type { AuthenticatedPrincipal } from "../application/jwt-verifier.js";

export type AuthenticatedRequest = Request & {
  readonly principal: AuthenticatedPrincipal;
};
