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
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
        tone === "neutral" && "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
        tone === "success" &&
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
        tone === "warning" && "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
        tone === "danger" && "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
        tone === "info" && "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
        className
      )}
      {...props}
    />
  );
}
