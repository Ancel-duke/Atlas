import { Network, Search } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import type { JSX } from "react";

import { Badge, Card, CardContent, CardHeader, CardTitle } from "@atlas/ui";

import {
  AtlasShell,
  DemoEmptyState,
  PageIntro,
  TrustStrip
} from "../../../../components/atlas-shell";
import { createAuthenticatedAtlasSdk, requireAtlasSession } from "../../../../lib/atlas-api";

type PageProps = {
  readonly params: Promise<{ readonly organizationSlug: string }>;
  readonly searchParams: Promise<{ readonly entityType?: string }>;
};

export default async function GraphExplorerPage({
  params,
  searchParams
}: PageProps): Promise<JSX.Element> {
  const { organizationSlug } = await params;
  const { entityType } = await searchParams;
  const session = await requireAtlasSession().catch(() => redirect("/sign-in"));
  if (session.principal.organizationSlug !== organizationSlug) {
    notFound();
  }

  const sdk = await createAuthenticatedAtlasSdk();
  const [entities, projections] = await Promise.all([
    sdk.listGraphEntities(entityType),
    sdk.listGraphProjections()
  ]);
  const entityTypes = [...new Set(entities.map((entity) => entity.entityType))].sort();

  return (
    <AtlasShell
      organizationSlug={organizationSlug}
      title="Graph Explorer"
      description="Graph Explorer shows the engineering objects Atlas can reason over: repositories, services, packages, owners, risks, and the evidence that produced them."
    >
      <PageIntro
        title="The graph is Atlas' engineering map."
        body="Entities are not decorative nodes. Each one carries lifecycle, provenance, and confidence so reasoning can retrieve context without inventing structure."
        facts={["Entities have provenance", "Confidence is per node", "Traversals are bounded"]}
      />

      <TrustStrip
        items={[
          {
            label: "Graph coverage",
            value: `${entities.length} entities`,
            tone: entities.length > 0 ? "success" : "warning"
          },
          {
            label: "Entity types",
            value: entityTypes.length === 0 ? "No types yet" : entityTypes.join(", "),
            tone: entityTypes.length > 0 ? "info" : "warning"
          },
          {
            label: "Saved projections",
            value: `${projections.length} reusable views`,
            tone: projections.length > 0 ? "success" : "neutral"
          }
        ]}
      />

      <section className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3">
              <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Entity type
                <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                  <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <input
                    className="min-w-0 flex-1 bg-transparent outline-none"
                    defaultValue={entityType}
                    name="entityType"
                    placeholder="service, package, owner"
                  />
                </div>
              </label>
              <button
                className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white dark:bg-emerald-400 dark:text-slate-950"
                type="submit"
              >
                Apply filter
              </button>
            </form>
            <div className="mt-5 flex flex-wrap gap-2">
              {entityTypes.map((type) => (
                <Badge key={type}>{type}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Entities</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-2">
              {entities.length === 0 ? (
                <DemoEmptyState
                  icon={Network}
                  title="No graph entities yet"
                  body="Atlas cannot claim architectural understanding until repository facts have been extracted into graph entities."
                  nextStep="Connect a repository or create evidence-backed graph entities through the API, then return here to inspect provenance."
                />
              ) : (
                entities.map((entity) => (
                  <article
                    className="rounded-md border border-slate-200 p-4 dark:border-slate-800"
                    key={entity.id}
                  >
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="info">{entity.entityType}</Badge>
                      <Badge tone={entity.lifecycle === "active" ? "success" : "warning"}>
                        {entity.lifecycle}
                      </Badge>
                      <Badge>
                        {entity.confidenceScore}% {entity.confidenceBand}
                      </Badge>
                    </div>
                    <h2 className="mt-3 font-semibold text-slate-950 dark:text-slate-100">
                      {entity.displayName ?? entity.canonicalKey}
                    </h2>
                    <p className="mt-1 break-all text-sm text-slate-500 dark:text-slate-400">
                      {entity.canonicalKey}
                    </p>
                    <details className="mt-3 rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-900">
                      <summary className="cursor-pointer font-medium">Provenance</summary>
                      <dl className="mt-2 grid gap-1 text-slate-600 dark:text-slate-400">
                        <div>Source: {entity.provenance.sourceType}</div>
                        <div>Locator: {entity.provenance.sourceLocator}</div>
                        <div>
                          Observed: {new Date(entity.provenance.observedAt).toLocaleString()}
                        </div>
                      </dl>
                    </details>
                  </article>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved projections</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {projections.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No saved projections yet. Projections created through the graph API will appear
                  here with full provenance.
                </p>
              ) : (
                projections.map((projection) => (
                  <article
                    className="rounded-md border border-slate-200 p-4 dark:border-slate-800"
                    key={projection.id}
                  >
                    <div className="flex gap-2">
                      <Network className="h-4 w-4 text-slate-500" aria-hidden="true" />
                      <Badge>{projection.kind}</Badge>
                    </div>
                    <p className="mt-3 font-medium text-slate-950 dark:text-slate-100">
                      {projection.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {projection.projection.nodes.length} nodes,{" "}
                      {projection.projection.edges.length} edges
                    </p>
                  </article>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </AtlasShell>
  );
}
