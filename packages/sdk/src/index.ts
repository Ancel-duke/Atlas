import {
  authTokenResponseSchema,
  createInvitationResponseSchema,
  createReasoningRunRequestSchema,
  createRepositoryRequestSchema,
  correctionSchema,
  evidenceItemSchema,
  foundationStatusSchema,
  graphEntitySchema,
  graphProjectionSchema,
  graphRelationshipSchema,
  graphTraversalResultSchema,
  graphVersionSchema,
  healthResponseSchema,
  insightSchema,
  invitationSchema,
  memoryRecordSchema,
  memoryTimelineEventSchema,
  memoryVersionSchema,
  membershipSchema,
  organizationSummarySchema,
  problemDetailsSchema,
  pulseAssessmentSchema,
  reasoningRunSchema,
  repositorySchema,
  updateRepositoryRequestSchema,
  type AcceptInvitationRequest,
  type AuthTokenResponse,
  type CreateInvitationRequest,
  type CreateInvitationResponse,
  type CreateCorrectionRequest,
  type CreateEvidenceItemRequest,
  type CreateMemoryRecordRequest,
  type CreateOrganizationRequest,
  type CreateReasoningRunRequest,
  type CreateRepositoryRequest,
  type Correction,
  type EvidenceItem,
  type FoundationStatus,
  type GraphEntity,
  type GraphProjection,
  type GraphRelationship,
  type GraphTraversalRequest,
  type GraphTraversalResult,
  type GraphVersion,
  type HealthResponse,
  type Insight,
  type Invitation,
  type MemoryRecord,
  type MemoryTimelineEvent,
  type MemoryVersion,
  type Membership,
  type OrganizationSummary,
  type ProblemDetails,
  type PulseAssessment,
  type ReasoningRun,
  type Repository,
  type ResolveGraphEntityRequest,
  type ReviewCorrectionRequest,
  type TransitionMemoryLifecycleRequest,
  type UpdateMemoryRecordRequest,
  type UpdateRepositoryRequest,
  type UpsertGraphEntityRequest,
  type UpsertGraphProjectionRequest,
  type UpsertGraphRelationshipRequest
} from "@atlas/contracts";

export type AtlasSdkOptions = {
  readonly baseUrl: string;
  readonly getAccessToken?: () => string | Promise<string | undefined> | undefined;
  readonly correlationId?: string;
  readonly createIdempotencyKey?: () => string;
};

export class AtlasSdkError extends Error {
  public constructor(
    message: string,
    public readonly status: number,
    public readonly problem?: ProblemDetails
  ) {
    super(message);
    this.name = "AtlasSdkError";
  }
}

export class AtlasSdk {
  public constructor(private readonly options: AtlasSdkOptions) {}

  public async getHealth(): Promise<HealthResponse> {
    return this.request("/health", (value) => healthResponseSchema.parse(value));
  }

  public async getFoundationStatus(): Promise<FoundationStatus> {
    return this.request("/v1/system/foundation", (value) => foundationStatusSchema.parse(value));
  }

  public async getCurrentOrganization(): Promise<OrganizationSummary> {
    return this.request("/v1/organizations/current", (value) =>
      organizationSummarySchema.parse(value)
    );
  }

  public async listOrganizations(): Promise<OrganizationSummary[]> {
    return this.request("/v1/organizations", (value) =>
      organizationSummarySchema.array().parse(value)
    );
  }

  public async createOrganization(input: CreateOrganizationRequest): Promise<AuthTokenResponse> {
    return this.request("/v1/organizations", (value) => authTokenResponseSchema.parse(value), {
      method: "POST",
      body: input
    });
  }

  public async switchOrganization(organizationId: string): Promise<AuthTokenResponse> {
    return this.request(
      "/v1/organizations/switch",
      (value) => authTokenResponseSchema.parse(value),
      {
        method: "POST",
        body: { organizationId }
      }
    );
  }

  public async listRepositories(): Promise<Repository[]> {
    return this.request("/v1/repositories", (value) => repositorySchema.array().parse(value));
  }

  public async createRepository(input: CreateRepositoryRequest): Promise<Repository> {
    return this.request("/v1/repositories", (value) => repositorySchema.parse(value), {
      method: "POST",
      body: createRepositoryRequestSchema.parse(input)
    });
  }

  public async getRepository(repositoryId: string): Promise<Repository> {
    return this.request(`/v1/repositories/${encodeURIComponent(repositoryId)}`, (value) =>
      repositorySchema.parse(value)
    );
  }

  public async updateRepository(
    repositoryId: string,
    input: UpdateRepositoryRequest
  ): Promise<Repository> {
    return this.request(
      `/v1/repositories/${encodeURIComponent(repositoryId)}`,
      (value) => repositorySchema.parse(value),
      {
        method: "PATCH",
        body: updateRepositoryRequestSchema.parse(input)
      }
    );
  }

  public async listInsights(repositoryId?: string): Promise<Insight[]> {
    const path =
      repositoryId === undefined
        ? "/v1/insights"
        : `/v1/insights?repositoryId=${encodeURIComponent(repositoryId)}`;
    return this.request(path, (value) => insightSchema.array().parse(value));
  }

  public async listMemberships(organizationId: string): Promise<Membership[]> {
    return this.request(`/v1/organizations/${organizationId}/memberships`, (value) =>
      membershipSchema.array().parse(value)
    );
  }

  public async listInvitations(organizationId: string): Promise<Invitation[]> {
    return this.request(`/v1/organizations/${organizationId}/invitations`, (value) =>
      invitationSchema.array().parse(value)
    );
  }

  public async createInvitation(
    organizationId: string,
    input: CreateInvitationRequest
  ): Promise<CreateInvitationResponse> {
    return this.request(
      `/v1/organizations/${organizationId}/invitations`,
      (value) => createInvitationResponseSchema.parse(value),
      {
        method: "POST",
        body: input
      }
    );
  }

  public async acceptInvitation(input: AcceptInvitationRequest): Promise<AuthTokenResponse> {
    return this.request("/v1/invitations/accept", (value) => authTokenResponseSchema.parse(value), {
      method: "POST",
      body: input
    });
  }

  public async upsertGraphEntity(input: UpsertGraphEntityRequest): Promise<GraphEntity> {
    return this.request("/v1/graph/entities", (value) => graphEntitySchema.parse(value), {
      method: "POST",
      body: input
    });
  }

  public async listGraphEntities(entityType?: string): Promise<GraphEntity[]> {
    const path =
      entityType === undefined
        ? "/v1/graph/entities"
        : `/v1/graph/entities?entityType=${encodeURIComponent(entityType)}`;
    return this.request(path, (value) => graphEntitySchema.array().parse(value));
  }

  public async resolveGraphEntity(input: ResolveGraphEntityRequest): Promise<GraphEntity> {
    return this.request("/v1/graph/entities/resolve", (value) => graphEntitySchema.parse(value), {
      method: "POST",
      body: input
    });
  }

  public async listGraphEntityVersions(entityId: string): Promise<GraphVersion[]> {
    return this.request(`/v1/graph/entities/${entityId}/versions`, (value) =>
      graphVersionSchema.array().parse(value)
    );
  }

  public async upsertGraphRelationship(
    input: UpsertGraphRelationshipRequest
  ): Promise<GraphRelationship> {
    return this.request(
      "/v1/graph/relationships",
      (value) => graphRelationshipSchema.parse(value),
      {
        method: "POST",
        body: input
      }
    );
  }

  public async traverseGraph(input: GraphTraversalRequest): Promise<GraphTraversalResult> {
    return this.request("/v1/graph/traverse", (value) => graphTraversalResultSchema.parse(value), {
      method: "POST",
      body: input
    });
  }

  public async upsertGraphProjection(
    input: UpsertGraphProjectionRequest
  ): Promise<GraphProjection> {
    return this.request("/v1/graph/projections", (value) => graphProjectionSchema.parse(value), {
      method: "POST",
      body: input
    });
  }

  public async listGraphProjections(): Promise<GraphProjection[]> {
    return this.request("/v1/graph/projections", (value) =>
      graphProjectionSchema.array().parse(value)
    );
  }

  public async createMemoryRecord(input: CreateMemoryRecordRequest): Promise<MemoryRecord> {
    return this.request("/v1/memory/records", (value) => memoryRecordSchema.parse(value), {
      method: "POST",
      body: input
    });
  }

  public async listMemoryRecords(): Promise<MemoryRecord[]> {
    return this.request("/v1/memory/records", (value) => memoryRecordSchema.array().parse(value));
  }

  public async getMemoryRecord(memoryRecordId: string): Promise<MemoryRecord> {
    return this.request(`/v1/memory/records/${memoryRecordId}`, (value) =>
      memoryRecordSchema.parse(value)
    );
  }

  public async updateMemoryRecord(
    memoryRecordId: string,
    input: UpdateMemoryRecordRequest
  ): Promise<MemoryRecord> {
    return this.request(
      `/v1/memory/records/${memoryRecordId}`,
      (value) => memoryRecordSchema.parse(value),
      {
        method: "PATCH",
        body: input
      }
    );
  }

  public async transitionMemoryLifecycle(
    memoryRecordId: string,
    input: TransitionMemoryLifecycleRequest
  ): Promise<MemoryRecord> {
    return this.request(
      `/v1/memory/records/${memoryRecordId}/lifecycle`,
      (value) => memoryRecordSchema.parse(value),
      {
        method: "POST",
        body: input
      }
    );
  }

  public async addMemoryEvidence(
    memoryRecordId: string,
    input: CreateEvidenceItemRequest
  ): Promise<EvidenceItem> {
    return this.request(
      `/v1/memory/records/${memoryRecordId}/evidence`,
      (value) => evidenceItemSchema.parse(value),
      {
        method: "POST",
        body: input
      }
    );
  }

  public async listMemoryEvidence(memoryRecordId: string): Promise<EvidenceItem[]> {
    return this.request(`/v1/memory/records/${memoryRecordId}/evidence`, (value) =>
      evidenceItemSchema.array().parse(value)
    );
  }

  public async createMemoryCorrection(
    memoryRecordId: string,
    input: CreateCorrectionRequest
  ): Promise<Correction> {
    return this.request(
      `/v1/memory/records/${memoryRecordId}/corrections`,
      (value) => correctionSchema.parse(value),
      {
        method: "POST",
        body: input
      }
    );
  }

  public async listMemoryCorrections(memoryRecordId: string): Promise<Correction[]> {
    return this.request(`/v1/memory/records/${memoryRecordId}/corrections`, (value) =>
      correctionSchema.array().parse(value)
    );
  }

  public async reviewMemoryCorrection(
    correctionId: string,
    input: ReviewCorrectionRequest
  ): Promise<Correction> {
    return this.request(
      `/v1/memory/corrections/${correctionId}/review`,
      (value) => correctionSchema.parse(value),
      {
        method: "POST",
        body: input
      }
    );
  }

  public async listMemoryRecordVersions(memoryRecordId: string): Promise<MemoryVersion[]> {
    return this.request(`/v1/memory/records/${memoryRecordId}/versions`, (value) =>
      memoryVersionSchema.array().parse(value)
    );
  }

  public async listMemoryEvidenceVersions(evidenceItemId: string): Promise<MemoryVersion[]> {
    return this.request(`/v1/memory/evidence/${evidenceItemId}/versions`, (value) =>
      memoryVersionSchema.array().parse(value)
    );
  }

  public async listMemoryTimeline(memoryRecordId: string): Promise<MemoryTimelineEvent[]> {
    return this.request(`/v1/memory/records/${memoryRecordId}/timeline`, (value) =>
      memoryTimelineEventSchema.array().parse(value)
    );
  }

  public async createReasoningRun(input: CreateReasoningRunRequest): Promise<ReasoningRun> {
    return this.request("/v1/reasoning/runs", (value) => reasoningRunSchema.parse(value), {
      method: "POST",
      body: createReasoningRunRequestSchema.parse(input)
    });
  }

  public async listReasoningRuns(): Promise<ReasoningRun[]> {
    return this.request("/v1/reasoning/runs", (value) => reasoningRunSchema.array().parse(value));
  }

  public async getRepositoryPulse(repositoryId: string): Promise<PulseAssessment> {
    return this.request(`/v1/repositories/${encodeURIComponent(repositoryId)}/pulse`, (value) =>
      pulseAssessmentSchema.parse(value)
    );
  }

  public async calculateRepositoryPulse(repositoryId: string): Promise<PulseAssessment> {
    return this.request(
      `/v1/repositories/${encodeURIComponent(repositoryId)}/pulse/assessments`,
      (value) => pulseAssessmentSchema.parse(value),
      {
        method: "POST"
      }
    );
  }

  public async listRepositoryPulseHistory(repositoryId: string): Promise<PulseAssessment[]> {
    return this.request(
      `/v1/repositories/${encodeURIComponent(repositoryId)}/pulse/history`,
      (value) => pulseAssessmentSchema.array().parse(value)
    );
  }

  private async request<T>(
    path: string,
    parse: (value: unknown) => T,
    options: { readonly method?: "GET" | "POST" | "PATCH"; readonly body?: unknown } = {}
  ): Promise<T> {
    const headers = new Headers({ Accept: "application/json" });

    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    if (this.options.correlationId !== undefined) {
      headers.set("x-correlation-id", this.options.correlationId);
    }

    const method = options.method ?? "GET";
    if (method !== "GET") {
      headers.set(
        "Idempotency-Key",
        this.options.createIdempotencyKey?.() ?? generateIdempotencyKey()
      );
    }

    const accessToken = await this.options.getAccessToken?.();
    if (accessToken !== undefined) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const requestInit: RequestInit = {
      method,
      headers
    };

    if (options.body !== undefined) {
      requestInit.body = JSON.stringify(options.body);
    }

    const response = await fetch(new URL(path, this.options.baseUrl), requestInit);
    const body = await this.parseResponseBody(response);

    if (!response.ok) {
      const parsedProblem = problemDetailsSchema.safeParse(body);
      throw new AtlasSdkError(
        parsedProblem.success ? parsedProblem.data.title : "Atlas API request failed.",
        response.status,
        parsedProblem.success ? parsedProblem.data : undefined
      );
    }

    return parse(body);
  }

  private async parseResponseBody(response: Response): Promise<unknown> {
    const text = await response.text();
    if (text.trim().length === 0) {
      return null;
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new AtlasSdkError("Atlas API returned an invalid JSON response.", response.status);
    }
  }
}

function generateIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `sdk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
