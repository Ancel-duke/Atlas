import { describe, expect, it } from "vitest";

import { calculatePulseHealthScore, confidenceBandForScore } from "./index.js";

describe("confidenceBandForScore", () => {
  it("maps scores to constitutional confidence bands", () => {
    expect(confidenceBandForScore(59)).toBe("low");
    expect(confidenceBandForScore(60)).toBe("moderate");
    expect(confidenceBandForScore(84)).toBe("moderate");
    expect(confidenceBandForScore(85)).toBe("high");
  });
});

describe("calculatePulseHealthScore", () => {
  it("withholds an overall score when evidence is insufficient", () => {
    const result = calculatePulseHealthScore(
      {
        architectureIntegrity: { score: 100, hasSufficientEvidence: true },
        knowledgeCoverage: { score: 100, hasSufficientEvidence: true },
        ownershipCoverage: { score: 100, hasSufficientEvidence: true },
        documentationFreshness: { score: 100, hasSufficientEvidence: false },
        deploymentStability: { score: 100, hasSufficientEvidence: false },
        testingConfidence: { score: 100, hasSufficientEvidence: false }
      },
      "high"
    );

    expect(result.status).toBe("insufficient-evidence");
  });

  it("calculates a weighted score when confidence and coverage are sufficient", () => {
    const result = calculatePulseHealthScore(
      {
        architectureIntegrity: { score: 90, hasSufficientEvidence: true },
        knowledgeCoverage: { score: 80, hasSufficientEvidence: true },
        ownershipCoverage: { score: 70, hasSufficientEvidence: true },
        documentationFreshness: { score: 60, hasSufficientEvidence: true },
        deploymentStability: { score: 100, hasSufficientEvidence: true },
        testingConfidence: { score: 50, hasSufficientEvidence: true }
      },
      "moderate"
    );

    expect(result).toEqual({ status: "calculated", score: 78, formulaVersion: "pulse-v1" });
  });
});
