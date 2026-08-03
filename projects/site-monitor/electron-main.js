import { app, BrowserWindow, Tray, Menu, nativeImage, screen } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startMonitor } from './src/app.js';
import { loadState } from './src/state.js';
import { WRITABLE_ROOT } from './src/lib.js';

// ESM has no __dirname. Derived once, and it resolves to the same directory as src/lib.js's
// ROOT in both dev and a packaged build, so the two never disagree about where the app lives.
const HERE = path.dirname(fileURLToPath(import.meta.url));

// Spec section 11 (round three). One field colour, and the frame is painted in it from the
// very first frame so there is no white or black flash before the page paints.
const FIELD = '#0B0E16';
const INK = '#EAF0FF';
const TITLE_BAND = 44;
const DEFAULT_BOUNDS = { width: 1180, height: 780 };
const MIN_WIDTH = 1000;
const MIN_HEIGHT = 660;

let mainWindow;
let tray;
let trayFailed = false; // true only once we know a tray could not be created at all
let trayTimer;
let traySeverity; // last severity actually painted into the tray, so we only setImage on change
let monitor;

// ---------------------------------------------------------------------------------------
// Settings file. Window bounds live in the SAME store as the display preferences
// (data/settings.json), not in a second file. Read and written here as raw JSON rather than
// through src/settings.js on purpose: that module's loadSettings/saveSettings deliberately
// whitelist accent + background and drop everything else, so round-tripping bounds through
// them would silently discard them. Read-modify-write, so nothing else in the file is lost.
// ---------------------------------------------------------------------------------------
const SETTINGS_PATH = path.join(WRITABLE_ROOT, 'data', 'settings.json');

function readSettingsFile() {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) return {};
    const raw = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {}; // corrupt file, open at the default size rather than refuse to start
  }
}

function writeSettingsFile(next) {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(next, null, 2));
  } catch { /* a preference write must never take the window down */ }
}

// A saved rectangle is only usable if every field is a real finite number. Anything else
// (hand-edited file, half-written file, an older schema) falls back to the default size.
function validBounds(b) {
  if (!b || typeof b !== 'object') return null;
  const { x, y, width, height } = b;
  const nums = [x, y, width, height];
  if (!nums.every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  if (width < 1 || height < 1) return null;
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}

function rectsIntersect(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

// The part that is usually skipped: a window saved on a monitor that has since been
// unplugged has coordinates that no longer exist, so it opens completely offscreen and
// looks like the app failed to launch. If the saved rectangle touches no current display's
// work area, recentre instead.
function boundsAreOnAConnectedDisplay(bounds) {
  try {
    return screen.getAllDisplays().some((d) => rectsIntersect(d.workArea, bounds));
  } catch {
    return true; // if the display list cannot be read, trust the saved position
  }
}

function createWindow(port) {
  const saved = validBounds(readSettingsFile().windowBounds);

  const options = {
    ...(saved || DEFAULT_BOUNDS),
    // Spec section 6: the layout is a fixed band stack, so the window has a floor.
    // Only this file can set it.
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    title: 'Site Monitor',
    autoHideMenuBar: true,
    // The app itself owns the top 44px band (page name left, clock right). Keeping
    // titleBarStyle 'hidden' plus a titleBarOverlay rather than a frameless window is what
    // preserves Windows Snap Layouts on maximize hover.
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: FIELD, symbolColor: INK, height: TITLE_BAND },
    // Painted before first paint, so the frame is already the field colour and the launch
    // shows no flash of a different colour. The window is not shown at all until it has
    // content to show.
    backgroundColor: FIELD,
    show: false,
    // Explicit, not relying on Electron's version defaults: this window loads a page whose
    // task/site text fields are user-editable, so if any of that content were ever able to
    // run script in the page, it must not get Node/filesystem access. No preload script and
    // no Node API is used anywhere in the client-side dashboard code, so nothing here needs
    // relaxing.
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  };

  // build/icon.ico is produced separately. Referencing a path that does not exist yet makes
  // Electron log a load failure, so it is only passed when the file is actually on disk:
  // a missing icon degrades to the default Electron icon instead of a noisy startup.
  const iconPath = path.join(HERE, 'build', 'icon.ico');
  try { if (fs.existsSync(iconPath)) options.icon = iconPath; } catch { /* no icon, carry on */ }

  mainWindow = new BrowserWindow(options);

  if (saved && !boundsAreOnAConnectedDisplay(saved)) mainWindow.center();

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadURL(`http://localhost:${port}`);

  // getNormalBounds, not getBounds: a maximized or fullscreen window must persist the size
  // it will restore to, otherwise unmaximizing once would shrink the app to the title bar.
  // 'resized' and 'moved' fire when the drag finishes, not continuously, so this is one
  // small write per gesture.
  const saveBounds = () => {
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isMinimized()) return;
    writeSettingsFile({ ...readSettingsFile(), windowBounds: mainWindow.getNormalBounds() });
  };
  mainWindow.on('resized', saveBounds);
  mainWindow.on('moved', saveBounds);

  // A desktop app does not reload, print, zoom or open DevTools on the browser's shortcuts.
  // Ctrl+F is reclaimed for the app's own filter instead of Chromium's find bar.
  mainWindow.webContents.on('before-input-event', (e, i) => {
    const k = i.key.toLowerCase(), mod = i.control || i.meta;
    if (k === 'f5') return e.preventDefault();
    if (mod && ['r', 'p', '+', '=', '-', '0'].includes(k)) return e.preventDefault();
    if (mod && i.shift && ['i', 'c', 'j'].includes(k)) return e.preventDefault();
    if (mod && k === 'f') { e.preventDefault(); mainWindow.webContents.send('focus-filter'); }
  });
  // Pinch zoom is a browser affordance, not a desktop one.
  mainWindow.webContents.setVisualZoomLevelLimits(1, 1).catch(() => {});

  mainWindow.on('close', (e) => {
    // Closing the window hides it, it doesn't quit the monitor - checks and the task
    // board keep running in the background, same as before this was an Electron app.
    // The one exception is a failed tray: with no tray icon there is no way back to a
    // hidden window, so a real close has to be allowed to close.
    if (!app.isQuitting && !trayFailed) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

// ---------------------------------------------------------------------------------------
// Tray. Spec section 1: the A triangle on the field tile, tinted by the REAL worst current
// status. The previous createFromNamedImage path was macOS-only and returned an empty image
// on Windows, which is why the tray had no icon of its own at all.
// ---------------------------------------------------------------------------------------

// Real state, read from the same store the dashboard reads, so the tray and the window can
// never disagree about how bad things are. 'down' outranks 'warn' outranks everything else.
function worstSeverity() {
  try {
    const sites = Object.values(loadState().sites || {});
    let worst = 'clear';
    for (const s of sites) {
      if (s.overall === 'down') return 'urgent';
      if (s.overall === 'warn') worst = 'attention';
    }
    return worst;
  } catch {
    return 'clear';
  }
}

// The tinted PNGs are produced separately and may not exist yet. Rather than hard-code one
// filename and break if it is spelled differently, each severity has a set of accepted
// tokens: an exact tray-<token>.png in either directory wins, otherwise any PNG in those
// directories whose name carries both "tray" and the token is accepted. Nothing found means
// no tint is available, and the caller falls back rather than failing.
const BRAND_DIRS = [path.join(HERE, 'public', 'brand'), path.join(HERE, 'build')];
const SEV_TOKENS = {
  clear: ['clear', 'ok', 'up'],
  attention: ['attention', 'warn'],
  urgent: ['urgent', 'down'],
};
const resolvedIcons = new Map(); // severity -> nativeImage, cached only on success

function findTrayFile(severity) {
  const tokens = SEV_TOKENS[severity] || [];
  for (const dir of BRAND_DIRS) {
    for (const token of tokens) {
      const exact = path.join(dir, `tray-${token}.png`);
      try { if (fs.existsSync(exact)) return exact; } catch { /* unreadable, try the next */ }
    }
  }
  for (const dir of BRAND_DIRS) {
    let entries;
    try { entries = fs.readdirSync(dir); } catch { continue; } // directory not created yet
    for (const token of tokens) {
      const hit = entries.find((f) => {
        const n = f.toLowerCase();
        return n.endsWith('.png') && n.includes('tray') && n.includes(token);
      });
      if (hit) return path.join(dir, hit);
    }
  }
  return null;
}

function tintedTrayIcon(severity) {
  if (resolvedIcons.has(severity)) return resolvedIcons.get(severity);
  const file = findTrayFile(severity);
  if (!file) return null;
  try {
    let img = nativeImage.createFromPath(file);
    if (!img || img.isEmpty()) return null;
    // The Windows notification area draws at 16px at 100% DPI and 24px at 150%. Handing it a
    // 256px source makes it do its own poor downscale, so anything oversized is resized here.
    const { width } = img.getSize();
    if (width > 32) img = img.resize({ width: 32, height: 32, quality: 'best' });
    resolvedIcons.set(severity, img);
    return img;
  } catch {
    return null;
  }
}

// Fallback when no tinted PNG is on disk yet: the real icon already on disk for the running
// executable (the packaged Site Monitor.exe, or electron.exe in dev). A tray with a generic
// icon is still a working way back to a hidden window, which a missing tray is not.
async function fallbackTrayIcon() {
  try {
    const fileIcon = await app.getFileIcon(process.execPath, { size: 'small' });
    if (fileIcon && !fileIcon.isEmpty()) return fileIcon;
  } catch { /* nothing else to try */ }
  return null;
}

// Real state, read from the same store the dashboard reads. Wording matches the verdict
// line so the tray and the window never disagree.
function trayTooltip() {
  try {
    const sites = Object.values(loadState().sites || {});
    if (!sites.length) return 'Site Monitor. No sites are being watched yet.';
    const needing = sites.filter((s) => s.overall !== 'ok').length;
    if (needing === 0) {
      return sites.length === 1
        ? 'Site Monitor. The site is up.'
        : `Site Monitor. All ${sites.length} sites are up.`;
    }
    return `Site Monitor. ${needing} of ${sites.length} sites need attention.`;
  } catch {
    return 'Site Monitor';
  }
}

// Repaints the tray only when the worst status actually moved, so the one-minute timer is a
// state read and nothing more on the ninety-nine ticks out of a hundred where nothing changed.
// Also retries resolving the tinted PNGs, so a tray created before those files landed picks
// them up on the next tick instead of needing a restart.
function refreshTray() {
  if (!tray || tray.isDestroyed()) return;
  try { tray.setToolTip(trayTooltip()); } catch { return; }
  const severity = worstSeverity();
  const img = tintedTrayIcon(severity);
  if (!img) return;
  if (severity === traySeverity && resolvedIcons.has(severity)) return;
  try { tray.setImage(img); traySeverity = severity; } catch { /* tray gone */ }
}

async function createTray() {
  const severity = worstSeverity();
  const icon = tintedTrayIcon(severity) || await fallbackTrayIcon();
  if (!icon) { trayFailed = true; return; }
  tray = new Tray(icon);
  traySeverity = resolvedIcons.has(severity) ? severity : undefined;
  tray.setToolTip(trayTooltip());
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open dashboard', click: () => { mainWindow.show(); } },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
  ]));
  tray.on('click', () => mainWindow.show());
  // Checks land every intervalMinutes, so a minute is fine and costs one small file read.
  trayTimer = setInterval(refreshTray, 60000);
}

app.whenReady().then(() => {
  monitor = startMonitor({ onLog: (...a) => console.log(...a) });
  createWindow(monitor.port);
  // Tray icon optional, never block startup on it.
  createTray().catch(() => { trayFailed = true; });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(monitor.port);
    else mainWindow.show();
  });
});

app.on('before-quit', () => { app.isQuitting = true; clearInterval(trayTimer); monitor?.stop(); });
app.on('window-all-closed', () => {
  // Keep running in tray - do not quit on window close. Without a tray there is nothing left
  // to run for, so quit rather than leave an invisible process behind.
  if (trayFailed) { app.isQuitting = true; app.quit(); }
});
