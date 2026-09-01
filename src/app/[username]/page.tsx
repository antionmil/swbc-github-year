import type { Metadata } from "next";
import Link from "next/link";
import { YearView, posterUrl } from "@/components/YearView";
import { fetchYear, isValidLogin, UnknownUser, type YearData } from "@/lib/github";
import { fillPct, leaderboardEnabled, rankOf } from "@/lib/leaderboard";

/* Cached and PUBLIC. This page never reads a cookie: doing so would make every
   username dynamic and cost a GitHub call per view. The signed-in view lives
   at /me, where it can be dynamic without dragging the cached pages with it. */
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const handle = decodeURIComponent(username);
  if (!isValidLogin(handle)) return { title: "Not found" };

  const title = `@${handle} — A Year in Commits`;
  const description = `A year of @${handle}'s public GitHub contributions.`;
  /* The poster is the SHARE artifact, not the page. This is where it belongs:
     a link unfurls as the poster, while the page itself stays a web page. */
  const images = [{ url: posterUrl(handle), width: 1000, height: 1500, alt: title }];
  return {
    title,
    description,
    openGraph: { title, description, images, type: "website" },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const handle = decodeURIComponent(username);

  let d: YearData;
  try {
    d = await fetchYear(handle);
  } catch (e) {
    const unknown = e instanceof UnknownUser;
    if (!unknown) console.error("[year] fetch failed for", handle, e);
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-5 px-6 text-center">
        <h1 className="font-display text-3xl font-black sm:text-4xl">
          {unknown ? `No public contributions for @${handle}` : "That did not work"}
        </h1>
        <p className="text-muted">
          {unknown
            ? "GitHub has no public contribution data under that name. Check the spelling — it is case-insensitive, and it needs the username rather than the display name."
            : "Something went wrong on our side. Try again in a moment."}
        </p>
        <Link
          href="/"
          className="rounded-full bg-accent px-7 py-3 text-sm font-bold tracking-[0.14em] text-ground uppercase"
        >
          Try another
        </Link>
      </main>
    );
  }

  /* Reading the rank is fine for a stranger's page — it is public information
     about a public board. WRITING is what needs consent, and no write happens
     here: a lookup is someone typing a name, not that person joining. */
  const rank = leaderboardEnabled ? await rankOf(d.handle) : null;

  return (
    <YearView
      d={d}
      slot={
        leaderboardEnabled && (
          <div className="mt-10 flex flex-wrap items-baseline gap-x-3 gap-y-2 rounded-xl border border-rule bg-surface px-5 py-4">
            <span className="font-display text-2xl font-bold text-accent">{fillPct(d)}%</span>
            <span className="text-sm text-muted">of the calendar filled</span>
            {rank ? (
              <Link href="/leaderboard" className="ml-auto text-sm text-muted hover:text-accent">
                <span className="text-ink">#{rank.rank}</span> of {rank.of}
              </Link>
            ) : (
              <a
                href="/api/auth/login"
                className="ml-auto text-xs font-bold tracking-[0.14em] text-accent uppercase underline-offset-4 hover:underline"
              >
                Sign in to join the board
              </a>
            )}
          </div>
        )
      }
    />
  );
}
