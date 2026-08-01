/* One-shot: apply the Stripe checkout migration to the CloudSkin Supabase project
   via the Management API. Needs ONLY a Supabase Personal Access Token - no database
   password, no dashboard, no PowerShell policy issue (runs through Node).

   1) Get a token: Supabase dashboard -> your avatar (top-right) -> Account ->
      Access Tokens -> "Generate new token" -> copy it (starts with sbp_).
   2) Run (PowerShell):
        $env:SUPABASE_ACCESS_TOKEN="sbp_...."; node scripts/stripe-migrate.mjs
      or (bash):
        SUPABASE_ACCESS_TOKEN=sbp_.... node scripts/stripe-migrate.mjs

   The migration is ADDITIVE (only new stripe_* tables); it never touches existing data. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REF = 'ocszztflphqsaoyhlerx';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) {
  console.error(
    'Missing SUPABASE_ACCESS_TOKEN.\n' +
    'Get one at: Supabase -> Account -> Access Tokens -> Generate new token.\n' +
    'Then run (PowerShell):  $env:SUPABASE_ACCESS_TOKEN="sbp_..."; node scripts/stripe-migrate.mjs'
  );
  process.exit(1);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SQL_FILE = path.join(ROOT, 'supabase', 'migrations', '20260726100000_stripe_checkout.sql');

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${body}`);
  try { return JSON.parse(body); } catch { return body; }
}

async function main() {
  let sql;
  try { sql = fs.readFileSync(SQL_FILE, 'utf8'); }
  catch (e) { console.error('Cannot read migration file: ' + SQL_FILE); process.exit(1); }

  console.log('Applying stripe_checkout migration (additive) ...');
  await query(sql);

  const rows = await query(
    "select tablename from pg_tables where schemaname='public' and tablename like 'stripe%' order by tablename;"
  );
  const names = Array.isArray(rows) ? rows.map((r) => r.tablename) : rows;
  const have = ['stripe_orders', 'stripe_order_items', 'stripe_events', 'stripe_checkout_throttle']
    .every((t) => Array.isArray(names) && names.includes(t));

  console.log('stripe_* tables now present:', names);
  if (have) {
    console.log('\nSUCCESS: all 4 tables created. Backend migration done.');
    console.log('Next: set STRIPE_SECRET_KEY (test), CHECKOUT_PRESENTMENT_MODE=adaptive, STORE_BASE_CURRENCY=eur in Supabase secrets, then tell Claude to continue.');
  } else {
    console.error('\nWARNING: not all expected tables are present. Paste this output to Claude.');
    process.exit(1);
  }
}

main().catch((e) => { console.error('MIGRATION FAILED:', e.message); process.exit(1); });
