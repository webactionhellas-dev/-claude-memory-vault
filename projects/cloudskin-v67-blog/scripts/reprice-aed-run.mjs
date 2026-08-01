/* ============================================================
   CloudSkin, AED re-base step 1 of 3: reprice Shopify variants.
   ------------------------------------------------------------
   Calls the deployed reprice-aed edge function, which sets ABSOLUTE
   AED prices (round(EUR x 4.2)) on every variant of the 15 real
   products. Idempotent: running it twice sets the same numbers.

   Usage:
     node scripts/reprice-aed-run.mjs            (dry run, no writes)
     node scripts/reprice-aed-run.mjs --go       (live write)

   Order matters: run this BEFORE flipping the Shopify store currency
   EUR -> AED, because Shopify RELABELS the currency without converting
   the numbers. Reprice first, then flip.
   ============================================================ */
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jc3p6dGZscGhxc2FveWhsZXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzY3MDUsImV4cCI6MjA5NzQ1MjcwNX0.Ut28lXdx_sv8kXt5FUHc_pDx0gvDQ1rb25PSofhCsu8';
const BASE = 'https://ocszztflphqsaoyhlerx.supabase.co/functions/v1/reprice-aed';

const live = process.argv.includes('--go');
const url = live ? `${BASE}?go=REPRICE_AED` : BASE;

const res = await fetch(url, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
const text = await res.text();
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
  process.exitCode = 1;
} else {
  const j = JSON.parse(text);
  console.log(`mode: ${j.dry ? 'DRY RUN (no writes)' : 'LIVE WRITE'}`);
  console.log(`variants: ${j.variants}   updated: ${j.updated ?? 0}   failed: ${j.failed ?? 0}`);
  console.log('per product (before -> target):');
  for (const [handle, v] of Object.entries(j.byHandle || {})) {
    console.log(`  ${handle.padEnd(34)} ${String(v.before).padStart(8)} -> ${v.target}`);
  }
  if (!j.dry && j.failed > 0) process.exitCode = 1;
}
