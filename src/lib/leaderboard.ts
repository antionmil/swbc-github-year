import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { YearData } from "./github";

/**
 * The leaderboard: who has filled the most of their calendar.
 *
 * You appear by being looked up — nobody is scraped in. That is the hook: the
 * ranking exists so someone wonders where they would land, and the only way to
 * find out is to run their own name.
 *
 * NOTE ON CONSENT: a lookup can be someone else running your name, so people
 * can end up listed without acting. The data is public either way, but that is
 * why `removeHandle` exists and why the page says how to get off it.
 *
 * Everything degrades to "no leaderboard" when the env vars are absent, so the
 * site keeps working before Supabase is provisioned.
 */
const url = process.env.SUPABASE_URL;
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
};

/** Fill rate = days with at least one contribution / days in the range. */
export function fillPct(d: YearData) {
  const totalDays = d.calendar.flat().length || 1;
  return Math.round((d.activeDays / totalDays) * 1000) / 10;
}

export async function record(d: YearData): Promise<void> {
  if (!leaderboardEnabled) return;
  try {
    await db()
      .from("profiles")
      .upsert(
        {
          handle: d.handle.toLowerCase(),
          display_handle: d.handle,
          fill_pct: fillPct(d),
          active_days: d.activeDays,
          total_days: d.calendar.flat().length,
          contributions: d.total,
          streak: d.streak,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "handle" },
      );
  } catch (e) {
    // A leaderboard write must never break someone's poster.
    console.error("[leaderboard] upsert failed", e);
  }
}

export async function top(limit = 100): Promise<Row[]> {
  if (!leaderboardEnabled) return [];
  try {
    const { data, error } = await db()
      .from("profiles")
      .select("handle:display_handle, fill_pct, active_days, total_days, contributions, streak, updated_at")
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
    const [{ count: of }, mine] = await Promise.all([
      c.from("profiles").select("handle", { count: "exact", head: true }),
      c.from("profiles").select("fill_pct").eq("handle", handle.toLowerCase()).maybeSingle(),
    ]);
    if (!mine.data) return null;
    const { count: better } = await c
      .from("profiles")
      .select("handle", { count: "exact", head: true })
      .gt("fill_pct", mine.data.fill_pct);
    return { rank: (better ?? 0) + 1, of: of ?? 0 };
  } catch (e) {
    console.error("[leaderboard] rank failed", e);
    return null;
  }
}

export async function removeHandle(handle: string): Promise<void> {
  if (!leaderboardEnabled) return;
  await db().from("profiles").delete().eq("handle", handle.toLowerCase());
}
