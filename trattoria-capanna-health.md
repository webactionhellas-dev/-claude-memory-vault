---
name: trattoria-capanna-health
description: "Trattoria Capanna (trattoria-capanna-optimized.vercel.app) health-check history -- 2026-08-03: heaviest site at 8.3 MB, 51 external Unsplash stock images on the homepage, 2 em-dashes in live copy, no security headers beyond HSTS"
metadata: 
  node_type: memory
  type: project
  originSessionId: 9fc6d367-b535-413d-9cc4-c6051e857c44
  modified: 2026-08-03T17:42:06.489Z
---

Health-check history for [[trattoria-capanna-site]] / [[capana-optimized-athens]] (trattoria-capanna-optimized.vercel.app), the Athens Italian restaurant site repurposed from the original Italian build. Read-only audits, no fixes applied here. Registry: [[live-sites-registry]].

Source on this machine: only the sync snapshot `C:\Users\aster\projects\trattoria-capanna`. Per [[trattoria-capanna-site]] the canonical folder is `Downloads\trattoria-capanna-live` on the mikef/nospa machine, not present here.

## Health check 2026-08-03

Loads: 200 OK, ~0.41s first byte. Zero console errors, no broken images, no horizontal overflow on desktop or mobile. Cinzel renders on Latin headings.

**Biggest issue, 51 external Unsplash images carrying the homepage.** The live homepage references 51 `images.unsplash.com` URLs and pulls 7,115 KB of images across 76 requests, total page 8,289 KB, ~4.8s to network-idle. Three problems in one:
1. Availability. During this run the mobile pass recorded `net::ERR_ABORTED` on `photo-1473093295043-cdd812d0e601?...w=1400`. Fetched directly afterwards it returns 200, so it is intermittent rather than dead, but the site's core imagery depends on a third party Mike does not control and cannot cache-bust.
2. Perf. 7.1 MB of images is roughly 11s of transfer on mid-tier mobile. This is the heaviest site in the registry by a wide margin.
3. Authenticity. These are generic stock photos on a real restaurant's site. [[capana-optimized-athens]] records that this build was repurposed from the Italian original, so the stock imagery is inherited, not chosen. Replacing them with real photos of the Athens venue (Ploutarchou 38) would fix all three at once and is the single highest-value improvement here.

**House rule violation, 2 em-dashes in live visible copy** (house rule is zero):
- "Sweet stone-baked pizza, warm from the oven and dusted with cocoa and sugar — a ..."
- "Trattoria Capanna never disappoints — authentic Italian flavours, perfectly prep..."

**BUG, content invisible under reduced-motion.** With `prefers-reduced-motion: reduce`, the H2 "Savor the symphony of senses in a wine a..." stays stuck at opacity 0. Same defect as [[web-action-health]] and [[drip-barbershop-health]], fix the shared reveal primitive.

**Text collides on mobile, 1 pair at 390px:** "Savor the symphony of senses i" x "the richness of flavors." Violates [[text-readability-no-collisions]]. Same heading as the reduced-motion bug above, so that block needs a look either way.

**Security headers, only HSTS is set.** Live response carries `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` and nothing else. Missing CSP, nosniff, `X-Frame-Options`, `Referrer-Policy`. Copy the pattern from [[drip-barbershop-health]], which serves a complete set. Same gap as [[web-action-health]].

**Accessibility, 2 serious axe violations:**
- `aria-prohibited-attr` on 12 nodes: elements carrying ARIA attributes their role does not permit, so screen readers may ignore or misreport them.
- Contrast: 2 elements at `#696764` on `#0a0a0a`, ratio 3.51:1 at 12px (the `.text-cream/40 .text-xs` footer pair). A further 118 elements sit over image/gradient and could not be auto-verified, check by eye.

**Tap targets:** 10 interactive elements under 24x24 CSS px on mobile, including the nav links "Story" (35x17), "Dishes" (45x17), "Experience" (74x17), "Gallery" (47x17), "Location" (57x17), plus the phone `+30 21 0724 1777` and `info@trattoriacapanna.gr`. For a restaurant site the phone link being sub-minimum on mobile is worth fixing first, that is the booking path.

**Source-side:** `security_audit.py` on the snapshot finds no hard-coded secrets, but flags raw-HTML injection sites in `js\002.js`, `js\003.js`, `js\018.js`, confirm inputs are sanitized. Local images are mostly fine (WARN only: `ingredients.webp` and `menu-bg.jpg` at 458 KB, `tc-vespa.jpg` 334 KB, `tc-storefront.jpg` 325 KB), which reinforces that the weight problem is the remote Unsplash set, not the local assets.
