import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { parseServerEnvironment } from "@atlas/config";
import { queueNames } from "@atlas/contracts";

import { RepositoryIntelligenceModule } from "./capabilities/repository-intelligence/repository-intelligence.module.js";

const environment = parseServerEnvironment(process.env);

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: environment.REDIS_URL
      }
    }),
    BullModule.registerQueue(
      { name: queueNames.repositoryIngestion },
      { name: queueNames.continuousReasoning }
    ),
    RepositoryIntelligenceModule
  ]
})
export class WorkerModule {}
