# A Year in Commits

Type any GitHub username, get that year as a film poster.

## Setup

    cp .env.example .env.local     # add GITHUB_TOKEN
    pnpm install && pnpm dev

`GITHUB_TOKEN` is a fine-grained token with **public read-only** access. No
repo scope. See `../prep/token-setup.md`.

## Decisions worth not re-litigating

- **No OAuth.** A server-side token returns the same PUBLIC data a visitor's
  own token would — private contributions are excluded either way — so the
  consent screen would cost conversions and unlock nothing.
- **No database.** The username is the cache key and the URL, so `/[username]`
  with `revalidate = 3600` does the whole job. A popular handle is served from
  the CDN and never touches GitHub again inside the window.
- **Rolling 12 months, not January-to-now.** A partial range returns a partial
  grid (36 weeks in testing) and renders as a broken calendar.
- **Zero-valued credits are omitted.** Real accounts routinely have 0 PRs,
  0 issues and 0 reviews; a billing block full of zeros reads as broken.
- **Flexbox only, no CSS grid** — so the poster can be handed to `next/og`
  later without a rewrite.

## Rate limit

GraphQL with a PAT is 5,000 points/hour, ~1 point per query. With hourly ISR
per username you would need thousands of *distinct* handles in an hour to feel
it.
