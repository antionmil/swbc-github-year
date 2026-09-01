import type { YearData } from "@/lib/github";

/**
 * The poster — ONE component, rendered two ways.
 *
 * It is used in the DOM and handed to `next/og` (satori) to produce the PNG.
 * That is why every style here is inline rather than a Tailwind class: satori
 * does not process `className`, and keeping a separate "image version" would
 * guarantee the two drift apart.
 *
 * Satori rules this file obeys:
 *   - any element with more than one child sets display:flex explicitly
 *   - flexbox only, never CSS grid
 *   - no CSS variables, no `break-words`, no radial-gradient
 */

const LEVELS = ["#16171a", "#3d3320", "#6b5522", "#a37c21", "#e8b23c"];

const BONE = "#ece6da";
const DIM = "#8b8578";
const GOLD = "#e8b23c";
const RULE = "#2a2823";

const DISPLAY = "Display, system-ui, sans-serif";
const BODY = "Body, system-ui, sans-serif";

/* GitHub usernames run to 39 characters. At a fixed 104px "@AntoineKoerber"
   already touched both edges of a 1000px poster. */
function titleSize(handle: string) {
  const n = handle.length + 1;
  if (n <= 10) return 104;
  if (n <= 14) return 88;
  if (n <= 18) return 70;
  if (n <= 24) return 54;
  return 42;
}

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
/** "2025 — 2026" alongside a Jan-Dec axis read as a calendar year, which the
 *  data never was. Naming the months removes the contradiction. */
function monthYear(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return `${MONTH_ABBR[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function level(n: number, max: number) {
  if (n === 0) return 0;
  const r = n / max;
  return r > 0.66 ? 4 : r > 0.4 ? 3 : r > 0.18 ? 2 : 1;
}

const label = (size: number, tracking: number, color = DIM) =>
  ({
    fontSize: size,
    letterSpacing: tracking,
    textTransform: "uppercase" as const,
    color,
    fontFamily: BODY,
  }) as const;

export function Poster({ d }: { d: YearData }) {
  const flat = d.calendar.flat();
  const max = Math.max(1, ...flat);
  const langs = [...new Set(d.topRepos.map((r) => r.language).filter(Boolean))] as string[];

  /* Credits worth 0 are omitted. A real account returned 0 PRs, 0 issues and
     0 reviews — a billing block full of zeros reads as broken, not honest. */
  const credits: [string, string][] = [
    ["Directed by", "@" + d.handle],
    ...(d.topRepos[0] ? ([["Starring", d.topRepos[0].name]] as [string, string][]) : []),
    ...(d.topRepos.length > 1
      ? ([["Featuring", d.topRepos.slice(1, 3).map((r) => r.name).join(" and ")]] as [string, string][])
      : []),
    ...(langs[0] ? ([["Original language", langs[0]]] as [string, string][]) : []),
    ...(d.totals.reviews ? ([["Second unit", `${d.totals.reviews} reviews`]] as [string, string][]) : []),
    ...(d.totals.issues ? ([["Casting", `${d.totals.issues} issues`]] as [string, string][]) : []),
    ...(d.streak ? ([["Longest take", `${d.streak} days`]] as [string, string][]) : []),
    ...(d.busiest ? ([["Busiest day", `${d.busiest} in one day`]] as [string, string][]) : []),
    ...(d.weekendPct ? ([["Weekend shoots", `${d.weekendPct}% of the year`]] as [string, string][]) : []),
    ...(langs.length ? ([["Shot on location in", langs.join(", ")]] as [string, string][]) : []),
  ];

  const stats: [string | number, string][] = [
    [d.totals.commits.toLocaleString(), "Commits"],
    ...(d.totals.prs ? ([[d.totals.prs, "Pull requests"]] as [string | number, string][]) : []),
    [d.activeDays, "Active days"],
    [d.totals.repos, "Repositories"],
  ];

  return (
    <div
      style={{
        width: 1000,
        height: 1500,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "#08090b",
        padding: "76px 76px 54px",
        fontFamily: BODY,
      }}
    >
      <div style={{ display: "flex", ...label(15, 6.3) }}>One Day Built presents</div>

      {/* key art — the contribution graph */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 72 }}>
        <div style={{ display: "flex", flexDirection: "row", gap: 3 }}>
          {d.calendar.map((week, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {week.map((n, j) => (
                <div
                  key={j}
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: 2,
                    background: LEVELS[level(n, max)],
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        {/* Labels sit at the week where the month actually changes. Hardcoded
            Jan-Dec described a calendar year the data never covered — the range
            is a rolling 12 months. */}
        <div style={{ display: "flex", flexDirection: "row", width: 848, marginTop: 14, position: "relative", height: 16 }}>
          {d.months.map((m) => (
            <div
              key={`${m.label}-${m.week}`}
              style={{
                display: "flex",
                position: "absolute",
                left: m.week * 16,
                ...label(12, 2.4),
              }}
            >
              {m.label}
            </div>
          ))}
        </div>
      </div>

      {/* title */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 76 }}>
        <div style={{ display: "flex", ...label(19, 9.5, GOLD), fontWeight: 700 }}>
          A Year in Commits
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontSize: titleSize(d.handle),
            lineHeight: 0.94,
            fontWeight: 900,
            color: BONE,
            fontFamily: DISPLAY,
          }}
        >
          @{d.handle}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 22,
            fontSize: 26,
            letterSpacing: 11,
            color: DIM,
            fontFamily: DISPLAY,
          }}
        >
          {monthYear(d.from)} — {monthYear(d.to)}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 30,
            maxWidth: 700,
            textAlign: "center",
            fontSize: 27,
            lineHeight: 1.42,
            color: BONE,
            opacity: 0.82,
                        fontFamily: DISPLAY,
          }}
        >
          {d.total.toLocaleString()} contributions across {d.activeDays} days.
          {d.streak > 1 ? ` The longest unbroken run was ${d.streak}.` : ""}
          {d.hasPrivate ? ` Plus ${d.privateCount.toLocaleString()} in private.` : ""}
        </div>
      </div>

      {/* headline stats */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          gap: 64,
          marginTop: 46,
        }}
      >
        {stats.map(([n, k]) => (
          <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{ display: "flex", fontSize: 46, fontWeight: 700, color: GOLD, fontFamily: DISPLAY }}
            >
              {n}
            </div>
            <div style={{ display: "flex", marginTop: 9, ...label(12, 3.1) }}>{k}</div>
          </div>
        ))}
      </div>

      {/* cast */}
      {d.topRepos.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 64 }}>
          <div style={{ display: "flex", marginBottom: 6, ...label(12, 4.3) }}>
            In order of appearance
          </div>
          {d.topRepos.slice(0, 3).map((r) => (
            <div
              key={r.name}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "baseline",
                gap: 16,
                marginTop: 34,
              }}
            >
              <div style={{ display: "flex", fontSize: 40, color: BONE, fontFamily: DISPLAY }}>
                {r.name}
              </div>
              <div style={{ display: "flex", ...label(13, 2.6, "#a37c21") }}>
                {r.commits.toLocaleString()} commits{r.language ? ` · ${r.language}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexGrow: 1 }} />

      {/* billing block */}
      <div style={{ display: "flex", width: 848, height: 1, background: RULE, marginBottom: 26 }} />
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          width: 848,
          lineHeight: 1.95,
          ...label(11.5, 1.7),
        }}
      >
        {credits.map(([k, v], i) => (
          <div key={k} style={{ display: "flex", flexDirection: "row" }}>
            {i > 0 && <div style={{ display: "flex", padding: "0 10px", color: RULE }}>•</div>}
            <div style={{ display: "flex", flexDirection: "row", gap: 6 }}>
              <div style={{ display: "flex" }}>{k}</div>
              <div style={{ display: "flex", fontWeight: 700, color: BONE }}>{v}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", marginTop: 24, ...label(10.5, 3.2, "#4a4740") }}>
        Not affiliated with GitHub · public contribution data
      </div>
    </div>
  );
}
