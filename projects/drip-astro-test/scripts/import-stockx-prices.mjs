// One-time import of StockX (or any) prices from a filled CSV into Supabase.
// Prices are site-owned now (the sync no longer overwrites them), so these stick.
//   node --env-file=.env scripts/import-stockx-prices.mjs stockx-price-template.csv            # dry run
//   node --env-file=.env scripts/import-stockx-prices.mjs stockx-price-template.csv --write     # apply
//   ... add --clear-sale to also null compare_at_price (remove strike-through "sales")
//
// Rules: skips rows flagged is_drip_exclusive = YES; skips blank stockx_price
// (keeps current price); matches products by slug. Reports matched / skipped / bad.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const file = process.argv[2];
const write = process.argv.includes('--write');
const clearSale = process.argv.includes('--clear-sale');
if (!file) {
  console.error('usage: import-stockx-prices.mjs <file.csv> [--write] [--clear-sale]');
  process.exit(1);
}

const sb = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Minimal RFC-4180-ish CSV parser: quoted fields, escaped quotes, commas, CRLF, BOM.
function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const all = parseCSV(readFileSync(file, 'utf8')).filter((r) => r.some((c) => c !== ''));
const header = all.shift().map((h) => h.trim().toLowerCase());
const iSlug = header.indexOf('slug');
const iPrice = header.indexOf('stockx_price');
const iExcl = header.indexOf('is_drip_exclusive');
if (iSlug < 0 || iPrice < 0) {
  console.error('CSV must have "slug" and "stockx_price" columns. Found:', header.join(', '));
  process.exit(1);
}

const updates = [];
let skippedExcl = 0, skippedBlank = 0, bad = 0;
for (const r of all) {
  const slug = (r[iSlug] || '').trim();
  if (!slug) continue;
  if (iExcl >= 0 && /^(yes|true|1)$/i.test((r[iExcl] || '').trim())) { skippedExcl++; continue; }
  const raw = (r[iPrice] || '').trim().replace(/[€$£,\s]/g, '');
  if (!raw) { skippedBlank++; continue; }
  const price = Number(raw);
  if (!Number.isFinite(price) || price <= 0) { bad++; console.warn('  bad price:', slug, '=', JSON.stringify(r[iPrice])); continue; }
  updates.push({ slug, price: Math.round(price * 100) / 100 });
}

console.log(`Parsed ${all.length} rows → ${updates.length} price updates.`);
console.log(`Skipped: ${skippedExcl} Drip Exclusive, ${skippedBlank} blank, ${bad} invalid.`);

if (!write) {
  console.log('\nDRY RUN — nothing written. Sample:');
  updates.slice(0, 12).forEach((u) => console.log(`  ${u.slug} → €${u.price}`));
  console.log('\nRe-run with --write to apply' + (clearSale ? ' (and --clear-sale will null compare_at_price).' : '.'));
  process.exit(0);
}

let ok = 0, fail = 0;
for (const u of updates) {
  const patch = { price: u.price };
  if (clearSale) patch.compare_at_price = null;
  const { error } = await sb.from('products').update(patch).eq('slug', u.slug);
  if (error) { fail++; console.error('  update failed:', u.slug, error.message); }
  else ok++;
}
console.log(`\nApplied ${ok} price updates${fail ? `, ${fail} failed` : ''}.` + (clearSale ? ' Cleared compare_at_price (no strike-through sales).' : ''));
