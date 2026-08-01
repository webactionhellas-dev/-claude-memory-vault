import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const products = JSON.parse(fs.readFileSync('src/data/products.json','utf8'));
const dir = 'src/assets/products';

async function wantFlip(file) {
  const { data, info } = await sharp(file).resize(220, null, { fit: 'inside' })
    .grayscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const isShoe = (x, y) => data[y * w + x] < 236;
  let minX = w, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (isShoe(x, y)) {
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y > maxY) maxY = y;
  }
  if (maxX <= minX) return false;
  const mid = (minX + maxX) / 2;
  let leftTop = h, rightTop = h;
  for (let y = 0; y < h; y++) for (let x = minX; x <= maxX; x++) if (isShoe(x, y)) {
    if (x < mid) { if (y < leftTop) leftTop = y; } else { if (y < rightTop) rightTop = y; }
  }
  return (maxY - leftTop) > (maxY - rightTop); // heel-left => toe-right => flip
}

const flips = [];
for (const p of products) {
  try { if (await wantFlip(path.join(dir, p.images[0]))) flips.push(p.slug); } catch {}
}
fs.writeFileSync('src/data/orientation-flips.json', JSON.stringify(flips));
console.log(`flagged ${flips.length}/${products.length} products to flip toe-left`);
