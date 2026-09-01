import { NextResponse, type NextRequest } from "next/server";
import { fetchYear, isValidLogin, UnknownUser } from "@/lib/github";
import { fillPct, leaderboardEnabled, rankIn, record, top } from "@/lib/leaderboard";
import { allow } from "@/lib/ratelimit";

/** Recording moved OFF the render path.
 *
 *  Writing during render forced /[username] to be dynamic, so every view of a
 *  shared poster re-ran the page and rewrote the same row. Now the page is
 *  cached HTML and this runs once per visitor, which is also what makes the
 *  placement reveal possible: the board arrives after the page, so it can
 *  animate in rather than being baked into the markup. */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!leaderboardEnabled) return NextResponse.json({ rows: [], rank: null });

  /* x-forwarded-for is client-supplied in general, but on Vercel the platform
     sets it and the leftmost entry is the real peer. Good enough to stop a
     loop; not a security boundary, and not treated as one. */
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (!allow(ip)) {
    return NextResponse.json({ error: "slow down" }, { status: 429 });
  }

  const handle = (await req.json().catch(() => ({}))).handle;
  if (typeof handle !== "string" || !isValidLogin(handle)) {
    return NextResponse.json({ error: "bad handle" }, { status: 400 });
  }

  try {
    // Cached by the fetch cache for an hour, so this is not a GitHub call per visitor.
    const d = await fetchYear(handle);
    await record(d);
    const rows = await top(100);
    return NextResponse.json({ rows, rank: rankIn(rows, d.handle), fill: fillPct(d) });
  } catch (e) {
    if (e instanceof UnknownUser) return NextResponse.json({ error: "unknown" }, { status: 404 });
    console.error("[seen] failed for", handle, e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
