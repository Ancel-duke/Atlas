import { Module } from "@nestjs/common";

import { InsightsService } from "./application/insights.service.js";
import { InsightsController } from "./presentation/insights.controller.js";

@Module({
  controllers: [InsightsController],
  providers: [InsightsService],
  exports: [InsightsService]
})
export class InsightsModule {}
