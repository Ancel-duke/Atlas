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
    "pulse:read",
    "audit:read"
  ],
  member: [
    "organization:read",
    "membership:read",
    "invitation:read",
    "graph:read",
    "graph:write",
    "graph:project",
    "memory:read",
    "memory:write",
    "memory:evidence",
    "memory:correct",
    "repository:read",
    "repository:write",
    "pulse:read"
  ],
  viewer: [
    "organization:read",
    "membership:read",
    "graph:read",
    "memory:read",
    "repository:read",
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
