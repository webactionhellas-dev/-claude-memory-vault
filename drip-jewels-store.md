---
name: drip-jewels-store
description: "Drip Jewels Store, the planned e-commerce build for Drip Jewels; LIVE SKELETON at drip-jewels-shop.vercel.app, frontend-only placeholder, no backend wired"
metadata: 
  node_type: memory
  type: project
  originSessionId: a391801a-10ea-41ac-8a96-102625e2e8d3
  modified: 2026-08-07T08:31:16.610Z
---

Separate from [[drip-jewels-site]] (the request-price showcase at drip-jewels-live.vercel.app). This is the planned full e-commerce version, distinct 4th DRIP property alongside [[drip-barbershop-site]] and [[drip-astro-v2-site]] (sneaker store).

**LIVE (skeleton) at https://drip-jewels-shop.vercel.app** — confirmed 2026-08-07 by browsing it directly. Real storefront layout/design (hero, category grid, product grid with filters, testimonials, newsletter signup, EN/EL language switch, bag icon), but entirely placeholder content:
- Every product card shows "PHOTO SOON" instead of a real photo.
- Products are generic filler names/prices (Pavé Stack Ring €140, Tennis Bracelet €480, etc.), not the real Drip Jewels catalog.
- Testimonials are placeholder quotes (Maria/Elena/Sofia/Nikos), not real reviews.
- "ADD TO BAG" / bag icon exist in the UI but network inspection shows **zero backend calls** (no Supabase, no Stripe, no API requests at all) — it's a static frontend only, cart/checkout is not wired to anything real yet.

**What's actually needed to move this from skeleton to real store** (see the client-facing ask in this session): real product catalog (photos/names/descriptions/prices), stock counts per piece (likely 1-of-1 or very limited, unlike sneaker inventory), a decision on full-cart-checkout vs. keep-high-value-pieces-request-price, a shipping/insurance partner for high-value items, business/legal info (ΑΦΜ/ΓΕΜΗ/IBAN), payment methods (Stripe + IRIS per Greek law, same constraint as [[drip-astro-v2-site]]), and a domain plan.

Source folder location on this machine not yet identified (only checked the live Vercel URL so far).
