---
name: hero-video-lpm-canvas-fallback
description: "the only bulletproof fix for hero videos frozen with a play button in iOS/macOS Low Power Mode: JSMpeg canvas fallback + hide the video element; attributes and play()-retries alone cannot beat the OS block"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 5afa4829-2203-475a-bbd7-684ef2a19f7f
---

iOS/macOS Low Power Mode (and some data-saver modes) HARD-BLOCK `<video>` autoplay: `play()` rejects `NotAllowedError` until a real user activation, and iOS draws its own play-button glyph on the paused element. No attribute combo (muted/playsinline/autoplay) or retry loop fixes it.

**Why:** the block is OS policy, not a race. But canvas painting has NO autoplay policy, so a JS-decoded video always moves.

**How to apply (proven in unicorn-tattoo `4ca5a8a`, see [[unicorn-tattoo-site]]):**
1. Encode an MPEG1-TS rendition: `ffmpeg -i hero.mp4 -f mpegts -codec:v mpeg1video -b:v 1900k -maxrate 2400k -bufsize 4000k -vf scale=960:-2 -an hero.m2ts` (~250KB/s). Name it `.m2ts` NOT `.ts` (tsc parses `.ts` as TypeScript and the build fails).
2. Lazy-import `@cycjimmy/jsmpeg-player` ONLY when blocked (`new JSMpeg.Player(url, {canvas, loop, audio:false, autoplay:true})`); canvas gets `h-full w-full object-cover` (object-fit works on canvas elements).
3. Detect the block two ways: `play()` promise rejects with NotAllowedError (fast path) AND a watchdog (paused while readyState>=2 after ~1.2s).
4. While blocked, fade the `<video>` to `opacity-0` (the iOS glyph is drawn on the element, invisible element = no glyph) and show a first-frame poster `<img>` underneath so there is zero dead black.
5. Gesture handback: listen on touchend/pointerup/click (these carry user activation; touchstart/scroll do NOT in Safari) -> `video.play()` succeeds -> on 'playing' destroy the JSMpeg player and fade the native film back in, after seeking video.currentTime to the jsmpeg player's currentTime so the picture does not jump.
6. Any opaque WebGL overlay that samples the video texture (ink-grade shaders etc.) must hide itself while `video.paused`, or it freeze-frames OVER the moving canvas.

**Testing without an iPhone:** headless Playwright with `addInitScript` that overrides `HTMLMediaElement.prototype.play` to reject NotAllowedError + a capture-phase 'play' listener that pauses attribute-driven autoplay = faithful LPM simulation, then `page.mouse.click` verifies recovery. Compare two screenshots ~1.5s apart for "frames advancing" (drawImage readback of a WebGL canvas without preserveDrawingBuffer returns blanks, and the in-app preview pane suspends rAF entirely, see [[preview-pane-intersectionobserver-dead]]).

Ship a `?lpm=1` URL param that forces the blocked path (and strips the autoplay attribute, or desktop native autoplay defeats the demo) so the client can see it on any machine.

**Reinforced (drip-jewels-live, 2026-07-20):** the watchdog is the PRIMARY detector, not a backup. Real iOS LPM often RESOLVES `play()` while leaving the video paused (it does not always reject `NotAllowedError`), so a reject-only handler silently never fires and the hero sits on its poster with the glyph. Always include the watchdog (paused at currentTime 0 with readyState>=2 after ~1.5s, plus a ~4s hard cap) and a `playing` listener that self-heals if the native film starts late. Also GATE the canvas reveal on the FIRST DECODED FRAME: if a device loads jsmpeg but never decodes (headless/limited GPU), keep the still image showing rather than reveal a blank/black canvas, so the fallback can only ever improve on the still. This was the exact defect on drip-jewels-live: an existing reject-only `fixHeroFreeze` that never triggered under real LPM.
