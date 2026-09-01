import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  /* `next build` and `next dev` both write to .next. Running a build while the
     dev server is up corrupts its state and takes the dev server down - which
     is exactly what kept killing localhost:3111. Builds now use their own
     directory so a verification build can never disturb a running dev server. */
  distDir: process.env.NEXT_DIST_DIR || ".next",

  /* The site takes no input beyond a username, sets no cookies and stores
     nothing — but these cost nothing and close the obvious gaps. */
  /* The board moved onto the home page. Without this, /leaderboard falls
     through to [username] and renders "No public contributions for
     @leaderboard", which is worse than a 404. */
  async redirects() {
    return [{ source: "/leaderboard", destination: "/#leaderboard", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};
export default nextConfig;
