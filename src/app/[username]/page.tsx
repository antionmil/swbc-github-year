import type { Metadata } from "next";
import Link from "next/link";
import { Grid } from "@/components/Grid";
import { fetchYear, isValidLogin, UnknownUser, type YearData } from "@/lib/github";
import { fillPct, leaderboardEnabled, rankOf, record } from "@/lib/leaderboard";

export const revalidate = 3600;

const posterUrl = (h: string) => `/api/poster/${encodeURIComponent(h)}`;

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthYear = (iso: string) => {
  const d = new Date(iso + "T00:00:00Z");
  return `${MONTH[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

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

function Stat({ n, k }: { n: string | number; k: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-display text-3xl leading-none font-bold text-accent sm:text-5xl">{n}</span>
      <span className="text-[10px] tracking-[0.2em] text-muted uppercase sm:text-xs">{k}</span>
    </div>
  );
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

  /* Recording happens on a successful lookup only, and the page is ISR-cached
     for an hour, so this runs at most once per username per hour. */
  await record(d);
  const rank = await rankOf(d.handle);
  const fill = fillPct(d);

  const stats: [string | number, string][] = [
    [d.totals.commits.toLocaleString(), "Commits"],
    ...(d.totals.prs ? ([[d.totals.prs, "Pull requests"]] as [string | number, string][]) : []),
    [d.activeDays, "Active days"],
    [d.streak, "Longest streak"],
    [d.totals.repos, "Repositories"],
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="flex flex-col gap-3">
        <p className="text-[10px] font-bold tracking-[0.3em] text-muted uppercase">
          A year in commits
        </p>
        <h1 className="font-display text-4xl font-black break-words sm:text-6xl">@{d.handle}</h1>
        {/* The range is a rolling 12 months. Naming the months removes the
            contradiction with the old "2025 — 2026" over a Jan–Dec axis. */}
        <p className="text-sm tracking-[0.18em] text-muted uppercase">
          {monthYear(d.from)} — {monthYear(d.to)}
        </p>
      </header>

      <section className="mt-10">
        <Grid d={d} />
        {d.hasPrivate && (
          <p className="mt-4 text-sm text-muted">
            Plus <span className="text-ink">{d.privateCount.toLocaleString()}</span> contributions in
            private repositories. GitHub reports the total but never which days they fell on, so they
            cannot be plotted.
          </p>
        )}
      </section>

      <section className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3">
        {stats.map(([n, k]) => (
          <Stat key={k} n={n} k={k} />
        ))}
      </section>

      {leaderboardEnabled && (
        <Link
          href="/leaderboard"
          className="mt-10 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-rule bg-surface px-5 py-4 hover:border-accent"
        >
          <span className="font-display text-2xl font-bold text-accent">{fill}%</span>
          <span className="text-sm text-muted">of the calendar filled</span>
          {rank && (
            <span className="ml-auto text-sm text-muted">
              <span className="text-ink">#{rank.rank}</span> of {rank.of}
            </span>
          )}
        </Link>
      )}

      <p className="font-display mt-10 text-xl leading-snug text-ink/80 italic sm:text-2xl">
        {d.total.toLocaleString()} contributions across {d.activeDays} days.
        {d.streak > 1 ? ` The longest unbroken run was ${d.streak}.` : ""}
      </p>

      {d.topRepos.length > 0 && (
        <section className="mt-12 flex flex-col gap-4">
          <h2 className="text-[10px] font-bold tracking-[0.24em] text-muted uppercase">
            Most committed to
          </h2>
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
          <a href="https://onedaybuilt.com" className="underline underline-offset-4">
            onedaybuilt.com
          </a>
        </p>
      </footer>
    </main>
  );
}
