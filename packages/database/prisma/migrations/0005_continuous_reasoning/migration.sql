CREATE TYPE "ReasoningRunStatus" AS ENUM ('packaged', 'evaluated', 'persisted', 'rejected');

CREATE TYPE "ReasoningAgentRole" AS ENUM (
  'orchestrator',
  'architect',
  'reviewer',
  'historian',
  'librarian',
  'planner'
);

CREATE TYPE "ReasoningEvaluationStatus" AS ENUM ('passed', 'failed');

CREATE TABLE "reasoning_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "requested_by_user_id" UUID NOT NULL,
  "repository_id" UUID,
  "status" "ReasoningRunStatus" NOT NULL DEFAULT 'packaged',
  "question" TEXT NOT NULL,
  "prompt_version" TEXT NOT NULL,
  "model_version" TEXT NOT NULL,
  "evidence_package" JSONB NOT NULL,
  "prompts" JSONB NOT NULL,
  "conclusions" JSONB NOT NULL DEFAULT '[]',
  "persisted_insight_ids" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "reasoning_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reasoning_agent_invocations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reasoning_run_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "role" "ReasoningAgentRole" NOT NULL,
  "prompt_version" TEXT NOT NULL,
  "model_version" TEXT NOT NULL,
  "prompt" JSONB NOT NULL,
  "output" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "reasoning_agent_invocations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reasoning_evaluations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reasoning_run_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "status" "ReasoningEvaluationStatus" NOT NULL,
  "checks" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "reasoning_evaluations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "insights"
  ADD COLUMN "reasoning_run_id" UUID;

CREATE INDEX "reasoning_runs_organization_id_status_created_at_idx"
  ON "reasoning_runs"("organization_id", "status", "created_at");
CREATE INDEX "reasoning_runs_organization_id_repository_id_created_at_idx"
  ON "reasoning_runs"("organization_id", "repository_id", "created_at");
CREATE INDEX "reasoning_agent_invocations_organization_id_reasoning_run_id_role_idx"
  ON "reasoning_agent_invocations"("organization_id", "reasoning_run_id", "role");
CREATE INDEX "reasoning_evaluations_organization_id_reasoning_run_id_created_at_idx"
  ON "reasoning_evaluations"("organization_id", "reasoning_run_id", "created_at");
CREATE INDEX "insights_organization_id_reasoning_run_id_idx"
  ON "insights"("organization_id", "reasoning_run_id");

ALTER TABLE "reasoning_runs"
  ADD CONSTRAINT "reasoning_runs_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reasoning_agent_invocations"
  ADD CONSTRAINT "reasoning_agent_invocations_reasoning_run_id_fkey"
  FOREIGN KEY ("reasoning_run_id") REFERENCES "reasoning_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reasoning_evaluations"
  ADD CONSTRAINT "reasoning_evaluations_reasoning_run_id_fkey"
  FOREIGN KEY ("reasoning_run_id") REFERENCES "reasoning_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "insights"
  ADD CONSTRAINT "insights_reasoning_run_id_fkey"
  FOREIGN KEY ("reasoning_run_id") REFERENCES "reasoning_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
