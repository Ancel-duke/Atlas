import {
  Activity,
  BookOpen,
  Bot,
  Building2,
  Database,
  History,
  Home,
  Inbox,
  Network,
  Settings,
  ShieldCheck
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { JSX, ReactNode } from "react";

import { Badge, Button, cx } from "@atlas/ui";

import { signOutAction } from "../app/actions";

type AtlasShellProps = {
  readonly organizationSlug: string;
  readonly title: string;
  readonly eyebrow?: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly actions?: ReactNode;
};

const navItems = [
  { label: "Dashboard", href: "", icon: Home },
  { label: "Pulse", href: "/repositories", icon: Activity },
  { label: "Graph", href: "/graph", icon: Network },
  { label: "Chat", href: "/chat", icon: Bot },
  { label: "Insights", href: "/insights", icon: Inbox },
  { label: "Memory", href: "/memory", icon: BookOpen },
  { label: "Evidence", href: "/evidence", icon: Database },
  { label: "Timeline", href: "/timeline", icon: History },
  { label: "Organization", href: "/settings/members", icon: Building2 },
  { label: "Settings", href: "/settings", icon: Settings }
] as const;

export function AtlasShell({
  organizationSlug,
  title,
  eyebrow = "Atlas",
  description,
  actions,
  children
}: AtlasShellProps): JSX.Element {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-[1500px] lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 lg:block">
            <Link className="flex items-center gap-3" href={`/org/${organizationSlug}`}>
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-sm font-semibold text-white dark:bg-emerald-400 dark:text-slate-950">
                A
              </span>
              <span>
                <span className="block text-sm font-semibold">Atlas</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {organizationSlug}
                </span>
              </span>
            </Link>
            <Badge tone="success" className="lg:mt-5">
              Live workspace
            </Badge>
          </div>

          <nav
            aria-label="Primary"
            className="mt-5 flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  className={cx(
                    "inline-flex min-w-max items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                  )}
                  href={`/org/${organizationSlug}${item.href}`}
                  key={item.label}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <form action={signOutAction} className="mt-6 hidden lg:block">
            <Button className="w-full" type="submit" variant="secondary">
              Sign out
            </Button>
          </form>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/90 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {eyebrow}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 dark:text-slate-100">
                  {title}
                </h1>
                {description === undefined ? null : (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {description}
                  </p>
                )}
              </div>
              {actions}
            </div>
          </header>

          <main className="atlas-enter flex flex-col gap-5 px-4 py-5 sm:px-6">{children}</main>
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
    <section className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
            How to read this screen
          </p>
          <h2 className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-100">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            {body}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
          {facts.map((fact) => (
            <div
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
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
    <section className="grid gap-3 md:grid-cols-3">
      {items.map((item) => (
        <div
          className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950"
          key={item.label}
        >
          <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
            {item.label}
          </p>
          <Badge className="mt-2" tone={item.tone ?? "neutral"}>
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

export function DemoEmptyState({
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
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/60">
      <Icon className="h-5 w-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
      <p className="mt-3 font-medium text-slate-950 dark:text-slate-100">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{body}</p>
      <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm text-slate-700 dark:bg-slate-950 dark:text-slate-300">
        <span className="font-medium text-slate-950 dark:text-slate-100">Next: </span>
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
