import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";

import { parseServerEnvironment } from "@atlas/config";

import { AppModule } from "./app.module.js";
import { CorrelationIdInterceptor } from "./infrastructure/observability/correlation-id.interceptor.js";
import { startOpenTelemetry } from "./infrastructure/observability/open-telemetry.js";
import { ProblemDetailsFilter } from "./infrastructure/http/problem-details.filter.js";

async function bootstrap(): Promise<void> {
  const telemetry = startOpenTelemetry("atlas-api");
  const environment = parseServerEnvironment(process.env);
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  const logger = new Logger("Bootstrap");

  app.use(helmet());
  app.enableCors({
    origin: environment.ATLAS_WEB_ORIGINS,
    credentials: true
  });
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.useGlobalInterceptors(new CorrelationIdInterceptor());

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Atlas API")
      .setDescription("Versioned REST API for the Atlas engineering foundation.")
      .setVersion("0.1.0")
      .addBearerAuth()
      .build()
  );
  SwaggerModule.setup("/v1/docs", app, document);

  const port = environment.ATLAS_API_PORT;
  await app.listen(port);
  logger.log(`Atlas API listening on port ${port}`);

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
