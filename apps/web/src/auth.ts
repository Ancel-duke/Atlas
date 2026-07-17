import { parseWebEnvironment } from "@atlas/config";
import { authTokenResponseSchema, githubOAuthExchangeRequestSchema } from "@atlas/contracts";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { z } from "zod";

const environment = parseWebEnvironment(process.env);

const githubProfileSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  login: z.string().min(1).nullable().optional(),
  email: z.string().email().nullable().optional(),
  name: z.string().min(1).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  html_url: z.string().url().nullable().optional()
});

const githubEmailSchema = z.object({
  email: z.string().email(),
  primary: z.boolean(),
  verified: z.boolean()
});

async function resolveGitHubEmail(
  profileEmail: string | null | undefined,
  accessToken: string | undefined
): Promise<string> {
  if (profileEmail !== null && profileEmail !== undefined) {
    return profileEmail;
  }

  if (accessToken === undefined) {
    throw new Error("GitHub did not provide an email address or an OAuth access token.");
  }

  const response = await fetch("https://api.github.com/user/emails", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  if (!response.ok) {
    throw new Error("Unable to resolve GitHub primary email address.");
  }

  const emails = githubEmailSchema.array().parse((await response.json()) as unknown);
  const primaryVerifiedEmail = emails.find((email) => email.primary && email.verified);

  if (primaryVerifiedEmail === undefined) {
    throw new Error("GitHub account does not expose a verified primary email address.");
  }

  return primaryVerifiedEmail.email;
}

async function exchangeGitHubProfile(profile: unknown, accessToken: string | undefined) {
  const parsedProfile = githubProfileSchema.parse(profile);
  const email = await resolveGitHubEmail(parsedProfile.email, accessToken);

  const request = githubOAuthExchangeRequestSchema.parse({
    providerAccountId: parsedProfile.id,
    email,
    name: parsedProfile.name ?? null,
    username: parsedProfile.login ?? null,
    avatarUrl: parsedProfile.avatar_url ?? null,
    profileUrl: parsedProfile.html_url ?? null
  });

  const response = await fetch(
    new URL("/v1/identity/oauth/github", environment.NEXT_PUBLIC_ATLAS_API_URL),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-atlas-internal-secret": environment.ATLAS_INTERNAL_API_SECRET,
        "x-correlation-id": crypto.randomUUID()
      },
      body: JSON.stringify(request)
    }
  );

  const body = (await response.json()) as unknown;

  if (!response.ok) {
    throw new Error("Atlas API rejected the GitHub OAuth exchange.");
  }

  return authTokenResponseSchema.parse(body);
}

export const {
  handlers,
  auth,
  signIn,
  signOut,
  unstable_update: updateSession
} = NextAuth({
  providers: [
    GitHub({
      clientId: environment.AUTH_GITHUB_ID,
      clientSecret: environment.AUTH_GITHUB_SECRET,
      authorization: { params: { scope: "read:user user:email" } }
    })
  ],
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === "github" && profile !== undefined) {
        const exchange = await exchangeGitHubProfile(profile, account.access_token);
        token.atlas = exchange;
      }

      return token;
    },
    session({ session, token }) {
      if (token.atlas !== undefined) {
        session.atlas = authTokenResponseSchema.parse(token.atlas);
      }

      return session;
    }
  }
});
