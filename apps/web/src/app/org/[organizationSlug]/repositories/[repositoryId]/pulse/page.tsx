import { Activity, Database, GitBranch, ShieldCheck } from "lucide-react";
import type { JSX } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@atlas/ui";

type PulseRouteParams = {
  readonly organizationSlug: string;
  readonly repositoryId: string;
};

export default async function RepositoryPulsePage({
  params
}: Readonly<{ params: Promise<PulseRouteParams> }>): Promise<JSX.Element> {
  const routeParams = await params;
  const dimensions = [
    "Architecture Integrity",
    "Knowledge Coverage",
    "Ownership Coverage",
    "Documentation Freshness",
    "Deployment Stability",
    "Testing Confidence"
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {routeParams.organizationSlug} / {routeParams.repositoryId}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
            Repository Pulse
          </h1>
        </div>
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          No assessment calculated
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-slate-600" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Overall Health</p>
              <p className="text-sm text-slate-900">Insufficient evidence</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <GitBranch className="h-5 w-5 text-slate-600" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">AMG State</p>
              <p className="text-sm text-slate-900">Not initialized</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-slate-600" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">AI Confidence</p>
              <p className="text-sm text-slate-900">Unavailable</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <Database className="h-5 w-5 text-slate-600" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Evidence</p>
              <p className="text-sm text-slate-900">No repository evidence</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Pulse dimensions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {dimensions.map((dimension) => (
              <div
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
                key={dimension}
              >
                <span className="text-sm font-medium text-slate-900">{dimension}</span>
                <span className="text-sm text-slate-500">Awaiting evidence</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
