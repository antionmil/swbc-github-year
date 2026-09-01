import { NextResponse } from "next/server";

/** TEMPORARY diagnostic. Delete once the leaderboard is confirmed writing.
 *  Returns the failure CLASS and the Postgres error code — never the key,
 *  never the URL. `keyRole` is read from the key's own shape so a wrong key
 *  can be named without being shown. */
export const dynamic = "force-dynamic";

function keyRole(k?: string) {
  if (!k) return "missing";
  if (k.startsWith("sb_secret_")) return "sb_secret (ok)";
  if (k.startsWith("sb_publishable_")) return "sb_publishable (WRONG - this is the public key)";
  try {
    const role = JSON.parse(Buffer.from(k.split(".")[1], "base64").toString()).role;
    return role === "service_role" ? "service_role (ok)" : `${role} (WRONG - not service_role)`;
  } catch {
    return "unrecognised";
  }
}

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ urlSet: !!url, keySet: !!key });

  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(new URL(url).origin, key, { auth: { persistSession: false } });

  const spec = await fetch(new URL(url).origin + "/rest/v1/", {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
    .then((r) => r.json())
    .catch(() => null);
  const cols = (t: string) =>
    Object.keys(spec?.definitions?.[t]?.properties ?? {}).join(", ") || null;

  const read = await db.from("leaderboard").select("handle", { count: "exact", head: true });
  const write = await db.from("leaderboard").upsert(
    { handle: "__probe__", display_handle: "__probe__", fill_pct: 0,
      active_days: 0, total_days: 1, contributions: 0, streak: 0,
      updated_at: new Date().toISOString() },
    { onConflict: "handle" },
  );
  if (!write.error) await db.from("leaderboard").delete().eq("handle", "__probe__");

  return NextResponse.json({
    keyRole: keyRole(key),
    urlHost: new URL(url).hostname.split(".").slice(-2).join("."),
    tables: { leaderboard: cols("leaderboard"), profiles: cols("profiles") },
    urlExtraPath: new URL(url).pathname + new URL(url).search,
    read: read.error ? { code: read.error.code, message: read.error.message } : { rows: read.count },
    write: write.error ? { code: write.error.code, message: write.error.message } : "ok",
  });
}
