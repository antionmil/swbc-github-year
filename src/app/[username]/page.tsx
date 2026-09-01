import type { Metadata } from "next";
import Link from "next/link";
import { Poster } from "@/components/Poster";
import { fetchYear, UnknownUser } from "@/lib/github";

/* One hour of ISR. The username IS the cache key, so a popular handle is
   served from the CDN and never touches GitHub again within the window.
   That is also the whole rate-limit story: 5,000 points/hour, ~1 per query. */
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const handle = decodeURIComponent(username);
  return {
    title: `@${handle} — A Year in Commits`,
    description: `A year of @${handle}'s public GitHub contributions, as a film poster.`,
  };
}

export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const handle = decodeURIComponent(username);

  let data;
  try {
    data = await fetchYear(handle);
  } catch (e) {
    /* An unknown username is not an error state — it is a normal thing a
       visitor does. GraphQL returns user:null for it, and an error page there
       reads as broken software rather than a typo. */
    const unknown = e instanceof UnknownUser;
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-5 px-6 text-center">
        <h1 className="font-display text-4xl font-black">
          {unknown ? `No public contributions for @${handle}` : "That did not work"}
        </h1>
        <p className="text-muted">
          {unknown
            ? "GitHub has no public contribution data under that name. Check the spelling — it is case-insensitive but must be the username, not the display name."
            : e instanceof Error
              ? e.message
              : "Something went wrong."}
        </p>
        <Link
          href="/"
          className="rounded-full bg-accent px-7 py-3 text-sm font-bold tracking-[0.14em] text-ground uppercase"
        >
          Try another
        </Link>
      </main>
    );
  }

  const empty = data.total === 0;

  return (
    <main className="flex flex-col items-center gap-8 px-4 py-10">
      <div className="w-full max-w-[1000px] origin-top scale-[0.34] sm:scale-[0.5] md:scale-[0.7] lg:scale-100">
        <Poster d={data} />
      </div>

      {empty && (
        <p className="max-w-md text-center text-sm text-muted">
          @{data.handle} has no public contributions in the last year. The poster is
          real — it is just a quiet year.
        </p>
      )}

      <div className="flex flex-col items-center gap-3 pb-10">
        <p className="text-sm text-muted">
          Screenshot it, or share this link — it renders the same for anyone.
        </p>
        <Link
          href="/"
          className="rounded-full border border-rule px-7 py-3 text-sm font-bold tracking-[0.14em] text-muted uppercase hover:border-accent hover:text-accent"
        >
          Another username
        </Link>
      </div>
    </main>
  );
}
