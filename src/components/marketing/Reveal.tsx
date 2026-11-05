"use client";

import { useEffect, useRef, useState } from "react";

export function Reveal({
  as: Tag = "div",
  delay = 0,
  className = "",
  children,
}: {
  as?: "div" | "li";
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.RefObject<never>}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
      className={`motion-safe:transition-[opacity,transform] motion-safe:duration-[400ms] motion-safe:ease-[var(--ease-out)] ${
        shown ? "" : "motion-safe:translate-y-4 motion-safe:opacity-0"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}
