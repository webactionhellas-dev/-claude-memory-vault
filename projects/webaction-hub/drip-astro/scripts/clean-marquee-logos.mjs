// Cleans the marquee brand logos:
//  1. Four logos picked up a stray artifact fragment on their right edge during
//     the original grid crop (debris bled in from the neighbouring logo). We cut
//     those columns off with an explicit per-file `keepRight` cutoff.
//  2. Every logo is then trimmed to a tight transparent bounding box so they all
//     render at a consistent visual size in the marquee (object-contain, fixed
//     height). Originals are preserved in _logo_backup/.
import sharp from 'sharp';
import path from 'node:path';
import { writeFile, readFile } from 'node:fs/promises';

const ROOT = path.resolve('public/brands');

// rel path -> { right, bottom } cutoffs that drop stray artifact islands before
// trimming. Both optional. Sourced from _logo_backup/ so this is idempotent.
const FILES = {
  'pad/logo-nike.webp': {},
  'pad/logo-jordan.webp': { right: 220 },        // jumpman 36-203, stray 250-275
  'pad/logo-yeezy.webp': { right: 300 },         // YEEZY 14-273, stray 353-364
  'pad/logo-new-balance.webp': {},
  'pad/logo-adidas.webp': {},
  'pad/logo-asics.webp': {},
  'pad/logo-ugg.webp': {},
  'pad/logo-essentials.webp': { right: 320 },    // ESSENTIALS/FEAR OF GOD 29-303, stray 349-363
  'pad/logo-stone-island.webp': { right: 215, bottom: 198 }, // compass only — drop clipped Supreme box + stray
  'pad/logo-stussy.webp': {},
  'pad/logo-fear-of-god.webp': {},  // legit letters span the full width
  'salomon.webp': {},
};

const ALPHA_MIN = 40; // pixel counts as "ink" above this alpha
const PAD = 3;        // transparent margin around the trimmed logo (px)

async function clean(rel, { right, bottom } = {}) {
  // always read from the pristine backup so re-runs are idempotent
  const file = path.join(ROOT, rel);
  const src = await readFile(path.join('_logo_backup', rel));
  const { data, info } = await sharp(src).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;

  const xLimit = right == null ? W : Math.min(W, right);
  const yLimit = bottom == null ? H : Math.min(H, bottom);

  // erase anything past the cutoffs so the stray can't leak back in
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (x >= xLimit || y >= yLimit) data[(y * W + x) * C + 3] = 0;

  // ink bounding box over what remains
  let minX = W, maxX = 0, minY = H, maxY = 0, found = false;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * C + 3] > ALPHA_MIN) {
        found = true;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) { console.log(rel, '— no ink, skipped'); return; }

  const left = Math.max(0, minX - PAD);
  const top = Math.max(0, minY - PAD);
  const w = Math.min(W - left, maxX - minX + 1 + PAD * 2);
  const h = Math.min(H - top, maxY - minY + 1 + PAD * 2);

  const out = await sharp(data, { raw: { width: W, height: H, channels: C } })
    .extract({ left, top, width: w, height: h })
    .sharpen({ sigma: 0.7 }) // crisp the anti-aliased edges so detail survives downscaling in the marquee
    .webp({ lossless: true })
    .toBuffer();
  await writeFile(file, out);

  const cuts = [right != null && `x>${right}`, bottom != null && `y>${bottom}`].filter(Boolean);
  console.log(`${rel.padEnd(28)} ${W}x${H} -> ${w}x${h}` + (cuts.length ? `  (cut ${cuts.join(', ')})` : ''));
}

for (const [f, cfg] of Object.entries(FILES)) await clean(f, cfg);
console.log('done');
