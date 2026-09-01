import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * The session cookie carries the GitHub login and the OAuth access token.
 *
 * It is ENCRYPTED, not merely signed: a signed cookie is readable by anyone
 * holding it, and this one contains a token. AES-256-GCM also authenticates,
 * so a tampered cookie fails to decrypt rather than decoding to something
 * attacker-chosen.
 *
 * The token is `read:user` only. It cannot write anything, cannot see private
 * repository contents, and exists so GitHub will place a person's private
 * contributions on their real days when they view their own page.
 */
const NAME = "gh_session";
const STATE = "gh_oauth_state";
const MAX_AGE = 60 * 60 * 24 * 30;

export type Session = { login: string; token: string };

function key() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set.");
  return scryptSync(s, "gh-year-session", 32);
}

function seal(v: Session) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(JSON.stringify(v), "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString("base64url")).join(".");
}

function open(raw: string): Session | null {
  try {
    const [iv, tag, body] = raw.split(".").map((p) => Buffer.from(p, "base64url"));
    if (!iv || !tag || !body) return null;
    const d = createDecipheriv("aes-256-gcm", key(), iv);
    d.setAuthTag(tag);
    const out = Buffer.concat([d.update(body), d.final()]).toString("utf8");
    const v = JSON.parse(out) as Session;
    return v.login && v.token ? v : null;
  } catch {
    return null;
  }
}

export async function setSession(v: Session) {
  (await cookies()).set(NAME, seal(v), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get(NAME)?.value;
  return raw ? open(raw) : null;
}

export async function clearSession() {
  (await cookies()).delete(NAME);
}

/** CSRF for the OAuth round trip: a random value goes out in the redirect and
 *  is echoed back by GitHub. If the two disagree, the callback did not start
 *  here and is rejected. */
export async function issueState() {
  const s = randomBytes(16).toString("hex");
  (await cookies()).set(STATE, s, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return s;
}

export async function consumeState(got: string | null) {
  const jar = await cookies();
  const want = jar.get(STATE)?.value ?? null;
  jar.delete(STATE);
  if (!want || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  // Constant-time: `===` on a secret leaks its prefix through timing.
  return a.length === b.length && timingSafeEqual(a, b);
}
