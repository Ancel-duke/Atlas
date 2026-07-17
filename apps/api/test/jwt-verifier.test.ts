import { describe, expect, it } from "vitest";

import { JwtVerifier } from "../src/capabilities/identity/application/jwt-verifier.js";

describe("JwtVerifier", () => {
  it("issues and verifies organization-scoped Atlas access tokens", async () => {
    process.env.NODE_ENV = "test";
    process.env.ATLAS_ENVIRONMENT = "test";
    process.env.ATLAS_JWT_ISSUER = "atlas-test";
    process.env.ATLAS_JWT_AUDIENCE = "atlas-api";
    process.env.ATLAS_JWT_SECRET = "test-secret-value-with-at-least-thirty-two-chars";
    process.env.ATLAS_INTERNAL_API_SECRET =
      "test-internal-secret-value-with-at-least-thirty-two-chars";
    process.env.DATABASE_URL = "postgresql://atlas:atlas@localhost:5432/atlas?schema=public";
    process.env.REDIS_URL = "redis://localhost:6379";

    const verifier = new JwtVerifier();
    const issued = await verifier.issueAccessToken({
      userId: "87dbf9ac-f049-4a4d-bfb8-8623ceac9f49",
      email: "engineer@example.com",
      name: "Engineer",
      imageUrl: null,
      organizationId: "1da0f1eb-3cf8-4671-a3e3-1e6e114cceef",
      organizationSlug: "atlas",
      role: "admin"
    });

    const principal = await verifier.verify(`Bearer ${issued.accessToken}`);

    expect(principal.userId).toBe("87dbf9ac-f049-4a4d-bfb8-8623ceac9f49");
    expect(principal.organizationId).toBe("1da0f1eb-3cf8-4671-a3e3-1e6e114cceef");
    expect(principal.role).toBe("admin");
    expect(principal.permissions).toContain("membership:update");
    expect(principal.issuer).toBe("atlas-test");
    expect(principal.audience).toBe("atlas-api");
  });
});
