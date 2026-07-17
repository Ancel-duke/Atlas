import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { WorkerModule } from "./worker.module.js";
import { startOpenTelemetry } from "./infrastructure/observability/open-telemetry.js";

async function bootstrap(): Promise<void> {
  const telemetry = startOpenTelemetry("atlas-worker");
  const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  const logger = new Logger("WorkerBootstrap");

  logger.log("Atlas worker application context started.");

  const shutdown = async (): Promise<void> => {
    await app.close();
    await telemetry.shutdown();
  };

  process.once("SIGTERM", () => {
    void shutdown();
  });
  process.once("SIGINT", () => {
    void shutdown();
  });
}

void bootstrap();
