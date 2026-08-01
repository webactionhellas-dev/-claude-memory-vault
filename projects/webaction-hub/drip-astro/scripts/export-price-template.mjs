// Exports the full catalog to a CSV the owner fills with StockX prices.
// Then feed the filled file to scripts/import-stockx-prices.mjs.
//   node --env-file=.env scripts/export-price-template.mjs
//
// Columns: slug, name, brand, current_price, is_drip_exclusive, stockx_price
// Leave stockx_price blank to keep a product's current price. Drip Exclusive
// rows are flagged and skipped by the importer (they keep their own price).
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

const sb = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const rows = [];
let from = 0;
const PAGE = 1000;
for (;;) {
  const { data, error } = await sb
    .from('products')
    .select('slug,name,brand,price')
    .order('brand', { ascending: true })
    .order('name', { ascending: true })
    .range(from, from + PAGE - 1);
  if (error) { console.error(error.message); process.exit(1); }
  rows.push(...data);
  if (data.length < PAGE) break;
  from += PAGE;
}

const esc = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

const EXCLUSIVE = 'Drip Exclusive';
const header = ['slug', 'name', 'brand', 'current_price', 'is_drip_exclusive', 'stockx_price'];
const lines = [header.join(',')];
for (const r of rows) {
  const excl = r.brand === EXCLUSIVE;
  lines.push([esc(r.slug), esc(r.name), esc(r.brand), esc(r.price), excl ? 'YES' : '', ''].join(','));
}

const out = 'stockx-price-template.csv';
// BOM + CRLF so Excel / Google Sheets open it cleanly with Greek text intact.
writeFileSync(out, '﻿' + lines.join('\r\n') + '\r\n', 'utf8');
const exclCount = rows.filter((r) => r.brand === EXCLUSIVE).length;
console.log(`Wrote ${out}: ${rows.length} products (${exclCount} "${EXCLUSIVE}" flagged to skip).`);
console.log('Fill the stockx_price column, then: node --env-file=.env scripts/import-stockx-prices.mjs stockx-price-template.csv --write');
