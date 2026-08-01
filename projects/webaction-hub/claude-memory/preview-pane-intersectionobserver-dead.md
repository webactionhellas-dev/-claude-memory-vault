---
name: preview-pane-intersectionobserver-dead
description: "In-app Browser preview pane on this machine never fires IntersectionObserver, so framer-motion whileInView / count-up / scroll-reveal animations look frozen (not a site bug)"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 08c96199-820a-4a34-a8ce-e1c7c008e8c3
---

The in-app Browser preview pane (mcp__Claude_Browser__*) on this machine does NOT drive IntersectionObserver callbacks — a manually-attached `new IntersectionObserver` on an element sitting fully inside a proper 900px viewport stays `pending` forever. Consequence: any framer-motion `useInView` / `whileInView` reveal, count-up stat counter, or scroll-triggered animation appears permanently stuck at its initial state (e.g. count-up numbers frozen at "0%", reveal blocks stuck at opacity:0). This is an ENVIRONMENT artifact, not a site defect — the same code animates correctly on any real browser.

Diagnosed on the Drip Jewels site (drip-jewels-live): three stat counters read "0%/0+/0:1" instead of "100%/5+/1:1"; root cause was dead IO in the pane, code was the canonical `useInView({once:true}) + animate(0,target)` pattern. To confirm real-vs-artifact: attach your own IntersectionObserver to an in-view element and see if it ever fires; if it doesn't, it's the pane. Also note this pane reports `innerHeight:0` until you `resize_window` with explicit width/height (the `desktop` PRESET does NOT stick — pass width:1440,height:900). Related: [[preview-screenshot-timeout]], [[trattoria-capanna-site]] (0-size viewport recovery).
