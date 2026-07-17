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
          <CardTitle>Sign in to Atlas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm leading-6 text-slate-700">
            GitHub OAuth verifies identity. Atlas then creates or selects an organization and issues
            an organization-scoped session token.
          </p>
          <form action={signInWithGitHubAction}>
            <Button type="submit">Continue with GitHub</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
