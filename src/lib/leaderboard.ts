import "server-only";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { isClean } from "./clean";
import type { YearData } from "./github";

/**
 * The leaderboard: who has filled the most of their calendar.
 *
 * You appear by being looked up. Everything here is public GitHub data — the
 * same numbers on that person's own profile page — so the row states no claim
 * of identity. `removeHandle` exists and the page says how to use it.
 *
 * NOTE ON THE WINDOW: every row covers the twelve months ending on the day it
 * was measured, so two rows measured six months apart describe two different
 * years. `to_date` is stored and shown for exactly that reason, and a row is
 * rewritten each time its owner visits their own page.
 *
 * Everything degrades to "no leaderboard" when the env vars are absent, so the
 * site keeps working before Supabase is provisioned.
 */
/** Only the ORIGIN is wanted. The dashboard shows the project URL in several
 *  places, and some of them carry a path (".../rest/v1") or a trailing slash.
 *  supabase-js appends its own "/rest/v1/<table>", so anything extra produces
 *  a doubled path and PostgREST rejects it with PGRST125 "Invalid path
 *  specified in request URL" — on the write only, which makes it look like a
 *  permissions problem rather than a typo. Normalising here ends that. */
function origin(raw?: string) {
  if (!raw) return undefined;
  try {
    return new URL(raw.trim()).origin;
  } catch {
    console.error("[leaderboard] SUPABASE_URL is not a valid URL");
    return undefined;
  }
}

const url = origin(process.env.SUPABASE_URL);
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const leaderboardEnabled = Boolean(url && key);

/** Service-role client. Server-only — this key must never reach the browser,
 *  which is what the `server-only` import at the top enforces. */
export const db = () => createClient(url!, key!, { auth: { persistSession: false } });

export type Row = {
  handle: string;
  fill_pct: number;
  active_days: number;
  total_days: number;
  contributions: number;
  streak: number;
  updated_at: string;
  from_date: string | null;
  to_date: string | null;
  includes_private: boolean;
};

/** Fill rate = days with at least one contribution / days in the range. */
export function fillPct(d: YearData) {
  const totalDays = d.calendar.flat().length || 1;
  return Math.round((d.activeDays / totalDays) * 1000) / 10;
}

/** supabase-js RESOLVES on a database error — it returns `{ error }` rather
 *  than throwing. Ignoring that field is how a rejected write becomes silent:
 *  no exception, no log, and a leaderboard that stays empty with no clue why.
 *  Every call in this file inspects `error` for that reason. */
function fail(where: string, error: { code?: string; message?: string } | null) {
  if (!error) return false;
  console.error(`[leaderboard] ${where} failed`, error.code, error.message);
  return true;
}

export async function record(d: YearData): Promise<void> {
  if (!leaderboardEnabled) return;
  // A leaderboard is an editorial act. Some names do not go on it.
  if (!isClean(d.handle)) return;
  try {
    const { error } = await db()
      .from("leaderboard")
      .upsert(
        {
          handle: d.handle.toLowerCase(),
          display_handle: d.handle,
          fill_pct: fillPct(d),
          active_days: d.activeDays,
          total_days: d.calendar.flat().length,
          contributions: d.total,
          streak: d.streak,
          from_date: d.from,
          to_date: d.to,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "handle" },
      );
    fail("upsert", error);
  } catch (e) {
    // A leaderboard write must never break someone's poster.
    console.error("[leaderboard] upsert failed", e);
  }
}

export async function top(limit = 100): Promise<Row[]> {
  if (!leaderboardEnabled) return [];
  try {
    const { data, error } = await db()
      .from("leaderboard")
      .select(
        "handle:display_handle, fill_pct, active_days, total_days, contributions, streak, updated_at, from_date, to_date, includes_private",
      )
      .order("fill_pct", { ascending: false })
      .order("contributions", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as Row[];
  } catch (e) {
    console.error("[leaderboard] read failed", e);
    return [];
  }
}

/** Rank and field size, derived from rows ALREADY fetched.
 *  This used to be three more round trips to Postgres (count, self, better).
 *  The board is at most a hundred rows and the page renders it anyway, so
 *  computing here costs nothing and removes three transatlantic hops. */
export function rankIn(rows: Row[], handle: string) {
  const i = rows.findIndex((r) => r.handle.toLowerCase() === handle.toLowerCase());
  return i < 0 ? null : { rank: i + 1, of: rows.length };
}

export async function removeHandle(handle: string): Promise<void> {
  if (!leaderboardEnabled) return;
  await db().from("leaderboard").delete().eq("handle", handle.toLowerCase());
}

/** The home page's copy of the board.
 *
 *  Supabase is reached with an uncached fetch, and ONE of those during render
 *  opts the whole route out of static rendering — which is why every page was
 *  coming back `x-vercel-cache: MISS` with `no-store`. Wrapping the read makes
 *  the home page cacheable again. Thirty seconds is short enough that a new
 *  entry shows up almost immediately, and the person who just joined sees
 *  their own placement on their own page, live, either way.
 */
export const topCached = unstable_cache(async () => top(100), ["board-top"], {
  revalidate: 30,
});
