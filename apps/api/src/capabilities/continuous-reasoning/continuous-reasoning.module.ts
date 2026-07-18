import { Module } from "@nestjs/common";

import { ContinuousReasoningAgents } from "./application/continuous-reasoning.agents.js";
import { ContinuousReasoningOrchestrator } from "./application/continuous-reasoning-orchestrator.service.js";
import { ReasoningEvidencePackager } from "./application/evidence-packager.service.js";
import { ReasoningEvaluationService } from "./application/reasoning-evaluation.service.js";
import { ContinuousReasoningController } from "./presentation/continuous-reasoning.controller.js";

@Module({
  controllers: [ContinuousReasoningController],
  providers: [
    ContinuousReasoningAgents,
    ContinuousReasoningOrchestrator,
    ReasoningEvidencePackager,
    ReasoningEvaluationService
  ],
  exports: [ContinuousReasoningOrchestrator]
})
export class ContinuousReasoningModule {}
