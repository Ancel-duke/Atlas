import { Filter, Inbox } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import type { JSX } from "react";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@atlas/ui";

import {
  AtlasShell,
  EvidenceEmptyState,
  EvidenceDisclosure,
  PageIntro,
  TrustStrip
} from "../../../../components/atlas-shell";
import { createAuthenticatedAtlasSdk, requireAtlasSession } from "../../../../lib/atlas-api";

type PageProps = {
  readonly params: Promise<{ readonly organizationSlug: string }>;
  readonly searchParams: Promise<{ readonly repositoryId?: string }>;
};

export default async function InsightFeedPage({
  params,
  searchParams
}: PageProps): Promise<JSX.Element> {
  const { organizationSlug } = await params;
  const { repositoryId } = await searchParams;
  const session = await requireAtlasSession().catch(() => redirect("/sign-in"));
  if (session.principal.organizationSlug !== organizationSlug) {
    notFound();
  }

  const sdk = await createAuthenticatedAtlasSdk();
  const [repositories, insights] = await Promise.all([
    sdk.listRepositories(),
    sdk.listInsights(repositoryId)
  ]);

  return (
    <AtlasShell
      organizationSlug={organizationSlug}
      title="Insight Feed"
      description="Insights are the places where Atlas believes engineering attention is warranted. Each one must expose impact, confidence, and evidence."
    >
      <PageIntro
        title="Insight does not mean guess."
        body="Atlas separates severity from certainty. Critical impact with low confidence should prompt evidence collection; high confidence should prompt action."
        facts={["Impact is explicit", "Confidence is scored", "Evidence is inspectable"]}
      />

      <TrustStrip
        items={[
          {
            label: "Open insights",
            value: `${insights.filter((insight) => insight.status === "open").length}`,
            tone: insights.length > 0 ? "info" : "neutral"
          },
          {
            label: "Critical impact",
            value: `${insights.filter((insight) => insight.impact === "critical").length}`,
            tone: insights.some((insight) => insight.impact === "critical") ? "danger" : "success"
          },
          {
            label: "Evidence posture",
            value:
              insights.length === 0
                ? "No claims persisted"
                : `${insights.reduce((total, insight) => total + insight.evidenceSet.length, 0)} evidence links`,
            tone: insights.length === 0 ? "success" : "info"
          }
        ]}
      />

      <section className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" aria-hidden="true" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3">
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                defaultValue={repositoryId ?? ""}
                name="repositoryId"
              >
                <option value="">All repositories</option>
                {repositories.map((repository) => (
                  <option key={repository.id} value={repository.id}>
                    {repository.name}
                  </option>
                ))}
              </select>
              <Button type="submit">Apply</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.length === 0 ? (
              <EvidenceEmptyState
                icon={Inbox}
                title="No insights match this filter"
                body="This is acceptable when Atlas lacks enough evidence. Empty is better than invented engineering advice."
                nextStep="Run Engineering Chat or calculate Repository Pulse after adding graph and memory evidence."
              />
            ) : (
              insights.map((insight) => (
                <article
                  className="rounded-md border border-slate-200 p-4 dark:border-slate-800"
                  key={insight.id}
                >
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={insight.impact === "critical" ? "danger" : "warning"}>
                      {insight.impact}
                    </Badge>
                    <Badge tone="info">{insight.capability}</Badge>
                    <Badge>{insight.status}</Badge>
                    <Badge>
                      {insight.confidence.score}% {insight.confidence.band}
                    </Badge>
                  </div>
                  <h2 className="mt-3 font-semibold text-slate-950 dark:text-slate-100">
                    {insight.claim}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {insight.recommendedAction}
                  </p>
                  <EvidenceDisclosure className="mt-3" title="Explainability">
                    <div className="mt-3 grid gap-3 text-sm text-slate-600 dark:text-slate-400">
                      <p>Confidence method: {insight.confidence.method}</p>
                      <p>
                        Missing evidence: {insight.confidence.missingEvidence.join(", ") || "none"}
                      </p>
                      <p>
                        Counterevidence: {insight.confidence.counterevidence.join(", ") || "none"}
                      </p>
                      <p>Evidence entries: {insight.evidenceSet.length}</p>
                    </div>
                  </EvidenceDisclosure>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </AtlasShell>
  );
}
