import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { insightSchema, type Insight } from "@atlas/contracts";

import { parseRequest } from "../../../infrastructure/http/parse-request.js";
import type { AuthenticatedPrincipal } from "../../identity/application/jwt-verifier.js";
import { CurrentPrincipal } from "../../identity/presentation/current-principal.decorator.js";
import { RequirePermission } from "../../identity/presentation/require-permission.decorator.js";
import { InsightsService } from "../application/insights.service.js";

@ApiTags("insights")
@ApiBearerAuth()
@Controller("/v1/insights")
export class InsightsController {
  public constructor(private readonly insightsService: InsightsService) {}

  @Get()
  @RequirePermission("insight:read")
  @ApiOperation({ summary: "List explainable insights for the current organization." })
  public async list(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Query("repositoryId") repositoryId?: string
  ): Promise<Insight[]> {
    return parseRequest(
      insightSchema.array(),
      await this.insightsService.list(principal, repositoryId)
    );
  }
}
