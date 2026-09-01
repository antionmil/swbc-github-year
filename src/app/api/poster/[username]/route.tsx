import { ImageResponse } from "next/og";
import { Poster } from "@/components/Poster";
import { fetchYear, isValidLogin } from "@/lib/github";

export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * The poster as a PNG.
 *
 * This is what makes the site work on a phone. A fixed 1000x1500 poster cannot
 * be CSS-scaled down honestly — `transform: scale()` does not affect layout, so
 * the page kept a 1000x1500 box no matter what it looked like, which meant
 * sideways scrolling and a screen of dead space below. An <img> scales for
 * real, and gets tap-to-zoom and long-press-to-save for free.
 *
 * It is also the share image: the same route backs the OG and Twitter cards.
 *
 * THE FONT TRAP: ImageResponse cannot use a CSS font-family — it needs real
 * bytes. Google serves woff2 to a modern user-agent, which satori cannot read,
 * so we pretend to be an old browser to get a TTF. Solved once in the scaffold;
 * same helper here.
 */
/* ONE request for both weights. The site settled on a single family, so
   asking Google twice — once for 700, once for 400 — was two round trips for
   two faces of the same font, on every cold start. */
const FONT_CSS =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap";

let cache: Promise<Map<number, ArrayBuffer>> | null = null;

async function fonts(): Promise<Map<number, ArrayBuffer>> {
  if (!cache) {
    cache = (async () => {
      const out = new Map<number, ArrayBuffer>();
      try {
        const css = await (
          await fetch(FONT_CSS, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; OneDayBuilt/1.0)" },
          })
        ).text();
        // One @font-face block per weight; pair each weight with its own url.
        const faces = [...css.matchAll(/font-weight:\s*(\d+);[\s\S]*?src:\s*url\(([^)]+)\)/g)];
        await Promise.all(
          faces.map(async ([, w, url]) => {
            out.set(Number(w), await (await fetch(url)).arrayBuffer());
          }),
        );
      } catch {
        // A font failure must never take down the image.
      }
      return out;
    })();
  }
  return cache;
}

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const handle = decodeURIComponent(username);

  // Validate before spending a GraphQL call — same guard as the page.
  if (!isValidLogin(handle)) return new Response("Not found", { status: 404 });

  let data;
  try {
    data = await fetchYear(handle);
  } catch (e) {
    console.error("[poster] fetch failed for", handle, e);
    return new Response("Not found", { status: 404 });
  }

  const faces = await fonts();
  const display = faces.get(700);
  const body = faces.get(400);

  return new ImageResponse(<Poster d={data} />, {
    width: 1000,
    height: 1500,
    fonts: [
      ...(display ? [{ name: "Display", data: display, style: "normal" as const, weight: 700 as const }] : []),
      ...(body ? [{ name: "Body", data: body, style: "normal" as const, weight: 400 as const }] : []),
    ],
    headers: {
      // Long CDN cache: the poster for a username barely changes within a day.
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
