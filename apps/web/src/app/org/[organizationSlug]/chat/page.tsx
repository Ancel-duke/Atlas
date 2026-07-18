import { Bot, Send, ShieldCheck } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import type { JSX } from "react";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@atlas/ui";

import { createReasoningRunAction } from "../../../actions";
import {
  AtlasShell,
  EvidenceEmptyState,
  EvidenceDisclosure,
  PageIntro,
  TrustStrip
} from "../../../../components/atlas-shell";
import { createAuthenticatedAtlasSdk, requireAtlasSession } from "../../../../lib/atlas-api";

type PageProps = { readonly params: Promise<{ readonly organizationSlug: string }> };

export default async function EngineeringChatPage({ params }: PageProps): Promise<JSX.Element> {
  const { organizationSlug } = await params;
  const session = await requireAtlasSession().catch(() => redirect("/sign-in"));
  if (session.principal.organizationSlug !== organizationSlug) {
    notFound();
  }

  const sdk = await createAuthenticatedAtlasSdk();
  const [repositories, runs] = await Promise.all([sdk.listRepositories(), sdk.listReasoningRuns()]);

  return (
    <AtlasShell
      organizationSlug={organizationSlug}
      title="Engineering Chat"
      description="Ask engineering questions against packaged evidence. Atlas only persists conclusions that survive validation."
    >
      <PageIntro
        title="This is reasoning with receipts."
        body="A run creates an evidence package, specialist prompts, structured outputs, validation results, and conclusions. If the evidence is thin, Atlas should say so."
        facts={["Evidence package first", "Agents may abstain", "Conclusions show impact"]}
      />

      <TrustStrip
        items={[
          {
            label: "Repository context",
            value:
              repositories.length === 0
                ? "Organization-wide only"
                : `${repositories.length} repositories`,
            tone: repositories.length === 0 ? "warning" : "success"
          },
          {
            label: "Reasoning history",
            value: `${runs.length} runs`,
            tone: runs.length > 0 ? "info" : "neutral"
          },
          {
            label: "Trust rule",
            value: "No evidence, no conclusion",
            tone: "success"
          }
        ]}
      />

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-green-200" aria-hidden="true" />
              AI IDE assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 rounded-md border border-white/10 bg-slate-950/70 p-3 font-mono text-xs leading-6 text-slate-400">
              <p className="text-green-200">atlas.reasoning.packageEvidence()</p>
              <p>context: repository | organization</p>
              <p>policy: no evidence, no conclusion</p>
            </div>
            <form action={createReasoningRunAction} className="grid gap-4">
              <input name="organizationSlug" type="hidden" value={organizationSlug} />
              <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Repository context
                <select
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                  name="repositoryId"
                >
                  <option value="">Organization-wide</option>
                  {repositories.map((repository) => (
                    <option key={repository.id} value={repository.id}>
                      {repository.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Question
                <textarea
                  required
                  className="min-h-40 rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950"
                  maxLength={2000}
                  minLength={3}
                  name="question"
                  placeholder="What deployment risks should we address before the next release?"
                />
              </label>
              <Button type="submit">
                <Send className="h-4 w-4" aria-hidden="true" />
                Package evidence
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reasoning runs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {runs.length === 0 ? (
              <EvidenceEmptyState
                icon={Bot}
                title="No reasoning runs yet"
                body="A reasoning run packages evidence, orchestrates agents, validates outputs, and withholds unsupported claims."
                nextStep="Ask about launch risk, ownership gaps, or architecture drift. Then open the run and inspect evidence and prompts."
              />
            ) : (
              runs.map((run) => (
                <article
                  className="rounded-md border border-slate-200 p-4 dark:border-slate-800"
                  key={run.id}
                >
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={run.status === "rejected" ? "danger" : "info"}>{run.status}</Badge>
                    <Badge>{run.evidencePackage.evidence.length} evidence items</Badge>
                    <Badge>{run.conclusions.length} conclusions</Badge>
                  </div>
                  <p className="mt-3 font-medium text-slate-950 dark:text-slate-100">
                    {run.question}
                  </p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {new Date(run.createdAt).toLocaleString()}
                  </p>
                  <EvidenceDisclosure className="mt-3" title="Evidence and prompts">
                    <div className="mt-3 grid gap-2">
                      {run.prompts.map((prompt) => (
                        <div className="flex items-center gap-2 text-sm" key={prompt.role}>
                          <ShieldCheck className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                          <span>{prompt.role}</span>
                          <span className="text-slate-500">{prompt.promptVersion}</span>
                        </div>
                      ))}
                      <div className="rounded-md border border-white/10 bg-white/[0.035] p-3 text-sm text-slate-400">
                        Evidence packaged: {run.evidencePackage.evidence.length}
                      </div>
                    </div>
                  </EvidenceDisclosure>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </AtlasShell>
  );
}
