import { readFileSync, writeFileSync } from 'fs';
const F = 'C:/Users/mikef/Downloads/drip-barbershop-optimized.html';
let h = readFileSync(F, 'utf8');

function sub(name, from, to) {
  const n = h.split(from).length - 1;
  if (n === 0) throw new Error('ANCHOR NOT FOUND: ' + name);
  if (n !== 1) throw new Error('ANCHOR NOT UNIQUE (' + n + '): ' + name);
  h = h.replace(from, to);
  console.log('OK  ' + name);
}

// ── HERO SEAM ──────────────────────────────────────────────
// Pull the hero up under the fixed nav and make it full-height so the
// scrim is continuous from y=0 (no brightness step at the nav's bottom edge).
sub('hero-seam',
  `.hero{position:relative;min-height:calc(100vh - var(--nav-h));min-height:calc(100svh - var(--nav-h));display:flex;align-items:center;overflow:hidden;background:transparent}`,
  `.hero{position:relative;margin-top:calc(-1 * var(--nav-h));min-height:100vh;min-height:100svh;display:flex;align-items:center;overflow:hidden;background:transparent}`);

// ── NAV PILL: align the clip window box with the base row ───
// width:100% resolved to the padding-box (32px too wide, shifted 16px left).
// Pin it to the content box via the 16px horizontal padding instead.
sub('pill-clip-box',
  `position:absolute;z-index:10;width:100%;overflow:hidden;`,
  `position:absolute;z-index:10;left:16px;right:16px;width:auto;overflow:hidden;`);

// ── NAV PILL: equal font-weight so hi-row text width == base-row width ─
// (base was 500, the tiffany hi-row was 600 → bolder = wider → off-center text)
sub('pill-weight',
  `font-family:var(--font-d);font-size:13px;font-weight:500;letter-spacing:.3px;white-space:nowrap;`,
  `font-family:var(--font-d);font-size:13px;font-weight:600;letter-spacing:.3px;white-space:nowrap;`);

// ── NAV PILL: exact geometry for the clip-path (no magic +16) ──
{
  const re = /var left {1,2}= btn\.offsetLeft \+ 16;[^\r\n]*\r?\n\s*var right = btn\.offsetLeft \+ btn\.offsetWidth \+ 16;\r?\n\s*var W = tabsClip\.offsetWidth;/;
  const m = h.match(re);
  if (!m) throw new Error('ANCHOR NOT FOUND: pill-geometry');
  h = h.replace(re,
`var cr = tabsClip.getBoundingClientRect();\r
    var br = btn.getBoundingClientRect();\r
    var left  = br.left - cr.left;\r
    var right = br.right - cr.left;\r
    var W = cr.width;`);
  console.log('OK  pill-geometry');
}

writeFileSync(F, h);
console.log('\nPatched ' + F);
