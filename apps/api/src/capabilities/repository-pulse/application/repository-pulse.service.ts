import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import {
  pulseAssessmentSchema,
  pulseDimensionSchema,
  pulseEvidenceSchema,
  pulseTrendSchema,
  type PulseAssessment,
  type PulseEvidence,
  type PulseStatus,
  type PulseTrend
} from "@atlas/contracts";
import type { Prisma } from "@atlas/database";
import { calculateRepositoryPulse, type RepositoryPulseInputs } from "@atlas/domain";

import { PrismaService } from "../../../infrastructure/database/prisma.service.js";
import type { AuthenticatedPrincipal } from "../../identity/application/jwt-verifier.js";

type PulseAssessmentRecord = Awaited<
  ReturnType<PrismaService["pulseAssessment"]["findFirstOrThrow"]>
>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class RepositoryPulseService {
  public constructor(private readonly prisma: PrismaService) {}

  public async getOrCalculatePulse(
    principal: AuthenticatedPrincipal,
    repositoryRef: string
  ): Promise<PulseAssessment> {
    const latest = await this.prisma.pulseAssessment.findFirst({
      where: {
        organizationId: principal.organizationId,
        repositoryId: await this.resolveRepositoryId(principal.organizationId, repositoryRef)
      },
      orderBy: { calculatedAt: "desc" }
    });

    if (latest !== null) {
      return this.serializeAssessment(latest);
    }

    return this.calculatePulse(principal, repositoryRef);
  }

  public async calculatePulse(
    principal: AuthenticatedPrincipal,
    repositoryRef: string
  ): Promise<PulseAssessment> {
    const repository = await this.getRepository(principal.organizationId, repositoryRef);
    const previous = await this.prisma.pulseAssessment.findMany({
      where: { organizationId: principal.organizationId, repositoryId: repository.id },
      orderBy: { calculatedAt: "desc" },
      take: 12
    });
    const inputs = await this.collectInputs(principal.organizationId, repository.id);
    const calculation = calculateRepositoryPulse(inputs);
    const trend = this.calculateTrend(calculation.overallScore, calculation.status, previous);
    const created = await this.prisma.pulseAssessment.create({
      data: {
        organizationId: principal.organizationId,
        repositoryId: repository.id,
        formulaVersion: calculation.formulaVersion,
        status: calculation.status,
        overallScore: calculation.overallScore,
        confidenceScore: calculation.confidence.score,
        confidenceBand: calculation.confidence.band,
        dimensions: this.toJson(calculation.dimensions),
        evidenceSet: this.toJson({
          evidence: inputs.evidence,
          confidenceFactors: calculation.confidence.factors,
          overallExplanation: calculation.overallExplanation
        }),
        missingEvidence: this.toJson(calculation.missingEvidence),
        excludedEvidence: this.toJson(calculation.excludedEvidence),
        trend: this.toJson(trend),
        calculatedAt: new Date()
      }
    });

    return this.serializeAssessment(created);
  }

  public async listHistory(
    principal: AuthenticatedPrincipal,
    repositoryRef: string
  ): Promise<PulseAssessment[]> {
    const repositoryId = await this.resolveRepositoryId(principal.organizationId, repositoryRef);
    const assessments = await this.prisma.pulseAssessment.findMany({
      where: { organizationId: principal.organizationId, repositoryId },
      orderBy: { calculatedAt: "desc" },
      take: 24
    });

    return assessments.map((assessment) => this.serializeAssessment(assessment));
  }

  private async collectInputs(
    organizationId: string,
    repositoryId: string
  ): Promise<RepositoryPulseInputs> {
    const [repository, snapshots, insights, graphEntities, memoryRecords] = await Promise.all([
      this.prisma.repository.findFirstOrThrow({ where: { id: repositoryId, organizationId } }),
      this.prisma.repositorySnapshot.findMany({
        where: { organizationId, repositoryId },
        orderBy: { acquiredAt: "desc" },
        take: 20
      }),
      this.prisma.insight.findMany({
        where: { organizationId, repositoryId, status: { in: ["open", "acknowledged"] } },
        orderBy: { updatedAt: "desc" },
        take: 100
      }),
      this.prisma.graphEntity.findMany({
        where: { organizationId },
        orderBy: { updatedAt: "desc" },
        take: 200
      }),
      this.prisma.memoryRecord.findMany({
        where: { organizationId },
        include: { evidenceItems: true },
        orderBy: { updatedAt: "desc" },
        take: 200
      })
    ]);

    const repositoryEvidence = this.repositoryEvidence(repository);
    const snapshotEvidence = snapshots.map((snapshot) => ({
      id: `snapshot:${snapshot.id}`,
      kind: "snapshot" as const,
      label: `Snapshot ${snapshot.commitSha}`,
      sourceType: "repository_snapshot",
      sourceLocator: repository.name,
      observedAt: snapshot.acquiredAt.toISOString(),
      summary: `Repository snapshot ${snapshot.commitSha} acquired at ${snapshot.acquiredAt.toISOString()}`
    }));
    const insightEvidence = insights.map((insight) => ({
      id: `insight:${insight.id}`,
      kind: "insight" as const,
      label: `${insight.impact} ${insight.capability}`,
      sourceType: "insight",
      sourceLocator: insight.capability,
      observedAt: insight.updatedAt.toISOString(),
      summary: insight.claim
    }));

    const scopedGraphEntities = graphEntities.filter((entity) =>
      this.isRepositoryScoped(entity.sourceScope, repository)
    );
    const graphEvidence = scopedGraphEntities.map((entity) => ({
      id: `graph_entity:${entity.id}`,
      kind: "graph_entity" as const,
      label: `${entity.entityType}:${entity.canonicalKey}`,
      sourceType: "atlas_memory_graph",
      sourceLocator: entity.canonicalKey,
      observedAt: entity.updatedAt.toISOString(),
      summary: `${entity.entityType} graph entity with ${entity.confidenceBand} confidence`
    }));

    const scopedMemoryRecords = memoryRecords.filter(
      (record) =>
        this.isRepositoryScoped(record.provenance, repository) ||
        this.textMentionsRepository(record.claim, repository)
    );
    const memoryEvidence = scopedMemoryRecords.map((record) => ({
      id: `memory_record:${record.id}`,
      kind: "memory_record" as const,
      label: record.classification,
      sourceType: "engineering_memory",
      sourceLocator: this.sourceLocator(record.provenance, repository.name),
      observedAt: record.updatedAt.toISOString(),
      summary: record.claim
    }));
    const evidenceItems = scopedMemoryRecords.flatMap((record) =>
      record.evidenceItems.map((item) => ({
        id: `evidence:${item.id}`,
        kind: "evidence" as const,
        label: item.sourceType,
        sourceType: item.sourceType,
        sourceLocator: item.sourceLocator,
        observedAt: item.observedAt.toISOString(),
        summary: `${item.direction} evidence for memory record ${record.id}`
      }))
    );

    const evidence: PulseEvidence[] = [
      repositoryEvidence,
      ...snapshotEvidence,
      ...insightEvidence,
      ...graphEvidence,
      ...memoryEvidence,
      ...evidenceItems
    ];
    const now = Date.now();
    const latestSnapshot = snapshots[0];
    const latestAgeDays =
      latestSnapshot === undefined
        ? null
        : Math.floor((now - latestSnapshot.acquiredAt.getTime()) / 86_400_000);
    const staleDocumentEvidenceCount = memoryEvidence.filter(
      (item) =>
        this.isDocumentationSignal(item) &&
        Math.floor((now - new Date(item.observedAt).getTime()) / 86_400_000) > 90
    ).length;
    const riskInsights = insights.filter((insight) =>
      this.containsAny(`${insight.capability} ${insight.claim}`, [
        "deploy",
        "release",
        "incident",
        "outage",
        "rollback",
        "runtime",
        "production"
      ])
    );

    return {
      evidence,
      snapshots: {
        count: snapshots.length,
        latestAgeDays,
        evidenceIds: snapshotEvidence.map((item) => item.id)
      },
      graph: {
        entityCount: scopedGraphEntities.length,
        relationshipCount: await this.countScopedRelationships(organizationId, scopedGraphEntities),
        staleEntityCount: scopedGraphEntities.filter(
          (entity) => Math.floor((now - entity.updatedAt.getTime()) / 86_400_000) > 90
        ).length,
        evidenceIds: graphEvidence.map((item) => item.id)
      },
      memory: {
        recordCount: scopedMemoryRecords.length,
        evidenceItemCount: evidenceItems.length,
        decisionCount: scopedMemoryRecords.filter((record) => record.classification === "decision")
          .length,
        evidenceIds: [...memoryEvidence, ...evidenceItems].map((item) => item.id)
      },
      documentation: {
        documentEvidenceCount: memoryEvidence.filter((item) => this.isDocumentationSignal(item))
          .length,
        staleDocumentEvidenceCount,
        evidenceIds: memoryEvidence
          .filter((item) => this.isDocumentationSignal(item))
          .map((item) => item.id)
      },
      ownership: {
        ownerEvidenceCount: evidence.filter((item) => this.isOwnershipSignal(item)).length,
        unownedCriticalInsightCount: insights.filter(
          (insight) =>
            insight.impact === "critical" &&
            !this.containsAny(`${insight.claim} ${insight.recommendedAction}`, ["owner", "team"])
        ).length,
        evidenceIds: evidence.filter((item) => this.isOwnershipSignal(item)).map((item) => item.id)
      },
      deployment: {
        riskInsightCount: riskInsights.length,
        criticalRiskInsightCount: riskInsights.filter((insight) => insight.impact === "critical")
          .length,
        deploymentEvidenceCount: evidence.filter((item) => this.isDeploymentSignal(item)).length,
        evidenceIds: this.uniqueStrings([
          ...insightEvidence.filter((item) => this.isDeploymentSignal(item)).map((item) => item.id),
          ...evidence.filter((item) => this.isDeploymentSignal(item)).map((item) => item.id)
        ])
      },
      ai: {
        insightCount: insights.length,
        averageConfidence:
          insights.length === 0
            ? null
            : Math.round(
                insights.reduce((sum, insight) => sum + insight.confidenceScore, 0) /
                  insights.length
              ),
        lowConfidenceInsightCount: insights.filter((insight) => insight.confidenceBand === "low")
          .length,
        evidenceIds: insightEvidence.map((item) => item.id)
      },
      testing: {
        testEvidenceCount: evidence.filter((item) => this.isTestingSignal(item)).length,
        ciEvidenceCount: evidence.filter((item) => this.isCiSignal(item)).length,
        contractTestEvidenceCount: evidence.filter((item) => this.isContractTestingSignal(item))
          .length,
        evidenceIds: evidence
          .filter(
            (item) =>
              this.isTestingSignal(item) ||
              this.isCiSignal(item) ||
              this.isContractTestingSignal(item)
          )
          .map((item) => item.id)
      }
    };
  }

  private async countScopedRelationships(
    organizationId: string,
    graphEntities: readonly { readonly id: string }[]
  ): Promise<number> {
    const entityIds = graphEntities.map((entity) => entity.id);
    if (entityIds.length === 0) {
      return 0;
    }

    return this.prisma.graphRelationship.count({
      where: {
        organizationId,
        OR: [{ sourceEntityId: { in: entityIds } }, { targetEntityId: { in: entityIds } }]
      }
    });
  }

  private calculateTrend(
    currentScore: number | null,
    currentStatus: PulseStatus,
    previous: readonly PulseAssessmentRecord[]
  ): PulseTrend {
    const previousScore = previous.find((assessment) => assessment.overallScore !== null);
    const priorScore = previousScore?.overallScore ?? null;
    const delta = currentScore === null || priorScore === null ? null : currentScore - priorScore;

    return {
      direction: delta === null ? "unknown" : delta > 2 ? "up" : delta < -2 ? "down" : "flat",
      delta,
      previousScore: priorScore,
      currentScore,
      sampleSize: previous.length + 1,
      explanation:
        delta === null
          ? "Trend is unknown until at least two calculated assessments exist."
          : `Current score changed by ${delta} points from the previous calculated assessment.`,
      history: previous.map((assessment) => ({
        assessmentId: assessment.id,
        calculatedAt: assessment.calculatedAt.toISOString(),
        overallScore: assessment.overallScore,
        status: this.parseStatus(assessment.status)
      }))
    };
  }

  private async getRepository(organizationId: string, repositoryRef: string) {
    const repository = await this.prisma.repository.findFirst({
      where: {
        organizationId,
        OR: [
          ...(uuidPattern.test(repositoryRef) ? [{ id: repositoryRef }] : []),
          { providerRepositoryId: repositoryRef },
          { name: repositoryRef }
        ]
      }
    });
    if (repository === null) {
      throw new NotFoundException("Repository was not found.");
    }
    if (repository.organizationId !== organizationId) {
      throw new ForbiddenException("Repository is outside the current organization.");
    }
    return repository;
  }

  private async resolveRepositoryId(
    organizationId: string,
    repositoryRef: string
  ): Promise<string> {
    return (await this.getRepository(organizationId, repositoryRef)).id;
  }

  private repositoryEvidence(repository: {
    readonly id: string;
    readonly name: string;
    readonly provider: string;
    readonly providerRepositoryId: string;
    readonly updatedAt: Date;
  }): PulseEvidence {
    return {
      id: `repository:${repository.id}`,
      kind: "repository",
      label: repository.name,
      sourceType: repository.provider,
      sourceLocator: repository.providerRepositoryId,
      observedAt: repository.updatedAt.toISOString(),
      summary: `Repository ${repository.name} is connected through ${repository.provider}.`
    };
  }

  private serializeAssessment(record: PulseAssessmentRecord): PulseAssessment {
    const evidenceSet = this.asRecord(record.evidenceSet);
    const dimensions = pulseDimensionSchema.array().safeParse(record.dimensions);
    const evidence = pulseEvidenceSchema.array().safeParse(evidenceSet["evidence"]);
    const trend = pulseTrendSchema.safeParse(record.trend);
    const missingEvidence = this.asStringArray(record.missingEvidence);
    const status = dimensions.success ? this.parseStatus(record.status) : "insufficient-evidence";

    return pulseAssessmentSchema.parse({
      id: record.id,
      organizationId: record.organizationId,
      repositoryId: record.repositoryId,
      formulaVersion: "repository-pulse-v1",
      status,
      overallScore: dimensions.success ? record.overallScore : null,
      overallExplanation:
        typeof evidenceSet["overallExplanation"] === "string"
          ? evidenceSet["overallExplanation"]
          : "No overall explanation was persisted.",
      confidence: {
        score: record.confidenceScore,
        band: record.confidenceBand,
        method: "pulse-confidence-v1",
        factors: this.asRecord(evidenceSet["confidenceFactors"])
      },
      dimensions: dimensions.success ? dimensions.data : [],
      evidence: evidence.success ? evidence.data : [],
      missingEvidence: dimensions.success
        ? missingEvidence
        : [...missingEvidence, "Persisted assessment dimensions could not be validated."],
      excludedEvidence: this.asStringArray(record.excludedEvidence),
      trend: trend.success ? trend.data : this.emptyTrend(record),
      calculatedAt: record.calculatedAt.toISOString(),
      createdAt: record.createdAt.toISOString()
    });
  }

  private emptyTrend(record: PulseAssessmentRecord): PulseTrend {
    return {
      direction: "unknown",
      delta: null,
      previousScore: null,
      currentScore: null,
      sampleSize: 1,
      explanation: "Trend could not be reconstructed from the persisted assessment payload.",
      history: [
        {
          assessmentId: record.id,
          calculatedAt: record.calculatedAt.toISOString(),
          overallScore: record.overallScore,
          status: this.parseStatus(record.status)
        }
      ]
    };
  }

  private parseStatus(status: string): PulseStatus {
    return status === "calculated" ? "calculated" : "insufficient-evidence";
  }

  private isRepositoryScoped(
    value: Prisma.JsonValue,
    repository: {
      readonly id: string;
      readonly name: string;
      readonly providerRepositoryId: string;
    }
  ): boolean {
    const text = JSON.stringify(value).toLowerCase();
    return [repository.id, repository.name, repository.providerRepositoryId].some((item) =>
      text.includes(item.toLowerCase())
    );
  }

  private textMentionsRepository(
    value: string,
    repository: { readonly name: string; readonly providerRepositoryId: string }
  ): boolean {
    return [repository.name, repository.providerRepositoryId].some((item) =>
      value.toLowerCase().includes(item.toLowerCase())
    );
  }

  private sourceLocator(value: Prisma.JsonValue, fallback: string): string {
    const record = this.asRecord(value);
    return typeof record["sourceLocator"] === "string" ? record["sourceLocator"] : fallback;
  }

  private isDocumentationSignal(evidence: PulseEvidence): boolean {
    return this.containsAny(`${evidence.label} ${evidence.sourceType} ${evidence.summary}`, [
      "doc",
      "readme",
      "adr",
      "spec",
      "runbook"
    ]);
  }

  private isOwnershipSignal(evidence: PulseEvidence): boolean {
    return this.containsAny(`${evidence.label} ${evidence.sourceType} ${evidence.summary}`, [
      "owner",
      "ownership",
      "team",
      "maintainer",
      "oncall"
    ]);
  }

  private isDeploymentSignal(evidence: PulseEvidence): boolean {
    return this.containsAny(`${evidence.label} ${evidence.sourceType} ${evidence.summary}`, [
      "deploy",
      "release",
      "runtime",
      "production",
      "incident",
      "rollback"
    ]);
  }

  private isTestingSignal(evidence: PulseEvidence): boolean {
    return this.containsAny(`${evidence.label} ${evidence.sourceType} ${evidence.summary}`, [
      "test",
      "spec",
      "vitest",
      "playwright",
      "coverage"
    ]);
  }

  private isCiSignal(evidence: PulseEvidence): boolean {
    return this.containsAny(`${evidence.label} ${evidence.sourceType} ${evidence.summary}`, [
      "ci",
      "workflow",
      "github actions",
      "build",
      "pipeline"
    ]);
  }

  private isContractTestingSignal(evidence: PulseEvidence): boolean {
    return this.containsAny(`${evidence.label} ${evidence.sourceType} ${evidence.summary}`, [
      "contract test",
      "consumer",
      "provider contract",
      "openapi"
    ]);
  }

  private containsAny(value: string, needles: readonly string[]): boolean {
    const normalized = value.toLowerCase();
    return needles.some((needle) => normalized.includes(needle));
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private asStringArray(value: Prisma.JsonValue): string[] {
    return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
  }

  private uniqueStrings(values: readonly string[]): string[] {
    return [...new Set(values)];
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }
}
