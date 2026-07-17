import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { JSX } from "react";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@atlas/ui";

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

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex items-start justify-between border-b border-slate-200 pb-5">
        <div>
          <p className="text-sm font-medium text-slate-500">{organizationSlug}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
            Engineering Memory
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Durable memory records preserve facts, decisions, recommendations, evidence,
            corrections, confidence, provenance, and history.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href={`/org/${organizationSlug}`}>Organization</Link>
        </Button>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Memory records</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {records.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-600">
                No memory records exist for this organization yet.
              </p>
            ) : (
              records.map((record) => (
                <Link
                  key={record.id}
                  href={`/org/${organizationSlug}/memory/${record.id}`}
                  className="rounded-lg border border-slate-200 p-4 transition hover:border-slate-400"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {record.classification}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {record.lifecycle}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      v{record.version}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      {record.confidence.score}% {record.confidence.band}
                    </span>
                  </div>
                  <p className="mt-3 font-medium text-slate-950">{record.claim}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Owner: {record.owner ?? "unassigned"} · Updated{" "}
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
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Classification
                <select
                  name="classification"
                  className="rounded-md border border-slate-300 px-3 py-2"
                >
                  <option value="fact">Fact</option>
                  <option value="decision">Decision</option>
                  <option value="recommendation">Recommendation</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Claim
                <textarea
                  required
                  name="claim"
                  className="min-h-24 rounded-md border border-slate-300 px-3 py-2"
                  minLength={3}
                  maxLength={2000}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Owner
                <input name="owner" className="rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Reasoning
                <textarea
                  name="reasoning"
                  className="min-h-20 rounded-md border border-slate-300 px-3 py-2"
                  maxLength={4000}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Confidence score
                <input
                  required
                  name="confidenceScore"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={75}
                  className="rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <Button type="submit">Create record</Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
