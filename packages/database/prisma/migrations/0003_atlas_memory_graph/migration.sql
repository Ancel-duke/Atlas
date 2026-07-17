CREATE TYPE "GraphProjectionKind" AS ENUM ('explorer', 'reasoning', 'impact', 'ownership');

ALTER TABLE "graph_entities"
  ADD COLUMN "display_name" TEXT,
  ADD COLUMN "attributes" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "provenance" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "graph_relationships"
  ADD COLUMN "attributes" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX "graph_relationships_organization_id_source_target_relationship_key"
  ON "graph_relationships"("organization_id", "source_entity_id", "target_entity_id", "relationship");

CREATE TABLE "graph_entity_aliases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "entity_id" UUID NOT NULL,
  "entity_type" TEXT NOT NULL,
  "alias_key" TEXT NOT NULL,
  "provenance" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "graph_entity_aliases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "graph_entity_aliases_organization_id_entity_type_alias_key_key"
  ON "graph_entity_aliases"("organization_id", "entity_type", "alias_key");
CREATE INDEX "graph_entity_aliases_organization_id_entity_id_idx"
  ON "graph_entity_aliases"("organization_id", "entity_id");

ALTER TABLE "graph_entity_aliases"
  ADD CONSTRAINT "graph_entity_aliases_entity_id_fkey"
  FOREIGN KEY ("entity_id") REFERENCES "graph_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "graph_entity_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "entity_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "changed_by_user_id" UUID,
  "change_reason" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "graph_entity_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "graph_entity_versions_organization_id_entity_id_version_key"
  ON "graph_entity_versions"("organization_id", "entity_id", "version");
CREATE INDEX "graph_entity_versions_organization_id_entity_id_created_at_idx"
  ON "graph_entity_versions"("organization_id", "entity_id", "created_at");

ALTER TABLE "graph_entity_versions"
  ADD CONSTRAINT "graph_entity_versions_entity_id_fkey"
  FOREIGN KEY ("entity_id") REFERENCES "graph_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "graph_relationship_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "relationship_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "changed_by_user_id" UUID,
  "change_reason" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "graph_relationship_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "graph_relationship_versions_organization_id_relationship_id_version_key"
  ON "graph_relationship_versions"("organization_id", "relationship_id", "version");
CREATE INDEX "graph_relationship_versions_organization_id_relationship_id_created_at_idx"
  ON "graph_relationship_versions"("organization_id", "relationship_id", "created_at");

ALTER TABLE "graph_relationship_versions"
  ADD CONSTRAINT "graph_relationship_versions_relationship_id_fkey"
  FOREIGN KEY ("relationship_id") REFERENCES "graph_relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "graph_projections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "GraphProjectionKind" NOT NULL,
  "root_entity_id" UUID,
  "projection" JSONB NOT NULL,
  "provenance" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "graph_projections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "graph_projections_organization_id_name_key"
  ON "graph_projections"("organization_id", "name");
CREATE INDEX "graph_projections_organization_id_kind_updated_at_idx"
  ON "graph_projections"("organization_id", "kind", "updated_at");
