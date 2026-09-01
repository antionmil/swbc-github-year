"use client";

import { useEffect, useState } from "react";

type Counts = { online?: number; week?: number; total?: number };

const KEY = "odb.vid";

/** One id per browser, kept locally. It is random, it is not tied to anything,
 *  and it is the only thing sent — which is what makes "all-time visitors"
 *  mean people rather than page views. */
function visitorId() {
  try {
    let v = localStorage.getItem(KEY);
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    // Private mode, or storage blocked. Still counted, just as a new visitor
    // each time rather than a returning one.
    return crypto.randomUUID();
  }
}

const fmt = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k` : String(n);

export function LiveCount() {
  const [c, setC] = useState<Counts | null>(null);

  useEffect(() => {
    const sid = visitorId();
    let alive = true;

    const ping = () =>
      fetch("/api/pulse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sid }),
      })
        .then((r) => r.json())
        .then((d) => alive && d && typeof d.total === "number" && setC(d))
        .catch(() => {});

    ping();
    /* Thirty seconds keeps "online now" honest against a two-minute window,
       and pauses while the tab is hidden so a forgotten tab is not counted as
       a person sitting there. */
    const t = setInterval(() => document.visibilityState === "visible" && ping(), 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // Nothing until there is something true to say. A pill reading "0 online"
  // is worse than no pill.
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
          <span className="font-medium text-ink tabular-nums">{fmt(c.week)}</span> this week
        </span>
      )}
      <span>
        <span className="font-medium text-ink tabular-nums">{fmt(c.total)}</span> all time
      </span>
    </div>
  );
}
