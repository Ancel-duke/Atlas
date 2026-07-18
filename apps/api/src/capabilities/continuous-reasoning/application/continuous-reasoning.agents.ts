import { Injectable } from "@nestjs/common";

import type {
  ReasoningAgentOutput,
  ReasoningAgentRole,
  ReasoningEvidencePackage,
  ReasoningPrompt
} from "@atlas/contracts";

const agentRoles = ["architect", "reviewer", "historian", "librarian", "planner"] as const;

const roleInstructions = {
  architect:
    "Assess architecture implications using only packaged graph and memory evidence. Identify structural risks, dependencies, and design options.",
  reviewer:
    "Review conclusions for correctness, unsupported claims, test impact, operational risk, and missing counterevidence.",
  historian:
    "Explain relevant historical context from memory records and graph provenance. Do not infer history that is not in the package.",
  librarian:
    "Organize cited evidence, identify documentation or knowledge gaps, and propose durable knowledge updates.",
  planner:
    "Turn supported conclusions into actionable implementation or investigation steps with explicit impact."
} as const satisfies Record<(typeof agentRoles)[number], string>;

@Injectable()
export class ContinuousReasoningAgents {
  public buildPrompts(
    evidencePackage: ReasoningEvidencePackage,
    promptVersion: string
  ): ReasoningPrompt[] {
    const sharedInstructions = [
      "Use only evidence IDs from the evidence package.",
      "Do not add facts from model memory or unstated assumptions.",
      "Every conclusion must include Evidence, Confidence, and Impact.",
      "Abstain when the evidence package is insufficient.",
      `Question: ${evidencePackage.question}`
    ].join("\n");

    return [
      {
        role: "orchestrator",
        promptVersion,
        instructions: [
          "Coordinate specialist agents for Continuous Reasoning.",
          "Package evidence before conclusions, require structured outputs, and reject unsupported claims.",
          sharedInstructions
        ].join("\n"),
        outputSchema: this.outputSchema()
      },
      ...agentRoles.map((role) => ({
        role,
        promptVersion,
        instructions: [roleInstructions[role], sharedInstructions].join("\n"),
        outputSchema: this.outputSchema()
      }))
    ];
  }

  public supportedAgentRoles(): readonly Exclude<ReasoningAgentRole, "orchestrator">[] {
    return agentRoles;
  }

  public buildAbstainingOutputs(
    promptVersion: string,
    modelVersion: string,
    evidencePackage: ReasoningEvidencePackage
  ): ReasoningAgentOutput[] {
    const reason =
      evidencePackage.evidence.length === 0
        ? "No persisted Atlas evidence was available for this question, so the agent abstained."
        : "No deterministic model gateway is configured in this environment; the agent abstained rather than inventing a conclusion.";

    return agentRoles.map((role) => ({
      role,
      promptVersion,
      modelVersion,
      conclusions: [],
      abstained: true,
      abstentionReason: reason
    }));
  }

  private outputSchema(): Record<string, unknown> {
    return {
      type: "object",
      required: ["role", "promptVersion", "modelVersion", "conclusions", "abstained"],
      properties: {
        role: { enum: ["architect", "reviewer", "historian", "librarian", "planner"] },
        promptVersion: { type: "string" },
        modelVersion: { type: "string" },
        abstained: { type: "boolean" },
        abstentionReason: { type: ["string", "null"] },
        conclusions: {
          type: "array",
          items: {
            type: "object",
            required: ["claim", "reasoning", "evidence", "confidence", "impact"],
            properties: {
              claim: { type: "string" },
              reasoning: { type: "string" },
              evidence: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  required: ["evidenceId", "relevance"],
                  properties: {
                    evidenceId: { type: "string" },
                    relevance: { type: "string" }
                  }
                }
              },
              confidence: { type: "object" },
              impact: { enum: ["low", "medium", "high", "critical"] },
              recommendedAction: { type: "string" },
              reevaluationTrigger: { type: "string" }
            }
          }
        }
      }
    };
  }
}
