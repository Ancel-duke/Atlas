import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  correctionSchema,
  createCorrectionRequestSchema,
  createEvidenceItemRequestSchema,
  createMemoryRecordRequestSchema,
  evidenceItemSchema,
  memoryRecordSchema,
  memoryTimelineEventSchema,
  memoryVersionSchema,
  reviewCorrectionRequestSchema,
  transitionMemoryLifecycleRequestSchema,
  updateMemoryRecordRequestSchema,
  uuidSchema,
  type Correction,
  type EvidenceItem,
  type MemoryRecord,
  type MemoryTimelineEvent,
  type MemoryVersion
} from "@atlas/contracts";

import { parseRequest } from "../../../infrastructure/http/parse-request.js";
import type { AuthenticatedPrincipal } from "../../identity/application/jwt-verifier.js";
import { CurrentPrincipal } from "../../identity/presentation/current-principal.decorator.js";
import { RequirePermission } from "../../identity/presentation/require-permission.decorator.js";
import { EngineeringMemoryService } from "../application/engineering-memory.service.js";

@ApiTags("engineering-memory")
@ApiBearerAuth()
@Controller("/v1/memory")
export class EngineeringMemoryController {
  public constructor(private readonly memoryService: EngineeringMemoryService) {}

  @Post("/records")
  @RequirePermission("memory:write")
  @ApiOperation({ summary: "Create an evidence-backed memory record." })
  public async createRecord(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() body: unknown
  ): Promise<MemoryRecord> {
    const record = await this.memoryService.createRecord(
      principal,
      parseRequest(createMemoryRecordRequestSchema, body)
    );
    return parseRequest(memoryRecordSchema, record);
  }

  @Get("/records")
  @RequirePermission("memory:read")
  @ApiOperation({ summary: "List memory records in the current organization." })
  public async listRecords(
    @CurrentPrincipal() principal: AuthenticatedPrincipal
  ): Promise<MemoryRecord[]> {
    const records = await this.memoryService.listRecords(principal);
    return parseRequest(memoryRecordSchema.array(), records);
  }

  @Get("/records/:memoryRecordId")
  @RequirePermission("memory:read")
  @ApiOperation({ summary: "Get a memory record." })
  public async getRecord(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("memoryRecordId") memoryRecordId: string
  ): Promise<MemoryRecord> {
    const record = await this.memoryService.getRecord(
      principal,
      parseRequest(uuidSchema, memoryRecordId)
    );
    return parseRequest(memoryRecordSchema, record);
  }

  @Patch("/records/:memoryRecordId")
  @RequirePermission("memory:write")
  @ApiOperation({ summary: "Update the current memory projection and append a version." })
  public async updateRecord(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("memoryRecordId") memoryRecordId: string,
    @Body() body: unknown
  ): Promise<MemoryRecord> {
    const record = await this.memoryService.updateRecord(
      principal,
      parseRequest(uuidSchema, memoryRecordId),
      parseRequest(updateMemoryRecordRequestSchema, body)
    );
    return parseRequest(memoryRecordSchema, record);
  }

  @Post("/records/:memoryRecordId/lifecycle")
  @RequirePermission("memory:write")
  @ApiOperation({ summary: "Transition memory lifecycle with history preservation." })
  public async transitionLifecycle(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("memoryRecordId") memoryRecordId: string,
    @Body() body: unknown
  ): Promise<MemoryRecord> {
    const record = await this.memoryService.transitionLifecycle(
      principal,
      parseRequest(uuidSchema, memoryRecordId),
      parseRequest(transitionMemoryLifecycleRequestSchema, body)
    );
    return parseRequest(memoryRecordSchema, record);
  }

  @Post("/records/:memoryRecordId/evidence")
  @RequirePermission("memory:evidence")
  @ApiOperation({ summary: "Add immutable evidence to a memory record." })
  public async addEvidence(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("memoryRecordId") memoryRecordId: string,
    @Body() body: unknown
  ): Promise<EvidenceItem> {
    const evidence = await this.memoryService.addEvidence(
      principal,
      parseRequest(uuidSchema, memoryRecordId),
      parseRequest(createEvidenceItemRequestSchema, body)
    );
    return parseRequest(evidenceItemSchema, evidence);
  }

  @Get("/records/:memoryRecordId/evidence")
  @RequirePermission("memory:read")
  @ApiOperation({ summary: "List evidence items for a memory record." })
  public async listEvidence(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("memoryRecordId") memoryRecordId: string
  ): Promise<EvidenceItem[]> {
    const evidence = await this.memoryService.listEvidence(
      principal,
      parseRequest(uuidSchema, memoryRecordId)
    );
    return parseRequest(evidenceItemSchema.array(), evidence);
  }

  @Post("/records/:memoryRecordId/corrections")
  @RequirePermission("memory:correct")
  @ApiOperation({ summary: "Request a correction to a memory record." })
  public async createCorrection(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("memoryRecordId") memoryRecordId: string,
    @Body() body: unknown
  ): Promise<Correction> {
    const correction = await this.memoryService.createCorrection(
      principal,
      parseRequest(uuidSchema, memoryRecordId),
      parseRequest(createCorrectionRequestSchema, body)
    );
    return parseRequest(correctionSchema, correction);
  }

  @Get("/records/:memoryRecordId/corrections")
  @RequirePermission("memory:read")
  @ApiOperation({ summary: "List corrections for a memory record." })
  public async listCorrections(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("memoryRecordId") memoryRecordId: string
  ): Promise<Correction[]> {
    const corrections = await this.memoryService.listCorrections(
      principal,
      parseRequest(uuidSchema, memoryRecordId)
    );
    return parseRequest(correctionSchema.array(), corrections);
  }

  @Post("/corrections/:correctionId/review")
  @RequirePermission("memory:correct")
  @ApiOperation({ summary: "Apply or reject a pending memory correction." })
  public async reviewCorrection(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("correctionId") correctionId: string,
    @Body() body: unknown
  ): Promise<Correction> {
    const correction = await this.memoryService.reviewCorrection(
      principal,
      parseRequest(uuidSchema, correctionId),
      parseRequest(reviewCorrectionRequestSchema, body)
    );
    return parseRequest(correctionSchema, correction);
  }

  @Get("/records/:memoryRecordId/versions")
  @RequirePermission("memory:read")
  @ApiOperation({ summary: "List append-only historical versions for a memory record." })
  public async listRecordVersions(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("memoryRecordId") memoryRecordId: string
  ): Promise<MemoryVersion[]> {
    const versions = await this.memoryService.listRecordVersions(
      principal,
      parseRequest(uuidSchema, memoryRecordId)
    );
    return parseRequest(memoryVersionSchema.array(), versions);
  }

  @Get("/evidence/:evidenceItemId/versions")
  @RequirePermission("memory:read")
  @ApiOperation({ summary: "List append-only historical versions for an evidence item." })
  public async listEvidenceVersions(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("evidenceItemId") evidenceItemId: string
  ): Promise<MemoryVersion[]> {
    const versions = await this.memoryService.listEvidenceVersions(
      principal,
      parseRequest(uuidSchema, evidenceItemId)
    );
    return parseRequest(memoryVersionSchema.array(), versions);
  }

  @Get("/records/:memoryRecordId/timeline")
  @RequirePermission("memory:read")
  @ApiOperation({ summary: "List timeline events for a memory record." })
  public async listTimeline(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("memoryRecordId") memoryRecordId: string
  ): Promise<MemoryTimelineEvent[]> {
    const timeline = await this.memoryService.listTimeline(
      principal,
      parseRequest(uuidSchema, memoryRecordId)
    );
    return parseRequest(memoryTimelineEventSchema.array(), timeline);
  }
}
