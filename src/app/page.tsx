import Link from "next/link";
import { Board } from "@/components/Board";
import { Grid } from "@/components/Grid";
import { LookupForm } from "@/components/LookupForm";
import { fetchYear, type YearData } from "@/lib/github";
import { fillPct, leaderboardEnabled, top } from "@/lib/leaderboard";

/* Dynamic, because the board is on this page now and a visitor arrives here
   straight after being added to it. The GitHub call for the hero is still
   cached for an hour by the fetch cache, so this costs one indexed query. */
export const dynamic = "force-dynamic";

/* The hero has one job: show what a full year looks like before anyone types.
   A sparse grid does the opposite — it makes the product look empty. */
const FULL_ENOUGH = 60;
const FALLBACK = "torvalds";

async function featured(leader?: string): Promise<YearData | null> {
  for (const h of [leader, FALLBACK]) {
    if (!h) continue;
    try {
      const d = await fetchYear(h);
      if (fillPct(d) >= FULL_ENOUGH || h === FALLBACK) return d;
    } catch {
      /* try the next one — the page must render regardless */
    }
  }
  return null;
}

export default async function Home() {
  const rows = leaderboardEnabled ? await top(100) : [];
  const best = rows[0] && rows[0].fill_pct >= FULL_ENOUGH ? rows[0].handle : undefined;
  const d = await featured(best);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-14 px-5 py-14 sm:px-6 sm:py-20">
      <section className="flex flex-col gap-9">
        {d && (
          <div className="flex flex-col items-center gap-3">
            <div className="no-bar w-full overflow-x-auto">
              <div className="mx-auto w-fit">
                <Grid d={d} cell={5} gap={2} months={false} cascade />
              </div>
            </div>
            <p className="rise rise-3 text-center text-[11px] tracking-[0.14em] text-muted uppercase">
              One year of{" "}
              <Link href={`/${d.handle}`} className="text-ink underline-offset-4 hover:text-accent">
                @{d.handle}
              </Link>
            </p>
          </div>
        )}

        <header className="flex flex-col gap-4 text-center">
          <h1 className="font-display rise rise-1 text-5xl leading-[1.02] font-bold sm:text-7xl">
            A Year in Commits
          </h1>
          <p className="rise rise-2 text-base text-muted sm:text-lg">
            Any username. One year. As a poster.
          </p>
        </header>

        <div className="rise rise-3">
          <LookupForm />
        </div>

        <p className="rise rise-4 mx-auto max-w-sm text-center text-xs leading-relaxed text-muted">
          Public contribution data, the same GitHub shows on a profile. No sign-in.
          A name you look up joins the list below. Not affiliated with GitHub.
        </p>
      </section>

      {leaderboardEnabled && <Board rows={rows} />}

      <footer className="border-t border-rule pt-8 text-center text-xs text-muted">
        Built in a day ·{" "}
        <a href="https://onedaybuilt.com" className="underline underline-offset-4 hover:text-accent">
          onedaybuilt.com
        </a>
      </footer>
    </main>
  );
}
