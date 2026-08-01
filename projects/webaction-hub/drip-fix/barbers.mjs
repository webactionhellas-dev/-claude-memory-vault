import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';

const ORIG = 'C:/Users/mikef/Downloads/drip-barbershop-standalone.html';
const OPT  = 'C:/Users/mikef/Downloads/drip-barbershop-optimized.html';

const orig = readFileSync(ORIG, 'utf8');
let opt = readFileSync(OPT, 'utf8');

// current E array length = next free index
const embLiteral = opt.match(/var E=\[([\s\S]*?)\];window\.__EMB=/)[1];
let nextIdx = (embLiteral.match(/"data:image/g) || []).length;
console.log('E currently holds', nextIdx, 'images');

const KEYS = ['barber1', 'barber2', 'barber3'];
let pushes = '';
for (const k of KEYS) {
  const m = orig.match(new RegExp('"' + k + '":"(data:image/[^"]+)"'));
  const srcBuf = Buffer.from(m[1].split('base64,')[1], 'base64');
  const meta = await sharp(srcBuf).metadata();

  let pipe = sharp(srcBuf);
  const longest = Math.max(meta.width, meta.height);
  if (longest > 1600) {
    pipe = pipe.resize({ width: meta.width >= meta.height ? 1600 : null,
                         height: meta.height > meta.width ? 1600 : null,
                         withoutEnlargement: true });
  }
  const outBuf = await pipe.webp({ quality: 90, effort: 6 }).toBuffer();
  const url = 'data:image/webp;base64,' + outBuf.toString('base64');

  pushes += 'E.push(' + JSON.stringify(url) + ');';
  // repoint this key to the new high-res entry
  const before = opt;
  opt = opt.replace(new RegExp('"' + k + '":E\\[\\d+\\]'), '"' + k + '":E[' + nextIdx + ']');
  if (opt === before) throw new Error('could not repoint ' + k);
  console.log(`${k}: ${meta.width}x${meta.height} -> webp q90 ${(outBuf.length/1024).toFixed(0)}KB  (E[${nextIdx}])`);
  nextIdx++;
}

// append the new images to E right before __EMB is built
opt = opt.replace('window.__EMB={', pushes + 'window.__EMB={');

writeFileSync(OPT, opt);
console.log('Done. New E length:', nextIdx);
