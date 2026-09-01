"use client";

import { useEffect, useState } from "react";
import { subscribe, type Counts } from "@/lib/pulseClient";

/** Below this, the totals are hidden rather than shown small. Lower it once
 *  the numbers stand on their own. */
const MEANINGFUL = 100;

const fmt = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k` : String(n);

export function LiveCount() {
  const [c, setC] = useState<Counts | null>(null);
  useEffect(() => subscribe(setC), []);

  /* Small real numbers read worse than no numbers, so the totals stay hidden
     until they mean something. "online now" shows from the first visitor — it
     is live, and a live 2 reads as a site with people on it, where "2 all
     time" reads as a site nobody uses. */
  if (!c?.total) return null;
  const totals = c.total >= MEANINGFUL;

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
      {totals && typeof c.week === "number" && (
        <span>
          <span className="font-medium text-ink tabular-nums">{fmt(c.week)}</span> this week
        </span>
      )}
      {totals && (
        <span>
          <span className="font-medium text-ink tabular-nums">{fmt(c.total)}</span> visitors
        </span>
      )}
      {totals && typeof c.views === "number" && c.views > 0 && (
        <span>
          <span className="font-medium text-ink tabular-nums">{fmt(c.views)}</span> views
        </span>
      )}
    </div>
  );
}
