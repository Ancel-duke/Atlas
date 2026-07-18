import { Building2, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { JSX } from "react";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@atlas/ui";

import { createOrganizationAction, switchOrganizationAction } from "../../../actions";
import { AtlasShell, PageIntro, TrustStrip } from "../../../../components/atlas-shell";
import { requireAtlasSession } from "../../../../lib/atlas-api";

type PageProps = { readonly params: Promise<{ readonly organizationSlug: string }> };

export default async function OrganizationSettingsPage({
  params
}: PageProps): Promise<JSX.Element> {
  const { organizationSlug } = await params;
  const session = await requireAtlasSession().catch(() => redirect("/sign-in"));
  if (session.principal.organizationSlug !== organizationSlug) {
    notFound();
  }

  return (
    <AtlasShell
      organizationSlug={organizationSlug}
      title="Organization management"
      description="Organization settings define the tenant boundary for repositories, memory, graph facts, insights, and reasoning runs."
    >
      <PageIntro
        title="The organization is Atlas' tenancy boundary."
        body="Switching organizations changes the JWT context and every repository, graph entity, memory record, and insight query that follows."
        facts={["Tenant-scoped tokens", "Role-based permissions", "Separate evidence sets"]}
      />

      <TrustStrip
        items={[
          {
            label: "Organizations",
            value: `${session.organizations.length}`,
            tone: "info"
          },
          {
            label: "Current role",
            value: session.principal.role,
            tone: "success"
          },
          {
            label: "Permissions",
            value: `${session.principal.permissions.length} granted`,
            tone: "info"
          }
        ]}
      />

      <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {session.organizations.map((organization) => (
              <form
                action={switchOrganizationAction}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-4 dark:border-slate-800"
                key={organization.id}
              >
                <input name="organizationId" type="hidden" value={organization.id} />
                <div>
                  <p className="font-medium text-slate-950 dark:text-slate-100">
                    {organization.displayName}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{organization.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{organization.role}</Badge>
                  <Button type="submit" variant="secondary">
                    Switch
                  </Button>
                </div>
              </form>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create organization</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createOrganizationAction} className="grid gap-3">
              <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Display name
                <input
                  required
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                  maxLength={120}
                  minLength={2}
                  name="displayName"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Slug
                <input
                  required
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                  maxLength={48}
                  minLength={2}
                  name="slug"
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                />
              </label>
              <Button type="submit">
                <Building2 className="h-4 w-4" aria-hidden="true" />
                Create
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardContent>
            <Users className="h-5 w-5 text-slate-500" aria-hidden="true" />
            <h2 className="mt-3 font-semibold text-slate-950 dark:text-slate-100">
              Members and invitations
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Manage organization membership, invitations, and role boundaries.
            </p>
            <Button asChild className="mt-4" variant="secondary">
              <Link href={`/org/${organizationSlug}/settings/members`}>Manage members</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <ShieldCheck className="h-5 w-5 text-slate-500" aria-hidden="true" />
            <h2 className="mt-3 font-semibold text-slate-950 dark:text-slate-100">Permissions</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {session.principal.permissions.map((permission) => (
                <Badge key={permission}>{permission}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </AtlasShell>
  );
}
