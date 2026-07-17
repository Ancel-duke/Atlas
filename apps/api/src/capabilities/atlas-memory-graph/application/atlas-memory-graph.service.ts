import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import {
  type GraphEntity,
  type GraphProjection,
  type GraphRelationship,
  type GraphTraversalRequest,
  type GraphTraversalResult,
  type GraphVersion,
  type ResolveGraphEntityRequest,
  type UpsertGraphEntityRequest,
  type UpsertGraphProjectionRequest,
  type UpsertGraphRelationshipRequest
} from "@atlas/contracts";
import type { Prisma } from "@atlas/database";
import { confidenceBandForScore } from "@atlas/domain";

import { PrismaService } from "../../../infrastructure/database/prisma.service.js";
import type { AuthenticatedPrincipal } from "../../identity/application/jwt-verifier.js";

type PrismaGraphEntity = Awaited<ReturnType<PrismaService["graphEntity"]["findFirstOrThrow"]>>;
type PrismaGraphRelationship = Awaited<
  ReturnType<PrismaService["graphRelationship"]["findFirstOrThrow"]>
>;

@Injectable()
export class AtlasMemoryGraphService {
  public constructor(private readonly prisma: PrismaService) {}

  public async upsertEntity(
    principal: AuthenticatedPrincipal,
    input: UpsertGraphEntityRequest
  ): Promise<GraphEntity> {
    const canonicalKey = this.normalizeKey(input.canonicalKey);
    const aliasKeys = [...new Set(input.aliases.map((alias) => this.normalizeKey(alias)))].filter(
      (alias) => alias !== canonicalKey
    );
    const confidenceBand = confidenceBandForScore(input.confidenceScore);

    const entity = await this.prisma.$transaction(async (tx) => {
      const resolved = await this.resolveEntityRecord(
        principal.organizationId,
        input.entityType,
        canonicalKey,
        tx
      );

      if (resolved === null) {
        const created = await tx.graphEntity.create({
          data: {
            organizationId: principal.organizationId,
            entityType: input.entityType,
            canonicalKey,
            displayName: input.displayName,
            attributes: this.toJson(input.attributes),
            sourceScope: this.toJson(input.sourceScope),
            provenance: this.toJson(input.provenance),
            lifecycle: input.lifecycle,
            confidenceScore: input.confidenceScore,
            confidenceBand,
            validFrom: this.parseOptionalDate(input.validFrom),
            validUntil: this.parseOptionalDate(input.validUntil),
            aliases: {
              create: aliasKeys.map((aliasKey) => ({
                organizationId: principal.organizationId,
                entityType: input.entityType,
                aliasKey,
                provenance: this.toJson(input.provenance)
              }))
            }
          }
        });

        await this.recordEntityVersion(created, principal.userId, input.changeReason, tx);
        return created;
      }

      const updated = await tx.graphEntity.update({
        where: { id: resolved.id },
        data: {
          displayName: input.displayName,
          attributes: this.toJson(input.attributes),
          sourceScope: this.toJson(input.sourceScope),
          provenance: this.toJson(input.provenance),
          lifecycle: input.lifecycle,
          version: { increment: 1 },
          confidenceScore: input.confidenceScore,
          confidenceBand,
          validFrom: this.parseOptionalDate(input.validFrom),
          validUntil: this.parseOptionalDate(input.validUntil)
        }
      });

      for (const aliasKey of aliasKeys) {
        const existingAlias = await tx.graphEntityAlias.findUnique({
          where: {
            organizationId_entityType_aliasKey: {
              organizationId: principal.organizationId,
              entityType: input.entityType,
              aliasKey
            }
          }
        });

        if (existingAlias !== null && existingAlias.entityId !== updated.id) {
          throw new ConflictException("Graph entity alias already resolves to another entity.");
        }

        await tx.graphEntityAlias.upsert({
          where: {
            organizationId_entityType_aliasKey: {
              organizationId: principal.organizationId,
              entityType: input.entityType,
              aliasKey
            }
          },
          create: {
            organizationId: principal.organizationId,
            entityId: updated.id,
            entityType: input.entityType,
            aliasKey,
            provenance: this.toJson(input.provenance)
          },
          update: {
            entityId: updated.id,
            provenance: this.toJson(input.provenance)
          }
        });
      }

      await this.recordEntityVersion(updated, principal.userId, input.changeReason, tx);
      return updated;
    });

    return this.serializeEntity(entity);
  }

  public async resolveEntity(
    principal: AuthenticatedPrincipal,
    input: ResolveGraphEntityRequest
  ): Promise<GraphEntity> {
    const entity = await this.resolveEntityRecord(
      principal.organizationId,
      input.entityType,
      this.normalizeKey(input.key),
      this.prisma
    );

    if (entity === null) {
      throw new NotFoundException("Graph entity was not resolved.");
    }

    return this.serializeEntity(entity);
  }

  public async listEntities(
    principal: AuthenticatedPrincipal,
    entityType: string | undefined
  ): Promise<GraphEntity[]> {
    const where: Prisma.GraphEntityWhereInput = { organizationId: principal.organizationId };
    if (entityType !== undefined) {
      where.entityType = entityType;
    }

    const entities = await this.prisma.graphEntity.findMany({
      where,
      orderBy: [{ entityType: "asc" }, { canonicalKey: "asc" }],
      take: 200
    });

    return entities.map((entity) => this.serializeEntity(entity));
  }

  public async upsertRelationship(
    principal: AuthenticatedPrincipal,
    input: UpsertGraphRelationshipRequest
  ): Promise<GraphRelationship> {
    await this.assertEntityBelongsToOrganization(principal.organizationId, input.sourceEntityId);
    await this.assertEntityBelongsToOrganization(principal.organizationId, input.targetEntityId);

    const confidenceBand = confidenceBandForScore(input.confidenceScore);
    const relationship = await this.prisma.$transaction(async (tx) => {
      const record = await tx.graphRelationship.upsert({
        where: {
          organizationId_sourceEntityId_targetEntityId_relationship: {
            organizationId: principal.organizationId,
            sourceEntityId: input.sourceEntityId,
            targetEntityId: input.targetEntityId,
            relationship: input.relationship
          }
        },
        create: {
          organizationId: principal.organizationId,
          sourceEntityId: input.sourceEntityId,
          targetEntityId: input.targetEntityId,
          relationship: input.relationship,
          status: input.status,
          provenance: this.toJson(input.provenance),
          attributes: this.toJson(input.attributes),
          confidenceScore: input.confidenceScore,
          confidenceBand,
          validFrom: this.parseOptionalDate(input.validFrom),
          validUntil: this.parseOptionalDate(input.validUntil)
        },
        update: {
          status: input.status,
          provenance: this.toJson(input.provenance),
          attributes: this.toJson(input.attributes),
          version: { increment: 1 },
          confidenceScore: input.confidenceScore,
          confidenceBand,
          validFrom: this.parseOptionalDate(input.validFrom),
          validUntil: this.parseOptionalDate(input.validUntil)
        }
      });

      await this.recordRelationshipVersion(record, principal.userId, input.changeReason, tx);
      return record;
    });

    return this.serializeRelationship(relationship);
  }

  public async traverse(
    principal: AuthenticatedPrincipal,
    input: GraphTraversalRequest
  ): Promise<GraphTraversalResult> {
    await this.assertEntityBelongsToOrganization(principal.organizationId, input.rootEntityId);

    const asOf = this.parseOptionalDate(input.asOf);
    const nodes = new Map<string, GraphEntity>();
    const edges = new Map<string, GraphRelationship>();
    let frontier = new Set<string>([input.rootEntityId]);

    for (let depth = 0; depth <= input.maxDepth; depth += 1) {
      if (frontier.size === 0) {
        break;
      }

      const entityRecords = await this.prisma.graphEntity.findMany({
        where: {
          organizationId: principal.organizationId,
          id: { in: [...frontier] },
          ...this.entityValidAtFilter(asOf)
        }
      });
      for (const entity of entityRecords) {
        nodes.set(entity.id, this.serializeEntity(entity));
      }

      if (depth === input.maxDepth) {
        break;
      }

      const relationshipWhere: Prisma.GraphRelationshipWhereInput = {
        organizationId: principal.organizationId,
        status: { notIn: ["archived", "deprecated", "superseded"] },
        ...this.relationshipDirectionFilter(input.direction, [...frontier]),
        ...this.relationshipValidAtFilter(asOf)
      };

      if (input.relationshipTypes.length > 0) {
        relationshipWhere.relationship = { in: input.relationshipTypes };
      }

      const relationshipRecords = await this.prisma.graphRelationship.findMany({
        where: relationshipWhere,
        take: 500
      });

      const nextFrontier = new Set<string>();
      for (const relationship of relationshipRecords) {
        edges.set(relationship.id, this.serializeRelationship(relationship));
        if (!nodes.has(relationship.sourceEntityId)) {
          nextFrontier.add(relationship.sourceEntityId);
        }
        if (!nodes.has(relationship.targetEntityId)) {
          nextFrontier.add(relationship.targetEntityId);
        }
      }
      frontier = nextFrontier;
    }

    return {
      rootEntityId: input.rootEntityId,
      maxDepth: input.maxDepth,
      nodes: [...nodes.values()],
      edges: [...edges.values()]
    };
  }

  public async upsertProjection(
    principal: AuthenticatedPrincipal,
    input: UpsertGraphProjectionRequest
  ): Promise<GraphProjection> {
    if (input.rootEntityId !== null) {
      await this.assertEntityBelongsToOrganization(principal.organizationId, input.rootEntityId);
    }

    const projection = await this.prisma.graphProjection.upsert({
      where: {
        organizationId_name: {
          organizationId: principal.organizationId,
          name: input.name
        }
      },
      create: {
        organizationId: principal.organizationId,
        name: input.name,
        kind: input.kind,
        rootEntityId: input.rootEntityId,
        projection: this.toJson(input.projection),
        provenance: this.toJson(input.provenance),
        createdByUserId: principal.userId
      },
      update: {
        kind: input.kind,
        rootEntityId: input.rootEntityId,
        projection: this.toJson(input.projection),
        provenance: this.toJson(input.provenance),
        version: { increment: 1 }
      }
    });

    return this.serializeProjection(projection);
  }

  public async listProjections(principal: AuthenticatedPrincipal): Promise<GraphProjection[]> {
    const projections = await this.prisma.graphProjection.findMany({
      where: { organizationId: principal.organizationId },
      orderBy: { updatedAt: "desc" },
      take: 100
    });

    return projections.map((projection) => this.serializeProjection(projection));
  }

  public async listEntityVersions(
    principal: AuthenticatedPrincipal,
    entityId: string
  ): Promise<GraphVersion[]> {
    await this.assertEntityBelongsToOrganization(principal.organizationId, entityId);
    const versions = await this.prisma.graphEntityVersion.findMany({
      where: { organizationId: principal.organizationId, entityId },
      orderBy: { version: "desc" }
    });

    return versions.map((version) => ({
      id: version.id,
      organizationId: version.organizationId,
      subjectId: version.entityId,
      version: version.version,
      snapshot: this.asRecord(version.snapshot),
      changedByUserId: version.changedByUserId,
      changeReason: version.changeReason,
      createdAt: version.createdAt.toISOString()
    }));
  }

  private async resolveEntityRecord(
    organizationId: string,
    entityType: string,
    key: string,
    client: Pick<PrismaService, "graphEntity" | "graphEntityAlias">
  ): Promise<PrismaGraphEntity | null> {
    const direct = await client.graphEntity.findUnique({
      where: {
        organizationId_entityType_canonicalKey: {
          organizationId,
          entityType,
          canonicalKey: key
        }
      }
    });

    if (direct !== null) {
      return direct;
    }

    const alias = await client.graphEntityAlias.findUnique({
      where: {
        organizationId_entityType_aliasKey: {
          organizationId,
          entityType,
          aliasKey: key
        }
      },
      include: { entity: true }
    });

    return alias?.entity ?? null;
  }

  private async assertEntityBelongsToOrganization(
    organizationId: string,
    entityId: string
  ): Promise<void> {
    const count = await this.prisma.graphEntity.count({ where: { id: entityId, organizationId } });
    if (count !== 1) {
      throw new ForbiddenException("Graph entity is outside the current organization.");
    }
  }

  private async recordEntityVersion(
    entity: PrismaGraphEntity,
    userId: string,
    changeReason: string,
    tx: Pick<PrismaService, "graphEntityVersion">
  ): Promise<void> {
    await tx.graphEntityVersion.create({
      data: {
        organizationId: entity.organizationId,
        entityId: entity.id,
        version: entity.version,
        snapshot: this.entitySnapshot(entity),
        changedByUserId: userId,
        changeReason
      }
    });
  }

  private async recordRelationshipVersion(
    relationship: PrismaGraphRelationship,
    userId: string,
    changeReason: string,
    tx: Pick<PrismaService, "graphRelationshipVersion">
  ): Promise<void> {
    await tx.graphRelationshipVersion.create({
      data: {
        organizationId: relationship.organizationId,
        relationshipId: relationship.id,
        version: relationship.version,
        snapshot: this.relationshipSnapshot(relationship),
        changedByUserId: userId,
        changeReason
      }
    });
  }

  private relationshipDirectionFilter(
    direction: GraphTraversalRequest["direction"],
    frontier: string[]
  ): Prisma.GraphRelationshipWhereInput {
    if (direction === "outgoing") {
      return { sourceEntityId: { in: frontier } };
    }

    if (direction === "incoming") {
      return { targetEntityId: { in: frontier } };
    }

    return {
      OR: [{ sourceEntityId: { in: frontier } }, { targetEntityId: { in: frontier } }]
    };
  }

  private entityValidAtFilter(asOf: Date | null): Prisma.GraphEntityWhereInput {
    if (asOf === null) {
      return {};
    }

    return {
      AND: [
        { OR: [{ validFrom: null }, { validFrom: { lte: asOf } }] },
        { OR: [{ validUntil: null }, { validUntil: { gt: asOf } }] }
      ]
    };
  }

  private relationshipValidAtFilter(asOf: Date | null): Prisma.GraphRelationshipWhereInput {
    if (asOf === null) {
      return {};
    }

    return {
      AND: [
        { OR: [{ validFrom: null }, { validFrom: { lte: asOf } }] },
        { OR: [{ validUntil: null }, { validUntil: { gt: asOf } }] }
      ]
    };
  }

  private serializeEntity(entity: PrismaGraphEntity): GraphEntity {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      entityType: entity.entityType,
      canonicalKey: entity.canonicalKey,
      displayName: entity.displayName,
      attributes: this.asRecord(entity.attributes),
      sourceScope: this.asRecord(entity.sourceScope),
      provenance: this.asProvenance(entity.provenance),
      lifecycle: entity.lifecycle,
      version: entity.version,
      confidenceScore: entity.confidenceScore,
      confidenceBand: entity.confidenceBand,
      validFrom: entity.validFrom?.toISOString() ?? null,
      validUntil: entity.validUntil?.toISOString() ?? null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString()
    };
  }

  private serializeRelationship(relationship: PrismaGraphRelationship): GraphRelationship {
    return {
      id: relationship.id,
      organizationId: relationship.organizationId,
      sourceEntityId: relationship.sourceEntityId,
      targetEntityId: relationship.targetEntityId,
      relationship: relationship.relationship,
      status: relationship.status,
      provenance: this.asProvenance(relationship.provenance),
      attributes: this.asRecord(relationship.attributes),
      version: relationship.version,
      confidenceScore: relationship.confidenceScore,
      confidenceBand: relationship.confidenceBand,
      validFrom: relationship.validFrom?.toISOString() ?? null,
      validUntil: relationship.validUntil?.toISOString() ?? null,
      createdAt: relationship.createdAt.toISOString(),
      updatedAt: relationship.updatedAt.toISOString()
    };
  }

  private serializeProjection(projection: {
    readonly id: string;
    readonly organizationId: string;
    readonly name: string;
    readonly kind: "explorer" | "reasoning" | "impact" | "ownership";
    readonly rootEntityId: string | null;
    readonly projection: Prisma.JsonValue;
    readonly provenance: Prisma.JsonValue;
    readonly version: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
  }): GraphProjection {
    return {
      id: projection.id,
      organizationId: projection.organizationId,
      name: projection.name,
      kind: projection.kind,
      rootEntityId: projection.rootEntityId,
      projection: projection.projection as GraphTraversalResult,
      provenance: this.asProvenance(projection.provenance),
      version: projection.version,
      createdAt: projection.createdAt.toISOString(),
      updatedAt: projection.updatedAt.toISOString()
    };
  }

  private entitySnapshot(entity: PrismaGraphEntity): Prisma.InputJsonObject {
    return this.asInputJsonObject(this.serializeEntity(entity));
  }

  private relationshipSnapshot(relationship: PrismaGraphRelationship): Prisma.InputJsonObject {
    return this.asInputJsonObject(this.serializeRelationship(relationship));
  }

  private asRecord(value: Prisma.JsonValue): Record<string, unknown> {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return value;
    }

    throw new ConflictException("Graph JSON object was malformed.");
  }

  private asProvenance(value: Prisma.JsonValue): GraphEntity["provenance"] {
    return this.asRecord(value) as GraphEntity["provenance"];
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

  private normalizeKey(value: string): string {
    return value.trim().toLowerCase().replace(/\\/g, "/").replace(/\/+/g, "/");
  }
}
