"use client";

import { useEffect, useState } from "react";
import { Board } from "@/components/Board";
import type { Row } from "@/lib/leaderboard";

/**
 * The payoff: where did this person land?
 *
 * It runs after the page paints rather than inside it, for two reasons. The
 * page stays cacheable HTML — recording during render made every view dynamic
 * and rewrote the same row on every hit. And the answer arriving a beat late
 * is the point: the number lands, then the row highlights, instead of both
 * already sitting there.
 *
 * It renders in two places — the number under the stats, the board below the
 * repositories — because putting the board in between cut the page's own
 * closing sentence in half.
 */
type Data = { rows: Row[]; rank: { rank: number; of: number } | null };

/* One request, however many components ask for it. Two consumers each calling
   fetch would mean two GitHub reads and two database writes per page view. */
const inflight = new Map<string, Promise<Data>>();

function load(handle: string): Promise<Data> {
  const key = handle.toLowerCase();
  if (!inflight.has(key)) {
    inflight.set(
      key,
      fetch("/api/seen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle }),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((d) => ({ rows: d.rows ?? [], rank: d.rank ?? null }))
        .catch((e) => {
          // Do not cache a failure: the next mount should be free to retry.
          inflight.delete(key);
          throw e;
        }),
    );
  }
  return inflight.get(key)!;
}

function useSeen(handle: string) {
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    load(handle).then(
      (d) => alive && setData(d),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [handle]);
  return { data, failed };
}

export function RankReveal({ handle, fill }: { handle: string; fill: number }) {
  const { data, failed } = useSeen(handle);

  return (
    <div className="mt-10 flex flex-wrap items-baseline gap-x-3 gap-y-2 rounded-xl border border-rule bg-surface px-5 py-4">
      <span className="font-display text-2xl font-bold text-accent">{fill}%</span>
      <span className="text-sm text-muted">of the calendar filled</span>
      {/* The placeholder holds the same space the answer will take, so the
          card does not jump when the number arrives. */}
      <span className="ml-auto text-sm text-muted tabular-nums">
        {data?.rank ? (
          <span className="rise">
            <span className="text-ink">#{data.rank.rank}</span> of {data.rank.of}
          </span>
        ) : failed ? null : (
          <span className="opacity-40">finding your place…</span>
        )}
      </span>
    </div>
  );
}

export function RevealedBoard({ handle }: { handle: string }) {
  const { data } = useSeen(handle);
  if (!data?.rows.length) return null;
  return (
    <div className="mt-14">
      <Board rows={data.rows} highlight={handle} />
    </div>
  );
}
