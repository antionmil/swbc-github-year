import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-display text-3xl font-bold text-balance sm:text-4xl">
        Nothing here
      </h1>
      <p className="text-pretty text-muted">
        That page does not exist. A GitHub username does — try one.
      </p>
      <Link
        href="/"
        className="rounded-full bg-accent px-7 py-3 text-sm font-bold tracking-[0.14em] text-ground uppercase"
      >
        Look someone up
      </Link>
    </main>
  );
}
