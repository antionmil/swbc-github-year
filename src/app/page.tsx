"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [busy, setBusy] = useState(false);

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = login.trim().replace(/^@/, "").replace(/^https?:\/\/github\.com\//i, "").split("/")[0];
    if (!clean) return;
    setBusy(true);
    router.push(`/${encodeURIComponent(clean)}`);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-10 px-6 py-16">
      <header className="flex flex-col gap-4 text-center">
        <p className="text-xs font-bold tracking-[0.42em] text-muted uppercase">Github presents</p>
        <h1 className="font-display text-6xl font-black sm:text-7xl">A Year in Commits</h1>
        <p className="font-display text-xl text-ink/70 italic">
          Any username. One year. As a film poster.
        </p>
      </header>

      <form onSubmit={go} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          placeholder="github username"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="flex-1 rounded-full border border-rule bg-surface px-6 py-4 text-lg outline-none placeholder:text-muted/60 focus:border-accent"
        />
        <button
          disabled={busy || !login.trim()}
          className="rounded-full bg-accent px-8 py-4 text-sm font-bold tracking-[0.14em] text-ground uppercase disabled:opacity-30"
        >
          {busy ? "Rolling…" : "Roll credits"}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        Public contributions only — the same data GitHub shows on a profile.
        Nothing is stored and no sign-in is needed.
      </p>
    </main>
  );
}
