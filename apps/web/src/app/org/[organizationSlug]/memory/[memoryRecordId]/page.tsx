import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { JSX, ReactNode } from "react";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@atlas/ui";

import { createAuthenticatedAtlasSdk, requireAtlasSession } from "../../../../../lib/atlas-api";
import {
  addMemoryEvidenceAction,
  createMemoryCorrectionAction,
  reviewMemoryCorrectionAction,
  transitionMemoryLifecycleAction
} from "../../../../actions";

type MemoryRecordPageProps = {
  readonly params: Promise<{
    readonly organizationSlug: string;
    readonly memoryRecordId: string;
  }>;
};

const lifecycleOptions = [
  "verified",
  "active",
  "challenged",
  "superseded",
  "deprecated",
  "archived"
] as const;

export default async function MemoryRecordPage(props: MemoryRecordPageProps): Promise<JSX.Element> {
  const { organizationSlug, memoryRecordId } = await props.params;
  const atlasSession = await requireAtlasSession().catch(() => redirect("/sign-in"));
  if (atlasSession.principal.organizationSlug !== organizationSlug) {
    notFound();
  }

  const sdk = await createAuthenticatedAtlasSdk();
  const [record, evidence, corrections, timeline, versions] = await Promise.all([
    sdk.getMemoryRecord(memoryRecordId),
    sdk.listMemoryEvidence(memoryRecordId),
    sdk.listMemoryCorrections(memoryRecordId),
    sdk.listMemoryTimeline(memoryRecordId),
    sdk.listMemoryRecordVersions(memoryRecordId)
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex items-start justify-between border-b border-slate-200 pb-5">
        <div>
          <p className="text-sm font-medium text-slate-500">{organizationSlug}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
            Memory Record
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Current projection v{record.version}; historical versions and timeline are preserved.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href={`/org/${organizationSlug}/memory`}>Back to memory</Link>
        </Button>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{record.claim}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge>{record.classification}</Badge>
                <Badge>{record.lifecycle}</Badge>
                <Badge>{record.confidence.score}% confidence</Badge>
                <Badge>{record.confidence.band}</Badge>
              </div>
              <p className="text-sm text-slate-700">
                <span className="font-medium">Owner:</span> {record.owner ?? "unassigned"}
              </p>
              {record.reasoning !== null ? (
                <p className="text-sm text-slate-700">
                  <span className="font-medium">Reasoning:</span> {record.reasoning}
                </p>
              ) : null}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <p>Source: {record.provenance.sourceType}</p>
                <p>Locator: {record.provenance.sourceLocator}</p>
                <p>Method: {record.provenance.extractionMethod}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evidence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {evidence.length === 0 ? (
                <p className="text-sm text-slate-600">No evidence has been attached.</p>
              ) : (
                evidence.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge>{item.direction}</Badge>
                      <Badge>v{item.version}</Badge>
                      <Badge>{item.sourceType}</Badge>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-950">{item.sourceLocator}</p>
                    <p className="text-xs text-slate-500">
                      Observed {new Date(item.observedAt).toLocaleString()} ·{" "}
                      {item.extractionMethod}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Corrections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {corrections.length === 0 ? (
                <p className="text-sm text-slate-600">No corrections have been requested.</p>
              ) : (
                corrections.map((correction) => (
                  <div key={correction.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge>{correction.status}</Badge>
                      <Badge>v{correction.version}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{correction.rationale}</p>
                    {correction.proposedClaim !== null ? (
                      <p className="mt-2 text-sm text-slate-950">
                        Proposed claim: {correction.proposedClaim}
                      </p>
                    ) : null}
                    {correction.proposedLifecycle !== null ? (
                      <p className="mt-1 text-sm text-slate-950">
                        Proposed lifecycle: {correction.proposedLifecycle}
                      </p>
                    ) : null}
                    {correction.status === "pending" ? (
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        <CorrectionReviewForm
                          organizationSlug={organizationSlug}
                          memoryRecordId={memoryRecordId}
                          correctionId={correction.id}
                          decision="apply"
                        />
                        <CorrectionReviewForm
                          organizationSlug={organizationSlug}
                          memoryRecordId={memoryRecordId}
                          correctionId={correction.id}
                          decision="reject"
                        />
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Add evidence</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={addMemoryEvidenceAction} className="flex flex-col gap-3">
                <input name="organizationSlug" type="hidden" value={organizationSlug} />
                <input name="memoryRecordId" type="hidden" value={memoryRecordId} />
                <Input label="Source type" name="sourceType" defaultValue="document" />
                <Input label="Source locator" name="sourceLocator" />
                <Input label="Source revision" name="sourceRevision" required={false} />
                <Input
                  label="Extraction method"
                  name="extractionMethod"
                  defaultValue="human-entered"
                />
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Direction
                  <select name="direction" className="rounded-md border border-slate-300 px-3 py-2">
                    <option value="supports">Supports</option>
                    <option value="challenges">Challenges</option>
                  </select>
                </label>
                <Button type="submit">Add evidence</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transition lifecycle</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={transitionMemoryLifecycleAction} className="flex flex-col gap-3">
                <input name="organizationSlug" type="hidden" value={organizationSlug} />
                <input name="memoryRecordId" type="hidden" value={memoryRecordId} />
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  New lifecycle
                  <select name="lifecycle" className="rounded-md border border-slate-300 px-3 py-2">
                    {lifecycleOptions.map((lifecycle) => (
                      <option key={lifecycle} value={lifecycle}>
                        {lifecycle}
                      </option>
                    ))}
                  </select>
                </label>
                <Input label="Rationale" name="rationale" />
                <Button type="submit">Transition</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Request correction</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createMemoryCorrectionAction} className="flex flex-col gap-3">
                <input name="organizationSlug" type="hidden" value={organizationSlug} />
                <input name="memoryRecordId" type="hidden" value={memoryRecordId} />
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Rationale
                  <textarea
                    required
                    name="rationale"
                    className="min-h-20 rounded-md border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Proposed claim
                  <textarea
                    name="proposedClaim"
                    className="min-h-20 rounded-md border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Proposed lifecycle
                  <select
                    name="proposedLifecycle"
                    className="rounded-md border border-slate-300 px-3 py-2"
                  >
                    <option value="">No lifecycle change</option>
                    {lifecycleOptions.map((lifecycle) => (
                      <option key={lifecycle} value={lifecycle}>
                        {lifecycle}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  label="Proposed confidence score"
                  name="proposedConfidenceScore"
                  required={false}
                  type="number"
                />
                <Button type="submit">Request correction</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {timeline.map((event) => (
                <div key={event.id} className="rounded-md border border-slate-200 p-2">
                  <p className="text-sm font-medium text-slate-900">{event.eventType}</p>
                  <p className="text-xs text-slate-500">
                    v{event.eventVersion} · {new Date(event.occurredAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historical versions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {versions.map((version) => (
                <div key={version.id} className="rounded-md border border-slate-200 p-2">
                  <p className="text-sm font-medium text-slate-900">Version {version.version}</p>
                  <p className="text-xs text-slate-500">
                    {version.changeReason} · {new Date(version.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

function Badge({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

function Input({
  label,
  name,
  defaultValue,
  required = true,
  type = "text"
}: Readonly<{
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
}>): JSX.Element {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        required={required}
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="rounded-md border border-slate-300 px-3 py-2"
      />
    </label>
  );
}

function CorrectionReviewForm({
  organizationSlug,
  memoryRecordId,
  correctionId,
  decision
}: Readonly<{
  organizationSlug: string;
  memoryRecordId: string;
  correctionId: string;
  decision: "apply" | "reject";
}>): JSX.Element {
  return (
    <form action={reviewMemoryCorrectionAction} className="flex flex-col gap-2">
      <input name="organizationSlug" type="hidden" value={organizationSlug} />
      <input name="memoryRecordId" type="hidden" value={memoryRecordId} />
      <input name="correctionId" type="hidden" value={correctionId} />
      <input name="decision" type="hidden" value={decision} />
      <input
        required
        name="rationale"
        placeholder={`${decision} rationale`}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <Button type="submit" variant={decision === "apply" ? "primary" : "secondary"}>
        {decision === "apply" ? "Apply" : "Reject"}
      </Button>
    </form>
  );
}
