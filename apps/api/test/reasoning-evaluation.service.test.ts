import { describe, expect, it } from "vitest";

import { ReasoningEvaluationService } from "../src/capabilities/continuous-reasoning/application/reasoning-evaluation.service.js";

describe("ReasoningEvaluationService", () => {
  it("rejects conclusions that cite evidence outside the package", () => {
    const service = new ReasoningEvaluationService();

    const result = service.evaluate(
      [
        {
          role: "architect",
          promptVersion: "continuous-reasoning-v1",
          modelVersion: "test-model",
          abstained: false,
          conclusions: [
            {
              claim: "The API depends on an unsupported service.",
              reasoning: "The conclusion cites an evidence ID that is not packaged.",
              evidence: [{ evidenceId: "not-in-package", relevance: "claimed support" }],
              confidence: {
                score: 90,
                band: "high",
                method: "model-self-report",
                factors: {},
                missingEvidence: [],
                counterevidence: []
              },
              impact: "high",
              recommendedAction: "Do not persist this unsupported conclusion.",
              reevaluationTrigger: "When evidence is packaged."
            }
          ]
        }
      ],
      new Set(["memory_record:known"])
    );

    expect(result.status).toBe("failed");
    expect(result.conclusions).toHaveLength(0);
    expect(result.checks.some((check) => check.name === "architect_evidence_refs")).toBe(true);
  });

  it("recalculates confidence for supported conclusions", () => {
    const service = new ReasoningEvaluationService();

    const result = service.evaluate(
      [
        {
          role: "reviewer",
          promptVersion: "continuous-reasoning-v1",
          modelVersion: "test-model",
          abstained: false,
          conclusions: [
            {
              claim: "The memory record has enough support for follow-up planning.",
              reasoning: "The conclusion cites only packaged evidence.",
              evidence: [{ evidenceId: "memory_record:known", relevance: "source claim" }],
              confidence: {
                score: 100,
                band: "high",
                method: "model-self-report",
                factors: {},
                missingEvidence: [],
                counterevidence: []
              },
              impact: "medium",
              recommendedAction: "Create a plan from the cited memory record.",
              reevaluationTrigger: "When the memory record changes."
            }
          ]
        }
      ],
      new Set(["memory_record:known"])
    );

    expect(result.status).toBe("passed");
    expect(result.conclusions).toHaveLength(1);
    expect(result.conclusions[0]?.confidence.method).toBe("atlas-evidence-coverage-v1");
    expect(result.conclusions[0]?.confidence.score).toBeLessThan(100);
  });
});
