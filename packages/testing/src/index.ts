import type { HealthResponse } from "@atlas/contracts";

export function createHealthResponseFixture(
  overrides: Partial<HealthResponse> = {}
): HealthResponse {
  return {
    status: "ok",
    service: "atlas-test",
    environment: "test",
    timestamp: "2026-07-17T00:00:00.000Z",
    version: "0.1.0",
    correlationId: "test-correlation-id",
    ...overrides
  };
}
