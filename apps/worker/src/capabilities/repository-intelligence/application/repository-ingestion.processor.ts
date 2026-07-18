import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";

import {
  queueNames,
  repositorySnapshotRequestedPayloadSchema,
  type RepositorySnapshotRequestedPayload
} from "@atlas/contracts";

@Processor(queueNames.repositoryIngestion)
export class RepositoryIngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(RepositoryIngestionProcessor.name);

  public process(job: Job<RepositorySnapshotRequestedPayload>): Promise<void> {
    const payload = repositorySnapshotRequestedPayloadSchema.parse(job.data);

    this.logger.log({
      eventName: "repository.snapshot.requested.validated",
      organizationId: payload.organizationId,
      repositoryId: payload.repositoryId,
      provider: payload.provider,
      providerRepositoryId: payload.providerRepositoryId,
      defaultBranch: payload.defaultBranch,
      correlationId: payload.correlationId
    });

    return Promise.resolve();
  }
}
