import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { JSX } from "react";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@atlas/ui";

import { requireAtlasSession } from "../../../lib/atlas-api";
import { createOrganizationAction, signOutAction, switchOrganizationAction } from "../../actions";

type OrganizationPageProps = {
  readonly params: Promise<{
    readonly organizationSlug: string;
  }>;
};

export default async function OrganizationPage(props: OrganizationPageProps): Promise<JSX.Element> {
  const { organizationSlug } = await props.params;
  const atlasSession = await requireAtlasSession().catch(() => redirect("/sign-in"));

  if (atlasSession.principal.organizationSlug !== organizationSlug) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex items-start justify-between border-b border-slate-200 pb-5">
        <div>
          <p className="text-sm font-medium text-slate-500">Current organization</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
            {atlasSession.principal.organizationSlug}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Signed in as {atlasSession.principal.email} with {atlasSession.principal.role} access.
          </p>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Organization switcher</CardTitle>
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
                  <p className="text-sm text-slate-500">
                    {organization.slug} · {organization.role}
                  </p>
                </div>
                <Button type="submit" variant="secondary">
                  Switch
                </Button>
              </form>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create organization</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createOrganizationAction} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Display name
                <input
                  required
                  name="displayName"
                  className="rounded-md border border-slate-300 px-3 py-2"
                  minLength={2}
                  maxLength={120}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Slug
                <input
                  required
                  name="slug"
                  className="rounded-md border border-slate-300 px-3 py-2"
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  minLength={2}
                  maxLength={48}
                />
              </label>
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {atlasSession.principal.permissions.map((permission) => (
              <span
                key={permission}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
              >
                {permission}
              </span>
            ))}
          </div>
          <div className="mt-5 flex gap-3">
            <Button asChild variant="secondary">
              <Link href={`/org/${organizationSlug}/settings/members`}>Manage members</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/org/${organizationSlug}/memory`}>Engineering Memory</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/org/${organizationSlug}/repositories/local/pulse`}>
                Open Pulse route
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
