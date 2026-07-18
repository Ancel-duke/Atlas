import { Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { pulseAssessmentSchema, type PulseAssessment } from "@atlas/contracts";

import { parseRequest } from "../../../infrastructure/http/parse-request.js";
import type { AuthenticatedPrincipal } from "../../identity/application/jwt-verifier.js";
import { CurrentPrincipal } from "../../identity/presentation/current-principal.decorator.js";
import { RequirePermission } from "../../identity/presentation/require-permission.decorator.js";
import { RepositoryPulseService } from "../application/repository-pulse.service.js";

@ApiTags("repository-pulse")
@ApiBearerAuth()
@Controller("/v1/repositories/:repositoryId/pulse")
export class RepositoryPulseController {
  public constructor(private readonly pulseService: RepositoryPulseService) {}

  @Get()
  @RequirePermission("pulse:read")
  @ApiOperation({
    summary: "Get the latest explainable Repository Pulse assessment, calculating one if needed."
  })
  public async getPulse(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("repositoryId") repositoryId: string
  ): Promise<PulseAssessment> {
    const assessment = await this.pulseService.getOrCalculatePulse(principal, repositoryId);
    return parseRequest(pulseAssessmentSchema, assessment);
  }

  @Post("/assessments")
  @RequirePermission("pulse:read")
  @ApiOperation({ summary: "Calculate and persist a new explainable Repository Pulse assessment." })
  public async calculatePulse(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("repositoryId") repositoryId: string
  ): Promise<PulseAssessment> {
    const assessment = await this.pulseService.calculatePulse(principal, repositoryId);
    return parseRequest(pulseAssessmentSchema, assessment);
  }

  @Get("/history")
  @RequirePermission("pulse:read")
  @ApiOperation({ summary: "List historical Repository Pulse assessments for trend analysis." })
  public async listHistory(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("repositoryId") repositoryId: string
  ): Promise<PulseAssessment[]> {
    const history = await this.pulseService.listHistory(principal, repositoryId);
    return parseRequest(pulseAssessmentSchema.array(), history);
  }
}
