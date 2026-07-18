import { Module } from "@nestjs/common";

import { RepositoryPulseService } from "./application/repository-pulse.service.js";
import { RepositoryPulseController } from "./presentation/repository-pulse.controller.js";

@Module({
  controllers: [RepositoryPulseController],
  providers: [RepositoryPulseService],
  exports: [RepositoryPulseService]
})
export class RepositoryPulseModule {}
