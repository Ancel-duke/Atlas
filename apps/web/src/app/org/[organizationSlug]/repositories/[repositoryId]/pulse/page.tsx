import {
  Activity,
  AlertTriangle,
  BookOpen,
  Brain,
  Building2,
  FileClock,
  GitBranch,
  ShieldCheck,
  Truck,
  Users
} from "lucide-react";
import { redirect } from "next/navigation";
import type { JSX } from "react";

import type { PulseAssessment, PulseDimension, PulseEvidence } from "@atlas/contracts";
import { AtlasSdkError } from "@atlas/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, cx } from "@atlas/ui";

import { calculateRepositoryPulseAction } from "../../../../../actions";
import { AnimatedNumber } from "../../../../../../components/animated-number";
import {
  AtlasShell,
  EvidenceDisclosure,
  PageIntro,
  TrustStrip
} from "../../../../../../components/atlas-shell";
import { createAuthenticatedAtlasSdk, requireAtlasSession } from "../../../../../../lib/atlas-api";

type PulseRouteParams = {
  readonly organizationSlug: string;
  readonly repositoryId: string;
};

const dimensionIcons = {
  architectureIntegrity: Building2,
  knowledgeCoverage: BookOpen,
  ownershipCoverage: Users,
  documentationFreshness: FileClock,
  deploymentStability: Truck,
  testingConfidence: Brain
} as const satisfies Record<PulseDimension["key"], typeof Activity>;

export default async function RepositoryPulsePage({
  params
}: Readonly<{ params: Promise<PulseRouteParams> }>): Promise<JSX.Element> {
  const routeParams = await params;
  await requireAtlasSession().catch(() => redirect("/sign-in"));
  const sdk = await createAuthenticatedAtlasSdk();
  const assessment = await sdk
    .getRepositoryPulse(routeParams.repositoryId)
    .catch((error: unknown) => {
      if (error instanceof AtlasSdkError && error.status === 404) {
        return null;
      }
      throw error;
    });

  if (assessment === null) {
    return (
      <PulseUnavailable
        organizationSlug={routeParams.organizationSlug}
        repositoryId={routeParams.repositoryId}
      />
    );
  }

  const evidenceById = new Map(assessment.evidence.map((item) => [item.id, item]));

  return (
    <AtlasShell
      organizationSlug={routeParams.organizationSlug}
      title="Repository Pulse"
      eyebrow={routeParams.repositoryId}
      description={`Formula ${assessment.formulaVersion} calculated at ${new Date(
        assessment.calculatedAt
      ).toLocaleString()}. Every score exposes inputs, weights, contribution, evidence, and gaps.`}
      actions={
        <form action={calculateRepositoryPulseAction}>
          <input name="organizationSlug" type="hidden" value={routeParams.organizationSlug} />
          <input name="repositoryId" type="hidden" value={routeParams.repositoryId} />
          <Button type="submit">
            <Activity className="h-4 w-4" aria-hidden="true" />
            Recalculate Pulse
          </Button>
        </form>
      }
    >
      <PageIntro
        title="Pulse is explainable repository health."
        body="Atlas withholds the overall score when evidence coverage or confidence is too low. That is not an error; it is how the system avoids false certainty."
        facts={["Weights are visible", "Evidence is attached", "Low confidence withholds"]}
      />

      <TrustStrip
        items={[
          {
            label: "Overall status",
            value:
              assessment.status === "calculated" ? "Calculated" : "Withheld: insufficient evidence",
            tone: assessment.status === "calculated" ? "success" : "warning"
          },
          {
            label: "Assessment confidence",
            value: `${assessment.confidence.score}/100 ${assessment.confidence.band}`,
            tone: assessment.confidence.band === "low" ? "warning" : "success"
          },
          {
            label: "Evidence attached",
            value: `${assessment.evidence.length} items`,
            tone: assessment.evidence.length > 0 ? "success" : "warning"
          }
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardContent className="grid gap-7 md:grid-cols-[260px_1fr] md:items-center">
            <div className="grid justify-items-center gap-4">
              <PulseGauge score={assessment.overallScore} status={assessment.status} />
              <Badge tone={assessment.status === "calculated" ? "success" : "warning"}>
                {assessment.status === "calculated" ? "Calculated" : "Insufficient evidence"}
              </Badge>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-cyan-200">Explainable formula</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Overall Health</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {assessment.overallExplanation}
              </p>
              <div className="mt-4">
                <TrendChart assessment={assessment} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evidence Drawer</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[360px] overflow-y-auto">
            <div className="flex flex-col gap-3">
              {assessment.evidence.length === 0 ? (
                <p className="text-sm text-slate-600">No evidence attached to this assessment.</p>
              ) : (
                assessment.evidence.map((evidence) => (
                  <EvidenceRow evidence={evidence} key={evidence.id} />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          icon={Activity}
          label="Overall Health"
          value={assessment.overallScore === null ? "Withheld" : `${assessment.overallScore}/100`}
        />
        <MetricCard
          icon={ShieldCheck}
          label="Assessment Confidence"
          value={`${assessment.confidence.score}/100 ${assessment.confidence.band}`}
        />
        <MetricCard
          icon={GitBranch}
          label="Trend"
          value={`${assessment.trend.direction}${assessment.trend.delta === null ? "" : ` ${assessment.trend.delta > 0 ? "+" : ""}${assessment.trend.delta}`}`}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {assessment.dimensions.map((dimension) => (
          <DimensionPanel dimension={dimension} evidenceById={evidenceById} key={dimension.key} />
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Assessment Gaps</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <GapList title="Missing evidence" items={assessment.missingEvidence} />
          <GapList title="Excluded evidence" items={assessment.excludedEvidence} />
        </CardContent>
      </Card>
    </AtlasShell>
  );
}

function PulseUnavailable({
  organizationSlug,
  repositoryId
}: {
  readonly organizationSlug: string;
  readonly repositoryId: string;
}): JSX.Element {
  return (
    <AtlasShell
      organizationSlug={organizationSlug}
      title="Repository Pulse"
      eyebrow={repositoryId}
      description="Pulse only calculates from persisted Atlas repository, graph, memory, insight, and snapshot evidence."
    >
      <Card>
        <CardContent className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-200" aria-hidden="true" />
          <div>
            <p className="font-medium text-slate-950">Repository not found</p>
            <p className="mt-1 text-sm text-slate-600">
              Atlas could not locate this repository in the active organization context.
            </p>
            <Button asChild className="mt-4" variant="secondary">
              <a href={`/org/${organizationSlug}`}>Back to organization</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AtlasShell>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value
}: {
  readonly icon: typeof Activity;
  readonly label: string;
  readonly value: string;
}): JSX.Element {
  return (
    <Card className="atlas-hover">
      <CardContent className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-cyan-200" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
          <p className="truncate text-sm font-medium text-slate-950">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DimensionPanel({
  dimension,
  evidenceById
}: {
  readonly dimension: PulseDimension;
  readonly evidenceById: ReadonlyMap<string, PulseEvidence>;
}): JSX.Element {
  const Icon = dimensionIcons[dimension.key];
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-slate-600" aria-hidden="true" />
            {dimension.label}
          </CardTitle>
          <span className="text-sm font-semibold text-slate-900">
            {dimension.score === null ? "--" : dimension.score}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ScoreBar score={dimension.score ?? 0} muted={dimension.score === null} />
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <Fact label="Weight" value={dimension.weight.toFixed(2)} />
          <Fact label="Contribution" value={dimension.weightedContribution.toFixed(1)} />
          <Fact label="Confidence" value={`${dimension.confidence.score}/100`} />
        </div>
        <p className="text-sm leading-6 text-slate-600">{dimension.explanation}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <th className="py-2 pr-3 font-medium">Component</th>
                <th className="py-2 pr-3 font-medium">Input</th>
                <th className="py-2 pr-3 font-medium">Weight</th>
                <th className="py-2 font-medium">Contribution</th>
              </tr>
            </thead>
            <tbody>
              {dimension.components.map((component) => (
                <tr className="border-b border-slate-100" key={component.name}>
                  <td className="py-2 pr-3 font-medium text-slate-900">{component.name}</td>
                  <td className="py-2 pr-3 text-slate-600">
                    {component.value}/{component.max}
                  </td>
                  <td className="py-2 pr-3 text-slate-600">{component.weight.toFixed(2)}</td>
                  <td className="py-2 text-slate-600">{component.contribution.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <EvidenceDisclosure title="Evidence">
          <div className="flex flex-col gap-2">
            {dimension.evidenceIds.length === 0 ? (
              <p className="text-sm text-slate-600">No evidence for this dimension.</p>
            ) : (
              dimension.evidenceIds.map((evidenceId) => {
                const evidence = evidenceById.get(evidenceId);
                return (
                  <p className="text-sm text-slate-600" key={evidenceId}>
                    <span className="font-medium text-slate-900">{evidenceId}</span>
                    {evidence === undefined ? "" : `: ${evidence.summary}`}
                  </p>
                );
              })
            )}
          </div>
        </EvidenceDisclosure>
      </CardContent>
    </Card>
  );
}

function PulseGauge({
  score,
  status
}: {
  readonly score: number | null;
  readonly status: PulseAssessment["status"];
}): JSX.Element {
  const safeScore = Math.max(0, Math.min(score ?? 0, 100));
  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference - (safeScore / 100) * circumference;

  return (
    <div className="atlas-pulse-gauge relative grid h-56 w-56 place-items-center rounded-full border border-white/10 bg-slate-950/70">
      <svg className="absolute h-48 w-48 -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
        <circle
          cx="60"
          cy="60"
          fill="none"
          r="52"
          stroke="rgb(148 163 184 / 0.14)"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          fill="none"
          r="52"
          stroke={status === "calculated" ? "rgb(34 211 238)" : "rgb(251 191 36)"}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth="10"
        />
      </svg>
      <div className="text-center">
        <p className="text-xs font-semibold uppercase text-slate-500">Pulse</p>
        <p className="mt-1 text-5xl font-semibold text-white">
          {score === null ? "--" : <AnimatedNumber value={safeScore} />}
        </p>
        <p className="mt-1 text-sm text-slate-500">/ 100</p>
      </div>
    </div>
  );
}

function ScoreBar({
  score,
  muted = false
}: {
  readonly score: number;
  readonly muted?: boolean;
}): JSX.Element {
  return (
    <div className="h-2 overflow-hidden rounded-sm bg-slate-100">
      <div
        className={cx("h-full rounded-sm", muted ? "bg-slate-300" : "bg-emerald-500")}
        style={{ width: `${Math.max(0, Math.min(score, 100))}%` }}
      />
    </div>
  );
}

function TrendChart({ assessment }: { readonly assessment: PulseAssessment }): JSX.Element {
  const points = [
    ...assessment.trend.history
      .slice()
      .reverse()
      .map((item) => item.overallScore),
    assessment.overallScore
  ].filter((score): score is number => score !== null);
  const plotted = points.length === 0 ? [0] : points;
  const width = 520;
  const height = 120;
  const step = plotted.length <= 1 ? width : width / (plotted.length - 1);
  const polyline = plotted
    .map((score, index) => `${index * step},${height - (score / 100) * height}`)
    .join(" ");

  return (
    <svg
      aria-label="Repository Pulse trend chart"
      className="h-28 w-full rounded-md border border-slate-200 bg-white"
      preserveAspectRatio="none"
      viewBox={`0 0 ${width} ${height}`}
    >
      <line x1="0" x2={width} y1="30" y2="30" stroke="#e2e8f0" />
      <line x1="0" x2={width} y1="60" y2="60" stroke="#e2e8f0" />
      <line x1="0" x2={width} y1="90" y2="90" stroke="#e2e8f0" />
      <polyline fill="none" points={polyline} stroke="#10b981" strokeWidth="4" />
    </svg>
  );
}

function EvidenceRow({ evidence }: { readonly evidence: PulseEvidence }): JSX.Element {
  return (
    <EvidenceDisclosure title={evidence.label}>
      <dl className="mt-3 grid gap-2 text-sm">
        <Fact label="ID" value={evidence.id} />
        <Fact label="Source" value={`${evidence.sourceType}:${evidence.sourceLocator}`} />
        <Fact label="Observed" value={new Date(evidence.observedAt).toLocaleString()} />
      </dl>
      <p className="mt-3 text-sm leading-6 text-slate-600">{evidence.summary}</p>
    </EvidenceDisclosure>
  );
}

function Fact({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="truncate text-sm text-slate-900">{value}</dd>
    </div>
  );
}

function GapList({
  title,
  items
}: {
  readonly title: string;
  readonly items: readonly string[];
}): JSX.Element {
  return (
    <div>
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">None</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {items.map((item) => (
            <li className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700" key={item}>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
