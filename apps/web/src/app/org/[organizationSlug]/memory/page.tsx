import { BookOpen } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { JSX } from "react";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@atlas/ui";

import {
  AtlasShell,
  DemoEmptyState,
  PageIntro,
  TrustStrip
} from "../../../../components/atlas-shell";
import { requireAtlasSession, createAuthenticatedAtlasSdk } from "../../../../lib/atlas-api";
import { createMemoryRecordAction } from "../../../actions";

type MemoryPageProps = {
  readonly params: Promise<{
    readonly organizationSlug: string;
  }>;
};

export default async function EngineeringMemoryPage(props: MemoryPageProps): Promise<JSX.Element> {
  const { organizationSlug } = await props.params;
  const atlasSession = await requireAtlasSession().catch(() => redirect("/sign-in"));
  if (atlasSession.principal.organizationSlug !== organizationSlug) {
    notFound();
  }

  const sdk = await createAuthenticatedAtlasSdk();
  const records = await sdk.listMemoryRecords();

  const verifiedRecords = records.filter((record) =>
    ["verified", "active"].includes(record.lifecycle)
  );

  return (
    <AtlasShell
      organizationSlug={organizationSlug}
      title="Engineering Memory"
      description="Durable memory records preserve facts, decisions, recommendations, corrections, confidence, provenance, and history."
      actions={
        <Button asChild variant="secondary">
          <Link href={`/org/${organizationSlug}`}>Dashboard</Link>
        </Button>
      }
    >
      <PageIntro
        title="Memory is where Atlas becomes durable."
        body="Records are versioned, classified, and confidence-scored so a future reasoning run can reuse engineering knowledge without losing provenance."
        facts={["Versioned claims", "Confidence factors", "Correction workflow"]}
      />

      <TrustStrip
        items={[
          {
            label: "Records",
            value: `${records.length}`,
            tone: records.length > 0 ? "success" : "warning"
          },
          {
            label: "Verified or active",
            value: `${verifiedRecords.length}/${records.length}`,
            tone: verifiedRecords.length > 0 ? "success" : "neutral"
          },
          {
            label: "Average confidence",
            value:
              records.length === 0
                ? "No records"
                : `${Math.round(
                    records.reduce((total, record) => total + record.confidence.score, 0) /
                      records.length
                  )}%`,
            tone: records.length > 0 ? "info" : "warning"
          }
        ]}
      />

      <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Memory records</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {records.length === 0 ? (
              <DemoEmptyState
                icon={BookOpen}
                title="No memory records yet"
                body="Atlas cannot build organizational memory until someone records a fact, decision, or recommendation with confidence."
                nextStep="Create one evidence-backed record. It will immediately appear in Memory, Evidence, Timeline, and future reasoning context."
              />
            ) : (
              records.map((record) => (
                <Link
                  key={record.id}
                  href={`/org/${organizationSlug}/memory/${record.id}`}
                  className="rounded-lg border border-slate-200 p-4 transition hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="info">{record.classification}</Badge>
                    <Badge tone={record.lifecycle === "active" ? "success" : "neutral"}>
                      {record.lifecycle}
                    </Badge>
                    <Badge>v{record.version}</Badge>
                    <Badge tone="info">
                      {record.confidence.score}% {record.confidence.band}
                    </Badge>
                  </div>
                  <p className="mt-3 font-medium text-slate-950 dark:text-slate-100">
                    {record.claim}
                  </p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Owner: {record.owner ?? "unassigned"} - Updated{" "}
                    {new Date(record.updatedAt).toLocaleString()}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create memory record</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createMemoryRecordAction} className="flex flex-col gap-3">
              <input name="organizationSlug" type="hidden" value={organizationSlug} />
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Classification
                <select
                  name="classification"
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="fact">Fact</option>
                  <option value="decision">Decision</option>
                  <option value="recommendation">Recommendation</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Claim
                <textarea
                  required
                  name="claim"
                  className="min-h-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  minLength={3}
                  maxLength={2000}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Owner
                <input
                  name="owner"
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Reasoning
                <textarea
                  name="reasoning"
                  className="min-h-20 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  maxLength={4000}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Confidence score
                <input
                  required
                  name="confidenceScore"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={75}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
              <Button type="submit">Create record</Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </AtlasShell>
  );
}
