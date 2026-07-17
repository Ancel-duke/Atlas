import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";

import { queueNames } from "@atlas/contracts";

export type QueueReadiness = {
  readonly queueName: string;
  readonly isConfigured: boolean;
};

type NamedQueue = {
  readonly name: string;
};

@Injectable()
export class RepositoryQueueReadiness {
  public constructor(
    @InjectQueue(queueNames.repositoryIngestion)
    private readonly repositoryIngestionQueue: NamedQueue
  ) {}

  public getReadiness(): QueueReadiness {
    return {
      queueName: this.repositoryIngestionQueue.name,
      isConfigured: this.repositoryIngestionQueue.name === queueNames.repositoryIngestion
    };
  }
}
