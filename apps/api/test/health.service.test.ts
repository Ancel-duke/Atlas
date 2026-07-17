import { describe, expect, it } from "vitest";

import { HealthService } from "../src/capabilities/system/application/health.service.js";

describe("HealthService", () => {
  it("returns a health payload with the supplied correlation ID", () => {
    process.env["ATLAS_JWT_ISSUER"] = "atlas-test";
    process.env["ATLAS_JWT_AUDIENCE"] = "atlas-api";
    process.env["ATLAS_JWT_SECRET"] = "test-secret-value-with-at-least-thirty-two-chars";
    process.env["ATLAS_INTERNAL_API_SECRET"] =
      "test-internal-secret-value-with-at-least-thirty-two-chars";
    process.env["DATABASE_URL"] = "postgresql://atlas:atlas@localhost:5432/atlas?schema=public";
    process.env["REDIS_URL"] = "redis://localhost:6379";

    const service = new HealthService();
    const response = service.getHealth("correlation-test");

    expect(response.service).toBe("atlas-api");
    expect(response.correlationId).toBe("correlation-test");
    expect(response.status).toBe("ok");
  });
});
