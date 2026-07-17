import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  graphEntitySchema,
  graphProjectionSchema,
  graphRelationshipSchema,
  graphTraversalRequestSchema,
  graphTraversalResultSchema,
  graphVersionSchema,
  resolveGraphEntityRequestSchema,
  upsertGraphEntityRequestSchema,
  upsertGraphProjectionRequestSchema,
  upsertGraphRelationshipRequestSchema,
  uuidSchema,
  type GraphEntity,
  type GraphProjection,
  type GraphRelationship,
  type GraphTraversalResult,
  type GraphVersion
} from "@atlas/contracts";

import { parseRequest } from "../../../infrastructure/http/parse-request.js";
import type { AuthenticatedPrincipal } from "../../identity/application/jwt-verifier.js";
import { CurrentPrincipal } from "../../identity/presentation/current-principal.decorator.js";
import { RequirePermission } from "../../identity/presentation/require-permission.decorator.js";
import { AtlasMemoryGraphService } from "../application/atlas-memory-graph.service.js";

@ApiTags("atlas-memory-graph")
@ApiBearerAuth()
@Controller("/v1/graph")
export class AtlasMemoryGraphController {
  public constructor(private readonly graphService: AtlasMemoryGraphService) {}

  @Post("/entities")
  @RequirePermission("graph:write")
  @ApiOperation({ summary: "Create or update a graph entity with provenance and versioning." })
  public async upsertEntity(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() body: unknown
  ): Promise<GraphEntity> {
    const entity = await this.graphService.upsertEntity(
      principal,
      parseRequest(upsertGraphEntityRequestSchema, body)
    );
    return parseRequest(graphEntitySchema, entity);
  }

  @Get("/entities")
  @RequirePermission("graph:read")
  @ApiOperation({ summary: "List graph entities in the current organization." })
  public async listEntities(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Query("entityType") entityType?: string
  ): Promise<GraphEntity[]> {
    const entities = await this.graphService.listEntities(principal, entityType);
    return parseRequest(graphEntitySchema.array(), entities);
  }

  @Post("/entities/resolve")
  @RequirePermission("graph:read")
  @ApiOperation({ summary: "Resolve an entity by canonical key or alias." })
  public async resolveEntity(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() body: unknown
  ): Promise<GraphEntity> {
    const entity = await this.graphService.resolveEntity(
      principal,
      parseRequest(resolveGraphEntityRequestSchema, body)
    );
    return parseRequest(graphEntitySchema, entity);
  }

  @Get("/entities/:entityId/versions")
  @RequirePermission("graph:read")
  @ApiOperation({ summary: "List append-only versions for a graph entity." })
  public async listEntityVersions(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("entityId") entityId: string
  ): Promise<GraphVersion[]> {
    const versions = await this.graphService.listEntityVersions(
      principal,
      parseRequest(uuidSchema, entityId)
    );
    return parseRequest(graphVersionSchema.array(), versions);
  }

  @Post("/relationships")
  @RequirePermission("graph:write")
  @ApiOperation({
    summary: "Create or update a graph relationship with provenance and versioning."
  })
  public async upsertRelationship(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() body: unknown
  ): Promise<GraphRelationship> {
    const relationship = await this.graphService.upsertRelationship(
      principal,
      parseRequest(upsertGraphRelationshipRequestSchema, body)
    );
    return parseRequest(graphRelationshipSchema, relationship);
  }

  @Post("/traverse")
  @RequirePermission("graph:read")
  @ApiOperation({ summary: "Traverse the Atlas Memory Graph for explorer and AI reasoning use." })
  public async traverse(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() body: unknown
  ): Promise<GraphTraversalResult> {
    const traversal = await this.graphService.traverse(
      principal,
      parseRequest(graphTraversalRequestSchema, body)
    );
    return parseRequest(graphTraversalResultSchema, traversal);
  }

  @Post("/projections")
  @RequirePermission("graph:project")
  @ApiOperation({ summary: "Create or update a saved graph projection." })
  public async upsertProjection(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() body: unknown
  ): Promise<GraphProjection> {
    const projection = await this.graphService.upsertProjection(
      principal,
      parseRequest(upsertGraphProjectionRequestSchema, body)
    );
    return parseRequest(graphProjectionSchema, projection);
  }

  @Get("/projections")
  @RequirePermission("graph:read")
  @ApiOperation({ summary: "List saved graph projections for the current organization." })
  public async listProjections(
    @CurrentPrincipal() principal: AuthenticatedPrincipal
  ): Promise<GraphProjection[]> {
    const projections = await this.graphService.listProjections(principal);
    return parseRequest(graphProjectionSchema.array(), projections);
  }
}
