import Link from "next/link";
import type { ReactNode } from "react";
import { Grid } from "@/components/Grid";
import { displayHandle, isClean } from "@/lib/clean";
import type { YearData } from "@/lib/github";

const MONTH = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const monthYear = (iso: string) => {
  const d = new Date(iso + "T00:00:00Z");
  return `${MONTH[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

export const posterUrl = (h: string) => `/api/poster/${encodeURIComponent(h)}`;

function Stat({ n, k }: { n: string | number; k: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-display text-3xl leading-none font-bold text-accent sm:text-5xl">{n}</span>
      <span className="text-[10px] tracking-[0.2em] text-muted uppercase sm:text-xs">{k}</span>
    </div>
  );
}

/** One presentation, two routes: the cached public page and the signed-in
 *  `/me`. `slot` is the only thing that differs — the leaderboard card. */
export function YearView({ d, slot, after }: { d: YearData; slot?: ReactNode; after?: ReactNode }) {
  /* Exactly four, always. The list used to grow to five when someone had pull
     requests and shrink to four when they did not, so a three-column grid left
     one tile stranded on a row of its own. Four fills 2x2 on a phone and one
     clean row on a desktop, whoever it is. Pull requests moved into the
     sentence below, where a varying count costs nothing. */
  const stats: [string | number, string][] = [
    [d.totals.commits.toLocaleString(), "Commits"],
    [d.activeDays, "Active days"],
    [d.streak, "Longest streak"],
    [d.totals.repos, "Repositories"],
  ];

  return (
    <main className="relative mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      {/* A way out that does not need scrolling to the bottom. The footer link
          is still there for anyone who reads to the end. */}
      <Link
        href="/"
        aria-label="Back to the home page"
        title="Back to the home page"
        className="absolute top-8 left-4 flex h-9 w-9 items-center justify-center rounded-full border border-rule text-muted transition-colors hover:border-accent hover:text-accent sm:left-6"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M15 5l-7 7 7 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>

      <header className="flex flex-col gap-5">
        <p className="pl-12 text-[10px] font-bold tracking-[0.3em] text-muted uppercase">A year in commits</p>

        {/* Identity, before any numbers. A username alone is easy to get wrong
            — there are near-identical ones — and a face plus a display name
            settles "is this actually me" in a glance. */}
        <div className="flex items-center gap-4">
          {d.avatar && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={d.avatar}
              alt=""
              width={64}
              height={64}
              className="h-14 w-14 shrink-0 rounded-full border border-rule sm:h-16 sm:w-16"
            />
          )}
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="font-display text-3xl leading-none font-bold break-words sm:text-5xl">
              @{displayHandle(d.handle)}
            </h1>
            <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-muted">
              {d.name && isClean(d.name) && <span className="text-ink">{d.name}</span>}
              {d.name && isClean(d.name) && <span aria-hidden>·</span>}
              <span className="tabular-nums">
                {d.followers.toLocaleString()} follower{d.followers === 1 ? "" : "s"}
              </span>
            </p>
          </div>
        </div>

        {/* The bio is free text on someone else's profile. It is shown, not
            vouched for — so it is shown only if it passes. */}
        {d.bio && isClean(d.bio) && (
          <p className="max-w-prose text-pretty text-muted">{d.bio}</p>
        )}

        {/* The range is a rolling 12 months. Naming the months removes the
            contradiction with the old "2025 — 2026" over a Jan–Dec axis. */}
        <p className="text-sm tracking-[0.18em] text-muted uppercase">
          {monthYear(d.from)} — {monthYear(d.to)}
        </p>
      </header>

      <section className="mt-10">
        <Grid d={d} cascade />
        {d.hasPrivate && (
          <p className="mt-4 text-sm text-muted">
            Plus <span className="text-ink">{d.privateCount.toLocaleString()}</span> contributions in
            private repositories. GitHub reports the total but never which days they fell on, so they
            cannot be plotted.
          </p>
        )}
      </section>

      <section className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
        {stats.map(([n, k]) => (
          <Stat key={k} n={n} k={k} />
        ))}
      </section>

      {slot}

      {/* This line used to repeat the four tiles directly above it — the same
          day count, the same streak, in words. A sentence earns its place by
          saying something the numbers do not: the peak, and when the work
          actually happened. */}
      {d.total > 0 && (
        <p className="mt-10 text-lg leading-relaxed text-pretty text-ink/75 sm:text-xl">
          The busiest day carried {d.busiest.toLocaleString()} contribution
          {d.busiest === 1 ? "" : "s"}
          {d.weekendPct > 0 && <>, and {d.weekendPct}% of the year landed at weekends</>}
          {d.totals.prs > 0 && <>, across {d.totals.prs.toLocaleString()} pull requests</>}.
        </p>
      )}

      {d.topRepos.length > 0 && (
        <section className="mt-12 flex flex-col gap-4">
          <h2 className="text-[10px] font-bold tracking-[0.24em] text-muted uppercase">Most committed to</h2>
          {d.topRepos.filter((r) => isClean(r.name)).slice(0, 5).map((r) => (
            <a
              key={r.name}
              href={`https://github.com/${d.handle}/${r.name}`}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule pb-3 hover:border-accent"
            >
              <span className="font-display text-xl sm:text-2xl">{r.name}</span>
              <span className="text-xs tracking-[0.16em] text-muted uppercase">
                {r.commits.toLocaleString()} commits{r.language ? ` · ${r.language}` : ""}
              </span>
            </a>
          ))}
        </section>
      )}

      {after}

      {/* The poster: the thing you save and the thing a link unfurls as — not
          the page itself. A fixed 2:3 artwork never behaved as a web page. */}
      <section className="mt-14 flex flex-col items-center gap-5 rounded-2xl border border-rule bg-surface p-6 text-center sm:p-8">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-2xl font-bold">Take the poster</h2>
          <p className="text-sm text-muted">
            The same year, laid out like film credits. Shareable, printable.
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={posterUrl(d.handle)}
          alt={`@${displayHandle(d.handle)}'s year in commits, as a poster`}
          width={1000}
          height={1500}
          loading="lazy"
          className="block rounded-lg border border-rule"
          style={{ width: "100%", maxWidth: 340, height: "auto" }}
        />
        <a
          href={posterUrl(d.handle)}
          download={`${displayHandle(d.handle)}-year-in-commits.png`}
          className="rounded-full bg-accent px-7 py-3 text-sm font-bold tracking-[0.14em] text-ground uppercase"
        >
          Download poster
        </a>
      </section>

      <footer className="mt-14 flex flex-col items-center gap-4 border-t border-rule pt-8 text-center">
        <Link
          href="/"
          className="rounded-full border border-rule px-7 py-3 text-sm font-bold tracking-[0.14em] text-muted uppercase hover:border-accent hover:text-accent"
        >
          Another username
        </Link>
        <p className="text-xs text-muted">
          Public contribution data · not affiliated with GitHub ·{" "}
          <a href="https://onedaybuilt.com" className="underline underline-offset-4">onedaybuilt.com</a>
        </p>
      </footer>
    </main>
  );
}
