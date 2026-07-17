import type { HTMLAttributes, JSX } from "react";

import { cx } from "../style/cx.js";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <section className={cx("rounded-lg border border-slate-200 bg-white", className)} {...props} />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cx("border-b border-slate-200 px-4 py-3", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>): JSX.Element {
  return <h2 className={cx("text-sm font-semibold text-slate-950", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cx("px-4 py-4", className)} {...props} />;
}
