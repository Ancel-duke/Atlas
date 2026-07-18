import { describe, expect, it } from "vitest";

import { calculateReasoningConfidence } from "./index.js";

describe("calculateReasoningConfidence", () => {
  it("returns zero confidence when a conclusion cites no available evidence", () => {
    const result = calculateReasoningConfidence(
      {
        evidence: [{ evidenceId: "missing" }],
        confidence: { missingEvidence: [], counterevidence: [] }
      },
      new Set(["known"])
    );

    expect(result.score).toBe(0);
    expect(result.band).toBe("low");
  });

  it("penalizes missing evidence and counterevidence", () => {
    const result = calculateReasoningConfidence(
      {
        evidence: [{ evidenceId: "e1" }, { evidenceId: "e2" }],
        confidence: { missingEvidence: ["test coverage"], counterevidence: ["stale report"] }
      },
      new Set(["e1", "e2", "e3"])
    );

    expect(result.score).toBeGreaterThan(0);
    expect(result.factors.citedEvidenceCount).toBe(2);
    expect(result.factors.missingEvidenceCount).toBe(1);
    expect(result.factors.counterevidenceCount).toBe(1);
  });
});
