import { NextResponse, type NextRequest } from "next/server";
import { removeHandle } from "@/lib/leaderboard";
import { clearSession, getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** You can only ever delete yourself: the handle comes from the signed session
 *  cookie, never from the request body. There is no parameter to tamper with. */
export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.redirect(new URL("/leaderboard", req.nextUrl.origin), 303);
  await removeHandle(s.login);
  await clearSession();
  return NextResponse.redirect(new URL("/?removed=1", req.nextUrl.origin), 303);
}
