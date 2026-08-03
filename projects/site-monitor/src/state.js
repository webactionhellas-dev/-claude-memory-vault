import fs from 'node:fs';
import path from 'node:path';
import { WRITABLE_ROOT } from './lib.js';

const STATE_PATH = path.join(WRITABLE_ROOT, 'data', 'state.json');

// The 90-day strip reads one rolled-up entry per day, never raw checks: 90 days of raw
// 10-minute checks would be 12,960 entries per site (~4.3 MB rewritten every 10 minutes).
// A finished day is ~100 bytes once `samples` is dropped, so 90 days x 6 sites is ~54 KB.
export const DAY_CAP = 90;
// A live day keeps at most this many raw ms samples, purely to keep msP50 cheap and bounded.
// Same number as the raw historyWindow: 24h of checks at the 10-minute interval.
const DAY_SAMPLE_CAP = 144;

// Local calendar date, not UTC. This machine runs UTC+3, so a check at 22:41Z belongs to the
// NEXT local day, which is the day Mike would name if he read the clock on the wall.
function localDay(ts) {
  const t = new Date(ts);
  if (Number.isNaN(t.getTime())) return null;
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function median(values) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

// Folds ONE raw check into the day rollup. Deliberately shared by recordCheck and the
// backfill below so a restored day and a live-rolled day cannot disagree: one implementation
// of "what a day entry means", not two that quietly drift apart.
// `overall` here is always the RAW per-check reading, never the smoothed displayed badge.
function rollDay(days, at, overall, ms) {
  const d = localDay(at);
  if (!d) return days;
  let day = days[days.length - 1];
  if (!day || day.d !== d) {
    if (day) delete day.samples; // yesterday is finished: msP50/msMax are frozen, drop the raw ms
    day = { d, checks: 0, up: 0, warn: 0, down: 0, worst: 'up', msP50: null, msMax: 0, samples: [] };
    days.push(day);
    while (days.length > DAY_CAP) days.shift();
  }
  day.checks++;
  const b = overall === 'down' ? 'down' : overall === 'warn' ? 'warn' : 'up';
  day[b]++;
  day.worst = day.down ? 'down' : day.warn ? 'warn' : 'up';
  if (Number.isFinite(ms)) {
    if (!day.samples) day.samples = [];
    day.samples.push(ms);
    if (day.samples.length > DAY_SAMPLE_CAP) day.samples.splice(0, day.samples.length - DAY_SAMPLE_CAP);
    day.msMax = Math.max(day.msMax, ms);
    day.msP50 = median(day.samples);
  }
  return days;
}

// One-time migration for state written before the strip existed. Derives `days` from whatever
// raw history is already stored, so the strip shows real recorded days on first launch instead
// of an empty band. Runs only when `days` is absent: once rolled, recordCheck owns the array.
function backfillDays(state) {
  for (const site of Object.values(state.sites || {})) {
    if (Array.isArray(site.days)) continue;
    const days = [];
    for (const h of site.history || []) rollDay(days, h.at, h.overall, h.ms);
    site.days = days;
  }
  return state;
}

export { STATE_PATH };

export function loadState() {
  if (!fs.existsSync(STATE_PATH)) return { sites: {} };
  try {
    return backfillDays(JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')));
  } catch {
    return { sites: {} }; // corrupt file, start fresh rather than crash the monitor
  }
}

export function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// Which status "wins" the badge shown in the UI. A single borderline check (e.g. 2947ms
// against a 3000ms threshold) used to flip the whole badge on one sample - confirmed live on
// Drip Astro v2, which sits right on top of its slow threshold and oscillates ok/warn check
// to check. Require the last 3 real checks to actually agree (2 of 3) before the badge moves;
// a genuine 3-way split (rare - one ok, one warn, one down in the same window) holds whatever
// was already displayed rather than jumping to whichever check happened to land last. This
// only affects the displayed badge - the raw per-check history below (sparkline, uptime%) is
// untouched, so a real reader can still see every individual check that happened.
function computeDisplayedStatus(history, prevDisplayed) {
  const recent = history.slice(-3).map((h) => h.overall);
  const counts = {};
  let winner = recent[recent.length - 1];
  let winnerCount = 0;
  for (const status of recent) {
    counts[status] = (counts[status] || 0) + 1;
    if (counts[status] > winnerCount) { winner = status; winnerCount = counts[status]; }
  }
  const hasMajority = winnerCount * 2 > recent.length;
  return hasMajority ? winner : (prevDisplayed || winner);
}

// Folds a fresh check result into state: updates rolling history + uptime%, smooths the
// displayed status, and returns whether this is a real transition worth alerting on.
export function recordCheck(state, result, historyWindow) {
  const key = result.name;
  const prev = state.sites[key];
  const prevDisplayed = prev?.overall;

  const history = (prev?.history || []).concat({ at: result.checkedAt, overall: result.overall, ms: result.ms });
  while (history.length > historyWindow) history.shift();

  // Uptime means reachable, not "fully clean". A missing security header (warn) still means
  // the site answered a real request; only a genuine failure (down) should cost uptime%.
  // Conflating the two showed 3 of 6 real monitored sites at "0% uptime" while responding in
  // under 200ms - confirmed live against data/state.json, and just flatly wrong.
  const upCount = history.filter((h) => h.overall === 'ok' || h.overall === 'warn').length;
  const uptimePct = history.length ? Math.round((upCount / history.length) * 1000) / 10 : 100;

  const displayedOverall = computeDisplayedStatus(history, prevDisplayed);

  // 90-day rollup. Fed the RAW result.overall, not displayedOverall: the strip is the record of
  // what actually happened, so a real warn day must still read warn even when the 2-of-3 badge
  // smoothing held the displayed status at ok.
  const days = rollDay(prev?.days || [], result.checkedAt, result.overall, result.ms);

  // latestOverall keeps the true, un-smoothed reading from this exact check (still used for
  // missingHeaders/brokenImages/error, which always describe the current check, never a trend).
  state.sites[key] = { ...result, overall: displayedOverall, latestOverall: result.overall, history, uptimePct, days };

  const transitioned = prevDisplayed !== undefined && prevDisplayed !== displayedOverall
    && (prevDisplayed === 'ok' || displayedOverall === 'ok'); // only alert on the OK<->trouble boundary, not warn<->down noise
  return { transitioned, from: prevDisplayed, to: displayedOverall };
}
