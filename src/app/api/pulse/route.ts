import { NextResponse, type NextRequest } from "next/server";
import { db, leaderboardEnabled } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

/** A random id the browser made for itself. Nothing else is accepted, and
 *  nothing else is stored — no IP, no user agent, no referrer. */
const OK = /^[0-9a-f-]{8,64}$/i;

export async function POST(req: NextRequest) {
  if (!leaderboardEnabled) return NextResponse.json({});

  const body = await req.json().catch(() => ({}));
  const sid = body.sid;
  const view = body.view === true;
  if (typeof sid !== "string" || !OK.test(sid)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }

  try {
    const { data, error } = await db().rpc("pulse", { s: sid, v: view });
    if (error) {
      console.error("[pulse] failed", error.code, error.message);
      return NextResponse.json({});
    }
    return NextResponse.json(data ?? {});
  } catch (e) {
    console.error("[pulse] threw", e);
    return NextResponse.json({});
  }
}
