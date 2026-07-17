CREATE TYPE "CorrectionStatus" AS ENUM ('pending', 'applied', 'rejected');

CREATE TYPE "MemoryTimelineEventType" AS ENUM (
  'record_created',
  'record_updated',
  'lifecycle_transitioned',
  'evidence_added',
  'correction_requested',
  'correction_applied',
  'correction_rejected',
  'confidence_recalculated'
);

ALTER TABLE "memory_records"
  ADD COLUMN "provenance" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "evidence_items"
  ADD COLUMN "provenance" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "corrections"
  ADD COLUMN "status" "CorrectionStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN "proposed_claim" TEXT,
  ADD COLUMN "proposed_lifecycle" "MemoryLifecycle",
  ADD COLUMN "proposed_confidence_score" INTEGER,
  ADD COLUMN "provenance" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "reviewed_by_user_id" UUID,
  ADD COLUMN "review_rationale" TEXT,
  ADD COLUMN "applied_at" TIMESTAMPTZ(6),
  ADD COLUMN "rejected_at" TIMESTAMPTZ(6),
  ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "memory_record_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "memory_record_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "changed_by_user_id" UUID,
  "change_reason" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "memory_record_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evidence_item_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "evidence_item_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "changed_by_user_id" UUID,
  "change_reason" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "evidence_item_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "correction_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "correction_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "changed_by_user_id" UUID,
  "change_reason" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "correction_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "memory_timeline_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "memory_record_id" UUID NOT NULL,
  "event_type" "MemoryTimelineEventType" NOT NULL,
  "actor_id" UUID,
  "event_version" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "memory_timeline_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "memory_record_versions_organization_id_memory_record_id_version_key"
  ON "memory_record_versions"("organization_id", "memory_record_id", "version");
CREATE INDEX "memory_record_versions_organization_id_memory_record_id_created_at_idx"
  ON "memory_record_versions"("organization_id", "memory_record_id", "created_at");

CREATE UNIQUE INDEX "evidence_item_versions_organization_id_evidence_item_id_version_key"
  ON "evidence_item_versions"("organization_id", "evidence_item_id", "version");
CREATE INDEX "evidence_item_versions_organization_id_evidence_item_id_created_at_idx"
  ON "evidence_item_versions"("organization_id", "evidence_item_id", "created_at");

CREATE UNIQUE INDEX "correction_versions_organization_id_correction_id_version_key"
  ON "correction_versions"("organization_id", "correction_id", "version");
CREATE INDEX "correction_versions_organization_id_correction_id_created_at_idx"
  ON "correction_versions"("organization_id", "correction_id", "created_at");

CREATE INDEX "memory_timeline_events_organization_id_memory_record_id_occurred_at_idx"
  ON "memory_timeline_events"("organization_id", "memory_record_id", "occurred_at");
CREATE INDEX "memory_timeline_events_organization_id_event_type_occurred_at_idx"
  ON "memory_timeline_events"("organization_id", "event_type", "occurred_at");

DROP INDEX "corrections_organization_id_memory_record_id_created_at_idx";
CREATE INDEX "corrections_organization_id_memory_record_id_status_created_at_idx"
  ON "corrections"("organization_id", "memory_record_id", "status", "created_at");
CREATE INDEX "evidence_items_organization_id_memory_record_id_observed_at_idx"
  ON "evidence_items"("organization_id", "memory_record_id", "observed_at");

ALTER TABLE "memory_record_versions"
  ADD CONSTRAINT "memory_record_versions_memory_record_id_fkey"
  FOREIGN KEY ("memory_record_id") REFERENCES "memory_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "evidence_item_versions"
  ADD CONSTRAINT "evidence_item_versions_evidence_item_id_fkey"
  FOREIGN KEY ("evidence_item_id") REFERENCES "evidence_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "correction_versions"
  ADD CONSTRAINT "correction_versions_correction_id_fkey"
  FOREIGN KEY ("correction_id") REFERENCES "corrections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "memory_timeline_events"
  ADD CONSTRAINT "memory_timeline_events_memory_record_id_fkey"
  FOREIGN KEY ("memory_record_id") REFERENCES "memory_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
