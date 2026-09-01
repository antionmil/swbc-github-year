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
const QUERY = `
query($login:String!, $from:DateTime!, $to:DateTime!) {
  user(login:$login) {
    login
    name
    avatarUrl
    contributionsCollection(from:$from, to:$to) {
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
      }
    }
  }
}`;

export type Repo = { name: string; language: string | null; commits: number };
export type YearData = {
  handle: string;
  name: string | null;
  avatar: string | null;
  from: string;
  to: string;
  totals: { commits: number; prs: number; issues: number; reviews: number; repos: number };
  topRepos: Repo[];
  calendar: number[][];
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



export async function fetchYear(login: string): Promise<YearData> {
  // Reject before spending a call. Anything malformed cannot be a real user.
  if (!isValidLogin(login)) throw new UnknownUser(login);

  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set.");

  // A rolling 12 months. January-to-now returns a partial grid (36 weeks in
  // testing) and renders as a broken calendar.
  const to = new Date();
  const from = new Date(to);
  from.setFullYear(from.getFullYear() - 1);

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { authorization: `bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      query: QUERY,
      variables: { login, from: from.toISOString(), to: to.toISOString() },
    }),
    next: { revalidate: 3600 },
  });

  if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
  const json = await res.json();

  /* An unknown username comes back as BOTH data.user:null AND an errors array
     carrying type NOT_FOUND. Checking errors first threw the generic error and
     the friendly "no public contributions" state was unreachable in production.
     A typo is the most common thing a visitor does - it must not look like a
     crash. */
  const notFound = (json.errors ?? []).some(
    (e: { type?: string }) => e.type === "NOT_FOUND",
  );
  if (notFound) throw new UnknownUser(login);
  if (json.errors?.length) throw new Error(json.errors[0].message);

  const user = json.data?.user;
  if (!user) throw new UnknownUser(login);

  const c = user.contributionsCollection;
  type Week = { firstDay: string; contributionDays: { contributionCount: number }[] };
  const rawWeeks: Week[] = c.contributionCalendar.weeks;
  const weeks: number[][] = rawWeeks.map((w) => w.contributionDays.map((d) => d.contributionCount));

  // A label at each week where the month changes — derived from the data, so
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
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    totals: {
      commits: c.totalCommitContributions,
      prs: c.totalPullRequestContributions,
      issues: c.totalIssueContributions,
      reviews: c.totalPullRequestReviewContributions,
      repos: c.totalRepositoriesWithContributedCommits,
    },
    topRepos: c.commitContributionsByRepository.map(
      (r: { repository: { name: string; primaryLanguage: { name: string } | null }; contributions: { totalCount: number } }) => ({
        name: r.repository.name,
        language: r.repository.primaryLanguage?.name ?? null,
        commits: r.contributions.totalCount,
      }),
    ),
    calendar: weeks,
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
