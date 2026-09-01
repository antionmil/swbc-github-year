import Link from "next/link";
import { LiveBoard } from "@/components/LiveBoard";
import { HeroGrid } from "@/components/HeroGrid";
import { LiveCount } from "@/components/LiveCount";
import { LookupForm } from "@/components/LookupForm";
import { leaderboardEnabled, topCached } from "@/lib/leaderboard";

/* ISR, not dynamic. The board read goes through `topCached`, so no uncached
   fetch happens during render and this page can be served from the edge.
   Since the hero stopped featuring a real user, this page makes no GitHub
   call at all — one fewer dependency and one fewer way to fail. */
export const revalidate = 30;

export default async function Home() {
  const rows = leaderboardEnabled ? await topCached() : [];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-14 px-5 py-14 sm:px-6 sm:py-20">
      <section className="flex flex-col gap-9">
        <LiveCount />

        <HeroGrid />

        <header className="flex flex-col gap-4 text-center">
          <h1 className="font-display rise rise-1 text-5xl leading-[1.02] font-bold sm:text-7xl">
            A Year in Commits
          </h1>
          <p className="rise rise-2 text-base text-muted sm:text-lg">
            Any username. One year at a glance.
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

      {leaderboardEnabled && <LiveBoard initial={rows} />}

      <footer className="border-t border-rule pt-8 text-center text-xs text-muted">
        Built in a day ·{" "}
        <a href="https://onedaybuilt.com" className="underline underline-offset-4 hover:text-accent">
          onedaybuilt.com
        </a>
      </footer>
    </main>
  );
}
