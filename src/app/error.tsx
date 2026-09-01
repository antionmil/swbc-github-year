"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Transient failures are re-thrown rather than rendered, so they are never
 *  cached. This is where they land. It offers a retry, because "try again"
 *  is genuinely the right advice for a GitHub blip. */
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-display text-3xl font-bold text-balance sm:text-4xl">
        GitHub did not answer
      </h1>
      <p className="text-pretty text-muted">
        That is on their side or ours, not on you. It usually clears in a moment.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-accent px-7 py-3 text-sm font-bold tracking-[0.14em] text-ground uppercase"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-rule px-7 py-3 text-sm font-bold tracking-[0.14em] text-muted uppercase hover:border-accent hover:text-accent"
        >
          Start over
        </Link>
      </div>
    </main>
  );
}
