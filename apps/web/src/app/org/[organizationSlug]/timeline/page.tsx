import { Clock3, History } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { JSX } from "react";

import { Badge, Card, CardContent, CardHeader, CardTitle } from "@atlas/ui";

import {
  AtlasShell,
  EvidenceEmptyState,
  PageIntro,
  TrustStrip
} from "../../../../components/atlas-shell";
import { createAuthenticatedAtlasSdk, requireAtlasSession } from "../../../../lib/atlas-api";

type PageProps = { readonly params: Promise<{ readonly organizationSlug: string }> };

export default async function TimelineViewerPage({ params }: PageProps): Promise<JSX.Element> {
  const { organizationSlug } = await params;
  const session = await requireAtlasSession().catch(() => redirect("/sign-in"));
  if (session.principal.organizationSlug !== organizationSlug) {
    notFound();
  }

  const sdk = await createAuthenticatedAtlasSdk();
  const records = await sdk.listMemoryRecords();
  const groups = await Promise.all(
    records.map(async (record) => ({
      record,
      events: await sdk.listMemoryTimeline(record.id)
    }))
  );
  const events = groups
    .flatMap((group) => group.events.map((event) => ({ event, record: group.record })))
    .sort((left, right) => Date.parse(right.event.occurredAt) - Date.parse(left.event.occurredAt));

  return (
    <AtlasShell
      organizationSlug={organizationSlug}
      title="Timeline Viewer"
      description="Timeline Viewer shows how engineering memory changes over time: creation, correction, lifecycle transitions, and confidence updates."
    >
      <PageIntro
        title="Atlas preserves engineering history."
        body="The timeline makes change visible so reviewers can see when a claim was created, updated, challenged, or corrected."
        facts={["Append-only events", "Versioned records", "Correction trail"]}
      />

      <TrustStrip
        items={[
          {
            label: "Timeline events",
            value: `${events.length}`,
            tone: events.length > 0 ? "success" : "warning"
          },
          {
            label: "Records represented",
            value: `${new Set(events.map(({ record }) => record.id)).size}`,
            tone: events.length > 0 ? "info" : "warning"
          },
          {
            label: "Most recent",
            value:
              events[0] === undefined
                ? "No events yet"
                : new Date(events[0].event.occurredAt).toLocaleDateString(),
            tone: events[0] === undefined ? "warning" : "success"
          }
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4" aria-hidden="true" />
            Organization memory timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <EvidenceEmptyState
              icon={Clock3}
              title="No timeline events"
              body="No timeline means Atlas has not yet observed durable engineering knowledge changing."
              nextStep="Create a memory record, add evidence, or transition lifecycle state to build an audit trail."
            />
          ) : (
            <ol className="relative border-l border-slate-200 pl-5 dark:border-slate-800">
              {events.map(({ event, record }) => (
                <li className="mb-5" key={event.id}>
                  <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-emerald-500" />
                  <div className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="info">{event.eventType}</Badge>
                      <Badge>v{event.eventVersion}</Badge>
                    </div>
                    <p className="mt-3 font-medium text-slate-950 dark:text-slate-100">
                      {record.claim}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {new Date(event.occurredAt).toLocaleString()}
                    </p>
                    <Link
                      className="mt-3 inline-flex text-sm font-medium text-slate-900 dark:text-slate-100"
                      href={`/org/${organizationSlug}/memory/${record.id}`}
                    >
                      Open record
                    </Link>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </AtlasShell>
  );
}
