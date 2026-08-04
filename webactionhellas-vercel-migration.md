---
name: webactionhellas-vercel-migration
description: webactionhellas.com (Web Action studio site) LIVE on free Vercel; domain cutover + SSL done; site uses Vercel nameservers
metadata: 
  node_type: memory
  type: project
  originSessionId: 6a0c402f-7a3f-41a8-9fd4-09bba67050b3
---

Web Action studio site (single-file ~2MB `index.html`, built locally with Claude, source at `C:\Users\nospa\Downloads\index.html`; title "Web Action | Web & App Development Studio in Athens") migrated off WebspaceKit to **free Vercel hosting** on 2026-06-24. **STATUS: LIVE** at https://webactionhellas.com (valid SSL, verified all assets HTTP 200).

- **Deploy folder:** `C:\Users\nospa\claude projects\webaction-site` — `index.html` + `apple-touch-icon.png` + `favicon.ico` (user-provided, 14.7KB) + generated `favicon-16/32/48/96/192/512.png`.
- **Vercel project:** `webactionhellascom/webaction-site` (account mikefalcos2004@gmail.com). Deploy with `vercel deploy --prod --yes` from the folder (project already linked via .vercel). Aliases: webaction-site.vercel.app + webactionhellas.com (+ www).
- **Domain:** `webactionhellas.com` via WebspaceKit (WHMCS at webspacekit.com/client; reseller of **Key-Systems GmbH**), domain id 23370, registrant email `mikefalcos@hotmail.com`. Now on **Vercel nameservers** `ns1.vercel-dns.com`/`ns2.vercel-dns.com` (Vercel manages DNS; apex A = 216.198.79.65 / 64.29.17.65).
- **Resolved blockers (all done 2026-06-24):** (1) was registrar-suspended for unverified ICANN registrant email → user clicked verification link at emailverification.info (trigger token from mail to hotmail). (2) Then nameservers changed to Vercel in WHMCS (was blocked until verification). (3) Vercel auto-issued SSL once it detected vercel-dns NS.
- **Local-cache gotcha:** user's own router/ISP DNS kept resolving the OLD parking IP `54.38.220.85` for hours after cutover (so user saw it "down" while it was live globally). Fix: phone on mobile data, or set PC DNS to 1.1.1.1/8.8.8.8, or wait for TTL.

**Google "snippet logo" SEO (added 2026-06-24):** added `<link rel=icon>` for 48/96/192px PNGs (Google needs >=48px square) and `logo`+`image` (favicon-512x512.png) to the LocalBusiness JSON-LD. Will appear in Google after re-crawl (days); speed via Google Search Console "Request indexing".

**Known optional polish (NOT done):** HTML's og:url, hreflang, and JSON-LD @id/url still point to **webaction.gr** (a separate domain, appears down) while canonical = webactionhellas.com; og:image = https://webaction.gr/og-image.webp (broken if .gr down). Offer to make these consistent with webactionhellas.com if user wants. Distinct from [[drip-store-site]]/[[kyconstruction-rebuild]].
