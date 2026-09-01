import { NextResponse, type NextRequest } from "next/server";
import { fetchViewerYear } from "@/lib/github";
import { record } from "@/lib/leaderboard";
import { consumeState, setSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const fail = (req: NextRequest, why: string) =>
  NextResponse.redirect(new URL(`/?auth=${why}`, req.nextUrl.origin));

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  // Rejected on the GitHub screen, or arrived without a code.
  if (!code) return fail(req, "cancelled");
  // The state must match the cookie this site set. If it does not, the request
  // did not begin here.
  if (!(await consumeState(state))) return fail(req, "state");

  const id = process.env.GITHUB_OAUTH_CLIENT_ID;
  const secret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!id || !secret) return fail(req, "unavailable");

  try {
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        client_id: id,
        client_secret: secret,
        code,
        redirect_uri: `${req.nextUrl.origin}/api/auth/callback`,
      }),
      cache: "no-store",
    });
    const json = await res.json();
    const token: string | undefined = json.access_token;
    if (!token) {
      console.error("[auth] no access_token", json.error);
      return fail(req, "denied");
    }

    /* The token is used exactly here and then falls out of scope. Reading the
       year through it is what makes the entry real: private contributions land
       on their actual days rather than as an unplottable total. */
    const d = await fetchViewerYear(token);
    await record(d);
    await setSession({ login: d.handle, token });
    return NextResponse.redirect(new URL("/me?joined=1", req.nextUrl.origin));
  } catch (e) {
    console.error("[auth] callback failed", e);
    return fail(req, "failed");
  }
}
