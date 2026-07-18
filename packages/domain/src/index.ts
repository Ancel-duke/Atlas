export const atlasCapabilities = [
  "repository-intelligence",
  "atlas-memory-graph",
  "engineering-memory",
  "continuous-reasoning",
  "repository-pulse",
  "engineering-experience"
] as const;

export type AtlasCapability = (typeof atlasCapabilities)[number];

export const organizationRoles = ["owner", "admin", "member", "viewer"] as const;

export type OrganizationRole = (typeof organizationRoles)[number];

export const organizationPermissions = [
  "organization:read",
  "organization:update",
  "organization:create",
  "membership:read",
  "membership:update",
  "invitation:create",
  "invitation:read",
  "invitation:revoke",
  "graph:read",
  "graph:write",
  "graph:project",
  "memory:read",
  "memory:write",
  "memory:evidence",
  "memory:correct",
  "repository:read",
  "repository:write",
  "insight:read",
  "reasoning:read",
  "reasoning:run",
  "pulse:read",
  "audit:read"
] as const;

export type OrganizationPermission = (typeof organizationPermissions)[number];

const rolePermissions = {
  owner: organizationPermissions,
  admin: [
    "organization:read",
    "organization:update",
    "membership:read",
    "membership:update",
    "invitation:create",
    "invitation:read",
    "invitation:revoke",
    "graph:read",
    "graph:write",
    "graph:project",
    "memory:read",
    "memory:write",
    "memory:evidence",
    "memory:correct",
    "repository:read",
    "repository:write",
    "insight:read",
    "reasoning:read",
    "reasoning:run",
    "pulse:read",
    "audit:read"
  ],
  member: [
    "organization:read",
    "membership:read",
    "invitation:read",
    "graph:read",
    "memory:read",
    "memory:correct",
    "repository:read",
    "insight:read",
    "reasoning:read",
    "reasoning:run",
    "pulse:read"
  ],
  viewer: [
    "organization:read",
    "membership:read",
    "graph:read",
    "memory:read",
    "repository:read",
    "insight:read",
    "reasoning:read",
    "pulse:read"
  ]
} as const satisfies Record<OrganizationRole, readonly OrganizationPermission[]>;

export function permissionsForRole(role: OrganizationRole): readonly OrganizationPermission[] {
  return rolePermissions[role];
}

export function roleHasPermission(
  role: OrganizationRole,
  permission: OrganizationPermission
): boolean {
  return permissionsForRole(role).includes(permission);
}

export type ConfidenceBand = "low" | "moderate" | "high";

export function confidenceBandForScore(score: number): ConfidenceBand {
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw new RangeError("Confidence score must be an integer from 0 to 100.");
  }

  if (score >= 85) {
    return "high";
  }

  if (score >= 60) {
    return "moderate";
  }

  return "low";
}

export type ReasoningEvidenceRef = {
  readonly evidenceId: string;
};

export type ReasoningConclusionForConfidence = {
  readonly evidence: readonly ReasoningEvidenceRef[];
  readonly confidence: {
    readonly missingEvidence: readonly string[];
    readonly counterevidence: readonly string[];
  };
};

export type ReasoningConfidenceResult = {
  readonly score: number;
  readonly band: ConfidenceBand;
  readonly method: "atlas-evidence-coverage-v1";
  readonly factors: {
    readonly citedEvidenceCount: number;
    readonly availableEvidenceCount: number;
    readonly missingEvidenceCount: number;
    readonly counterevidenceCount: number;
  };
};

export function calculateReasoningConfidence(
  conclusion: ReasoningConclusionForConfidence,
  availableEvidenceIds: ReadonlySet<string>
): ReasoningConfidenceResult {
  const citedEvidenceIds = new Set(conclusion.evidence.map((item) => item.evidenceId));
  const supportedCitationCount = [...citedEvidenceIds].filter((id) =>
    availableEvidenceIds.has(id)
  ).length;
  const availableEvidenceCount = availableEvidenceIds.size;
  const missingEvidenceCount = conclusion.confidence.missingEvidence.length;
  const counterevidenceCount = conclusion.confidence.counterevidence.length;

  if (supportedCitationCount === 0 || availableEvidenceCount === 0) {
    return {
      score: 0,
      band: "low",
      method: "atlas-evidence-coverage-v1",
      factors: {
        citedEvidenceCount: supportedCitationCount,
        availableEvidenceCount,
        missingEvidenceCount,
        counterevidenceCount
      }
    };
  }

  const coverageScore = Math.min(70, supportedCitationCount * 18);
  const breadthScore = Math.min(
    20,
    Math.round((supportedCitationCount / availableEvidenceCount) * 20)
  );
  const penalty = missingEvidenceCount * 8 + counterevidenceCount * 12;
  const score = Math.max(0, Math.min(100, 10 + coverageScore + breadthScore - penalty));

  return {
    score,
    band: confidenceBandForScore(score),
    method: "atlas-evidence-coverage-v1",
    factors: {
      citedEvidenceCount: supportedCitationCount,
      availableEvidenceCount,
      missingEvidenceCount,
      counterevidenceCount
    }
  };
}

export type MemoryLifecycle =
  "proposed" | "verified" | "active" | "challenged" | "superseded" | "deprecated" | "archived";

const allowedMemoryLifecycleTransitions: Record<MemoryLifecycle, readonly MemoryLifecycle[]> = {
  proposed: ["verified", "active", "challenged", "deprecated", "archived"],
  verified: ["active", "challenged", "deprecated", "archived"],
  active: ["challenged", "superseded", "deprecated", "archived"],
  challenged: ["active", "superseded", "deprecated", "archived"],
  superseded: ["archived"],
  deprecated: ["archived"],
  archived: []
} as const satisfies Record<MemoryLifecycle, readonly MemoryLifecycle[]>;

export function canTransitionMemoryLifecycle(
  current: MemoryLifecycle,
  next: MemoryLifecycle
): boolean {
  return allowedMemoryLifecycleTransitions[current].includes(next);
}

export function assertMemoryLifecycleTransition(
  current: MemoryLifecycle,
  next: MemoryLifecycle
): void {
  if (!canTransitionMemoryLifecycle(current, next)) {
    throw new Error(`Invalid memory lifecycle transition from ${current} to ${next}.`);
  }
}

export type PulseDimensionScore = {
  readonly score: number;
  readonly hasSufficientEvidence: boolean;
};

export type PulseDimensions = {
  readonly architectureIntegrity: PulseDimensionScore;
  readonly knowledgeCoverage: PulseDimensionScore;
  readonly ownershipCoverage: PulseDimensionScore;
  readonly documentationFreshness: PulseDimensionScore;
  readonly deploymentStability: PulseDimensionScore;
  readonly testingConfidence: PulseDimensionScore;
};

const pulseWeights = {
  architectureIntegrity: 0.25,
  knowledgeCoverage: 0.2,
  ownershipCoverage: 0.15,
  documentationFreshness: 0.15,
  deploymentStability: 0.15,
  testingConfidence: 0.1
} as const;

export type PulseCalculationResult =
  | {
      readonly status: "calculated";
      readonly score: number;
      readonly formulaVersion: "pulse-v1";
    }
  | {
      readonly status: "insufficient-evidence";
      readonly missingDimensions: readonly (keyof PulseDimensions)[];
      readonly formulaVersion: "pulse-v1";
    };

export function calculatePulseHealthScore(
  dimensions: PulseDimensions,
  assessmentConfidence: ConfidenceBand
): PulseCalculationResult {
  const entries = Object.entries(dimensions) as [keyof PulseDimensions, PulseDimensionScore][];
  const missingDimensions = entries
    .filter(([, value]) => !value.hasSufficientEvidence)
    .map(([dimension]) => dimension);

  if (assessmentConfidence === "low" || entries.length - missingDimensions.length < 4) {
    return {
      status: "insufficient-evidence",
      missingDimensions,
      formulaVersion: "pulse-v1"
    };
  }

  const score = entries.reduce((sum, [dimension, value]) => {
    return sum + value.score * pulseWeights[dimension];
  }, 0);

  return {
    status: "calculated",
    score: Math.round(score),
    formulaVersion: "pulse-v1"
  };
}

export type RepositoryPulseDimensionKey =
  | "architectureIntegrity"
  | "knowledgeCoverage"
  | "ownershipCoverage"
  | "documentationFreshness"
  | "deploymentStability"
  | "testingConfidence";

export type RepositoryPulseEvidence = {
  readonly id: string;
  readonly kind:
    "repository" | "snapshot" | "insight" | "graph_entity" | "memory_record" | "evidence";
  readonly label: string;
  readonly sourceType: string;
  readonly sourceLocator: string;
  readonly observedAt: string;
  readonly summary: string;
};

export type RepositoryPulseInputs = {
  readonly evidence: readonly RepositoryPulseEvidence[];
  readonly snapshots: {
    readonly count: number;
    readonly latestAgeDays: number | null;
    readonly evidenceIds: readonly string[];
  };
  readonly graph: {
    readonly entityCount: number;
    readonly relationshipCount: number;
    readonly staleEntityCount: number;
    readonly evidenceIds: readonly string[];
  };
  readonly memory: {
    readonly recordCount: number;
    readonly evidenceItemCount: number;
    readonly decisionCount: number;
    readonly evidenceIds: readonly string[];
  };
  readonly documentation: {
    readonly documentEvidenceCount: number;
    readonly staleDocumentEvidenceCount: number;
    readonly evidenceIds: readonly string[];
  };
  readonly ownership: {
    readonly ownerEvidenceCount: number;
    readonly unownedCriticalInsightCount: number;
    readonly evidenceIds: readonly string[];
  };
  readonly deployment: {
    readonly riskInsightCount: number;
    readonly criticalRiskInsightCount: number;
    readonly deploymentEvidenceCount: number;
    readonly evidenceIds: readonly string[];
  };
  readonly ai: {
    readonly insightCount: number;
    readonly averageConfidence: number | null;
    readonly lowConfidenceInsightCount: number;
    readonly evidenceIds: readonly string[];
  };
  readonly testing: {
    readonly testEvidenceCount: number;
    readonly ciEvidenceCount: number;
    readonly contractTestEvidenceCount: number;
    readonly evidenceIds: readonly string[];
  };
};

export type RepositoryPulseComponent = {
  readonly name: string;
  readonly value: number;
  readonly max: number;
  readonly weight: number;
  readonly contribution: number;
  readonly explanation: string;
  readonly evidenceIds: readonly string[];
};

export type RepositoryPulseDimension = {
  readonly key: RepositoryPulseDimensionKey;
  readonly label: string;
  readonly score: number | null;
  readonly weight: number;
  readonly weightedContribution: number;
  readonly status: "calculated" | "insufficient-evidence";
  readonly confidence: {
    readonly score: number;
    readonly band: ConfidenceBand;
    readonly method: "pulse-confidence-v1";
    readonly factors: Record<string, number>;
  };
  readonly components: readonly RepositoryPulseComponent[];
  readonly evidenceIds: readonly string[];
  readonly missingEvidence: readonly string[];
  readonly excludedEvidence: readonly string[];
  readonly explanation: string;
};

export type RepositoryPulseAssessmentCalculation = {
  readonly formulaVersion: "repository-pulse-v1";
  readonly status: "calculated" | "insufficient-evidence";
  readonly overallScore: number | null;
  readonly overallExplanation: string;
  readonly confidence: {
    readonly score: number;
    readonly band: ConfidenceBand;
    readonly method: "pulse-confidence-v1";
    readonly factors: Record<string, number>;
  };
  readonly dimensions: readonly RepositoryPulseDimension[];
  readonly missingEvidence: readonly string[];
  readonly excludedEvidence: readonly string[];
};

const repositoryPulseWeights = {
  architectureIntegrity: 0.25,
  knowledgeCoverage: 0.2,
  ownershipCoverage: 0.15,
  documentationFreshness: 0.15,
  deploymentStability: 0.15,
  testingConfidence: 0.1
} as const satisfies Record<RepositoryPulseDimensionKey, number>;

export function calculateRepositoryPulse(
  inputs: RepositoryPulseInputs
): RepositoryPulseAssessmentCalculation {
  const dimensions: RepositoryPulseDimension[] = [
    scoreArchitectureIntegrity(inputs),
    scoreKnowledgeCoverage(inputs),
    scoreOwnershipCoverage(inputs),
    scoreDocumentationFreshness(inputs),
    scoreDeploymentStability(inputs),
    scoreTestingConfidence(inputs)
  ];

  const calculatedDimensions = dimensions.filter((dimension) => dimension.score !== null);
  const confidenceFactors = calculatePulseConfidenceFactors(inputs, dimensions);
  const confidenceScore = confidenceFactors.score;
  const confidence = {
    score: confidenceScore,
    band: confidenceBandForScore(confidenceScore),
    method: "pulse-confidence-v1" as const,
    factors: confidenceFactors.factors
  };

  const missingEvidence = [
    ...new Set(dimensions.flatMap((dimension) => dimension.missingEvidence))
  ];
  const excludedEvidence = [
    ...new Set(dimensions.flatMap((dimension) => dimension.excludedEvidence))
  ];

  if (confidence.band === "low" || calculatedDimensions.length < 4) {
    return {
      formulaVersion: "repository-pulse-v1",
      status: "insufficient-evidence",
      overallScore: null,
      overallExplanation:
        "Overall Health is withheld until assessment confidence is at least moderate and at least four dimensions have enough evidence.",
      confidence,
      dimensions,
      missingEvidence,
      excludedEvidence
    };
  }

  const weightedScore = dimensions.reduce((sum, dimension) => {
    return sum + (dimension.score ?? 0) * dimension.weight;
  }, 0);

  return {
    formulaVersion: "repository-pulse-v1",
    status: "calculated",
    overallScore: Math.round(weightedScore),
    overallExplanation: dimensions
      .map(
        (dimension) =>
          `${dimension.label}: ${(dimension.score ?? 0).toString()} x ${dimension.weight.toFixed(2)} = ${dimension.weightedContribution.toFixed(1)}`
      )
      .join("; "),
    confidence,
    dimensions,
    missingEvidence,
    excludedEvidence
  };
}

function scoreArchitectureIntegrity(inputs: RepositoryPulseInputs): RepositoryPulseDimension {
  return buildDimension({
    key: "architectureIntegrity",
    label: "Architecture Integrity",
    weight: repositoryPulseWeights.architectureIntegrity,
    requiredEvidence: [
      inputs.graph.entityCount > 0 ? null : "At least one repository-scoped graph entity",
      inputs.graph.relationshipCount > 0
        ? null
        : "At least one repository-scoped graph relationship"
    ],
    evidenceIds: inputs.graph.evidenceIds,
    components: [
      component(
        "Graph entities",
        Math.min(inputs.graph.entityCount, 10),
        10,
        0.4,
        "More repository-scoped architecture entities improve architecture visibility.",
        inputs.graph.evidenceIds
      ),
      component(
        "Graph relationships",
        Math.min(inputs.graph.relationshipCount, 20),
        20,
        0.4,
        "Relationships explain dependencies and ownership paths.",
        inputs.graph.evidenceIds
      ),
      component(
        "Fresh graph entities",
        Math.max(0, inputs.graph.entityCount - inputs.graph.staleEntityCount),
        Math.max(1, inputs.graph.entityCount),
        0.2,
        "Stale graph entities reduce architecture confidence.",
        inputs.graph.evidenceIds
      )
    ]
  });
}

function scoreKnowledgeCoverage(inputs: RepositoryPulseInputs): RepositoryPulseDimension {
  return buildDimension({
    key: "knowledgeCoverage",
    label: "Knowledge Coverage",
    weight: repositoryPulseWeights.knowledgeCoverage,
    requiredEvidence: [
      inputs.memory.recordCount > 0 ? null : "At least one repository memory record",
      inputs.memory.evidenceItemCount > 0 ? null : "At least one memory evidence item"
    ],
    evidenceIds: inputs.memory.evidenceIds,
    components: [
      component(
        "Memory records",
        Math.min(inputs.memory.recordCount, 12),
        12,
        0.45,
        "Memory records capture facts, decisions, and recommendations for the repository.",
        inputs.memory.evidenceIds
      ),
      component(
        "Evidence items",
        Math.min(inputs.memory.evidenceItemCount, 24),
        24,
        0.35,
        "Evidence items make memory records auditable.",
        inputs.memory.evidenceIds
      ),
      component(
        "Decision coverage",
        Math.min(inputs.memory.decisionCount, 5),
        5,
        0.2,
        "Decision records preserve architectural and operational context.",
        inputs.memory.evidenceIds
      )
    ]
  });
}

function scoreDocumentationFreshness(inputs: RepositoryPulseInputs): RepositoryPulseDimension {
  return buildDimension({
    key: "documentationFreshness",
    label: "Documentation Freshness",
    weight: repositoryPulseWeights.documentationFreshness,
    requiredEvidence: [
      inputs.documentation.documentEvidenceCount > 0 ? null : "Documentation evidence"
    ],
    evidenceIds: inputs.documentation.evidenceIds,
    components: [
      component(
        "Documentation evidence",
        Math.min(inputs.documentation.documentEvidenceCount, 10),
        10,
        0.55,
        "Documentation evidence shows that repository behavior is explained outside code.",
        inputs.documentation.evidenceIds
      ),
      component(
        "Fresh documentation",
        Math.max(
          0,
          inputs.documentation.documentEvidenceCount -
            inputs.documentation.staleDocumentEvidenceCount
        ),
        Math.max(1, inputs.documentation.documentEvidenceCount),
        0.45,
        "Stale documentation evidence indicates drift.",
        inputs.documentation.evidenceIds
      )
    ]
  });
}

function scoreOwnershipCoverage(inputs: RepositoryPulseInputs): RepositoryPulseDimension {
  return buildDimension({
    key: "ownershipCoverage",
    label: "Ownership Coverage",
    weight: repositoryPulseWeights.ownershipCoverage,
    requiredEvidence: [inputs.ownership.ownerEvidenceCount > 0 ? null : "Ownership evidence"],
    evidenceIds: inputs.ownership.evidenceIds,
    components: [
      component(
        "Owner evidence",
        Math.min(inputs.ownership.ownerEvidenceCount, 8),
        8,
        0.7,
        "Owner evidence identifies accountable maintainers or teams.",
        inputs.ownership.evidenceIds
      ),
      component(
        "Critical insight ownership",
        Math.max(0, 5 - inputs.ownership.unownedCriticalInsightCount),
        5,
        0.3,
        "Unowned critical insights reduce ownership health.",
        inputs.ownership.evidenceIds
      )
    ]
  });
}

function scoreDeploymentStability(inputs: RepositoryPulseInputs): RepositoryPulseDimension {
  return buildDimension({
    key: "deploymentStability",
    label: "Deployment Stability",
    weight: repositoryPulseWeights.deploymentStability,
    requiredEvidence: [
      inputs.deployment.deploymentEvidenceCount > 0 || inputs.deployment.riskInsightCount > 0
        ? null
        : "Deployment evidence or deployment-risk insights"
    ],
    evidenceIds: inputs.deployment.evidenceIds,
    components: [
      component(
        "Deployment evidence",
        Math.min(inputs.deployment.deploymentEvidenceCount, 6),
        6,
        0.35,
        "Deployment evidence improves confidence in release and runtime state.",
        inputs.deployment.evidenceIds
      ),
      component(
        "Open risk load",
        Math.max(0, 10 - inputs.deployment.riskInsightCount),
        10,
        0.35,
        "More open deployment-risk insights reduce the score.",
        inputs.deployment.evidenceIds
      ),
      component(
        "Critical risk load",
        Math.max(0, 5 - inputs.deployment.criticalRiskInsightCount),
        5,
        0.3,
        "Critical deployment risks carry a larger penalty.",
        inputs.deployment.evidenceIds
      )
    ]
  });
}

function scoreTestingConfidence(inputs: RepositoryPulseInputs): RepositoryPulseDimension {
  return buildDimension({
    key: "testingConfidence",
    label: "Testing Confidence",
    weight: repositoryPulseWeights.testingConfidence,
    requiredEvidence: [
      inputs.testing.testEvidenceCount > 0 || inputs.testing.ciEvidenceCount > 0
        ? null
        : "Test or CI evidence"
    ],
    evidenceIds: inputs.testing.evidenceIds,
    components: [
      component(
        "Test evidence",
        Math.min(inputs.testing.testEvidenceCount, 10),
        10,
        0.45,
        "Test evidence shows changed behavior is covered by executable checks.",
        inputs.testing.evidenceIds
      ),
      component(
        "CI evidence",
        Math.min(inputs.testing.ciEvidenceCount, 8),
        8,
        0.35,
        "CI evidence shows tests are exercised by delivery workflows.",
        inputs.testing.evidenceIds
      ),
      component(
        "Contract-test evidence",
        Math.min(inputs.testing.contractTestEvidenceCount, 5),
        5,
        0.2,
        "Contract-test evidence increases confidence where interfaces have consumers.",
        inputs.testing.evidenceIds
      )
    ]
  });
}

function calculatePulseConfidenceFactors(
  inputs: RepositoryPulseInputs,
  dimensions: readonly RepositoryPulseDimension[]
): {
  readonly score: number;
  readonly factors: Record<string, number>;
} {
  const calculatedDimensionCount = dimensions.filter(
    (dimension) => dimension.score !== null
  ).length;
  const totalDimensionCount = dimensions.length;
  const evidenceCoverage = Math.round((calculatedDimensionCount / totalDimensionCount) * 100);
  const now = Date.now();
  const freshEvidenceCount = inputs.evidence.filter(
    (item) => Math.floor((now - new Date(item.observedAt).getTime()) / 86_400_000) <= 90
  ).length;
  const freshness =
    inputs.evidence.length === 0
      ? 0
      : Math.round((freshEvidenceCount / inputs.evidence.length) * 100);
  const uniqueSourceTypes = new Set(inputs.evidence.map((item) => item.sourceType)).size;
  const sourceAgreement = Math.min(100, uniqueSourceTypes * 34);
  const deterministicEvidenceCount = inputs.evidence.filter(
    (item) => item.kind !== "insight"
  ).length;
  const deterministicExtraction =
    inputs.evidence.length === 0
      ? 0
      : Math.round((deterministicEvidenceCount / inputs.evidence.length) * 100);
  const contradictionPenalty = Math.min(
    100,
    inputs.deployment.criticalRiskInsightCount * 20 +
      inputs.ownership.unownedCriticalInsightCount * 10 +
      inputs.ai.lowConfidenceInsightCount * 8
  );
  const rawScore = Math.round(
    evidenceCoverage * 0.35 +
      freshness * 0.25 +
      sourceAgreement * 0.2 +
      deterministicExtraction * 0.1 -
      contradictionPenalty * 0.1
  );
  const criticalDimensionMissing = dimensions.some(
    (dimension) =>
      ["architectureIntegrity", "deploymentStability", "testingConfidence"].includes(
        dimension.key
      ) && dimension.score === null
  );
  const score = Math.max(0, Math.min(criticalDimensionMissing ? 59 : 100, rawScore));

  return {
    score,
    factors: {
      calculatedDimensionCount,
      totalDimensionCount,
      evidenceCount: inputs.evidence.length,
      evidenceCoverage,
      freshness,
      sourceAgreement,
      deterministicExtraction,
      contradictionPenalty,
      criticalDimensionMissing: criticalDimensionMissing ? 1 : 0
    }
  };
}

function buildDimension(input: {
  readonly key: RepositoryPulseDimensionKey;
  readonly label: string;
  readonly weight: number;
  readonly requiredEvidence: readonly (string | null)[];
  readonly evidenceIds: readonly string[];
  readonly components: readonly RepositoryPulseComponent[];
}): RepositoryPulseDimension {
  const missingEvidence = input.requiredEvidence.filter((item): item is string => item !== null);
  const confidenceScore = Math.min(
    100,
    Math.round((input.evidenceIds.length / Math.max(1, input.requiredEvidence.length)) * 50) +
      Math.round(input.components.filter((item) => item.value > 0).length * 12)
  );
  const status =
    missingEvidence.length === 0 && input.evidenceIds.length > 0
      ? "calculated"
      : "insufficient-evidence";
  const score =
    status === "calculated"
      ? Math.round(input.components.reduce((sum, item) => sum + item.contribution, 0))
      : null;

  return {
    key: input.key,
    label: input.label,
    score,
    weight: input.weight,
    weightedContribution: score === null ? 0 : score * input.weight,
    status,
    confidence: {
      score: confidenceScore,
      band: confidenceBandForScore(confidenceScore),
      method: "pulse-confidence-v1",
      factors: {
        evidenceCount: input.evidenceIds.length,
        requiredEvidenceCount: input.requiredEvidence.length,
        missingEvidenceCount: missingEvidence.length,
        componentCount: input.components.length
      }
    },
    components: input.components,
    evidenceIds: input.evidenceIds,
    missingEvidence,
    excludedEvidence: [],
    explanation:
      status === "calculated"
        ? input.components
            .map(
              (item) =>
                `${item.name}: ${item.value}/${item.max} x ${item.weight.toFixed(2)} = ${item.contribution.toFixed(1)}`
            )
            .join("; ")
        : `Score withheld because missing evidence: ${missingEvidence.join(", ")}.`
  };
}

function component(
  name: string,
  value: number,
  max: number,
  weight: number,
  explanation: string,
  evidenceIds: readonly string[]
): RepositoryPulseComponent {
  const boundedValue = Math.max(0, Math.min(value, max));
  return {
    name,
    value: boundedValue,
    max,
    weight,
    contribution: (boundedValue / max) * 100 * weight,
    explanation,
    evidenceIds
  };
}
