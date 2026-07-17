import { describe, expect, it } from "vitest";

import {
  graphTraversalRequestSchema,
  upsertGraphEntityRequestSchema,
  upsertGraphRelationshipRequestSchema
} from "./index.js";

const provenance = {
  sourceType: "repository",
  sourceLocator: "github://atlas/api",
  sourceRevision: "abc123",
  observedAt: "2026-07-18T00:00:00.000Z",
  extractionMethod: "static-analysis",
  evidence: ["apps/api/src/main.ts"]
};

describe("Atlas Memory Graph contracts", () => {
  it("defaults entity lifecycle fields for graph ingestion", () => {
    const parsed = upsertGraphEntityRequestSchema.parse({
      entityType: "service",
      canonicalKey: "API",
      provenance,
      confidenceScore: 95
    });

    expect(parsed.lifecycle).toBe("active");
    expect(parsed.displayName).toBeNull();
    expect(parsed.aliases).toEqual([]);
    expect(parsed.attributes).toEqual({});
    expect(parsed.validFrom).toBeNull();
  });

  it("defaults relationship status and temporal fields", () => {
    const parsed = upsertGraphRelationshipRequestSchema.parse({
      sourceEntityId: "87dbf9ac-f049-4a4d-bfb8-8623ceac9f49",
      targetEntityId: "1da0f1eb-3cf8-4671-a3e3-1e6e114cceef",
      relationship: "depends_on",
      provenance,
      confidenceScore: 90
    });

    expect(parsed.status).toBe("active");
    expect(parsed.attributes).toEqual({});
    expect(parsed.validUntil).toBeNull();
  });

  it("bounds traversal depth for PostgreSQL-backed graph queries", () => {
    expect(() =>
      graphTraversalRequestSchema.parse({
        rootEntityId: "87dbf9ac-f049-4a4d-bfb8-8623ceac9f49",
        maxDepth: 6
      })
    ).toThrow();
  });
});
