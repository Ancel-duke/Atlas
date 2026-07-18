import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import {
  reasoningEvaluationSchema,
  reasoningRunSchema,
  type CreateReasoningRunRequest,
  type ReasoningAgentOutput,
  type ReasoningConclusion,
  type ReasoningEvaluation,
  type ReasoningEvidencePackage,
  type ReasoningPrompt,
  type ReasoningRun
} from "@atlas/contracts";
import type { Prisma } from "@atlas/database";

import { PrismaService } from "../../../infrastructure/database/prisma.service.js";
import type { AuthenticatedPrincipal } from "../../identity/application/jwt-verifier.js";
import { ContinuousReasoningAgents } from "./continuous-reasoning.agents.js";
import { ReasoningEvidencePackager } from "./evidence-packager.service.js";
import { ReasoningEvaluationService } from "./reasoning-evaluation.service.js";

@Injectable()
export class ContinuousReasoningOrchestrator {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly agents: ContinuousReasoningAgents,
    private readonly evidencePackager: ReasoningEvidencePackager,
    private readonly evaluationService: ReasoningEvaluationService
  ) {}

  public async createRun(
    principal: AuthenticatedPrincipal,
    input: CreateReasoningRunRequest
  ): Promise<ReasoningRun> {
    if (input.repositoryId !== null) {
      await this.assertRepositoryBelongsToOrganization(
        principal.organizationId,
        input.repositoryId
      );
    }

    const evidencePackage = await this.evidencePackager.packageEvidence(principal, input);
    const prompts = this.agents.buildPrompts(evidencePackage, input.promptVersion);
    const agentOutputs = this.agents.buildAbstainingOutputs(
      input.promptVersion,
      input.modelVersion,
      evidencePackage
    );

    const availableEvidenceIds = new Set(evidencePackage.evidence.map((item) => item.id));
    const evaluation = this.evaluationService.evaluate(agentOutputs, availableEvidenceIds);

    const run = await this.prisma.$transaction(async (tx) => {
      const created = await tx.reasoningRun.create({
        data: {
          organizationId: principal.organizationId,
          requestedByUserId: principal.userId,
          repositoryId: input.repositoryId,
          status: evaluation.status === "passed" ? "evaluated" : "rejected",
          question: input.question,
          promptVersion: input.promptVersion,
          modelVersion: input.modelVersion,
          evidencePackage: this.toJson(evidencePackage),
          prompts: this.toJson(prompts),
          conclusions: this.toJson(evaluation.conclusions)
        }
      });

      await tx.reasoningEvaluation.create({
        data: {
          reasoningRunId: created.id,
          organizationId: principal.organizationId,
          status: evaluation.status,
          checks: this.toJson(evaluation.checks)
        }
      });

      for (const output of evaluation.outputs) {
        const prompt = prompts.find((item) => item.role === output.role);
        await tx.reasoningAgentInvocation.create({
          data: {
            reasoningRunId: created.id,
            organizationId: principal.organizationId,
            role: output.role,
            promptVersion: output.promptVersion,
            modelVersion: output.modelVersion,
            prompt: this.toJson(prompt ?? {}),
            output: this.toJson(output)
          }
        });
      }

      const persistedInsightIds =
        evaluation.status === "passed"
          ? await this.persistInsights(
              tx,
              principal.organizationId,
              input.repositoryId,
              created.id,
              evaluation.conclusions,
              evidencePackage
            )
          : [];

      return tx.reasoningRun.update({
        where: { id: created.id },
        data: {
          status:
            evaluation.status === "passed" && persistedInsightIds.length > 0
              ? "persisted"
              : created.status,
          persistedInsightIds: this.toJson(persistedInsightIds)
        },
        include: this.runInclude()
      });
    });

    return this.serializeRun(run);
  }

  public async listRuns(principal: AuthenticatedPrincipal): Promise<ReasoningRun[]> {
    const runs = await this.prisma.reasoningRun.findMany({
      where: { organizationId: principal.organizationId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: this.runInclude()
    });

    return runs.map((run) => this.serializeRun(run));
  }

  public async getRun(
    principal: AuthenticatedPrincipal,
    reasoningRunId: string
  ): Promise<ReasoningRun> {
    const run = await this.prisma.reasoningRun.findFirst({
      where: { id: reasoningRunId, organizationId: principal.organizationId },
      include: this.runInclude()
    });
    if (run === null) {
      throw new NotFoundException("Reasoning run was not found.");
    }

    return this.serializeRun(run);
  }

  private async persistInsights(
    tx: Pick<PrismaService, "insight">,
    organizationId: string,
    repositoryId: string | null,
    reasoningRunId: string,
    conclusions: readonly ReasoningConclusion[],
    evidencePackage: ReasoningEvidencePackage
  ): Promise<string[]> {
    const evidenceById = new Map(evidencePackage.evidence.map((item) => [item.id, item]));
    const insightIds: string[] = [];

    for (const conclusion of conclusions) {
      const evidenceSet = conclusion.evidence.map((ref) => ({
        ...ref,
        evidence: evidenceById.get(ref.evidenceId)
      }));

      const insight = await tx.insight.create({
        data: {
          organizationId,
          repositoryId,
          reasoningRunId,
          capability: "continuous-reasoning",
          claim: conclusion.claim,
          impact: conclusion.impact,
          confidenceScore: conclusion.confidence.score,
          confidenceBand: conclusion.confidence.band,
          confidenceMethod: conclusion.confidence.method,
          confidenceFactors: this.toJson(conclusion.confidence.factors),
          missingEvidence: this.toJson(conclusion.confidence.missingEvidence),
          counterevidence: this.toJson(conclusion.confidence.counterevidence),
          evidenceSet: this.toJson(evidenceSet),
          recommendedAction: conclusion.recommendedAction,
          reevaluationTrigger: this.toJson({
            trigger: conclusion.reevaluationTrigger,
            reasoningRunId
          })
        }
      });
      insightIds.push(insight.id);
    }

    return insightIds;
  }

  private async assertRepositoryBelongsToOrganization(
    organizationId: string,
    repositoryId: string
  ): Promise<void> {
    const count = await this.prisma.repository.count({
      where: { id: repositoryId, organizationId }
    });
    if (count !== 1) {
      throw new ForbiddenException("Repository is outside the current organization.");
    }
  }

  private runInclude() {
    return {
      invocations: { orderBy: { createdAt: "asc" as const } },
      evaluations: { orderBy: { createdAt: "desc" as const }, take: 1 }
    };
  }

  private serializeRun(run: {
    readonly id: string;
    readonly organizationId: string;
    readonly requestedByUserId: string;
    readonly status: ReasoningRun["status"];
    readonly question: string;
    readonly promptVersion: string;
    readonly modelVersion: string;
    readonly evidencePackage: Prisma.JsonValue;
    readonly prompts: Prisma.JsonValue;
    readonly conclusions: Prisma.JsonValue;
    readonly persistedInsightIds: Prisma.JsonValue;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly invocations: readonly { readonly output: Prisma.JsonValue }[];
    readonly evaluations: readonly {
      readonly id: string;
      readonly reasoningRunId: string;
      readonly status: ReasoningEvaluation["status"];
      readonly checks: Prisma.JsonValue;
      readonly createdAt: Date;
    }[];
  }): ReasoningRun {
    const serialized = {
      id: run.id,
      organizationId: run.organizationId,
      requestedByUserId: run.requestedByUserId,
      status: run.status,
      question: run.question,
      promptVersion: run.promptVersion,
      modelVersion: run.modelVersion,
      evidencePackage: run.evidencePackage as ReasoningEvidencePackage,
      prompts: run.prompts as ReasoningPrompt[],
      agentOutputs: run.invocations.map((invocation) => invocation.output as ReasoningAgentOutput),
      conclusions: run.conclusions as ReasoningConclusion[],
      evaluation:
        run.evaluations[0] === undefined
          ? null
          : reasoningEvaluationSchema.parse({
              id: run.evaluations[0].id,
              reasoningRunId: run.evaluations[0].reasoningRunId,
              status: run.evaluations[0].status,
              checks: run.evaluations[0].checks,
              createdAt: run.evaluations[0].createdAt.toISOString()
            }),
      persistedInsightIds: this.asStringArray(run.persistedInsightIds),
      createdAt: run.createdAt.toISOString(),
      updatedAt: run.updatedAt.toISOString()
    };

    return reasoningRunSchema.parse(serialized);
  }

  private asStringArray(value: Prisma.JsonValue): string[] {
    return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }
}
