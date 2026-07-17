import type { AuthTokenResponse } from "@atlas/contracts";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    atlas?: AuthTokenResponse;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    atlas?: AuthTokenResponse;
  }
}
