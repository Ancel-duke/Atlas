import type { HTMLAttributes, JSX } from "react";

import { cx } from "../style/cx.js";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  readonly tone?: BadgeTone;
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps): JSX.Element {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold",
        tone === "neutral" && "border-slate-700/70 bg-slate-900/80 text-slate-300",
        tone === "success" && "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
        tone === "warning" && "border-amber-400/25 bg-amber-400/10 text-amber-200",
        tone === "danger" && "border-rose-400/25 bg-rose-400/10 text-rose-200",
        tone === "info" && "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
        className
      )}
      {...props}
    />
  );
}
