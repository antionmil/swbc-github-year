import type { Metadata } from "next";
import Link from "next/link";
import { leaderboardEnabled, top } from "@/lib/leaderboard";

/* Dynamic, not ISR. Freshness IS the product here: you arrive from the rank
   line on your own page, and a board that does not yet list you reads as
   broken. ISR served the build-time prerender — an empty table — and
   stale-while-revalidate means a low-traffic site keeps showing whatever the
   last visitor triggered. One indexed query per view is the cheaper mistake. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboard — A Year in Commits",
  description: "Who has filled the most of their contribution calendar.",
};

const day = (iso: string | null) =>
  iso
    ? new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;

export default async function Leaderboard() {
  const rows = leaderboardEnabled ? await top(100) : [];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="flex flex-col gap-3">
        <p className="text-[10px] font-bold tracking-[0.3em] text-muted uppercase">A year in commits</p>
        <h1 className="font-display text-4xl font-black sm:text-6xl">Leaderboard</h1>
        <p className="max-w-prose text-muted">
          Ranked by how much of the calendar is filled — days with at least one
          contribution, out of the last year. Not by volume: one commit counts the
          same as fifty.
        </p>
        {/* Said plainly rather than buried: a row measured in September and a
            row measured in March describe two different twelve-month windows.
            Hiding that would make the ranking look more exact than it is. */}
        <p className="max-w-prose text-sm text-muted">
          Each row covers the twelve months ending on the date shown beside it, so
          two rows measured months apart are two different years. A row is rewritten
          every time its owner opens their own page.
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="mt-12 text-muted">Nobody yet. Look up a username and it appears here.</p>
      ) : (
        <ol className="mt-10 flex flex-col">
          {rows.map((r, i) => (
            <li key={r.handle}>
              <Link
                href={`/${r.handle}`}
                className="flex flex-col gap-1 border-b border-rule py-3 hover:border-accent"
              >
                <div className="flex items-baseline gap-3 sm:gap-5">
                  <span className="w-8 shrink-0 font-mono text-sm text-muted tabular-nums">{i + 1}</span>
                  <span className="font-display min-w-0 flex-1 truncate text-lg sm:text-xl">{r.handle}</span>
                  <span className="font-display shrink-0 text-lg font-bold text-accent tabular-nums sm:text-xl">
                    {r.fill_pct}%
                  </span>
                  <span className="hidden shrink-0 text-xs tracking-[0.14em] text-muted uppercase sm:inline">
                    {r.active_days}/{r.total_days} days
                  </span>
                </div>
                <div className="flex gap-3 pl-11 text-[11px] tracking-[0.12em] text-muted uppercase">
                  <span className="sm:hidden">{r.active_days}/{r.total_days} days</span>
                  {day(r.to_date) && <span>Year to {day(r.to_date)}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}

      <footer className="mt-14 flex flex-col items-center gap-4 border-t border-rule pt-8 text-center">
        <Link
          href="/"
          className="rounded-full bg-accent px-7 py-3 text-sm font-bold tracking-[0.14em] text-ground uppercase"
        >
          Where would you land?
        </Link>
        <p className="max-w-md text-xs text-muted">
          You appear here by being looked up. It is public GitHub data — the same
          numbers on your own profile — but if you would rather not be listed,{" "}
          <a href="https://github.com/AntoineKoerber" className="underline underline-offset-4">
            get in touch
          </a>{" "}
          and you will be removed.
        </p>
      </footer>
    </main>
  );
}
