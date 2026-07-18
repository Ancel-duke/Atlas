import { Injectable } from "@nestjs/common";

import {
  type CreateReasoningRunRequest,
  type GraphEntity,
  type GraphRelationship,
  type GraphTraversalResult,
  type MemoryRecord,
  type ReasoningEvidenceItem,
  type ReasoningEvidencePackage
} from "@atlas/contracts";
import type { Prisma } from "@atlas/database";

import { PrismaService } from "../../../infrastructure/database/prisma.service.js";
import type { AuthenticatedPrincipal } from "../../identity/application/jwt-verifier.js";

@Injectable()
export class ReasoningEvidencePackager {
  public constructor(private readonly prisma: PrismaService) {}

  public async packageEvidence(
    principal: AuthenticatedPrincipal,
    input: CreateReasoningRunRequest
  ): Promise<ReasoningEvidencePackage> {
    const generatedAt = new Date().toISOString();
    const missingEvidence: string[] = [];
    const evidence: ReasoningEvidenceItem[] = [];
    const graph = await this.retrieveGraph(principal.organizationId, input, missingEvidence);

    if (graph !== null) {
      for (const node of graph.nodes) {
        evidence.push({
          id: `graph_entity:${node.id}`,
          kind: "graph_entity",
          sourceType: node.provenance.sourceType,
          sourceLocator: node.provenance.sourceLocator,
          sourceRevision: node.provenance.sourceRevision,
          observedAt: node.provenance.observedAt,
          summary: `${node.entityType}:${node.canonicalKey}`,
          payload: node
        });
      }

      for (const edge of graph.edges) {
        evidence.push({
          id: `graph_relationship:${edge.id}`,
          kind: "graph_relationship",
          sourceType: edge.provenance.sourceType,
          sourceLocator: edge.provenance.sourceLocator,
          sourceRevision: edge.provenance.sourceRevision,
          observedAt: edge.provenance.observedAt,
          summary: `${edge.sourceEntityId} ${edge.relationship} ${edge.targetEntityId}`,
          payload: edge
        });
      }
    }

    const memoryWhere: Prisma.MemoryRecordWhereInput = {
      organizationId: principal.organizationId
    };
    if (input.memoryRecordIds.length > 0) {
      memoryWhere.id = { in: input.memoryRecordIds };
    }

    const records = await this.prisma.memoryRecord.findMany({
      where: memoryWhere,
      orderBy: { updatedAt: "desc" },
      take: input.memoryRecordIds.length > 0 ? input.memoryRecordIds.length : 25
    });

    const foundRecordIds = new Set(records.map((record) => record.id));
    for (const requestedId of input.memoryRecordIds) {
      if (!foundRecordIds.has(requestedId)) {
        missingEvidence.push(`memory_record:${requestedId} was not found in this organization`);
      }
    }

    for (const record of records) {
      const serialized = this.serializeMemoryRecord(record);
      evidence.push({
        id: `memory_record:${record.id}`,
        kind: "memory_record",
        sourceType: serialized.provenance.sourceType,
        sourceLocator: serialized.provenance.sourceLocator,
        sourceRevision: serialized.provenance.sourceRevision,
        observedAt: serialized.provenance.observedAt,
        summary: serialized.claim,
        payload: serialized
      });
    }

    if (records.length > 0) {
      const evidenceItems = await this.prisma.evidenceItem.findMany({
        where: {
          organizationId: principal.organizationId,
          memoryRecordId: { in: records.map((record) => record.id) }
        },
        orderBy: { observedAt: "desc" },
        take: 100
      });

      for (const item of evidenceItems) {
        evidence.push({
          id: `evidence_item:${item.id}`,
          kind: "evidence_item",
          sourceType: item.sourceType,
          sourceLocator: item.sourceLocator,
          sourceRevision: item.sourceRevision,
          observedAt: item.observedAt.toISOString(),
          summary: `${item.direction} evidence from ${item.sourceType}:${item.sourceLocator}`,
          payload: {
            id: item.id,
            memoryRecordId: item.memoryRecordId,
            direction: item.direction,
            metadata: this.asRecord(item.metadata),
            provenance: this.asRecord(item.provenance)
          }
        });
      }
    }

    if (evidence.length === 0) {
      missingEvidence.push("No graph, memory, or evidence records were available for reasoning.");
    }

    return {
      packageVersion: "reasoning-evidence-v1",
      generatedAt,
      question: input.question,
      evidence,
      graph,
      memoryRecordIds: records.map((record) => record.id),
      missingEvidence
    };
  }

  private async retrieveGraph(
    organizationId: string,
    input: CreateReasoningRunRequest,
    missingEvidence: string[]
  ): Promise<GraphTraversalResult | null> {
    if (input.rootEntityId === null) {
      return null;
    }

    const root = await this.prisma.graphEntity.findFirst({
      where: { id: input.rootEntityId, organizationId }
    });
    if (root === null) {
      missingEvidence.push(`graph_entity:${input.rootEntityId} was not found in this organization`);
      return null;
    }

    const nodes = new Map<string, GraphEntity>();
    const edges = new Map<string, GraphRelationship>();
    let frontier = new Set<string>([input.rootEntityId]);

    for (let depth = 0; depth <= input.maxGraphDepth; depth += 1) {
      const nodeRecords = await this.prisma.graphEntity.findMany({
        where: { organizationId, id: { in: [...frontier] } }
      });
      for (const node of nodeRecords) {
        nodes.set(node.id, this.serializeGraphEntity(node));
      }
      if (depth === input.maxGraphDepth || frontier.size === 0) {
        break;
      }

      const edgeRecords = await this.prisma.graphRelationship.findMany({
        where: {
          organizationId,
          status: { notIn: ["archived", "deprecated", "superseded"] },
          OR: [{ sourceEntityId: { in: [...frontier] } }, { targetEntityId: { in: [...frontier] } }]
        },
        take: 500
      });
      const nextFrontier = new Set<string>();
      for (const edge of edgeRecords) {
        edges.set(edge.id, this.serializeGraphRelationship(edge));
        if (!nodes.has(edge.sourceEntityId)) {
          nextFrontier.add(edge.sourceEntityId);
        }
        if (!nodes.has(edge.targetEntityId)) {
          nextFrontier.add(edge.targetEntityId);
        }
      }
      frontier = nextFrontier;
    }

    return {
      rootEntityId: input.rootEntityId,
      maxDepth: input.maxGraphDepth,
      nodes: [...nodes.values()],
      edges: [...edges.values()]
    };
  }

  private serializeGraphEntity(entity: {
    readonly id: string;
    readonly organizationId: string;
    readonly entityType: string;
    readonly canonicalKey: string;
    readonly displayName: string | null;
    readonly attributes: Prisma.JsonValue;
    readonly sourceScope: Prisma.JsonValue;
    readonly provenance: Prisma.JsonValue;
    readonly lifecycle: GraphEntity["lifecycle"];
    readonly version: number;
    readonly confidenceScore: number;
    readonly confidenceBand: GraphEntity["confidenceBand"];
    readonly validFrom: Date | null;
    readonly validUntil: Date | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
  }): GraphEntity {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      entityType: entity.entityType,
      canonicalKey: entity.canonicalKey,
      displayName: entity.displayName,
      attributes: this.asRecord(entity.attributes),
      sourceScope: this.asRecord(entity.sourceScope),
      provenance: this.asRecord(entity.provenance) as GraphEntity["provenance"],
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

  private serializeGraphRelationship(relationship: {
    readonly id: string;
    readonly organizationId: string;
    readonly sourceEntityId: string;
    readonly targetEntityId: string;
    readonly relationship: string;
    readonly status: GraphRelationship["status"];
    readonly provenance: Prisma.JsonValue;
    readonly attributes: Prisma.JsonValue;
    readonly version: number;
    readonly confidenceScore: number;
    readonly confidenceBand: GraphRelationship["confidenceBand"];
    readonly validFrom: Date | null;
    readonly validUntil: Date | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
  }): GraphRelationship {
    return {
      id: relationship.id,
      organizationId: relationship.organizationId,
      sourceEntityId: relationship.sourceEntityId,
      targetEntityId: relationship.targetEntityId,
      relationship: relationship.relationship,
      status: relationship.status,
      provenance: this.asRecord(relationship.provenance) as GraphRelationship["provenance"],
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

  private serializeMemoryRecord(record: {
    readonly id: string;
    readonly organizationId: string;
    readonly classification: MemoryRecord["classification"];
    readonly lifecycle: MemoryRecord["lifecycle"];
    readonly subjectEntityId: string | null;
    readonly claim: string;
    readonly owner: string | null;
    readonly reasoning: string | null;
    readonly provenance: Prisma.JsonValue;
    readonly version: number;
    readonly confidenceScore: number;
    readonly confidenceBand: MemoryRecord["confidence"]["band"];
    readonly confidenceMethod: string;
    readonly confidenceFactors: Prisma.JsonValue;
    readonly missingEvidence: Prisma.JsonValue;
    readonly counterevidence: Prisma.JsonValue;
    readonly validFrom: Date | null;
    readonly validUntil: Date | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
  }): MemoryRecord {
    return {
      id: record.id,
      organizationId: record.organizationId,
      classification: record.classification,
      lifecycle: record.lifecycle,
      subjectEntityId: record.subjectEntityId,
      claim: record.claim,
      owner: record.owner,
      reasoning: record.reasoning,
      provenance: this.asRecord(record.provenance) as MemoryRecord["provenance"],
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

  private asRecord(value: Prisma.JsonValue): Record<string, unknown> {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return value;
    }
    return {};
  }

  private asStringArray(value: Prisma.JsonValue): string[] {
    return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
  }
}
