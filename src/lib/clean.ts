import { englishDataset, englishRecommendedTransformers, RegExpMatcher } from "obscenity";

/**
 * What this site will and will not put its name to.
 *
 * Everything shown here comes from GitHub — usernames, display names, bios,
 * repository names — and none of it is written by us. A leaderboard is an
 * editorial act: putting a name on it is a choice, and some names should not
 * be on a page with your name at the bottom of it.
 *
 * The matcher handles word boundaries and leetspeak, which a plain substring
 * search does not: "assassin", "analysis", "Cocktail" and "Scunthorpe" all
 * pass, "b00bs" does not. It is not exhaustive — "f_u_c_k" gets through — so
 * treat it as a floor, not a guarantee.
 */
const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

export function isClean(text: string | null | undefined): boolean {
  if (!text) return true;
  return !matcher.hasMatch(text);
}

/**
 * GitHub usernames are case-insensitive, and people capitalise them however
 * they like — so a leaderboard ends up reading "Laura, antionmil,
 * Rich-Harris". Lowercasing every one of them is the only way the column
 * looks like a single list rather than three.
 */
export const displayHandle = (h: string) => h.toLowerCase();
