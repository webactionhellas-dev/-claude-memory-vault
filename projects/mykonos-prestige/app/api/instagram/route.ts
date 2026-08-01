import { NextResponse } from "next/server";
import { getInstagramFeed } from "@/lib/instagram";

/**
 * GET /api/instagram?limit=9
 * Serves the live Graph API feed when INSTAGRAM_ACCESS_TOKEN is set,
 * otherwise the shipped placeholder feed. Cached at the edge for an hour.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 9, 24);

  const posts = await getInstagramFeed(limit);

  return NextResponse.json(
    { posts },
    { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
