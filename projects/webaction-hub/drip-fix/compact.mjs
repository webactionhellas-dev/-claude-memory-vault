import { readFileSync, writeFileSync } from 'fs';
const F = 'C:/Users/mikef/Downloads/drip-barbershop-optimized.html';
let h = readFileSync(F, 'utf8');
const before = Buffer.byteLength(h);

// Match: var E=[...]; (E.push(...);)* window.__EMB={...};
const block = h.match(/var E=(\[[\s\S]*?\]);((?:E\.push\([\s\S]*?\);)*)window\.__EMB=\{([^}]*)\};/);
if (!block) throw new Error('block not found');

const E = JSON.parse(block[1]);
const pushRe = /E\.push\((\"data:image\/[^"]+\")\)/g;
let p; while ((p = pushRe.exec(block[2]))) E.push(JSON.parse(p[1]));

// parse key -> old index
const map = {};
block[3].split(',').forEach(pair => {
  const m = pair.match(/"([^"]+)":E\[(\d+)\]/);
  if (m) map[m[1]] = +m[2];
});

// compact: keep only referenced entries, dedup by URL
const newArr = [];
const urlToNew = new Map();
const newMap = {};
for (const k of Object.keys(map)) {
  const url = E[map[k]];
  if (!urlToNew.has(url)) { urlToNew.set(url, newArr.length); newArr.push(url); }
  newMap[k] = urlToNew.get(url);
}

const orphans = E.length - new Set(Object.values(map)).size;
const newBlock = 'var E=[' + newArr.map(u => JSON.stringify(u)).join(',') + '];' +
  'window.__EMB={' + Object.keys(newMap).map(k => '"' + k + '":E[' + newMap[k] + ']').join(',') + '};';

h = h.replace(block[0], newBlock);
writeFileSync(F, h);
console.log('E entries:', E.length, '->', newArr.length, '(removed', E.length - newArr.length, 'orphan/dup)');
console.log('keys:', Object.keys(newMap).length);
console.log('file:', (before/1024/1024).toFixed(2), 'MB ->', (Buffer.byteLength(h)/1024/1024).toFixed(2), 'MB');
