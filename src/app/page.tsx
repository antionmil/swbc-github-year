import Link from "next/link";
import { Grid } from "@/components/Grid";
import { LookupForm } from "@/components/LookupForm";
import { fetchYear, type YearData } from "@/lib/github";
import { top } from "@/lib/leaderboard";

/* The hero is a REAL year, not a generated pattern. It answers "what do I get"
   before anyone types, and the graph is the one thing every developer
   recognises on sight. Whoever leads the board gets the spot; if the board is
   empty, a name that will always resolve. */
export const revalidate = 3600;

const FALLBACK = "torvalds";

async function featured(): Promise<YearData | null> {
  const leader = (await top(1))[0]?.handle;
  for (const h of [leader, FALLBACK]) {
    if (!h) continue;
    try {
      return await fetchYear(h);
    } catch {
      /* try the next one — the home page must render regardless */
    }
  }
  return null;
}

const AUTH_MESSAGE: Record<string, string> = {
  cancelled: "Sign-in was cancelled. Nothing was shared.",
  state: "That sign-in link had expired. Try again.",
  denied: "GitHub declined the sign-in. Try again.",
  failed: "Sign-in did not complete. Try again in a moment.",
  unavailable: "Sign-in is not configured yet.",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string; removed?: string }>;
}) {
  const [d, q] = await Promise.all([featured(), searchParams]);
  const notice = q.removed ? "You are off the leaderboard." : AUTH_MESSAGE[q.auth ?? ""];

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-9 px-5 py-14 sm:px-6">
      {d && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-full overflow-x-auto">
            <div className="mx-auto w-fit">
              <Grid d={d} cell={5} gap={2} months={false} />
            </div>
          </div>
          <p className="text-center text-xs tracking-[0.16em] text-muted uppercase">
            That is{" "}
            <Link href={`/${d.handle}`} className="text-ink underline-offset-4 hover:text-accent">
              @{d.handle}
            </Link>
            ’s year
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

      {notice && <p className="text-center text-sm text-accent">{notice}</p>}

      <div className="flex flex-col items-center gap-4">
        <Link
          href="/leaderboard"
          className="text-xs tracking-[0.18em] text-muted uppercase underline-offset-4 hover:text-accent"
        >
          Or see who has filled the most of their year
        </Link>
        <p className="max-w-md text-center text-sm text-muted">
          Looking anyone up needs no sign-in — it is the same public data GitHub
          shows on a profile.{" "}
          <a href="/api/auth/login" className="text-ink underline-offset-4 hover:text-accent">
            Sign in with GitHub
          </a>{" "}
          to count your private contributions and join the board. Not affiliated
          with GitHub.
        </p>
      </div>
    </main>
  );
}
