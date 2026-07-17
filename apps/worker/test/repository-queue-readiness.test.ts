import { describe, expect, it } from "vitest";

import { queueNames } from "@atlas/contracts";

import { RepositoryQueueReadiness } from "../src/capabilities/repository-intelligence/application/repository-queue-readiness.js";

describe("RepositoryQueueReadiness", () => {
  it("reports the configured repository ingestion queue", () => {
    const service = new RepositoryQueueReadiness({ name: queueNames.repositoryIngestion });

    expect(service.getReadiness()).toEqual({
      queueName: queueNames.repositoryIngestion,
      isConfigured: true
    });
  });
});
