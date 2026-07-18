import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { Queue } from "bullmq";

import type {
  CreateRepositoryRequest,
  Repository,
  RepositorySnapshotRequestedPayload,
  UpdateRepositoryRequest
} from "@atlas/contracts";
import { queueNames, repositorySnapshotRequestedPayloadSchema } from "@atlas/contracts";
import type { Prisma } from "@atlas/database";

import { PrismaService } from "../../../infrastructure/database/prisma.service.js";
import type { AuthenticatedPrincipal } from "../../identity/application/jwt-verifier.js";

@Injectable()
export class RepositoriesService {
  public constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(queueNames.repositoryIngestion)
    private readonly repositoryIngestionQueue: Queue<RepositorySnapshotRequestedPayload>
  ) {}

  public async list(principal: AuthenticatedPrincipal): Promise<Repository[]> {
    const repositories = await this.prisma.repository.findMany({
      where: { organizationId: principal.organizationId },
      orderBy: [{ connectionStatus: "asc" }, { updatedAt: "desc" }]
    });

    return repositories.map((repository) => this.serialize(repository));
  }

  public async create(
    principal: AuthenticatedPrincipal,
    input: CreateRepositoryRequest,
    correlationId: string
  ): Promise<Repository> {
    const repository = await this.prisma.$transaction(async (tx) => {
      const record = await tx.repository.upsert({
        where: {
          organizationId_provider_providerRepositoryId: {
            organizationId: principal.organizationId,
            provider: input.provider,
            providerRepositoryId: input.providerRepositoryId
          }
        },
        create: {
          organizationId: principal.organizationId,
          provider: input.provider,
          providerRepositoryId: input.providerRepositoryId,
          name: input.name,
          defaultBranch: input.defaultBranch
        },
        update: {
          name: input.name,
          defaultBranch: input.defaultBranch,
          connectionStatus: "connected"
        }
      });

      const payload = this.snapshotRequestedPayload(principal, record, correlationId);
      await tx.auditEvent.create({
        data: {
          organizationId: principal.organizationId,
          actorId: principal.userId,
          eventName: "repository.connected",
          targetType: "repository",
          targetId: record.id,
          correlationId,
          metadata: this.toJson({
            provider: record.provider,
            providerRepositoryId: record.providerRepositoryId,
            defaultBranch: record.defaultBranch
          })
        }
      });
      await tx.outboxEvent.create({
        data: {
          organizationId: principal.organizationId,
          eventName: "repository.snapshot.requested",
          eventVersion: 1,
          payload: this.toJson(payload),
          correlationId
        }
      });

      return record;
    });

    const payload = this.snapshotRequestedPayload(principal, repository, correlationId);
    await this.repositoryIngestionQueue.add("repository.snapshot.requested", payload, {
      jobId: `${principal.organizationId}:${repository.id}:${repository.defaultBranch}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: 100,
      removeOnFail: 500
    });

    return this.serialize(repository);
  }

  public async requestIngestion(
    principal: AuthenticatedPrincipal,
    repositoryId: string,
    correlationId: string
  ): Promise<void> {
    const repository = await this.prisma.repository.findFirstOrThrow({
      where: { id: repositoryId, organizationId: principal.organizationId }
    });
    const payload = this.snapshotRequestedPayload(principal, repository, correlationId);
    repositorySnapshotRequestedPayloadSchema.parse(payload);

    await this.repositoryIngestionQueue.add("repository.snapshot.requested", payload, {
      jobId: `${principal.organizationId}:${repository.id}:${repository.defaultBranch}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: 100,
      removeOnFail: 500
    });
  }

  private snapshotRequestedPayload(
    principal: AuthenticatedPrincipal,
    repository: {
      readonly id: string;
      readonly organizationId: string;
      readonly provider: Repository["provider"];
      readonly providerRepositoryId: string;
      readonly defaultBranch: string;
    },
    correlationId: string
  ): RepositorySnapshotRequestedPayload {
    return repositorySnapshotRequestedPayloadSchema.parse({
      repositoryId: repository.id,
      organizationId: repository.organizationId,
      requestedByUserId: principal.userId,
      provider: repository.provider,
      providerRepositoryId: repository.providerRepositoryId,
      defaultBranch: repository.defaultBranch,
      correlationId
    });
  }

  private async auditRepositoryUpdated(
    principal: AuthenticatedPrincipal,
    repositoryId: string,
    input: UpdateRepositoryRequest,
    correlationId: string
  ): Promise<void> {
    await this.prisma.auditEvent.create({
      data: {
        organizationId: principal.organizationId,
        actorId: principal.userId,
        eventName: "repository.updated",
        targetType: "repository",
        targetId: repositoryId,
        correlationId,
        metadata: this.toJson(input)
      }
    });
  }

  public async get(principal: AuthenticatedPrincipal, repositoryId: string): Promise<Repository> {
    const repository = await this.prisma.repository.findFirst({
      where: { id: repositoryId, organizationId: principal.organizationId }
    });
    if (repository === null) {
      throw new NotFoundException("Repository was not found.");
    }

    return this.serialize(repository);
  }

  public async update(
    principal: AuthenticatedPrincipal,
    repositoryId: string,
    input: UpdateRepositoryRequest,
    correlationId: string
  ): Promise<Repository> {
    await this.get(principal, repositoryId);
    const repository = await this.prisma.repository.update({
      where: { id: repositoryId },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.defaultBranch === undefined ? {} : { defaultBranch: input.defaultBranch }),
        ...(input.connectionStatus === undefined
          ? {}
          : { connectionStatus: input.connectionStatus })
      }
    });
    await this.auditRepositoryUpdated(principal, repository.id, input, correlationId);

    return this.serialize(repository);
  }

  private serialize(repository: {
    readonly id: string;
    readonly organizationId: string;
    readonly provider: Repository["provider"];
    readonly providerRepositoryId: string;
    readonly name: string;
    readonly defaultBranch: string;
    readonly connectionStatus: Repository["connectionStatus"];
    readonly createdAt: Date;
    readonly updatedAt: Date;
  }): Repository {
    return {
      id: repository.id,
      organizationId: repository.organizationId,
      provider: repository.provider,
      providerRepositoryId: repository.providerRepositoryId,
      name: repository.name,
      defaultBranch: repository.defaultBranch,
      connectionStatus: repository.connectionStatus,
      createdAt: repository.createdAt.toISOString(),
      updatedAt: repository.updatedAt.toISOString()
    };
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }
}
