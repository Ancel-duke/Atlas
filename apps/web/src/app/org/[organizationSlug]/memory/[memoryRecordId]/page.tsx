import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { JSX, ReactNode } from "react";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@atlas/ui";

import { AtlasShell, PageIntro, TrustStrip } from "../../../../../components/atlas-shell";
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
    <AtlasShell
      organizationSlug={organizationSlug}
      title="Memory Record"
      description={`Current projection v${record.version}; historical versions, corrections, evidence, and timeline events are preserved.`}
      actions={
        <Button asChild variant="secondary">
          <Link href={`/org/${organizationSlug}/memory`}>Back to memory</Link>
        </Button>
      }
    >
      <PageIntro
        title="This is a claim with a paper trail."
        body="Atlas shows the current memory projection beside the evidence, corrections, lifecycle controls, timeline, and historical versions that determine whether the claim should be trusted."
        facts={["Current projection", "Evidence ledger", "Correction path"]}
      />

      <TrustStrip
        items={[
          {
            label: "Confidence",
            value: `${record.confidence.score}/100 ${record.confidence.band}`,
            tone: record.confidence.band === "low" ? "warning" : "success"
          },
          {
            label: "Evidence",
            value: `${evidence.length} items`,
            tone: evidence.length > 0 ? "success" : "warning"
          },
          {
            label: "History",
            value: `${versions.length} versions, ${timeline.length} events`,
            tone: versions.length + timeline.length > 0 ? "info" : "warning"
          }
        ]}
      />

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
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <span className="font-medium">Owner:</span> {record.owner ?? "unassigned"}
              </p>
              {record.reasoning !== null ? (
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-medium">Reasoning:</span> {record.reasoning}
                </p>
              ) : null}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
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
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No evidence has been attached.
                </p>
              ) : (
                evidence.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                  >
                    <div className="flex flex-wrap gap-2">
                      <Badge>{item.direction}</Badge>
                      <Badge>v{item.version}</Badge>
                      <Badge>{item.sourceType}</Badge>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-950 dark:text-slate-100">
                      {item.sourceLocator}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Observed {new Date(item.observedAt).toLocaleString()} -{" "}
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
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No corrections have been requested.
                </p>
              ) : (
                corrections.map((correction) => (
                  <div
                    key={correction.id}
                    className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                  >
                    <div className="flex flex-wrap gap-2">
                      <Badge>{correction.status}</Badge>
                      <Badge>v{correction.version}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                      {correction.rationale}
                    </p>
                    {correction.proposedClaim !== null ? (
                      <p className="mt-2 text-sm text-slate-950 dark:text-slate-100">
                        Proposed claim: {correction.proposedClaim}
                      </p>
                    ) : null}
                    {correction.proposedLifecycle !== null ? (
                      <p className="mt-1 text-sm text-slate-950 dark:text-slate-100">
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
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Direction
                  <select
                    name="direction"
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
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
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                  New lifecycle
                  <select
                    name="lifecycle"
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
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
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Rationale
                  <textarea
                    required
                    name="rationale"
                    className="min-h-20 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Proposed claim
                  <textarea
                    name="proposedClaim"
                    className="min-h-20 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Proposed lifecycle
                  <select
                    name="proposedLifecycle"
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
                <div
                  key={event.id}
                  className="rounded-md border border-slate-200 p-2 dark:border-slate-800"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {event.eventType}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    v{event.eventVersion} - {new Date(event.occurredAt).toLocaleString()}
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
                <div
                  key={version.id}
                  className="rounded-md border border-slate-200 p-2 dark:border-slate-800"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Version {version.version}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {version.changeReason} - {new Date(version.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </AtlasShell>
  );
}

function Badge({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-900 dark:text-slate-300">
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
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
      {label}
      <input
        required={required}
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
      <Button type="submit" variant={decision === "apply" ? "primary" : "secondary"}>
        {decision === "apply" ? "Apply" : "Reject"}
      </Button>
    </form>
  );
}
