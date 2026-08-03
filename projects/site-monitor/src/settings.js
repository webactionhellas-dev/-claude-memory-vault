import fs from 'node:fs';
import path from 'node:path';
import { WRITABLE_ROOT } from './lib.js';

// Personal display preferences (accent color, field color) for whoever's machine this
// dashboard is running on. Its own file in data/ (same untracked, gitignored directory as
// state.json) - NOT localStorage, because the dashboard is opened both inside the Electron
// window and as a plain browser tab, and only a server-side file behaves identically in both.
// Also deliberately NOT anything that goes through the git-synced obsidian-vault: that vault
// is shared operational data (tasks), while a display preference must never bleed onto
// Asteris's machine or land in a commit.
const SETTINGS_PATH = path.join(WRITABLE_ROOT, 'data', 'settings.json');

// TRACE round-3 (2026-08-03): gradient and image backgrounds are deleted (Mike approved) -
// the depth system is 1px lines at a MEASURED contrast against a KNOWN field, and an
// imported photo or gradient moves field luminance under every one of those lines without
// any way to re-verify it. There is exactly one field colour now, not a background "type".
const DEFAULTS = {
  accent: '#3366FF',
  field: '#0B0E16',
};

const HEX_RE = /^#[0-9a-f]{6}$/i;

function relLum(hex) {
  const n = hex.slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// Round-3 spec section 10.4: a custom field must keep --ink at 12:1 or better (relative
// luminance <= 0.0375) and --edge at 2.5:1 or better against itself; measured, #1B2130 is the
// ceiling. This is a REJECT, not the client's hue-preserving OKLCH darken-and-retry - the
// client already clamps before it ever POSTs, so a value landing here out of range means a
// non-standard client (or a stale one), and falling back to the safe default is the correct
// server-side answer rather than duplicating the full OKLCH search for a boundary that should
// not be reachable in normal use.
const FIELD_CEILING_LUM = relLum('#1B2130');

function normalizeAccent(accent) {
  return typeof accent === 'string' && HEX_RE.test(accent) ? accent : DEFAULTS.accent;
}

function normalizeField(field) {
  if (typeof field !== 'string' || !HEX_RE.test(field)) return DEFAULTS.field;
  return relLum(field) <= FIELD_CEILING_LUM + 1e-6 ? field : DEFAULTS.field;
}

export function loadSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) return { ...DEFAULTS };
  try {
    const raw = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    return { accent: normalizeAccent(raw.accent), field: normalizeField(raw.field) };
  } catch {
    return { ...DEFAULTS }; // corrupt file, fall back to the default look rather than crash
  }
}

export function saveSettings(settings) {
  const clean = { accent: normalizeAccent(settings?.accent), field: normalizeField(settings?.field) };
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(clean, null, 2));
  return clean;
}

export function resetSettingsToDefaults() {
  return saveSettings({ ...DEFAULTS });
}

export { DEFAULTS as SETTINGS_DEFAULTS };
