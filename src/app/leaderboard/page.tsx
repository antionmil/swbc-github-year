import type { Metadata } from "next";
import Link from "next/link";
import { leaderboardEnabled, top } from "@/lib/leaderboard";

/* Dynamic, not ISR. Freshness IS the product here: you arrive from the rank
   line on your own page, and a board that does not yet list you reads as
   broken. ISR served the build-time prerender - an empty table - and
   stale-while-revalidate means a low-traffic site keeps showing whatever the
   last visitor triggered. One indexed query per view is the cheaper mistake. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboard — A Year in Commits",
  description: "Who has filled the most of their contribution calendar.",
};

export default async function Leaderboard() {
  const rows = leaderboardEnabled ? await top(100) : [];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="flex flex-col gap-3">
        <p className="text-[10px] font-bold tracking-[0.3em] text-muted uppercase">
          A year in commits
        </p>
        <h1 className="font-display text-4xl font-black sm:text-6xl">Leaderboard</h1>
        <p className="max-w-prose text-muted">
          Ranked by how much of the calendar is filled — days with at least one
          contribution, out of the last year. Not by volume: one commit counts the
          same as fifty.
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="mt-12 text-muted">
          Nobody yet. Look up a username and it appears here.
        </p>
      ) : (
        <ol className="mt-10 flex flex-col">
          {rows.map((r, i) => (
            <li key={r.handle}>
              <Link
                href={`/${r.handle}`}
                className="flex items-baseline gap-3 border-b border-rule py-3 hover:border-accent sm:gap-5"
              >
                <span className="w-8 shrink-0 font-mono text-sm text-muted tabular-nums">
                  {i + 1}
                </span>
                <span className="font-display min-w-0 flex-1 truncate text-lg sm:text-xl">
                  {r.handle}
                </span>
                <span className="font-display shrink-0 text-lg font-bold text-accent tabular-nums sm:text-xl">
                  {r.fill_pct}%
                </span>
                <span className="hidden shrink-0 text-xs tracking-[0.14em] text-muted uppercase sm:inline">
                  {r.active_days}/{r.total_days} days
                </span>
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
          You appear here by being looked up — nobody is scraped in. It is public
          GitHub data, but if you would rather not be listed,{" "}
          <a href="https://github.com/AntoineKoerber" className="underline underline-offset-4">
            get in touch
          </a>{" "}
          and you will be removed.
        </p>
      </footer>
    </main>
  );
}
