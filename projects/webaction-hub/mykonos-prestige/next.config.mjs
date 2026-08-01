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
      // Temporary art-direction stand-ins only (swap for real @mykonosprestigevillas assets).
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // Tree-shake large barrel packages so only what we use ships to the client.
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react"],
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
