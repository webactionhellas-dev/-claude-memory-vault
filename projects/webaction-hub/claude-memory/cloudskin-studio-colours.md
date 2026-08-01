---
name: cloudskin-studio-colours
description: "CloudSkin Content Studio per-colour photo sections come from products.js colors, which already match live Shopify variants exactly (5 two-colour, 10 one-colour); verified via public Storefront token"
metadata: 
  node_type: memory
  type: project
  originSessionId: 75ea6c2d-9aa2-4169-ad82-275f54c1b095
---

The /studio "Product photos" section shows one photo box per colour a product has, read from `js/products.js` `colors[]`. Verified 2026-07-17 against the LIVE Shopify Storefront API — the catalog matches real variants exactly, so the studio is already correct.

- **Two-colour on Shopify (studio splits into White/Black sections):** Signature Bra, Signature Skirt, Court Skirt, Performance Tee, Performance Tank (Shopify names the light colour "White"; catalog says "White Mist").
- **One colour on Shopify (single box is correct):** Ace Dress, Club Quarter Zip, Club Skirt, Drift Jacket, Elevate Jacket, Flow Dress, Form Bra, Foundation Tank, Performance Shorts, Sculpt Bra.

Do NOT add a colour to `colors[]` unless that variant exists on Shopify — the same catalog powers the storefront swatches + checkout, so a phantom colour shows an unbuyable option. To make one of the 10 two-colour: add the real variant on Shopify first.

Public Storefront API (embedded client-side, read-only, safe): domain `rta3sf-47.myshopify.com`, token `54674b6ccdc6cdd3817ee38afd8db4aa`, version 2025-01. `js/shopify.js` uses it live; the studio does NOT load shopify.js/curate.js, so it reads the static catalog only — a future fix is to wire the studio to live Shopify so new colours appear without a re-sync. Studio lock = server-side `studio_auth` RPC; editor renders from client defaults, so it can be revealed for screenshots by stubbing that one RPC. See [[cloudskin-site]].
