import Link from "next/link";
import { redirect } from "next/navigation";
import type { JSX } from "react";

import { authTokenResponseSchema } from "@atlas/contracts";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@atlas/ui";

import { auth } from "../auth";
import { signInWithGitHubAction, signOutAction, switchOrganizationAction } from "./actions";

export default async function HomePage(): Promise<JSX.Element> {
  const session = await auth();
  const atlasSession =
    session?.atlas === undefined ? undefined : authTokenResponseSchema.parse(session.atlas);

  if (atlasSession?.principal.organizationSlug !== undefined) {
    redirect(`/org/${atlasSession.principal.organizationSlug}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <p className="text-sm font-medium text-slate-500">Atlas</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
            Authentication and organizations
          </h1>
        </div>
        <form action={signInWithGitHubAction}>
          <Button type="submit">Sign in with GitHub</Button>
        </form>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Atlas tenant boundary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="max-w-3xl text-sm leading-6 text-slate-700">
            Atlas uses GitHub OAuth through Auth.js, then issues organization-scoped Atlas JWTs.
            Every repository, memory record, insight, invitation, membership, and audit event is
            evaluated inside an organization boundary.
          </p>
        </CardContent>
      </Card>

      {atlasSession !== undefined ? (
        <Card>
          <CardHeader>
            <CardTitle>Available organizations</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {atlasSession.organizations.map((organization) => (
              <form
                key={organization.id}
                action={switchOrganizationAction}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
              >
                <input name="organizationId" type="hidden" value={organization.id} />
                <div>
                  <p className="font-medium text-slate-950">{organization.displayName}</p>
                  <p className="text-sm text-slate-500">{organization.role}</p>
                </div>
                <Button type="submit" variant="secondary">
                  Open
                </Button>
              </form>
            ))}
            <form action={signOutAction}>
              <Button type="submit" variant="secondary">
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Button asChild variant="secondary">
        <Link href="/sign-in">Open sign-in page</Link>
      </Button>
    </main>
  );
}
