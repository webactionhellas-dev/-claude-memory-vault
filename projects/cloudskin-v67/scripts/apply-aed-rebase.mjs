/* ============================================================
   CloudSkin, AED re-base step 3 of 3: re-base the FRONTEND.
   ------------------------------------------------------------
   Run this ONLY AFTER:
     1. node scripts/reprice-aed-run.mjs --go      (Shopify variants -> AED)
     2. Shopify admin: store currency EUR -> AED   (relabel, manual)
   Then:
     4. node scripts/deploy.mjs                    (ship it)

   What it changes:
     js/i18n.js     CUR table -> per-AED rates (AED becomes the base, rate 1)
     js/config.js   FREESHIP 200 -> 840 (the same threshold, in dirham)
     js/products.js fallback prices -> the SAME absolute AED map the
                    reprice used (the 1 test product deliberately stays 1)
     js/shell.js    removes the cart note claiming "charged in euro", which
                    the custom Stripe checkout made false (it now charges
                    the customer's own selected currency)

   Safe to run twice: every edit is idempotent and verified. Writes a
   .bak of each touched file the first time, so a revert is a file copy.

   Usage:
     node scripts/apply-aed-rebase.mjs --check   (report only, no writes)
     node scripts/apply-aed-rebase.mjs           (apply)
   ============================================================ */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const EUR_PER_AED = 4.2;   // the one rate the whole re-base is built on

/* Absolute AED prices. MUST stay identical to the map inside the
   reprice-aed edge function, so the fallback catalog and Shopify agree.
   The EUR 1 checkout-test product is deliberately absent: it keeps its
   price of 1 (it becomes AED 1) and is deleted after Larissa's test. */
const AED = {
  'the-signature-bra': 353, 'the-signature-skirtt': 370, 'the-sculpt-bra': 315,
  'the-court-skirt': 328, 'the-foundation-tank': 311, 'the-club-skirt': 286,
  'the-club-quarter-zip': 286, 'the-elevate-cropped-jacket': 454,
  'the-elevate-cropped-jacket-copy': 412, 'the-flow-dress': 496,
  'the-performance-tee': 269, 'the-performance-tank': 286, 'the-form-bra': 286,
  'the-ace-dress': 538, 'the-performance-shorts': 311
};

/* Current EUR-based display rates, divided by 4.2 to re-base onto AED.
   Kept as an explicit table (not computed at runtime) so what ships is
   reviewable and cannot drift. */
const CUR_AED = {
  USD: { symbol: '$', rate: 0.2714 },
  EUR: { symbol: '€', rate: 0.2381 },
  AUD: { symbol: 'A$', rate: 0.3881 },
  AED: { symbol: 'د.إ', rate: 1 },
  GBP: { symbol: '£', rate: 0.2021 },
  THB: { symbol: '฿', rate: 9.143 },
  SEK: { symbol: 'kr', rate: 2.631 },
  RUB: { symbol: '₽', rate: 20.95 },
  SAR: { symbol: 'ر.س', rate: 1.019 },
  KWD: { symbol: 'د.ك', rate: 0.08429 }
};

const results = [];
function record(file, change, status, detail = '') { results.push({ file, change, status, detail }); }

function edit(rel, fn) {
  const path = join(ROOT, rel);
  const before = readFileSync(path, 'utf8');
  const after = fn(before, rel);
  if (after === before) return;
  if (CHECK) return;
  const bak = path + '.bak';
  if (!existsSync(bak)) copyFileSync(path, bak);
  writeFileSync(path, after);
}

/* ---- 1. i18n.js: the CUR table becomes per-AED ---- */
edit('js/i18n.js', (src, rel) => {
  const start = src.indexOf('const CUR = {');
  if (start < 0) { record(rel, 'CUR table', 'FAIL', 'CUR table not found'); return src; }
  const end = src.indexOf('};', start);
  const block = src.slice(start, end + 2);
  if (/AED:\s*\{\s*symbol:\s*"[^"]*",\s*rate:\s*1\s*\}/.test(block)) {
    record(rel, 'CUR table', 'ALREADY', 'AED already the base');
    return src;
  }
  const width = Math.max(...Object.keys(CUR_AED).map((k) => k.length));
  const lines = Object.entries(CUR_AED).map(([code, v]) =>
    `    ${code}: { symbol: "${v.symbol}",${' '.repeat(width - code.length)} rate: ${v.rate} }`
  ).join(',\n');
  const rebuilt = `const CUR = {\n${lines}\n  };`;
  record(rel, 'CUR table', 'APPLIED', 'rebased onto AED (AED rate 1)');
  return src.slice(0, start) + rebuilt + src.slice(end + 2);
});

/* ---- 2. config.js: the free-shipping threshold in dirham ---- */
edit('js/config.js', (src, rel) => {
  const target = Math.round(200 * EUR_PER_AED);   // 840
  if (new RegExp(`CLOUDSKIN\\.FREESHIP\\s*=\\s*${target}\\b`).test(src)) {
    record(rel, 'FREESHIP', 'ALREADY', `already ${target}`);
    return src;
  }
  const re = /(CLOUDSKIN\.FREESHIP\s*=\s*)(\d+)(\s*;)/;
  const m = src.match(re);
  if (!m) { record(rel, 'FREESHIP', 'FAIL', 'FREESHIP assignment not found'); return src; }
  record(rel, 'FREESHIP', 'APPLIED', `${m[2]} -> ${target}`);
  let out = src.replace(re, `$1${target}$3`);
  // the surrounding comment still says the base is EUR 200
  out = out.replace(/free-shipping threshold: EUR 200 base/, 'free-shipping threshold: AED 840 base');
  out = out.replace(/CLOUDSKIN\.FREESHIP = (\d+);\s*\/\/ EUR base, the one and only threshold/,
    'CLOUDSKIN.FREESHIP = $1;                         // AED base, the one and only threshold');
  return out;
});

/* ---- 3. products.js: fallback catalog prices -> absolute AED ---- */
edit('js/products.js', (src, rel) => {
  let out = src, applied = 0, already = 0, missing = [];
  for (const [handle, price] of Object.entries(AED)) {
    // match the "price" field inside THIS product's object (handle comes first)
    const re = new RegExp(`("handle":\\s*"${handle}"[\\s\\S]{0,900}?"price":\\s*)([0-9.]+)`);
    const m = out.match(re);
    if (!m) { missing.push(handle); continue; }
    if (Number(m[2]) === price) { already++; continue; }
    out = out.replace(re, `$1${price}`);
    applied++;
  }
  if (missing.length) record(rel, 'catalog prices', 'FAIL', `handles not found: ${missing.join(', ')}`);
  else if (applied === 0) record(rel, 'catalog prices', 'ALREADY', `all ${already} already AED`);
  else record(rel, 'catalog prices', 'APPLIED', `${applied} repriced, ${already} already correct, test product left at 1`);
  if (applied > 0) {
    out = out.replace(/prices synced to client EUR sheet \+ Shopify \(2026-07-12\)/,
      'prices in AED, synced to Shopify (store base currency AED)');
  }
  return out;
});

/* ---- 4. shell.js: drop the "charged in euro" cart note (now untrue) ---- */
edit('js/shell.js', (src, rel) => {
  const re = /\s*<p class="drawer__ccynote">\$\{C\.t\("cur\.note"\)\}<\/p>/;
  if (!re.test(src)) { record(rel, 'cart currency note', 'ALREADY', 'note already removed'); return src; }
  record(rel, 'cart currency note', 'APPLIED', 'removed the stale "charged in euro" line');
  return src.replace(re, '');
});

/* ---- report ---- */
console.log(CHECK ? 'AED RE-BASE (check only, nothing written)\n' : 'AED RE-BASE applied\n');
for (const r of results) {
  console.log(`  [${r.status.padEnd(7)}] ${r.file.padEnd(16)} ${r.change.padEnd(18)} ${r.detail}`);
}
const failed = results.filter((r) => r.status === 'FAIL');
if (failed.length) { console.error(`\n${failed.length} step(s) FAILED. Nothing else was run.`); process.exitCode = 1; }
else if (!CHECK) console.log('\nNext: node scripts/deploy.mjs');
