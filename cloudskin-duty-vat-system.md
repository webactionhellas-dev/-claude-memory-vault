---
name: cloudskin-duty-vat-system
description: "CloudSkin's real per-country duty+VAT engine (_shared/duty-rates.ts), live 2026-08-06 across all 4 checkout paths. 32 countries with real sourced rates, fail-safe to 0 for anything unverified — never guessed. Full table, sourcing, and every deliberate exclusion (US/Canada/Lebanon structurally impossible, Turkey included on explicit override) documented here so the table is never touched without this context."
metadata:
  node_type: memory
  type: project
  originSessionId: 05f8ccf6-9d93-4373-8068-ecf7f961d3e2
  modified: 2026-08-06T14:17:06.805Z
---

Replaces the old approach ("duty is just baked into price margin") — Mike explicitly rejected re-pricing
products and wanted a real, calculated, itemized duty charge instead. Architecture is fail-safe by default:
`computeDutyVat()` in `supabase/functions/_shared/duty-rates.ts` returns `rateKnown:false, dutyVatMinorBase:0`
for ANY country not in the table — the system never guesses, it charges nothing extra rather than a wrong
number. Live across all 4 checkout paths: `create-checkout-session`, `create-checkout-elements`,
`create-paypal-order`, `shipping-quote`. Duty is always its own Stripe/PayPal line item ("Import duties &
taxes"), never folded into shipping or product price.

## The 32-country table (as of 2026-08-06)
- **18 EU countries**: shared `EU_DUTY_PCT = 0.12`, per-country VAT rate.
- **GB, AU, NZ, SG, HK**: individually sourced duty+VAT/GST (HK verified genuine 0%+0%, not a fallback).
- **5 GCC**: SA, QA, BH, KW, OM — all `dutyPct: 0.05`; VAT varies (0 for QA/KW where VAT isn't implemented
  there, others real rates). GCC resolution below.
- **Second research pass**: JO, EG, IL, JP — real sourced duty+VAT/consumption tax each.
- **TR (Turkey)**: `dutyPct: 0.494, vatPct: 0.20` — WTO World Tariff Profiles 2026 clothing average + current
  Turkish KDV. Included on Mike's **explicit override** despite a flagged volatility risk (only 3.7% of
  Turkey's tariffs are WTO-bound, and Turkey has hiked textile duty 30-166% overnight by presidential decree
  before — same risk class as the US exclusion below, but Mike said include it anyway: "i want all of these
  done from the live situations now... GO on").

## GCC customs resolution (Mike deferred this judgment call: "i dont know that you know better")
UAE free-zone shipment origin gets **zero intra-GCC customs preference** — verified against the GCC Common
Customs Law itself, not assumed. So GCC destinations are treated exactly like any other country (real duty
applied), NOT assumed duty-free just because the warehouse ships from within the GCC. De-minimis value
thresholds (roughly USD 260-325 depending on the GCC country) are NOT modeled — the flat % applies regardless
of order value, so small GCC orders are conservatively over-charged duty rather than under-charged. Flagged,
not fixed — revisit if GCC order volume becomes material.

## Deliberately EXCLUDED — structural, not a laziness/time call
- **US**: legal basis for the tariff changed 3 times in 6 months (IEEPA struck down → replaced → that ruled
  unlawful → replaced again, still under appeal as of 2026-08-06), plus the real rate varies 16-32%+ by
  garment/fiber. No single honest number exists right now, at any effort level.
- **Canada**: GST/HST genuinely varies by province (5%-15%), and checkout only captures country, not
  province — would need a real province-collection UI to fix properly. Offered to build, not yet started.
- **Lebanon**: WTO's own data shows duty averaging 56% with specific-duty line items running as high as
  376% — cannot be pinned to one honest number, non-ad-valorem duty structure.

Mike explicitly pushed back on an earlier draft that ALSO excluded Turkey for the same volatility-risk reason
as the US ("i said i want everything. then all ispected and live go on i dont have time to lose") — Turkey
was moved into the real table on his override; US/CA/LB remain excluded because their problem is structural
(no single number CAN be correct, not "a number exists but is risky").

## Live verification (France order, 2026-08-06)
Real `cs_live_` Stripe session, real product (variant `gid://shopify/ProductVariant/53773317570859`, 353 AED),
destination FR. Resulting `stripe_orders` row: `base_subtotal_cents:35300, base_total_cents:56341,
duty_vat:{vat_pct:0.2, duty_pct:0.12, base_minor:11296, rate_known:true, session_minor:11296}`. Math confirmed
exact: 353 × 0.32 = 112.96 AED → 11296 minor units; 35300 + 9745 (shipping) + 11296 = 56341. Spot-checked with
Mike directly on two Turkey cases ("129" for one item, "183" for three) — both confirmed mathematically
correct against the 49.4% + 20% = 69.4% combined rate.

## Test coverage
`tests/duty-rates.test.ts`, 12 tests, all passing (`node --test tests/duty-rates.test.ts`): unverified-country
fail-safe, null-country fail-safe, France EU math, Hong Kong verified-zero, Singapore, Australia,
deliberately-excluded US/CA/LB, Turkey, the JO/EG/IL/JP batch, the full GCC batch, case-insensitive country
lookup.

## Remaining / open
- Canada real per-province GST/HST — not started, needs Mike's go-ahead on scope (a real province-collection
  UI is the real fix, not a shortcut).
- GCC de-minimis thresholds — not modeled, flagged above.
- Whether Larissa's actual current operating-country list matches all countries in `SHIP_COUNTRIES` — never
  confirmed by her directly, no action taken.

See [[cloudskin-office-session-20260806]] for the full session this was built in.
