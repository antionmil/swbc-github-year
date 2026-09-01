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
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date  contributionCount } }
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
  /** derived below - nothing here needs a field the API does not return */
  total: number;
  activeDays: number;
  busiest: number;
  streak: number;
  weekendPct: number;
};

export class UnknownUser extends Error {}

export async function fetchYear(login: string): Promise<YearData> {
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
  if (json.errors?.length) throw new Error(json.errors[0].message);

  const user = json.data?.user;
  if (!user) throw new UnknownUser(login);

  const c = user.contributionsCollection;
  const weeks: number[][] = c.contributionCalendar.weeks.map(
    (w: { contributionDays: { contributionCount: number }[] }) =>
      w.contributionDays.map((d) => d.contributionCount),
  );
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
    total,
    activeDays: flat.filter((n) => n > 0).length,
    busiest: Math.max(0, ...flat),
    streak: best,
    weekendPct: total ? Math.round((weekend / total) * 100) : 0,
  };
}
