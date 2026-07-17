import { Module } from "@nestjs/common";

import { HealthService } from "./application/health.service.js";
import { SystemController } from "./presentation/system.controller.js";

@Module({
  controllers: [SystemController],
  providers: [HealthService],
  exports: [HealthService]
})
export class SystemModule {}
