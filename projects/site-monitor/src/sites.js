import { loadConfig, saveConfig } from './lib.js';

// CRUD over config.json's `sites` array (name/url/muted) - the source-of-truth list of what
// gets checked. Kept separate from state.js (the rolling check RESULTS, not the list of what
// to check) and from tasks.js (a completely different backend and storage format).

function normalizeUrl(raw) {
  const value = String(raw || '').trim();
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('not a valid URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('URL must start with http:// or https://');
  return parsed.href;
}

export function listSites() {
  return loadConfig().sites;
}

export function addSite({ name, url }) {
  const cleanName = String(name || '').trim();
  if (!cleanName) throw new Error('name is required');
  const cleanUrl = normalizeUrl(url);
  const config = loadConfig();
  if (config.sites.some((s) => s.name.toLowerCase() === cleanName.toLowerCase())) {
    throw new Error(`a site named "${cleanName}" already exists`);
  }
  const site = { name: cleanName, url: cleanUrl };
  config.sites.push(site);
  saveConfig(config);
  return site;
}

export function removeSite(name) {
  const config = loadConfig();
  const before = config.sites.length;
  config.sites = config.sites.filter((s) => s.name.toLowerCase() !== String(name || '').toLowerCase());
  if (config.sites.length === before) throw new Error(`no site found named "${name}"`);
  saveConfig(config);
}

export function setMuted(name, muted) {
  const config = loadConfig();
  const site = config.sites.find((s) => s.name.toLowerCase() === String(name || '').toLowerCase());
  if (!site) throw new Error(`no site found named "${name}"`);
  site.muted = !!muted;
  saveConfig(config);
  return site;
}
