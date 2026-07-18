import { Activity, GitBranch, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { JSX } from "react";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@atlas/ui";

import {
  AtlasShell,
  EvidenceEmptyState,
  PageIntro,
  TrustStrip
} from "../../../../components/atlas-shell";
import { createAuthenticatedAtlasSdk, requireAtlasSession } from "../../../../lib/atlas-api";

type PageProps = { readonly params: Promise<{ readonly organizationSlug: string }> };

export default async function RepositoriesPage({ params }: PageProps): Promise<JSX.Element> {
  const { organizationSlug } = await params;
  const session = await requireAtlasSession().catch(() => redirect("/sign-in"));
  if (session.principal.organizationSlug !== organizationSlug) {
    notFound();
  }

  const sdk = await createAuthenticatedAtlasSdk();
  const repositories = await sdk.listRepositories();

  return (
    <AtlasShell
      organizationSlug={organizationSlug}
      title="Repositories"
      description="Repositories are the anchor objects for Pulse, graph context, memory evidence, and webhook-driven ingestion."
      actions={
        <Button asChild>
          <Link href={`/org/${organizationSlug}/repositories/new`}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Connect
          </Link>
        </Button>
      }
    >
      <PageIntro
        title="Each repository is a trust boundary."
        body="Atlas keeps provider identity, branch context, connection status, and historical settings separate so later conclusions can say exactly which repository they came from."
        facts={["Provider ID is stable", "Settings are audited", "Pulse links back to evidence"]}
      />

      <TrustStrip
        items={[
          {
            label: "Connected",
            value: `${repositories.filter((repository) => repository.connectionStatus === "connected").length}/${repositories.length}`,
            tone: repositories.length === 0 ? "warning" : "success"
          },
          {
            label: "Default branches",
            value:
              repositories.length === 0
                ? "None yet"
                : `${new Set(repositories.map((repository) => repository.defaultBranch)).size} branch contexts`,
            tone: "info"
          },
          {
            label: "Next review",
            value: repositories.length === 0 ? "Connect first repository" : "Open Pulse",
            tone: repositories.length === 0 ? "warning" : "success"
          }
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {repositories.map((repository) => (
          <Card
            className="transition hover:-translate-y-0.5 hover:border-slate-400 dark:hover:border-slate-600"
            key={repository.id}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle>{repository.name}</CardTitle>
                <Badge tone={repository.connectionStatus === "connected" ? "success" : "warning"}>
                  {repository.connectionStatus}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {repository.provider}:{repository.providerRepositoryId}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Default branch: {repository.defaultBranch}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="secondary">
                  <Link href={`/org/${organizationSlug}/repositories/${repository.id}/pulse`}>
                    <Activity className="h-4 w-4" aria-hidden="true" />
                    Pulse
                  </Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href={`/org/${organizationSlug}/repositories/${repository.id}/settings`}>
                    <Settings className="h-4 w-4" aria-hidden="true" />
                    Settings
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {repositories.length === 0 ? (
        <Card>
          <CardContent>
            <EvidenceEmptyState
              icon={GitBranch}
              title="No repositories yet"
              body="Without a repository, Atlas has no durable anchor for deployment risk, ownership, architecture, or documentation drift."
              nextStep="Connect one GitHub repository, then open Pulse to see what Atlas can and cannot calculate."
              href={`/org/${organizationSlug}/repositories/new`}
              action="Connect repository"
            />
          </CardContent>
        </Card>
      ) : null}
    </AtlasShell>
  );
}
