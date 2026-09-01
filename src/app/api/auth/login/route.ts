import { NextResponse, type NextRequest } from "next/server";
import { issueState } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!id) return NextResponse.redirect(new URL("/?auth=unavailable", req.nextUrl.origin));

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", id);
  url.searchParams.set("redirect_uri", `${req.nextUrl.origin}/api/auth/callback`);
  /* read:user and nothing more. It is what makes GitHub place a person's
     private contributions on their real days. It grants no repository access,
     no write of any kind, and the token is discarded after one call. */
  url.searchParams.set("scope", "read:user");
  url.searchParams.set("state", await issueState());
  return NextResponse.redirect(url);
}
