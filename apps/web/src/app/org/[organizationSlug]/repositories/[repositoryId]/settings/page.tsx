import { notFound, redirect } from "next/navigation";
import type { JSX } from "react";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@atlas/ui";

import { updateRepositoryAction } from "../../../../../actions";
import { AtlasShell, PageIntro, TrustStrip } from "../../../../../../components/atlas-shell";
import { createAuthenticatedAtlasSdk, requireAtlasSession } from "../../../../../../lib/atlas-api";

type PageProps = {
  readonly params: Promise<{ readonly organizationSlug: string; readonly repositoryId: string }>;
};

export default async function RepositorySettingsPage({ params }: PageProps): Promise<JSX.Element> {
  const { organizationSlug, repositoryId } = await params;
  const session = await requireAtlasSession().catch(() => redirect("/sign-in"));
  if (session.principal.organizationSlug !== organizationSlug) {
    notFound();
  }

  const sdk = await createAuthenticatedAtlasSdk();
  const repository = await sdk.getRepository(repositoryId);

  return (
    <AtlasShell
      organizationSlug={organizationSlug}
      title={`${repository.name} settings`}
      description="Repository settings are editable, but provider identity remains the stable correlation key for evidence and webhooks."
    >
      <PageIntro
        title="Rename display context without breaking history."
        body="Atlas lets the repository name and default branch change while keeping provider identity stable, so historical Pulse and evidence records remain traceable."
        facts={["Stable provider binding", "Editable branch context", "Audited changes"]}
      />

      <TrustStrip
        items={[
          {
            label: "Connection",
            value: repository.connectionStatus,
            tone: repository.connectionStatus === "connected" ? "success" : "warning"
          },
          {
            label: "Provider binding",
            value: `${repository.provider}:${repository.providerRepositoryId}`,
            tone: "info"
          },
          {
            label: "Default branch",
            value: repository.defaultBranch,
            tone: "neutral"
          }
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Repository identity</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateRepositoryAction} className="grid max-w-2xl gap-4">
            <input name="organizationSlug" type="hidden" value={organizationSlug} />
            <input name="repositoryId" type="hidden" value={repository.id} />
            <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              Name
              <input
                required
                className="rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                defaultValue={repository.name}
                name="name"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              Default branch
              <input
                required
                className="rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                defaultValue={repository.defaultBranch}
                name="defaultBranch"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              Connection status
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                defaultValue={repository.connectionStatus}
                name="connectionStatus"
              >
                <option value="connected">Connected</option>
                <option value="suspended">Suspended</option>
                <option value="revoked">Revoked</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Provider binding: {repository.provider}:{repository.providerRepositoryId}
            </div>
            <Button type="submit">Save settings</Button>
          </form>
        </CardContent>
      </Card>
    </AtlasShell>
  );
}
