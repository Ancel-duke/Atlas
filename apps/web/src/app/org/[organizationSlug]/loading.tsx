import type { JSX } from "react";

export default function OrganizationLoading(): JSX.Element {
  return (
    <main className="atlas-grid min-h-screen px-5 py-6 text-slate-100 sm:px-8">
      <div className="grid gap-6 lg:grid-cols-[284px_1fr]">
        <aside className="hidden rounded-lg border border-white/10 bg-slate-950/70 p-5 lg:block">
          <div className="atlas-skeleton h-11 w-40 rounded-lg" />
          <div className="mt-8 grid gap-3">
            <div className="atlas-skeleton h-10 rounded-md" />
            <div className="atlas-skeleton h-10 rounded-md" />
            <div className="atlas-skeleton h-10 rounded-md" />
            <div className="atlas-skeleton h-10 rounded-md" />
          </div>
        </aside>
        <section className="grid gap-5">
          <div className="atlas-skeleton h-28 rounded-lg" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="atlas-skeleton h-24 rounded-lg" />
            <div className="atlas-skeleton h-24 rounded-lg" />
            <div className="atlas-skeleton h-24 rounded-lg" />
          </div>
          <div className="atlas-skeleton h-96 rounded-lg" />
        </section>
      </div>
    </main>
  );
}
