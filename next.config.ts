import type { NextConfig } from "next";

/**
 * C4 / ADR-003: the browser talks to the BE only through `/api/*` on the FE origin, so the session cookie issued by
 * the BE is first-party (Vercel FE → Render BE). BE_URL is server-side configuration, never exposed to the bundle.
 */
const backend = process.env.BE_URL ?? "http://127.0.0.1:5080";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backend}/:path*` }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
