// Manual Shopify → Supabase catalog sync (thin CLI wrapper around the shared core).
//
//   node --env-file=.env scripts/sync-shopify.mjs            # DRY RUN (reads only)
//   node --env-file=.env scripts/sync-shopify.mjs --write    # apply
//
// The nightly automated version is src/pages/api/cron/sync-shopify.ts (Vercel Cron),
// which calls the same syncShopifyCatalog() core.
import { createClient } from '@supabase/supabase-js';
import { syncShopifyCatalog } from '../src/lib/shopify-sync.mjs';

const WRITE = process.argv.includes('--write');
const SUPA_URL = process.env.PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SECRET) { console.error('Missing PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const storeUrl = process.env.SHOPIFY_STORE_URL || 'https://drip.store';
const sb = createClient(SUPA_URL, SECRET, { auth: { persistSession: false } });

console.log(`\n${WRITE ? '✍️  WRITE' : '🔍 DRY RUN'} — syncing ${storeUrl} → Supabase\n`);
try {
  const s = await syncShopifyCatalog(sb, { storeUrl, write: WRITE, log: (m) => console.log(m) });
  console.log(`\n── result ─────────────────────────────`);
  console.log(`  Shopify products       : ${s.total}`);
  console.log(`  new (insert)           : ${s.inserted}`);
  console.log(`  existing (update)      : ${s.updated}`);
  console.log(`  removed (gone)         : ${s.removed}`);
  console.log(`  on sale                : ${s.onSale}`);
  console.log(`  have a sold-out size   : ${s.soldOut}`);
  console.log(`  price/compare changes  : ${s.changes.length}`);
  if (s.unmappedVendors.length) console.log(`  ⚠️  unmapped vendors   : ${s.unmappedVendors.join(', ')}  (add to VENDOR_MAP)`);
  for (const c of s.changes.slice(0, 8)) {
    console.log(`    ${c.slug}\n        €${c.oldP} → €${c.newP}   compare ${c.oldC ?? '—'} → ${c.newC ?? '—'}`);
  }
  console.log(WRITE ? `\n✅ Sync complete.\n` : `\nDry run only — nothing written. Re-run with --write to apply.\n`);
} catch (e) {
  console.error('\n❌ Sync failed:', e.message, '\n');
  process.exit(1);
}
