# DIONYSSOS HOTEL SKOPELOS — Redesign Strategy
*Prepared June 2026 · Companion to the working prototype in this folder (`index.html`)*

---

## 1. Brand Repositioning

**The core problem:** the current site sells a *room*. Guests at this price point are buying a *summer*. The hotel's real assets — position above the old town, three-generation family hospitality, the pool terrace, the view — are mentioned but never *felt*.

**New positioning statement**
> The family-kept hotel above the rooftops of Skopelos Town — where the old town, the pool terrace and the Aegean are all five minutes from your pillow.

**Value proposition:** *Location no villa can match + warmth no resort can fake, at a price no five-star can touch.*

**Brand personality:** the well-travelled local friend. Warm, unhurried, quietly confident. Never "luxury" as marble and gold — luxury as *time, position, and being known by name*.

**Emotional selling points (in priority order)**
1. **Position** — sleep above one of Greece's most beautiful towns; walk everywhere.
2. **Belonging** — family-run; barman knows your order by day two.
3. **The balcony moment** — breakfast over pool, rooftops and sea (this photo is the brand).
4. **The green island** — Skopelos as the un-crowded, pine-forested alternative to Santorini/Mykonos.

**Messaging framework**
| Layer | Message |
|---|---|
| Hero statement | *Where Skopelos slows to the pace of summer* |
| Support | *A family-kept hotel in a garden above the old town — the harbour five minutes away on foot, the noise of the world considerably further.* |
| Taglines (alternates) | *Above the rooftops of Skopelos* · *The island, arranged around you* · *Three generations of summers* |
| Booking CTA voice | "Check availability" / "Book direct — best rate, and you deal with the family, not a platform" |

**What we deliberately do NOT claim:** "5-star", "luxury resort", "boutique design hotel". A 3-star property claiming 5-star language gets punished in reviews. We claim *position, warmth, and authenticity* — which photograph honestly and over-deliver.

---

## 2. UX Audit of the Current Site

| # | Issue | Severity | Business impact | Fix |
|---|---|---|---|---|
| 1 | No emotional hero — generic welcome text, small images | Critical | First 3 seconds decide booking intent; bounce | Full-screen aerial hero + one-line promise (done in prototype) |
| 2 | Booking is a naked link to `dionyssos.reserve-online.net` with no date pre-selection | Critical | Every extra step ≈ −10–20% conversion | Availability bar with dates/guests passed into the engine (prototype hero) |
| 3 | Room names are SEO strings ("Twin or Double Bedded Standard Room with Side Sea & Pool View") | High | Zero desire; reads like inventory | Named rooms with stories: Garden / Pool & Sea / Sea View (prototype) |
| 4 | Wedding capability (350 guests!) buried under "Pool > Events" | High | Weddings are the highest-ADR product the hotel owns | Dedicated Weddings section + page; direct enquiry CTA (prototype) |
| 5 | No social proof on homepage beyond one quote | High | Trust gap for international bookers | Review section + (at launch) live Booking.com/Google review feed |
| 6 | Navigation labels: "Info Book", "Luviana Hotel Amenities" (template leftovers!) | High | Reads as neglect; kills price perception | Clean 6-item nav (prototype). Remove template artifacts |
| 7 | No mobile booking path — no sticky CTA, no tap-to-call | High | >65% of hotel traffic is mobile | Sticky Call/Reserve bar after hero (prototype) |
| 8 | Photography unedited and unordered; aerials (the best assets) barely used | Medium | The drone shots ARE the product; they're hidden | Hero + estate sections lead with aerials (prototype) |
| 9 | No destination content | Medium | "Skopelos hotel" searchers are choosing the *island* first | Skopelos guide section + future Journal pages |
| 10 | Mixed-language artifacts, EN at `/` and EL at `/el/` with broken `/en/` | Medium | SEO duplication, hreflang missing | Proper hreflang pairs, single canonical per language |
| 11 | No schema markup | Medium | Lost rich-result eligibility | Hotel JSON-LD (in prototype `<head>`) |
| 12 | DYPA social-tourism banner in footer of every page | Low | Mixed signal for premium intent | Move to a dedicated "Offers/Programs" page |

---

## 3. Sitemap (new architecture)

```
/                       Home — the promise, the proof, the booking path
/rooms/                 Stay — overview of the 3 room types
/rooms/garden-room/         · 1 page per room = SEO + desire + direct deep-link to engine
/rooms/pool-sea-room/
/rooms/sea-view-room/
/pool-bar/              Pool, bar, breakfast — the daily lifestyle product
/weddings/              Weddings — own page; highest ADR; targets "skopelos wedding venue"
/events/                Conferences & private events (up to 80 / 350)
/skopelos/              Destination guide hub — targets "skopelos" informational searches
/skopelos/<guides>/         Beaches · Old Town · Mamma Mia trail · Getting here
/gallery/               Proof. Organized by Rooms / Pool / Views / Events
/journal/               2–4 posts/yr: weddings hosted, island seasons → fresh content + long-tail SEO
/offers/                Direct-booking offers (early bird, long-stay, shoulder season)
/contact/               Map, transfers, human contact
→ Book Now              External: dionyssos.reserve-online.net (until WebHotelier-class engine upgrade)
```

**Why each exists:** every page is either a *revenue page* (rooms, weddings, events, offers), a *proof page* (gallery, journal), or a *demand-capture page* (skopelos guides). Nothing else earns a slot in the nav.

---

## 4. Homepage — final section order (as built in `index.html`)

1. **Hero** — full-screen aerial of town+sea, eyebrow location line, hero statement, 2 CTAs, **availability bar** docked at the bottom (dates + guests → booking engine).
2. **Manifesto** — 3-generation story in one editorial paragraph + **trust strip** (5 min walk · 3 generations · 40+ countries · 350-guest receptions).
3. **The Setting** — estate aerial + fact list (position, pool, balconies, breakfast).
4. **Rooms** — 3 editorial cards, renamed rooms, hover motion, direct links to engine.
5. **Full-bleed break** — the balcony-breakfast photo with one line of copy. (The single most persuasive asset the hotel owns.)
6. **The Shape of a Day** — morning / afternoon / evening triptych (breakfast, pool, night bar). Replaces a generic "amenities" list with *time*.
7. **Weddings & Celebrations** — dark "evening" section; candlelit pool photo; 4 proof points; enquiry CTA.
8. **Skopelos** — destination storytelling + 4 points of interest with walking/driving distances.
9. **Guest Book** — reviews (placeholder quotes → swap for live verified feed at launch).
10. **Gallery strip** — draggable horizontal postcards.
11. **Finale CTA** — night pool full-bleed, direct-booking perks, Book + Call.
12. **Footer** — oversized wordmark, contact, nav, license number.

Video note: section 1 is built image-first deliberately — the current drone *stills* outperform any video the hotel could cheaply produce. When a proper 20–30s drone reel exists (see §11), it drops into the same hero slot.

---

## 5. UI Design System — "Plaster & Aegean Ink" (implemented in `assets/css/main.css`)

**Color**
| Token | Hex | Use |
|---|---|---|
| `--ink` | `#101D26` | Text, dark sections (deep Aegean at night) |
| `--plaster` | `#F6F1E7` | Page background (sun-warmed whitewash) |
| `--plaster-2` | `#EFE7D8` | Alternate section background |
| `--linen` | `#FBF8F1` | Cards, light text on dark |
| `--clay` | `#A8603C` | Accent — Skopelos rooftops. CTAs/hover only |
| `--bronze` | `#97743D` | Eyebrows, fine details |
| `--sea` | `#24586B` | Reserved secondary accent |

**Typography**
- Display: **Marcellus** — Hellenic inscriptional serif, one weight, timeless.
- Accents: **Cormorant Garamond italic** — handwritten-postcard moments (times, captions, numerals).
- Body/UI: **Hanken Grotesk** — quiet, modern, international.
- Labels: 11px / 600 / 0.3em letter-spacing / uppercase — the "engraved hotel stationery" voice.

**Components:** square-cornered buttons (filled ink / ghost / light variants, arrow that slides on hover), hairline-ruled fact lists, numbered editorial cards (No. 01–03), 1px-bordered review cards, inner-border frame on the wedding image.
**Layout:** 1700px max shell, `clamp()`-fluid spacing, asymmetric two-column grids, one offset column in 3-up grids, full-bleed photographic breaks between every 2–3 content sections.
**Texture:** 5%-opacity SVG film grain over everything; slow Ken Burns on the hero; scroll-reveals at 1s with luxury easing `cubic-bezier(0.22,1,0.36,1)`.
**Banned:** gradients on UI, rounded "bubble" cards, carousels with dots, stock icons, more than one accent color per view.

---

## 6. Conversion Strategy

**The funnel:** every screen answers one question and ends in one of two actions — *Check availability* or *Talk to the family* (tel/mail).

| Mechanism | Implementation |
|---|---|
| Persistent CTA | "Reserve" in header at all times; header goes solid on scroll |
| Availability-first hero | Date/guest bar docked in the hero, posting into the existing engine — intent captured at second 5, not click 4 |
| Mobile sticky bar | Call / Reserve, appears after the hero (built) |
| Social proof | Trust strip (manifesto) + Guest Book section + review feed at launch |
| Honest scarcity | Real inventory statements only: "X rooms of this type" on room pages, seasonal closing dates. No fake countdown timers — they destroy exactly the trust this brand sells |
| Direct-booking perks | Stated at final CTA: best rate direct, flexible terms, deal with the family. **Confirm the perk list with the hotel before launch** |
| Exit intent (desktop, phase 2) | Single soft overlay: "Write to us — we answer personally" email capture. No discount pop-ups |
| Wedding funnel | Dedicated CTA → pre-filled email subject (built); phase 2: short enquiry form with date picker |

**Realistic uplift estimate** (industry benchmarks for independent-hotel redesigns with booking-flow shortening): look-to-book from a typical 0.5–1.5% to **1.5–3%**, i.e. roughly **1.5–2.5× direct conversion**, assuming traffic quality is unchanged. Phone/email enquiries (now one tap on mobile) typically add another 20–40% of direct revenue on top of engine bookings for properties of this size.

---

## 7. Mobile-First Experience (built)

- **Nav:** hamburger → full-screen ink overlay, oversized Marcellus links, staggered entrance, contact details in the menu itself.
- **Booking:** availability bar stacks to 2-columns; thumb-zone sticky bar (Call | Reserve) after the hero; `tel:` link for the half of Greek-island bookers who simply phone.
- **Layout:** all grids collapse to single column; day-cards lose their offset; hero shortens to 88svh so the availability bar peeks above the fold.
- **Comfort:** `svh` units (no iOS URL-bar jump), `env(safe-area-inset-bottom)` on the sticky bar, date inputs use native pickers, reduced-motion fully respected.

---

## 8. SEO Strategy

**Target map**
| Query | Page | Tactic |
|---|---|---|
| skopelos hotel / hotel in skopelos town | Home + /rooms/ | Title: "Dionyssos Hotel Skopelos — in Skopelos Town"; H1 contains "Skopelos"; Hotel schema (done) |
| skopelos accommodation | /rooms/ + room pages | One page per room type, descriptive alt text, internal links from guides |
| skopelos wedding venue | /weddings/ | Only hotel on the island with 350-guest poolside capacity — say so, with FAQ schema |
| skopelos boutique hotel | Home, Journal | Editorial content + "boutique, family-run" phrasing in meta |
| mamma mia skopelos, skopelos beaches | /skopelos/ guides | Informational capture → internal links to rooms with "stay 5 minutes from the port" |

**Technical:** proper `hreflang` EN/EL pairs (current site 404s on `/en/`); one canonical per language; Hotel + FAQPage + Review schema; WebP images with descriptive filenames (`skopelos-town-aerial.webp`, not `dionyssos-air-26.jpg`); Core Web Vitals budget — hero image preloaded, everything else lazy (already in prototype).
**Internal linking:** every guide page links down to rooms and weddings; every room page links sideways to the other two rooms and up to offers.

---

## 9. Technical Stack (recommended production build)

```
Frontend    Next.js 15 (App Router) + TypeScript + Tailwind v4 + Framer Motion
CMS         Sanity (free tier fits a 12-page site; Greek/English localized documents)
Booking     Keep reserve-online.net short-term (deep-link with dates, as prototyped).
            Evaluate WebHotelier when contract allows — better rate calendar, GA4
            e-commerce events, and Greek-market support.
Hosting     Vercel (EU region) — free tier sufficient
Analytics   GA4 + Microsoft Clarity (both free; Clarity's heatmaps will show whether
            the availability bar gets used). Hotjar optional later.
Email       Wedding/contact forms → Resend or Formspree → res@dionyssoshotel.gr
```

**Architecture:** statically generated pages (ISR for Journal/Offers), Sanity content fetched at build, images via `next/image` with AVIF/WebP, booking engine always an external deep-link (PCI stays the engine's problem). The prototype's design system ports 1:1 into Tailwind tokens.

**Why not WordPress again:** the current template-artifact problem ("Luviana") *is* the WordPress story. A typed, componentized build cannot rot that way.

---

## 10. Copy Deck (key pages — written, ready to use)

**Homepage hero** *(in prototype)*
> Where Skopelos slows to the pace of summer.
> A family-kept hotel in a garden above the old town — the harbour five minutes away on foot, the noise of the world considerably further.

**Rooms intro**
> Rooms that open onto the island. Whitewashed walls, handmade Skopelitan furniture, and balconies that decide your morning: the gardens, the pool, or the open Aegean.

**Room page (Pool & Sea Room)**
> Morning light off the water, twice. The pool lies just below your balcony; beyond the rooftops, the Aegean takes over. Twenty square metres arranged the island way — cool tiles, timber, linen — and a table outside where breakfast routinely runs long.

**Weddings page**
> Married by the water, under the island sky. Candlelight on the still pool, tables under the palms, the town glittering below — and your guests asleep upstairs minutes after the last dance. We have hosted Skopelos weddings for decades; yours will still be treated as the only one.

**About / family page**
> Three generations of the same family have kept this hillside. The recipes at breakfast are our grandmother's; the trees by the pool were planted before our guests' parents first visited. We are not a brand. We are a house that learned, summer by summer, exactly what a guest needs — and when to simply leave you to the view.

**Booking CTAs**
> Check availability · Book direct — best rate, guaranteed · You deal with the family, not a platform.

*(Avoided throughout: "nestled", "hidden gem", "paradise", "luxury escape", "breathtaking".)*

---

## 11. Visual / Art Direction

**Existing assets that already perform (used in prototype):** the aerials (`dionyssos-air-26`, `-13`), the balcony-breakfast shots, the night pool. These are genuinely strong.

**One-day reshoot brief (the highest-ROI €500–800 the hotel can spend):**
- **Golden hour aerials** — current drone shots are midday; 7:30 pm light would double their warmth. One slow 25s push-in toward the town for the hero video.
- **Rooms** — shoot at dusk with lamps on + balcony doors open (interior + view in one frame); remove towel-swans and runner-cloths; one styled detail per room (linen, book, local sweets).
- **People, no faces** — hands with coffee on the balcony rail, a dive mid-air, the barman's pour. Lifestyle without stock-photo grins.
- **Evening series** — the hotel currently has almost no blue-hour photography; the wedding market buys *evenings*.
- **Grade** — single warm filmic preset across everything; the mixed white balance of the current gallery is half the "dated" feeling.
- **Retire:** branded beer mugs, plastic straws, the 2000s-era film wedding scan (replace at next hosted wedding), buffet shots with guests' faces.

---

## 12. Revenue Impact (realistic ranges, not promises)

Assumptions: ~30-room property, ~150-day season, current direct share typical for Greek 3-star (15–25%, rest OTA at 15–20% commission).

| Lever | Mechanism | Realistic range |
|---|---|---|
| Direct conversion rate | Shorter funnel + trust + mobile path | 1.5–2.5× current look-to-book |
| Direct share of bookings | Site finally worth linking from OTA profile ("billboard effect") | +8–15 pts over 2 seasons |
| OTA commission saved | Each shifted booking keeps ~15–20% | ≈ €25–40 per room-night shifted |
| ADR perception | Premium presentation + renamed rooms | +5–12% achievable on direct rates without review backlash |
| Weddings/events | A findable, dedicated wedding funnel | 1–3 additional events/yr ≈ each worth 30–80 room-nights + F&B |

**Order-of-magnitude:** shifting 300 room-nights/season from OTA to direct at ~€30 saved commission ≈ **€9,000/season**, before any ADR gain or added weddings. The redesign pays for itself inside the first season if it shifts even two bookings a week.

---

## Launch checklist (before this goes live)

- [ ] Replace placeholder review quotes with verified reviews (Booking.com/Google widget or written permission).
- [ ] Confirm direct-booking perks (best-rate guarantee, flexible terms) with the family — only promise what's honored.
- [ ] Confirm trust-strip figures (3 generations, 40+ countries) with the family; adjust if needed.
- [ ] Verify booking-engine URL parameters (`checkin/checkout/adults`) against reserve-online.net's actual query format.
- [ ] Real Instagram/Facebook URLs in footer.
- [ ] Greek (ΕΛ) version of all copy; hreflang pairs.
- [ ] Photography reshoot per §11, then swap hero/room imagery.
- [ ] GA4 + Clarity snippets; outbound-click event on every booking CTA.
