import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";

import { parseServerEnvironment } from "@atlas/config";
import { queueNames } from "@atlas/contracts";

import { AtlasMemoryGraphModule } from "./capabilities/atlas-memory-graph/atlas-memory-graph.module.js";
import { ContinuousReasoningModule } from "./capabilities/continuous-reasoning/continuous-reasoning.module.js";
import { EngineeringMemoryModule } from "./capabilities/engineering-memory/engineering-memory.module.js";
import { IdentityModule } from "./capabilities/identity/identity.module.js";
import { RepositoryPulseModule } from "./capabilities/repository-pulse/repository-pulse.module.js";
import { RepositoriesModule } from "./capabilities/repositories/repositories.module.js";
import { InsightsModule } from "./capabilities/insights/insights.module.js";
import { JwtAuthGuard } from "./capabilities/identity/presentation/jwt-auth.guard.js";
import { SystemModule } from "./capabilities/system/system.module.js";
import { IdempotencyInterceptor } from "./infrastructure/http/idempotency.interceptor.js";
import { WriteAuditInterceptor } from "./infrastructure/http/write-audit.interceptor.js";

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
    AtlasMemoryGraphModule,
    ContinuousReasoningModule,
    EngineeringMemoryModule,
    IdentityModule,
    InsightsModule,
    RepositoriesModule,
    RepositoryPulseModule,
    SystemModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: WriteAuditInterceptor
    }
  ]
})
export class AppModule {}
