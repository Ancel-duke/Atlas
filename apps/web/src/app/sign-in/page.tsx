import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import type { JSX } from "react";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@atlas/ui";

import { auth } from "../../auth";
import { signInWithGitHubAction } from "../actions";

export default async function SignInPage(): Promise<JSX.Element> {
  const session = await auth();

  if (session?.atlas?.principal.organizationSlug !== undefined) {
    redirect(`/org/${session.atlas.principal.organizationSlug}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            Sign in to Atlas
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm leading-6 text-slate-700">
            GitHub verifies identity. Atlas then creates or selects an organization and issues an
            organization-scoped session token so every repository, memory record, insight, and
            reasoning run stays inside the right tenant boundary.
          </p>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
            Judge path: sign in, connect a repository, open Repository Pulse, then inspect Graph,
            Memory, Evidence, and Engineering Chat.
          </div>
          <form action={signInWithGitHubAction}>
            <Button type="submit">Continue with GitHub</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
