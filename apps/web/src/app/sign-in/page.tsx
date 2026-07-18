import { Github, LockKeyhole, Network, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import type { JSX } from "react";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@atlas/ui";

import { auth } from "../../auth";
import { signInWithGitHubAction } from "../actions";

export default async function SignInPage(): Promise<JSX.Element> {
  const session = await auth();

  if (session?.atlas?.principal.organizationSlug !== undefined) {
    redirect(`/org/${session.atlas.principal.organizationSlug}`);
  }

  return (
    <main className="atlas-grid grid min-h-screen place-items-center px-5 py-8 text-slate-100">
      <section className="grid w-full max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="atlas-enter">
          <Badge tone="success">
            <LockKeyhole className="mr-1 h-3 w-3" aria-hidden="true" />
            Organization-scoped access
          </Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-normal text-white sm:text-5xl">
            Sign in to an engineering system that respects trust boundaries.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
            GitHub verifies identity. Atlas then issues an organization-scoped session token so
            every repository, memory record, insight, and reasoning run stays inside the right
            tenant boundary.
          </p>
        </div>

        <Card className="atlas-enter">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-cyan-200" aria-hidden="true" />
              Continue with GitHub
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-3">
              <AuthSignal icon={Github} label="Identity" value="GitHub OAuth" />
              <AuthSignal icon={Network} label="Tenant context" value="Selected after sign-in" />
              <AuthSignal icon={ShieldCheck} label="Session scope" value="Organization-bound JWT" />
            </div>
            <form action={signInWithGitHubAction}>
              <Button className="w-full" type="submit">
                <Github className="h-4 w-4" aria-hidden="true" />
                Continue with GitHub
              </Button>
            </form>
            <p className="text-xs leading-5 text-slate-500">
              Demo path: sign in, connect a repository, open Repository Pulse, then inspect Graph,
              Memory, Evidence, Timeline, and Engineering Chat.
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function AuthSignal({
  icon: Icon,
  label,
  value
}: {
  readonly icon: typeof ShieldCheck;
  readonly label: string;
  readonly value: string;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-cyan-200" aria-hidden="true" />
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}
