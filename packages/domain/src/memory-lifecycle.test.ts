import { describe, expect, it } from "vitest";

import { assertMemoryLifecycleTransition, canTransitionMemoryLifecycle } from "./index.js";

describe("memory lifecycle transitions", () => {
  it("allows governed forward transitions", () => {
    expect(canTransitionMemoryLifecycle("proposed", "verified")).toBe(true);
    expect(canTransitionMemoryLifecycle("verified", "active")).toBe(true);
    expect(canTransitionMemoryLifecycle("active", "challenged")).toBe(true);
    expect(canTransitionMemoryLifecycle("challenged", "superseded")).toBe(true);
    expect(canTransitionMemoryLifecycle("deprecated", "archived")).toBe(true);
  });

  it("rejects transitions that would erase lifecycle history", () => {
    expect(canTransitionMemoryLifecycle("archived", "active")).toBe(false);
    expect(canTransitionMemoryLifecycle("superseded", "active")).toBe(false);
    expect(() => assertMemoryLifecycleTransition("archived", "active")).toThrow(
      "Invalid memory lifecycle transition"
    );
  });
});
