import { describe, expect, it } from "vitest";

import {
  createCorrectionRequestSchema,
  createMemoryRecordRequestSchema,
  memoryRecordSchema
} from "./index.js";

const provenance = {
  sourceType: "atlas-test",
  sourceLocator: "contracts/engineering-memory.test.ts",
  sourceRevision: null,
  observedAt: "2026-07-18T00:00:00.000Z",
  extractionMethod: "contract-test",
  actor: "test-suite",
  evidence: []
};

describe("engineering memory contracts", () => {
  it("validates create memory record requests with confidence and provenance", () => {
    const request = createMemoryRecordRequestSchema.parse({
      classification: "decision",
      claim: "Use append-only history for Engineering Memory.",
      provenance,
      confidenceScore: 95,
      confidenceMethod: "deterministic-test"
    });

    expect(request.subjectEntityId).toBeNull();
    expect(request.owner).toBeNull();
    expect(request.confidenceFactors).toEqual({});
  });

  it("requires corrections to propose a material change", () => {
    const result = createCorrectionRequestSchema.safeParse({
      rationale: "This record needs review.",
      provenance
    });

    expect(result.success).toBe(false);
  });

  it("serializes memory records with current projection and version", () => {
    const record = memoryRecordSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      organizationId: "22222222-2222-4222-8222-222222222222",
      classification: "fact",
      lifecycle: "active",
      subjectEntityId: null,
      claim: "Payments API publishes ChargeCreated.",
      owner: "payments-platform",
      reasoning: null,
      provenance,
      version: 3,
      confidence: {
        score: 90,
        band: "high",
        method: "deterministic-test",
        factors: {},
        missingEvidence: [],
        counterevidence: []
      },
      validFrom: null,
      validUntil: null,
      createdAt: "2026-07-18T00:00:00.000Z",
      updatedAt: "2026-07-18T00:00:00.000Z"
    });

    expect(record.version).toBe(3);
    expect(record.confidence.band).toBe("high");
  });
});
