import { Injectable } from "@nestjs/common";

import type { Insight } from "@atlas/contracts";
import type { Prisma } from "@atlas/database";

import { PrismaService } from "../../../infrastructure/database/prisma.service.js";
import type { AuthenticatedPrincipal } from "../../identity/application/jwt-verifier.js";

@Injectable()
export class InsightsService {
  public constructor(private readonly prisma: PrismaService) {}

  public async list(
    principal: AuthenticatedPrincipal,
    repositoryId: string | undefined
  ): Promise<Insight[]> {
    const insights = await this.prisma.insight.findMany({
      where: {
        organizationId: principal.organizationId,
        ...(repositoryId === undefined ? {} : { repositoryId })
      },
      orderBy: [{ impact: "desc" }, { updatedAt: "desc" }],
      take: 100
    });

    return insights.map((insight) => this.serialize(insight));
  }

  private serialize(insight: {
    readonly id: string;
    readonly organizationId: string;
    readonly repositoryId: string | null;
    readonly capability: string;
    readonly claim: string;
    readonly impact: Insight["impact"];
    readonly status: Insight["status"];
    readonly confidenceScore: number;
    readonly confidenceBand: Insight["confidence"]["band"];
    readonly confidenceMethod: string;
    readonly confidenceFactors: Prisma.JsonValue;
    readonly missingEvidence: Prisma.JsonValue;
    readonly counterevidence: Prisma.JsonValue;
    readonly evidenceSet: Prisma.JsonValue;
    readonly recommendedAction: string;
    readonly reevaluationTrigger: Prisma.JsonValue;
    readonly createdAt: Date;
    readonly updatedAt: Date;
  }): Insight {
    return {
      id: insight.id,
      organizationId: insight.organizationId,
      repositoryId: insight.repositoryId,
      capability: insight.capability,
      claim: insight.claim,
      impact: insight.impact,
      status: insight.status,
      confidence: {
        score: insight.confidenceScore,
        band: insight.confidenceBand,
        method: insight.confidenceMethod,
        factors: this.asRecord(insight.confidenceFactors),
        missingEvidence: this.asStringArray(insight.missingEvidence),
        counterevidence: this.asStringArray(insight.counterevidence)
      },
      evidenceSet: Array.isArray(insight.evidenceSet) ? insight.evidenceSet : [insight.evidenceSet],
      recommendedAction: insight.recommendedAction,
      reevaluationTrigger: this.asRecord(insight.reevaluationTrigger),
      createdAt: insight.createdAt.toISOString(),
      updatedAt: insight.updatedAt.toISOString()
    };
  }

  private asRecord(value: Prisma.JsonValue): Record<string, unknown> {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return value;
    }
    return {};
  }

  private asStringArray(value: Prisma.JsonValue): string[] {
    return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
  }
}
