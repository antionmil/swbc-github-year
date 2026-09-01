import type { Metadata } from "next";
import Link from "next/link";
import { YearView } from "@/components/YearView";
import { fetchViewerYear } from "@/lib/github";
import { fillPct, rankOf, record } from "@/lib/leaderboard";
import { clearSession, getSession } from "@/lib/session";

/* Dynamic by necessity: it renders whoever holds the cookie. */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your year", robots: { index: false } };

function SignIn({ why }: { why: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-display text-4xl font-black">Your year, counted properly</h1>
      <p className="text-muted">{why}</p>
      <a
        href="/api/auth/login"
        className="rounded-full bg-accent px-8 py-4 text-sm font-bold tracking-[0.14em] text-ground uppercase"
      >
        Sign in with GitHub
      </a>
      <p className="max-w-sm text-xs text-muted">
        Read-only access to your profile. No repository access, nothing is written to your
        account, and you can remove yourself in one click afterwards.
      </p>
    </main>
  );
}

export default async function Me() {
  const s = await getSession();
  if (!s) {
    return (
      <SignIn why="Signing in counts your private contributions on the days they happened, and puts you on the leaderboard. Looking up a username never does either." />
    );
  }

  let d;
  try {
    d = await fetchViewerYear(s.token);
  } catch (e) {
    // The usual cause is a revoked or expired token. Drop it and start over
    // rather than showing an error the visitor cannot act on.
    console.error("[me] viewer fetch failed", e);
    await clearSession();
    return <SignIn why="That sign-in has expired. Signing in again takes a moment." />;
  }

  /* This is the ONLY write path for a person's own row, and it runs on every
     visit — which is what keeps the twelve-month window from drifting further
     out of date than their last visit. */
  await record(d);
  const rank = await rankOf(d.handle);

  return (
    <YearView
      d={d}
      slot={
        <div className="mt-10 flex flex-col gap-4 rounded-xl border border-rule bg-surface px-5 py-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <span className="font-display text-2xl font-bold text-accent">{fillPct(d)}%</span>
            <span className="text-sm text-muted">of the calendar filled</span>
            {rank && (
              <Link href="/leaderboard" className="ml-auto text-sm text-muted hover:text-accent">
                <span className="text-ink">#{rank.rank}</span> of {rank.of}
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-rule pt-3 text-xs tracking-[0.14em] uppercase">
            <span className="text-muted">Signed in as @{d.handle}</span>
            <form action="/api/leaderboard/remove" method="post" className="ml-auto">
              <button className="text-muted underline-offset-4 hover:text-accent hover:underline">
                Remove me
              </button>
            </form>
            <form action="/api/auth/logout" method="post">
              <button className="text-muted underline-offset-4 hover:text-accent hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
      }
    />
  );
}
