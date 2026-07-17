import {
  authTokenResponseSchema,
  createInvitationResponseSchema,
  foundationStatusSchema,
  graphEntitySchema,
  graphProjectionSchema,
  graphRelationshipSchema,
  graphTraversalResultSchema,
  graphVersionSchema,
  healthResponseSchema,
  invitationSchema,
  membershipSchema,
  organizationSummarySchema,
  problemDetailsSchema,
  type AcceptInvitationRequest,
  type AuthTokenResponse,
  type CreateInvitationRequest,
  type CreateInvitationResponse,
  type CreateOrganizationRequest,
  type FoundationStatus,
  type GraphEntity,
  type GraphProjection,
  type GraphRelationship,
  type GraphTraversalRequest,
  type GraphTraversalResult,
  type GraphVersion,
  type HealthResponse,
  type Invitation,
  type Membership,
  type OrganizationSummary,
  type ProblemDetails,
  type ResolveGraphEntityRequest,
  type UpsertGraphEntityRequest,
  type UpsertGraphProjectionRequest,
  type UpsertGraphRelationshipRequest
} from "@atlas/contracts";

export type AtlasSdkOptions = {
  readonly baseUrl: string;
  readonly getAccessToken?: () => string | Promise<string | undefined> | undefined;
  readonly correlationId?: string;
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

    const accessToken = await this.options.getAccessToken?.();
    if (accessToken !== undefined) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const requestInit: RequestInit = {
      method: options.method ?? "GET",
      headers
    };

    if (options.body !== undefined) {
      requestInit.body = JSON.stringify(options.body);
    }

    const response = await fetch(new URL(path, this.options.baseUrl), requestInit);
    const body = (await response.json()) as unknown;

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
}
