# Instagram Integration & Scraping Guide

The site has a **live-capable Instagram feed** (the "Moments · The Journal" section)
plus several galleries seeded with clearly-labeled placeholders. This guide covers
three ways to fill them with real `@mykonosprestigevillas` content, from the most
official to the quickest.

> ⚠️ **Note on scraping:** Instagram's Terms of Service restrict automated scraping
> of the platform. The **content you own** (your own villa account's photos/reels) is
> yours to download and republish — that's what this guide assumes. For a hands-off
> live feed that never breaks ToS, use **Option A (Graph API)**. The scraping tools in
> Option C are best used only against your **own** account, ideally logged in as the
> account owner.

---

## Option A — Live feed via the Instagram Graph API (recommended)

This makes the "Moments" section auto-update whenever you post. No manual work after setup.

**Requirements**

- The Instagram account must be a **Business** or **Creator** account.
- It must be linked to a **Facebook Page**.
- A **Meta for Developers** app (free): https://developers.facebook.com/

**Steps**

1. Create an app at developers.facebook.com → add the **Instagram** product
   (Instagram API with Instagram Login, or the Basic Display successor).
2. Generate a **long-lived access token** for the account (valid ~60 days; refresh
   via a cron/serverless function or the token-refresh endpoint).
3. Create `.env.local` in the project root:

   ```bash
   INSTAGRAM_ACCESS_TOKEN=IGQVxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

4. Restart the dev server. That's it.

`lib/instagram.ts` calls
`https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp`
and revalidates hourly. If the token is missing or the call fails, it **automatically
falls back** to `public/instagram/feed.json` — the site never shows a broken feed.

Instagram media URLs are already whitelisted in `next.config.mjs`
(`*.cdninstagram.com`, `*.fbcdn.net`), so `next/image` will optimize them.

---

## Option B — Manual curation (fast, zero API)

Best when you just want to hand-pick the best shots.

1. Download the images/reel covers you want (see Option C for bulk tools, or just
   save them from the app).
2. Drop the files into `public/instagram/` (e.g. `public/instagram/sunset-01.jpg`).
3. Edit `public/instagram/feed.json` — replace each placeholder entry:

   ```json
   {
     "id": "post-01",
     "caption": "Golden hour over the Aegean",
     "mediaType": "IMAGE",
     "mediaUrl": "/instagram/sunset-01.jpg",
     "permalink": "https://www.instagram.com/p/XXXXXXXX/",
     "placeholder": false
   }
   ```

   Set `"placeholder": false` and give a real `mediaUrl` — the tile switches from the
   labeled placeholder to the real photo automatically.

---

## Option C — Bulk download tools (your own account)

### instaloader (photos + captions + metadata) — Python

```bash
pip install instaloader

# Public posts only (no login):
instaloader --no-videos --no-metadata-json profile mykonosprestigevillas

# Full quality incl. reels/video, logged in as the account owner:
instaloader --login YOUR_USERNAME mykonosprestigevillas
```

Output lands in `./mykonosprestigevillas/`. Copy the best frames into
`public/instagram/` or `public/media/real/`.

### gallery-dl (photos, alternative)

```bash
pip install gallery-dl
gallery-dl "https://www.instagram.com/mykonosprestigevillas/"
```

### yt-dlp (reels / video) — grab a sunset reel + its poster frame

```bash
pip install yt-dlp
yt-dlp "https://www.instagram.com/reel/XXXXXXXX/" -o "reel_%(id)s.%(ext)s"
# extract a poster frame for the grid:
ffmpeg -ss 2 -i reel_XXXX.mp4 -frames:v 1 public/instagram/reel_XXXX.jpg
```

**What to prioritize downloading** (per the brief):

- 🌅 Golden-hour / sunset shots from the rooftop terraces
- 🏝️ Panoramas of Delos, Rhenia and Mykonos Town
- 🏊 Infinity pool + poolside lifestyle
- 🚁 Drone / aerial frames of the estate above Kastro
- 🛥️ VIP experiences: yacht days, private chef, floating breakfast
- 🏛️ Cycladic interior/exterior detail (stone, white, gold light)

---

## Where scraped assets plug into the site

| Section | File to edit | What to change |
|---|---|---|
| Hero video | `public/media/real/intro.webm` | Already the real site video. Swap the file to change it. |
| Welcome / parallax | `components/WelcomeStory.tsx`, `Location.tsx` | Point `src` at a new file in `public/media/real/`. |
| Villa carousels | `lib/data.ts` → `villas[].gallery` | Replace `{ placeholder: true, tag: ... }` with `{ src: "/media/real/your.jpg" }`. |
| Masonry gallery | `lib/data.ts` → `gallery` | Same pattern; `span` controls tile size (`big`/`wide`/`tall`/`std`). |
| Moments feed | `public/instagram/feed.json` **or** Graph API token | See Options A/B above. |

Every placeholder on the live site is tagged **"Replace with @mykonosprestigevillas · …"**
so you can see exactly which slot each asset belongs in.
