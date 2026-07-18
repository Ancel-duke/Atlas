import {
  ArrowRight,
  BookOpen,
  GitBranch,
  Network,
  ShieldCheck,
  Sparkles,
  TerminalSquare
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { JSX } from "react";

import { authTokenResponseSchema } from "@atlas/contracts";
import { Badge, Button, Card, CardContent } from "@atlas/ui";

import { auth } from "../auth";
import { signInWithGitHubAction, signOutAction, switchOrganizationAction } from "./actions";

const operatingSystemSignals = [
  {
    icon: GitBranch,
    title: "Repository-aware",
    body: "Pulse and settings stay tied to provider identity, default branch, and evidence context."
  },
  {
    icon: Network,
    title: "Graph-grounded",
    body: "Engineering objects carry provenance, lifecycle, relationships, and confidence."
  },
  {
    icon: BookOpen,
    title: "Memory-backed",
    body: "Facts, decisions, and recommendations become durable, versioned knowledge."
  },
  {
    icon: ShieldCheck,
    title: "Evidence-gated",
    body: "Conclusions must show evidence, confidence, and impact before they earn trust."
  }
] as const;

export default async function HomePage(): Promise<JSX.Element> {
  const session = await auth();
  const atlasSession =
    session?.atlas === undefined ? undefined : authTokenResponseSchema.parse(session.atlas);

  if (atlasSession?.principal.organizationSlug !== undefined) {
    redirect(`/org/${atlasSession.principal.organizationSlug}`);
  }

  return (
    <main className="atlas-grid min-h-screen overflow-hidden px-5 py-6 text-slate-100 sm:px-8 lg:px-10">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl content-center gap-8">
        <header className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div className="atlas-enter">
            <Badge tone="info">
              <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
              AI Engineering Operating System
            </Badge>
            <h1 className="mt-6 max-w-5xl text-5xl font-semibold tracking-normal text-white sm:text-6xl lg:text-7xl">
              Understand your engineering organization from evidence up.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-400 sm:text-lg">
              Atlas connects GitHub identity, repository evidence, graph context, durable memory,
              Repository Pulse, and structured reasoning. No hallucinated claims. Every conclusion
              carries evidence, confidence, and impact.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <form action={signInWithGitHubAction}>
                <Button type="submit">
                  Sign in with GitHub
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </form>
              <Button asChild variant="secondary">
                <Link href="/sign-in">Review trust model</Link>
              </Button>
            </div>
          </div>

          <Card className="atlas-enter overflow-hidden">
            <CardContent className="p-0">
              <div className="border-b border-white/10 bg-white/[0.04] px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <TerminalSquare className="h-4 w-4 text-cyan-200" aria-hidden="true" />
                  Launch readiness console
                </div>
              </div>
              <div className="grid gap-4 p-5">
                <PulsePreview label="Repository Pulse" value="Explainable" tone="success" />
                <PulsePreview label="Graph retrieval" value="Provenance-bound" tone="info" />
                <PulsePreview label="Continuous Reasoning" value="Validated" tone="success" />
                <PulsePreview label="Trust posture" value="Evidence-first" tone="warning" />
              </div>
            </CardContent>
          </Card>
        </header>

        <section className="atlas-stagger grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {operatingSystemSignals.map((signal) => (
            <TrustPoint
              body={signal.body}
              icon={signal.icon}
              key={signal.title}
              title={signal.title}
            />
          ))}
        </section>

        {atlasSession !== undefined ? (
          <Card>
            <CardContent className="grid gap-4">
              <div>
                <p className="text-sm font-semibold text-white">Available organizations</p>
                <p className="mt-1 text-sm text-slate-400">
                  Choose the tenant context before Atlas loads repository evidence.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {atlasSession.organizations.map((organization) => (
                  <form
                    key={organization.id}
                    action={switchOrganizationAction}
                    className="atlas-panel-soft atlas-hover rounded-lg p-4"
                  >
                    <input name="organizationId" type="hidden" value={organization.id} />
                    <p className="font-semibold text-white">{organization.displayName}</p>
                    <p className="mt-1 text-sm text-slate-400">{organization.role}</p>
                    <Button className="mt-4" type="submit" variant="secondary">
                      Open workspace
                    </Button>
                  </form>
                ))}
              </div>
              <form action={signOutAction}>
                <Button type="submit" variant="ghost">
                  Sign out
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </section>
    </main>
  );
}

function TrustPoint({
  icon: Icon,
  title,
  body
}: {
  readonly icon: typeof ShieldCheck;
  readonly title: string;
  readonly body: string;
}): JSX.Element {
  return (
    <article className="atlas-panel-soft atlas-hover rounded-lg p-5">
      <Icon className="h-5 w-5 text-cyan-200" aria-hidden="true" />
      <p className="mt-4 text-base font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
    </article>
  );
}

function PulsePreview({
  label,
  value,
  tone
}: {
  readonly label: string;
  readonly value: string;
  readonly tone: "success" | "warning" | "info";
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-slate-950/60 px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <Badge tone={tone}>{value}</Badge>
    </div>
  );
}
