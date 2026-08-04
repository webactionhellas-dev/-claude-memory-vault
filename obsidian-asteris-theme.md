---
name: obsidian-asteris-theme
description: Asteris custom Obsidian theme + companion appearance plugin built for the aster memory vault; where the files live and how to extend them
metadata: 
  node_type: memory
  type: project
  originSessionId: 93cce21d-35f7-4bdf-8adb-d21fd7ad80c4
  modified: 2026-08-02T22:19:04.195Z
---

**Status:** v1.0 shipped and verified live · Updated 2026-08-03
**Vault:** `C:\Users\aster\obsidian-vault` (Obsidian 1.13.4, git-backed, `.obsidian/` is tracked so this syncs to other machines)

Two pieces, built together:

- **Theme** `\.obsidian\themes\Asteris\theme.css` — owns every visual rule. Structured as
  source tokens (`--as-*`, one small palette per preset) mapped once onto Obsidian's own
  variable API, then structure / simplify / motion sections. Adding a preset means adding
  one `body.asteris-preset-<id>` block of `--as-*` values, nothing else.
- **Plugin** `\.obsidian\plugins\asteris-appearance\main.js` — plain CommonJS, no build
  step. Owns no CSS; it only writes body classes (`asteris-preset-*`, `asteris-anim-*`,
  `asteris-hide-*`, density/round/font/heading) and a few custom properties. Settings tab
  plus a swatch-grid quick panel (ribbon icon) and 5 commands.

8 presets (deep, midnight, graphite, nocturne, plum, void, daylight, parchment). Picking a
light preset flips Obsidian's own base scheme via `app.vault.setConfig('theme', ...)`.

## Gotchas
- **Obsidian rewrites `--font-text-size` as an inline body style**, so a stylesheet
  mapping for it is dead on arrival. Go through `app.vault.setConfig('baseFontSize', n)`
  instead. Same class of trap applies to anything Obsidian sets inline on `body`.
- **The left ribbon is a flex child with `flex: 0 0 var(--ribbon-width)`.** Setting
  `width` alone does nothing; you must set `flex-basis` too. Cost an hour of false
  negatives.
- `--font-text-override` reads as the literal string `'??'` in stock Obsidian. That is
  Obsidian's own "no override" sentinel, not corruption, and it harmlessly falls through
  to the next font in the stack. Do not try to fix it.
- **Editing `theme.css` on disk does not reliably hot-reload** into a running Obsidian;
  `app.customCss.requestLoadTheme()` left stale rules in the CSSOM. Restart the app before
  concluding a CSS fix failed.
- A stray `\.obsidian\.obsidian\` folder exists in this vault from someone once opening
  `.obsidian` itself as a vault. Harmless, not cleaned up.

## How to verify changes without guessing
Launch with `Obsidian.exe --remote-debugging-port=9222`, then drive
`Runtime.evaluate` over CDP (`http://127.0.0.1:9222/json/list` + `ws`) to read
`getComputedStyle` and toggle plugin settings live. Far better than screenshots. Wait
~700ms after a class change before measuring or transitions give false readings.
See also [[powershell-utf8-bom-json-trap]].
