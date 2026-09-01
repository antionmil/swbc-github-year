import Link from "next/link";
import type { ReactNode } from "react";
import { Grid } from "@/components/Grid";
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
export function YearView({ d, slot }: { d: YearData; slot?: ReactNode }) {
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
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="flex flex-col gap-3">
        <p className="text-[10px] font-bold tracking-[0.3em] text-muted uppercase">A year in commits</p>
        <h1 className="font-display text-4xl font-black break-words sm:text-6xl">@{d.handle}</h1>
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

      {/* text-pretty stops the last word landing alone on its own line — the
          orphaned "5." was exactly that. */}
      <p className="mt-10 text-xl leading-relaxed text-balance text-ink/80 sm:text-2xl">
        <span className="text-pretty">
          {d.total.toLocaleString()} contributions across {d.activeDays} days
          {d.totals.prs ? `, ${d.totals.prs} pull requests` : ""}
          {d.streak > 1 ? `, and a longest unbroken run of ${d.streak}` : ""}.
        </span>
      </p>

      {d.topRepos.length > 0 && (
        <section className="mt-12 flex flex-col gap-4">
          <h2 className="text-[10px] font-bold tracking-[0.24em] text-muted uppercase">Most committed to</h2>
          {d.topRepos.slice(0, 5).map((r) => (
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
          alt={`@${d.handle}'s year in commits, as a poster`}
          width={1000}
          height={1500}
          loading="lazy"
          className="block rounded-lg border border-rule"
          style={{ width: "100%", maxWidth: 340, height: "auto" }}
        />
        <a
          href={posterUrl(d.handle)}
          download={`${d.handle}-year-in-commits.png`}
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
