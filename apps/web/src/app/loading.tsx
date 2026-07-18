import type { JSX } from "react";

export default function Loading(): JSX.Element {
  return (
    <main className="atlas-grid min-h-screen px-5 py-8 text-slate-100">
      <div className="mx-auto grid max-w-7xl gap-5">
        <div className="atlas-skeleton h-8 w-48 rounded-md" />
        <div className="atlas-skeleton h-20 max-w-3xl rounded-lg" />
        <div className="grid gap-4 md:grid-cols-4">
          <div className="atlas-skeleton h-36 rounded-lg" />
          <div className="atlas-skeleton h-36 rounded-lg" />
          <div className="atlas-skeleton h-36 rounded-lg" />
          <div className="atlas-skeleton h-36 rounded-lg" />
        </div>
      </div>
    </main>
  );
}
