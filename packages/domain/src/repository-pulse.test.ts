import { describe, expect, it } from "vitest";

import { calculateRepositoryPulse, type RepositoryPulseInputs } from "./index.js";

function completeInputs(): RepositoryPulseInputs {
  return {
    evidence: [
      {
        id: "repository:r1",
        kind: "repository",
        label: "atlas",
        sourceType: "github",
        sourceLocator: "atlas",
        observedAt: "2026-07-18T00:00:00.000Z",
        summary: "Repository exists."
      },
      {
        id: "graph_entity:g1",
        kind: "graph_entity",
        label: "service:api",
        sourceType: "atlas_memory_graph",
        sourceLocator: "api",
        observedAt: "2026-07-18T00:00:00.000Z",
        summary: "API service."
      },
      {
        id: "memory_record:m1",
        kind: "memory_record",
        label: "decision",
        sourceType: "engineering_memory",
        sourceLocator: "docs/adr",
        observedAt: "2026-07-18T00:00:00.000Z",
        summary: "Decision record."
      },
      {
        id: "insight:i1",
        kind: "insight",
        label: "medium continuous-reasoning",
        sourceType: "insight",
        sourceLocator: "continuous-reasoning",
        observedAt: "2026-07-18T00:00:00.000Z",
        summary: "Supported insight."
      },
      {
        id: "evidence:t1",
        kind: "evidence",
        label: "vitest coverage",
        sourceType: "test",
        sourceLocator: "packages/domain/src/repository-pulse.test.ts",
        observedAt: "2026-07-18T00:00:00.000Z",
        summary: "Repository Pulse has unit test evidence."
      },
      {
        id: "evidence:ci1",
        kind: "evidence",
        label: "GitHub Actions CI",
        sourceType: "github_actions",
        sourceLocator: ".github/workflows/ci.yml",
        observedAt: "2026-07-18T00:00:00.000Z",
        summary: "CI workflow runs tests and builds."
      }
    ],
    snapshots: { count: 2, latestAgeDays: 1, evidenceIds: ["repository:r1"] },
    graph: {
      entityCount: 6,
      relationshipCount: 12,
      staleEntityCount: 1,
      evidenceIds: ["graph_entity:g1"]
    },
    memory: {
      recordCount: 8,
      evidenceItemCount: 16,
      decisionCount: 3,
      evidenceIds: ["memory_record:m1"]
    },
    documentation: {
      documentEvidenceCount: 4,
      staleDocumentEvidenceCount: 1,
      evidenceIds: ["memory_record:m1"]
    },
    ownership: {
      ownerEvidenceCount: 2,
      unownedCriticalInsightCount: 0,
      evidenceIds: ["memory_record:m1"]
    },
    deployment: {
      riskInsightCount: 1,
      criticalRiskInsightCount: 0,
      deploymentEvidenceCount: 2,
      evidenceIds: ["insight:i1"]
    },
    ai: {
      insightCount: 2,
      averageConfidence: 82,
      lowConfidenceInsightCount: 0,
      evidenceIds: ["insight:i1"]
    },
    testing: {
      testEvidenceCount: 1,
      ciEvidenceCount: 1,
      contractTestEvidenceCount: 0,
      evidenceIds: ["evidence:t1", "evidence:ci1"]
    }
  };
}

describe("calculateRepositoryPulse", () => {
  it("returns explainable weighted scores for calculated assessments", () => {
    const result = calculateRepositoryPulse(completeInputs());

    expect(result.status).toBe("calculated");
    expect(result.overallScore).not.toBeNull();
    expect(result.overallExplanation).toContain("Architecture Integrity:");
    expect(result.dimensions).toHaveLength(6);
    expect(result.dimensions[0]?.components[0]?.explanation).toContain("repository-scoped");
  });

  it("withholds overall health when fewer than four dimensions have evidence", () => {
    const input = completeInputs();
    const result = calculateRepositoryPulse({
      ...input,
      graph: { entityCount: 0, relationshipCount: 0, staleEntityCount: 0, evidenceIds: [] },
      memory: { recordCount: 0, evidenceItemCount: 0, decisionCount: 0, evidenceIds: [] },
      documentation: {
        documentEvidenceCount: 0,
        staleDocumentEvidenceCount: 0,
        evidenceIds: []
      },
      ownership: { ownerEvidenceCount: 0, unownedCriticalInsightCount: 0, evidenceIds: [] }
    });

    expect(result.status).toBe("insufficient-evidence");
    expect(result.overallScore).toBeNull();
    expect(result.missingEvidence).toContain("At least one repository-scoped graph entity");
  });
});
