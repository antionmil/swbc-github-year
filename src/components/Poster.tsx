import type { YearData } from "@/lib/github";

/**
 * The poster. Ported from prep/poster/index.html, which was designed in
 * advance precisely so build day is a data swap rather than a design job.
 *
 * The contribution graph IS the key art. Recolouring it off GitHub green is
 * what makes it a poster instead of a screenshot of someone's profile.
 *
 * Flexbox only, no CSS grid — so this same markup can be handed to next/og
 * later without a rewrite (satori supports flex, not grid).
 */

const LEVELS = ["#16171a", "#3d3320", "#6b5522", "#a37c21", "#e8b23c"];

/* GitHub usernames run to 39 characters. At a fixed 104px "@AntoineKoerber"
   already touched both edges of a 1000px poster, so anything longer would
   overflow it. Step the size down by length instead of letting it bleed. */
function titleSize(handle: string) {
  const n = handle.length + 1; // the @
  if (n <= 10) return 104;
  if (n <= 14) return 88;
  if (n <= 18) return 70;
  if (n <= 24) return 54;
  return 42;
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function level(n: number, max: number) {
  if (n === 0) return 0;
  const r = n / max;
  return r > 0.66 ? 4 : r > 0.4 ? 3 : r > 0.18 ? 2 : 1;
}

export function Poster({ d }: { d: YearData }) {
  const flat = d.calendar.flat();
  const max = Math.max(1, ...flat);
  const langs = [...new Set(d.topRepos.map((r) => r.language).filter(Boolean))] as string[];

  /* Credits with a value of 0 are omitted entirely. Testing against a real
     account returned 0 PRs, 0 issues and 0 reviews — and a billing block full
     of zeros reads as a broken page, not an honest one. A shorter block reads
     as designed. */
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
      id="poster"
      className="relative flex w-[1000px] shrink-0 flex-col items-center overflow-hidden px-[76px] pt-[76px] pb-[54px]"
      style={{ background: "#08090b", minHeight: 1500, fontFamily: "var(--font-body)" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 34%, rgba(232,178,60,.10) 0%, rgba(8,9,11,0) 62%)",
        }}
      />

      <p className="z-10 text-[15px] font-semibold tracking-[0.42em] text-[#8b8578] uppercase">
        Github presents
      </p>

      {/* key art */}
      <div className="z-10 mt-[72px] flex flex-col items-center">
        <div className="flex flex-row gap-[3px]">
          {d.calendar.map((week, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {week.map((n, j) => (
                <div
                  key={j}
                  className="h-[13px] w-[13px] rounded-[2px]"
                  style={{ background: LEVELS[level(n, max)] }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-[14px] flex w-[848px] flex-row">
          {MONTHS.map((m) => (
            <span key={m} className="flex grow text-[12px] tracking-[0.2em] text-[#8b8578] uppercase">
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* title */}
      <div className="z-10 mt-[76px] flex flex-col items-center">
        <p className="text-[19px] font-bold tracking-[0.5em] text-[#e8b23c] uppercase">
          A Year in Commits
        </p>
        <h1
          className="mt-[20px] max-w-[848px] text-center leading-[0.94] font-black break-words text-[#ece6da]"
          style={{ fontFamily: "var(--font-display)", fontSize: titleSize(d.handle) }}
        >
          @{d.handle}
        </h1>
        <p
          className="mt-[22px] text-[26px] tracking-[0.44em] text-[#8b8578]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {d.from.slice(0, 4)} — {d.to.slice(0, 4)}
        </p>
        <p
          className="mt-[30px] max-w-[700px] text-center text-[27px] leading-[1.42] text-[#ece6da] italic opacity-80"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {d.total.toLocaleString()} contributions across {d.activeDays} days.
          {d.streak > 1 ? ` The longest unbroken run was ${d.streak}.` : ""}
        </p>
      </div>

      {/* headline stats */}
      <div className="z-10 mt-[46px] flex flex-row justify-center gap-[64px]">
        {stats.map(([n, k]) => (
          <div key={k} className="flex flex-col items-center">
            <span
              className="text-[46px] leading-none font-bold text-[#e8b23c]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {n}
            </span>
            <span className="mt-[9px] text-[12px] tracking-[0.26em] text-[#8b8578] uppercase">{k}</span>
          </div>
        ))}
      </div>

      {/* cast */}
      {d.topRepos.length > 0 && (
        <div className="z-10 mt-[64px] flex flex-col items-center">
          <p className="mb-[6px] text-[12px] tracking-[0.36em] text-[#8b8578] uppercase">
            In order of appearance
          </p>
          {d.topRepos.slice(0, 3).map((r) => (
            <div key={r.name} className="mt-[34px] flex flex-row items-baseline gap-[16px]">
              <span
                className="text-[40px] text-[#ece6da]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {r.name}
              </span>
              <span className="text-[13px] tracking-[0.2em] text-[#a37c21] uppercase">
                {r.commits.toLocaleString()} commits{r.language ? ` · ${r.language}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grow" />

      {/* billing block */}
      <div className="z-10 mb-[26px] h-px w-[848px] bg-[#2a2823]" />
      <div className="z-10 flex w-[848px] flex-row flex-wrap justify-center text-[11.5px] leading-[1.95] tracking-[0.15em] text-[#8b8578] uppercase">
        {credits.map(([k, v], i) => (
          <span key={k} className="flex flex-row">
            {i > 0 && <span className="px-[10px] text-[#2a2823]">&bull;</span>}
            <span className="flex flex-row gap-[6px]">
              <span>{k}</span>
              <b className="font-bold text-[#ece6da]">{v}</b>
            </span>
          </span>
        ))}
      </div>
      <p className="z-10 mt-[24px] text-[10.5px] tracking-[0.3em] text-[#4a4740] uppercase">
        Rendered from public contribution data
      </p>
    </div>
  );
}
