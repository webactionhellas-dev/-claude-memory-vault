import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Hide the on-screen Next.js dev indicator badge.
  devIndicators: false,
  // Pin the workspace root to this project (a stray lockfile lives in the home dir).
  outputFileTracingRoot: __dirname,
  images: {
    formats: ["image/avif", "image/webp"],
    // Allow the higher quality we use on gallery/hero photos (default is 75).
    qualities: [75, 90, 95],
    remotePatterns: [
      // Instagram CDN — the Graph API returns media URLs on these hosts.
      { protocol: "https", hostname: "*.cdninstagram.com" },
      { protocol: "https", hostname: "*.fbcdn.net" },
      { protocol: "https", hostname: "scontent.cdninstagram.com" },
      // Temporary art-direction stand-ins only (swap for real @aegeanhouse assets).
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // Security headers on every route (mirror the fleet security gate, Group D5).
  // The CSP allows Google Fonts, Instagram CDN images, and Next's inline runtime;
  // tighten script-src/style-src with nonces before a high-security launch.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; base-uri 'self'; object-src 'none'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://graph.instagram.com; frame-ancestors 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
  // Tree-shake large barrel packages so only what we use ships to the client.
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react"],
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
