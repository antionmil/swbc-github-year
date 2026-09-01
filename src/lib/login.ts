/**
 * GitHub username rules, in one place.
 *
 * Deliberately NOT in github.ts: that module carries `server-only` (so the
 * token can never be bundled into the client), which means the browser cannot
 * import from it. The form wants the same rule for instant feedback, so the
 * rule lives here and both sides import it. One definition, no drift.
 *
 * 1-39 characters, alphanumeric with single internal hyphens, no leading or
 * trailing hyphen.
 */
const VALID = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export const isValidLogin = (s: string) => VALID.test(s);

/** Accepts "@name", a profile URL, or a bare name. */
export function normaliseLogin(input: string) {
  return input
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .split(/[/?#]/)[0];
}
