---
name: dionyssos-hotel-site
description: "Redesign of the user's uncle's hotel site (Dionyssos Hotel, Skopelos) — prototype lives in C:\\Users\\mikef\\dionyssos-hotel"
metadata: 
  node_type: memory
  type: project
  originSessionId: 02724e9d-0625-4be8-9b9b-75e33f02db9b
---

The user's uncle owns the Dionyssos Hotel in Skopelos Town, Greece (3-star, family-run; current site dionyssoshotel.gr, booking via dionyssos.reserve-online.net, contact res@dionyssoshotel.gr / +30 24240 23210). In June 2026 we built a luxury-grade redesign prototype in `C:\Users\mikef\dionyssos-hotel` (static `index.html` + `assets/`, no build step; serve with the `dionyssos` entry in `~/.claude/launch.json`, port 5402). Strategy lives in `STRATEGY.md` there. Design language: "Plaster & Aegean Ink" — Marcellus / Cormorant Garamond / Hanken Grotesk, plaster `#F6F1E7`, ink `#101D26`, clay `#A8603C`. Photos in `assets/img` are downloaded from the live site (the hotel's own). Pending before launch: verified reviews, Greek version, perk confirmation, photo reshoot.

**Why:** ongoing family project likely to continue across sessions (room pages, weddings page, Greek translation, deployment).
**How to apply:** reuse the design tokens and folder; don't re-fetch the photos; check `STRATEGY.md`'s launch checklist before claiming launch-ready. Note: `preview_screenshot` times out on this machine (hidden-window renderer); verify via `preview_eval`/`preview_inspect` instead — see [[preview-screenshot-timeout]].
