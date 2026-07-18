"use client";

import { useEffect, useMemo, useState } from "react";

type AnimatedNumberProps = {
  readonly value: number;
  readonly suffix?: string;
};

export function AnimatedNumber({ value, suffix = "" }: AnimatedNumberProps) {
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );
  const [displayValue, setDisplayValue] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayValue(value);
      return;
    }

    let frame = 0;
    const totalFrames = 28;

    function tick() {
      frame += 1;
      const progress = Math.min(frame / totalFrames, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplayValue(Math.round(value * eased));

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    const animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [reducedMotion, value]);

  return (
    <>
      {displayValue}
      {suffix}
    </>
  );
}
