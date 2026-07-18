import { BookOpen, GitBranch, Network, ShieldCheck } from "lucide-react";
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
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-sm font-medium text-slate-500">Atlas engineering intelligence</p>
          <h1 className="mt-1 max-w-3xl text-3xl font-semibold tracking-normal text-slate-950">
            Understand a repository the way a principal engineer would.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Atlas connects GitHub identity, repository evidence, graph context, durable memory,
            pulse scoring, and structured reasoning. Every conclusion must show evidence,
            confidence, and impact.
          </p>
        </div>
        <form action={signInWithGitHubAction}>
          <Button type="submit">Sign in with GitHub</Button>
        </form>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>What the demo should prove</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <TrustPoint
            icon={GitBranch}
            title="Repository-aware"
            body="Pulse and settings stay tied to provider identity and branch context."
          />
          <TrustPoint
            icon={Network}
            title="Graph-grounded"
            body="Engineering objects carry provenance, lifecycle, and confidence."
          />
          <TrustPoint
            icon={BookOpen}
            title="Memory-backed"
            body="Facts, decisions, and recommendations are versioned and correctable."
          />
          <TrustPoint
            icon={ShieldCheck}
            title="Evidence-gated"
            body="Atlas withholds conclusions when the proof is not strong enough."
          />
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

function TrustPoint({
  icon: Icon,
  title,
  body
}: {
  readonly icon: typeof ShieldCheck;
  readonly title: string;
  readonly body: string;
}): JSX.Element {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <Icon className="h-4 w-4 text-slate-600" aria-hidden="true" />
      <p className="mt-2 text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}
