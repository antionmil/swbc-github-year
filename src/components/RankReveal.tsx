"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

/**
 * One row, not the whole board.
 *
 * The full list belongs on the home page. Here the question is narrow — where
 * does THIS year land — and answering it with a hundred rows buries it. The
 * badge is gone too: it read "YOU" beside whoever the page was about, which is
 * a lie on every page except your own.
 */
export function RevealedRow({ handle }: { handle: string }) {
  const { data } = useSeen(handle);
  const row = data?.rows.find((r) => r.handle.toLowerCase() === handle.toLowerCase());
  if (!data || !row || !data.rank) return null;

  return (
    <section className="rise mt-14 flex flex-col gap-4">
      <h2 className="text-[10px] font-bold tracking-[0.24em] text-muted uppercase">
        On the leaderboard
      </h2>

      <div className="flex items-baseline gap-4 rounded-xl border border-accent/40 bg-accent/[0.06] px-5 py-4 sm:gap-5">
        <span className="font-display text-3xl leading-none font-bold text-accent tabular-nums sm:text-4xl">
          {data.rank.rank}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base sm:text-lg">{row.handle}</span>
          <span className="block text-xs text-muted tabular-nums">
            {row.active_days}/{row.total_days} days
          </span>
        </span>
        <span className="font-display shrink-0 text-xl font-bold text-accent tabular-nums sm:text-2xl">
          {row.fill_pct}%
        </span>
      </div>

      <Link
        href="/#leaderboard"
        className="text-xs tracking-[0.16em] text-muted uppercase underline-offset-4 hover:text-accent"
      >
        See all {data.rank.of} →
      </Link>
    </section>
  );
}
