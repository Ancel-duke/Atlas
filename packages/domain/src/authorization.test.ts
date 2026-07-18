import { describe, expect, it } from "vitest";

import { permissionsForRole, roleHasPermission } from "./index.js";

describe("organization authorization", () => {
  it("grants owners every organization permission", () => {
    expect(roleHasPermission("owner", "audit:read")).toBe(true);
    expect(roleHasPermission("owner", "membership:update")).toBe(true);
    expect(roleHasPermission("owner", "invitation:create")).toBe(true);
  });

  it("keeps viewers read-only", () => {
    expect(roleHasPermission("viewer", "organization:read")).toBe(true);
    expect(roleHasPermission("viewer", "graph:read")).toBe(true);
    expect(roleHasPermission("viewer", "memory:read")).toBe(true);
    expect(roleHasPermission("viewer", "pulse:read")).toBe(true);
    expect(roleHasPermission("viewer", "graph:write")).toBe(false);
    expect(roleHasPermission("viewer", "memory:write")).toBe(false);
    expect(roleHasPermission("viewer", "memory:correct")).toBe(false);
    expect(roleHasPermission("viewer", "repository:write")).toBe(false);
    expect(roleHasPermission("viewer", "membership:update")).toBe(false);
  });

  it("returns immutable permission collections by role", () => {
    expect(permissionsForRole("admin")).toContain("invitation:revoke");
    expect(permissionsForRole("admin")).toContain("graph:project");
    expect(permissionsForRole("member")).toContain("memory:correct");
    expect(permissionsForRole("member")).not.toContain("graph:write");
    expect(permissionsForRole("member")).not.toContain("repository:write");
    expect(permissionsForRole("member")).not.toContain("audit:read");
  });
});
