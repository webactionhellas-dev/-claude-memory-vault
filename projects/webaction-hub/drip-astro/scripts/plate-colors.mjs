// Read-only: samples each product photo's studio-background colour (the shade at
// its edges) → filename:hex map. The card "plate" gradient is built from this
// colour, so every photo's background dissolves seamlessly into its plate = one
// soft box. White shoes get a white plate; the few apparel shots on grey/dark
// backgrounds get a matching plate. Does NOT modify any image.
import sharp from 'sharp';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DIR = 'src/assets/products';
const OUT = 'src/data/plate-colors.json';
const toHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const median = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];

async function bg(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info, ch = info.channels, s = 8;
  const pts = [[0, 0], [w - s, 0], [0, h - s], [w - s, h - s], [(w - s) >> 1, 0], [(w - s) >> 1, h - s], [0, (h - s) >> 1], [w - s, (h - s) >> 1]];
  const rs = [], gs = [], bs = [];
  for (const [bx, by] of pts) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const i = ((by + y) * w + (bx + x)) * ch; if (data[i + 3] < 200) continue; r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
    if (n) { rs.push(r / n); gs.push(g / n); bs.push(b / n); }
  }
  if (!rs.length) return '#ffffff';
  return toHex(median(rs), median(gs), median(bs));
}

const files = (await readdir(DIR)).filter((f) => /\.webp$/i.test(f));
const map = {};
const CONC = 8;
await Promise.all(Array.from({ length: CONC }, (_, k) => files.filter((_, i) => i % CONC === k)).map(async (list) => {
  for (const f of list) { try { map[f] = await bg(path.join(DIR, f)); } catch { map[f] = '#ffffff'; } }
}));
const sorted = Object.fromEntries(Object.keys(map).sort().map((k) => [k, map[k]]));
await writeFile(OUT, JSON.stringify(sorted));
console.log(`Wrote ${OUT}: ${files.length} images. Non-white:`, Object.entries(sorted).filter(([, v]) => v !== '#ffffff' && parseInt(v.slice(1, 3), 16) < 232).map(([k]) => k).length);
