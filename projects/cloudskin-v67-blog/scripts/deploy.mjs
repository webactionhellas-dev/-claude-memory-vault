/* CloudSkin production deploy - THE deploy command.
   Use this INSTEAD of a bare `vercel deploy --prod` so the content snapshot is ALWAYS
   re-baked from live first. That is what stops the "old/default photo shows for a second
   then the real one" flash: a snapshot that equals live means content.js finds no delta
   and never re-renders.

   Steps:
     1) bake js/content-snapshot.js from live cloudskin_content  (ABORTS the deploy on failure)
     2) vercel deploy --prod   (static passthrough; gate / noindex / robots / CSP unchanged)
     3) verify the SERVED snapshot deep-equals live content

   Usage:  node scripts/deploy.mjs            (bake + deploy + verify)
           node scripts/deploy.mjs --dry-run  (bake --check + report; NO write, NO deploy)

   NOTE: this guarantees the SNAPSHOT is fresh - it does NOT diff the whole bundle against
   live. For larger multi-file changes, still run the deploy-launch file-tree check first. */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry-run');

function deepEqualOk(a, b) {
  const ak = Object.keys(a), bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) { if (!(k in b) || String(a[k]) !== String(b[k])) return false; }
  return true;
}
function readCfg() {
  const cfg = fs.readFileSync(path.join(ROOT, 'js', 'supabase-config.js'), 'utf8');
  return { url: (cfg.match(/url:\s*"([^"]+)"/) || [])[1], anon: (cfg.match(/anonKey:\s*"([^"]+)"/) || [])[1] };
}

// 1) BAKE (fail-safe: abort the deploy if the snapshot cannot be freshly + correctly baked)
const bakeArgs = [path.join(ROOT, 'scripts', 'bake-content.mjs')];
if (DRY) bakeArgs.push('--check');
const bake = spawnSync(process.execPath, bakeArgs, { stdio: 'inherit' });
if (bake.status !== 0) { console.error('\nDEPLOY ABORTED: snapshot bake failed (see above). Production was NOT touched.'); process.exit(1); }

if (DRY) { console.log('\n--dry-run OK: snapshot would bake clean and equal live. Deploy skipped.'); process.exit(0); }

// 2) DEPLOY (static passthrough to production)
console.log('\nDeploying to production...');
const dep = spawnSync('npx', ['--yes', 'vercel', 'deploy', '--prod', '--yes', '--scope', 'webactionhellascom'],
  { cwd: ROOT, stdio: ['inherit', 'pipe', 'inherit'], encoding: 'utf8', shell: true });
const out = dep.stdout || '';
process.stdout.write(out);
if (dep.status !== 0) { console.error('DEPLOY FAILED (vercel exit ' + dep.status + ').'); process.exit(1); }
const id = (out.match(/dpl_[A-Za-z0-9]+/) || ['(unknown)'])[0];

// 3) VERIFY the served snapshot == live content (the no-flash guarantee, on production)
console.log('\nVerifying served snapshot == live content...');
try {
  const { url, anon } = readCfg();
  const served = await (await fetch('https://www.cloudskin.com/js/content-snapshot.js?cb=' + Date.now())).text();
  const snap = JSON.parse(served.slice(served.indexOf('{'), served.lastIndexOf('}') + 1));
  const rows = await (await fetch(url.replace(/\/$/, '') + '/rest/v1/cloudskin_content?select=key,value',
    { headers: { apikey: anon, Authorization: 'Bearer ' + anon } })).json();
  const live = {}; for (const r of rows) live[r.key] = r.value == null ? '' : String(r.value);
  const ok = deepEqualOk(snap, live);
  console.log(`deploy ${id} is LIVE. served snapshot (${Object.keys(snap).length} keys) deep-equals live: ${ok ? 'YES -> no flash' : 'NO - edge may still be propagating, re-check in ~30s'}`);
} catch (e) {
  console.log(`deploy ${id} is LIVE. (post-verify skipped: ${e.message})`);
}
console.log('rollback if needed: vercel promote <previous dpl_...> --scope webactionhellascom');
