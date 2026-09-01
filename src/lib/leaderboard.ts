import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { YearData } from "./github";

/**
 * The leaderboard: who has filled the most of their calendar.
 *
 * You appear only by signing in as yourself. Looking someone up never lists
 * them: a lookup is a stranger typing a name, and being ranked on that would
 * mean anyone could enter anyone.
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
const db = () => createClient(url!, key!, { auth: { persistSession: false } });

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
          includes_private: d.viaOwnToken,
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

/** Rank plus field size, for the line on someone's own page. */
export async function rankOf(handle: string): Promise<{ rank: number; of: number } | null> {
  if (!leaderboardEnabled) return null;
  try {
    const c = db();
    const [all, mine] = await Promise.all([
      c.from("leaderboard").select("handle", { count: "exact", head: true }),
      c.from("leaderboard").select("fill_pct").eq("handle", handle.toLowerCase()).maybeSingle(),
    ]);
    if (fail("rank count", all.error) || fail("rank self", mine.error)) return null;
    if (!mine.data) return null;
    const { count: better, error } = await c
      .from("leaderboard")
      .select("handle", { count: "exact", head: true })
      .gt("fill_pct", mine.data.fill_pct);
    if (fail("rank better", error)) return null;
    return { rank: (better ?? 0) + 1, of: all.count ?? 0 };
  } catch (e) {
    console.error("[leaderboard] rank failed", e);
    return null;
  }
}

export async function removeHandle(handle: string): Promise<void> {
  if (!leaderboardEnabled) return;
  await db().from("leaderboard").delete().eq("handle", handle.toLowerCase());
}
