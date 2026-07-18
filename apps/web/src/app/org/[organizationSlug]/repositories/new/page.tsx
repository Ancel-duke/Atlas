import { GitBranch, ShieldCheck } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import type { JSX } from "react";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@atlas/ui";

import { createRepositoryAction } from "../../../../actions";
import { AtlasShell, PageIntro, TrustStrip } from "../../../../../components/atlas-shell";
import { requireAtlasSession } from "../../../../../lib/atlas-api";

type PageProps = { readonly params: Promise<{ readonly organizationSlug: string }> };

export default async function RepositoryOnboardingPage({
  params
}: PageProps): Promise<JSX.Element> {
  const { organizationSlug } = await params;
  const session = await requireAtlasSession().catch(() => redirect("/sign-in"));
  if (session.principal.organizationSlug !== organizationSlug) {
    notFound();
  }

  return (
    <AtlasShell
      organizationSlug={organizationSlug}
      title="Repository onboarding"
      description="Connect the repository identity Atlas will use for Pulse calculations, graph evidence, and webhook correlation."
    >
      <PageIntro
        title="Atlas needs stable repository identity before it reasons."
        body="The demo works best when the provider repository ID is the immutable GitHub numeric repository ID. The display name can change later; the provider ID is what keeps webhook events and historical evidence tied together."
        facts={[
          "Stable ID for correlation",
          "Display name can be renamed",
          "Branch becomes evidence context"
        ]}
      />

      <TrustStrip
        items={[
          { label: "After submit", value: "Repository record created", tone: "success" },
          { label: "Ingestion", value: "Snapshot job queued", tone: "info" },
          { label: "Scoring", value: "Pulse waits for evidence", tone: "warning" }
        ]}
      />

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Connect GitHub repository</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createRepositoryAction} className="grid gap-4">
              <input name="organizationSlug" type="hidden" value={organizationSlug} />
              <Field
                label="Repository name"
                name="name"
                placeholder="openai/atlas-api"
                help="Human-readable GitHub owner/name shown throughout Atlas. This can be updated if the repository is renamed."
              />
              <Field
                label="Provider repository ID"
                name="providerRepositoryId"
                placeholder="123456789"
                help="Prefer the immutable numeric GitHub repository ID. Atlas uses it to match signed webhook deliveries."
              />
              <Field
                defaultValue="main"
                label="Default branch"
                name="defaultBranch"
                placeholder="main"
                help="Pulse and graph evidence use this as the primary branch context."
              />
              <Button type="submit">
                <GitBranch className="h-4 w-4" aria-hidden="true" />
                Connect repository
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What activates after connection</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {[
              "Repository Pulse starts calculating from snapshots, insights, graph, and memory evidence.",
              "Graph Explorer can correlate repository-scoped entities and relationships.",
              "Engineering Chat can package repository evidence before reasoning.",
              "Settings remain editable without changing historical evidence."
            ].map((item) => (
              <div
                className="flex gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800"
                key={item}
              >
                <ShieldCheck
                  className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-300"
                  aria-hidden="true"
                />
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </AtlasShell>
  );
}

function Field({
  label,
  name,
  placeholder,
  help,
  defaultValue
}: {
  readonly label: string;
  readonly name: string;
  readonly placeholder: string;
  readonly help: string;
  readonly defaultValue?: string;
}): JSX.Element {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
      {label}
      <input
        required
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
      />
      <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{help}</span>
    </label>
  );
}
