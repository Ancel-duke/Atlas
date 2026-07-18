import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { queueNames } from "@atlas/contracts";

import { RepositoriesService } from "./application/repositories.service.js";
import { GitHubWebhookController } from "./presentation/github-webhook.controller.js";
import { RepositoriesController } from "./presentation/repositories.controller.js";

@Module({
  imports: [BullModule.registerQueue({ name: queueNames.repositoryIngestion })],
  controllers: [GitHubWebhookController, RepositoriesController],
  providers: [RepositoriesService],
  exports: [RepositoriesService]
})
export class RepositoriesModule {}
