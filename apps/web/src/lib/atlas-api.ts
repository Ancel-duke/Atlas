import { parseWebEnvironment } from "@atlas/config";
import { authTokenResponseSchema } from "@atlas/contracts";
import { AtlasSdk } from "@atlas/sdk";

import { auth } from "../auth";

const environment = parseWebEnvironment(process.env);

export async function createAuthenticatedAtlasSdk(): Promise<AtlasSdk> {
  const session = await auth();

  return new AtlasSdk({
    baseUrl: environment.NEXT_PUBLIC_ATLAS_API_URL,
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
