import Link from "next/link";
import type { Row } from "@/lib/leaderboard";

const day = (iso: string | null) =>
  iso
    ? new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
      })
    : null;

export function Board({ rows }: { rows: Row[] }) {
  return (
    <section id="leaderboard" className="flex flex-col gap-5 scroll-mt-8">
      <header className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">The fullest years</h2>
        <p className="max-w-prose text-sm leading-relaxed text-muted">
          Ranked by how much of the calendar is filled — days with at least one
          contribution. Not by volume: one commit counts the same as fifty. Every
          name here was typed into the box above.
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">Nobody yet. The first username entered starts the list.</p>
      ) : (
        <ol className="flex flex-col">
          {rows.map((r, i) => (
            <li key={r.handle}>
              <Link
                href={`/${r.handle}`}
                className="flex flex-col gap-0.5 border-b border-rule py-3 transition-colors hover:border-accent"
              >
                <div className="flex items-baseline gap-3 sm:gap-5">
                  <span className="w-6 shrink-0 text-sm text-muted tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-base sm:text-lg">{r.handle}</span>
                  <span className="font-display shrink-0 text-base font-bold text-accent tabular-nums sm:text-lg">
                    {r.fill_pct}%
                  </span>
                  <span className="hidden shrink-0 text-xs text-muted tabular-nums sm:inline">
                    {r.active_days}/{r.total_days} days
                  </span>
                </div>
                {/* Each row is the twelve months ending on ITS OWN date, so two
                    rows measured months apart are two different years. */}
                <div className="flex gap-3 pl-9 text-[11px] text-muted">
                  <span className="sm:hidden">{r.active_days}/{r.total_days} days</span>
                  {day(r.to_date) && <span>Year to {day(r.to_date)}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
