// The actual monitor: scheduler + dashboard server. Both the plain CLI (src/index.js)
// and the Electron desktop app (electron-main.js) call this SAME function, so there is
// only one tested implementation of "how the monitor runs" - not a CLI copy and an
// Electron copy that quietly drift apart.
import { loadEnv, loadConfig } from './lib.js';
import { checkSite } from './checker.js';
import { loadState, saveState, recordCheck } from './state.js';
import { sendTelegram, formatTransitionAlert, telegramConfigured } from './alerts.js';
import { startDashboard } from './dashboard.js';

export function startMonitor({ onLog } = {}) {
  const log = onLog || ((...a) => console.log(...a));
  loadEnv();
  // `let`, not `const`: adding/removing/muting a site from the dashboard writes config.json
  // on disk, then calls reloadConfig() below so this already-running loop picks it up
  // immediately instead of needing an app restart.
  let config = loadConfig();
  // `let`, not `const`: the Settings page's Monitoring group can change the check interval
  // live (writes config.json, then calls setIntervalMinutes below to re-arm the timer) - a
  // real environment override still wins on the NEXT process start, same precedence as before.
  let intervalMinutes = Number(process.env.CHECK_INTERVAL_MINUTES || config.intervalMinutes || 10);
  const port = Number(process.env.DASHBOARD_PORT || 8788);

  let state = loadState();
  state.intervalMinutes = intervalMinutes;

  // Checks exactly one site and folds it into state. Used by the interval loop below AND by
  // the dashboard's "recheck now" route, so there is one tested code path for "run a check",
  // not two that could quietly drift apart.
  async function checkOne(site) {
    let result;
    try {
      result = await checkSite(site, config.thresholds, config.expectedHeaders);
    } catch (e) {
      result = { name: site.name, url: site.url, checkedAt: new Date().toISOString(), overall: 'down', error: e.message };
    }
    const { transitioned, from, to } = recordCheck(state, result, config.thresholds.historyWindow || 50);
    log(`  ${site.name}: ${result.overall}${result.ms ? ` (${result.ms}ms)` : ''}`);
    if (transitioned) {
      const muted = config.sites.find((s) => s.name === site.name)?.muted;
      if (muted) {
        log(`  -> transition ${from} -> ${to}, muted, no alert sent`);
      } else {
        log(`  -> transition ${from} -> ${to}, alerting`);
        const text = formatTransitionAlert(result, { from, to });
        const sent = await sendTelegram(text);
        if (!sent.sent) log(`  -> telegram not sent: ${sent.reason}`);
      }
    }
    saveState(state);
    return state.sites[site.name];
  }

  async function runAllChecks() {
    log(`[${new Date().toISOString()}] checking ${config.sites.length} site(s)...`);
    for (const site of config.sites) await checkOne(site);
  }

  log(`site-monitor starting - dashboard http://localhost:${port}, checking every ${intervalMinutes}m`);
  log(telegramConfigured() ? 'telegram alerts: configured' : 'telegram alerts: not configured (console + dashboard only)');

  // Declared before startDashboard() so setIntervalMinutes below can close over it; the
  // closure captures the BINDING, not a snapshot, so it always clears/re-arms the real timer
  // even though `timer` isn't assigned its first value until after the dashboard is created.
  let timer;
  const server = startDashboard(port, {
    getState: () => state,
    getConfig: () => config,
    reloadConfig: () => { config = loadConfig(); return config; },
    recheckSite: async (name) => {
      const site = config.sites.find((s) => s.name === name);
      if (!site) return null;
      return checkOne(site);
    },
    // Settings > Monitoring > "Check every" calls this after writing the new value to
    // config.json, so the running scheduler picks it up immediately instead of needing a
    // restart. state.intervalMinutes also drives the sidebar's stale-freshness math and the
    // verdict engine's "stale"/"nocheck" thresholds, so it has to move together with the timer.
    setIntervalMinutes: (mins) => {
      const clean = Number(mins);
      if (!Number.isFinite(clean) || clean < 1 || clean > 1440) throw new Error('interval must be 1-1440 minutes');
      intervalMinutes = clean;
      state.intervalMinutes = clean;
      saveState(state);
      clearInterval(timer);
      timer = setInterval(runAllChecks, intervalMinutes * 60 * 1000);
    },
  });
  runAllChecks();
  timer = setInterval(runAllChecks, intervalMinutes * 60 * 1000);

  return {
    port,
    stop() { clearInterval(timer); server.close(); },
    runOnce: runAllChecks,
  };
}
