---
name: grk-racing-site
description: GRK (Greek Racing Kid) cinematic drift/car-spotting site — Next.js 16 + GSAP + Lenis in claude projects/grk-site; preview port 3042; real IG photos + enriched sections (ethos/disciplines/feed/numbers) 2026-07-17
metadata: 
  node_type: memory
  type: project
  originSessionId: 88149d92-42c9-455e-94ef-39ff47ee2ad8
---

Building a cinematic, futuristic site for **GRK "Greek Racing Kid"** — a Greek **drifting + car-spotting** content creator. Folder `claude projects/grk-site`, dev preview port **3042** (config added to the ROOT `claude projects/.claude/launch.json`, using the `npm --prefix grk-site` pattern the other sites use — not the project-local `.claude/`).

**Stack:** Next.js 16.2.10 + React 19.2.4 + GSAP 3.15 + Lenis 1.3.25 + Tailwind v4.

**Brand direction (owner, via user, 2026-07-17):** GRK is *"all about having fun while being a serious driver."* That fun+serious duality is now the spine of the copy — the ethos line is "Dead serious about the driving. Not serious about anything else." Content is drift + street spotting + **offroad** (#offroadgrk is a real, growing lane), all-Greek, all-original.

**Verified social facts (2026-07-17):**
- TikTok `@greekracingkids` — "GRK", 4,027 followers, 167K likes
- Instagram `@greekracingkids` — "GRK", **4,707 followers, 146 posts**, bio "ALL GREEK & ALL ORIGINAL CONTENT / DM LETS GO FOR A RIDE!!!"
- Instagram `@greekracingkids` — "GRK", **4,707 followers, 146 posts**
- Instagram `@offroadgrk` — "GRK / POWERED BY @greekracingkids", **56 followers, 11 posts** (all offroad reels; shares posts with the main account)
- Instagram `@greekracingkid` — "NOS" — **AGE-RESTRICTED (18+) profile**; un-scrapable logged-out, count unknown, not mined.
- TikTok `@greekracingkids` — 4,027 followers, 167K likes.
- **Combined reach = 8,790+** (`totalFollowers` in content.ts sums verified follower counts: 4,707 + 56 + 4,027; NOS uncounted).
- Open web still has nothing: no articles, real name, or city.

**Photos SOLVED (2026-07-17):** the login "blocker" was beatable. The Claude in Chrome extension never connected (`list_connected_browsers` = `[]` again this session — the user being signed into Chrome with the same email is NOT the same as installing/opening the extension side panel). Instead, the **in-app Browser pane** (`mcp__Claude_Browser__*`) loads the logged-out public IG profile fine: decline the cookie banner, close the sign-up modal, then `javascript_tool` reads all grid `<img>` from `instagram.f*.fbcdn.net` — **photo posts expose 1080px thumbnails** (`p1080x1080`/`s1080x1080` in the `stp=` param; reels only give 320–640 video-cover frames). Download the signed CDN URLs with `curl -A <UA> -e https://www.instagram.com/` — they save as real JPEGs (no expiry once on disk). Contact-sheet trick to pick shots: `sharp` is in node_modules, composite thumbs into one PNG and Read it.

**Full-res "actual post" scrape (better than grid thumbs):** from a tab already ON instagram.com origin, run an in-page `fetch('/p/<shortcode>/embed/captioned/',{credentials:'include'})` loop and regex out `class="EmbeddedMediaImage"...src="(...)"` (unescape `&amp;`). This returns the **native regular_photo (1080) or full reel-cover** — no `s150`/`s640` cap. Server-side `curl` of the embed does NOT work (returns a consent shell); must be the in-page fetch with cookies. Batched ~11 posts in one call this way. 21 real images now in `/public/grk/` (some up to 2268×4032). Captions also live in the embed HTML (`class="Caption"`).

**Why:** the site is about a real person, so invented/stock imagery would be worse than none. `lib/content.ts` enforces this with a `Fact<T>` = verified | pending union; `MediaSlot` renders hazard-stripe "Awaiting photo" placeholders for anything pending, so missing assets stay visible instead of being papered over.

**Owner directive (2026-07-17): NOT an e-shop.** He rejected the original uniform 3-col photo grid — a grid of equal cells reads as *product placement / a catalogue*. The site must be **informative, "our story" style**. So `Runs.tsx` was deleted and replaced by `Story.tsx`: an editorial narrative of `Chapter` objects, each with its own prose + photo, alternating left/right with one full-bleed beat. No cards, no hover-lift, no browse affordance. **Do not reintroduce a tile grid.**

**Story copy is now WRITTEN (2026-07-17)** to the fun+serious brief — all four chapters flipped `pending()`→`verified()` with `source = BRIEF` ("Authored to GRK brief..."). Headings: "Serious about driving. Nothing else." / "It started as a laugh." / "Hold it. Catch it." / "The ones you see once." Grounded in confirmed cars/collabs (Huracán, Lancia Delta, E30), NOT in invented biography (no real name/age/specific origin claimed). If GRK later gives real specifics, tighten these.

**Photos wired in (2026-07-17):** real GRK images live in `/public/grk/` (5 used + 7 extras kept as a swap library). All 5 media slots in `lib/content.ts` flipped `pending()`→`verified()` (source = the IG permalink), while the chapter TEXT stays `pending()` — still needs GRK's words. Mapping: hero.still = subaru-gc8 (night JDM motion, C6gxS6EtRIi); "what" = athens-night (DNX5hDIIaaz); "start" = e30-red sunset (DFiqFB7NSNj); "drift" full-bleed = m2-comp orange M2 (DEnTfyGtfxL); "hunt" = lambo-huracan (C582lOBNKxi).

**Layout gotcha fixed:** `MediaSlot` hardcodes `position:relative` on its wrapper, which overrode the hero's `absolute inset-0`, collapsing the hero image to height 0 (invisible — only showed once a real photo replaced the text placeholder). Fix in `Hero.tsx`: wrap MediaSlot in a `<div className="absolute inset-0 z-0">` and pass MediaSlot `className="h-full w-full"`. The hero gradient (`via-asphalt-000/75`) was tuned for a bright daytime photo, so it heavily darkens night shots — acceptable with the bright-headlight Subaru; keep in mind if swapping to a darker image.

**Page enriched (2026-07-17)** — owner said it felt "too simple and empty." Added four new sections + components, all fed from `lib/content.ts` (new exports: `ethos`, `disciplines`, `stats`, `feed`, plus expanded `copy`). Page order now: Hero → **Ethos** (manifesto band, two-tone statement) → Story → **Disciplines** (`Three ways to play` — 3 image-led panels: drift/hunt/offroad, each links to its post; NOT a tile grid) → **Feed** (`Straight from the feed` — two horizontal marquee reels of real posts scrolling opposite ways, CSS `.reel`/`.reel-track` in globals.css, hover-pause + manual scroll; a showreel read, deliberately not a shop) → **Numbers** (real stats band: 167K/4,707/146/100%) → Follow. The marquee doubles the list so `translate3d(-50%)` loops seamlessly.

**How to apply:** to swap a media slot, point its `verified()` value at another `/public/grk/*.jpg` or download more via the embed method above. Extras still unused: e30-newyears, mini-jcw (both in feed now), post-daily, post-offroad-b, post-wing, offroad-premium. Do not fill slots with stock cars.

**Revision 2 (2026-07-17, later):**
- **Hero-image request BLOCKED:** owner wanted the hero swapped to `instagram.com/p/DDGBaY0NTqA/` — that post is from the 18+ `@greekracingkid` account ("People under 18 can't see this content"), un-scrapable logged-out. Hero left as subaru-gc8; owner must send the file or connect a logged-in browser.
- **Slip HUD removed:** owner called it "the button with the random numbers". Deleted `SlipHud.tsx` + its render in `page.tsx`. Kept `DriftScroll` (Lenis smooth-scroll + `.drift` skew signature) — it has no visible numbers.
- **Story photos swapped** (owner wanted the pointed ones "more relevant, higher quality, without letters"): start `e30-red`→`e30-newyears` (clean red E30, better origin car); drift `m2-comp`→`post-wing` (red-lit BMW M, 2268×4032, text-free, cinematic). Displaced `e30-red` + `m2-comp` moved into the feed reel.
- **Socials rebuilt:** all IG pages listed separately + `@offroadgrk` added + TikTok; each card shows individual count + a blurb; `Social` type gained `blurb`. Numbers band still keeps individual counts.
- **Footer upgraded** (advanced but minimal): big `GRK.` wordmark + tagline + "DM lets go for a ride" button, Channels nav, Explore nav (anchors — added `id`s `#top` on Hero, `#disciplines`, `#feed`), and a HUD baseline row (© / all-Greek-all-original / back-to-top).
- **Lenis verify pain:** Lenis hijacks `window.scrollTo`/hash jumps, so screenshotting specific sections needs repeated wheel `scroll` calls (`scroll_to` ref + read_page also flaky on this tall page). Budget extra steps for visual verification.

Design decisions worth keeping (see [[grk-design-language]]).
