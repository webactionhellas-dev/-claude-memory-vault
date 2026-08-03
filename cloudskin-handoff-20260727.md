---
name: cloudskin-handoff-20260727
description: "CloudSkin 15:11-feedback fix batch — packed for home continuation on 2026-07-27; where the zip is, what's done, what's left"
metadata: 
  node_type: memory
  type: project
  originSessionId: dbc37cfa-2010-441d-b180-f621a7246751
  modified: 2026-07-27T15:00:07.305Z
---

CloudSkin fix batch from Larissa's 15:11 test-order feedback (via Panos) was PACKED for continuation on the home machine on 2026-07-27 (office/nospa session ran out of time).

**Package:** `C:\Users\nospa\Downloads\cloudskin-HANDOFF-20260727.zip` (18.8MB) + `Downloads\CLOUDSKIN-START-HERE.md`. Contains `cloudskin-v67/` (canonical deploy source) and `cloudskin-live-mirror/` (verified fixes + 3 email templates + docs). Read `_HANDOFF-HOME.md` inside the mirror first. NOTE: project files do NOT auto-sync office<->home; the zip must be physically carried to the home machine.

**DONE + verified (in mirror):** white-box/uniform-photo fix (7 object-fit cover flips), Studio-photo flash fix (content.js), colourway split (collection = one card per real colour, variant-safe), new /order page + account 24h tracking grace, cookie/poster once-per-session, 3 premium symmetrical Shopify email templates (order-confirmation/shipping-confirmation/shipping-update, real product photos via site URL).

**LEFT (do at home):** (1) LAST FIX Mike wants = HOME rail hover-to-switch colour + COLLECTION keeps the split + fix Women/Men colour-filter gender leak; (2) finish+verify the partial source integration (cloudskin-v67 had main.css/collection.js/content.js/home.js/shell.js edited by a stopped agent, syntactically valid, unverified) per `_SOURCE-TODO.md`; (3) money-path tests + `node scripts/deploy.mjs --dry-run` then deploy on go; (4) paste the 3 emails into Shopify admin (store rta3sf-47, CodeMirror6 editor, clipboard+Ctrl+A+Ctrl+V); (5) admin toggles: Shopify money format Dhs->AED, Supabase secret CHECKOUT_SUCCESS_URL=.../order to kill the live 404, keep Stripe customer email off; (6) DEFERRED by Mike: PayPal (Merchant) + Studio-editable blog.

**MONEY-PATH FROZEN** all session: never touched checkout.js/shopify.js/supabase functions/DHL/duties. Stripe live + working (real AED charge). localhost shows Shopify fallback only because serve.mjs runs on port 3060/3062 not in the edge CORS allowlist (8080 works). See [[cloudskin-live-edit-reconstruction]], [[cloudskin-stripe-golive]], [[live-site-editor-product]].
