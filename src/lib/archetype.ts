import type { YearData } from "./github";

/**
 * A label, not a score.
 *
 * The numbers already say what someone did. Nobody quotes "1,247 minutes of
 * jazz" — they quote "top 0.5% of Radiohead listeners". A name for the shape
 * of a year is the part that gets screenshotted.
 *
 * Two rules held throughout: every label is DERIVED from this person's own
 * figures, never assigned for variety; and none of them are unkind. A quiet
 * public year usually means the work happened somewhere a graph cannot see,
 * so the label describes the year rather than the person.
 */
export type Archetype = { name: string; line: string };

export function archetype(d: YearData): Archetype {
  const days = d.calendar.flat().length || 366;
  const fill = (d.activeDays / days) * 100;
  const perActive = d.activeDays ? d.total / d.activeDays : 0;
  const weekend = d.weekendPct;

  // Ordered by how distinctive the signal is, not by how common it is.
  if (d.streak >= 60)
    return {
      name: "The Metronome",
      line: `${d.streak} days without a single gap. Whatever else changed, you showed up.`,
    };

  if (weekend >= 40)
    return {
      name: "The Weekend Builder",
      line: `Two days in seven carried ${weekend}% of your year.`,
    };

  if (weekend <= 8 && d.activeDays >= 120)
    return {
      name: "The Nine-to-Fiver",
      line: `Only ${weekend}% of it landed at a weekend. The work stayed at work.`,
    };

  if (perActive > 0 && d.busiest >= perActive * 5)
    return {
      name: "The Sprinter",
      line: `Your busiest day carried ${d.busiest.toLocaleString()}, against ${Math.round(perActive)} on a typical one. You work in bursts.`,
    };

  if (fill >= 45)
    return {
      name: "The Steady Hand",
      line: `${d.activeDays} days out of ${days}, spread right across the year.`,
    };

  if (fill < 12)
    return {
      name: "The Quiet Year",
      line: `${d.activeDays} days in public. Plenty happens where a contribution graph cannot see it.`,
    };

  return {
    name: "The Builder",
    line: `${d.total.toLocaleString()} contributions across ${d.activeDays} days.`,
  };
}

/**
 * "#47 of 200" says nothing and says less as the board grows. "Top 12%" means
 * the same thing at any size and is the line worth screenshotting.
 *
 * Below a couple of dozen entries a percentage is theatre — "top 50% of four
 * people" — so the plain rank is shown until there are enough to divide by.
 */
const ENOUGH = 25;

/** Above this the word "top" turns sarcastic — last place should not read
 *  "Top 100%". The plain rank says the same thing without the dig. */
const STILL_A_BOAST = 75;

export function placing(rank: number, of: number): string {
  if (of < ENOUGH) return `#${rank} of ${of}`;
  const pct = Math.max(1, Math.ceil((rank / of) * 100));
  return pct <= STILL_A_BOAST ? `Top ${pct}%` : `#${rank} of ${of}`;
}
