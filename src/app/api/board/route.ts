import { NextResponse } from "next/server";
import { leaderboardEnabled, top } from "@/lib/leaderboard";

/** Always live. The home page renders a cached copy for a fast first paint;
 *  this is what makes it correct a moment later. */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!leaderboardEnabled) return NextResponse.json({ rows: [] });
  try {
    return NextResponse.json({ rows: await top(100) });
  } catch (e) {
    console.error("[board] read failed", e);
    return NextResponse.json({ rows: [] });
  }
}
