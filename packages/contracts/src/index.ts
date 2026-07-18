import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const problemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  correlationId: z.string().optional()
});

export type ProblemDetails = z.infer<typeof problemDetailsSchema>;

export const healthStatusSchema = z.enum(["ok", "degraded", "unavailable"]);

export const healthResponseSchema = z.object({
  status: healthStatusSchema,
  service: z.string(),
  environment: z.string(),
  timestamp: isoDateTimeSchema,
  version: z.string(),
  correlationId: z.string()
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const correlationHeadersSchema = z.object({
  "x-correlation-id": z.string().min(8).max(128).optional()
});

export const domainEventEnvelopeSchema = z.object({
  eventId: uuidSchema,
  eventName: z.string().min(1),
  eventVersion: z.number().int().positive(),
  organizationId: uuidSchema,
  occurredAt: isoDateTimeSchema,
  correlationId: z.string().min(8),
  payload: z.record(z.unknown())
});

export type DomainEventEnvelope = z.infer<typeof domainEventEnvelopeSchema>;

export const queueNames = {
  repositoryIngestion: "repository.ingestion",
  continuousReasoning: "continuous.reasoning"
} as const;

export const organizationRoleSchema = z.enum(["owner", "admin", "member", "viewer"]);
export type OrganizationRole = z.infer<typeof organizationRoleSchema>;

export const organizationPermissionSchema = z.enum([
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
]);
export type OrganizationPermission = z.infer<typeof organizationPermissionSchema>;

export const authenticatedOrganizationSchema = z.object({
  id: uuidSchema,
  slug: z.string().min(2),
  displayName: z.string().min(1),
  role: organizationRoleSchema,
  permissions: z.array(organizationPermissionSchema)
});
export type AuthenticatedOrganization = z.infer<typeof authenticatedOrganizationSchema>;

export const authenticatedPrincipalSchema = z.object({
  userId: uuidSchema,
  email: z.string().email(),
  name: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
  organizationId: uuidSchema,
  organizationSlug: z.string().min(2),
  role: organizationRoleSchema,
  permissions: z.array(organizationPermissionSchema)
});
export type AuthenticatedPrincipal = z.infer<typeof authenticatedPrincipalSchema>;

export const githubOAuthExchangeRequestSchema = z.object({
  providerAccountId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).nullable(),
  username: z.string().min(1).nullable(),
  avatarUrl: z.string().url().nullable(),
  profileUrl: z.string().url().nullable()
});
export type GitHubOAuthExchangeRequest = z.infer<typeof githubOAuthExchangeRequestSchema>;

export const authTokenResponseSchema = z.object({
  accessToken: z.string().min(1),
  expiresAt: isoDateTimeSchema,
  principal: authenticatedPrincipalSchema,
  organizations: z.array(authenticatedOrganizationSchema)
});
export type AuthTokenResponse = z.infer<typeof authTokenResponseSchema>;

export const organizationSummarySchema = z.object({
  id: uuidSchema,
  slug: z.string().min(2),
  displayName: z.string().min(1),
  role: organizationRoleSchema,
  permissions: z.array(organizationPermissionSchema)
});
export type OrganizationSummary = z.infer<typeof organizationSummarySchema>;

export const createOrganizationRequestSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  displayName: z.string().min(2).max(120)
});
export type CreateOrganizationRequest = z.infer<typeof createOrganizationRequestSchema>;

export const switchOrganizationRequestSchema = z.object({
  organizationId: uuidSchema
});
export type SwitchOrganizationRequest = z.infer<typeof switchOrganizationRequestSchema>;

export const membershipStatusSchema = z.enum(["active", "disabled"]);
export type MembershipStatus = z.infer<typeof membershipStatusSchema>;

export const membershipSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  userId: uuidSchema,
  email: z.string().email(),
  name: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
  role: organizationRoleSchema,
  status: membershipStatusSchema,
  createdAt: isoDateTimeSchema
});
export type Membership = z.infer<typeof membershipSchema>;

export const updateMembershipRequestSchema = z.object({
  role: organizationRoleSchema.optional(),
  status: membershipStatusSchema.optional()
});
export type UpdateMembershipRequest = z.infer<typeof updateMembershipRequestSchema>;

export const invitationStatusSchema = z.enum(["pending", "accepted", "revoked", "expired"]);
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;

export const invitationSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  email: z.string().email(),
  role: organizationRoleSchema,
  status: invitationStatusSchema,
  invitedByUserId: uuidSchema,
  acceptedByUserId: uuidSchema.nullable(),
  expiresAt: isoDateTimeSchema,
  createdAt: isoDateTimeSchema
});
export type Invitation = z.infer<typeof invitationSchema>;

export const createInvitationRequestSchema = z.object({
  email: z.string().email(),
  role: organizationRoleSchema
});
export type CreateInvitationRequest = z.infer<typeof createInvitationRequestSchema>;

export const createInvitationResponseSchema = z.object({
  invitation: invitationSchema,
  invitationToken: z.string().min(32)
});
export type CreateInvitationResponse = z.infer<typeof createInvitationResponseSchema>;

export const acceptInvitationRequestSchema = z.object({
  invitationToken: z.string().min(32)
});
export type AcceptInvitationRequest = z.infer<typeof acceptInvitationRequestSchema>;

export const graphLifecycleSchema = z.enum([
  "proposed",
  "verified",
  "active",
  "challenged",
  "superseded",
  "deprecated",
  "archived"
]);
export type GraphLifecycle = z.infer<typeof graphLifecycleSchema>;

export const graphRelationshipStatusSchema = graphLifecycleSchema;
export type GraphRelationshipStatus = z.infer<typeof graphRelationshipStatusSchema>;

export const confidenceBandSchema = z.enum(["low", "moderate", "high"]);

export const graphProvenanceSchema = z.object({
  sourceType: z.string().min(1),
  sourceLocator: z.string().min(1),
  sourceRevision: z.string().min(1).nullable(),
  observedAt: isoDateTimeSchema,
  extractionMethod: z.string().min(1),
  evidence: z.array(z.string().min(1)).default([])
});
export type GraphProvenance = z.infer<typeof graphProvenanceSchema>;

export const graphEntitySchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  entityType: z.string().min(1),
  canonicalKey: z.string().min(1),
  displayName: z.string().nullable(),
  attributes: z.record(z.unknown()),
  sourceScope: z.record(z.unknown()),
  provenance: graphProvenanceSchema,
  lifecycle: graphLifecycleSchema,
  version: z.number().int().positive(),
  confidenceScore: z.number().int().min(0).max(100),
  confidenceBand: confidenceBandSchema,
  validFrom: isoDateTimeSchema.nullable(),
  validUntil: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});
export type GraphEntity = z.infer<typeof graphEntitySchema>;

export const graphRelationshipSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  sourceEntityId: uuidSchema,
  targetEntityId: uuidSchema,
  relationship: z.string().min(1),
  status: graphRelationshipStatusSchema,
  provenance: graphProvenanceSchema,
  attributes: z.record(z.unknown()),
  version: z.number().int().positive(),
  confidenceScore: z.number().int().min(0).max(100),
  confidenceBand: confidenceBandSchema,
  validFrom: isoDateTimeSchema.nullable(),
  validUntil: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});
export type GraphRelationship = z.infer<typeof graphRelationshipSchema>;

export const upsertGraphEntityRequestSchema = z.object({
  entityType: z.string().min(1).max(120),
  canonicalKey: z.string().min(1).max(512),
  aliases: z.array(z.string().min(1).max(512)).default([]),
  displayName: z.string().min(1).max(240).nullable().default(null),
  attributes: z.record(z.unknown()).default({}),
  sourceScope: z.record(z.unknown()).default({}),
  provenance: graphProvenanceSchema,
  lifecycle: graphLifecycleSchema.default("active"),
  confidenceScore: z.number().int().min(0).max(100),
  validFrom: isoDateTimeSchema.nullable().default(null),
  validUntil: isoDateTimeSchema.nullable().default(null),
  changeReason: z.string().min(1).max(500).default("entity upsert")
});
export type UpsertGraphEntityRequest = z.infer<typeof upsertGraphEntityRequestSchema>;

export const resolveGraphEntityRequestSchema = z.object({
  entityType: z.string().min(1).max(120),
  key: z.string().min(1).max(512)
});
export type ResolveGraphEntityRequest = z.infer<typeof resolveGraphEntityRequestSchema>;

export const upsertGraphRelationshipRequestSchema = z.object({
  sourceEntityId: uuidSchema,
  targetEntityId: uuidSchema,
  relationship: z.string().min(1).max(160),
  attributes: z.record(z.unknown()).default({}),
  provenance: graphProvenanceSchema,
  status: graphRelationshipStatusSchema.default("active"),
  confidenceScore: z.number().int().min(0).max(100),
  validFrom: isoDateTimeSchema.nullable().default(null),
  validUntil: isoDateTimeSchema.nullable().default(null),
  changeReason: z.string().min(1).max(500).default("relationship upsert")
});
export type UpsertGraphRelationshipRequest = z.infer<typeof upsertGraphRelationshipRequestSchema>;

export const graphTraversalDirectionSchema = z.enum(["outgoing", "incoming", "both"]);
export const graphTraversalRequestSchema = z.object({
  rootEntityId: uuidSchema,
  maxDepth: z.number().int().min(1).max(5).default(2),
  direction: graphTraversalDirectionSchema.default("both"),
  relationshipTypes: z.array(z.string().min(1)).default([]),
  asOf: isoDateTimeSchema.nullable().default(null)
});
export type GraphTraversalRequest = z.infer<typeof graphTraversalRequestSchema>;

export const graphTraversalResultSchema = z.object({
  rootEntityId: uuidSchema,
  maxDepth: z.number().int().min(1).max(5),
  nodes: z.array(graphEntitySchema),
  edges: z.array(graphRelationshipSchema)
});
export type GraphTraversalResult = z.infer<typeof graphTraversalResultSchema>;

export const graphProjectionKindSchema = z.enum(["explorer", "reasoning", "impact", "ownership"]);
export const upsertGraphProjectionRequestSchema = z.object({
  name: z.string().min(2).max(160),
  kind: graphProjectionKindSchema,
  rootEntityId: uuidSchema.nullable().default(null),
  projection: graphTraversalResultSchema,
  provenance: graphProvenanceSchema
});
export type UpsertGraphProjectionRequest = z.infer<typeof upsertGraphProjectionRequestSchema>;

export const graphProjectionSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  name: z.string().min(1),
  kind: graphProjectionKindSchema,
  rootEntityId: uuidSchema.nullable(),
  projection: graphTraversalResultSchema,
  provenance: graphProvenanceSchema,
  version: z.number().int().positive(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});
export type GraphProjection = z.infer<typeof graphProjectionSchema>;

export const graphVersionSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  subjectId: uuidSchema,
  version: z.number().int().positive(),
  snapshot: z.record(z.unknown()),
  changedByUserId: uuidSchema.nullable(),
  changeReason: z.string().min(1),
  createdAt: isoDateTimeSchema
});
export type GraphVersion = z.infer<typeof graphVersionSchema>;

export const memoryClassificationSchema = z.enum(["fact", "decision", "recommendation"]);
export type MemoryClassification = z.infer<typeof memoryClassificationSchema>;

export const memoryLifecycleSchema = z.enum([
  "proposed",
  "verified",
  "active",
  "challenged",
  "superseded",
  "deprecated",
  "archived"
]);
export type MemoryLifecycle = z.infer<typeof memoryLifecycleSchema>;

export const evidenceDirectionSchema = z.enum(["supports", "challenges"]);
export type EvidenceDirection = z.infer<typeof evidenceDirectionSchema>;

export const correctionStatusSchema = z.enum(["pending", "applied", "rejected"]);
export type CorrectionStatus = z.infer<typeof correctionStatusSchema>;

export const memoryTimelineEventTypeSchema = z.enum([
  "record_created",
  "record_updated",
  "lifecycle_transitioned",
  "evidence_added",
  "correction_requested",
  "correction_applied",
  "correction_rejected",
  "confidence_recalculated"
]);
export type MemoryTimelineEventType = z.infer<typeof memoryTimelineEventTypeSchema>;

export const memoryProvenanceSchema = z.object({
  sourceType: z.string().min(1),
  sourceLocator: z.string().min(1),
  sourceRevision: z.string().min(1).nullable(),
  observedAt: isoDateTimeSchema,
  extractionMethod: z.string().min(1),
  actor: z.string().min(1).nullable().default(null),
  evidence: z.array(z.string().min(1)).default([])
});
export type MemoryProvenance = z.infer<typeof memoryProvenanceSchema>;

export const memoryConfidenceSchema = z.object({
  score: z.number().int().min(0).max(100),
  band: confidenceBandSchema,
  method: z.string().min(1),
  factors: z.record(z.unknown()),
  missingEvidence: z.array(z.string().min(1)).default([]),
  counterevidence: z.array(z.string().min(1)).default([])
});
export type MemoryConfidence = z.infer<typeof memoryConfidenceSchema>;

export const memoryRecordSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  classification: memoryClassificationSchema,
  lifecycle: memoryLifecycleSchema,
  subjectEntityId: uuidSchema.nullable(),
  claim: z.string().min(1),
  owner: z.string().nullable(),
  reasoning: z.string().nullable(),
  provenance: memoryProvenanceSchema,
  version: z.number().int().positive(),
  confidence: memoryConfidenceSchema,
  validFrom: isoDateTimeSchema.nullable(),
  validUntil: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});
export type MemoryRecord = z.infer<typeof memoryRecordSchema>;

export const createMemoryRecordRequestSchema = z.object({
  classification: memoryClassificationSchema,
  subjectEntityId: uuidSchema.nullable().default(null),
  claim: z.string().min(3).max(2000),
  owner: z.string().min(1).max(240).nullable().default(null),
  reasoning: z.string().min(1).max(4000).nullable().default(null),
  provenance: memoryProvenanceSchema,
  confidenceScore: z.number().int().min(0).max(100),
  confidenceMethod: z.string().min(1).max(240),
  confidenceFactors: z.record(z.unknown()).default({}),
  missingEvidence: z.array(z.string().min(1)).default([]),
  counterevidence: z.array(z.string().min(1)).default([]),
  validFrom: isoDateTimeSchema.nullable().default(null),
  validUntil: isoDateTimeSchema.nullable().default(null),
  changeReason: z.string().min(1).max(500).default("memory record created")
});
export type CreateMemoryRecordRequest = z.infer<typeof createMemoryRecordRequestSchema>;

export const updateMemoryRecordRequestSchema = z.object({
  claim: z.string().min(3).max(2000).optional(),
  owner: z.string().min(1).max(240).nullable().optional(),
  reasoning: z.string().min(1).max(4000).nullable().optional(),
  provenance: memoryProvenanceSchema.optional(),
  confidenceScore: z.number().int().min(0).max(100).optional(),
  confidenceMethod: z.string().min(1).max(240).optional(),
  confidenceFactors: z.record(z.unknown()).optional(),
  missingEvidence: z.array(z.string().min(1)).optional(),
  counterevidence: z.array(z.string().min(1)).optional(),
  validFrom: isoDateTimeSchema.nullable().optional(),
  validUntil: isoDateTimeSchema.nullable().optional(),
  changeReason: z.string().min(1).max(500)
});
export type UpdateMemoryRecordRequest = z.infer<typeof updateMemoryRecordRequestSchema>;

export const transitionMemoryLifecycleRequestSchema = z.object({
  lifecycle: memoryLifecycleSchema,
  rationale: z.string().min(1).max(1000)
});
export type TransitionMemoryLifecycleRequest = z.infer<
  typeof transitionMemoryLifecycleRequestSchema
>;

export const evidenceItemSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  memoryRecordId: uuidSchema.nullable(),
  sourceType: z.string().min(1),
  sourceLocator: z.string().min(1),
  sourceRevision: z.string().nullable(),
  extractionMethod: z.string().min(1),
  direction: evidenceDirectionSchema,
  observedAt: isoDateTimeSchema,
  metadata: z.record(z.unknown()),
  provenance: memoryProvenanceSchema,
  version: z.number().int().positive(),
  createdAt: isoDateTimeSchema
});
export type EvidenceItem = z.infer<typeof evidenceItemSchema>;

export const createEvidenceItemRequestSchema = z.object({
  sourceType: z.string().min(1).max(120),
  sourceLocator: z.string().min(1).max(1000),
  sourceRevision: z.string().min(1).max(240).nullable().default(null),
  extractionMethod: z.string().min(1).max(240),
  direction: evidenceDirectionSchema.default("supports"),
  observedAt: isoDateTimeSchema,
  metadata: z.record(z.unknown()).default({}),
  provenance: memoryProvenanceSchema,
  changeReason: z.string().min(1).max(500).default("evidence item added")
});
export type CreateEvidenceItemRequest = z.infer<typeof createEvidenceItemRequestSchema>;

export const correctionSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  memoryRecordId: uuidSchema,
  actorId: uuidSchema,
  rationale: z.string().min(1),
  status: correctionStatusSchema,
  proposedClaim: z.string().nullable(),
  proposedLifecycle: memoryLifecycleSchema.nullable(),
  proposedConfidenceScore: z.number().int().min(0).max(100).nullable(),
  provenance: memoryProvenanceSchema,
  version: z.number().int().positive(),
  reviewedByUserId: uuidSchema.nullable(),
  reviewRationale: z.string().nullable(),
  appliedAt: isoDateTimeSchema.nullable(),
  rejectedAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});
export type Correction = z.infer<typeof correctionSchema>;

export const createCorrectionRequestSchema = z
  .object({
    rationale: z.string().min(3).max(2000),
    proposedClaim: z.string().min(3).max(2000).nullable().default(null),
    proposedLifecycle: memoryLifecycleSchema.nullable().default(null),
    proposedConfidenceScore: z.number().int().min(0).max(100).nullable().default(null),
    provenance: memoryProvenanceSchema,
    changeReason: z.string().min(1).max(500).default("correction requested")
  })
  .refine(
    (value) =>
      value.proposedClaim !== null ||
      value.proposedLifecycle !== null ||
      value.proposedConfidenceScore !== null,
    "A correction must propose at least one change."
  );
export type CreateCorrectionRequest = z.infer<typeof createCorrectionRequestSchema>;

export const reviewCorrectionRequestSchema = z.object({
  decision: z.enum(["apply", "reject"]),
  rationale: z.string().min(3).max(2000)
});
export type ReviewCorrectionRequest = z.infer<typeof reviewCorrectionRequestSchema>;

export const memoryTimelineEventSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  memoryRecordId: uuidSchema,
  eventType: memoryTimelineEventTypeSchema,
  actorId: uuidSchema.nullable(),
  eventVersion: z.number().int().positive(),
  payload: z.record(z.unknown()),
  occurredAt: isoDateTimeSchema
});
export type MemoryTimelineEvent = z.infer<typeof memoryTimelineEventSchema>;

export const memoryVersionSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  subjectId: uuidSchema,
  version: z.number().int().positive(),
  snapshot: z.record(z.unknown()),
  changedByUserId: uuidSchema.nullable(),
  changeReason: z.string().min(1),
  createdAt: isoDateTimeSchema
});
export type MemoryVersion = z.infer<typeof memoryVersionSchema>;

export const repositorySnapshotRequestedPayloadSchema = z.object({
  repositoryId: uuidSchema,
  organizationId: uuidSchema,
  requestedByUserId: uuidSchema.optional(),
  provider: z.enum(["github"]),
  providerRepositoryId: z.string().min(1),
  defaultBranch: z.string().min(1),
  correlationId: z.string().min(8)
});

export type RepositorySnapshotRequestedPayload = z.infer<
  typeof repositorySnapshotRequestedPayloadSchema
>;

export const repositoryProviderSchema = z.enum(["github"]);
export type RepositoryProvider = z.infer<typeof repositoryProviderSchema>;

export const repositoryConnectionStatusSchema = z.enum([
  "connected",
  "suspended",
  "revoked",
  "archived"
]);
export type RepositoryConnectionStatus = z.infer<typeof repositoryConnectionStatusSchema>;

export const repositorySchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  provider: repositoryProviderSchema,
  providerRepositoryId: z.string().min(1),
  name: z.string().min(1),
  defaultBranch: z.string().min(1),
  connectionStatus: repositoryConnectionStatusSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});
export type Repository = z.infer<typeof repositorySchema>;

export const createRepositoryRequestSchema = z.object({
  provider: repositoryProviderSchema.default("github"),
  providerRepositoryId: z.string().min(1).max(240),
  name: z.string().min(1).max(240),
  defaultBranch: z.string().min(1).max(120).default("main")
});
export type CreateRepositoryRequest = z.infer<typeof createRepositoryRequestSchema>;

export const updateRepositoryRequestSchema = z.object({
  name: z.string().min(1).max(240).optional(),
  defaultBranch: z.string().min(1).max(120).optional(),
  connectionStatus: repositoryConnectionStatusSchema.optional()
});
export type UpdateRepositoryRequest = z.infer<typeof updateRepositoryRequestSchema>;

export const insightImpactSchema = z.enum(["low", "medium", "high", "critical"]);
export type InsightImpact = z.infer<typeof insightImpactSchema>;

export const insightStatusSchema = z.enum([
  "open",
  "acknowledged",
  "resolved",
  "dismissed",
  "expired"
]);
export type InsightStatus = z.infer<typeof insightStatusSchema>;

export const insightSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  repositoryId: uuidSchema.nullable(),
  capability: z.string().min(1),
  claim: z.string().min(1),
  impact: insightImpactSchema,
  status: insightStatusSchema,
  confidence: z.object({
    score: z.number().int().min(0).max(100),
    band: confidenceBandSchema,
    method: z.string().min(1),
    factors: z.record(z.unknown()),
    missingEvidence: z.array(z.string().min(1)),
    counterevidence: z.array(z.string().min(1))
  }),
  evidenceSet: z.array(z.unknown()),
  recommendedAction: z.string().min(1),
  reevaluationTrigger: z.record(z.unknown()),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});
export type Insight = z.infer<typeof insightSchema>;

export const reasoningAgentRoleSchema = z.enum([
  "orchestrator",
  "architect",
  "reviewer",
  "historian",
  "librarian",
  "planner"
]);
export type ReasoningAgentRole = z.infer<typeof reasoningAgentRoleSchema>;

export const reasoningRunStatusSchema = z.enum(["packaged", "evaluated", "persisted", "rejected"]);
export type ReasoningRunStatus = z.infer<typeof reasoningRunStatusSchema>;

export const reasoningEvaluationStatusSchema = z.enum(["passed", "failed"]);
export type ReasoningEvaluationStatus = z.infer<typeof reasoningEvaluationStatusSchema>;

export const reasoningImpactSchema = z.enum(["low", "medium", "high", "critical"]);
export type ReasoningImpact = z.infer<typeof reasoningImpactSchema>;

export const reasoningEvidenceRefSchema = z.object({
  evidenceId: z.string().min(1),
  relevance: z.string().min(1).max(1000)
});
export type ReasoningEvidenceRef = z.infer<typeof reasoningEvidenceRefSchema>;

export const reasoningEvidenceItemSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["graph_entity", "graph_relationship", "memory_record", "evidence_item"]),
  sourceType: z.string().min(1),
  sourceLocator: z.string().min(1),
  sourceRevision: z.string().min(1).nullable(),
  observedAt: isoDateTimeSchema,
  summary: z.string().min(1),
  payload: z.record(z.unknown())
});
export type ReasoningEvidenceItem = z.infer<typeof reasoningEvidenceItemSchema>;

export const reasoningEvidencePackageSchema = z.object({
  packageVersion: z.literal("reasoning-evidence-v1"),
  generatedAt: isoDateTimeSchema,
  question: z.string().min(3).max(2000),
  evidence: z.array(reasoningEvidenceItemSchema),
  graph: graphTraversalResultSchema.nullable(),
  memoryRecordIds: z.array(uuidSchema),
  missingEvidence: z.array(z.string().min(1)).default([])
});
export type ReasoningEvidencePackage = z.infer<typeof reasoningEvidencePackageSchema>;

export const reasoningConclusionSchema = z.object({
  claim: z.string().min(3).max(2000),
  reasoning: z.string().min(1).max(4000),
  evidence: z.array(reasoningEvidenceRefSchema).min(1),
  confidence: z.object({
    score: z.number().int().min(0).max(100),
    band: confidenceBandSchema,
    method: z.string().min(1),
    factors: z.record(z.unknown()),
    missingEvidence: z.array(z.string().min(1)).default([]),
    counterevidence: z.array(z.string().min(1)).default([])
  }),
  impact: reasoningImpactSchema,
  recommendedAction: z.string().min(1).max(2000),
  reevaluationTrigger: z.string().min(1).max(1000)
});
export type ReasoningConclusion = z.infer<typeof reasoningConclusionSchema>;

export const reasoningAgentOutputSchema = z.object({
  role: reasoningAgentRoleSchema.exclude(["orchestrator"]),
  promptVersion: z.string().min(1),
  modelVersion: z.string().min(1),
  conclusions: z.array(reasoningConclusionSchema).default([]),
  abstained: z.boolean().default(false),
  abstentionReason: z.string().min(1).max(1000).nullable().default(null)
});
export type ReasoningAgentOutput = z.infer<typeof reasoningAgentOutputSchema>;

export const createReasoningRunRequestSchema = z.object({
  question: z.string().min(3).max(2000),
  rootEntityId: uuidSchema.nullable().default(null),
  maxGraphDepth: z.number().int().min(1).max(3).default(2),
  memoryRecordIds: z.array(uuidSchema).max(50).default([]),
  repositoryId: uuidSchema.nullable().default(null),
  promptVersion: z.string().min(1).max(120).default("continuous-reasoning-v1"),
  modelVersion: z.string().min(1).max(120).default("atlas-evidence-gated-reasoner-v1")
});
export type CreateReasoningRunRequest = z.infer<typeof createReasoningRunRequestSchema>;

export const reasoningPromptSchema = z.object({
  role: reasoningAgentRoleSchema,
  promptVersion: z.string().min(1),
  instructions: z.string().min(1),
  outputSchema: z.record(z.unknown())
});
export type ReasoningPrompt = z.infer<typeof reasoningPromptSchema>;

export const reasoningEvaluationSchema = z.object({
  id: uuidSchema,
  reasoningRunId: uuidSchema,
  status: reasoningEvaluationStatusSchema,
  checks: z.array(
    z.object({
      name: z.string().min(1),
      passed: z.boolean(),
      message: z.string().min(1)
    })
  ),
  createdAt: isoDateTimeSchema
});
export type ReasoningEvaluation = z.infer<typeof reasoningEvaluationSchema>;

export const reasoningRunSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  requestedByUserId: uuidSchema,
  status: reasoningRunStatusSchema,
  question: z.string().min(1),
  promptVersion: z.string().min(1),
  modelVersion: z.string().min(1),
  evidencePackage: reasoningEvidencePackageSchema,
  prompts: z.array(reasoningPromptSchema),
  agentOutputs: z.array(reasoningAgentOutputSchema),
  conclusions: z.array(reasoningConclusionSchema),
  evaluation: reasoningEvaluationSchema.nullable(),
  persistedInsightIds: z.array(uuidSchema),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});
export type ReasoningRun = z.infer<typeof reasoningRunSchema>;

export const pulseDimensionKeySchema = z.enum([
  "architectureIntegrity",
  "knowledgeCoverage",
  "ownershipCoverage",
  "documentationFreshness",
  "deploymentStability",
  "testingConfidence"
]);
export type PulseDimensionKey = z.infer<typeof pulseDimensionKeySchema>;

export const pulseStatusSchema = z.enum(["calculated", "insufficient-evidence"]);
export type PulseStatus = z.infer<typeof pulseStatusSchema>;

export const pulseTrendDirectionSchema = z.enum(["up", "down", "flat", "unknown"]);
export type PulseTrendDirection = z.infer<typeof pulseTrendDirectionSchema>;

export const pulseEvidenceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["repository", "snapshot", "insight", "graph_entity", "memory_record", "evidence"]),
  label: z.string().min(1),
  sourceType: z.string().min(1),
  sourceLocator: z.string().min(1),
  observedAt: isoDateTimeSchema,
  summary: z.string().min(1)
});
export type PulseEvidence = z.infer<typeof pulseEvidenceSchema>;

export const pulseScoreComponentSchema = z.object({
  name: z.string().min(1),
  value: z.number(),
  max: z.number().positive(),
  weight: z.number().min(0),
  contribution: z.number(),
  explanation: z.string().min(1),
  evidenceIds: z.array(z.string().min(1)).default([])
});
export type PulseScoreComponent = z.infer<typeof pulseScoreComponentSchema>;

export const pulseDimensionSchema = z.object({
  key: pulseDimensionKeySchema,
  label: z.string().min(1),
  score: z.number().int().min(0).max(100).nullable(),
  weight: z.number().min(0).max(1),
  weightedContribution: z.number().min(0),
  status: pulseStatusSchema,
  confidence: z.object({
    score: z.number().int().min(0).max(100),
    band: confidenceBandSchema,
    method: z.string().min(1),
    factors: z.record(z.unknown())
  }),
  components: z.array(pulseScoreComponentSchema),
  evidenceIds: z.array(z.string().min(1)),
  missingEvidence: z.array(z.string().min(1)),
  excludedEvidence: z.array(z.string().min(1)),
  explanation: z.string().min(1)
});
export type PulseDimension = z.infer<typeof pulseDimensionSchema>;

export const pulseTrendSchema = z.object({
  direction: pulseTrendDirectionSchema,
  delta: z.number().nullable(),
  previousScore: z.number().int().min(0).max(100).nullable(),
  currentScore: z.number().int().min(0).max(100).nullable(),
  sampleSize: z.number().int().min(0),
  explanation: z.string().min(1),
  history: z.array(
    z.object({
      assessmentId: uuidSchema,
      calculatedAt: isoDateTimeSchema,
      overallScore: z.number().int().min(0).max(100).nullable(),
      status: pulseStatusSchema
    })
  )
});
export type PulseTrend = z.infer<typeof pulseTrendSchema>;

export const pulseAssessmentSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  repositoryId: uuidSchema,
  formulaVersion: z.literal("repository-pulse-v1"),
  status: pulseStatusSchema,
  overallScore: z.number().int().min(0).max(100).nullable(),
  overallExplanation: z.string().min(1),
  confidence: z.object({
    score: z.number().int().min(0).max(100),
    band: confidenceBandSchema,
    method: z.string().min(1),
    factors: z.record(z.unknown())
  }),
  dimensions: z.array(pulseDimensionSchema),
  evidence: z.array(pulseEvidenceSchema),
  missingEvidence: z.array(z.string().min(1)),
  excludedEvidence: z.array(z.string().min(1)),
  trend: pulseTrendSchema,
  calculatedAt: isoDateTimeSchema,
  createdAt: isoDateTimeSchema
});
export type PulseAssessment = z.infer<typeof pulseAssessmentSchema>;

export const foundationStatusSchema = z.object({
  capabilityBoundaries: z.array(z.string().min(1)),
  database: z.object({ configured: z.boolean() }),
  redis: z.object({ configured: z.boolean() }),
  openTelemetry: z.object({ serviceName: z.string().min(1) })
});

export type FoundationStatus = z.infer<typeof foundationStatusSchema>;
