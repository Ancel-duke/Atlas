import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { queueNames } from "@atlas/contracts";

import { RepositoryQueueReadiness } from "./application/repository-queue-readiness.js";

@Module({
  imports: [BullModule.registerQueue({ name: queueNames.repositoryIngestion })],
  providers: [RepositoryQueueReadiness],
  exports: [RepositoryQueueReadiness]
})
export class RepositoryIntelligenceModule {}
