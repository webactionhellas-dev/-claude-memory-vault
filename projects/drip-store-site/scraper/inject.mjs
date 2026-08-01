// Stage 4: inject real catalog into the template's data module (3245).
import { readFile, writeFile, copyFile } from 'node:fs/promises';

const HTML = new URL('../index.html', import.meta.url);
const html = await readFile(HTML, 'utf8');
const products = JSON.parse(await readFile(new URL('../data/products.json', import.meta.url), 'utf8'));

// 1) locate module 3245 and its prelude (export wiring)
const modStart = html.indexOf('3245:(e,a,r)=>{');
if (modStart < 0) throw new Error('module 3245 not found');
const preludeMarker = 'r.d(a,{N5:()=>d,ZE:()=>l,hT:()=>g,xZ:()=>o,yI:()=>c});';
const preludeIdx = html.indexOf(preludeMarker, modStart);
if (preludeIdx < 0) throw new Error('prelude not found');
const bodyStart = preludeIdx + preludeMarker.length;

// brace-match to find the module's closing brace
let depth = 0, modEnd = -1;
{
  const open = html.indexOf('{', modStart);
  for (let j = open; j < html.length; j++) {
    const ch = html[j];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { modEnd = j; break; } }
  }
}
if (modEnd < 0) throw new Error('module end not found');

// 2) build new module body. JSON is valid JS; harden for a classic <script>.
// (Use char-code constants to avoid embedding backslashes / separators in source.)
const BS = String.fromCharCode(92);          // backslash
const LS = String.fromCharCode(0x2028);      // line separator
const PS = String.fromCharCode(0x2029);      // paragraph separator
let arr = JSON.stringify(products);
arr = arr.split('</').join(BS + '/');        // </script can never appear
arr = arr.split(LS).join(BS + 'u2028');      // legal in JSON, was illegal in JS
arr = arr.split(PS).join(BS + 'u2029');

const newBody =
  'let l=' + arr + ',' +
  'o=l.filter(e=>e.featured),' +
  'c=l.filter(e=>e.trending),' +
  'd=l.filter(e=>e.categories.includes("new-arrivals")),' +
  'g=l.filter(e=>e.dropDate).sort((e,a)=>new Date(e.dropDate).getTime()-new Date(a.dropDate).getTime());' +
  'l.filter(e=>e.compareAtPrice),l.length';

const out = html.slice(0, bodyStart) + newBody + html.slice(modEnd);

// 3) sanity: round-trip as JS
try { new Function('"use strict";' + newBody + ';return l.length'); }
catch (e) { throw new Error('generated body is not valid JS: ' + e.message); }

await copyFile(HTML, new URL('../index.original.html', import.meta.url));
await writeFile(HTML, out);

const delta = out.length - html.length;
console.log('Injected ' + products.length + ' products into module 3245.');
console.log('module body: ' + (modEnd - bodyStart) + ' -> ' + newBody.length + ' chars (file ' + (delta >= 0 ? '+' : '') + delta + ')');
console.log('backup saved: index.original.html');
