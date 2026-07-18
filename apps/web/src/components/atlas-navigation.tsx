"use client";

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
  Settings
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "@atlas/ui";

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

export function AtlasNavigation({ organizationSlug }: { readonly organizationSlug: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="atlas-stagger mt-5 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
    >
      {navItems.map((item) => {
        const href = `/org/${organizationSlug}${item.href}`;
        const isActive = item.href === "" ? pathname === href : pathname.startsWith(href);
        const Icon = item.icon;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={cx(
              "atlas-focus group relative inline-flex min-h-11 min-w-max cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium transition active:scale-[0.99] lg:min-w-0",
              isActive
                ? "border-green-300/25 bg-green-300/10 text-white"
                : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
            )}
            href={href}
            key={item.label}
          >
            <span
              className={cx(
                "absolute left-0 h-5 w-0.5 rounded-r-full bg-green-300 transition",
                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            />
            <Icon
              className={cx(
                "h-4 w-4 transition",
                isActive ? "text-green-200" : "group-hover:text-green-200"
              )}
              aria-hidden="true"
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
