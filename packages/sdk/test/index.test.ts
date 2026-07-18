import { afterEach, describe, expect, it, vi } from "vitest";

import { AtlasSdk, AtlasSdkError } from "../src/index.js";

describe("AtlasSdk", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("raises a structured SDK error when the API returns invalid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("not json", { status: 502 })))
    );

    const sdk = new AtlasSdk({ baseUrl: "https://atlas.test" });

    await expect(sdk.getHealth()).rejects.toMatchObject({
      name: "AtlasSdkError",
      message: "Atlas API returned an invalid JSON response.",
      status: 502
    });
  });

  it("preserves problem details from JSON API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              type: "https://atlas.dev/problems/not-found",
              title: "Repository was not found.",
              status: 404
            }),
            { status: 404, headers: { "Content-Type": "application/json" } }
          )
        )
      )
    );

    const sdk = new AtlasSdk({ baseUrl: "https://atlas.test" });

    await expect(sdk.getHealth()).rejects.toBeInstanceOf(AtlasSdkError);
    await expect(sdk.getHealth()).rejects.toMatchObject({
      message: "Repository was not found.",
      status: 404,
      problem: {
        title: "Repository was not found.",
        status: 404
      }
    });
  });
});
