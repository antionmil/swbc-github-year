import type { YearData } from "@/lib/github";

const LEVELS = ["#16171a", "#3d3320", "#6b5522", "#a37c21", "#e8b23c"];

function level(n: number, max: number) {
  if (n === 0) return 0;
  const r = n / max;
  return r > 0.66 ? 4 : r > 0.4 ? 3 : r > 0.18 ? 2 : 1;
}

/**
 * The contribution grid, for the WEB page.
 *
 * 53 weeks will never fit legibly across a phone, and shrinking the cells to
 * 4px makes a smear rather than a graph. So the grid keeps readable cells and
 * scrolls sideways inside its own container — the same thing GitHub does, and
 * the reason the page itself never has to scroll.
 */
export function Grid({
  d,
  cell = 12,
  gap = 3,
  months = true,
  cascade = false,
}: {
  d: YearData;
  cell?: number;
  gap?: number;
  months?: boolean;
  /** Draw the year in, week by week, once on load. */
  cascade?: boolean;
}) {
  const max = Math.max(1, ...d.calendar.flat());
  const CELL = cell;
  const GAP = gap;
  const step = CELL + GAP;

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div style={{ width: d.calendar.length * step }}>
        {months && (
        <div className="relative mb-1.5 h-4">
          {d.months.map((m) => (
            <span
              key={`${m.label}-${m.week}`}
              className="absolute text-[10px] tracking-[0.18em] text-muted uppercase"
              style={{ left: m.week * step }}
            >
              {m.label}
            </span>
          ))}
        </div>
        )}
        <div className={`flex ${cascade ? "cascade" : ""}`} style={{ gap: GAP }}>
          {d.calendar.map((week, i) => (
            <div key={i} className="flex flex-col" style={{ gap: GAP }}>
              {week.map((n, j) => (
                <div
                  key={j}
                  title={`${n} contribution${n === 1 ? "" : "s"}`}
                  style={{
                    width: CELL,
                    height: CELL,
                    borderRadius: 2,
                    background: LEVELS[level(n, max)],
                    // Stagger by WEEK, not by cell: the year should read as
                    // sweeping left to right, not as 366 unrelated pops.
                    ...(cascade ? { animationDelay: `${i * 0.018}s` } : {}),
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
