"use client";

import { useEffect, useState } from "react";
import { subscribe, type Counts } from "@/lib/pulseClient";

const fmt = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k` : String(n);

export function LiveCount() {
  const [c, setC] = useState<Counts | null>(null);
  useEffect(() => subscribe(setC), []);

  // Nothing until the first ping answers — an empty pill is worse than none.
  if (!c?.total) return null;

  return (
    <div className="mx-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-full border border-rule px-5 py-2.5 text-xs text-muted">
      {typeof c.online === "number" && c.online > 0 && (
        <span className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          <span className="font-medium text-ink tabular-nums">{fmt(c.online)}</span> online now
        </span>
      )}
      {typeof c.week === "number" && (
        <span>
          <span className="font-medium text-ink tabular-nums">{fmt(c.week)}</span> visitors this week
        </span>
      )}
      <span>
        <span className="font-medium text-ink tabular-nums">{fmt(c.total)}</span> visitors all-time
      </span>
      {typeof c.views === "number" && c.views > 0 && (
        <span>
          <span className="font-medium text-ink tabular-nums">{fmt(c.views)}</span> page views
        </span>
      )}
    </div>
  );
}
