---
name: verify-visual-bugs-with-evidence
description: "Diagnose visual/UI bugs from real evidence (extracted video frames, real HTTP timing, computed styles) rather than from a verbal/voice-to-text description alone — validated hard on the CloudSkin 'shade' bug session"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 70f1bde9-a5a3-4cb5-ac72-971762bb76e7
  modified: 2026-08-01T18:10:44.132Z
---

When a user describes a visual bug in words (especially voice-to-text, which garbles terms like "shape"/"shade"/"zoned"/"zoomed"), do not iterate on theories from the description alone. Get direct evidence first, then diagnose from that.

**Why:** on 2026-08-01 (CloudSkin product-photo session, see [[cloudskin-studio-live-and-pending]] LATEST-11 and [[cloudskin-image-transform-gotchas]]), a real bug was described only verbally across several messages ("the shade... appears and disappears when I scroll... connected with the browser bar"). Guessed wrong repeatedly — progressive-JPEG-decode theory, a stray UI icon, a `dvh` browser-bar-resize theory — before the user got audibly angrier each time a fix shipped that didn't address what he actually saw. The moment a screen recording was extracted frame-by-frame with ffmpeg and inspected pixel-level, the real bugs (a `resize=cover` distortion, a box-shadow bleeding past a mis-measured closed-drawer offset) were found and fixed correctly on the first attempt.

**How to apply:**
- If a user reports a visual bug and hasn't sent a screenshot/recording, ask for one before proposing a fix — don't guess from adjectives.
- Given a video, extract frames (`ffmpeg -vf fps=2 frame_%03d.png`) and crop/zoom into the specific region described (`ffmpeg -vf crop=...`) rather than eyeballing a full downscaled frame.
- Once a fix is proposed, verify it with real evidence at the same rigor: actual HTTP requests/timing (`curl -w "time_total=..."`) for backend/network claims, `getComputedStyle()`/`getBoundingClientRect()` in a live browser for CSS/layout claims — not just "the code looks right on read-through."
- This environment's preview pane doesn't composite frames or run CSS transitions when not visible/focused (see [[preview-screenshot-timeout]], [[preview-pane-intersectionobserver-dead]]) — when testing a transition/animation-dependent style, force it synchronously (`el.style.transition='none'`) to get a real instant read instead of trusting a possibly-frozen animated computed value.
- After shipping a fix based on a user's video, if they say it's *still* wrong, don't re-theorize from their new words either — go back to real evidence (re-examine the same video from a different angle/region, or ask for a fresh one) before touching code again.
