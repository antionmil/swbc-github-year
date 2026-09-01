# A Year in Commits

Type any GitHub username and see that person's last twelve months of public
contributions — as a page, and as a poster you can keep.

**Live: [githubyearcommits.onedaybuilt.com](https://githubyearcommits.onedaybuilt.com)**
· try [/torvalds](https://githubyearcommits.onedaybuilt.com/torvalds)

Built in one day (1 September 2026) as day 1 of a 26-day
[one-website-a-day run](https://onedaybuilt.com).

## The idea

Every contribution-graph tool ranks people by **volume**. This one ranks by
**consistency**: what share of the calendar has at least one contribution in
it. One commit counts the same as fifty.

That single choice drives the rest — the leaderboard, the archetype, and why a
quiet year gets a fair description instead of a low score.

## What it does

- **A year, drawn.** The contribution grid, scaled to any screen with no
  horizontal scrolling.
- **An archetype.** The Metronome, The Sprinter, The Weekend Builder — derived
  from that person's own figures, never assigned for variety.
- **A leaderboard** by calendar fill, showing the twelve-month window each row
  was measured over, because two rows measured months apart are two different
  years.
- **A poster.** A 1000×1500 PNG rendered by `next/og`, which is also the card
  that unfurls when a link is shared.

## Setup

    cp .env.example .env.local     # add GITHUB_TOKEN
    pnpm install && pnpm dev

`GITHUB_TOKEN` is a GitHub fine-grained token with **public read-only** access
and no repo scope. It reads the same public data a visitor's own token would.

The Supabase variables are optional. Without them `leaderboardEnabled` is
false and the site runs exactly as it does with them, minus the leaderboard
and the visitor counts. To enable those, create a Supabase project and run
[`supabase/schema.sql`](supabase/schema.sql) once.

## Decisions worth not re-litigating

- **No sign-in.** A server-side token returns the same public data a visitor's
  own token would, so a consent screen would cost conversions and unlock
  nothing. OAuth *was* built — it is the only way to place private
  contributions on their real days — and then removed, because a sign-in flow
  on a days-old domain got the callback URL flagged by Chrome Safe Browsing.
- **Rolling 12 months, not January-to-now.** A partial range returns a partial
  grid (36 weeks in testing) and renders as a broken calendar.
- **The page never writes to the database.** Recording a lookup during render
  opts the route out of static rendering — every view came back
  `x-vercel-cache: MISS` with `no-store`. The write moved to `/api/seen`, and
  `revalidate` alone was not enough either: a dynamic segment also needs an
  empty `generateStaticParams` before it will cache at all.
- **The grid uses fractional columns, not fixed pixels.** 53 weeks at a fixed
  cell size cannot fit a phone, so it needed a horizontal scroller — and that
  scroller drew a grey bar across the artwork.
- **The rate limit lives in Postgres, not memory.** The in-memory version was
  tested with 95 parallel requests against a limit of 80 and let every one
  through, because each serverless instance counted separately.
- **`packageManager` is pinned.** Without it Vercel infers a pnpm version from
  the lockfile format, and that guess produced `pnpm install exited with 1` on
  a repo where a clean frozen install succeeded locally every time.

## Notes

**Rate limit.** GitHub GraphQL with a token allows 5,000 points/hour at about
1 point per query. Each *distinct* username costs one call and is then cached
for an hour, so repeat traffic is free and only variety is expensive.

**Region.** `vercel.json` pins functions to `dub1`. The database is in
Ireland, and the default `iad1` put a transatlantic hop on every query.

**Private contributions.** GitHub reports a total but never which days they
fell on, so they cannot be plotted by anyone but the account owner.

Not affiliated with GitHub.
