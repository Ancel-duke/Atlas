import { Database } from "lucide-react";
import Link from "next/link";
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

type PageProps = { readonly params: Promise<{ readonly organizationSlug: string }> };

export default async function EvidenceViewerPage({ params }: PageProps): Promise<JSX.Element> {
  const { organizationSlug } = await params;
  const session = await requireAtlasSession().catch(() => redirect("/sign-in"));
  if (session.principal.organizationSlug !== organizationSlug) {
    notFound();
  }

  const sdk = await createAuthenticatedAtlasSdk();
  const records = await sdk.listMemoryRecords();
  const evidenceGroups = await Promise.all(
    records.map(async (record) => ({
      record,
      evidence: await sdk.listMemoryEvidence(record.id)
    }))
  );
  const evidenceItems = evidenceGroups.flatMap((group) =>
    group.evidence.map((evidence) => ({ evidence, record: group.record }))
  );

  return (
    <AtlasShell
      organizationSlug={organizationSlug}
      title="Evidence Viewer"
      description="Evidence Viewer is the audit surface for claims, confidence, and source material."
    >
      <PageIntro
        title="Trust starts here."
        body="Evidence items explain what Atlas observed, where it came from, how it was extracted, and which memory record it supports or challenges."
        facts={["Source locator", "Extraction method", "Observed timestamp"]}
      />

      <TrustStrip
        items={[
          {
            label: "Evidence items",
            value: `${evidenceItems.length}`,
            tone: evidenceItems.length > 0 ? "success" : "warning"
          },
          {
            label: "Memory records checked",
            value: `${records.length}`,
            tone: records.length > 0 ? "info" : "warning"
          },
          {
            label: "Challenges",
            value: `${evidenceItems.filter(({ evidence }) => evidence.direction === "challenges").length}`,
            tone: evidenceItems.some(({ evidence }) => evidence.direction === "challenges")
              ? "warning"
              : "success"
          }
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Evidence inventory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {evidenceItems.length === 0 ? (
            <DemoEmptyState
              icon={Database}
              title="No evidence yet"
              body="Atlas should not ask for trust before it has source-backed evidence items."
              nextStep="Create a memory record, then attach supporting or challenging evidence so conclusions become auditable."
            />
          ) : (
            evidenceItems.map(({ evidence, record }) => (
              <article
                className="rounded-md border border-slate-200 p-4 dark:border-slate-800"
                key={evidence.id}
              >
                <div className="flex flex-wrap gap-2">
                  <Badge tone={evidence.direction === "supports" ? "success" : "warning"}>
                    {evidence.direction}
                  </Badge>
                  <Badge>{evidence.sourceType}</Badge>
                  <Badge>v{evidence.version}</Badge>
                </div>
                <h2 className="mt-3 font-semibold text-slate-950 dark:text-slate-100">
                  {evidence.sourceLocator}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{record.claim}</p>
                <div className="mt-3 grid gap-2 text-sm text-slate-500 dark:text-slate-400 md:grid-cols-3">
                  <p>Observed {new Date(evidence.observedAt).toLocaleString()}</p>
                  <p>Method {evidence.extractionMethod}</p>
                  <Link
                    className="font-medium text-slate-900 dark:text-slate-100"
                    href={`/org/${organizationSlug}/memory/${record.id}`}
                  >
                    Open memory record
                  </Link>
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </AtlasShell>
  );
}
