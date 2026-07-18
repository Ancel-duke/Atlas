import { Activity, AlertTriangle, BookOpen, GitBranch, Inbox, Network, Plus } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { JSX } from "react";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@atlas/ui";

import { AnimatedNumber } from "../../../components/animated-number";
import {
  AtlasShell,
  DemoEmptyState,
  PageIntro,
  StatusPill,
  TrustStrip
} from "../../../components/atlas-shell";
import { createAuthenticatedAtlasSdk, requireAtlasSession } from "../../../lib/atlas-api";

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

  const sdk = await createAuthenticatedAtlasSdk();
  const [repositories, insights, memoryRecords, graphEntities] = await Promise.all([
    sdk.listRepositories(),
    sdk.listInsights(),
    sdk.listMemoryRecords(),
    sdk.listGraphEntities()
  ]);
  const openInsights = insights.filter((insight) => insight.status === "open");
  const criticalInsights = openInsights.filter((insight) => insight.impact === "critical");
  const activeRepositories = repositories.filter((repo) => repo.connectionStatus === "connected");

  return (
    <AtlasShell
      organizationSlug={organizationSlug}
      title="Engineering command center"
      eyebrow={atlasSession.principal.email}
      description="Atlas turns repository evidence into explainable engineering decisions: graph context, durable memory, pulse scores, and reasoning runs all point back to source material."
      actions={
        <Button asChild>
          <Link href={`/org/${organizationSlug}/repositories/new`}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Connect repository
          </Link>
        </Button>
      }
    >
      <PageIntro
        title="Start with what Atlas can prove."
        body="Every number here is a doorway into evidence. If Atlas does not have enough source material, it withholds conclusions instead of manufacturing certainty."
        facts={[
          "Evidence before answers",
          "Confidence is visible",
          "Impact is separated from belief"
        ]}
      />

      <TrustStrip
        items={[
          {
            label: "Evidence model",
            value: `${memoryRecords.length} memory records, ${graphEntities.length} graph entities`,
            tone: memoryRecords.length + graphEntities.length > 0 ? "success" : "warning"
          },
          {
            label: "Reasoning posture",
            value:
              openInsights.length === 0
                ? "No unsupported claims"
                : `${openInsights.length} open insights`,
            tone: openInsights.length === 0 ? "success" : "info"
          },
          {
            label: "Deployment attention",
            value:
              criticalInsights.length === 0
                ? "No critical insight open"
                : `${criticalInsights.length} critical open`,
            tone: criticalInsights.length === 0 ? "success" : "danger"
          }
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={GitBranch}
          label="Repositories"
          value={repositories.length}
          detail={`${activeRepositories.length} connected`}
        />
        <Metric
          icon={Inbox}
          label="Open insights"
          value={openInsights.length}
          detail={`${criticalInsights.length} critical`}
          tone={criticalInsights.length > 0 ? "danger" : "success"}
        />
        <Metric
          icon={BookOpen}
          label="Memory records"
          value={memoryRecords.length}
          detail="facts, decisions, recommendations"
        />
        <Metric
          icon={Network}
          label="Graph entities"
          value={graphEntities.length}
          detail="repository knowledge graph"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Repository portfolio</CardTitle>
              <Button asChild variant="secondary">
                <Link href={`/org/${organizationSlug}/repositories`}>View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {repositories.length === 0 ? (
              <DemoEmptyState
                icon={GitBranch}
                title="No repositories connected"
                body="Connect a repository to activate Pulse, graph retrieval, insights, evidence, and timelines."
                nextStep="Connect one repository. Atlas will create a repository record, queue ingestion, and expose exactly which evidence is still missing."
                href={`/org/${organizationSlug}/repositories/new`}
                action="Connect repository"
              />
            ) : (
              repositories.slice(0, 6).map((repository) => (
                <Link
                  className="group grid gap-3 rounded-md border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-900 md:grid-cols-[1fr_auto]"
                  href={`/org/${organizationSlug}/repositories/${repository.id}/pulse`}
                  key={repository.id}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-950 dark:text-slate-100">
                      {repository.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {repository.provider}:{repository.providerRepositoryId} on{" "}
                      {repository.defaultBranch}
                    </p>
                  </div>
                  <StatusPill
                    status={repository.connectionStatus}
                    tone={repository.connectionStatus === "connected" ? "success" : "warning"}
                  />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Insight pressure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {openInsights.length === 0 ? (
              <DemoEmptyState
                icon={Inbox}
                title="No open insights"
                body="Insights from Continuous Reasoning and Repository Pulse will appear here when supported by evidence."
                nextStep="Add graph or memory evidence, then run Engineering Chat to see whether Atlas can support a conclusion."
                href={`/org/${organizationSlug}/insights`}
                action="Open feed"
              />
            ) : (
              openInsights.slice(0, 5).map((insight) => (
                <Link
                  className="block rounded-md border border-slate-200 p-3 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                  href={`/org/${organizationSlug}/insights`}
                  key={insight.id}
                >
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={insight.impact === "critical" ? "danger" : "warning"}>
                      {insight.impact}
                    </Badge>
                    <Badge tone="info">{insight.confidence.score}% confidence</Badge>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-950 dark:text-slate-100">
                    {insight.claim}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <ActionCard
          icon={Activity}
          title="Review Repository Pulse"
          body="Open health, architecture, knowledge coverage, documentation drift, ownership, deployment risk, and testing confidence."
          href={`/org/${organizationSlug}/repositories`}
        />
        <ActionCard
          icon={Network}
          title="Explore Graph"
          body="Inspect repository-scoped entities, relationships, provenance, and confidence."
          href={`/org/${organizationSlug}/graph`}
        />
        <ActionCard
          icon={AlertTriangle}
          title="Triage Evidence"
          body="Audit source records, evidence items, and timeline events that support conclusions."
          href={`/org/${organizationSlug}/evidence`}
        />
      </section>
    </AtlasShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
  tone = "info"
}: {
  readonly icon: typeof Activity;
  readonly label: string;
  readonly value: number;
  readonly detail: string;
  readonly tone?: "success" | "danger" | "info";
}): JSX.Element {
  return (
    <Card className="atlas-hover">
      <CardContent className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10">
          <Icon className="h-5 w-5 text-cyan-200" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="text-3xl font-semibold text-white">
            <AnimatedNumber value={value} />
          </p>
          <Badge tone={tone} className="mt-1">
            {detail}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionCard({
  icon: Icon,
  title,
  body,
  href
}: {
  readonly icon: typeof Activity;
  readonly title: string;
  readonly body: string;
  readonly href: string;
}): JSX.Element {
  return (
    <Card className="atlas-hover">
      <CardContent>
        <Icon className="h-5 w-5 text-cyan-200" aria-hidden="true" />
        <h2 className="mt-3 font-semibold text-slate-950 dark:text-slate-100">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{body}</p>
        <Button asChild className="mt-4" variant="secondary">
          <Link href={href}>Open</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
