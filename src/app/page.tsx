import Link from "next/link";
import { Grid } from "@/components/Grid";
import { LookupForm } from "@/components/LookupForm";
import { fetchYear, type YearData } from "@/lib/github";
import { fillPct, top } from "@/lib/leaderboard";

export const revalidate = 3600;

/* The hero has one job: show what a full year looks like before anyone types.
   A sparse grid does the opposite — it makes the product look empty. So the
   board leader only gets the spot if their year is actually full; otherwise a
   name that always reads well. */
const FULL_ENOUGH = 60;
const FALLBACK = "torvalds";

async function featured(): Promise<YearData | null> {
  const leader = (await top(1))[0];
  const first = leader && leader.fill_pct >= FULL_ENOUGH ? leader.handle : null;
  for (const h of [first, FALLBACK]) {
    if (!h) continue;
    try {
      const d = await fetchYear(h);
      if (fillPct(d) >= FULL_ENOUGH || h === FALLBACK) return d;
    } catch {
      /* try the next one — the home page must render regardless */
    }
  }
  return null;
}

export default async function Home() {
  const d = await featured();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-10 px-5 py-14 sm:px-6">
      {d && (
        <div className="flex flex-col items-center gap-3">
          <div className="no-bar w-full overflow-x-auto">
            <div className="mx-auto w-fit">
              <Grid d={d} cell={5} gap={2} months={false} />
            </div>
          </div>
          <p className="text-center text-[11px] tracking-[0.16em] text-muted uppercase">
            One year of{" "}
            <Link href={`/${d.handle}`} className="text-ink underline-offset-4 hover:text-accent">
              @{d.handle}
            </Link>
          </p>
        </div>
      )}

      <header className="flex flex-col gap-4 text-center">
        <h1 className="font-display text-5xl leading-[1.02] font-black sm:text-7xl">
          A Year in Commits
        </h1>
        <p className="font-display text-lg text-ink/70 italic sm:text-xl">
          Any username. One year. As a poster.
        </p>
      </header>

      <LookupForm />

      <div className="flex flex-col items-center gap-5">
        <Link
          href="/leaderboard"
          className="text-center text-[11px] tracking-[0.18em] text-muted uppercase underline-offset-4 hover:text-accent"
        >
          Or see the fullest years
        </Link>
        <p className="max-w-sm text-center text-xs leading-relaxed text-muted">
          Public contribution data, the same GitHub shows on a profile. No sign-in.
          A name you look up joins the leaderboard, which says how to come off it.
          Not affiliated with GitHub.
        </p>
      </div>
    </main>
  );
}
