CREATE TABLE "idempotency_keys" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "request_hash" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "response_body" JSONB,
  "status_code" INTEGER,
  "locked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "idempotency_keys_organization_id_key_key"
  ON "idempotency_keys"("organization_id", "key");

CREATE INDEX "idempotency_keys_organization_id_status_locked_at_idx"
  ON "idempotency_keys"("organization_id", "status", "locked_at");
