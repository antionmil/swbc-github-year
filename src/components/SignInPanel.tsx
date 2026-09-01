/**
 * Every claim on this panel is checked against what the code actually does.
 * A sign-in screen on a domain nobody knows is the exact shape of a phishing
 * page, so vagueness here is not just unhelpful — it reads as evasive.
 */
const CAN = [
  "Read your public profile — username, name, avatar",
  "Read your contribution counts, including private ones, as numbers on the days they happened",
];

const CANNOT = [
  "Read your code, your files, or any repository contents",
  "Write anything at all — no commits, issues, stars, follows or settings",
  "Act as you anywhere on GitHub",
];

function Line({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm leading-relaxed">
      <span aria-hidden className={ok ? "text-accent" : "text-muted"}>{ok ? "✓" : "✕"}</span>
      <span className={ok ? "text-ink/85" : "text-muted"}>{children}</span>
    </li>
  );
}

export function SignInPanel({ heading, why }: { heading: string; why: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-7 px-5 py-14">
      <header className="flex flex-col gap-3 text-center">
        <h1 className="font-display text-4xl font-black">{heading}</h1>
        <p className="text-muted">{why}</p>
      </header>

      <section className="flex flex-col gap-4 rounded-2xl border border-rule bg-surface p-5 sm:p-6">
        <h2 className="text-[10px] font-bold tracking-[0.24em] text-muted uppercase">
          Exactly what this asks for
        </h2>
        <p className="text-sm text-muted">
          One permission, <span className="font-mono text-ink">read:user</span>. GitHub shows you the
          same list before you agree.
        </p>
        <ul className="flex flex-col gap-2">
          {CAN.map((t) => <Line key={t} ok>{t}</Line>)}
          {CANNOT.map((t) => <Line key={t} ok={false}>{t}</Line>)}
        </ul>
        <p className="border-t border-rule pt-4 text-sm text-muted">
          The access token is kept in an encrypted cookie in your own browser. It is never written to
          our database. Signing out deletes it, and you can revoke this app at any time from{" "}
          <a
            href="https://github.com/settings/applications"
            className="text-ink underline underline-offset-4 hover:text-accent"
          >
            your GitHub applications settings
          </a>
          .
        </p>
      </section>

      <div className="flex flex-col items-center gap-3">
        <a
          href="/api/auth/login"
          className="w-full rounded-full bg-accent px-8 py-4 text-center text-sm font-bold tracking-[0.14em] text-ground uppercase"
        >
          Sign in with GitHub
        </a>
        <p className="text-center text-xs text-muted">
          Removing yourself from the leaderboard is one click, and it deletes your row.
        </p>
        <a href="/" className="text-xs tracking-[0.18em] text-muted uppercase hover:text-accent">
          Or look up a username without signing in
        </a>
      </div>
    </main>
  );
}
