/* ============================================================
   INSTAGRAM FEED, dynamic with graceful static fallback
   ------------------------------------------------------------
   Priority order:
     1. Instagram Graph API  (set INSTAGRAM_ACCESS_TOKEN in .env.local)
     2. /public/instagram/feed.json  (placeholder / manually curated)

   See INSTAGRAM.md for the full setup + scraping guide.
   ============================================================ */

import fs from "node:fs";
import path from "node:path";

export type IgMediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";

export type IgPost = {
  id: string;
  caption: string;
  mediaType: IgMediaType;
  mediaUrl: string; // image/video URL, or "" for a placeholder tile
  thumbnailUrl?: string;
  permalink: string;
  timestamp?: string;
  placeholder?: boolean; // true => render the labeled art-direction tile
};

const GRAPH_FIELDS =
  "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp";

/** Read the curated/placeholder feed shipped with the site. */
function readStaticFeed(): IgPost[] {
  try {
    const file = path.join(process.cwd(), "public", "instagram", "feed.json");
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw) as IgPost[];
  } catch {
    return [];
  }
}

/** Map a raw Graph API node to our IgPost shape. */
function mapGraphNode(n: Record<string, unknown>): IgPost {
  const type = (n.media_type as IgMediaType) ?? "IMAGE";
  return {
    id: String(n.id),
    caption: (n.caption as string) ?? "",
    mediaType: type,
    // Videos expose a poster via thumbnail_url; images use media_url.
    mediaUrl:
      type === "VIDEO"
        ? (n.thumbnail_url as string) ?? (n.media_url as string) ?? ""
        : (n.media_url as string) ?? "",
    thumbnailUrl: (n.thumbnail_url as string) ?? undefined,
    permalink: (n.permalink as string) ?? "https://www.instagram.com/aegeanhouse/",
    timestamp: (n.timestamp as string) ?? undefined,
  };
}

/**
 * Fetch the live feed from the Instagram Graph API.
 * Returns null on any failure so callers can fall back to the static feed.
 */
async function fetchGraphFeed(limit: number): Promise<IgPost[] | null> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return null;

  const url = `https://graph.instagram.com/me/media?fields=${GRAPH_FIELDS}&limit=${limit}&access_token=${token}`;
  try {
    // Revalidate hourly, keeps the feed fresh without hammering the API.
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: Record<string, unknown>[] };
    if (!json.data?.length) return null;
    return json.data.map(mapGraphNode);
  } catch {
    return null;
  }
}

/**
 * Public accessor used by the API route / server components.
 * Live API when configured, otherwise the shipped placeholder feed.
 */
export async function getInstagramFeed(limit = 9): Promise<IgPost[]> {
  const live = await fetchGraphFeed(limit);
  if (live && live.length) return live.slice(0, limit);
  return readStaticFeed().slice(0, limit);
}
