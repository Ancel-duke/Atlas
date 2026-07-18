import { authTokenResponseSchema } from "@atlas/contracts";
import { AtlasSdk } from "@atlas/sdk";

import { auth } from "../auth";
import { getWebEnvironment } from "./web-environment";

export async function createAuthenticatedAtlasSdk(): Promise<AtlasSdk> {
  const session = await auth();
  const environment = getWebEnvironment();

  return new AtlasSdk({
    baseUrl: environment.ATLAS_API_INTERNAL_URL ?? environment.NEXT_PUBLIC_ATLAS_API_URL,
    getAccessToken: () => session?.atlas?.accessToken
  });
}

export async function requireAtlasSession() {
  const session = await auth();

  if (session?.atlas === undefined) {
    throw new Error("Atlas session is required.");
  }

  return authTokenResponseSchema.parse(session.atlas);
}
