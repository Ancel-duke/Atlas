import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { parseServerEnvironment } from "@atlas/config";
import { queueNames } from "@atlas/contracts";

import { AtlasMemoryGraphModule } from "./capabilities/atlas-memory-graph/atlas-memory-graph.module.js";
import { IdentityModule } from "./capabilities/identity/identity.module.js";
import { JwtAuthGuard } from "./capabilities/identity/presentation/jwt-auth.guard.js";
import { SystemModule } from "./capabilities/system/system.module.js";

const environment = parseServerEnvironment(process.env);

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: environment.REDIS_URL
      }
    }),
    BullModule.registerQueue({ name: queueNames.repositoryIngestion }),
    AtlasMemoryGraphModule,
    IdentityModule,
    SystemModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    }
  ]
})
export class AppModule {}
