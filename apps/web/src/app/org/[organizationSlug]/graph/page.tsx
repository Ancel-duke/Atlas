import { Network, Search } from "lucide-react";
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
              <Button type="submit">Apply filter</Button>
            </form>
            <div className="mt-5 flex flex-wrap gap-2">
              {entityTypes.map((type) => (
                <Badge key={type}>{type}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <GraphCanvas
            entityCount={entities.length}
            entityTypes={entityTypes}
            projectionCount={projections.length}
          />

          <Card>
            <CardHeader>
              <CardTitle>Entities</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-2">
              {entities.length === 0 ? (
                <EvidenceEmptyState
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
                    <EvidenceDisclosure className="mt-3" title="Provenance">
                      <dl className="mt-2 grid gap-1 text-slate-600 dark:text-slate-400">
                        <div>Source: {entity.provenance.sourceType}</div>
                        <div>Locator: {entity.provenance.sourceLocator}</div>
                        <div>
                          Observed: {new Date(entity.provenance.observedAt).toLocaleString()}
                        </div>
                      </dl>
                    </EvidenceDisclosure>
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

function GraphCanvas({
  entityCount,
  entityTypes,
  projectionCount
}: {
  readonly entityCount: number;
  readonly entityTypes: readonly string[];
  readonly projectionCount: number;
}): JSX.Element {
  const visibleTypes = entityTypes.slice(0, 6);

  return (
    <Card className="overflow-hidden">
      <CardContent className="relative min-h-[320px] p-0">
        <div className="absolute inset-0 atlas-grid opacity-60" />
        <svg className="absolute inset-0 h-full w-full" aria-hidden="true" viewBox="0 0 900 320">
          <path
            d="M170 168 C290 70 420 76 515 158 S715 257 810 132"
            fill="none"
            stroke="rgb(34 197 94 / 0.24)"
            strokeWidth="2"
          />
          <path
            d="M150 224 C290 250 405 196 520 220 S725 205 780 252"
            fill="none"
            stroke="rgb(167 139 250 / 0.22)"
            strokeWidth="2"
          />
        </svg>
        <div className="relative grid min-h-[320px] content-between p-6">
          <div>
            <p className="text-xs font-semibold uppercase text-green-200">Knowledge graph</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Engineering topology</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Atlas renders only persisted graph entities here. Empty space means missing evidence,
              not an invented architecture map.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <GraphNode label="Entities" value={entityCount.toString()} tone="cyan" />
            <GraphNode
              label="Types"
              value={visibleTypes.length === 0 ? "None" : visibleTypes.join(", ")}
              tone="violet"
            />
            <GraphNode label="Projections" value={projectionCount.toString()} tone="emerald" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GraphNode({
  label,
  value,
  tone
}: {
  readonly label: string;
  readonly value: string;
  readonly tone: "cyan" | "violet" | "emerald";
}): JSX.Element {
  const color =
    tone === "cyan"
      ? "border-green-300/30 bg-green-300/10 text-green-100"
      : tone === "violet"
        ? "border-violet-300/30 bg-violet-300/10 text-violet-100"
        : "border-emerald-300/30 bg-emerald-300/10 text-emerald-100";

  return (
    <div className={`rounded-lg border px-4 py-3 backdrop-blur ${color}`}>
      <p className="text-xs font-semibold uppercase opacity-75">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}
