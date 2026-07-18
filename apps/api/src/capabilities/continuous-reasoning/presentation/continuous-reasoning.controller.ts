import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  createReasoningRunRequestSchema,
  reasoningRunSchema,
  uuidSchema,
  type ReasoningRun
} from "@atlas/contracts";

import { parseRequest } from "../../../infrastructure/http/parse-request.js";
import type { AuthenticatedPrincipal } from "../../identity/application/jwt-verifier.js";
import { CurrentPrincipal } from "../../identity/presentation/current-principal.decorator.js";
import { RequirePermission } from "../../identity/presentation/require-permission.decorator.js";
import { ContinuousReasoningOrchestrator } from "../application/continuous-reasoning-orchestrator.service.js";

@ApiTags("continuous-reasoning")
@ApiBearerAuth()
@Controller("/v1/reasoning")
export class ContinuousReasoningController {
  public constructor(private readonly orchestrator: ContinuousReasoningOrchestrator) {}

  @Post("/runs")
  @RequirePermission("reasoning:run")
  @ApiOperation({
    summary:
      "Package evidence, orchestrate specialist prompts, evaluate structured outputs, and persist supported insights."
  })
  public async createRun(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() body: unknown
  ): Promise<ReasoningRun> {
    const run = await this.orchestrator.createRun(
      principal,
      parseRequest(createReasoningRunRequestSchema, body)
    );
    return parseRequest(reasoningRunSchema, run);
  }

  @Get("/runs")
  @RequirePermission("reasoning:read")
  @ApiOperation({ summary: "List Continuous Reasoning runs for the current organization." })
  public async listRuns(
    @CurrentPrincipal() principal: AuthenticatedPrincipal
  ): Promise<ReasoningRun[]> {
    const runs = await this.orchestrator.listRuns(principal);
    return parseRequest(reasoningRunSchema.array(), runs);
  }

  @Get("/runs/:reasoningRunId")
  @RequirePermission("reasoning:read")
  @ApiOperation({
    summary: "Get a Continuous Reasoning run with prompts, evidence, outputs, and evaluation."
  })
  public async getRun(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("reasoningRunId") reasoningRunId: string
  ): Promise<ReasoningRun> {
    const run = await this.orchestrator.getRun(principal, parseRequest(uuidSchema, reasoningRunId));
    return parseRequest(reasoningRunSchema, run);
  }
}
