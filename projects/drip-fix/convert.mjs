import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';

const SRC = 'C:/Users/mikef/Downloads/drip-barbershop-standalone.html';
const OUT = 'C:/Users/mikef/Downloads/drip-barbershop-optimized.html';
const CAP = 1200, Q = 78;

let html = readFileSync(SRC, 'utf8');
const origSize = Buffer.byteLength(html);

// ---- 1. Encode every unique source image to webp (cached by source b64) ----
const reAny = /data:image\/(jpeg|jpg|png);base64,([A-Za-z0-9+/=]+)/g;
const cache = new Map(); // src b64 -> webp data url
const srcs = [...new Set([...html.matchAll(reAny)].map(m => m[2]))];
for (const b64 of srcs) {
  const inBuf = Buffer.from(b64, 'base64');
  const meta = await sharp(inBuf).metadata();
  const longest = Math.max(meta.width || 0, meta.height || 0);
  let pipe = sharp(inBuf);
  if (longest > CAP) {
    pipe = pipe.resize({ width: meta.width >= meta.height ? CAP : null,
                         height: meta.height > meta.width ? CAP : null,
                         withoutEnlargement: true });
  }
  const outBuf = await pipe.webp({ quality: Q, effort: 6 }).toBuffer();
  cache.set(b64, 'data:image/webp;base64,' + outBuf.toString('base64'));
}
console.log(`Encoded ${srcs.length} unique images to webp.`);

// ---- 2. Pull out the __EMB literal so it doesn't get inline-replaced ----
const embRe = /window\.__EMB=\{([^}]*)\};/;
const embMatch = html.match(embRe);
if (!embMatch) throw new Error('__EMB not found');
const embBody = embMatch[1];
html = html.replace(embRe, '__EMB_PLACEHOLDER__');

// ---- 3. Inline-replace all remaining (non-__EMB) images with webp ----
html = html.replace(reAny, (full, fmt, b64) => cache.get(b64) || full);

// ---- 4. Rebuild __EMB with array-backed dedup ----
const pairRe = /"([^"]+)":"(data:image\/[^"]+)"/g;
const uniq = new Map();   // webp data url -> index
const arr = [];
const entries = [];
for (const m of embBody.matchAll(pairRe)) {
  const key = m[1];
  const webp = cache.get(m[2].replace(/^data:image\/(jpeg|jpg|png);base64,/, '')) // jpeg src -> webp
            || cache.get(m[2].split('base64,')[1])                                // raw b64 lookup
            || m[2];                                                              // already converted/other
  // Resolve via cache using the raw base64 portion
  const rawB64 = m[2].split('base64,')[1];
  const finalUrl = cache.get(rawB64) || m[2];
  if (!uniq.has(finalUrl)) { uniq.set(finalUrl, arr.length); arr.push(finalUrl); }
  entries.push(`"${key}":E[${uniq.get(finalUrl)}]`);
}
const embJs = `var E=[${arr.map(u => JSON.stringify(u)).join(',')}];window.__EMB={${entries.join(',')}};`;
html = html.replace('__EMB_PLACEHOLDER__', embJs);

writeFileSync(OUT, html);
console.log(`__EMB: ${entries.length} keys -> ${arr.length} unique stored images.`);
console.log(`File: ${(origSize/1024/1024).toFixed(2)}MB -> ${(Buffer.byteLength(readFileSync(OUT))/1024/1024).toFixed(2)}MB`);
console.log(`Wrote ${OUT}`);
