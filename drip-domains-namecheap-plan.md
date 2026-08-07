---
name: drip-domains-namecheap-plan
description: "Plan to consolidate all 4 DRIP property domains under the client's existing Namecheap account (same one that holds drip.store) and get credentials/Shared Access for centralized DNS management"
metadata: 
  node_type: memory
  type: project
  originSessionId: a391801a-10ea-41ac-8a96-102625e2e8d3
  modified: 2026-08-07T08:46:50.383Z
---

Mike's decision (2026-08-07): Web Action hosts all 4 DRIP properties ([[drip-barbershop-site]], [[drip-astro-v2-site]] sneaker store, [[drip-jewels-site]], [[drip-jewels-store]]). The client buys the domains, Web Action manages everything else.

**Domain consolidation:** drip.store is already registered under a Namecheap account (registrar confirmed in [[drip-astro-v2-site]]'s takeover-roadmap notes, NS dns1/dns2.registrar-servers.com). Plan is to have the client register the remaining domains (dripbarbershop.gr if not already theirs, a domain for Drip Jewels, a domain for Drip Jewels Store) under that SAME Namecheap account, then hand Web Action account access for centralized DNS management across all 4.

**How to apply:** when following up with the client, ask for Namecheap account access (credentials or, more securely, Namecheap's "Shared Access" feature which grants management without exposing the actual password) once the domains are purchased. Don't enter/handle their Namecheap password directly per the credential-handling rule; if they paste one, ask them to use Shared Access instead or change it after handoff. When wiring drip.store's cutover specifically, only touch the apex A record + www CNAME, the zone also carries their email (Google Workspace MX), Klaviyo, and Zoho records that must not be disturbed.

**Payment account access (2026-08-07, Mike's call):** same pattern as domains, prefer account-level access over raw secrets. If the client already has a Stripe account, ask them to invite Web Action as a team member rather than hand over API keys directly. They'll also need a Viva Wallet account for IRIS (Stripe doesn't support it, Greek law has required IRIS acceptance since Nov 2025, see [[drip-astro-v2-site]] takeover roadmap), same team-member-invite approach there.

**Shopify access needed too (2026-08-07):** their live drip.store still runs on Shopify (the sneaker store's original catalog was scraped from it, see [[drip-astro-v2-site]]). Client needs to invite Web Action as a staff/collaborator on that Shopify account so real inventory, products, and orders can be pulled directly instead of relying on the public storefront JSON or a stale scrape.
