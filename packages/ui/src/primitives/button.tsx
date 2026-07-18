import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes, JSX } from "react";

import { cx } from "../style/cx.js";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly asChild?: boolean;
  readonly variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  asChild = false,
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps): JSX.Element {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      className={cx(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" &&
          "bg-slate-950 text-white hover:bg-slate-800 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300",
        variant === "secondary" &&
          "border border-slate-300 bg-white text-slate-950 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900",
        variant === "ghost" &&
          "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900",
        className
      )}
      type={type}
      {...props}
    />
  );
}
