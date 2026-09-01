import type { Metadata } from "next";
import Link from "next/link";
import { YearView, posterUrl } from "@/components/YearView";
import { isClean } from "@/lib/clean";
import { fetchYear, isValidLogin, UnknownUser, type YearData } from "@/lib/github";
import { RankReveal, RevealedRow } from "@/components/RankReveal";
import { fillPct, leaderboardEnabled } from "@/lib/leaderboard";

/* Cached and PUBLIC — genuinely, now. It previously declared `revalidate` and
   then wrote to Postgres during render, and a single uncached fetch opts the
   whole route out of static rendering. Every request came back
   `x-vercel-cache: MISS` with `no-store`. The recording moved to /api/seen. */
export const revalidate = 3600;

/* `revalidate` on its own does NOT make a dynamic segment cacheable — with no
   `generateStaticParams`, Next server-renders [username] on every request, and
   the response comes back `no-store`. An empty list means "pre-render nothing,
   but cache each path the first time somebody asks for it", which is exactly
   right here: the usernames are not known ahead of time, and a shared poster
   link is hit many times. */
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const handle = decodeURIComponent(username);
  if (!isValidLogin(handle) || !isClean(handle)) return { title: "Not found" };

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

function Unavailable() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="font-display text-3xl font-bold text-balance sm:text-4xl">
        That one is not available
      </h1>
      <p className="text-pretty text-muted">Try another username.</p>
      <Link
        href="/"
        className="rounded-full bg-accent px-7 py-3 text-sm font-bold tracking-[0.14em] text-ground uppercase"
      >
        Go back
      </Link>
    </main>
  );
}

export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const handle = decodeURIComponent(username);

  /* Refused before the fetch. Rendering it would put the name in the title,
     the URL and the share card. */
  if (!isClean(handle)) return <Unavailable />;

  let d: YearData;
  try {
    d = await fetchYear(handle);
  } catch (e) {
    /* A genuinely unknown username renders the friendly page, and caching that
       for an hour is right — the name will still be unknown in an hour.
       Anything ELSE (a GitHub blip, a rate limit) must be re-thrown: rendering
       a page here would cache the failure, so one bad second would show "no
       public contributions" for a real person for the next sixty minutes. */
    if (!(e instanceof UnknownUser)) {
      console.error("[year] fetch failed for", handle, e);
      throw e;
    }
    const unknown = true;
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

  return (
    <YearView
      d={d}
      slot={leaderboardEnabled && <RankReveal handle={d.handle} fill={fillPct(d)} />}
      after={leaderboardEnabled && <RevealedRow handle={d.handle} />}
    />
  );
}
