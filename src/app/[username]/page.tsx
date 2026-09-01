import type { Metadata } from "next";
import Link from "next/link";
import { fetchYear, isValidLogin, UnknownUser } from "@/lib/github";

export const revalidate = 3600;

function posterUrl(handle: string) {
  return `/api/poster/${encodeURIComponent(handle)}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const handle = decodeURIComponent(username);
  if (!isValidLogin(handle)) return { title: "Not found" };

  const title = `@${handle} — A Year in Commits`;
  const description = `A year of @${handle}'s public GitHub contributions, as a film poster.`;
  /* The poster IS the share image. Without this a link unfurls as a black
     rectangle, which for a site whose whole point is sharing is most of the
     value gone. */
  const images = [{ url: posterUrl(handle), width: 1000, height: 1500, alt: title }];
  return {
    title,
    description,
    openGraph: { title, description, images, type: "website" },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const handle = decodeURIComponent(username);

  let data;
  try {
    data = await fetchYear(handle);
  } catch (e) {
    /* A typo is the most common thing a visitor does. It must not look like a
       crash — and the upstream message never reaches them, since it can carry
       rate-limit text or scope hints. */
    const unknown = e instanceof UnknownUser;
    if (!unknown) console.error("[year] fetch failed for", handle, e);
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-5 px-6 text-center">
        <h1 className="font-display text-3xl font-black sm:text-4xl">
          {unknown ? `No public contributions for @${handle}` : "That did not work"}
        </h1>
        <p className="text-muted">
          {unknown
            ? "GitHub has no public contribution data under that name. Check the spelling — it is case-insensitive, and it needs the username rather than the display name."
            : "Something went wrong on our side. Try again in a moment."}
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

  return (
    <main className="mx-auto flex min-h-dvh max-w-[1000px] flex-col items-center gap-6 px-4 py-6 sm:px-6 sm:py-10">
      {/* An <img> scales for real, unlike a CSS-transformed poster: the layout
          box matches what is drawn, so there is no sideways scroll and no dead
          space. On a phone it also gives tap-to-zoom and long-press-to-save. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={posterUrl(data.handle)}
        alt={`@${data.handle}'s year in commits`}
        width={1000}
        height={1500}
        className="h-auto w-full rounded-lg"
      />

      {data.total === 0 && (
        <p className="max-w-md text-center text-sm text-muted">
          @{data.handle} has no public contributions in the last year. The poster is
          real — it is just a quiet year.
        </p>
      )}

      <div className="flex flex-col items-center gap-3 pb-8 text-center">
        <p className="text-sm text-muted">
          Long-press or right-click the poster to save it. This link shows the same
          thing for anyone.
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
