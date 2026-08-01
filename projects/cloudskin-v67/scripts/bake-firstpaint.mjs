/* CloudSkin first-paint image baker (zero-swap).
   Rewrites the STATIC merchandising <img> tags in home.html + about.html so the FIRST
   painted frame is already the owner's resolved photo (from the deploy-time snapshot),
   with the saved focal (object-position) + zoom baked inline. Without this, the built-in
   placeholder src paints first and js/content.js (deferred) swaps it to the owner photo
   AFTER first paint - the "old photo shows for a beat then pops to the new one" flash on
   about hero, "Our Story" (about.ethos), collbanner, category tiles and editorial.

   Pairs with js/content-snapshot.js: because the baked src equals the snapshot/live value,
   content.js finds `el.src === v` and skips the swap entirely (it only applies the identical
   focal, a no-op), so there is no image change and no reposition after first paint.

   Reversible + idempotent: the FIRST bake records each slot's built-in src in
   data-src-default; every bake sets src = snapshot[key] || data-src-default, so clearing a
   photo in Studio restores the built-in on the next bake. Only plain <img> slots are baked;
   the home hero <picture> (mobile/desktop split, empty value) is intentionally left alone.

   Usage:  node scripts/bake-firstpaint.mjs           (writes home.html + about.html)
           node scripts/bake-firstpaint.mjs --check    (report only, do NOT write)

   Reads the snapshot from js/content-snapshot.js (which scripts/deploy.mjs re-bakes from
   live first), so a deploy bakes HTML from a snapshot that already equals production. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAP = path.join(ROOT, 'js', 'content-snapshot.js');
const CHECK = process.argv.includes('--check');
const FILES = ['home.html', 'about.html'];

function loadSnapshotMap() {
  const txt = fs.readFileSync(SNAP, 'utf8');
  const json = txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1);
  return JSON.parse(json);
}

// Escape a value for safe inclusion inside a double-quoted HTML attribute.
function attr(v) { return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }

// Rewrite a single <img ...> tag string for the given data-content-img key.
function bakeImgTag(tag, key, map, changes) {
  let out = tag;

  // 1) capture the built-in default src the first time we ever bake this slot (reversibility)
  let def = (out.match(/\sdata-src-default="([^"]*)"/) || [])[1];
  if (def == null) {
    def = (out.match(/\ssrc="([^"]*)"/) || [])[1] || '';
    out = out.replace(/<img\b/, '<img data-src-default="' + attr(def) + '"');
  }

  // 2) resolve the src: owner snapshot value wins, else the built-in default (never empty)
  const owner = map[key] != null ? String(map[key]).trim() : '';
  const url = owner || def;
  const curSrc = (out.match(/\ssrc="([^"]*)"/) || [])[1] || '';
  if (curSrc !== url) { changes.push(key + ' src -> ' + (owner ? 'owner photo' : 'built-in default')); }
  out = out.replace(/\ssrc="[^"]*"/, ' src="' + attr(url) + '"');

  // 3) focal (object-position) + zoom baked inline so first paint is framed exactly like content.js
  const pos = map[key + '.pos'] != null ? String(map[key + '.pos']).trim() : '';
  const zoom = parseFloat(map[key + '.zoom']);
  const zoomed = !isNaN(zoom) && zoom > 1.001;
  let style = '';
  if (pos) style += 'object-position:' + pos + ';';
  if (zoomed) style += '--sz:' + zoom + ';--szo:' + (pos || '50% 50%') + ';';
  // strip any style WE previously baked (only the bake adds a style attr to these slots), then re-add
  out = out.replace(/\sstyle="[^"]*"/, '');
  if (style) out = out.replace(/<img\b/, '<img style="' + attr(style) + '"');
  // manage only the vlm-zoomed class token (these slots carry no other classes)
  out = out.replace(/\sclass="vlm-zoomed"/, '');
  if (zoomed) out = out.replace(/<img\b/, '<img class="vlm-zoomed"');

  return out;
}

function bakeHtml(html, map, changes) {
  return html.replace(/<img\b[^>]*\sdata-content-img="([^"]+)"[^>]*>/g, function (tag, key) {
    return bakeImgTag(tag, key, map, changes);
  });
}

function main() {
  let map;
  try { map = loadSnapshotMap(); }
  catch (e) { console.error('BAKE FIRST-PAINT FAILED: cannot read snapshot (' + e.message + ')'); process.exitCode = 1; return; }

  let totalChanges = 0, wrote = 0;
  for (const f of FILES) {
    const p = path.join(ROOT, f);
    let html;
    try { html = fs.readFileSync(p, 'utf8'); }
    catch (e) { console.error('  skip ' + f + ': ' + e.message); continue; }
    const changes = [];
    const next = bakeHtml(html, map, changes);
    totalChanges += changes.length;
    if (next !== html) {
      if (!CHECK) { fs.writeFileSync(p, next); wrote++; }
      console.log((CHECK ? '  WOULD update ' : '  updated ') + f + ' (' + changes.length + ' slot change(s))');
      changes.forEach(function (c) { console.log('      ' + c); });
    } else {
      console.log('  ' + f + ': already baked, no change');
    }
  }
  if (CHECK) console.log('--check: ' + totalChanges + ' slot change(s) pending. Nothing written.');
  else console.log('first-paint bake done: ' + wrote + ' file(s) written.');
}

main();
