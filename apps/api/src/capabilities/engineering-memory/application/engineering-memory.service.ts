import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import {
  type Correction,
  type CreateCorrectionRequest,
  type CreateEvidenceItemRequest,
  type CreateMemoryRecordRequest,
  type EvidenceItem,
  type MemoryRecord,
  type MemoryTimelineEvent,
  type MemoryVersion,
  type ReviewCorrectionRequest,
  type TransitionMemoryLifecycleRequest,
  type UpdateMemoryRecordRequest
} from "@atlas/contracts";
import type { Prisma } from "@atlas/database";
import {
  assertMemoryLifecycleTransition,
  confidenceBandForScore,
  type MemoryLifecycle
} from "@atlas/domain";

import { PrismaService } from "../../../infrastructure/database/prisma.service.js";
import type { AuthenticatedPrincipal } from "../../identity/application/jwt-verifier.js";

type PrismaMemoryRecord = Awaited<ReturnType<PrismaService["memoryRecord"]["findFirstOrThrow"]>>;
type PrismaEvidenceItem = Awaited<ReturnType<PrismaService["evidenceItem"]["findFirstOrThrow"]>>;
type PrismaCorrection = Awaited<ReturnType<PrismaService["correction"]["findFirstOrThrow"]>>;

@Injectable()
export class EngineeringMemoryService {
  public constructor(private readonly prisma: PrismaService) {}

  public async createRecord(
    principal: AuthenticatedPrincipal,
    input: CreateMemoryRecordRequest
  ): Promise<MemoryRecord> {
    if (input.subjectEntityId !== null) {
      await this.assertGraphEntityBelongsToOrganization(
        principal.organizationId,
        input.subjectEntityId
      );
    }

    const confidenceBand = confidenceBandForScore(input.confidenceScore);
    const record = await this.prisma.$transaction(async (tx) => {
      const created = await tx.memoryRecord.create({
        data: {
          organizationId: principal.organizationId,
          classification: input.classification,
          subjectEntityId: input.subjectEntityId,
          claim: input.claim,
          owner: input.owner,
          reasoning: input.reasoning,
          provenance: this.toJson(input.provenance),
          confidenceScore: input.confidenceScore,
          confidenceBand,
          confidenceMethod: input.confidenceMethod,
          confidenceFactors: this.toJson(input.confidenceFactors),
          missingEvidence: this.toJson(input.missingEvidence),
          counterevidence: this.toJson(input.counterevidence),
          validFrom: this.parseOptionalDate(input.validFrom),
          validUntil: this.parseOptionalDate(input.validUntil)
        }
      });

      await this.recordMemoryVersion(created, principal.userId, input.changeReason, tx);
      await this.recordTimelineEvent(
        created,
        "record_created",
        principal.userId,
        created.version,
        { claim: created.claim, classification: created.classification },
        tx
      );
      return created;
    });

    return this.serializeRecord(record);
  }

  public async listRecords(principal: AuthenticatedPrincipal): Promise<MemoryRecord[]> {
    const records = await this.prisma.memoryRecord.findMany({
      where: { organizationId: principal.organizationId },
      orderBy: { updatedAt: "desc" },
      take: 200
    });

    return records.map((record) => this.serializeRecord(record));
  }

  public async getRecord(
    principal: AuthenticatedPrincipal,
    memoryRecordId: string
  ): Promise<MemoryRecord> {
    return this.serializeRecord(await this.getRecordForOrganization(principal, memoryRecordId));
  }

  public async updateRecord(
    principal: AuthenticatedPrincipal,
    memoryRecordId: string,
    input: UpdateMemoryRecordRequest
  ): Promise<MemoryRecord> {
    await this.getRecordForOrganization(principal, memoryRecordId);

    const record = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.MemoryRecordUpdateInput = { version: { increment: 1 } };

      if (input.claim !== undefined) {
        data.claim = input.claim;
      }
      if (input.owner !== undefined) {
        data.owner = input.owner;
      }
      if (input.reasoning !== undefined) {
        data.reasoning = input.reasoning;
      }
      if (input.provenance !== undefined) {
        data.provenance = this.toJson(input.provenance);
      }
      if (input.confidenceScore !== undefined) {
        data.confidenceScore = input.confidenceScore;
        data.confidenceBand = confidenceBandForScore(input.confidenceScore);
      }
      if (input.confidenceMethod !== undefined) {
        data.confidenceMethod = input.confidenceMethod;
      }
      if (input.confidenceFactors !== undefined) {
        data.confidenceFactors = this.toJson(input.confidenceFactors);
      }
      if (input.missingEvidence !== undefined) {
        data.missingEvidence = this.toJson(input.missingEvidence);
      }
      if (input.counterevidence !== undefined) {
        data.counterevidence = this.toJson(input.counterevidence);
      }
      if (input.validFrom !== undefined) {
        data.validFrom = this.parseOptionalDate(input.validFrom);
      }
      if (input.validUntil !== undefined) {
        data.validUntil = this.parseOptionalDate(input.validUntil);
      }

      const updated = await tx.memoryRecord.update({
        where: { id: memoryRecordId },
        data
      });
      await this.recordMemoryVersion(updated, principal.userId, input.changeReason, tx);
      await this.recordTimelineEvent(
        updated,
        "record_updated",
        principal.userId,
        updated.version,
        { changeReason: input.changeReason },
        tx
      );
      return updated;
    });

    return this.serializeRecord(record);
  }

  public async transitionLifecycle(
    principal: AuthenticatedPrincipal,
    memoryRecordId: string,
    input: TransitionMemoryLifecycleRequest
  ): Promise<MemoryRecord> {
    const current = await this.getRecordForOrganization(principal, memoryRecordId);
    this.assertValidLifecycleTransition(current.lifecycle, input.lifecycle);

    const record = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.memoryRecord.update({
        where: { id: memoryRecordId },
        data: {
          lifecycle: input.lifecycle,
          version: { increment: 1 }
        }
      });
      await this.recordMemoryVersion(updated, principal.userId, input.rationale, tx);
      await this.recordTimelineEvent(
        updated,
        "lifecycle_transitioned",
        principal.userId,
        updated.version,
        { from: current.lifecycle, to: input.lifecycle, rationale: input.rationale },
        tx
      );
      return updated;
    });

    return this.serializeRecord(record);
  }

  public async addEvidence(
    principal: AuthenticatedPrincipal,
    memoryRecordId: string,
    input: CreateEvidenceItemRequest
  ): Promise<EvidenceItem> {
    const record = await this.getRecordForOrganization(principal, memoryRecordId);
    const evidence = await this.prisma.$transaction(async (tx) => {
      const created = await tx.evidenceItem.create({
        data: {
          organizationId: principal.organizationId,
          memoryRecordId,
          sourceType: input.sourceType,
          sourceLocator: input.sourceLocator,
          sourceRevision: input.sourceRevision,
          extractionMethod: input.extractionMethod,
          direction: input.direction,
          observedAt: new Date(input.observedAt),
          metadata: this.toJson(input.metadata),
          provenance: this.toJson(input.provenance)
        }
      });
      await this.recordEvidenceVersion(created, principal.userId, input.changeReason, tx);
      await this.recordTimelineEvent(
        record,
        "evidence_added",
        principal.userId,
        record.version,
        { evidenceItemId: created.id, direction: created.direction },
        tx
      );
      return created;
    });

    return this.serializeEvidence(evidence);
  }

  public async listEvidence(
    principal: AuthenticatedPrincipal,
    memoryRecordId: string
  ): Promise<EvidenceItem[]> {
    await this.getRecordForOrganization(principal, memoryRecordId);
    const evidence = await this.prisma.evidenceItem.findMany({
      where: { organizationId: principal.organizationId, memoryRecordId },
      orderBy: { observedAt: "desc" }
    });

    return evidence.map((item) => this.serializeEvidence(item));
  }

  public async createCorrection(
    principal: AuthenticatedPrincipal,
    memoryRecordId: string,
    input: CreateCorrectionRequest
  ): Promise<Correction> {
    const record = await this.getRecordForOrganization(principal, memoryRecordId);
    if (
      input.proposedLifecycle !== null &&
      input.proposedLifecycle !== record.lifecycle &&
      !this.isCorrectionLifecycleProposalValid(record.lifecycle, input.proposedLifecycle)
    ) {
      throw new BadRequestException("Correction proposes an invalid lifecycle transition.");
    }

    const correction = await this.prisma.$transaction(async (tx) => {
      const created = await tx.correction.create({
        data: {
          organizationId: principal.organizationId,
          memoryRecordId,
          actorId: principal.userId,
          rationale: input.rationale,
          proposedClaim: input.proposedClaim,
          proposedLifecycle: input.proposedLifecycle,
          proposedConfidenceScore: input.proposedConfidenceScore,
          provenance: this.toJson(input.provenance)
        }
      });
      await this.recordCorrectionVersion(created, principal.userId, input.changeReason, tx);
      await this.recordTimelineEvent(
        record,
        "correction_requested",
        principal.userId,
        record.version,
        { correctionId: created.id, rationale: created.rationale },
        tx
      );
      return created;
    });

    return this.serializeCorrection(correction);
  }

  public async listCorrections(
    principal: AuthenticatedPrincipal,
    memoryRecordId: string
  ): Promise<Correction[]> {
    await this.getRecordForOrganization(principal, memoryRecordId);
    const corrections = await this.prisma.correction.findMany({
      where: { organizationId: principal.organizationId, memoryRecordId },
      orderBy: { createdAt: "desc" }
    });

    return corrections.map((correction) => this.serializeCorrection(correction));
  }

  public async reviewCorrection(
    principal: AuthenticatedPrincipal,
    correctionId: string,
    input: ReviewCorrectionRequest
  ): Promise<Correction> {
    const correction = await this.prisma.correction.findFirst({
      where: { id: correctionId, organizationId: principal.organizationId }
    });
    if (correction === null) {
      throw new NotFoundException("Correction was not found.");
    }
    if (correction.status !== "pending") {
      throw new ConflictException("Correction has already been reviewed.");
    }

    const record = await this.getRecordForOrganization(principal, correction.memoryRecordId);
    if (
      input.decision === "apply" &&
      correction.proposedLifecycle !== null &&
      correction.proposedLifecycle !== record.lifecycle
    ) {
      this.assertValidLifecycleTransition(record.lifecycle, correction.proposedLifecycle);
    }

    const reviewed = await this.prisma.$transaction(async (tx) => {
      let currentRecord = record;
      if (input.decision === "apply") {
        const recordData: Prisma.MemoryRecordUpdateInput = { version: { increment: 1 } };
        if (correction.proposedClaim !== null) {
          recordData.claim = correction.proposedClaim;
        }
        if (correction.proposedLifecycle !== null) {
          recordData.lifecycle = correction.proposedLifecycle;
        }
        if (correction.proposedConfidenceScore !== null) {
          recordData.confidenceScore = correction.proposedConfidenceScore;
          recordData.confidenceBand = confidenceBandForScore(correction.proposedConfidenceScore);
        }
        currentRecord = await tx.memoryRecord.update({
          where: { id: correction.memoryRecordId },
          data: recordData
        });
        await this.recordMemoryVersion(currentRecord, principal.userId, input.rationale, tx);
      }

      const updatedCorrection = await tx.correction.update({
        where: { id: correctionId },
        data: {
          status: input.decision === "apply" ? "applied" : "rejected",
          version: { increment: 1 },
          reviewedByUserId: principal.userId,
          reviewRationale: input.rationale,
          appliedAt: input.decision === "apply" ? new Date() : null,
          rejectedAt: input.decision === "reject" ? new Date() : null
        }
      });
      await this.recordCorrectionVersion(updatedCorrection, principal.userId, input.rationale, tx);
      await this.recordTimelineEvent(
        currentRecord,
        input.decision === "apply" ? "correction_applied" : "correction_rejected",
        principal.userId,
        currentRecord.version,
        { correctionId: updatedCorrection.id, rationale: input.rationale },
        tx
      );
      return updatedCorrection;
    });

    return this.serializeCorrection(reviewed);
  }

  public async listRecordVersions(
    principal: AuthenticatedPrincipal,
    memoryRecordId: string
  ): Promise<MemoryVersion[]> {
    await this.getRecordForOrganization(principal, memoryRecordId);
    const versions = await this.prisma.memoryRecordVersion.findMany({
      where: { organizationId: principal.organizationId, memoryRecordId },
      orderBy: { version: "desc" }
    });

    return versions.map((version) => this.serializeVersion(version, version.memoryRecordId));
  }

  public async listEvidenceVersions(
    principal: AuthenticatedPrincipal,
    evidenceItemId: string
  ): Promise<MemoryVersion[]> {
    const evidence = await this.prisma.evidenceItem.findFirst({
      where: { id: evidenceItemId, organizationId: principal.organizationId }
    });
    if (evidence === null) {
      throw new NotFoundException("Evidence item was not found.");
    }

    const versions = await this.prisma.evidenceItemVersion.findMany({
      where: { organizationId: principal.organizationId, evidenceItemId },
      orderBy: { version: "desc" }
    });

    return versions.map((version) => this.serializeVersion(version, version.evidenceItemId));
  }

  public async listTimeline(
    principal: AuthenticatedPrincipal,
    memoryRecordId: string
  ): Promise<MemoryTimelineEvent[]> {
    await this.getRecordForOrganization(principal, memoryRecordId);
    const events = await this.prisma.memoryTimelineEvent.findMany({
      where: { organizationId: principal.organizationId, memoryRecordId },
      orderBy: { occurredAt: "desc" }
    });

    return events.map((event) => ({
      id: event.id,
      organizationId: event.organizationId,
      memoryRecordId: event.memoryRecordId,
      eventType: event.eventType,
      actorId: event.actorId,
      eventVersion: event.eventVersion,
      payload: this.asRecord(event.payload),
      occurredAt: event.occurredAt.toISOString()
    }));
  }

  private async getRecordForOrganization(
    principal: AuthenticatedPrincipal,
    memoryRecordId: string
  ): Promise<PrismaMemoryRecord> {
    const record = await this.prisma.memoryRecord.findFirst({
      where: { id: memoryRecordId, organizationId: principal.organizationId }
    });
    if (record === null) {
      throw new NotFoundException("Memory record was not found.");
    }
    return record;
  }

  private async assertGraphEntityBelongsToOrganization(
    organizationId: string,
    entityId: string
  ): Promise<void> {
    const count = await this.prisma.graphEntity.count({ where: { id: entityId, organizationId } });
    if (count !== 1) {
      throw new ForbiddenException("Subject entity is outside the current organization.");
    }
  }

  private isCorrectionLifecycleProposalValid(
    current: MemoryLifecycle,
    proposed: MemoryLifecycle
  ): boolean {
    try {
      assertMemoryLifecycleTransition(current, proposed);
      return true;
    } catch {
      return false;
    }
  }

  private assertValidLifecycleTransition(
    current: MemoryLifecycle,
    proposed: MemoryLifecycle
  ): void {
    try {
      assertMemoryLifecycleTransition(current, proposed);
    } catch {
      throw new BadRequestException(
        `Invalid memory lifecycle transition from ${current} to ${proposed}.`
      );
    }
  }

  private async recordMemoryVersion(
    record: PrismaMemoryRecord,
    userId: string,
    changeReason: string,
    tx: Pick<PrismaService, "memoryRecordVersion">
  ): Promise<void> {
    await tx.memoryRecordVersion.create({
      data: {
        organizationId: record.organizationId,
        memoryRecordId: record.id,
        version: record.version,
        snapshot: this.recordSnapshot(record),
        changedByUserId: userId,
        changeReason
      }
    });
  }

  private async recordEvidenceVersion(
    evidence: PrismaEvidenceItem,
    userId: string,
    changeReason: string,
    tx: Pick<PrismaService, "evidenceItemVersion">
  ): Promise<void> {
    await tx.evidenceItemVersion.create({
      data: {
        organizationId: evidence.organizationId,
        evidenceItemId: evidence.id,
        version: evidence.version,
        snapshot: this.evidenceSnapshot(evidence),
        changedByUserId: userId,
        changeReason
      }
    });
  }

  private async recordCorrectionVersion(
    correction: PrismaCorrection,
    userId: string,
    changeReason: string,
    tx: Pick<PrismaService, "correctionVersion">
  ): Promise<void> {
    await tx.correctionVersion.create({
      data: {
        organizationId: correction.organizationId,
        correctionId: correction.id,
        version: correction.version,
        snapshot: this.correctionSnapshot(correction),
        changedByUserId: userId,
        changeReason
      }
    });
  }

  private async recordTimelineEvent(
    record: PrismaMemoryRecord,
    eventType: MemoryTimelineEvent["eventType"],
    actorId: string,
    eventVersion: number,
    payload: Record<string, unknown>,
    tx: Pick<PrismaService, "memoryTimelineEvent">
  ): Promise<void> {
    await tx.memoryTimelineEvent.create({
      data: {
        organizationId: record.organizationId,
        memoryRecordId: record.id,
        eventType,
        actorId,
        eventVersion,
        payload: this.toJson(payload)
      }
    });
  }

  private serializeRecord(record: PrismaMemoryRecord): MemoryRecord {
    return {
      id: record.id,
      organizationId: record.organizationId,
      classification: record.classification,
      lifecycle: record.lifecycle,
      subjectEntityId: record.subjectEntityId,
      claim: record.claim,
      owner: record.owner,
      reasoning: record.reasoning,
      provenance: this.asProvenance(record.provenance),
      version: record.version,
      confidence: {
        score: record.confidenceScore,
        band: record.confidenceBand,
        method: record.confidenceMethod,
        factors: this.asRecord(record.confidenceFactors),
        missingEvidence: this.asStringArray(record.missingEvidence),
        counterevidence: this.asStringArray(record.counterevidence)
      },
      validFrom: record.validFrom?.toISOString() ?? null,
      validUntil: record.validUntil?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString()
    };
  }

  private serializeEvidence(evidence: PrismaEvidenceItem): EvidenceItem {
    return {
      id: evidence.id,
      organizationId: evidence.organizationId,
      memoryRecordId: evidence.memoryRecordId,
      sourceType: evidence.sourceType,
      sourceLocator: evidence.sourceLocator,
      sourceRevision: evidence.sourceRevision,
      extractionMethod: evidence.extractionMethod,
      direction: evidence.direction,
      observedAt: evidence.observedAt.toISOString(),
      metadata: this.asRecord(evidence.metadata),
      provenance: this.asProvenance(evidence.provenance),
      version: evidence.version,
      createdAt: evidence.createdAt.toISOString()
    };
  }

  private serializeCorrection(correction: PrismaCorrection): Correction {
    return {
      id: correction.id,
      organizationId: correction.organizationId,
      memoryRecordId: correction.memoryRecordId,
      actorId: correction.actorId,
      rationale: correction.rationale,
      status: correction.status,
      proposedClaim: correction.proposedClaim,
      proposedLifecycle: correction.proposedLifecycle,
      proposedConfidenceScore: correction.proposedConfidenceScore,
      provenance: this.asProvenance(correction.provenance),
      version: correction.version,
      reviewedByUserId: correction.reviewedByUserId,
      reviewRationale: correction.reviewRationale,
      appliedAt: correction.appliedAt?.toISOString() ?? null,
      rejectedAt: correction.rejectedAt?.toISOString() ?? null,
      createdAt: correction.createdAt.toISOString(),
      updatedAt: correction.updatedAt.toISOString()
    };
  }

  private serializeVersion(
    version: {
      readonly id: string;
      readonly organizationId: string;
      readonly version: number;
      readonly snapshot: Prisma.JsonValue;
      readonly changedByUserId: string | null;
      readonly changeReason: string;
      readonly createdAt: Date;
    },
    subjectId: string
  ): MemoryVersion {
    return {
      id: version.id,
      organizationId: version.organizationId,
      subjectId,
      version: version.version,
      snapshot: this.asRecord(version.snapshot),
      changedByUserId: version.changedByUserId,
      changeReason: version.changeReason,
      createdAt: version.createdAt.toISOString()
    };
  }

  private recordSnapshot(record: PrismaMemoryRecord): Prisma.InputJsonObject {
    return this.asInputJsonObject(this.serializeRecord(record));
  }

  private evidenceSnapshot(evidence: PrismaEvidenceItem): Prisma.InputJsonObject {
    return this.asInputJsonObject(this.serializeEvidence(evidence));
  }

  private correctionSnapshot(correction: PrismaCorrection): Prisma.InputJsonObject {
    return this.asInputJsonObject(this.serializeCorrection(correction));
  }

  private asRecord(value: Prisma.JsonValue): Record<string, unknown> {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return value;
    }
    throw new ConflictException("Engineering Memory JSON object was malformed.");
  }

  private asStringArray(value: Prisma.JsonValue): string[] {
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      return value;
    }
    throw new ConflictException("Engineering Memory JSON array was malformed.");
  }

  private asProvenance(value: Prisma.JsonValue): MemoryRecord["provenance"] {
    return this.asRecord(value) as MemoryRecord["provenance"];
  }

  private asInputJsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
    return value as Prisma.InputJsonObject;
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private parseOptionalDate(value: string | null): Date | null {
    return value === null ? null : new Date(value);
  }
}
