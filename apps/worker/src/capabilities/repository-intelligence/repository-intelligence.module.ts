import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { queueNames } from "@atlas/contracts";

import { RepositoryIngestionProcessor } from "./application/repository-ingestion.processor.js";
import { RepositoryQueueReadiness } from "./application/repository-queue-readiness.js";

@Module({
  imports: [BullModule.registerQueue({ name: queueNames.repositoryIngestion })],
  providers: [RepositoryIngestionProcessor, RepositoryQueueReadiness],
  exports: [RepositoryQueueReadiness]
})
export class RepositoryIntelligenceModule {}
