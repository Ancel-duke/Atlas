import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../infrastructure/database/database.module.js";
import { EngineeringMemoryService } from "./application/engineering-memory.service.js";
import { EngineeringMemoryController } from "./presentation/engineering-memory.controller.js";

@Module({
  imports: [DatabaseModule],
  controllers: [EngineeringMemoryController],
  providers: [EngineeringMemoryService],
  exports: [EngineeringMemoryService]
})
export class EngineeringMemoryModule {}
