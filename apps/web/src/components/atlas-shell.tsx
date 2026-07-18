import { ShieldCheck, Sparkles, TerminalSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { JSX, ReactNode } from "react";

import { Badge, Button, cx } from "@atlas/ui";

import { signOutAction } from "../app/actions";
import { AtlasNavigation } from "./atlas-navigation";

type AtlasShellProps = {
  readonly organizationSlug: string;
  readonly title: string;
  readonly eyebrow?: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly actions?: ReactNode;
};

export function AtlasShell({
  organizationSlug,
  title,
  eyebrow = "Atlas",
  description,
  actions,
  children
}: AtlasShellProps): JSX.Element {
  return (
    <div className="atlas-grid min-h-dvh overflow-hidden bg-[var(--atlas-bg)] text-slate-100">
      <a
        className="atlas-focus sr-only z-50 rounded-md bg-green-300 px-3 py-2 text-sm font-semibold text-slate-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        href="#main-content"
      >
        Skip to main content
      </a>
      <div className="mx-auto grid min-h-dvh max-w-[1720px] lg:grid-cols-[284px_1fr]">
        <aside className="relative z-20 border-b border-white/10 bg-slate-950/78 px-4 py-4 backdrop-blur-2xl lg:border-b-0 lg:border-r lg:px-5">
          <div className="flex items-center justify-between gap-3 lg:block">
            <Link
              className="atlas-focus group flex items-center gap-3 rounded-md"
              href={`/org/${organizationSlug}`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-green-300/25 bg-green-300 text-base font-black text-slate-950 shadow-[0_0_36px_rgb(34_197_94_/_0.24)] transition group-hover:scale-105">
                A
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold tracking-tight text-white">
                  Atlas
                </span>
                <span className="block truncate text-xs text-slate-400">{organizationSlug}</span>
              </span>
            </Link>
            <Badge tone="success" className="lg:mt-5">
              Evidence live
            </Badge>
          </div>

          <div className="mt-5 hidden rounded-lg border border-white/10 bg-white/[0.04] p-3 lg:block">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
              <TerminalSquare className="h-4 w-4 text-green-200" aria-hidden="true" />
              Engineering OS
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Repository evidence, memory, graph context, and reasoning in one launch surface.
            </p>
          </div>

          <AtlasNavigation organizationSlug={organizationSlug} />

          <form action={signOutAction} className="mt-6 hidden lg:block">
            <Button className="w-full" type="submit" variant="secondary">
              Sign out
            </Button>
          </form>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/72 px-4 py-4 backdrop-blur-2xl sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase text-green-200">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  {eyebrow}
                </p>
                <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-normal text-white md:text-5xl">
                  {title}
                </h1>
                {description === undefined ? null : (
                  <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                    {description}
                  </p>
                )}
              </div>
              {actions === undefined ? null : <div className="flex flex-wrap gap-2">{actions}</div>}
            </div>
          </header>

          <main
            id="main-content"
            className="atlas-enter flex flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8"
            tabIndex={-1}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export function PageIntro({
  title,
  body,
  facts
}: {
  readonly title: string;
  readonly body: string;
  readonly facts: readonly string[];
}): JSX.Element {
  return (
    <section className="atlas-panel-soft rounded-lg p-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase text-green-200">How Atlas knows</p>
          <h2 className="mt-2 text-xl font-semibold tracking-normal text-white">{title}</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
            {body}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[540px]">
          {facts.map((fact) => (
            <div
              className="rounded-md border border-green-300/15 bg-green-300/[0.06] px-3 py-2 text-xs font-semibold text-green-100"
              key={fact}
            >
              {fact}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TrustStrip({
  items
}: {
  readonly items: readonly {
    readonly label: string;
    readonly value: string;
    readonly tone?: "neutral" | "success" | "warning" | "danger" | "info";
  }[];
}): JSX.Element {
  return (
    <section className="atlas-stagger grid gap-3 md:grid-cols-3">
      {items.map((item) => (
        <div className="atlas-panel-soft atlas-hover rounded-lg px-4 py-4" key={item.label}>
          <p className="text-xs font-semibold uppercase text-slate-500">{item.label}</p>
          <Badge className="mt-3" tone={item.tone ?? "neutral"}>
            {item.value}
          </Badge>
        </div>
      ))}
    </section>
  );
}

export function StatusPill({
  status,
  tone = "neutral"
}: {
  readonly status: string;
  readonly tone?: "neutral" | "success" | "warning" | "danger" | "info";
}): JSX.Element {
  return (
    <Badge tone={tone}>
      <ShieldCheck className="mr-1 h-3 w-3" aria-hidden="true" />
      {status}
    </Badge>
  );
}

export function EvidenceEmptyState({
  icon: Icon,
  title,
  body,
  nextStep,
  href,
  action
}: {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly body: string;
  readonly nextStep: string;
  readonly href?: string;
  readonly action?: string;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/55 p-5">
      <Icon className="h-5 w-5 text-green-200" aria-hidden="true" />
      <p className="mt-4 text-base font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
      <p className="mt-4 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300">
        <span className="font-semibold text-white">Next: </span>
        {nextStep}
      </p>
      {href === undefined || action === undefined ? null : (
        <Button asChild className="mt-4" variant="secondary">
          <Link href={href}>{action}</Link>
        </Button>
      )}
    </div>
  );
}

export function EvidenceDisclosure({
  title,
  children,
  className
}: {
  readonly title: string;
  readonly children: ReactNode;
  readonly className?: string;
}): JSX.Element {
  return (
    <details
      className={cx(
        "atlas-disclosure rounded-md border border-white/10 bg-white/[0.035] p-3",
        className
      )}
    >
      <summary className="atlas-focus cursor-pointer text-sm font-semibold text-slate-100">
        {title}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
