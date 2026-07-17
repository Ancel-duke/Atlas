import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  authTokenResponseSchema,
  githubOAuthExchangeRequestSchema,
  type AuthTokenResponse
} from "@atlas/contracts";

import { parseRequest } from "../../../infrastructure/http/parse-request.js";
import { IdentityService } from "../application/identity.service.js";
import type { AuthenticatedPrincipal } from "../application/jwt-verifier.js";
import { CurrentPrincipal } from "./current-principal.decorator.js";
import { Public } from "./public.decorator.js";

@ApiTags("identity")
@ApiBearerAuth()
@Controller("/v1/identity")
export class IdentityController {
  public constructor(private readonly identityService: IdentityService) {}

  @Get("/session")
  @ApiOperation({ summary: "Validate the caller JWT and return principal metadata." })
  @ApiOkResponse({ description: "Authenticated principal metadata." })
  public getSession(@CurrentPrincipal() principal: AuthenticatedPrincipal): AuthenticatedPrincipal {
    return principal;
  }

  @Public()
  @Post("/oauth/github")
  @ApiOperation({ summary: "Exchange a verified Auth.js GitHub profile for an Atlas JWT." })
  @ApiOkResponse({ description: "Atlas access token and tenant-scoped principal." })
  public async exchangeGitHubOAuth(
    @Body() body: unknown,
    @Headers("x-atlas-internal-secret") internalSecret?: string,
    @Headers("x-correlation-id") correlationId?: string
  ): Promise<AuthTokenResponse> {
    this.identityService.assertInternalSecret(internalSecret);
    const response = await this.identityService.exchangeGitHubOAuth(
      parseRequest(githubOAuthExchangeRequestSchema, body),
      correlationId ?? crypto.randomUUID()
    );
    return parseRequest(authTokenResponseSchema, response);
  }
}
