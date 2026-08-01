// Stage 3: download every product image into assets/images/products/
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const manifest = JSON.parse(await readFile(new URL('./image-manifest.json', import.meta.url)));
const DEST = new URL('../assets/images/products/', import.meta.url);
await mkdir(DEST, { recursive: true });

const jobs = manifest.flatMap(m => m.files);
console.log(`Downloading ${jobs.length} images with concurrency 16...`);

let done = 0, skipped = 0, failed = 0;
const failures = [];

async function fileOk(path) {
  try { const s = await stat(path); return s.size > 1024; } catch { return false; }
}

async function download(job) {
  const out = new URL('../' + job.local, import.meta.url);
  if (await fileOk(out)) { skipped++; return; }
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(job.url, {
        headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'referer': 'https://drip.store/' },
      });
      if (!r.ok || !r.body) throw new Error('HTTP ' + r.status);
      await pipeline(Readable.fromWeb(r.body), createWriteStream(out));
      if (!(await fileOk(out))) throw new Error('too small');
      done++;
      if (done % 50 === 0) process.stdout.write(`  ...${done} downloaded\n`);
      return;
    } catch (e) {
      if (attempt === 3) { failed++; failures.push({ ...job, err: String(e.message || e) }); }
      else await new Promise(res => setTimeout(res, 600 * (attempt + 1)));
    }
  }
}

// simple concurrency pool
const CONC = 16;
let i = 0;
async function worker() { while (i < jobs.length) { const j = jobs[i++]; await download(j); } }
await Promise.all(Array.from({ length: CONC }, worker));

await writeFile(new URL('./download-failures.json', import.meta.url), JSON.stringify(failures, null, 2));
console.log(`\nDONE. downloaded=${done} skipped=${skipped} failed=${failed}`);
if (failed) console.log('first failures:', failures.slice(0, 5));
