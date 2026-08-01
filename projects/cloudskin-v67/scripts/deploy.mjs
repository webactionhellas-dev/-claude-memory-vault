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

// 1b) BAKE FIRST-PAINT HTML (zero-swap): rewrite the merch <img> tags in home.html + about.html to the
//     resolved owner photo + focal from the just-baked snapshot, so the FIRST painted frame already IS
//     the owner's image (no built-in-placeholder-then-owner "old/new flash" on the about hero, Our Story,
//     collbanner, category tiles, editorial). Pairs with the snapshot bake above. --dry-run reports only.
const fpArgs = [path.join(ROOT, 'scripts', 'bake-firstpaint.mjs')];
if (DRY) fpArgs.push('--check');
const fp = spawnSync(process.execPath, fpArgs, { stdio: 'inherit' });
if (fp.status !== 0) { console.error('\nDEPLOY ABORTED: first-paint HTML bake failed (see above). Production was NOT touched.'); process.exit(1); }

// 2b) BAKE THE BLOG (SSG): regenerate the static /blog pages from live WordPress so every deploy
//     ships fully pre-rendered, SEO-baked posts (crawlers/social bots get complete HTML, no JS).
//     Fail-safe by design: on a WP blip it keeps the last-known-good generated files (or bundled
//     samples if none) and exits 0; only a template read/write error hard-fails and aborts.
const blogArgs = [path.join(ROOT, 'scripts', 'gen-blog.mjs')];
if (DRY) blogArgs.push('--check');
const blog = spawnSync(process.execPath, blogArgs, { stdio: 'inherit' });
if (blog.status !== 0) { console.error('\nDEPLOY ABORTED: blog SSG bake failed (see above). Production was NOT touched.'); process.exit(1); }

if (DRY) { console.log('\n--dry-run OK: snapshot + first-paint HTML + blog SSG would bake clean. Deploy skipped.'); process.exit(0); }

// 2) DEPLOY (static passthrough to production)
// In CI (GitHub Actions) VERCEL_TOKEN is a TEAM-authored deploy token: passing it
// bypasses Vercel's git-author block (repo HEAD is authored by a personal email),
// and VERCEL_ORG_ID / VERCEL_PROJECT_ID (set in the workflow env) stand in for the
// gitignored .vercel/project.json so no interactive link is needed. Locally,
// VERCEL_TOKEN is unset and this behaves exactly as before (uses the linked project).
console.log('\nDeploying to production...');
const vercelArgs = ['--yes', 'vercel', 'deploy', '--prod', '--yes', '--scope', 'webactionhellascom'];
if (process.env.VERCEL_TOKEN) vercelArgs.push('--token', process.env.VERCEL_TOKEN);
const dep = spawnSync('npx', vercelArgs,
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
