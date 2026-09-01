import type { YearData } from "@/lib/github";

const LEVELS = ["#16171a", "#3d3320", "#6b5522", "#a37c21", "#e8b23c"];

/* A native title attribute, not a custom tooltip. It costs no JavaScript on
   the page most people arrive at from a shared link, it is keyboard and
   screen-reader friendly for free, and the alternative — a styled tooltip —
   needs a tap handler to work at all on a phone, which is where the traffic
   is. */
const DAY = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

function level(n: number, max: number) {
  if (n === 0) return 0;
  const r = n / max;
  return r > 0.66 ? 4 : r > 0.4 ? 3 : r > 0.18 ? 2 : 1;
}

/**
 * The contribution grid.
 *
 * It uses CSS grid with `1fr` columns and square cells rather than fixed
 * pixel sizes. Fixed sizes meant 53 weeks could not fit a phone, so the whole
 * thing sat in a horizontal scroller — and that scroller drew a grey bar
 * straight across the artwork. Sizing by fraction removes the overflow
 * entirely: the cells shrink to whatever width there is, on any screen, with
 * nothing to scroll and no bar to hide.
 */
export function Grid({
  d,
  gap = 2,
  months = true,
  cascade = false,
}: {
  d: YearData;
  gap?: number;
  months?: boolean;
  /** Draw the year in, week by week, once on load. */
  cascade?: boolean;
}) {
  const max = Math.max(1, ...d.calendar.flat());
  const weeks = d.calendar.length;

  return (
    <div className="w-full">
      {months && (
        <div className="relative mb-1.5 h-3.5">
          {d.months.map((m) => (
            <span
              key={`${m.label}-${m.week}`}
              className="absolute top-0 text-[9px] tracking-[0.14em] text-muted uppercase sm:text-[10px]"
              style={{ left: `${(m.week / weeks) * 100}%` }}
            >
              {m.label}
            </span>
          ))}
        </div>
      )}
      <div
        className={cascade ? "cascade grid" : "grid"}
        style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)`, gap }}
      >
        {d.calendar.map((week, i) => (
          <div key={i} className="grid" style={{ gridTemplateRows: "repeat(7, 1fr)", gap }}>
            {week.map((n, j) => (
              <div
                key={j}
                title={`${n === 0 ? "No" : n} contribution${n === 1 ? "" : "s"} · ${DAY(d.dates[i]?.[j] ?? "")}`}
                style={{
                  aspectRatio: "1",
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
  );
}
