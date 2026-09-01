"use client";

import { useEffect, useState } from "react";
import { Board } from "@/components/Board";
import type { Row } from "@/lib/leaderboard";

/**
 * The payoff: where did this person land?
 *
 * It runs after the page paints rather than inside it, for two reasons. The
 * page stays cacheable HTML — recording during render made every view dynamic.
 * And the answer arriving a beat late is the point: the row lands, then
 * highlights, instead of already sitting there when you scroll to it.
 */
export function RankReveal({ handle, fill }: { handle: string; fill: number }) {
  const [state, setState] = useState<{ rows: Row[]; rank: { rank: number; of: number } | null } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/seen", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ handle }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => alive && setState({ rows: d.rows ?? [], rank: d.rank ?? null }))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [handle]);

  return (
    <>
      <div className="mt-10 flex flex-wrap items-baseline gap-x-3 gap-y-2 rounded-xl border border-rule bg-surface px-5 py-4">
        <span className="font-display text-2xl font-bold text-accent">{fill}%</span>
        <span className="text-sm text-muted">of the calendar filled</span>
        <span className="ml-auto text-sm text-muted tabular-nums">
          {state?.rank ? (
            <span className="rise">
              <span className="text-ink">#{state.rank.rank}</span> of {state.rank.of}
            </span>
          ) : failed ? null : (
            /* No spinner. A number that is about to appear should hold its own
               space, or the whole card jumps when it does. */
            <span className="opacity-40">finding your place…</span>
          )}
        </span>
      </div>

      {state && state.rows.length > 0 && (
        <div className="mt-12">
          <Board rows={state.rows} highlight={handle} />
        </div>
      )}
    </>
  );
}
