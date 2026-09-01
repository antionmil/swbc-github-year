import "server-only";
import { db, leaderboardEnabled } from "@/lib/leaderboard";

/**
 * A rate limit for /api/seen that survives more than one instance.
 *
 * The exposure: every DISTINCT username costs one GitHub GraphQL call, the
 * token allows 5,000 an hour, and exhausting it takes the site down for
 * everyone until the window rolls. Repeats of the same name are free — the
 * fetch cache holds them for an hour — so the cost is in variety, which a
 * wordlist supplies cheaply.
 *
 * The first version of this counted in memory. It was measured against the
 * live site with 95 parallel requests and let every one through, because
 * Vercel spread them across instances and no single map ever reached the
 * limit. Parallel is exactly how a flood arrives, so counting in one process
 * protected nothing. The count has to be shared, which means Postgres.
 *
 * In-memory is kept in FRONT of it as a free short-circuit: on a warm instance
 * a sequential loop is stopped without touching the database at all.
 */
/* 500, not 80.
   What this protects is narrow: a scripted loop burning the 5,000/hour GitHub
   ceiling, which would error the site for everyone until the window rolls. It
   protects nothing against genuine viral traffic, because five thousand real
   people each looking up one new name exhausts the same quota and every one of
   them is under the limit.
   Meanwhile the cost of setting it low is real: mobile carriers and offices
   put hundreds of genuine visitors behind one address, and that happens
   precisely on the day a post lands. 500 an hour is a number no person reaches
   by browsing and a script passes in seconds. */
const PER_HOUR = 500;
const MAX_KEYS = 20_000;

const local = new Map<string, { n: number; hour: number }>();

function localCount(key: string, hour: number) {
  if (local.size > MAX_KEYS) {
    for (const [k, v] of local) if (v.hour !== hour) local.delete(k);
    if (local.size > MAX_KEYS) local.clear();
  }
  const cur = local.get(key);
  if (!cur || cur.hour !== hour) {
    local.set(key, { n: 1, hour });
    return 1;
  }
  cur.n += 1;
  return cur.n;
}

export async function allow(ip: string): Promise<boolean> {
  const hour = Math.floor(Date.now() / 3_600_000);

  // Free tier: catches a sequential loop that keeps hitting one instance.
  if (localCount(ip, hour) > PER_HOUR) return false;

  // Shared tier: the one that actually holds when requests fan out.
  if (!leaderboardEnabled) return true;
  try {
    const { data, error } = await db().rpc("bump", { b: `${ip}:${hour}`, h: hour });
    // Degrade OPEN. If the function has not been created yet, or Postgres is
    // unreachable, the site keeps working — a limiter must never be the thing
    // that takes it down.
    if (error) {
      console.error("[ratelimit] bump failed", error.code, error.message);
      return true;
    }
    return typeof data === "number" ? data <= PER_HOUR : true;
  } catch (e) {
    console.error("[ratelimit] bump threw", e);
    return true;
  }
}
