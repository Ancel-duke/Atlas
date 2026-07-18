import { Injectable } from "@nestjs/common";

import {
  reasoningAgentOutputSchema,
  type ReasoningAgentOutput,
  type ReasoningConclusion,
  type ReasoningEvaluation
} from "@atlas/contracts";
import { calculateReasoningConfidence } from "@atlas/domain";

type EvaluationCheck = ReasoningEvaluation["checks"][number];

export type ReasoningEvaluationResult = {
  readonly status: "passed" | "failed";
  readonly checks: EvaluationCheck[];
  readonly outputs: ReasoningAgentOutput[];
  readonly conclusions: ReasoningConclusion[];
};

@Injectable()
export class ReasoningEvaluationService {
  public evaluate(
    rawOutputs: readonly unknown[],
    availableEvidenceIds: ReadonlySet<string>
  ): ReasoningEvaluationResult {
    const checks: EvaluationCheck[] = [];
    const outputs: ReasoningAgentOutput[] = [];
    const conclusions: ReasoningConclusion[] = [];

    for (const rawOutput of rawOutputs) {
      const parsed = reasoningAgentOutputSchema.safeParse(rawOutput);
      if (!parsed.success) {
        checks.push({
          name: "structured_output",
          passed: false,
          message: parsed.error.issues.map((issue) => issue.message).join("; ")
        });
        continue;
      }

      outputs.push(parsed.data);
      if (parsed.data.abstained && parsed.data.abstentionReason === null) {
        checks.push({
          name: `${parsed.data.role}_abstention_reason`,
          passed: false,
          message: "Abstaining agents must provide an abstention reason."
        });
      }

      for (const conclusion of parsed.data.conclusions) {
        const unknownEvidence = conclusion.evidence
          .map((item) => item.evidenceId)
          .filter((evidenceId) => !availableEvidenceIds.has(evidenceId));

        if (unknownEvidence.length > 0) {
          checks.push({
            name: `${parsed.data.role}_evidence_refs`,
            passed: false,
            message: `Conclusion cites evidence outside the package: ${unknownEvidence.join(", ")}`
          });
          continue;
        }

        const calculated = calculateReasoningConfidence(conclusion, availableEvidenceIds);
        conclusions.push({
          ...conclusion,
          confidence: {
            ...conclusion.confidence,
            score: calculated.score,
            band: calculated.band,
            method: calculated.method,
            factors: {
              ...conclusion.confidence.factors,
              ...calculated.factors
            }
          }
        });
        checks.push({
          name: `${parsed.data.role}_conclusion_supported`,
          passed: true,
          message: "Conclusion cites only packaged evidence and includes confidence and impact."
        });
      }
    }

    checks.push({
      name: "agent_participation",
      passed: outputs.length > 0,
      message:
        outputs.length > 0
          ? "At least one specialist agent output was supplied."
          : "No specialist agent outputs were supplied."
    });

    checks.push({
      name: "evidence_available",
      passed: availableEvidenceIds.size > 0,
      message:
        availableEvidenceIds.size > 0
          ? "Evidence package contains persisted Atlas evidence."
          : "Evidence package is empty."
    });

    const status = checks.every((check) => check.passed) ? "passed" : "failed";
    return { status, checks, outputs, conclusions };
  }
}
