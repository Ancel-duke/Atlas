CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TYPE "RepositoryProvider" AS ENUM ('github');
CREATE TYPE "RepositoryConnectionStatus" AS ENUM ('connected', 'suspended', 'revoked', 'archived');
CREATE TYPE "GraphEntityLifecycle" AS ENUM ('proposed', 'verified', 'active', 'challenged', 'superseded', 'deprecated', 'archived');
CREATE TYPE "GraphRelationshipStatus" AS ENUM ('proposed', 'verified', 'active', 'challenged', 'superseded', 'deprecated', 'archived');
CREATE TYPE "MemoryRecordClassification" AS ENUM ('fact', 'decision', 'recommendation');
CREATE TYPE "MemoryLifecycle" AS ENUM ('proposed', 'verified', 'active', 'challenged', 'superseded', 'deprecated', 'archived');
CREATE TYPE "EvidenceDirection" AS ENUM ('supports', 'challenges');
CREATE TYPE "ConfidenceBand" AS ENUM ('low', 'moderate', 'high');
CREATE TYPE "InsightImpact" AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE "InsightStatus" AS ENUM ('open', 'acknowledged', 'resolved', 'dismissed', 'expired');

CREATE TABLE "organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" text NOT NULL UNIQUE,
  "display_name" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL
);

CREATE TABLE "repositories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
  "provider" "RepositoryProvider" NOT NULL,
  "provider_repository_id" text NOT NULL,
  "name" text NOT NULL,
  "default_branch" text NOT NULL,
  "connection_status" "RepositoryConnectionStatus" NOT NULL DEFAULT 'connected',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  UNIQUE ("organization_id", "provider", "provider_repository_id")
);
CREATE INDEX "repositories_organization_id_connection_status_idx" ON "repositories" ("organization_id", "connection_status");

CREATE TABLE "repository_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "repository_id" uuid NOT NULL REFERENCES "repositories"("id") ON DELETE RESTRICT,
  "commit_sha" text NOT NULL,
  "source_revision" text NOT NULL,
  "acquired_at" timestamptz NOT NULL DEFAULT now(),
  "provenance" jsonb NOT NULL,
  UNIQUE ("organization_id", "repository_id", "commit_sha")
);
CREATE INDEX "repository_snapshots_organization_id_repository_id_acquired_at_idx" ON "repository_snapshots" ("organization_id", "repository_id", "acquired_at");

CREATE TABLE "graph_entities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "entity_type" text NOT NULL,
  "canonical_key" text NOT NULL,
  "source_scope" jsonb NOT NULL,
  "lifecycle" "GraphEntityLifecycle" NOT NULL DEFAULT 'proposed',
  "confidence_score" integer NOT NULL CHECK ("confidence_score" >= 0 AND "confidence_score" <= 100),
  "confidence_band" "ConfidenceBand" NOT NULL,
  "valid_from" timestamptz,
  "valid_until" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  UNIQUE ("organization_id", "entity_type", "canonical_key")
);
CREATE INDEX "graph_entities_organization_id_lifecycle_entity_type_idx" ON "graph_entities" ("organization_id", "lifecycle", "entity_type");

CREATE TABLE "graph_relationships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "source_entity_id" uuid NOT NULL REFERENCES "graph_entities"("id") ON DELETE RESTRICT,
  "target_entity_id" uuid NOT NULL REFERENCES "graph_entities"("id") ON DELETE RESTRICT,
  "relationship" text NOT NULL,
  "status" "GraphRelationshipStatus" NOT NULL DEFAULT 'proposed',
  "provenance" jsonb NOT NULL,
  "confidence_score" integer NOT NULL CHECK ("confidence_score" >= 0 AND "confidence_score" <= 100),
  "confidence_band" "ConfidenceBand" NOT NULL,
  "valid_from" timestamptz,
  "valid_until" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL
);
CREATE INDEX "graph_relationships_organization_id_source_entity_id_relationship_idx" ON "graph_relationships" ("organization_id", "source_entity_id", "relationship");
CREATE INDEX "graph_relationships_organization_id_target_entity_id_relationship_idx" ON "graph_relationships" ("organization_id", "target_entity_id", "relationship");

CREATE TABLE "memory_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "classification" "MemoryRecordClassification" NOT NULL,
  "lifecycle" "MemoryLifecycle" NOT NULL DEFAULT 'proposed',
  "subject_entity_id" uuid,
  "claim" text NOT NULL,
  "owner" text,
  "reasoning" text,
  "confidence_score" integer NOT NULL CHECK ("confidence_score" >= 0 AND "confidence_score" <= 100),
  "confidence_band" "ConfidenceBand" NOT NULL,
  "confidence_method" text NOT NULL,
  "confidence_factors" jsonb NOT NULL,
  "missing_evidence" jsonb NOT NULL,
  "counterevidence" jsonb NOT NULL,
  "valid_from" timestamptz,
  "valid_until" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL
);
CREATE INDEX "memory_records_organization_id_lifecycle_classification_idx" ON "memory_records" ("organization_id", "lifecycle", "classification");

CREATE TABLE "evidence_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "memory_record_id" uuid REFERENCES "memory_records"("id") ON DELETE RESTRICT,
  "source_type" text NOT NULL,
  "source_locator" text NOT NULL,
  "source_revision" text,
  "extraction_method" text NOT NULL,
  "direction" "EvidenceDirection" NOT NULL DEFAULT 'supports',
  "observed_at" timestamptz NOT NULL,
  "metadata" jsonb NOT NULL,
  "embedding" vector(1536),
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "evidence_items_organization_id_source_type_observed_at_idx" ON "evidence_items" ("organization_id", "source_type", "observed_at");

CREATE TABLE "corrections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "memory_record_id" uuid NOT NULL REFERENCES "memory_records"("id") ON DELETE RESTRICT,
  "actor_id" uuid NOT NULL,
  "rationale" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "corrections_organization_id_memory_record_id_created_at_idx" ON "corrections" ("organization_id", "memory_record_id", "created_at");

CREATE TABLE "insights" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "repository_id" uuid,
  "capability" text NOT NULL,
  "claim" text NOT NULL,
  "impact" "InsightImpact" NOT NULL,
  "status" "InsightStatus" NOT NULL DEFAULT 'open',
  "confidence_score" integer NOT NULL CHECK ("confidence_score" >= 0 AND "confidence_score" <= 100),
  "confidence_band" "ConfidenceBand" NOT NULL,
  "confidence_method" text NOT NULL,
  "confidence_factors" jsonb NOT NULL,
  "missing_evidence" jsonb NOT NULL,
  "counterevidence" jsonb NOT NULL,
  "evidence_set" jsonb NOT NULL,
  "recommended_action" text NOT NULL,
  "reevaluation_trigger" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL
);
CREATE INDEX "insights_organization_id_repository_id_status_impact_idx" ON "insights" ("organization_id", "repository_id", "status", "impact");

CREATE TABLE "pulse_assessments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "repository_id" uuid NOT NULL REFERENCES "repositories"("id") ON DELETE RESTRICT,
  "formula_version" text NOT NULL,
  "status" text NOT NULL,
  "overall_score" integer,
  "confidence_score" integer NOT NULL CHECK ("confidence_score" >= 0 AND "confidence_score" <= 100),
  "confidence_band" "ConfidenceBand" NOT NULL,
  "dimensions" jsonb NOT NULL,
  "evidence_set" jsonb NOT NULL,
  "missing_evidence" jsonb NOT NULL,
  "excluded_evidence" jsonb NOT NULL,
  "trend" jsonb NOT NULL,
  "calculated_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "pulse_assessments_organization_id_repository_id_calculated_at_idx" ON "pulse_assessments" ("organization_id", "repository_id", "calculated_at");

CREATE TABLE "audit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid,
  "actor_id" uuid,
  "event_name" text NOT NULL,
  "target_type" text NOT NULL,
  "target_id" uuid,
  "correlation_id" text NOT NULL,
  "metadata" jsonb NOT NULL,
  "occurred_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "audit_events_organization_id_event_name_occurred_at_idx" ON "audit_events" ("organization_id", "event_name", "occurred_at");

CREATE TABLE "outbox_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "event_name" text NOT NULL,
  "event_version" integer NOT NULL,
  "payload" jsonb NOT NULL,
  "correlation_id" text NOT NULL,
  "occurred_at" timestamptz NOT NULL DEFAULT now(),
  "published_at" timestamptz
);
CREATE INDEX "outbox_events_organization_id_event_name_occurred_at_idx" ON "outbox_events" ("organization_id", "event_name", "occurred_at");
CREATE INDEX "outbox_events_published_at_idx" ON "outbox_events" ("published_at");
