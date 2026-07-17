import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module.js";

async function generateOpenApi(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Atlas API")
      .setDescription("Versioned REST API for the Atlas engineering foundation.")
      .setVersion("0.1.0")
      .addBearerAuth()
      .build()
  );

  await writeFile(join(process.cwd(), "openapi.json"), `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
}

void generateOpenApi();
