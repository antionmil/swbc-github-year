"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isValidLogin, normaliseLogin } from "@/lib/login";

export function LookupForm() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normaliseLogin(login);
    if (!isValidLogin(clean)) {
      setErr("That is not a GitHub username — letters, numbers and hyphens only.");
      return;
    }
    setErr(null);
    setBusy(true);
    router.push(`/${encodeURIComponent(clean)}`);
  };

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={go} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          placeholder="github username"
          aria-label="GitHub username"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-full border border-rule bg-surface px-6 py-4 text-lg outline-none placeholder:text-muted/60 focus:border-accent"
        />
        <button
          disabled={busy || !login.trim()}
          className="rounded-full bg-accent px-8 py-4 text-sm font-bold tracking-[0.14em] text-ground uppercase disabled:opacity-30"
        >
          {busy ? "Reading…" : "See the year"}
        </button>
      </form>
      {err && <p className="text-center text-sm text-accent">{err}</p>}
    </div>
  );
}
