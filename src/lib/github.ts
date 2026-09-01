import "server-only";
import { isValidLogin } from "./login";

export { isValidLogin };
/**
 * One GraphQL call, server-side token, any public username.
 *
 * Verified against the live API on 2026-09-01: returns 53 weeks on a rolling
 * 12-month range and every field this poster needs.
 *
 * No OAuth. A server-side token returns exactly the same PUBLIC data a
 * visitor's own token would - private contributions are excluded either way -
 * so the consent screen would cost conversions and unlock nothing.
 */
const FIELDS = `
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalPullRequestReviewContributions
      totalRepositoriesWithContributedCommits
      commitContributionsByRepository(maxRepositories: 5) {
        repository { name  primaryLanguage { name } }
        contributions { totalCount }
      }
      restrictedContributionsCount
      hasAnyRestrictedContributions
      contributionCalendar {
        totalContributions
        weeks { firstDay  contributionDays { date  contributionCount } }
      }`;

/* One query, on the app token: exactly what a stranger can see. There is no
   sign-in, so there is no path by which this site sees more than that. */
const QUERY = `query($login:String!, $from:DateTime!, $to:DateTime!) {
  user(login:$login) { login name avatarUrl bio followers { totalCount } contributionsCollection(from:$from, to:$to) { ${FIELDS} } }
}`;

export type Repo = { name: string; language: string | null; commits: number };
export type YearData = {
  handle: string;
  name: string | null;
  avatar: string | null;
  /** Shown so a visitor can tell at a glance whether this is the right
   *  account — a display name and a face settle it faster than a username. */
  bio: string | null;
  followers: number;
  from: string;
  to: string;
  totals: { commits: number; prs: number; issues: number; reviews: number; repos: number };
  topRepos: Repo[];
  calendar: number[][];
  /** The date behind each cell, same shape as `calendar`. Already fetched —
   *  it was being discarded, which is why the tooltip could only say how many
   *  and never which day. */
  dates: string[][];
  /** Month labels positioned by WEEK INDEX. The range is a rolling 12 months,
   *  so hardcoding Jan-Dec described a calendar year the data never covered. */
  months: { label: string; week: number }[];
  /** Private contributions are a COUNT only - GitHub never tells a third party
   *  which days they fell on, so they cannot be plotted. It reads 0 unless the
   *  user has switched on private-contribution visibility on their profile. */
  privateCount: number;
  hasPrivate: boolean;
  /** derived below - nothing here needs a field the API does not return */
  total: number;
  activeDays: number;
  busiest: number;
  streak: number;
  weekendPct: number;
};

export class UnknownUser extends Error {}

/** A rolling 12 months. January-to-now returns a partial grid (36 weeks in
 *  testing) and renders as a broken calendar. */
function windowNow() {
  const to = new Date();
  const from = new Date(to);
  from.setFullYear(from.getFullYear() - 1);
  return { from, to };
}

async function call(token: string, query: string, variables: Record<string, unknown>, cacheable: boolean) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { authorization: `bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
    // A viewer query is scoped to one person's token and must never be shared.
    ...(cacheable ? { next: { revalidate: 3600 } } : { cache: "no-store" as const }),
  });

  if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
  const json = await res.json();

  /* An unknown username comes back as BOTH data.user:null AND an errors array
     carrying type NOT_FOUND. Checking errors first threw the generic error and
     the friendly "no public contributions" state was unreachable in
     production. A typo is the most common thing a visitor does - it must not
     look like a crash. */
  if ((json.errors ?? []).some((e: { type?: string }) => e.type === "NOT_FOUND")) {
    throw new UnknownUser("");
  }
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

type RawUser = {
  login: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  followers: { totalCount: number } | null;
  contributionsCollection: Record<string, never> & Record<string, unknown>;
};

function shape(user: RawUser, from: Date, to: Date): YearData {
  const c = user.contributionsCollection as unknown as {
    totalCommitContributions: number;
    totalPullRequestContributions: number;
    totalIssueContributions: number;
    totalPullRequestReviewContributions: number;
    totalRepositoriesWithContributedCommits: number;
    commitContributionsByRepository: {
      repository: { name: string; primaryLanguage: { name: string } | null };
      contributions: { totalCount: number };
    }[];
    restrictedContributionsCount: number;
    hasAnyRestrictedContributions: boolean;
    contributionCalendar: {
      weeks: { firstDay: string; contributionDays: { date: string; contributionCount: number }[] }[];
    };
  };

  const rawWeeks = c.contributionCalendar.weeks;
  const weeks: number[][] = rawWeeks.map((w) => w.contributionDays.map((d) => d.contributionCount));
  const dates: string[][] = rawWeeks.map((w) => w.contributionDays.map((d) => d.date));

  // A label at each week where the month changes - derived from the data, so
  // the axis always matches the range actually fetched.
  const MONTH = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const months: { label: string; week: number }[] = [];
  let lastMonth = -1;
  rawWeeks.forEach((w, i) => {
    const m = new Date(w.firstDay + "T00:00:00Z").getUTCMonth();
    if (m !== lastMonth) {
      // skip a label in the final week - it would collide with the edge
      if (i < rawWeeks.length - 1) months.push({ label: MONTH[m], week: i });
      lastMonth = m;
    }
  });

  const flat = weeks.flat();
  let streak = 0;
  let best = 0;
  for (const n of flat) {
    streak = n > 0 ? streak + 1 : 0;
    if (streak > best) best = streak;
  }
  const total = flat.reduce((a, b) => a + b, 0);
  const weekend = weeks.reduce((a, w) => a + (w[0] ?? 0) + (w[6] ?? 0), 0);

  return {
    handle: user.login,
    name: user.name,
    avatar: user.avatarUrl ?? null,
    bio: user.bio ?? null,
    followers: user.followers?.totalCount ?? 0,
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    totals: {
      commits: c.totalCommitContributions,
      prs: c.totalPullRequestContributions,
      issues: c.totalIssueContributions,
      reviews: c.totalPullRequestReviewContributions,
      repos: c.totalRepositoriesWithContributedCommits,
    },
    topRepos: c.commitContributionsByRepository.map((r) => ({
      name: r.repository.name,
      language: r.repository.primaryLanguage?.name ?? null,
      commits: r.contributions.totalCount,
    })),
    calendar: weeks,
    dates,
    months,
    privateCount: c.restrictedContributionsCount ?? 0,
    hasPrivate: Boolean(c.hasAnyRestrictedContributions),
    total,
    activeDays: flat.filter((n) => n > 0).length,
    busiest: Math.max(0, ...flat),
    streak: best,
    weekendPct: total ? Math.round((weekend / total) * 100) : 0,
  };
}

/** What a stranger can see. Runs on the app token. */
export async function fetchYear(login: string): Promise<YearData> {
  // Reject before spending a call. Anything malformed cannot be a real user.
  if (!isValidLogin(login)) throw new UnknownUser(login);
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set.");

  const { from, to } = windowNow();
  let data;
  try {
    data = await call(token, QUERY, { login, from: from.toISOString(), to: to.toISOString() }, true);
  } catch (e) {
    if (e instanceof UnknownUser) throw new UnknownUser(login);
    throw e;
  }
  if (!data?.user) throw new UnknownUser(login);
  return shape(data.user, from, to);
}
