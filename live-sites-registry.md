---
name: live-sites-registry
description: "Registry of Mike's live/production sites -- drives the nightly automated health-check and what Jarvis can answer about site status. Add a row here immediately after every real production deploy."
metadata: 
  node_type: memory
  type: reference
  originSessionId: 823366e5-4f94-4eca-952d-a3d51f637a05
  modified: 2026-08-03T17:42:33.470Z
---

The canonical list of sites that are actually live in production. The `nightly-site-health-check` scheduled task reads this file and audits every row in it -- so this list, not a hardcoded prompt, is what determines coverage as [[deploy-launch]] ships new sites over time. Each site also gets its own health-check memory note (named `<site-slug>-health.md`), which [[aster-local-agent-fleet-bridge]]'s `_search_project_memory()` can already surface to Jarvis on request, since it searches this same memory folder.

**How to apply:** after any real production deploy via [[deploy-launch]], add a row here (name, URL, stack, date added) before considering the launch done. Don't hand-maintain a separate list anywhere else -- this file is the single source of truth for "what's live."

| Site | URL | Stack | Added | Last Audit |
|---|---|---|---|---|
| CloudSkin | https://cloudskin.com | headless Shopify + Supabase + Vercel, custom Stripe checkout | 2026-08-01 | 2026-08-03 |
| Web Action | https://webactionhellas.com | static Vite site, Vercel | 2026-08-01 | 2026-08-03 |
| DRIP Store | https://drip-store-orpin.vercel.app | Astro 5 + Tailwind v4 + Supabase + Stripe | 2026-08-01 | 2026-08-03 |
| Drip Barbershop | https://drip-barbershop-vercel.vercel.app | optimized static export, Vercel | 2026-08-01 | 2026-08-03 |
| Trattoria Capanna | https://trattoria-capanna-optimized.vercel.app | optimized Next.js static export, Vercel | 2026-08-01 | 2026-08-03 |

Note (2026-08-03): on the aster machine, canonical sources live under `C:\Users\aster\obsidian-vault\projects\` (cloudskin-v67, web-action-site, drip-astro-test), NOT under `C:\Users\aster\projects\`, which holds older multi-machine sync snapshots that audit much worse than what is actually deployed. Drip Barbershop and Trattoria Capanna have no canonical source on this machine, only snapshots. Audit the obsidian-vault copies.

Note (2026-08-01): this initial list was compiled from memory summaries, not a live inventory sweep -- Mike should sanity-check it once. Sites known to be *not* live (previews, concepts, staging only) are deliberately excluded: mykonos-prestige, zillions, grk-racing, underdog, sea-shepherd, drip-astro-v2 (staging).
