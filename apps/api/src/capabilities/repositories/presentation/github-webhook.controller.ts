import { createHmac, timingSafeEqual } from "node:crypto";

import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Inject,
  Post,
  Req,
  ServiceUnavailableException
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import type { Queue } from "bullmq";

import {
  queueNames,
  repositorySnapshotRequestedPayloadSchema,
  type RepositorySnapshotRequestedPayload
} from "@atlas/contracts";
import type { Prisma } from "@atlas/database";

import { PrismaService } from "../../../infrastructure/database/prisma.service.js";
import { Public } from "../../identity/presentation/public.decorator.js";

type RawBodyRequest = Request & { readonly rawBody?: Buffer };

@ApiTags("github")
@Controller("/v1/github")
export class GitHubWebhookController {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @InjectQueue(queueNames.repositoryIngestion)
    private readonly repositoryIngestionQueue: Queue<RepositorySnapshotRequestedPayload>
  ) {}

  @Public()
  @Post("/webhooks")
  @ApiOperation({ summary: "Verify a GitHub webhook and enqueue repository ingestion." })
  public async receive(
    @Req() request: RawBodyRequest,
    @Body() body: unknown,
    @Headers("x-github-event") eventName?: string,
    @Headers("x-github-delivery") deliveryId?: string,
    @Headers("x-hub-signature-256") signature?: string
  ): Promise<{ readonly accepted: true; readonly enqueued: number }> {
    this.verifySignature(request.rawBody, signature);

    const repository = this.repositoryFromWebhook(body);
    const correlationId = deliveryId ?? crypto.randomUUID();
    const connectedRepositories =
      repository === null
        ? []
        : await this.prisma.repository.findMany({
            where: {
              provider: "github",
              providerRepositoryId: repository.providerRepositoryId,
              connectionStatus: "connected"
            }
          });

    let enqueued = 0;
    for (const connected of connectedRepositories) {
      const payload = repositorySnapshotRequestedPayloadSchema.parse({
        repositoryId: connected.id,
        organizationId: connected.organizationId,
        provider: connected.provider,
        providerRepositoryId: connected.providerRepositoryId,
        defaultBranch: connected.defaultBranch,
        correlationId
      });

      await this.prisma.outboxEvent.create({
        data: {
          organizationId: connected.organizationId,
          eventName: `github.${eventName ?? "unknown"}.received`,
          eventVersion: 1,
          payload: this.toJson({
            deliveryId,
            repository: repository?.name ?? connected.name,
            ingestion: payload
          }),
          correlationId
        }
      });
      await this.repositoryIngestionQueue.add("repository.snapshot.requested", payload, {
        jobId: `${connected.organizationId}:${connected.id}:${correlationId}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: 100,
        removeOnFail: 500
      });
      enqueued += 1;
    }

    return { accepted: true, enqueued };
  }

  private verifySignature(rawBody: Buffer | undefined, signature: string | undefined): void {
    const secret = process.env["GITHUB_WEBHOOK_SECRET"];
    if (secret === undefined || secret.length < 16) {
      throw new ServiceUnavailableException("GitHub webhook secret is not configured.");
    }
    if (rawBody === undefined || signature === undefined) {
      throw new BadRequestException("GitHub webhook signature is required.");
    }

    const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(signature);
    if (
      expectedBuffer.length !== actualBuffer.length ||
      !timingSafeEqual(expectedBuffer, actualBuffer)
    ) {
      throw new BadRequestException("GitHub webhook signature is invalid.");
    }
  }

  private repositoryFromWebhook(
    body: unknown
  ): { readonly providerRepositoryId: string; readonly name: string } | null {
    if (typeof body !== "object" || body === null) {
      return null;
    }
    const repository = (body as { readonly repository?: unknown }).repository;
    if (typeof repository !== "object" || repository === null) {
      return null;
    }
    const id = (repository as { readonly id?: unknown }).id;
    const name = (repository as { readonly full_name?: unknown; readonly name?: unknown })
      .full_name;
    const fallbackName = (repository as { readonly name?: unknown }).name;
    if (typeof id !== "number") {
      return null;
    }

    return {
      providerRepositoryId: id.toString(),
      name:
        typeof name === "string"
          ? name
          : typeof fallbackName === "string"
            ? fallbackName
            : id.toString()
    };
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }
}
