import "server-only";

/**
 * A per-instance limiter for /api/seen.
 *
 * The exposure it covers: every DISTINCT username costs one GitHub GraphQL
 * call, the token allows 5,000 an hour, and exhausting it takes the site down
 * for everyone until the window rolls. Repeats of the same name are free (the
 * fetch cache holds them for an hour), so the cost is in variety, which a
 * wordlist supplies cheaply.
 *
 * This is deliberately in memory rather than in Postgres: no new table, no
 * migration, no query on the hot path. The trade-off is honest — Vercel runs
 * several instances and each keeps its own count, so the real ceiling is the
 * limit times the instance count. That still lands far below GitHub's, which
 * is the number that matters, and it degrades to nothing if a deploy or a cold
 * start clears the map.
 */
const LIMIT = 80; // per IP per hour
const MAX_KEYS = 20_000; // bound the map so a flood cannot grow it forever

const hits = new Map<string, { n: number; hour: number }>();

export function allow(ip: string): boolean {
  const hour = Math.floor(Date.now() / 3_600_000);

  // Cheap sweep rather than a timer: drop everything from a previous hour once
  // the map gets large. Entries are worthless the moment the hour turns over.
  if (hits.size > MAX_KEYS) {
    for (const [k, v] of hits) if (v.hour !== hour) hits.delete(k);
    if (hits.size > MAX_KEYS) hits.clear();
  }

  const cur = hits.get(ip);
  if (!cur || cur.hour !== hour) {
    hits.set(ip, { n: 1, hour });
    return true;
  }
  cur.n += 1;
  return cur.n <= LIMIT;
}
