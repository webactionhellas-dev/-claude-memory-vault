// Replace every remaining Unsplash URL in index.html with a curated local image.
import { readFile, writeFile } from 'node:fs/promises';

const HTMLU = new URL('../index.html', import.meta.url);
let html = await readFile(HTMLU, 'utf8');
const products = JSON.parse(await readFile(new URL('../data/products.json', import.meta.url), 'utf8'));

// hero ids that were preloaded in <head> (most visible) -> map to strongest images
const HERO_IDS = ['1595950653106-6c9ebd614d3a', '1556906781-9a412961c28c', '1606107557195-0e29a4b5b4aa', '1608231387042-66d1773070a5'];

// curated pool of strong local images (featured, brand-diverse, real files)
const seen = new Set();
const pool = [];
for (const p of products) {
  if (!p.featured || !p.images[0]) continue;
  if (seen.has(p.brand)) continue;       // one per brand first
  seen.add(p.brand); pool.push(p.images[0]);
}
for (const p of products) { if (p.images[0] && pool.length < 24) pool.push(p.images[0]); }

// find unique unsplash ids in document order
const ids = [];
for (const m of html.matchAll(/photo-([0-9a-f-]+)/g)) if (!ids.includes(m[1])) ids.push(m[1]);

// build id -> local map: hero ids get pool[0..3], rest cycle through the pool
const map = {};
let pi = 4 % pool.length;
for (const id of ids) {
  if (HERO_IDS.includes(id)) map[id] = pool[HERO_IDS.indexOf(id) % pool.length];
  else { map[id] = pool[pi % pool.length]; pi++; }
}

// replace every full unsplash URL (handles &amp; encoding; stops at quote)
let count = 0;
html = html.replace(/https:\/\/images\.unsplash\.com\/photo-([0-9a-f-]+)[^"'\s)]*/g, (full, id) => {
  count++;
  return '/' + (map[id] || pool[0]);   // leading slash -> resolves against site root
});

await writeFile(HTMLU, html);
const remaining = (html.match(/unsplash\.com/g) || []).length;
console.log(`Replaced ${count} Unsplash URLs across ${ids.length} unique ids. Remaining unsplash refs: ${remaining}`);
console.log('hero map:', HERO_IDS.map(id => map[id]));
