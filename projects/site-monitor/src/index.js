import { loadEnv, loadConfig } from './lib.js';
import { checkSite } from './checker.js';
import { loadState, saveState, recordCheck } from './state.js';
import { sendTelegram, formatTransitionAlert } from './alerts.js';
import { startMonitor } from './app.js';

const runOnce = process.argv.includes('--once');

if (runOnce) {
  loadEnv();
  const config = loadConfig();
  let state = loadState();
  for (const site of config.sites) {
    let result;
    try {
      result = await checkSite(site, config.thresholds, config.expectedHeaders);
    } catch (e) {
      result = { name: site.name, url: site.url, checkedAt: new Date().toISOString(), overall: 'down', error: e.message };
    }
    const { transitioned, from, to } = recordCheck(state, result, config.thresholds.historyWindow || 50);
    console.log(`  ${site.name}: ${result.overall}${result.ms ? ` (${result.ms}ms)` : ''}`);
    if (transitioned) {
      const sent = await sendTelegram(formatTransitionAlert(result, { from, to }));
      if (!sent.sent) console.log(`  -> telegram not sent: ${sent.reason}`);
    }
  }
  saveState(state);
  process.exit(0);
}

startMonitor();
