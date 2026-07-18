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
        "atlas-focus inline-flex h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold outline-none transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" &&
          "bg-green-400 text-slate-950 shadow-[0_0_28px_rgb(34_197_94_/_0.22)] hover:bg-green-300",
        variant === "secondary" &&
          "border border-slate-700/80 bg-white/[0.06] text-slate-100 hover:border-green-300/50 hover:bg-white/[0.1]",
        variant === "ghost" && "text-slate-300 hover:bg-white/[0.07] hover:text-white",
        className
      )}
      type={type}
      {...props}
    />
  );
}
