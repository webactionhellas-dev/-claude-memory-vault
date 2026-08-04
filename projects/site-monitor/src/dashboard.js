import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { listTasks, createTask, updateTaskStatus, updateTask, deleteTask } from './tasks.js';
import { addSite, removeSite, setMuted } from './sites.js';
import { loadSettings, saveSettings, resetSettingsToDefaults } from './settings.js';
import { ROOT, saveConfig } from './lib.js';
import { STATE_PATH, DAY_CAP } from './state.js';
import { TASKS_DIR } from './tasks.js';
import { telegramConfigured } from './alerts.js';

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Web Action &middot; Site Monitor</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preload" href="/fonts/general-sans-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/jost-500.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/ibm-plex-mono-400.woff2" as="font" type="font/woff2" crossorigin>
<style>
  /* Self-hosted, not CDN-linked. This is a local desktop app: it has to render its own brand
     correctly on a laptop with no connection, and it previously reached out to two third-party
     CDNs on every load to do that. Worse, api.fontshare.com answers with
     Access-Control-Allow-Origin: https://api.fontshare.com, which does not match this app's
     http://localhost:8788 origin, so General Sans hard-failed with ERR_FAILED in one browser
     while succeeding in another - the UI silently dropped to system sans depending on which
     engine opened it. Only the latin subset and only the weights actually used are shipped:
     Jost 500 (verdict line, promoted headline), General Sans 400/500 (all UI text),
     IBM Plex Mono 400 (clock, URLs, every machine value). Four files.
     Jost and IBM Plex Mono are SIL Open Font License 1.1; General Sans is Fontshare/ITF,
     free for personal and commercial use. All three permit self-hosting.
     TRACE round-3 (section 5): every weight drops one step because light-on-dark blooms
     optically, so Jost 700 -> 500 and General Sans 600 is gone entirely (500 is now the
     heaviest weight anywhere in the app) - jost-700/general-sans-600/ibm-plex-mono-600 are
     no longer referenced. */
  @font-face { font-family: 'Jost'; font-style: normal; font-weight: 500; font-display: swap; src: url('/fonts/jost-500.woff2') format('woff2'); }
  @font-face { font-family: 'General Sans'; font-style: normal; font-weight: 400; font-display: swap; src: url('/fonts/general-sans-400.woff2') format('woff2'); }
  @font-face { font-family: 'General Sans'; font-style: normal; font-weight: 500; font-display: swap; src: url('/fonts/general-sans-500.woff2') format('woff2'); }
  @font-face { font-family: 'IBM Plex Mono'; font-style: normal; font-weight: 400; font-display: swap; src: url('/fonts/ibm-plex-mono-400.woff2') format('woff2'); }

  :root {
    color-scheme: dark;
    /* TRACE palette (2026-08-03 dark reskin). One field, no second surface: --card / --card-2
       are DEFINED AS var(--field) (a reference, not a duplicated literal) so every "card" in
       the existing markup is a 1px --line outline on black, never a fill - measured against
       Mike's real inability to resolve dark/near-black tones on his LG monitor, a card fill
       under 3:1 is not subtle, it is invisible to him. Referencing --field (rather than
       repeating its hex) also means the theme lint's rule 7 correctly treats --card/--card-2
       as the same already-exempt colour they actually are, instead of flagging a duplicate
       literal that measures 1:1 against itself by construction.
       --line / --line-2 are a warm-black-on-white-ink structural ramp at 3.02:1 / 4.51:1
       against --field, replacing the old opaque light hairlines, which is why they carry real
       structure now instead of decoration. --accent is the real Web Action brand blue; the
       clamp in the client script (search "OKLCH accent clamp") derives --accent-strong (fill)
       and --accent-text (text/ring) from it, hue-preserving, per round-3 spec section 10.
       --ok/--warn/--down (2026-08-03, Mike's explicit call): back to a real traffic-light
       read - green healthy, amber caution, red trouble - overriding the earlier "healthy
       carries no colour" report-by-exception theory. Values are saturated enough to read on
       Mike's LG monitor (same reasoning as the --line ramp above) without drifting into neon.
       --strip-up/--strip-none are new (round-3 spec section 8, the Sites page 90-day strip). */
    --field: #0B0E16; --card: var(--field); --card-2: var(--field); --line: #5C5F66; --line-2: #787A82;
    --ink: #EAF0FF; --ink-dim: #999CA3; --ink-faint: #999CA3;
    --accent: #3366FF; --accent-ink: #FFFFFF;
    --accent-text: #8FB6FF; --accent-strong: #3366FF;
    --ok: #2ECC71; --ok-bg: transparent; --ok-text: #3DDC84;
    --warn: #E0A62E; --warn-bg: transparent; --warn-text: #E0A62E;
    --down: #F0473D; --down-bg: transparent; --down-text: #FF5B50;
    --strip-up: #2ECC71; --strip-none: var(--line);
    /* Exactly two rectangle radii app-wide (theme lint rule 4). Pills/dots/badges use 50% or
       999px instead, both exempt from the ceiling since neither reads as "a rectangle radius
       choice" - they are "fully round", a different, unlimited category. */
    --r-lg: 10px; --r: 6px;
    /* Exactly five font sizes app-wide (theme lint rule 3), round-3 spec section 5. */
    --t-verdict: 40px; --t-lead: 22px; --t-fig: 15px; --t-body: 13px; --t-micro: 11px;
    --font-display: 'Jost', system-ui, sans-serif;
    --font-ui: 'General Sans', -apple-system, 'Segoe UI', sans-serif;
    --font-mono: 'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    font-family: var(--font-ui); font-size: var(--t-body); line-height: 1.45;
    background: var(--field); color: var(--ink);
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-track { background: var(--field); }
  ::-webkit-scrollbar-thumb { background: var(--line-2); border-radius: var(--r); }
  ::-webkit-scrollbar-thumb:hover { background: var(--ink-faint); }
  /* Role 2 of 6: :focus-visible is the only allowed accent outline (theme lint rule 1/8). */
  :focus-visible { outline: 2px solid var(--accent-text); outline-offset: 2px; }
  button, input, select { font: inherit; color: inherit; }
  .fig { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
  /* Role 4 of 6: a[href]/.link is the only allowed accent link colour. */
  .link, a[href] { color: var(--accent-text); }

  .pill {
    display: inline-flex; align-items: center; gap: 7px;
    font-family: var(--font-ui); font-size: var(--t-body); font-weight: 500;
    padding: 6px 12px; border-radius: 999px; border: 1px solid var(--line-2);
  }
  .pill .d { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; background: var(--ink-faint); }
  .pill.ok .d { background: var(--ok); } .pill.warn .d { background: var(--warn); } .pill.down .d { background: var(--down); }
  .clock { font-family: var(--font-mono); font-size: var(--t-fig); color: var(--ink-dim); font-variant-numeric: tabular-nums; min-width: 66px; text-align: right; }
  .iconbtn {
    width: 32px; height: 32px; border-radius: var(--r); border: 1px solid var(--line-2);
    background: rgba(234,240,255,.03);
    display: flex; align-items: center; justify-content: center; color: var(--ink-dim); cursor: pointer; flex-shrink: 0;
    transition: color .15s ease, border-color .15s ease, background-color .15s ease, transform .1s ease;
  }
  .iconbtn:hover { color: var(--ink); border-color: var(--ink-faint); background: rgba(234,240,255,.08); transform: translateY(-1px); }
  .iconbtn:active { transform: translateY(0); }
  .iconbtn.active { color: var(--accent-text); border-color: var(--accent-text); background: rgba(143,182,255,.14); }
  .iconbtn svg { width: 16px; height: 16px; }
  .iconbtn:disabled { opacity: .5; cursor: default; }
  .spin { animation: spin .7s linear infinite; }

  /* ---- layout ---- */
  .panel { border: 1px solid var(--line); border-radius: var(--r-lg); overflow: hidden; margin-bottom: 14px; }
  .panel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 15px 18px 12px; }
  .panel-head h2 { font-family: var(--font-ui); font-weight: 500; font-size: var(--t-micro); text-transform: uppercase; letter-spacing: .08em; margin: 0; color: var(--ink-faint); }
  .sub { font-family: var(--font-ui); font-size: var(--t-body); color: var(--ink-faint); white-space: nowrap; }
  .empty { padding: 26px 18px; text-align: center; color: var(--ink-faint); font-family: var(--font-ui); font-size: var(--t-body); }
  .empty.small { padding: 16px 6px; font-size: var(--t-micro); }

  /* ---- site health: dominates the layout when something's wrong ---- */
  .panel.health { border-top: 3px solid transparent; transition: border-color .18s ease; }
  .panel.health.alert { border-top-color: var(--warn); }
  .panel.health.alert.down { border-top-color: var(--down); }
  .alert-banner { display: none; align-items: center; gap: 8px; padding: 10px 18px; font-family: var(--font-ui); font-size: var(--t-body); font-weight: 500; border-bottom: 1px solid var(--line); }
  .alert-banner.show { display: flex; }
  .alert-banner.warn { color: var(--warn-text); }
  .alert-banner.down { color: var(--down-text); }
  .alert-banner .d { width: 7px; height: 7px; border-radius: 50%; background: currentColor; flex-shrink: 0; }

  .site-item { border-top: 1px solid var(--line); }
  .site-item:first-child { border-top: none; }
  .site-item.muted .site-row { opacity: .5; }
  .site-item.flash .site-row { animation: flashfade 1.8s ease-out; }
  .site-row {
    display: grid; grid-template-columns: 16px minmax(140px,1fr) minmax(120px,var(--strip-w,220px)) 112px 130px;
    gap: 14px; align-items: center; padding: 12px 18px;
  }
  .status-pill { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-ui); font-size: var(--t-micro); font-weight: 500; white-space: nowrap; }
  .status-pill .d { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .status-pill.ok .d { background: var(--ok); } .status-pill.ok { color: var(--ok-text); }
  .status-pill.warn .d { background: var(--warn); } .status-pill.warn { color: var(--warn-text); }
  .status-pill.down .d { background: var(--down); } .status-pill.down { color: var(--down-text); }
  .status-pill.unknown .d { background: var(--ink-faint); } .status-pill.unknown { color: var(--ink-faint); }
  /* The Sites ledger row's glyph column is 16px (round-3 spec section 8) - too narrow for the
     dot+word .status-pill used elsewhere (Settings preview, Dashboard). A bare glyph carries
     the state there; the word is still real, just on the element's title/aria-label instead
     of on screen, and always available again in the row's own expand detail. */
  .status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; display: block; }
  .status-dot.ok { background: var(--ok); } .status-dot.warn { background: var(--warn); }
  .status-dot.down { background: var(--down); } .status-dot.unknown { background: var(--ink-faint); }
  .sitecell { min-width: 0; }
  .sitecell .name { font-family: var(--font-ui); font-weight: 500; font-size: var(--t-body); color: var(--ink); display: inline-flex; align-items: center; gap: 7px; }
  .mutedtag { font-family: var(--font-ui); font-size: var(--t-micro); font-weight: 500; color: var(--ink-faint); border: 1px solid var(--line-2); border-radius: 999px; padding: 1px 8px; }
  .sitecell .url { font-family: var(--font-mono); font-size: var(--t-micro); color: var(--ink-faint); margin-top: 2px; overflow-wrap: anywhere; }
  .sitecell .note { font-family: var(--font-ui); font-size: var(--t-micro); color: var(--warn-text); margin-top: 4px; }

  /* ---- 90-day strip (round-3 spec section 8) ----
     Empty days draw a 2px baseline, not a cell: on this field, an empty near-white cell is
     invisible, so absence has to be an honest flat rule, not a blank gap that reads as "no
     strip was ever built here". Cells are flex:1 rather than a fixed 2px/3px + JS breakpoint
     - this fills whatever width the grid column actually has (always 90 slots, name column
     never jumps), which meets the spec's "continuous across the breakpoint" intent by not
     having a breakpoint to cross at all. */
  .strip-wrap { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .strip { display: flex; align-items: flex-end; height: 26px; gap: 1px; }
  .strip .cell { flex: 1 1 0; min-width: 1px; border-radius: 999px; background: var(--strip-none); height: 2px; cursor: default; }
  .strip .cell.up { background: var(--strip-up); height: 22px; }
  .strip .cell.warn { background: var(--warn); height: 22px; }
  .strip .cell.down { background: var(--down); height: 26px; }
  .strip .cell:hover { box-shadow: 0 0 0 1px var(--ink); }
  .strip-cap { font-family: var(--font-ui); font-size: var(--t-micro); font-weight: 500; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-faint); text-align: right; }

  /* ---- live sparkline (2026-08-03, replaces the mostly-empty 90-day strip per-row): real
     recent-check data, redrawn on every poll, plus a continuously pulsing ring on the latest
     point so the row visibly breathes between checks instead of sitting dead for 10 minutes. */
  .spark { width: 100%; height: 26px; display: block; overflow: visible; }
  .spark-area { opacity: .16; }
  .spark-line { vector-effect: non-scaling-stroke; }
  .spark-live-ring { transform-box: fill-box; transform-origin: center; animation: sparkLive 1.8s ease-out infinite; }
  @keyframes sparkLive { 0% { opacity: .85; transform: scale(1); } 100% { opacity: 0; transform: scale(2.6); } }
  @media (prefers-reduced-motion: reduce) { .spark-live-ring { animation: none; opacity: 0; } }

  .metacell { font-family: var(--font-mono); font-size: var(--t-fig); font-variant-numeric: tabular-nums; text-align: right; }
  .metacell .ms { font-weight: 400; transition: color .5s ease; }
  .metacell .ms.live { color: var(--accent-text); }
  .metacell .ms .u { color: var(--ink-dim); font-weight: 400; }
  .livepulse { display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: var(--accent-fill, var(--accent)); margin-left: 6px; opacity: 0; vertical-align: middle; }
  .livepulse.on { animation: livepulse .9s ease-out; }
  @keyframes livepulse { 0% { opacity: .9; transform: scale(1.6); } 100% { opacity: 0; transform: scale(1); } }
  @media (prefers-reduced-motion: reduce) { .metacell .ms, .livepulse.on { animation: none !important; transition: none !important; } }
  .metacell .reach { color: var(--ink-dim); font-size: var(--t-micro); margin-top: 2px; }
  .metacell .ssl { color: var(--ink-dim); font-size: var(--t-micro); margin-top: 2px; }
  .metacell .ssl.warn { color: var(--warn-text); }
  .metacell.hovered { color: var(--ink-dim); }
  .rowactions { display: flex; gap: 6px; justify-self: end; }
  .rowactions .iconbtn { width: 28px; height: 28px; }
  .rowactions .iconbtn svg { width: 14px; height: 14px; }

  .expand { display: grid; grid-template-rows: 0fr; overflow: hidden; transition: grid-template-rows .18s ease; }
  .expand > .inner { min-height: 0; overflow: hidden; }
  .site-item.hist-open .hist-expand, .site-item.confirm-open .confirm-expand { grid-template-rows: 1fr; }
  .hist-inner { padding: 4px 18px 14px 30px; }
  .hist-facts { display: flex; flex-wrap: wrap; gap: 4px 18px; font-family: var(--font-ui); font-size: var(--t-body); color: var(--ink-dim); padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px solid var(--line); }
  .hist-facts b { color: var(--ink); font-weight: 500; }
  .hist-list { display: flex; flex-direction: column; gap: 5px; }
  .hist-row { display: flex; align-items: center; gap: 9px; font-family: var(--font-ui); font-size: var(--t-micro); }
  .hist-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .hist-dot.ok { background: var(--ok); } .hist-dot.warn { background: var(--warn); } .hist-dot.down { background: var(--down); }
  .hist-time { font-family: var(--font-mono); color: var(--ink-dim); min-width: 58px; }
  .hist-ms { font-family: var(--font-mono); color: var(--ink-faint); }
  .inline-confirm { display: flex; align-items: center; gap: 10px; padding: 4px 18px 14px; font-size: var(--t-body); color: var(--ink-dim); flex-wrap: wrap; }
  .inline-confirm button { font-family: var(--font-ui); font-size: var(--t-body); font-weight: 500; border-radius: var(--r); padding: 6px 12px; cursor: pointer; border: 1px solid var(--line-2); background: none; color: var(--ink); }
  .inline-confirm .danger { color: var(--down-text); }
  .row-error { font-family: var(--font-ui); font-size: var(--t-micro); color: var(--down-text); padding: 0 18px 10px 18px; }

  /* ---- shared add-bar (sites + tasks) ----
     align-items: center is explicit, not inherited from flex's default stretch: these rows sit
     inside panels, and a stretch default is what let the task add-bar's five controls each
     balloon to 182px tall once the panel above became a grid. Centering also keeps the button
     optically aligned with the inputs when they wrap onto two lines on a narrow window. */
  .addbar { display: flex; align-items: center; gap: 8px; padding: 14px 18px; flex-wrap: wrap; border-top: 1px solid var(--line); }
  .addbar input, .addbar select {
    background: none; color: var(--ink); border: 1px solid var(--line-2); border-radius: var(--r);
    padding: 9px 11px; font-size: var(--t-body); font-family: var(--font-ui); transition: border-color .15s ease;
  }
  /* Not one of the six accent roles: a form control gaining focus is structural feedback, the
     same "ring, not accent" rule as row hover/selection (round-3 spec section 3.4). */
  .addbar input:focus, .addbar select:focus { outline: none; border-color: var(--ink-faint); }
  .addbar input::placeholder { color: var(--ink-faint); }
  .addbar input#newTitle { flex: 1; min-width: 200px; }
  .addbar input#newSiteName { width: 170px; } .addbar input#newSiteUrl { flex: 1; min-width: 200px; }
  /* Role 1 of 6: .btn-primary is the only allowed accent fill (background/color only - the
     round-3 spec's role list intentionally does not include box-shadow, so its hover state
     below reads as a lift, not a colour, per the "wash" ban in section 3.4). */
  .btn-primary {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--accent-strong); color: var(--accent-ink); border: none; border-radius: var(--r); padding: 9px 16px;
    font-size: var(--t-body); font-weight: 500; font-family: var(--font-ui); cursor: pointer;
    transition: transform .15s ease, filter .15s ease;
  }
  .btn-primary svg { width: 13px; height: 13px; }
  .btn-primary:hover { transform: translateY(-1px); filter: brightness(1.08); }
  .btn-primary:active { transform: translateY(0); }
  .btn-secondary {
    font-family: var(--font-ui); font-size: var(--t-body); font-weight: 500; color: var(--ink);
    background: none; border: 1px solid var(--line-2); border-radius: var(--r); padding: 9px 16px; cursor: pointer;
  }
  .btn-secondary:hover { border-color: var(--ink-faint); }
  .form-error { padding: 0 18px 14px; font-size: var(--t-micro); color: var(--down-text); }

  /* ---- task board ----
     Only the inner kanban region (#board) is ever a grid. The wrapping <section> is a plain
     .panel that stacks its children (heading, add bar, kanban) as normal block flow: it used
     to also carry this same .board class, which turned the PANEL into a 4-column grid too and
     auto-placed its three children sideways into columns - measured live at 1280px as
     grid-template-columns 347.672px 236px 587.969px 0px, scrollWidth 1244 against clientWidth
     1134 under overflow:hidden, so the Done column was clipped away entirely. That one
     duplicated class was also what stretched every add-task control to 182px tall (each
     control was a flex child of an .addbar that had itself become a full-height grid item).
     minmax(0, 1fr) rather than a bare 1fr so a long unbroken task title can never blow a
     column wider than its quarter share and reintroduce the same horizontal clipping. */
  .board { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; padding: 16px 18px 18px; }
  .col { border: 1px solid var(--line); border-radius: var(--r); padding: 10px; min-height: 64px; }
  .col-head { display: flex; align-items: center; justify-content: space-between; padding: 3px 5px 10px; }
  .col-head .t { font-family: var(--font-ui); font-size: var(--t-micro); font-weight: 500; color: var(--ink-dim); }
  .col-head .c { font-family: var(--font-mono); font-size: var(--t-micro); color: var(--ink-faint); border: 1px solid var(--line); padding: 1px 7px; border-radius: 999px; }
  .col[data-status="in_progress"] .col-head .t { color: var(--ink); }
  .col[data-status="blocked"] .col-head .t { color: var(--down-text); }
  .col[data-status="done"] .col-head .t { color: var(--ok-text); }
  .task { border: 1px solid var(--line); border-radius: var(--r); padding: 11px 12px; margin-bottom: 8px; transition: opacity .18s ease, transform .18s ease; }
  .task.enter { animation: taskIn .28s cubic-bezier(.2,.8,.2,1) both; }
  .task.removing { opacity: 0; transform: scale(.96); }
  .task .t { font-family: var(--font-ui); font-size: var(--t-body); font-weight: 500; line-height: 1.4; margin-bottom: 9px; color: var(--ink); }
  .task .row2 { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
  .task select { font-family: var(--font-ui); font-size: var(--t-micro); background: none; color: var(--ink-dim); border: 1px solid var(--line-2); border-radius: var(--r); padding: 4px 6px; cursor: pointer; transition: color .15s, border-color .15s; max-width: 50%; }
  .task select:hover, .task select:focus { color: var(--ink); border-color: var(--ink-faint); }
  .task select.statusSelect { margin-left: auto; }
  .task .row3 { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding-top: 8px; border-top: 1px solid var(--line); }
  .proj { font-family: var(--font-mono); font-size: var(--t-micro); color: var(--ink-faint); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .proj:empty { display: none; }
  .priorityFlag { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-ui); font-size: var(--t-micro); font-weight: 500; color: var(--ink-faint); }
  .priorityFlag svg { width: 10px; height: 10px; }
  .priorityFlag[data-p=""] { display: none; }
  .priorityFlag[data-p="high"] { color: var(--ink); }
  .priorityFlag[data-p="urgent"] { color: var(--down-text); }
  .row3 .icons { display: flex; gap: 4px; margin-left: auto; flex-shrink: 0; }
  .row3 .iconbtn { width: 23px; height: 23px; border-radius: var(--r); }
  .row3 .iconbtn svg { width: 12px; height: 12px; }

  .tedit, .tconfirm { display: grid; grid-template-rows: 0fr; overflow: hidden; transition: grid-template-rows .18s ease; }
  .tedit > .inner, .tconfirm > .inner { min-height: 0; overflow: hidden; }
  .task.editing .tedit, .task.confirming .tconfirm { grid-template-rows: 1fr; }
  .tedit .inner { padding-top: 10px; display: flex; flex-direction: column; gap: 7px; }
  .tedit input, .tedit select { width: 100%; background: none; border: 1px solid var(--line-2); border-radius: var(--r); padding: 7px 9px; font-family: var(--font-ui); font-size: var(--t-body); }
  .tedit .editRow { display: flex; gap: 7px; }
  .tedit .editActions { display: flex; gap: 7px; margin-top: 2px; }
  .tedit .editActions button { flex: 1; font-family: var(--font-ui); font-size: var(--t-body); font-weight: 500; border-radius: var(--r); padding: 7px; cursor: pointer; border: 1px solid var(--line-2); background: none; color: var(--ink); }
  .tedit .editActions .saveBtn.btn-primary { border-color: transparent; flex: 1; }
  .tconfirm .inner { padding-top: 10px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: var(--t-body); color: var(--ink-dim); }
  .tconfirm button { font-family: var(--font-ui); font-size: var(--t-micro); font-weight: 500; border-radius: var(--r); padding: 6px 10px; cursor: pointer; border: 1px solid var(--line-2); background: none; color: var(--ink); }
  .tconfirm .danger { color: var(--down-text); }
  .task .task-error { padding: 6px 0 0; }

  @keyframes flashfade { 0% { box-shadow: inset 0 0 0 1px var(--line-2); } 100% { box-shadow: inset 0 0 0 1px transparent; } }
  @keyframes taskIn { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: none; } }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 760px) {
    .site-row { grid-template-columns: 16px 1fr; row-gap: 8px; }
    .strip-wrap, .metacell, .rowactions { grid-column: 2; }
    .board { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .panel-head { flex-wrap: wrap; row-gap: 4px; }
    .panel-head .sub { white-space: normal; }
  }
  @media (max-width: 480px) {
    .board { grid-template-columns: minmax(0, 1fr); }
  }

  @media (prefers-reduced-motion: reduce) {
    .task.enter, .site-item.flash .site-row, .spin { animation: none !important; }
    .task, .expand, .tedit, .tconfirm, .btn-primary, .task.removing { transition: none !important; }
  }
  #starfield { position: fixed; inset: 0; z-index: -3; display: block; }

  /* ---- app shell: sidebar + four-page routing (round-3 architecture) ----
     The sidebar owns brand + navigation, a 44px title strip owns page name + clock/status/
     settings, and the four pages each live inside their own .pageview, shown/hidden
     client-side. The starfield canvas is a sibling of .shell, outside every .pageview, so
     switching pages never tears it down or reseeds it. */
  html, body { height: 100%; }
  body { overflow: hidden; }
  .shell { display: flex; height: 100vh; height: 100svh; position: relative; z-index: 1; }
  .sidebar { width: 240px; flex-shrink: 0; height: 100%; display: flex; flex-direction: column; padding-top: 20px; }
  .sidebar-top { padding: 0 20px 22px; -webkit-app-region: drag; }
  .sidebar-top .mark { height: 34px; width: auto; display: block; }
  .sidebar-top .cap { font-family: var(--font-ui); font-size: var(--t-micro); font-weight: 500; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-faint); margin-top: 8px; }
  .shell-rule { width: 1px; flex-shrink: 0; background: var(--line); }
  .nav { display: flex; flex-direction: column; gap: 2px; padding: 0 12px; }
  .navitem {
    display: flex; align-items: center; gap: 12px; height: 36px; padding: 0 10px; width: 100%;
    border-radius: var(--r); border: none; background: none; cursor: pointer; text-align: left;
    color: var(--ink-faint); font-family: var(--font-ui); font-size: var(--t-body); font-weight: 500;
    transition: color .15s ease;
  }
  .navitem svg { width: 18px; height: 18px; flex-shrink: 0; color: inherit; }
  /* Role 6 of 6: .nav [aria-current="page"] is the only allowed accent nav indicator - the
     current page carries three redundant channels (icon colour, box-shadow bar, ink label),
     no background wash, matching round-3 spec section 6's table exactly. */
  .nav .navitem:hover { color: var(--ink); }
  .nav .navitem[aria-current="page"] { color: var(--ink); box-shadow: inset 3px 0 0 0 var(--accent-strong); }
  .nav .navitem[aria-current="page"] svg { color: var(--accent-text); }
  .sidebar-foot { margin-top: auto; padding: 12px 20px 18px; border-top: 1px solid var(--line); }
  .sidebar-foot .l { font-family: var(--font-ui); font-size: var(--t-micro); font-weight: 500; letter-spacing: .07em; text-transform: uppercase; color: var(--ink-faint); margin-bottom: 4px; }
  .sidebar-foot .row { display: flex; align-items: baseline; gap: 6px; }
  .sidebar-foot .stamp { font-family: var(--font-mono); font-size: var(--t-fig); color: var(--ink-dim); }
  .sidebar-foot .stamp.stale { color: var(--warn-text); }
  .sidebar-foot .every { font-family: var(--font-ui); font-size: var(--t-micro); color: var(--ink-faint); }

  .content { flex: 1; min-width: 0; height: 100%; display: flex; flex-direction: column; }
  .titlestrip {
    height: 44px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between;
    padding: 0 22px; border-bottom: 1px solid var(--line); -webkit-app-region: drag;
    background: var(--field);
  }
  .titlestrip .pagename { font-family: var(--font-ui); font-size: var(--t-micro); font-weight: 500; letter-spacing: .07em; text-transform: uppercase; color: var(--ink-faint); }
  .titlestrip-right { display: flex; align-items: center; gap: 12px; -webkit-app-region: no-drag; }

  .pagewrap { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: none; }
  .pageview { max-width: 1180px; margin: 0 auto; padding: 22px 22px 48px; }
  .pageview[hidden] { display: none; }

  /* ---- Dashboard page: verdict block + report-by-exception (round-two spec section 3/5 logic,
     structure only - the SEV enum, severity tables and every copy string are ported, not
     reinvented). Sites/Tasks pages keep the FULL existing panels untouched below. ---- */
  .verdict { padding: 4px 2px 26px; }
  .verdict .l1 { font-family: var(--font-display); font-weight: 500; font-size: var(--t-verdict); line-height: 1.05; color: var(--ink); letter-spacing: -.03em; }
  .verdict .l2 { font-family: var(--font-display); font-weight: 400; font-size: var(--t-lead); line-height: 1.2; color: var(--ink-dim); margin-top: 6px; letter-spacing: -.018em; }
  .verdict .ev { font-family: var(--font-ui); font-size: var(--t-body); color: var(--ink-faint); margin-top: 10px; }

  .region { margin-bottom: 32px; }
  .region-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px; }
  .region-head .rt { font-family: var(--font-ui); font-size: var(--t-micro); font-weight: 500; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-faint); }
  .region-head .rs { font-family: var(--font-ui); font-size: var(--t-body); color: var(--ink-faint); }

  .promoted { position: relative; border-radius: var(--r-lg); box-shadow: inset 0 0 0 1px var(--line); padding: 12px 16px 12px 20px; margin-bottom: 8px; overflow: hidden; }
  .promoted::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
  /* Selector shape matches the round-3 spec exactly (section 4): .promoted[data-sev]. Also
     the one shape the lint's rest-blur rule (9) allowlists for an at-rest glow, so the two
     severities below are the only coloured shadows this app ships. */
  .promoted[data-sev="attention"] { box-shadow: inset 0 0 0 1px var(--warn), 0 0 22px -8px var(--warn); }
  .promoted[data-sev="attention"]::before { background: var(--warn); }
  .promoted[data-sev="urgent"] { box-shadow: inset 0 0 0 1px var(--down), 0 0 22px -8px var(--down); }
  .promoted[data-sev="urgent"]::before { background: var(--down); }
  .promoted .head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .promoted .headline { font-family: var(--font-ui); font-size: var(--t-body); font-weight: 500; color: var(--ink); }
  .promoted[data-sev="attention"] .headline { color: var(--warn-text); }
  .promoted[data-sev="urgent"] .headline { color: var(--down-text); }
  .promoted .detail { font-family: var(--font-mono); font-size: var(--t-fig); color: var(--ink-dim); margin-top: 4px; }
  .promoted .since { font-family: var(--font-ui); font-size: var(--t-micro); color: var(--ink-faint); margin-top: 4px; }
  .promoted .act {
    flex-shrink: 0; font-family: var(--font-ui); font-size: var(--t-micro); font-weight: 500; color: var(--ink);
    background: none; border: 1px solid var(--line-2); border-radius: var(--r); padding: 6px 11px; cursor: pointer;
  }
  .promoted .act:hover { border-color: var(--ink-faint); }
  .promoted .act:disabled { opacity: .55; cursor: default; }

  .dash-list { border-radius: var(--r-lg); overflow: hidden; box-shadow: inset 0 0 0 1px var(--line); }
  .dash-row { display: grid; grid-template-columns: 20px minmax(0,1fr) 90px 100px; align-items: center; gap: 12px; height: 32px; padding: 0 14px; border-top: 1px solid var(--line); }
  .dash-row:first-child { border-top: none; }
  .dash-row .dot { width: 6px; height: 6px; border-radius: 50%; justify-self: center; background: var(--ok); }
  .dash-row .nm { font-family: var(--font-ui); font-size: var(--t-body); font-weight: 500; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dash-row .ms { font-family: var(--font-mono); font-size: var(--t-micro); color: var(--ink-dim); text-align: right; }
  .dash-row .fresh { font-family: var(--font-mono); font-size: var(--t-micro); color: var(--ink-faint); text-align: right; }

  /* ---- Settings page (round-3 spec section 9): seven groups, one scrolling column ---- */
  .settings-col { max-width: 720px; display: flex; flex-direction: column; gap: 16px; }
  .setgroup { border: 1px solid var(--line); border-radius: var(--r-lg); padding: 20px; }
  .setgroup .sg-h { font-family: var(--font-ui); font-size: var(--t-micro); font-weight: 500; letter-spacing: .08em; text-transform: uppercase; color: var(--ink); margin-bottom: 4px; }
  .setgroup .sg-d { font-family: var(--font-ui); font-size: var(--t-body); color: var(--ink-faint); line-height: 1.5; margin-bottom: 16px; }
  .setrow { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 0; border-top: 1px solid var(--line); }
  .setrow:first-of-type { border-top: none; padding-top: 0; }
  .setrow .lbl { font-family: var(--font-ui); font-size: var(--t-body); color: var(--ink); }
  .setrow .lbl .unit { color: var(--ink-faint); margin-left: 6px; font-size: var(--t-micro); }
  .setrow input[type="number"] {
    width: 96px; text-align: right; background: none; color: var(--ink); border: 1px solid var(--line-2);
    border-radius: var(--r); padding: 7px 9px; font-family: var(--font-mono); font-size: var(--t-fig);
  }
  .setrow input[type="number"]:focus { outline: none; border-color: var(--ink-faint); }

  .toggle { position: relative; display: inline-block; width: 38px; height: 22px; flex-shrink: 0; }
  .toggle input { position: absolute; opacity: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
  .toggle .track { position: absolute; inset: 0; border-radius: 999px; border: 1px solid var(--line-2); background: none; transition: border-color .15s ease; }
  .toggle .knob { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--ink-faint); transition: transform .15s ease, background-color .15s ease; }
  .toggle input:checked ~ .track { border-color: var(--ink); }
  .toggle input:checked ~ .knob { background: var(--ink); transform: translateX(16px); }
  .toggle input:focus-visible ~ .track { outline: 2px solid var(--accent-text); outline-offset: 2px; }

  .swatchrow { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-start; }
  .swatchitem { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .swatchitem button { width: 40px; height: 28px; border-radius: var(--r); border: 2px solid transparent; cursor: pointer; padding: 0; }
  .swatchitem button.selected { border-color: var(--ink); }
  .swatchitem .nm { font-family: var(--font-ui); font-size: var(--t-micro); color: var(--ink-faint); }
  .customdisclose { font-family: var(--font-ui); font-size: var(--t-micro); font-weight: 500; color: var(--ink-dim); background: none; border: none; padding: 6px 0 0; cursor: pointer; text-decoration: underline; }
  .customrow { display: none; align-items: center; gap: 8px; margin-top: 10px; }
  .customrow.open { display: flex; }
  .customrow input[type="text"] { width: 110px; background: none; color: var(--ink); border: 1px solid var(--line-2); border-radius: var(--r); padding: 7px 9px; font-family: var(--font-mono); font-size: var(--t-fig); text-transform: uppercase; }
  .customrow input[type="text"]:focus { outline: none; border-color: var(--ink-faint); }
  .clampnote { font-family: var(--font-ui); font-size: var(--t-micro); color: var(--warn-text); margin-top: 8px; min-height: 14px; }

  .preview { border: 1px solid var(--line); border-radius: var(--r); padding: 14px; margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
  .preview .prow { display: flex; align-items: center; justify-content: space-between; font-family: var(--font-ui); font-size: var(--t-body); padding: 6px 8px; border-radius: var(--r); }
  /* Role 3 of 6: .row[aria-selected="true"] is the only allowed accent selection indicator -
     the literal selector shape the theme lint's six roles require (round-3 spec 10.3, role 3),
     so the preview's demo "selected row" carries the class .row and the real attribute. */
  .preview .row[aria-selected="true"] { box-shadow: inset 0 0 0 1px var(--line-2), inset 3px 0 0 0 var(--accent-strong); }
  .preview .prow .status-pill { pointer-events: none; }

  .factrow { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 8px 0; border-top: 1px solid var(--line); }
  .factrow:first-of-type { border-top: none; padding-top: 0; }
  .factrow .k { font-family: var(--font-ui); font-size: var(--t-body); color: var(--ink-dim); }
  .factrow .v { font-family: var(--font-mono); font-size: var(--t-fig); color: var(--ink); text-align: right; overflow-wrap: anywhere; }
  .factrow button { flex-shrink: 0; }

  .aboutlockup { height: 60px; width: auto; display: block; margin-bottom: 14px; }
  .aboutver { font-family: var(--font-mono); font-size: var(--t-fig); color: var(--ink-dim); margin-bottom: 16px; }

  /* ---- Ctrl+K command palette (real actions only, no decoration) ----
     The backdrop dims with the opacity property on a var(--field) fill, not a translucent
     black rgba: same visual effect, but it keeps every colour in this block a real, measured
     token instead of an ad hoc alpha value the theme lint (rule 7) cannot verify. No drop
     shadow either - blur is rationed to the one promoted card app-wide (round-3 spec section
     4); the 1px border plus the dimmed backdrop is enough definition, and a black blur is
     invisible on Mike's monitor besides. */
  .palette-backdrop { position: fixed; inset: 0; background: var(--field); opacity: 0; z-index: 60; display: none; align-items: flex-start; justify-content: center; padding-top: 12vh; pointer-events: none; }
  .palette-backdrop.open { display: flex; opacity: .72; pointer-events: auto; }
  .palette { width: min(560px, 88vw); max-height: 60vh; display: flex; flex-direction: column; border-radius: var(--r-lg); border: 1px solid var(--line-2); background: var(--field); overflow: hidden; }
  .palette input {
    width: 100%; background: none; color: var(--ink); border: none; border-bottom: 1px solid var(--line);
    padding: 16px 18px; font-family: var(--font-ui); font-size: var(--t-lead); font-weight: 400;
  }
  .palette input:focus { outline: none; }
  .palette-results { overflow-y: auto; padding: 6px; }
  .palette-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border-radius: var(--r); cursor: pointer; font-family: var(--font-ui); font-size: var(--t-body); color: var(--ink); }
  .palette-item .kind { font-family: var(--font-ui); font-size: var(--t-micro); color: var(--ink-faint); text-transform: uppercase; letter-spacing: .06em; }
  /* Role 3 again: the palette's highlighted result is a .row[aria-selected="true"] too. */
  .palette-item.row[aria-selected="true"] { box-shadow: inset 0 0 0 1px var(--line-2), inset 3px 0 0 0 var(--accent-strong); }
  .palette-empty { padding: 18px; text-align: center; font-family: var(--font-ui); font-size: var(--t-body); color: var(--ink-faint); }

  @media (max-width: 900px) {
    .sidebar { width: 72px; }
    .sidebar-top .cap, .navitem span:not(.sr), .sidebar-foot { display: none; }
    .navitem { justify-content: center; }
  }
</style></head>
<body>

<canvas id="starfield"></canvas>

<div class="shell">
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-top">
      <img class="mark" src="/brand/wa-mark.webp" alt="Web Action" width="100" height="34">
      <div class="cap">Site Monitor</div>
    </div>
    <nav class="nav" id="nav" aria-label="Pages">
      <button type="button" class="navitem" data-page="dashboard" title="Dashboard (Ctrl+1)">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="4" y1="16" x2="4" y2="10"/><line x1="10" y1="16" x2="10" y2="5"/><line x1="16" y1="16" x2="16" y2="8"/></svg>
        <span>Dashboard</span>
      </button>
      <button type="button" class="navitem" data-page="sites" title="Sites (Ctrl+2)">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10" cy="10" r="7"/><line x1="3" y1="10" x2="17" y2="10"/><ellipse cx="10" cy="10" rx="3" ry="7"/></svg>
        <span>Sites</span>
      </button>
      <button type="button" class="navitem" data-page="tasks" title="Tasks (Ctrl+3)">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3.5" y="3.5" width="13" height="13" rx="1.5"/><line x1="6.5" y1="9.5" x2="13.5" y2="9.5"/><line x1="6.5" y1="13" x2="13.5" y2="13"/></svg>
        <span>Tasks</span>
      </button>
      <button type="button" class="navitem" data-page="settings" title="Settings (Ctrl+4)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><circle cx="14" cy="6" r="2"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="8" cy="12" r="2"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="16" cy="18" r="2"/></svg>
        <span>Settings</span>
      </button>
    </nav>
    <div class="sidebar-foot">
      <div class="l">Checked</div>
      <div class="row"><span class="stamp fig" id="sfStamp">--</span><span class="every" id="sfEvery">every -- m</span></div>
    </div>
  </aside>
  <div class="shell-rule"></div>
  <div class="content">
    <header class="titlestrip">
      <span class="pagename" id="pageName">Dashboard</span>
      <div class="titlestrip-right">
        <div class="pill" id="statusPill"><span class="d"></span><span id="statusPillText">Connecting&hellip;</span></div>
        <div class="clock fig" id="clock">--:--:--</div>
        <button class="iconbtn" id="paletteBtn" aria-label="Open command palette" title="Command palette (Ctrl+K)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
        <button class="iconbtn" id="gearBtn" aria-label="Open settings" title="Settings (Ctrl+4)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><circle cx="14" cy="6" r="2"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="8" cy="12" r="2"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="16" cy="18" r="2"/></svg>
        </button>
      </div>
    </header>
    <main class="pagewrap">
      <section class="pageview" data-page="dashboard" id="page-dashboard">
        <div class="verdict">
          <div class="l1" id="vLine1">Loading&hellip;</div>
          <div class="l2" id="vLine2"></div>
          <div class="ev" id="vEvidence"></div>
        </div>
        <div class="region" id="dashSitesRegion">
          <div class="region-head"><span class="rt">Sites</span><span class="rs" id="dashSitesSummary"></span></div>
          <div id="dashSitesPromo"></div>
          <div class="dash-list" id="dashSitesList"></div>
        </div>
      </section>

      <section class="pageview" data-page="sites" id="page-sites" hidden>
        <section class="panel health" id="healthPanel">
          <div class="panel-head">
            <h2>Site health</h2>
            <span class="sub" id="siteSub">loading&hellip;</span>
          </div>
          <div class="alert-banner" id="alertBanner"><span class="d"></span><span id="alertBannerText"></span></div>
          <div id="siteList"><div class="empty">Loading&hellip;</div></div>
          <div class="addbar">
            <input type="text" id="newSiteName" placeholder="Site name" aria-label="Name of the site to monitor">
            <input type="text" id="newSiteUrl" placeholder="https://example.com" aria-label="URL of the site to monitor">
            <button type="button" class="btn-primary" id="addSiteBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add site</button>
          </div>
          <div class="form-error" id="siteAddError"></div>
        </section>
      </section>

      <section class="pageview" data-page="tasks" id="page-tasks" hidden>
        <section class="panel" id="boardPanel">
          <div class="panel-head">
            <h2>Task board</h2>
            <span class="sub">assign, edit, and track &middot; syncs to the shared vault</span>
          </div>
          <div class="addbar">
            <input type="text" id="newTitle" placeholder="What needs doing?" aria-label="New task title">
            <input type="text" id="newAssignee" placeholder="Assignee" aria-label="New task assignee">
            <input type="text" id="newProject" placeholder="Project (optional)" aria-label="New task project">
            <select id="newPriority" aria-label="New task priority">
              <option value="">No priority</option><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select>
            <button type="button" class="btn-primary" id="addTaskBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add task</button>
          </div>
          <div class="board" id="board"></div>
        </section>
      </section>

      <section class="pageview" data-page="settings" id="page-settings" hidden>
        <div class="settings-col">

          <section class="setgroup">
            <div class="sg-h">Appearance</div>
            <div class="sg-d">Accent colour, used sparingly - the primary button, links, the current page, a selected row. Every change applies live.</div>
            <div class="swatchrow" id="accentSwatchRow"></div>
            <button type="button" class="customdisclose" id="accentCustomDisclose">Custom&hellip;</button>
            <div class="customrow" id="accentCustomRow">
              <input type="text" id="accentCustomInput" maxlength="7" placeholder="#3366FF" aria-label="Custom accent hex">
              <span class="sub">#RRGGBB</span>
            </div>
            <div class="clampnote" id="accentClampNote"></div>
            <div class="preview" id="accentPreview">
              <div class="prow"><span class="status-pill warn"><span class="d"></span>Needs attention</span><span class="fig" style="color:var(--warn-text)">812 ms</span></div>
              <div class="prow"><span class="status-pill down"><span class="d"></span>Down</span><span class="fig" style="color:var(--down-text)">timeout</span></div>
              <div class="prow row" aria-selected="true"><span>Selected row</span><span class="fig">491 ms</span></div>
              <button type="button" class="btn-primary" style="align-self:flex-start;margin-top:2px;">Primary action</button>
            </div>
          </section>

          <section class="setgroup">
            <div class="sg-h">Field colour</div>
            <div class="sg-d">The one field every line is measured against. A custom colour is darkened automatically, hue preserved, if it would break that measurement.</div>
            <div class="swatchrow" id="fieldSwatchRow"></div>
            <button type="button" class="customdisclose" id="fieldCustomDisclose">Custom&hellip;</button>
            <div class="customrow" id="fieldCustomRow">
              <input type="text" id="fieldCustomInput" maxlength="7" placeholder="#0B0E16" aria-label="Custom field hex">
              <span class="sub">#RRGGBB</span>
            </div>
            <div class="clampnote" id="fieldClampNote"></div>
          </section>

          <section class="setgroup">
            <div class="sg-h">Monitoring</div>
            <div class="sg-d">Real values read from and written to config.json. Every change applies live, no restart needed.</div>
            <div class="setrow"><span class="lbl">Check every<span class="unit">minutes</span></span><input type="number" id="setInterval" min="1" max="1440" step="1"></div>
            <div class="setrow"><span class="lbl">Slow above<span class="unit">ms</span></span><input type="number" id="setSlowMs" min="1" max="120000" step="100"></div>
            <div class="setrow"><span class="lbl">Very slow above<span class="unit">ms</span></span><input type="number" id="setCriticalMs" min="1" max="120000" step="100"></div>
            <div class="setrow"><span class="lbl">Pictures checked per site</span><input type="number" id="setMaxImages" min="1" max="200" step="1"></div>
            <div class="setrow"><span class="lbl">Checks kept per site</span><input type="number" id="setHistoryWindow" min="1" max="1000" step="1"></div>
            <div class="clampnote" id="monitorNote"></div>
          </section>

          <section class="setgroup">
            <div class="sg-h">Security settings watched</div>
            <div class="sg-d">The direct cause of every security warning on screen. Toggling one off stops checking for it on every future check.</div>
            <div class="setrow"><span class="lbl">strict-transport-security</span><label class="toggle"><input type="checkbox" id="hdrHsts"><span class="track"></span><span class="knob"></span></label></div>
            <div class="setrow"><span class="lbl">x-content-type-options</span><label class="toggle"><input type="checkbox" id="hdrCto"><span class="track"></span><span class="knob"></span></label></div>
            <div class="setrow"><span class="lbl">x-frame-options</span><label class="toggle"><input type="checkbox" id="hdrXfo"><span class="track"></span><span class="knob"></span></label></div>
            <div class="clampnote" id="hdrSummary" style="color:var(--ink-dim);"></div>
          </section>

          <section class="setgroup">
            <div class="sg-h">Phone alerts</div>
            <div class="sg-d" id="telegramStatus">Checking&hellip;</div>
            <div class="sub">Configured in .env as TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID. A bot token is a credential - this page never asks for one.</div>
          </section>

          <section class="setgroup">
            <div class="sg-h">Storage</div>
            <div class="factrow"><span class="k">Tasks directory</span><span class="v fig" id="storeTasksDir">&ndash;</span><button type="button" class="btn-secondary" id="revealTasksBtn">Reveal</button></div>
            <div class="factrow"><span class="k">State file</span><span class="v fig" id="storeStateFile">&ndash;</span><button type="button" class="btn-secondary" id="revealStateBtn">Reveal</button></div>
            <div class="factrow"><span class="k">Days retained</span><span class="v fig" id="storeDaysRetained">&ndash;</span></div>
            <div class="factrow"><span class="k">Checks retained per site</span><span class="v fig" id="storeChecksRetained">&ndash;</span></div>
          </section>

          <section class="setgroup">
            <div class="sg-h">About</div>
            <img class="aboutlockup" src="/brand/wa-lockup.webp" alt="Web Action" height="60">
            <div class="aboutver">Site Monitor <span id="aboutVersion" class="fig">&ndash;</span></div>
            <button type="button" class="btn-secondary" id="resetDefaultsBtn">Reset everything to defaults</button>
          </section>

        </div>
      </section>
    </main>
  </div>
</div>

<div class="palette-backdrop" id="paletteBackdrop">
  <div class="palette" role="dialog" aria-label="Command palette">
    <input type="text" id="paletteInput" placeholder="Check a site, open a task, run a command&hellip;" autocomplete="off" spellcheck="false">
    <div class="palette-results" id="paletteResults"></div>
  </div>
</div>

<script>
var STATUSES = ['todo', 'in_progress', 'blocked', 'done'];
var LABELS = { todo: 'To do', in_progress: 'In progress', blocked: 'Blocked', done: 'Done' };
var ASSIGNEES = ['mike', 'asteris', 'panos', 'unassigned'];
var PRIORITIES = ['', 'low', 'normal', 'high', 'urgent'];
var PRIORITY_LABELS = { '': 'No priority', low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent' };
var ICONS = {
  refresh: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
  history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8z"/><path d="M9.5 17a2.5 2.5 0 0 0 5 0"/>',
  bellOff: '<path d="M5 8a6 6 0 0 1 10.2-4.3"/><path d="M18 8c0 4 1.5 5.5 1.5 5.5H8.5"/><path d="M9.5 17a2.5 2.5 0 0 0 5 0"/><line x1="3" y1="3" x2="21" y2="21"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  flag: '<path d="M5 3v18M5 4h11l-2.5 4L16 12H5"/>'
};
function icon(name) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + '</svg>'; }

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
function fmtAgo(iso) {
  var s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.round(s / 60) + 'm ago';
  return Math.round(s / 3600) + 'h ago';
}
function prefersReduced() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
function pad2(n) { return String(n).padStart(2, '0'); }
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-'); }

/* ---- live clock, purely local, no fetch ---- */
function tickClock() {
  var el = document.getElementById('clock');
  if (!el) return;
  var d = new Date();
  el.textContent = pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
}
tickClock();
setInterval(tickClock, 1000);

/* ---- gentle number tween for the stat readouts (skipped under reduced-motion) ---- */
function tweenNumber(el, to, fmt) {
  if (!el) return;
  var from = parseFloat(el.getAttribute('data-val') || '0') || 0;
  el.setAttribute('data-val', to);
  if (from === to || prefersReduced()) { el.textContent = fmt ? fmt(to) : String(to); return; }
  var start = null, dur = 500;
  function step(ts) {
    if (start === null) start = ts;
    var p = Math.min(1, (ts - start) / dur);
    var eased = 1 - Math.pow(1 - p, 3);
    var v = from + (to - from) * eased;
    el.textContent = fmt ? fmt(v) : String(Math.round(v));
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ==================== OKLCH accent + field clamp (round-3 spec section 10) ====================
   Ported from the verified working math at scratchpad/oklch.mjs, unchanged - sRGB<->OKLab<->OKLCH,
   gamut-clipped by chroma reduction (hue and lightness held exact). Two targets because they sit
   on different backgrounds: TEXT reads on the field directly (9:1, not 4.5, because Mike cannot
   resolve low-contrast tones on his LG monitor); FILL must stay visible against the field (3:1)
   while still being dark enough to carry a WHITE label on top (4.5:1) - lightening it the way
   text is lightened would wash the fill out until white-on-it goes unreadable. That two-target
   split is the one thing tonight's earlier RGB-lerp interim fix got right; this keeps it and
   replaces the lerp with the real hue-preserving search. */
function srgbToLin(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function linToSrgb(c) { return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }
function hexToRgb01(hex) {
  var h = String(hex || '#3366FF').replace('#', '');
  if (h.length === 3) h = h.split('').map(function(c) { return c + c; }).join('');
  return [parseInt(h.substr(0, 2), 16) / 255, parseInt(h.substr(2, 2), 16) / 255, parseInt(h.substr(4, 2), 16) / 255];
}
function rgbToHex01(r, g, b) {
  function q(v) { return Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0'); }
  return ('#' + q(r) + q(g) + q(b)).toUpperCase();
}
function rgbToOklab(r, g, b) {
  var R = srgbToLin(r), G = srgbToLin(g), B = srgbToLin(b);
  var l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  var m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  var s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
          1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
          0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
function oklabToRgb(L, a, bb) {
  var l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * bb, 3);
  var m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * bb, 3);
  var s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * bb, 3);
  return [linToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
          linToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
          linToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)];
}
function hexToOklch(hex) {
  var rgb = hexToRgb01(hex), lab = rgbToOklab(rgb[0], rgb[1], rgb[2]);
  return { L: lab[0], C: Math.hypot(lab[1], lab[2]), h: (Math.atan2(lab[2], lab[1]) * 180 / Math.PI + 360) % 360 };
}
function oklchToRgbRaw(L, C, h) { var t = h * Math.PI / 180; return oklabToRgb(L, C * Math.cos(t), C * Math.sin(t)); }
function inGamut(rgb) { var eps = 0.0005; return rgb.every(function(v) { return v >= -eps && v <= 1 + eps; }); }
function oklchToHex(L, C, h) {
  if (inGamut(oklchToRgbRaw(L, C, h))) { var rgb0 = oklchToRgbRaw(L, C, h); return rgbToHex01(rgb0[0], rgb0[1], rgb0[2]); }
  var lo = 0, hi = C;
  for (var i = 0; i < 40; i++) { var mid = (lo + hi) / 2; if (inGamut(oklchToRgbRaw(L, mid, h))) lo = mid; else hi = mid; }
  var rgb1 = oklchToRgbRaw(L, lo, h);
  return rgbToHex01(rgb1[0], rgb1[1], rgb1[2]);
}
function relLum(hex) { var rgb = hexToRgb01(hex); return 0.2126 * srgbToLin(rgb[0]) + 0.7152 * srgbToLin(rgb[1]) + 0.0722 * srgbToLin(rgb[2]); }
function wcagContrast(a, b) { var x = relLum(a), y = relLum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

var FIELD_HEX = '#0B0E16', WHITE_HEX = '#FFFFFF';
var ACCENT_L_MIN = 0.42, ACCENT_L_MAX = 0.92;

// Round-3 spec section 10.1, verbatim math: fill clears 3:1 against the field AND can carry
// either a white or field-coloured label at 4.5:1; text clears 9:1 against the field (not the
// 4.5:1 minimum - see comment above). Searches lightness outward from the input, hue and
// chroma held exact, so a hue never drifts (verified table: max drift 0.6 degrees).
function clampAccentDark(hex) {
  var o = hexToOklch(hex);
  function pick(test) {
    var start = Math.min(ACCENT_L_MAX, Math.max(ACCENT_L_MIN, o.L));
    for (var l = start; l >= ACCENT_L_MIN - 1e-9; l -= 0.002) { var c = oklchToHex(l, o.C, o.h); if (test(c)) return c; }
    for (var l2 = start; l2 <= ACCENT_L_MAX + 1e-9; l2 += 0.002) { var c2 = oklchToHex(l2, o.C, o.h); if (test(c2)) return c2; }
    return oklchToHex(ACCENT_L_MAX, o.C, o.h);
  }
  var fill = pick(function(c) { return wcagContrast(c, FIELD_HEX) >= 3.0 && Math.max(wcagContrast(WHITE_HEX, c), wcagContrast(FIELD_HEX, c)) >= 4.5; });
  return {
    fill: fill,
    label: wcagContrast(WHITE_HEX, fill) >= wcagContrast(FIELD_HEX, fill) ? WHITE_HEX : FIELD_HEX,
    text: pick(function(c) { return wcagContrast(c, FIELD_HEX) >= 9.0; }),
  };
}
function applyAccent(hex) {
  var clamped = clampAccentDark(hex);
  var root = document.documentElement.style;
  root.setProperty('--accent', hex);
  root.setProperty('--accent-strong', clamped.fill);
  root.setProperty('--accent-text', clamped.text);
  root.setProperty('--accent-ink', clamped.label);
  return clamped;
}

// Round-3 spec section 10.4: a custom field must keep --ink at 12:1 or better (relative
// luminance <= 0.0375) and --edge (--line here, same value, see section 0) at 2.5:1 or better
// against itself; measured, #1B2130 is the ceiling. Rejected upward in darkness, hue preserved.
var FIELD_CEILING_LUM = relLum('#1B2130');
function clampFieldDark(hex) {
  var o = hexToOklch(hex);
  if (relLum(oklchToHex(o.L, o.C, o.h)) <= FIELD_CEILING_LUM + 1e-6) return oklchToHex(o.L, o.C, o.h);
  for (var l = o.L; l >= 0; l -= 0.004) { var c = oklchToHex(l, o.C, o.h); if (relLum(c) <= FIELD_CEILING_LUM + 1e-6) return c; }
  return FIELD_HEX;
}
function applyField(hex) {
  document.documentElement.style.setProperty('--field', hex);
}

var ACCENT_SWATCHES = [
  { hex: '#3366FF', name: 'Default' }, { hex: '#7C5CFF', name: 'Violet' }, { hex: '#E8603C', name: 'Coral' },
  { hex: '#D6478B', name: 'Magenta' }, { hex: '#5B6472', name: 'Slate' }, { hex: '#C48A1D', name: 'Gold' },
];
var FIELD_SWATCHES = [
  { hex: '#0B0E16', name: 'Default' }, { hex: '#0D1018', name: 'Deep' }, { hex: '#000000', name: 'Black' },
  { hex: '#0F1216', name: 'Slate' }, { hex: '#111318', name: 'Graphite' }, { hex: '#1B2130', name: 'Navy' },
];

var settings = { accent: '#3366FF', field: '#0B0E16' };

function renderSwatchRow(rowId, list, current, onPick) {
  var row = document.getElementById(rowId);
  if (!row) return;
  row.innerHTML = list.map(function(s) {
    var sel = s.hex.toLowerCase() === String(current || '').toLowerCase();
    return '<div class="swatchitem"><button type="button" data-hex="' + s.hex + '" style="background:' + s.hex + '"'
      + (sel ? ' class="selected"' : '') + ' aria-label="' + esc(s.name) + '"></button><span class="nm">' + esc(s.name) + '</span></div>';
  }).join('');
  row.querySelectorAll('button').forEach(function(btn) {
    btn.addEventListener('click', function() { onPick(btn.getAttribute('data-hex')); });
  });
}
function syncSettingsUI() {
  renderSwatchRow('accentSwatchRow', ACCENT_SWATCHES, settings.accent, function(hex) { setAccent(hex); });
  renderSwatchRow('fieldSwatchRow', FIELD_SWATCHES, settings.field, function(hex) { setField(hex); });
  var aCustom = document.getElementById('accentCustomInput');
  var fCustom = document.getElementById('fieldCustomInput');
  if (aCustom && document.activeElement !== aCustom) aCustom.value = settings.accent;
  if (fCustom && document.activeElement !== fCustom) fCustom.value = settings.field;
}
function saveSettingsToServer() {
  fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) }).catch(function() {});
}
function setAccent(hex) {
  var clamped = applyAccent(hex);
  var note = document.getElementById('accentClampNote');
  if (note) note.textContent = clamped.fill.toUpperCase() !== String(hex).toUpperCase()
    ? ('Adjusted from ' + hex.toUpperCase() + ' to ' + clamped.fill + ' so text stays readable.') : '';
  settings.accent = clamped.fill;
  syncSettingsUI(); saveSettingsToServer();
}
function setField(hex) {
  var clamped = clampFieldDark(hex);
  applyField(clamped);
  var note = document.getElementById('fieldClampNote');
  if (note) note.textContent = clamped.toUpperCase() !== String(hex).toUpperCase()
    ? ('Adjusted from ' + hex.toUpperCase() + ' to ' + clamped + ' to keep the field dark enough to read.') : '';
  settings.field = clamped;
  syncSettingsUI(); saveSettingsToServer();
}
async function loadSettingsFromServer() {
  try {
    var res = await fetch('/api/settings');
    settings = await res.json();
  } catch (e) { /* keep defaults */ }
  applyAccent(settings.accent);
  applyField(settings.field);
  syncSettingsUI();
}

document.getElementById('accentCustomDisclose').addEventListener('click', function() {
  document.getElementById('accentCustomRow').classList.toggle('open');
});
document.getElementById('fieldCustomDisclose').addEventListener('click', function() {
  document.getElementById('fieldCustomRow').classList.toggle('open');
});
document.getElementById('accentCustomInput').addEventListener('change', function(e) {
  if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setAccent(e.target.value);
});
document.getElementById('fieldCustomInput').addEventListener('change', function(e) {
  if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setField(e.target.value);
});
document.getElementById('gearBtn').addEventListener('click', function() { showPage('settings'); });

/* ==================== sidebar + four-page routing ====================
   Client-side only: all four .pageview sections already exist in the DOM, so switching pages
   is a pure show/hide - the starfield canvas and the command palette are outside every
   .pageview and never get torn down or reseeded by a route change. The current nav item is
   marked with aria-current="page", not a class, because that is the literal selector shape
   the theme lint's six accent roles require (round-3 spec section 10.3, role 6) and it is
   also the semantically correct ARIA attribute for "the page you are looking at". */
var PAGES = ['dashboard', 'sites', 'tasks', 'settings'];
var PAGE_TITLES = { dashboard: 'Dashboard', sites: 'Sites', tasks: 'Tasks', settings: 'Settings' };
var currentPage = 'dashboard';
function showPage(page) {
  if (PAGES.indexOf(page) === -1) return;
  currentPage = page;
  document.querySelectorAll('.pageview').forEach(function(el) { el.hidden = el.getAttribute('data-page') !== page; });
  document.querySelectorAll('.navitem').forEach(function(el) {
    if (el.getAttribute('data-page') === page) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
  });
  var pn = document.getElementById('pageName');
  if (pn) pn.textContent = PAGE_TITLES[page];
  if (page === 'settings') refreshConfigSettings();
}
document.getElementById('nav').addEventListener('click', function(e) {
  var btn = e.target.closest('.navitem');
  if (!btn) return;
  showPage(btn.getAttribute('data-page'));
});
document.addEventListener('keydown', function(e) {
  if (!(e.ctrlKey || e.metaKey)) return;
  if (e.key === 'k' || e.key === 'K') { e.preventDefault(); openPalette(); return; }
  var target = { '1': 'dashboard', '2': 'sites', '3': 'tasks', '4': 'settings' }[e.key];
  if (!target) return;
  e.preventDefault();
  showPage(target);
});
showPage('dashboard');

/* ==================== site health ==================== */
var lastSites = [], lastTasks = [];
var prevSiteState = {};
var firstSitesLoad = true;
var lastIntervalMinutes = null;
var DAY_CAP_CLIENT = 90;

// ---- 90-day strip (round-3 spec section 8) ----
// Empty days draw a 2px baseline (.cell with no state class), never a blank gap: the
// state.js days store is the source of truth and is untouched here, only rendered. Cells
// are flex:1 rather than a fixed 2px/3px switched by a JS width breakpoint - they fill
// whatever the grid column actually has, so the name column beside them can never jump.
// Real, live sparkline of recent raw checks (s.history - already ticks every interval/recheck),
// not the 90-day rollup: a fresh install has almost no rolled days yet, so that strip reads as
// a dead flat line for weeks. This is genuinely data-driven (shape + colour move for real)
// PLUS a continuously pulsing "live" ring on the latest point, so the row visibly breathes
// between real checks instead of only ever changing once every intervalMinutes.
function sparklineSvg(s) {
  var W = 220, H = 26, PAD = 3;
  var state = s.overall || 'unknown';
  var strokeVar = state === 'down' ? 'var(--down)' : state === 'warn' ? 'var(--warn)' : state === 'ok' ? 'var(--ok)' : 'var(--ink-faint)';
  var hist = (s.history || []).filter(function(h) { return h.ms != null; }).slice(-24);
  if (hist.length < 2) {
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<line x1="0" y1="' + (H - PAD) + '" x2="' + W + '" y2="' + (H - PAD) + '" stroke="var(--line)" stroke-width="1.5" stroke-dasharray="1 3" stroke-linecap="round"/>' +
    '</svg>';
  }
  var vals = hist.map(function(h) { return h.ms; });
  var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
  if (max === min) max = min + 1;
  var n = hist.length;
  var coords = hist.map(function(h, i) {
    return { x: (i / (n - 1)) * W, y: PAD + (1 - (h.ms - min) / (max - min)) * (H - PAD * 2), overall: h.overall, ms: h.ms, at: h.at };
  });
  var linePts = coords.map(function(c) { return c.x.toFixed(1) + ',' + c.y.toFixed(1); }).join(' ');
  var areaPts = linePts + ' ' + W.toFixed(1) + ',' + H + ' 0,' + H;
  var last = coords[coords.length - 1];
  // A real blip should be visible on the line itself, not just inferable from the end colour.
  var markers = coords.filter(function(c, i) { return c.overall !== 'ok' && i !== n - 1; }).map(function(c) {
    var col = c.overall === 'down' ? 'var(--down)' : c.overall === 'warn' ? 'var(--warn)' : 'var(--ink-faint)';
    return '<circle cx="' + c.x.toFixed(1) + '" cy="' + c.y.toFixed(1) + '" r="1.6" fill="' + col + '"/>';
  }).join('');
  // Wider transparent hit target per point (2px dot is too small to hover reliably) - feeds
  // the same row-hover-shows-detail interaction the old day-strip had, just per-check now.
  var hitAreas = coords.map(function(c) {
    return '<circle class="spark-pt" cx="' + c.x.toFixed(1) + '" cy="' + c.y.toFixed(1) + '" r="6" fill="transparent" data-ms="' + c.ms + '" data-at="' + esc(c.at) + '"></circle>';
  }).join('');
  return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
    '<polygon points="' + areaPts + '" class="spark-area" fill="' + strokeVar + '"/>' +
    '<polyline points="' + linePts + '" class="spark-line" fill="none" stroke="' + strokeVar + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    markers + hitAreas +
    '<circle class="spark-live" cx="' + last.x.toFixed(1) + '" cy="' + last.y.toFixed(1) + '" r="2.4" fill="' + strokeVar + '"/>' +
    '<circle class="spark-live-ring" cx="' + last.x.toFixed(1) + '" cy="' + last.y.toFixed(1) + '" r="2.4" fill="none" stroke="' + strokeVar + '" stroke-width="1.4"/>' +
  '</svg>';
}
// Real recorded-day count for the honest caption (round-3 spec section 8): the most days
// any one site has actually logged a check for, not the padded 90-slot width.
function recordedDaysCount() {
  return lastSites.reduce(function(max, s) {
    var n = (s.days || []).filter(function(d) { return d.checks > 0; }).length;
    return Math.max(max, n);
  }, 0);
}

function historyDetail(s) {
  var recent = (s.history || []).slice(-10).reverse();
  var facts = '<div class="hist-facts">' +
    '<span>URL <a class="link" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.url) + '</a></span>' +
    '<span>Pictures checked <b>' + (s.imagesChecked != null ? s.imagesChecked : 0) + '</b></span>' +
    '<span>Missing headers <b>' + (s.missingHeaders && s.missingHeaders.length ? esc(s.missingHeaders.join(', ')) : 'none') + '</b></span>' +
    '<span>Reachable <b>' + (s.uptimePct != null ? s.uptimePct + '%' : 'no data') + '</b></span>' +
  '</div>';
  var list = !recent.length ? '<span class="spark-empty">No checks recorded yet.</span>' :
    '<div class="hist-list">' + recent.map(function(h) {
      return '<div class="hist-row"><span class="hist-dot ' + esc(h.overall) + '"></span><span class="hist-time fig">' + fmtAgo(h.at) + '</span><span class="hist-ms fig">' + (h.ms != null ? h.ms + 'ms' : '-') + '</span></div>';
    }).join('') + '</div>';
  return '<div class="hist-inner">' + facts + list + '</div>';
}
function statusLabel(state) {
  return state === 'ok' ? 'Healthy' : state === 'warn' ? 'Needs attention' : state === 'down' ? 'Down' : 'No data yet';
}

function siteRow(s, changed) {
  var state = s.overall || 'unknown';
  var issues = [];
  if (s.brokenImages && s.brokenImages.length) issues.push(s.brokenImages.length + ' broken image' + (s.brokenImages.length === 1 ? '' : 's'));
  if (s.missingHeaders && s.missingHeaders.length) issues.push('missing ' + s.missingHeaders.join(', '));
  if (typeof s.sslDaysRemaining === 'number' && s.sslDaysRemaining < 0) issues.push('SSL certificate expired');
  else if (typeof s.sslDaysRemaining === 'number' && s.sslDaysRemaining <= 14) issues.push('SSL expires in ' + s.sslDaysRemaining + 'd');
  if (s.error) issues.push(s.error);
  var muted = !!s.muted;
  return '<div class="site-item' + (muted ? ' muted' : '') + (changed ? ' flash' : '') + '" data-name="' + esc(s.name) + '" id="site-' + slug(s.name) + '">' +
    '<div class="site-row">' +
      '<span class="status-dot ' + state + '" title="' + statusLabel(state) + '" aria-label="' + statusLabel(state) + '"></span>' +
      '<div class="sitecell"><div class="name">' + esc(s.name) + (muted ? '<span class="mutedtag">Muted</span>' : '') + '</div><div class="url">' + esc(s.url) + '</div>' +
        (issues.length ? '<div class="note">' + esc(issues.join(' · ')) + '</div>' : '') +
      '</div>' +
      '<div class="strip-wrap">' + sparklineSvg(s) + '</div>' +
      '<div class="metacell"><div class="ms" id="ms-' + slug(s.name) + '" data-ms="' + (s.ms != null ? s.ms : '') + '">' + (s.ms != null ? s.ms + 'ms' : '-') + '<span class="livepulse" id="pulse-' + slug(s.name) + '"></span></div><div class="reach">' + (s.uptimePct != null ? 'reachable ' + s.uptimePct + '%' : 'no data') + '</div>' +
        (typeof s.sslDaysRemaining === 'number' ? '<div class="ssl' + (s.sslDaysRemaining <= 14 ? ' warn' : '') + '">SSL ' + (s.sslDaysRemaining < 0 ? 'expired' : s.sslDaysRemaining + 'd') + '</div>' : '') +
      '</div>' +
      '<div class="rowactions">' +
        '<button type="button" class="iconbtn recheckBtn" title="Recheck now">' + icon('refresh') + '</button>' +
        '<button type="button" class="iconbtn historyBtn" title="View check history">' + icon('history') + '</button>' +
        '<button type="button" class="iconbtn muteBtn' + (muted ? ' active' : '') + '" title="' + (muted ? 'Unmute alerts' : 'Mute alerts for this site') + '">' + icon(muted ? 'bellOff' : 'bell') + '</button>' +
        '<button type="button" class="iconbtn removeSiteBtn" title="Remove site">' + icon('trash') + '</button>' +
      '</div>' +
    '</div>' +
    '<div class="row-error" hidden></div>' +
    '<div class="expand hist-expand"><div class="inner">' + historyDetail(s) + '</div></div>' +
    '<div class="expand confirm-expand"><div class="inner"><div class="inline-confirm">Remove ' + esc(s.name) + ' from monitoring? <button type="button" class="confirmRemoveBtn danger">Yes, remove</button><button type="button" class="cancelRemoveBtn">Cancel</button></div></div></div>' +
  '</div>';
}

function showRowError(item, msg) {
  var el = item.querySelector('.row-error');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(item._rowErrTimer);
  item._rowErrTimer = setTimeout(function() { el.hidden = true; }, 4000);
}

// Live-ms tween: proof this is a live connection, not a static number that silently jumps on
// refresh. Only fires on a REAL value change from the previous real poll - never a decorative
// idle animation, since motion here is only allowed when it is reporting something genuine
// (house rule). Counts the digits from old to new over ~550ms and pulses the accent dot once.
var prevMs = {};
function tweenMs(name, from, to) {
  var el = document.getElementById('ms-' + slug(name));
  var pulse = document.getElementById('pulse-' + slug(name));
  if (!el) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.classList.add('live');
  if (pulse) { pulse.classList.remove('on'); void pulse.offsetWidth; pulse.classList.add('on'); }
  var start = null, dur = 550;
  function step(t) {
    if (start === null) start = t;
    var p = Math.min(1, (t - start) / dur);
    var eased = 1 - Math.pow(1 - p, 3);
    var val = Math.round(from + (to - from) * eased);
    el.firstChild.nodeValue = val + 'ms';
    if (p < 1) requestAnimationFrame(step);
    else { el.firstChild.nodeValue = to + 'ms'; setTimeout(function() { el.classList.remove('live'); }, 400); }
  }
  requestAnimationFrame(step);
}

async function refreshSites() {
  var res = await fetch('/api/state');
  var data = await res.json();
  lastSites = Object.values(data.sites || {}).sort(function(a, b) { return a.name.localeCompare(b.name); });
  lastIntervalMinutes = data.intervalMinutes;
  var recorded = recordedDaysCount();
  var caption = recorded > 0
    ? ('LAST 90 DAYS, ' + recorded + ' RECORDED')
    : "NO HISTORY YET. FIRST BAR APPEARS AFTER TODAY'S CHECKS.";
  document.getElementById('siteSub').textContent = lastSites.length + ' site' + (lastSites.length === 1 ? '' : 's') + ' watched · checked every ' + data.intervalMinutes + 'm · ' + caption;
  var list = document.getElementById('siteList');
  var toTween = [];
  if (!lastSites.length) {
    list.innerHTML = '<div class="empty">No sites configured yet. Add one below.</div>';
  } else {
    list.innerHTML = lastSites.map(function(s) {
      var state = s.overall || 'unknown';
      var changed = !firstSitesLoad && prevSiteState[s.name] !== undefined && prevSiteState[s.name] !== state;
      prevSiteState[s.name] = state;
      if (!firstSitesLoad && s.ms != null && prevMs[s.name] != null && prevMs[s.name] !== s.ms) {
        toTween.push({ name: s.name, from: prevMs[s.name], to: s.ms });
      }
      if (s.ms != null) prevMs[s.name] = s.ms;
      return siteRow(s, changed);
    }).join('');
  }
  firstSitesLoad = false;
  toTween.forEach(function(t) { tweenMs(t.name, t.from, t.to); });
  renderStats();
  updateSidebarFoot();
  renderDashboard();
}

async function recheckNow(name, btn) {
  var svg = btn.querySelector('svg');
  if (svg) svg.classList.add('spin');
  btn.disabled = true;
  try { await fetch('/api/sites/' + encodeURIComponent(name) + '/recheck', { method: 'POST' }); } catch (e) {}
  await refreshSites();
}
// Optimistic (round-3 spec, "more real functions" pass): the icon/label flip the instant you
// click, before the network round-trip - failure reverts just this one button and leaves an
// inline message in that row, never a global spinner or a full refetch-to-find-out.
async function toggleMute(name, item, btn) {
  var wasMuted = item.classList.contains('muted');
  var nowMuted = !wasMuted;
  item.classList.toggle('muted', nowMuted);
  btn.classList.toggle('active', nowMuted);
  btn.title = nowMuted ? 'Unmute alerts' : 'Mute alerts for this site';
  btn.innerHTML = icon(nowMuted ? 'bellOff' : 'bell');
  var tag = item.querySelector('.sitecell .name');
  var existingTag = tag ? tag.querySelector('.mutedtag') : null;
  if (tag && nowMuted && !existingTag) tag.insertAdjacentHTML('beforeend', '<span class="mutedtag">Muted</span>');
  if (tag && !nowMuted && existingTag) existingTag.remove();
  try {
    var res = await fetch('/api/sites/' + encodeURIComponent(name) + '/mute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ muted: nowMuted }) });
    if (!res.ok) throw new Error('request failed');
  } catch (e) {
    item.classList.toggle('muted', wasMuted);
    btn.classList.toggle('active', wasMuted);
    btn.title = wasMuted ? 'Unmute alerts' : 'Mute alerts for this site';
    btn.innerHTML = icon(wasMuted ? 'bellOff' : 'bell');
    if (tag) { var t2 = tag.querySelector('.mutedtag'); if (wasMuted && !t2) tag.insertAdjacentHTML('beforeend', '<span class="mutedtag">Muted</span>'); if (!wasMuted && t2) t2.remove(); }
    showRowError(item, "Couldn't save - try again.");
  }
}
async function removeSiteNow(name) {
  await fetch('/api/sites/' + encodeURIComponent(name), { method: 'DELETE' });
  refreshSites();
}

document.getElementById('siteList').addEventListener('click', function(e) {
  var item = e.target.closest('.site-item');
  if (!item) return;
  var name = item.getAttribute('data-name');
  if (e.target.closest('.recheckBtn')) { recheckNow(name, e.target.closest('.recheckBtn')); return; }
  if (e.target.closest('.historyBtn')) { item.classList.toggle('hist-open'); item.classList.remove('confirm-open'); return; }
  if (e.target.closest('.muteBtn')) { toggleMute(name, item, e.target.closest('.muteBtn')); return; }
  if (e.target.closest('.removeSiteBtn')) { item.classList.toggle('confirm-open'); item.classList.remove('hist-open'); return; }
  if (e.target.closest('.confirmRemoveBtn')) { removeSiteNow(name); return; }
  if (e.target.closest('.cancelRemoveBtn')) { item.classList.remove('confirm-open'); return; }
});

// Strip hover (round-3 spec section 8): swaps the row's OWN latest/baseline figure columns to
// that day's msP50/msMax/date, zero layout shift (same columns, same classes, text only), no
// floating layer. Delegated so the up-to-90-cells-per-row never register their own listeners.
document.getElementById('siteList').addEventListener('mouseover', function(e) {
  var cell = e.target.closest('.cell, .spark-pt');
  if (!cell) return;
  if (cell.classList.contains('cell') && !cell.hasAttribute('data-d')) return;
  var item = cell.closest('.site-item');
  var meta = item && item.querySelector('.metacell');
  if (!meta) return;
  if (!meta.hasAttribute('data-orig')) meta.setAttribute('data-orig', meta.innerHTML);
  meta.classList.add('hovered');
  if (cell.classList.contains('spark-pt')) {
    var ms = cell.getAttribute('data-ms'), at = cell.getAttribute('data-at');
    meta.innerHTML = '<div class="ms">' + (ms ? ms + 'ms' : '-') + '</div><div class="reach">' + esc(fmtAgo(at)) + '</div>';
  } else {
    var p50 = cell.getAttribute('data-p50'), max = cell.getAttribute('data-max'), d = cell.getAttribute('data-d');
    meta.innerHTML = '<div class="ms">' + (p50 ? p50 + 'ms' : '-') + '</div><div class="reach">max ' + (max ? max + 'ms' : '-') + '</div><div class="ssl">' + esc(d) + '</div>';
  }
});
document.getElementById('siteList').addEventListener('mouseout', function(e) {
  var cell = e.target.closest('.cell, .spark-pt');
  if (!cell) return;
  var item = cell.closest('.site-item');
  if (item && item.contains(e.relatedTarget)) return;
  var meta = item && item.querySelector('.metacell');
  if (meta && meta.hasAttribute('data-orig')) { meta.innerHTML = meta.getAttribute('data-orig'); meta.removeAttribute('data-orig'); meta.classList.remove('hovered'); }
});

document.getElementById('addSiteBtn').addEventListener('click', async function() {
  var nameEl = document.getElementById('newSiteName');
  var urlEl = document.getElementById('newSiteUrl');
  var errEl = document.getElementById('siteAddError');
  var name = nameEl.value.trim(), url = urlEl.value.trim();
  errEl.textContent = '';
  if (!name || !url) { errEl.textContent = 'Name and URL are both required.'; return; }
  var res = await fetch('/api/sites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name, url: url }) });
  if (!res.ok) {
    var err = {};
    try { err = await res.json(); } catch (e) {}
    errEl.textContent = err.error || 'Could not add site.';
    return;
  }
  nameEl.value = ''; urlEl.value = '';
  refreshSites();
});

/* ==================== task board ==================== */
function priorityFlag(p) {
  p = p || '';
  var label = p ? (p.charAt(0).toUpperCase() + p.slice(1)) : '';
  return '<span class="priorityFlag" data-p="' + esc(p) + '">' + (p ? icon('flag') : '') + esc(label) + '</span>';
}
function assigneeOptions(current) {
  var values = ASSIGNEES.slice();
  if (current && values.indexOf(current) === -1) values.push(current);
  return values.map(function(a) {
    var label = a.charAt(0).toUpperCase() + a.slice(1);
    return '<option value="' + esc(a) + '"' + (a === current ? ' selected' : '') + '>' + esc(label) + '</option>';
  }).join('');
}
function priorityOptions(current) {
  return PRIORITIES.map(function(p) {
    return '<option value="' + esc(p) + '"' + (p === (current || '') ? ' selected' : '') + '>' + PRIORITY_LABELS[p] + '</option>';
  }).join('');
}
function taskCard(t, status, isNew) {
  return '<div class="task' + (isNew ? ' enter' : '') + '" data-id="' + esc(t.id) + '">' +
    '<div class="tmain">' +
      '<div class="t">' + esc(t.title) + '</div>' +
      '<div class="row2">' +
        '<select class="assigneeSelect" title="Reassign" aria-label="Assignee">' + assigneeOptions(t.assignee) + '</select>' +
        '<select class="statusSelect" title="Change status" aria-label="Status">' +
          STATUSES.map(function(s) { return '<option value="' + s + '"' + (s === status ? ' selected' : '') + '>' + LABELS[s] + '</option>'; }).join('') +
        '</select>' +
      '</div>' +
      '<div class="row3">' +
        priorityFlag(t.priority) +
        '<div class="proj">' + esc(t.project || '') + '</div>' +
        '<span class="icons">' +
          '<button type="button" class="iconbtn editBtn" title="Edit task">' + icon('edit') + '</button>' +
          '<button type="button" class="iconbtn deleteBtn" title="Delete task">' + icon('trash') + '</button>' +
        '</span>' +
      '</div>' +
    '</div>' +
    '<div class="tedit"><div class="inner">' +
      '<input type="text" class="editTitle" aria-label="Task title" value="' + esc(t.title) + '" placeholder="Title">' +
      '<div class="editRow">' +
        '<input type="text" class="editProject" aria-label="Task project" value="' + esc(t.project || '') + '" placeholder="Project (optional)">' +
        '<select class="editPriority" aria-label="Task priority">' + priorityOptions(t.priority) + '</select>' +
      '</div>' +
      '<div class="editActions"><button type="button" class="saveBtn btn-primary">Save</button><button type="button" class="cancelBtn">Cancel</button></div>' +
    '</div></div>' +
    '<div class="tconfirm"><div class="inner">Delete this task? <button type="button" class="confirmDeleteBtn danger">Yes, delete</button><button type="button" class="cancelDeleteBtn">Cancel</button></div></div>' +
    '<div class="row-error task-error" hidden></div>' +
  '</div>';
}

function rerenderBoard() {
  var board = document.getElementById('board');
  var openIds = {};
  board.querySelectorAll('.task.editing, .task.confirming').forEach(function(c) { openIds[c.getAttribute('data-id')] = c.classList.contains('editing') ? 'editing' : 'confirming'; });
  board.innerHTML = STATUSES.map(function(status) {
    var inCol = lastTasks.filter(function(t) { return t.status === status; });
    var body = inCol.length
      ? inCol.map(function(t) { return taskCard(t, status, false); }).join('')
      : '<div class="empty small">No tasks</div>';
    return '<div class="col" data-status="' + status + '">' +
      '<div class="col-head"><span class="t">' + LABELS[status] + '</span><span class="c">' + inCol.length + '</span></div>' +
      body +
    '</div>';
  }).join('');
  Object.keys(openIds).forEach(function(id) {
    var card = board.querySelector('.task[data-id="' + id.replace(/"/g, '\\"') + '"]');
    if (card) card.classList.add(openIds[id]);
  });
}

async function refreshTasks() {
  var res = await fetch('/api/tasks');
  lastTasks = await res.json();
  rerenderBoard();
  renderStats();
  renderDashboard();
}

function taskCardError(id, msg) {
  var card = document.querySelector('.task[data-id="' + id.replace(/"/g, '\\"') + '"]');
  var el = card && card.querySelector('.task-error');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  setTimeout(function() { el.hidden = true; }, 4000);
}

function closeAllCards(board) {
  board.querySelectorAll('.task.editing, .task.confirming').forEach(function(c) { c.classList.remove('editing', 'confirming'); });
}

document.getElementById('board').addEventListener('click', function(e) {
  var card = e.target.closest('.task');
  if (!card) return;
  var board = document.getElementById('board');
  var id = card.getAttribute('data-id');

  if (e.target.closest('.editBtn')) { closeAllCards(board); card.classList.add('editing'); return; }
  if (e.target.closest('.cancelBtn')) { card.classList.remove('editing'); return; }
  if (e.target.closest('.deleteBtn')) { closeAllCards(board); card.classList.add('confirming'); return; }
  if (e.target.closest('.cancelDeleteBtn')) { card.classList.remove('confirming'); return; }

  // Optimistic delete: the card fades out and is removed from the model immediately, the
  // network call happens after - if it fails, the task is spliced back in and the board
  // re-renders with an inline error on that one restored card, never a global spinner.
  if (e.target.closest('.confirmDeleteBtn')) {
    var delIndex = lastTasks.findIndex(function(t) { return t.id === id; });
    var delTask = lastTasks[delIndex];
    card.classList.add('removing');
    setTimeout(function() {
      if (delIndex === -1) return;
      lastTasks.splice(delIndex, 1);
      rerenderBoard(); renderStats(); renderDashboard();
      fetch('/api/tasks/' + encodeURIComponent(id), { method: 'DELETE' }).then(function(res) {
        if (!res.ok) throw new Error('delete failed');
      }).catch(function() {
        lastTasks.splice(delIndex, 0, delTask);
        rerenderBoard(); renderStats(); renderDashboard();
        taskCardError(id, "Couldn't delete - restored.");
      });
    }, 220);
    return;
  }

  if (e.target.closest('.saveBtn')) {
    var title = card.querySelector('.editTitle').value.trim();
    if (!title) { card.querySelector('.editTitle').focus(); return; }
    var project = card.querySelector('.editProject').value.trim();
    var priority = card.querySelector('.editPriority').value;
    fetch('/api/tasks/' + encodeURIComponent(id), {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title, project: project, priority: priority }),
    }).then(function(res) { return res.json(); }).then(function(t) {
      card.querySelector('.tmain .t').textContent = t.title;
      card.querySelector('.proj').textContent = t.project || '';
      var flag = card.querySelector('.priorityFlag');
      if (flag) flag.outerHTML = priorityFlag(t.priority);
      for (var i = 0; i < lastTasks.length; i++) { if (lastTasks[i].id === t.id) { lastTasks[i] = t; break; } }
      card.classList.remove('editing');
    });
    return;
  }
});

// Optimistic status change: the card jumps to its new column the instant the select fires,
// before the network call - failure moves it straight back and leaves an inline error on it.
document.getElementById('board').addEventListener('change', function(e) {
  var card = e.target.closest('.task');
  if (!card) return;
  var id = card.getAttribute('data-id');
  if (e.target.classList.contains('statusSelect')) {
    var task = lastTasks.find(function(t) { return t.id === id; });
    if (!task) return;
    var prevStatus = task.status;
    var nextStatus = e.target.value;
    task.status = nextStatus;
    rerenderBoard(); renderStats(); renderDashboard();
    fetch('/api/tasks/' + encodeURIComponent(id) + '/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }) })
      .then(function(res) { if (!res.ok) throw new Error('status change failed'); return res.json(); })
      .then(function(t) { for (var i = 0; i < lastTasks.length; i++) { if (lastTasks[i].id === t.id) { lastTasks[i] = t; break; } } })
      .catch(function() {
        task.status = prevStatus;
        rerenderBoard(); renderStats(); renderDashboard();
        taskCardError(id, "Couldn't save - reverted.");
      });
  } else if (e.target.classList.contains('assigneeSelect')) {
    fetch('/api/tasks/' + encodeURIComponent(id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assignee: e.target.value }) })
      .then(function(res) { return res.json(); })
      .then(function(t) { for (var i = 0; i < lastTasks.length; i++) { if (lastTasks[i].id === t.id) { lastTasks[i] = t; break; } } });
  }
});

async function addTask() {
  var titleEl = document.getElementById('newTitle');
  var title = titleEl.value.trim();
  if (!title) { titleEl.focus(); return; }
  var assignee = document.getElementById('newAssignee').value.trim();
  var project = document.getElementById('newProject').value.trim();
  var priority = document.getElementById('newPriority').value;
  await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title, assignee: assignee, project: project, priority: priority }) });
  titleEl.value = '';
  document.getElementById('newAssignee').value = '';
  document.getElementById('newProject').value = '';
  document.getElementById('newPriority').value = '';
  refreshTasks();
}
document.getElementById('addTaskBtn').addEventListener('click', addTask);
document.getElementById('newTitle').addEventListener('keydown', function(e) { if (e.key === 'Enter') addTask(); });

/* ==================== shared stats + alert-dominant layout ==================== */
function renderStats() {
  var healthy = lastSites.filter(function(s) { return s.overall === 'ok'; }).length;
  var trouble = lastSites.filter(function(s) { return s.overall === 'warn' || s.overall === 'down'; }).length;
  var anyDown = lastSites.some(function(s) { return s.overall === 'down'; });
  var total = lastSites.length;
  var withMs = lastSites.filter(function(s) { return s.ms != null; });
  var avgMs = withMs.length ? Math.round(withMs.reduce(function(a, s) { return a + s.ms; }, 0) / withMs.length) : null;
  var inProgress = lastTasks.filter(function(t) { return t.status === 'in_progress'; }).length;

  tweenNumber(document.getElementById('healthyNum'), healthy);
  var totalEl = document.getElementById('totalNum');
  if (totalEl) totalEl.textContent = String(total);

  tweenNumber(document.getElementById('troubleNum'), trouble);
  var troubleStat = document.getElementById('troubleStat');
  if (troubleStat) troubleStat.classList.toggle('lit', trouble > 0);

  var msEl = document.getElementById('msNum');
  if (msEl) { if (avgMs != null) tweenNumber(msEl, avgMs, function(v) { return Math.round(v) + 'ms'; }); else msEl.textContent = '-'; }

  tweenNumber(document.getElementById('progNum'), inProgress);

  var pill = document.getElementById('statusPill');
  var pillText = document.getElementById('statusPillText');
  if (pill && pillText) {
    if (!total) { pill.className = 'pill'; pillText.textContent = 'No sites yet'; }
    else if (trouble === 0) { pill.className = 'pill ok'; pillText.textContent = 'All sites healthy'; }
    else { pill.className = 'pill ' + (anyDown ? 'down' : 'warn'); pillText.textContent = trouble + ' site' + (trouble === 1 ? '' : 's') + ' need' + (trouble === 1 ? 's' : '') + ' attention'; }
  }

  var healthPanel = document.getElementById('healthPanel');
  var banner = document.getElementById('alertBanner');
  var bannerText = document.getElementById('alertBannerText');
  if (healthPanel && banner && bannerText) {
    healthPanel.classList.toggle('alert', trouble > 0);
    healthPanel.classList.toggle('down', anyDown);
    banner.classList.toggle('show', trouble > 0);
    banner.classList.toggle('warn', trouble > 0 && !anyDown);
    banner.classList.toggle('down', trouble > 0 && anyDown);
    if (trouble > 0) bannerText.textContent = trouble + ' site' + (trouble === 1 ? '' : 's') + ' need' + (trouble === 1 ? 's' : '') + ' attention right now';
  }
}

/* ==================== sidebar foot: live freshness stamp ====================
   The one live element the sidebar carries (spec section 6): real state.intervalMinutes
   plus a relative "checked" stamp ticking on the same 1s interval as the clock, no fetch
   of its own. Turns --warn if the most recently checked site is stale by the same 2.5x
   interval rule the verdict engine below uses for a site's own "stale" cause. */
function updateSidebarFoot() {
  var stampEl = document.getElementById('sfStamp');
  var everyEl = document.getElementById('sfEvery');
  if (!stampEl || !everyEl) return;
  if (lastIntervalMinutes != null) everyEl.textContent = 'every ' + lastIntervalMinutes + 'm';
  var times = lastSites.map(function(s) { return s.checkedAt ? new Date(s.checkedAt).getTime() : 0; }).filter(Boolean);
  if (!times.length) { stampEl.textContent = '--'; stampEl.classList.remove('stale'); return; }
  var mostRecent = Math.max.apply(null, times);
  stampEl.textContent = fmtAgo(new Date(mostRecent).toISOString());
  var staleAfterMin = lastIntervalMinutes != null ? lastIntervalMinutes * 2.5 : Infinity;
  stampEl.classList.toggle('stale', (Date.now() - mostRecent) / 60000 > staleAfterMin);
}
setInterval(updateSidebarFoot, 1000);

/* ==================== Dashboard page: verdict engine ====================
   Ported faithfully from round-two spec sections 3 and 5 - the SEV enum, both severity
   tables and every copy string are used exactly as specified there. New here is only the
   page structure (verdict block + two report-by-exception regions) and the "sslExpired" /
   "sslExpiring" causes, which round two could not have specified because the SSL feature
   (section 0 of this pass) shipped after it - added as additive causes, following
   checker.js's own real priority order, never overriding a named cause that already exists. */
var SEV = { clear: 0, attention: 1, urgent: 2 };

function minutesSince(iso, now) {
  if (!iso) return null;
  var t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : (now - t) / 60000;
}

function siteSeverity(s, intervalMinutes, now) {
  if (s.reachable === false) return { sev: SEV.urgent, cause: 'unreachable' };
  var mins = minutesSince(s.checkedAt, now);
  if (mins != null && mins > 6 * intervalMinutes) return { sev: SEV.urgent, cause: 'nocheck' };
  if (typeof s.sslDaysRemaining === 'number' && s.sslDaysRemaining < 0) return { sev: SEV.urgent, cause: 'sslExpired' };
  if (s.brokenImages && s.brokenImages.length > 0) return { sev: SEV.attention, cause: 'images' };
  if (s.critical) return { sev: SEV.attention, cause: 'verySlow' };
  if (s.slow) return { sev: SEV.attention, cause: 'slow' };
  if (s.missingHeaders && s.missingHeaders.length > 0) return { sev: SEV.attention, cause: 'headers' };
  if (typeof s.sslDaysRemaining === 'number' && s.sslDaysRemaining <= 14) return { sev: SEV.attention, cause: 'sslExpiring' };
  if (mins != null && mins > 2.5 * intervalMinutes) return { sev: SEV.attention, cause: 'stale' };
  return { sev: SEV.clear, cause: null };
}

function taskSeverity(t, now) {
  if (t.status === 'blocked') return { sev: SEV.urgent, cause: 'blocked' };
  if (t.priority === 'urgent' && t.status !== 'done') return { sev: SEV.urgent, cause: 'urgentFlag' };
  if (t.priority === 'high' && t.status !== 'done') return { sev: SEV.attention, cause: 'highFlag' };
  if (t.status === 'todo') {
    var days = (now - new Date(t.updated || t.created).getTime()) / 86400000;
    if (days > 7) return { sev: SEV.attention, cause: 'untouched' };
  }
  return { sev: SEV.clear, cause: null };
}

function dominantCause(list) {
  var counts = {};
  list.forEach(function(i) { counts[i.cause] = (counts[i.cause] || 0) + 1; });
  var keys = Object.keys(counts);
  return keys.length === 1 ? keys[0] : null;
}

// ---- copy strings, round-two spec section 5, verbatim ----
function siteLine1(k, cause, sev) {
  if (sev === SEV.urgent) {
    if (cause === 'unreachable') return k === 1 ? '1 site is down.' : (k + ' sites are down.');
    if (cause === 'nocheck') return k === 1 ? 'The monitor has stopped checking 1 site.' : ('The monitor has stopped checking ' + k + ' sites.');
    return k === 1 ? '1 site is down.' : (k + ' sites need urgent attention.');
  }
  if (cause === 'headers') return k === 1 ? '1 site needs a security fix.' : (k + ' sites need a security fix.');
  if (cause === 'slow' || cause === 'verySlow') return k === 1 ? '1 site is loading slowly.' : (k + ' sites are loading slowly.');
  if (cause === 'images') return k === 1 ? '1 site has broken pictures.' : (k + ' sites have broken pictures.');
  if (cause === 'stale') return k === 1 ? '1 site has not been checked recently.' : (k + ' sites have not been checked recently.');
  return k === 1 ? '1 site needs attention.' : (k + ' sites need attention.');
}
function siteLine1Clear(n) {
  if (n === 0) return 'No sites are being watched yet.';
  if (n === 1) return 'The site is up.';
  return 'All ' + n + ' sites are up.';
}
function taskLine1(k, cause) {
  if (cause === 'blocked') return k === 1 ? '1 task is blocked.' : (k + ' tasks are blocked.');
  if (cause === 'urgentFlag') return k === 1 ? '1 task is marked urgent.' : (k + ' tasks are marked urgent.');
  if (cause === 'highFlag') return k === 1 ? '1 task is marked high priority.' : (k + ' tasks are marked high priority.');
  if (cause === 'untouched') return k === 1 ? '1 task has not moved in over a week.' : (k + ' tasks have not moved in over a week.');
  return k === 1 ? '1 task needs attention.' : (k + ' tasks need attention.');
}
function taskLine2(total, open, started) {
  if (total === 0) return 'No tasks on the board.';
  if (open === 0) return 'Every task is done.';
  if (open === 1 && started === 0) return '1 task open, not started yet.';
  if (open > 1 && started === 0) return open + ' tasks open, none started yet.';
  return open + ' tasks open, ' + started + ' in progress.';
}
function siteLine2(n, k) {
  if (k === 0) return 'All ' + n + ' sites are up.';
  return k + ' of ' + n + ' sites need attention.';
}
function evidenceLine(sites, intervalMinutes, now) {
  if (!sites.length) return 'No checks recorded yet.';
  var stale = sites.filter(function(s) { var m = minutesSince(s.checkedAt, now); return m != null && m > 2.5 * intervalMinutes; });
  var times = sites.map(function(s) { return s.checkedAt ? new Date(s.checkedAt).getTime() : 0; }).filter(Boolean);
  var rel = times.length ? fmtAgo(new Date(Math.max.apply(null, times)).toISOString()) : 'never';
  if (stale.length) return 'Last check ' + rel + '. ' + stale.length + ' site' + (stale.length === 1 ? '' : 's') + ' have not been checked recently.';
  var msVals = sites.map(function(s) { return s.ms; }).filter(function(v) { return v != null; });
  var slowest = msVals.length ? Math.max.apply(null, msVals) : null;
  return 'Checked ' + rel + '. ' + sites.length + ' sites. Slowest reply ' + (slowest != null ? slowest : '-') + ' ms.';
}

// "At least" honesty rule (round-two section 5): walk history backwards to the last check
// whose overall differs from the current run; if the walk reaches the very first stored
// entry, the true start is unknown, so the string is prefixed "at least" rather than
// asserting a start time that was never actually recorded.
function sinceText(history, now) {
  if (!history || !history.length) return null;
  var last = history[history.length - 1].overall;
  var idx = history.length - 1;
  while (idx > 0 && history[idx - 1].overall === last) idx--;
  var atLeast = idx === 0;
  var ms = now - new Date(history[idx].at).getTime();
  var hrs = Math.round(ms / 3600000);
  var dur = ms >= 86400000 ? (Math.round(ms / 86400000) + ' day' + (Math.round(ms / 86400000) === 1 ? '' : 's'))
                            : (Math.max(1, hrs) + ' hour' + (Math.max(1, hrs) === 1 ? '' : 's'));
  return (atLeast ? 'For at least ' : 'For ') + dur + '.';
}

var CAUSE_WORDS = {
  unreachable: 'not answering', nocheck: 'not being checked', images: 'broken pictures',
  verySlow: 'very slow load times', slow: 'slow load times', headers: 'a missing security header',
  sslExpired: 'an expired SSL certificate', sslExpiring: 'an SSL certificate expiring soon', stale: 'stale checks',
};
var CAUSE_HEADLINE = {
  headers: function(n) { return n + ' is missing a security setting'; },
  unreachable: function(n) { return n + ' is down'; },
  nocheck: function(n) { return 'The monitor has stopped checking ' + n; },
  verySlow: function(n) { return n + ' is loading very slowly'; },
  slow: function(n) { return n + ' is loading slowly'; },
  images: function(n) { return n + ' has broken pictures'; },
  sslExpired: function(n) { return n + ' has an expired SSL certificate'; },
  sslExpiring: function(n) { return n + ' has an SSL certificate expiring soon'; },
  stale: function(n) { return n + ' has not been checked recently'; },
};
var TASK_CAUSE_HEADLINE = {
  blocked: function(n) { return n + ' is blocked'; },
  urgentFlag: function(n) { return n + ' is marked urgent'; },
  highFlag: function(n) { return n + ' is marked high priority'; },
  untouched: function(n) { return n + ' has not moved in over a week'; },
};
function promoDetail(s, cause) {
  if (cause === 'headers') return (s.missingHeaders || []).join(', ');
  if (cause === 'unreachable') return s.error || ('HTTP ' + (s.status || '?'));
  if (cause === 'nocheck') return s.checkedAt ? ('Last check ' + new Date(s.checkedAt).toLocaleString()) : 'No check recorded';
  if (cause === 'verySlow' || cause === 'slow') return (s.ms != null ? s.ms : '-') + ' ms';
  if (cause === 'images') return (s.brokenImages ? s.brokenImages.length : 0) + ' of ' + (s.imagesChecked || 0) + ' pictures failed';
  if (cause === 'sslExpired') return 'SSL certificate expired ' + Math.abs(s.sslDaysRemaining) + 'd ago';
  if (cause === 'sslExpiring') return 'SSL certificate expires in ' + s.sslDaysRemaining + 'd';
  if (cause === 'stale') return s.checkedAt ? ('Last check ' + fmtAgo(s.checkedAt)) : 'No check recorded';
  return '';
}
// Named action is real and in-app (section 5): slug the site name and see if a task's
// project field already matches it before offering to create a duplicate.
function promoAction(s, cause) {
  if (cause === 'headers') {
    var slugName = slug(s.name);
    var match = lastTasks.some(function(t) { return t.project === slugName; });
    return match ? 'Open the task' : 'Make a task for this';
  }
  if (cause === 'unreachable' || cause === 'nocheck' || cause === 'sslExpired' || cause === 'sslExpiring') return 'Check it now';
  return 'Make a task for this';
}

function renderDashSites(siteInfo, now) {
  var summaryEl = document.getElementById('dashSitesSummary');
  var promoEl = document.getElementById('dashSitesPromo');
  var listEl = document.getElementById('dashSitesList');
  if (!summaryEl || !promoEl || !listEl) return;
  var trouble = siteInfo.filter(function(i) { return i.sev > 0; });
  var times = lastSites.map(function(s) { return s.checkedAt ? new Date(s.checkedAt).getTime() : 0; }).filter(Boolean);
  var rel = times.length ? fmtAgo(new Date(Math.max.apply(null, times)).toISOString()) : 'never';
  summaryEl.textContent = trouble.length + ' of ' + lastSites.length + ' need attention, checked ' + rel;

  var sorted = siteInfo.slice().sort(function(a, b) { return b.sev - a.sev; });
  var promoted = sorted.filter(function(i) { return i.sev > 0; });
  var clear = sorted.filter(function(i) { return i.sev === 0; });

  promoEl.innerHTML = promoted.map(function(i) {
    var s = i.site, sevWord = i.sev === SEV.urgent ? 'urgent' : 'attention';
    var headlineFn = CAUSE_HEADLINE[i.cause];
    var headline = headlineFn ? headlineFn(esc(s.name)) : esc(s.name) + ' needs attention';
    var since = sinceText(s.history, now);
    var checkedRel = s.checkedAt ? fmtAgo(s.checkedAt) : 'never';
    return '<div class="promoted" data-sev="' + sevWord + '" data-site="' + esc(s.name) + '" data-cause="' + esc(i.cause) + '">' +
      '<div class="head"><div>' +
        '<div class="headline">' + headline + '</div>' +
        '<div class="detail">' + esc(promoDetail(s, i.cause)) + '</div>' +
        '<div class="since">' + (since ? esc(since) + ' ' : '') + 'Checked ' + esc(checkedRel) + '.</div>' +
      '</div>' +
      '<button type="button" class="act dashSiteAct">' + esc(promoAction(s, i.cause)) + '</button></div>' +
    '</div>';
  }).join('');

  listEl.innerHTML = clear.length ? clear.map(function(i) {
    var s = i.site;
    return '<div class="dash-row" data-site="' + esc(s.name) + '">' +
      '<span class="dot"></span><span class="nm" title="' + esc(s.name) + '">' + esc(s.name) + '</span>' +
      '<span class="ms">' + (s.ms != null ? s.ms + ' ms' : '-') + '</span>' +
      '<span class="fresh">' + (s.checkedAt ? esc(fmtAgo(s.checkedAt)) : '-') + '</span>' +
    '</div>';
  }).join('') : (promoted.length ? '' : '<div class="empty small">No sites yet.</div>');
}

// Dashboard is sites-only (Mike's explicit correction, 2026-08-03): the landing page answers
// "are my sites okay", full stop. Tasks live entirely on their own page now, reached via the
// sidebar - the old two-domain verdict line (sites AND tasks in one composition) is gone, this
// is a single-domain verdict. taskSeverity()/TASK_CAUSE_HEADLINE/taskLine1/taskLine2 stay
// defined (the Tasks page's own promotion logic still uses taskSeverity), just not woven into
// this verdict anymore.
function renderDashboard() {
  var l1El = document.getElementById('vLine1'), l2El = document.getElementById('vLine2'), evEl = document.getElementById('vEvidence');
  if (!l1El) return; // dashboard markup not present yet
  var now = Date.now();
  var interval = lastIntervalMinutes || 10;

  var siteInfo = lastSites.map(function(s) { var sv = siteSeverity(s, interval, now); return { site: s, sev: sv.sev, cause: sv.cause }; });
  var siteMaxSev = siteInfo.reduce(function(m, i) { return Math.max(m, i.sev); }, 0);

  var line1 = siteMaxSev > 0
    ? siteLine1(siteInfo.filter(function(i) { return i.sev === siteMaxSev; }).length, dominantCause(siteInfo.filter(function(i) { return i.sev === siteMaxSev; })), siteMaxSev)
    : siteLine1Clear(lastSites.length);

  l1El.textContent = line1;
  if (l2El) l2El.style.display = 'none';
  if (evEl) evEl.textContent = evidenceLine(lastSites, interval, now);

  renderDashSites(siteInfo, now);
}

document.getElementById('dashSitesPromo').addEventListener('click', function(e) {
  var btn = e.target.closest('.dashSiteAct');
  if (!btn) return;
  var card = btn.closest('.promoted');
  var name = card.getAttribute('data-site');
  var cause = card.getAttribute('data-cause');
  var action = btn.textContent;
  if (action === 'Check it now') {
    recheckNow(name, btn);
  } else if (action === 'Open the task') {
    showPage('tasks');
    var slugName = slug(name);
    var match = lastTasks.find(function(t) { return t.project === slugName; });
    if (match) {
      setTimeout(function() {
        var el = document.querySelector('.task[data-id="' + match.id.replace(/"/g, '\\"') + '"]');
        if (el) el.scrollIntoView({ block: 'center' });
      }, 30);
    }
  } else if (action === 'Make a task for this') {
    btn.disabled = true;
    var words = CAUSE_WORDS[cause] || 'a problem';
    fetch('/api/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Fix ' + words + ' on ' + name, project: slug(name), assignee: '', priority: '' }),
    }).then(function() { return refreshTasks(); });
  }
});

// The passive 15s poll must never yank the rug out from under someone mid-interaction: a
// task open for editing would lose unsaved keystrokes, an open site-history panel would
// silently slam shut. Direct user actions (recheck, mute, delete, add) still call the real
// refreshSites()/refreshTasks() unconditionally right after they happen, so those always
// show their real, immediate result - only the background timer defers.
function refreshSitesIfIdle() {
  if (document.querySelector('#siteList .site-item.hist-open, #siteList .site-item.confirm-open')) return;
  refreshSites();
}
function refreshTasksIfIdle() {
  if (document.querySelector('#board .task.editing, #board .task.confirming')) return;
  refreshTasks();
}

/* ==================== Settings page: real config (round-3 spec section 9) ====================
   Every field here reads and writes config.json (or reports a real read-only fact) through
   the /api/config route below - there is no Apply button, every change is live. */
function patchConfig(patch) {
  return fetch('/api/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    .then(function(res) { if (!res.ok) return res.json().then(function(e) { throw new Error(e.error || 'save failed'); }); return res.json(); });
}
async function refreshConfigSettings() {
  var res = await fetch('/api/config');
  if (!res.ok) return;
  var cfg = await res.json();
  document.getElementById('setInterval').value = cfg.intervalMinutes;
  document.getElementById('setSlowMs').value = cfg.thresholds.slowMs;
  document.getElementById('setCriticalMs').value = cfg.thresholds.criticalMs;
  document.getElementById('setMaxImages').value = cfg.thresholds.maxImagesChecked;
  document.getElementById('setHistoryWindow').value = cfg.thresholds.historyWindow;
  document.getElementById('hdrHsts').checked = cfg.expectedHeaders.indexOf('strict-transport-security') !== -1;
  document.getElementById('hdrCto').checked = cfg.expectedHeaders.indexOf('x-content-type-options') !== -1;
  document.getElementById('hdrXfo').checked = cfg.expectedHeaders.indexOf('x-frame-options') !== -1;
  var missing = lastSites.filter(function(s) { return s.missingHeaders && s.missingHeaders.length; }).length;
  document.getElementById('hdrSummary').textContent = lastSites.length
    ? (missing + ' of ' + lastSites.length + ' sites are missing one of these.') : '';
  document.getElementById('telegramStatus').textContent = cfg.telegramConfigured ? 'Phone alerts are on.' : 'Phone alerts are off.';
  document.getElementById('storeTasksDir').textContent = cfg.storage.tasksDir + ' (' + cfg.storage.taskCount + ' file' + (cfg.storage.taskCount === 1 ? '' : 's') + ')';
  document.getElementById('storeStateFile').textContent = cfg.storage.stateFile + ' (' + cfg.storage.stateBytes + ' bytes)';
  document.getElementById('storeDaysRetained').textContent = cfg.storage.daysRetained + ' days';
  document.getElementById('storeChecksRetained').textContent = cfg.storage.checksRetained + ' checks per site';
  document.getElementById('aboutVersion').textContent = cfg.version;
}
function wireMonitorInput(id, toPatch) {
  document.getElementById(id).addEventListener('change', function(e) {
    var note = document.getElementById('monitorNote');
    var v = Number(e.target.value);
    if (!Number.isFinite(v)) return;
    patchConfig(toPatch(v)).then(function() {
      if (note) { note.style.color = 'var(--ink-dim)'; note.textContent = 'Saved.'; }
      setTimeout(function() { if (note && note.textContent === 'Saved.') note.textContent = ''; }, 2000);
      refreshConfigSettings();
    }).catch(function(e2) {
      if (note) { note.style.color = 'var(--down-text)'; note.textContent = e2.message || "Couldn't save that value."; }
      refreshConfigSettings();
    });
  });
}
wireMonitorInput('setInterval', function(v) { return { intervalMinutes: v }; });
wireMonitorInput('setSlowMs', function(v) { return { thresholds: { slowMs: v } }; });
wireMonitorInput('setCriticalMs', function(v) { return { thresholds: { criticalMs: v } }; });
wireMonitorInput('setMaxImages', function(v) { return { thresholds: { maxImagesChecked: v } }; });
wireMonitorInput('setHistoryWindow', function(v) { return { thresholds: { historyWindow: v } }; });

function headerToggleChanged() {
  var headers = [];
  if (document.getElementById('hdrHsts').checked) headers.push('strict-transport-security');
  if (document.getElementById('hdrCto').checked) headers.push('x-content-type-options');
  if (document.getElementById('hdrXfo').checked) headers.push('x-frame-options');
  patchConfig({ expectedHeaders: headers }).then(refreshConfigSettings);
}
['hdrHsts', 'hdrCto', 'hdrXfo'].forEach(function(id) { document.getElementById(id).addEventListener('change', headerToggleChanged); });

document.getElementById('revealTasksBtn').addEventListener('click', function() {
  fetch('/api/reveal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ which: 'tasks' }) });
});
document.getElementById('revealStateBtn').addEventListener('click', function() {
  fetch('/api/reveal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ which: 'state' }) });
});
document.getElementById('resetDefaultsBtn').addEventListener('click', async function() {
  await fetch('/api/reset-defaults', { method: 'POST' });
  var res = await fetch('/api/settings');
  settings = await res.json();
  applyAccent(settings.accent); applyField(settings.field); syncSettingsUI();
  refreshConfigSettings();
});

/* ==================== Ctrl+K command palette ====================
   Every result is a REAL action - a site/task jump scrolls to and flashes the real row, every
   listed command performs the real request the equivalent button on the page would. Nothing
   here is decorative; there is no result that does not actually do the thing it says. */
function fuzzyScore(query, text) {
  query = query.toLowerCase(); text = text.toLowerCase();
  if (!query) return 1;
  var idx = text.indexOf(query);
  if (idx !== -1) return 1000 - idx;
  var qi = 0, score = 0;
  for (var i = 0; i < text.length && qi < query.length; i++) { if (text[i] === query[qi]) { score++; qi++; } }
  return qi === query.length ? score : -1;
}
function paletteCommands() {
  return [
    { kind: 'Command', label: 'Check all sites now', run: function() {
        lastSites.forEach(function(s) { fetch('/api/sites/' + encodeURIComponent(s.name) + '/recheck', { method: 'POST' }); });
        setTimeout(refreshSites, 800);
      } },
    { kind: 'Command', label: 'Add a site', run: function() { showPage('sites'); setTimeout(function() { document.getElementById('newSiteName').focus(); }, 30); } },
    { kind: 'Command', label: 'Add a task', run: function() { showPage('tasks'); setTimeout(function() { document.getElementById('newTitle').focus(); }, 30); } },
    { kind: 'Command', label: 'Open Settings', run: function() { showPage('settings'); } },
    { kind: 'Command', label: 'Go to Dashboard', run: function() { showPage('dashboard'); } },
    { kind: 'Command', label: 'Go to Sites', run: function() { showPage('sites'); } },
    { kind: 'Command', label: 'Go to Tasks', run: function() { showPage('tasks'); } },
  ];
}
function flashEl(el) {
  if (!el) return;
  el.classList.add('flash');
  setTimeout(function() { el.classList.remove('flash'); }, 1800);
}
function paletteEntries() {
  var out = paletteCommands();
  lastSites.forEach(function(s) {
    out.push({ kind: 'Site', label: s.name, run: function() {
      showPage('sites');
      setTimeout(function() { flashEl(document.getElementById('site-' + slug(s.name))); var el = document.getElementById('site-' + slug(s.name)); if (el) el.scrollIntoView({ block: 'center' }); }, 30);
    } });
  });
  lastTasks.forEach(function(t) {
    out.push({ kind: 'Task', label: t.title, run: function() {
      showPage('tasks');
      setTimeout(function() { var el = document.querySelector('.task[data-id="' + t.id.replace(/"/g, '\\"') + '"]'); if (el) el.scrollIntoView({ block: 'center' }); }, 30);
    } });
  });
  return out;
}
var paletteOpen = false, paletteSel = 0, paletteItems = [];
function renderPalette(query) {
  var scored = paletteEntries().map(function(item) { return { item: item, score: fuzzyScore(query, item.label) }; }).filter(function(x) { return x.score >= 0; });
  scored.sort(function(a, b) { return b.score - a.score; });
  paletteItems = scored.slice(0, 30).map(function(x) { return x.item; });
  paletteSel = 0;
  var box = document.getElementById('paletteResults');
  box.innerHTML = paletteItems.length ? paletteItems.map(function(item, i) {
    return '<div class="palette-item row" data-i="' + i + '"' + (i === 0 ? ' aria-selected="true"' : '') + '><span>' + esc(item.label) + '</span><span class="kind">' + esc(item.kind) + '</span></div>';
  }).join('') : '<div class="palette-empty">No matches.</div>';
}
function paletteHighlight() {
  document.querySelectorAll('.palette-item').forEach(function(el, i) {
    if (i === paletteSel) { el.setAttribute('aria-selected', 'true'); el.scrollIntoView({ block: 'nearest' }); }
    else el.removeAttribute('aria-selected');
  });
}
function runPaletteItem(i) {
  var item = paletteItems[i];
  if (!item) return;
  closePalette();
  item.run();
}
function openPalette() {
  paletteOpen = true;
  document.getElementById('paletteBackdrop').classList.add('open');
  var input = document.getElementById('paletteInput');
  input.value = '';
  renderPalette('');
  setTimeout(function() { input.focus(); }, 10);
}
function closePalette() {
  paletteOpen = false;
  document.getElementById('paletteBackdrop').classList.remove('open');
}
document.getElementById('paletteBtn').addEventListener('click', openPalette);
document.getElementById('paletteBackdrop').addEventListener('click', function(e) { if (e.target.id === 'paletteBackdrop') closePalette(); });
document.getElementById('paletteInput').addEventListener('input', function(e) { renderPalette(e.target.value); });
document.getElementById('paletteResults').addEventListener('click', function(e) {
  var el = e.target.closest('.palette-item');
  if (el) runPaletteItem(Number(el.getAttribute('data-i')));
});
document.getElementById('paletteInput').addEventListener('keydown', function(e) {
  if (e.key === 'Escape') { closePalette(); return; }
  if (e.key === 'ArrowDown') { e.preventDefault(); paletteSel = Math.min(paletteItems.length - 1, paletteSel + 1); paletteHighlight(); return; }
  if (e.key === 'ArrowUp') { e.preventDefault(); paletteSel = Math.max(0, paletteSel - 1); paletteHighlight(); return; }
  if (e.key === 'Enter') { e.preventDefault(); runPaletteItem(paletteSel); return; }
});

loadSettingsFromServer();
refreshSites();
refreshTasks();
setInterval(refreshSitesIfIdle, 15000);
setInterval(refreshTasksIfIdle, 15000);

/* ==================== starfield ====================
   Not decoration for its own sake: the real Web Action mark (public/brand/wa-mark.webp,
   verified against the file that actually serves webactionhellas.com) sits on a dark
   starfield in every real use of the logo - the business card, the site hero. This continues
   that same visual world onto the field the mark now lives on, rather than inventing a new
   one. Small fixed star count (120) and a slow drift, not a particle system: motion here is
   atmosphere, never a stand-in for real data the way the old build's radar sweep was. Respects
   prefers-reduced-motion (renders one static frame and stops). Guards the touch-viewport-bar
   resize trap: only resizes the canvas on a real width change, per the house standard. */
(function () {
  var canvas = document.getElementById('starfield');
  var ctx = canvas.getContext('2d');
  var stars = [];
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lastW = 0, lastH = 0;

  function seed() {
    var count = Math.round((canvas.width * canvas.height) / 9000);
    stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.1 + 0.3,
        baseA: Math.random() * 0.5 + 0.15,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.15 + 0.03, // px/frame drift, so it reads as space not snow
      });
    }
  }

  function resize() {
    var w = innerWidth, h = innerHeight;
    if (w === lastW && Math.abs(h - lastH) < 160 && matchMedia('(hover:none)').matches) return; // mobile bar-toggle guard
    lastW = w; lastH = h;
    var dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function draw(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.y += s.speed;
      if (s.y > innerHeight + 2) { s.y = -2; s.x = Math.random() * innerWidth; }
      var tw = reduceMotion ? 0 : Math.sin(t / 1400 + s.phase) * 0.25;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(234,240,255,' + Math.max(0, Math.min(1, s.baseA + tw)).toFixed(3) + ')';
      ctx.fill();
    }
    if (!reduceMotion) requestAnimationFrame(draw);
  }

  addEventListener('resize', resize, { passive: true });
  addEventListener('orientationchange', function () { lastW = 0; resize(); });
  resize();
  requestAnimationFrame(draw);
  if (reduceMotion) draw(0); // one static frame, no loop
})();
</script>
</body></html>`;

// The settings drawer can save a downscaled photo as a background (a data URL), which is
// larger than a typical task/site JSON body - 6MB comfortably covers a compressed 1920px
// JPEG (the client already downscales before upload) while still bounding the request.
const MAX_BODY_BYTES = 6 * 1024 * 1024;

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; if (data.length > MAX_BODY_BYTES) req.destroy(); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

// The only three headers checker.js actually knows how to check (config.expectedHeaders is
// read straight into checkHeaders() in checker.js) - Settings > Security only ever toggles
// membership in this fixed set, it can never add an arbitrary header string.
const ALLOWED_HEADERS = ['strict-transport-security', 'x-content-type-options', 'x-frame-options'];

function validateThresholdPatch(current, patch) {
  const next = { ...current };
  const field = (key, min, max) => {
    if (patch[key] === undefined) return;
    const v = Number(patch[key]);
    if (!Number.isFinite(v) || v < min || v > max) throw new Error(`${key} must be ${min}-${max}`);
    next[key] = Math.round(v);
  };
  field('slowMs', 1, 120000);
  field('criticalMs', 1, 120000);
  field('maxImagesChecked', 1, 200);
  field('historyWindow', 1, 1000);
  return next;
}

export function startDashboard(port, api) {
  const { getState, getConfig, reloadConfig, recheckSite, setIntervalMinutes } = api;

  // What the client actually sees: config.json's sites array is the source of truth for
  // WHICH sites exist (so a removed site disappears immediately, even though its last check
  // is still harmlessly sitting in state.json), state.json supplies the latest check result
  // for each, and the per-site `muted` flag lives on config, not state - state.sites[key] gets
  // fully overwritten every check (see state.js recordCheck), so anything client-only has to
  // live somewhere that survives that.
  function mergedState() {
    const state = getState();
    const config = getConfig();
    const sites = {};
    for (const site of config.sites) {
      const existing = state.sites[site.name];
      sites[site.name] = {
        overall: 'unknown',
        history: [],
        uptimePct: null,
        ...(existing || {}),
        name: site.name,
        url: site.url,
        muted: !!site.muted,
      };
    }
    return { sites, intervalMinutes: state.intervalMinutes };
  }

  // The request handler is shared by two listeners (IPv4 + IPv6 loopback) below, instead of
  // one server bound with no host - which defaults to ALL interfaces (confirmed live via
  // netstat showing 0.0.0.0:8788 and [::]:8788 LISTENING). This dashboard now has full
  // write routes with zero auth (task/site CRUD, a settings upload), so it must never be
  // reachable from the LAN. But Windows/Chrome resolve "localhost" to ::1 as often as
  // 127.0.0.1 (confirmed live - this machine's own browser tool connected via [::1]), so
  // binding v4-loopback alone would silently break real usage. Two loopback-only listeners
  // keep both paths working while closing every non-loopback interface.
  const requestHandler = async (req, res) => {
    const send = (code, body) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    try {
      if (req.url === '/api/state' && req.method === 'GET') { send(200, mergedState()); return; }

      if (req.url === '/api/tasks' && req.method === 'GET') { send(200, listTasks()); return; }
      if (req.url === '/api/tasks' && req.method === 'POST') {
        const body = await readJsonBody(req);
        if (!body.title || !String(body.title).trim()) { send(400, { error: 'title required' }); return; }
        try { send(201, createTask(body)); }
        catch (e) { send(400, { error: e.message }); }
        return;
      }
      const statusMatch = req.url.match(/^\/api\/tasks\/([^/]+)\/status$/);
      if (statusMatch && req.method === 'POST') {
        const body = await readJsonBody(req);
        try { send(200, updateTaskStatus(decodeURIComponent(statusMatch[1]), body.status)); }
        catch (e) { send(400, { error: e.message }); }
        return;
      }
      const taskMatch = req.url.match(/^\/api\/tasks\/([^/]+)$/);
      if (taskMatch && req.method === 'PATCH') {
        const body = await readJsonBody(req);
        try { send(200, updateTask(decodeURIComponent(taskMatch[1]), body)); }
        catch (e) { send(400, { error: e.message }); }
        return;
      }
      if (taskMatch && req.method === 'DELETE') {
        try { deleteTask(decodeURIComponent(taskMatch[1])); send(200, { ok: true }); }
        catch (e) { send(400, { error: e.message }); }
        return;
      }

      const recheckMatch = req.url.match(/^\/api\/sites\/([^/]+)\/recheck$/);
      if (recheckMatch && req.method === 'POST') {
        const result = await recheckSite(decodeURIComponent(recheckMatch[1]));
        if (!result) { send(404, { error: 'site not found' }); return; }
        send(200, result);
        return;
      }
      const muteMatch = req.url.match(/^\/api\/sites\/([^/]+)\/mute$/);
      if (muteMatch && req.method === 'POST') {
        const body = await readJsonBody(req);
        try { setMuted(decodeURIComponent(muteMatch[1]), !!body.muted); reloadConfig(); send(200, { ok: true }); }
        catch (e) { send(400, { error: e.message }); }
        return;
      }
      if (req.url === '/api/sites' && req.method === 'POST') {
        const body = await readJsonBody(req);
        try {
          const site = addSite(body);
          reloadConfig();
          await recheckSite(site.name); // don't leave a freshly added site with no data for up to intervalMinutes
          send(201, site);
        } catch (e) { send(400, { error: e.message }); }
        return;
      }
      const siteMatch = req.url.match(/^\/api\/sites\/([^/]+)$/);
      if (siteMatch && req.method === 'DELETE') {
        try { removeSite(decodeURIComponent(siteMatch[1])); reloadConfig(); send(200, { ok: true }); }
        catch (e) { send(400, { error: e.message }); }
        return;
      }

      if (req.url === '/api/settings' && req.method === 'GET') { send(200, loadSettings()); return; }
      if (req.url === '/api/settings' && req.method === 'POST') {
        const body = await readJsonBody(req);
        send(200, saveSettings(body));
        return;
      }

      // Settings > Monitoring/Security (round-3 spec section 9.3/9.4): real config.json values,
      // live. GET also carries the read-only facts Settings > Phone alerts/Storage/About show.
      if (req.url === '/api/config' && req.method === 'GET') {
        const config = getConfig();
        let taskCount = 0;
        try { taskCount = listTasks().length; } catch { /* tasks dir may not exist yet */ }
        let stateBytes = 0;
        try { stateBytes = fs.statSync(STATE_PATH).size; } catch { /* no state.json yet */ }
        let version = '0.0.0';
        try { version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version; } catch { /* fall back */ }
        send(200, {
          intervalMinutes: config.intervalMinutes ?? 10,
          thresholds: config.thresholds,
          expectedHeaders: config.expectedHeaders || [],
          telegramConfigured: telegramConfigured(),
          version,
          storage: {
            tasksDir: TASKS_DIR, taskCount,
            stateFile: STATE_PATH, stateBytes,
            daysRetained: DAY_CAP,
            checksRetained: config.thresholds.historyWindow,
          },
        });
        return;
      }
      if (req.url === '/api/config' && req.method === 'PATCH') {
        const body = await readJsonBody(req);
        try {
          const config = getConfig();
          const next = { ...config };
          if (body.intervalMinutes !== undefined) {
            const v = Number(body.intervalMinutes);
            if (!Number.isFinite(v) || v < 1 || v > 1440) throw new Error('intervalMinutes must be 1-1440');
            next.intervalMinutes = Math.round(v);
          }
          if (body.thresholds !== undefined) {
            if (typeof body.thresholds !== 'object' || body.thresholds === null) throw new Error('invalid thresholds');
            next.thresholds = validateThresholdPatch(config.thresholds, body.thresholds);
          }
          if (body.expectedHeaders !== undefined) {
            if (!Array.isArray(body.expectedHeaders) || !body.expectedHeaders.every((h) => ALLOWED_HEADERS.includes(h))) {
              throw new Error('expectedHeaders must be a subset of the watched headers');
            }
            next.expectedHeaders = [...new Set(body.expectedHeaders)];
          }
          saveConfig(next);
          reloadConfig();
          if (body.intervalMinutes !== undefined && setIntervalMinutes) setIntervalMinutes(next.intervalMinutes);
          send(200, { ok: true });
        } catch (e) { send(400, { error: e.message }); }
        return;
      }

      // Settings > Storage "Reveal" (round-3 spec section 9.6): `which` selects one of exactly
      // two SERVER-KNOWN paths, the client never sends a path - so this can never be pointed
      // at an arbitrary filesystem location no matter what a request body contains.
      if (req.url === '/api/reveal' && req.method === 'POST') {
        const body = await readJsonBody(req);
        if (body.which === 'tasks') {
          fs.mkdirSync(TASKS_DIR, { recursive: true });
          execFile('explorer.exe', [TASKS_DIR], () => {}); // explorer often "fails" with a non-zero exit even on success; fire-and-forget
          send(200, { ok: true });
        } else if (body.which === 'state') {
          execFile('explorer.exe', ['/select,' + STATE_PATH], () => {});
          send(200, { ok: true });
        } else {
          send(400, { error: 'invalid target' });
        }
        return;
      }

      // Settings > About "Reset everything to defaults" (round-3 spec section 9.7): restores
      // config.json's monitoring values and watched headers, and settings.json's accent/field,
      // to the shipped defaults. Never touches sites.json or the task vault.
      if (req.url === '/api/reset-defaults' && req.method === 'POST') {
        try {
          const config = getConfig();
          const next = { ...config, intervalMinutes: 10, thresholds: { slowMs: 3000, criticalMs: 6000, maxImagesChecked: 20, historyWindow: 144 }, expectedHeaders: [...ALLOWED_HEADERS] };
          saveConfig(next);
          reloadConfig();
          if (setIntervalMinutes) setIntervalMinutes(10);
          resetSettingsToDefaults();
          send(200, { ok: true });
        } catch (e) { send(500, { error: e.message }); }
        return;
      }

      // The only static route. The filename pattern is an allowlist, not a sanitizer: it
      // admits nothing but [a-z0-9-] plus the literal .woff2 suffix, so a traversal segment,
      // a Windows drive-relative path or an NTFS alternate-data-stream colon cannot be
      // expressed at all (same reasoning as taskFile() in tasks.js). The resolved-prefix
      // check below is belt and braces on top of that. Long cache: these filenames are
      // content-stable, and re-sending 107 KB of font on every dashboard poll would be silly.
      const fontMatch = req.url.match(/^\/fonts\/([a-z0-9-]+\.woff2)$/);
      if (fontMatch && req.method === 'GET') {
        const dir = path.join(ROOT, 'public', 'fonts');
        const file = path.join(dir, fontMatch[1]);
        if (!file.startsWith(dir + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, {
          'Content-Type': 'font/woff2',
          'Content-Length': fs.statSync(file).size,
          'Cache-Control': 'public, max-age=604800, immutable',
        });
        fs.createReadStream(file).pipe(res);
        return;
      }

      // Same allowlist-regex-not-sanitizer pattern as the font route above: admits nothing
      // but [a-z0-9-] plus a literal .webp suffix, so no traversal segment is expressible.
      const brandMatch = req.url.match(/^\/brand\/([a-z0-9-]+\.webp)$/);
      if (brandMatch && req.method === 'GET') {
        const dir = path.join(ROOT, 'public', 'brand');
        const file = path.join(dir, brandMatch[1]);
        if (!file.startsWith(dir + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, {
          'Content-Type': 'image/webp',
          'Content-Length': fs.statSync(file).size,
          'Cache-Control': 'public, max-age=604800, immutable',
        });
        fs.createReadStream(file).pipe(res);
        return;
      }

      if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(PAGE);
        return;
      }
      res.writeHead(404);
      res.end('not found');
    } catch (e) {
      send(500, { error: e.message });
    }
  };

  function onListenError(e, family) {
    if (e.code === 'EADDRINUSE') {
      console.error(`port ${port} (${family}) is already in use - is the monitor already running? exiting instead of idling as a dead duplicate.`);
      process.exit(1);
    }
    // Any other bind failure on the IPv6 loopback alone (e.g. IPv6 disabled on this machine)
    // shouldn't take down an otherwise-working IPv4 dashboard - log and keep running on v4.
    console.error(`dashboard: ${family} listener failed to start: ${e.message}`);
  }

  const server4 = http.createServer(requestHandler);
  server4.on('error', (e) => onListenError(e, '127.0.0.1'));
  server4.listen(port, '127.0.0.1');

  const server6 = http.createServer(requestHandler);
  server6.on('error', (e) => onListenError(e, '::1'));
  server6.listen(port, '::1');

  return {
    close() { server4.close(); server6.close(); },
  };
}
