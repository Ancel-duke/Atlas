import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../infrastructure/database/database.module.js";
import { AtlasMemoryGraphService } from "./application/atlas-memory-graph.service.js";
import { AtlasMemoryGraphController } from "./presentation/atlas-memory-graph.controller.js";

@Module({
  imports: [DatabaseModule],
  controllers: [AtlasMemoryGraphController],
  providers: [AtlasMemoryGraphService],
  exports: [AtlasMemoryGraphService]
})
export class AtlasMemoryGraphModule {}
