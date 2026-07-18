import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import "reflect-metadata";

import { getQueueToken } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { queueNames } from "@atlas/contracts";

import { AtlasMemoryGraphService } from "./capabilities/atlas-memory-graph/application/atlas-memory-graph.service.js";
import { AtlasMemoryGraphController } from "./capabilities/atlas-memory-graph/presentation/atlas-memory-graph.controller.js";
import { ContinuousReasoningOrchestrator } from "./capabilities/continuous-reasoning/application/continuous-reasoning-orchestrator.service.js";
import { ContinuousReasoningController } from "./capabilities/continuous-reasoning/presentation/continuous-reasoning.controller.js";
import { EngineeringMemoryService } from "./capabilities/engineering-memory/application/engineering-memory.service.js";
import { EngineeringMemoryController } from "./capabilities/engineering-memory/presentation/engineering-memory.controller.js";
import { IdentityService } from "./capabilities/identity/application/identity.service.js";
import { OrganizationService } from "./capabilities/identity/application/organization.service.js";
import { IdentityController } from "./capabilities/identity/presentation/identity.controller.js";
import { OrganizationController } from "./capabilities/identity/presentation/organization.controller.js";
import { InsightsService } from "./capabilities/insights/application/insights.service.js";
import { InsightsController } from "./capabilities/insights/presentation/insights.controller.js";
import { RepositoriesService } from "./capabilities/repositories/application/repositories.service.js";
import { GitHubWebhookController } from "./capabilities/repositories/presentation/github-webhook.controller.js";
import { RepositoriesController } from "./capabilities/repositories/presentation/repositories.controller.js";
import { RepositoryPulseService } from "./capabilities/repository-pulse/application/repository-pulse.service.js";
import { RepositoryPulseController } from "./capabilities/repository-pulse/presentation/repository-pulse.controller.js";
import { HealthService } from "./capabilities/system/application/health.service.js";
import { SystemController } from "./capabilities/system/presentation/system.controller.js";
import { PrismaService } from "./infrastructure/database/prisma.service.js";

const serviceStub = {};

@Module({
  controllers: [
    AtlasMemoryGraphController,
    ContinuousReasoningController,
    EngineeringMemoryController,
    GitHubWebhookController,
    IdentityController,
    InsightsController,
    OrganizationController,
    RepositoriesController,
    RepositoryPulseController,
    SystemController
  ],
  providers: [
    { provide: AtlasMemoryGraphService, useValue: serviceStub },
    { provide: ContinuousReasoningOrchestrator, useValue: serviceStub },
    { provide: EngineeringMemoryService, useValue: serviceStub },
    { provide: HealthService, useValue: serviceStub },
    { provide: IdentityService, useValue: serviceStub },
    { provide: InsightsService, useValue: serviceStub },
    { provide: OrganizationService, useValue: serviceStub },
    { provide: RepositoriesService, useValue: serviceStub },
    { provide: RepositoryPulseService, useValue: serviceStub },
    { provide: PrismaService, useValue: serviceStub },
    { provide: getQueueToken(queueNames.repositoryIngestion), useValue: serviceStub }
  ]
})
class OpenApiModule {}

async function generateOpenApi(): Promise<void> {
  const app = await NestFactory.create(OpenApiModule, { abortOnError: false, logger: ["error"] });
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Atlas API")
      .setDescription("Versioned REST API for the Atlas engineering foundation.")
      .setVersion("0.1.0")
      .addBearerAuth()
      .build()
  );
  applyContractSchemas(document as unknown as OpenApiDocument);

  await writeFile(
    join(process.cwd(), "openapi.json"),
    formatOpenApiJson(document as unknown as OpenApiDocument)
  );
  await app.close().catch(() => undefined);
  process.exit(0);
}

generateOpenApi().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

type OpenApiOperation = {
  responses?: Record<string, Record<string, unknown>>;
};

type OpenApiDocument = {
  components?: { schemas?: Record<string, unknown> };
  paths?: Record<string, Record<string, OpenApiOperation>>;
};

function applyContractSchemas(document: OpenApiDocument): void {
  document.components = document.components ?? {};
  document.components.schemas = {
    ...document.components.schemas,
    ProblemDetails: objectSchema(["type", "title", "status"]),
    HealthResponse: objectSchema(["status", "service", "environment", "timestamp", "version"]),
    GitHubWebhookAccepted: objectSchema(["accepted", "enqueued"]),
    FoundationStatus: objectSchema(["capabilityBoundaries", "database", "redis", "openTelemetry"]),
    AuthTokenResponse: objectSchema(["accessToken", "expiresAt", "principal", "organizations"]),
    OrganizationSummary: objectSchema(["id", "slug", "displayName", "role", "permissions"]),
    Membership: objectSchema(["id", "organizationId", "userId", "email", "role", "status"]),
    Invitation: objectSchema(["id", "organizationId", "email", "role", "status"]),
    Repository: objectSchema(["id", "organizationId", "provider", "providerRepositoryId", "name"]),
    GraphEntity: objectSchema(["id", "organizationId", "entityType", "canonicalKey", "provenance"]),
    GraphRelationship: objectSchema([
      "id",
      "organizationId",
      "sourceEntityId",
      "targetEntityId",
      "relationship"
    ]),
    GraphTraversalResult: objectSchema(["rootEntityId", "maxDepth", "nodes", "edges"]),
    GraphProjection: objectSchema(["id", "organizationId", "name", "kind", "projection"]),
    MemoryRecord: objectSchema(["id", "organizationId", "classification", "claim", "confidence"]),
    EvidenceItem: objectSchema([
      "id",
      "organizationId",
      "sourceType",
      "sourceLocator",
      "direction"
    ]),
    Correction: objectSchema(["id", "organizationId", "memoryRecordId", "status", "rationale"]),
    MemoryTimelineEvent: objectSchema(["id", "organizationId", "memoryRecordId", "eventType"]),
    MemoryVersion: objectSchema(["id", "organizationId", "subjectId", "version", "snapshot"]),
    Insight: objectSchema(["id", "organizationId", "claim", "impact", "confidence", "evidenceSet"]),
    ReasoningRun: objectSchema([
      "id",
      "organizationId",
      "status",
      "evidencePackage",
      "conclusions"
    ]),
    PulseAssessment: objectSchema([
      "id",
      "organizationId",
      "repositoryId",
      "formulaVersion",
      "dimensions"
    ])
  };

  setResponse(document, "/health", "get", "HealthResponse");
  setResponse(document, "/v1/system/foundation", "get", "FoundationStatus");
  setResponse(document, "/v1/identity/session", "get", "OrganizationSummary");
  setResponse(document, "/v1/identity/oauth/github", "post", "AuthTokenResponse");
  setResponse(document, "/v1/github/webhooks", "post", "GitHubWebhookAccepted");
  setResponse(document, "/v1/organizations", "get", "OrganizationSummary", true);
  setResponse(document, "/v1/organizations", "post", "AuthTokenResponse");
  setResponse(document, "/v1/organizations/current", "get", "OrganizationSummary");
  setResponse(document, "/v1/organizations/switch", "post", "AuthTokenResponse");
  setResponse(
    document,
    "/v1/organizations/{organizationId}/memberships",
    "get",
    "Membership",
    true
  );
  setResponse(
    document,
    "/v1/organizations/{organizationId}/memberships/{membershipId}",
    "patch",
    "Membership"
  );
  setResponse(
    document,
    "/v1/organizations/{organizationId}/invitations",
    "get",
    "Invitation",
    true
  );
  setResponse(document, "/v1/repositories", "get", "Repository", true);
  setResponse(document, "/v1/repositories", "post", "Repository");
  setResponse(document, "/v1/repositories/{repositoryId}", "get", "Repository");
  setResponse(document, "/v1/repositories/{repositoryId}", "patch", "Repository");
  setResponse(document, "/v1/repositories/{repositoryId}/pulse", "get", "PulseAssessment");
  setResponse(
    document,
    "/v1/repositories/{repositoryId}/pulse/assessments",
    "post",
    "PulseAssessment"
  );
  setResponse(
    document,
    "/v1/repositories/{repositoryId}/pulse/history",
    "get",
    "PulseAssessment",
    true
  );
  setResponse(document, "/v1/insights", "get", "Insight", true);
  setResponse(document, "/v1/reasoning/runs", "get", "ReasoningRun", true);
  setResponse(document, "/v1/reasoning/runs", "post", "ReasoningRun");
}

function setResponse(
  document: OpenApiDocument,
  path: string,
  method: string,
  schemaName: string,
  array = false
): void {
  const operation = document.paths?.[path]?.[method];
  const response = operation?.responses?.["200"] ?? operation?.responses?.["201"];
  if (response === undefined) {
    return;
  }

  response["description"] = response["description"] || `${schemaName} response.`;
  response["content"] = {
    "application/json": {
      schema: array
        ? { type: "array", items: { $ref: `#/components/schemas/${schemaName}` } }
        : { $ref: `#/components/schemas/${schemaName}` }
    }
  };
}

function objectSchema(required: readonly string[]): Record<string, unknown> {
  return {
    type: "object",
    required,
    additionalProperties: true,
    properties: Object.fromEntries(required.map((key) => [key, {}]))
  };
}

function formatOpenApiJson(document: OpenApiDocument): string {
  return `${JSON.stringify(document, null, 2).replace(
    /"(tags|required)": \[((?:\r?\n\s+"[^"]+",?)+)\r?\n\s+\]/g,
    (_match: string, key: string, values: string) => {
      const compactValues = values
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => line.replace(/,$/, ""))
        .join(", ");
      return `"${key}": [${compactValues}]`;
    }
  )}\n`;
}
