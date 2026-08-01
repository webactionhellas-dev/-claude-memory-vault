/* ============================================================
   Web Action — Instagram launch posts generator
   Renders branded 1080×1350 (4:5) PNG slides with sharp.
   Backgrounds: SVG (cosmic black + electric-blue glow + starfield)
   Text: Pango via fontconfig (Sora / Jost) — pixel-crisp brand type
   ============================================================ */

import sharp from "sharp";
import { mkdirSync } from "fs";

const W = 1080, H = 1350, M = 96;
const OUT = "ig/out";
mkdirSync(OUT, { recursive: true });

/* ---- brand ---- */
const C = {
  brand: "#3366FF", mid: "#5B8CFF", light: "#8FB6FF", sky: "#70B5FF",
  white: "#FFFFFF", muted: "#AEB6C4", dim: "#7C8696", ink: "#000000",
};
const F = {
  black: "Sora ExtraBold ExtraBold",   // headlines
  semi: "Sora SemiBold SemiBold",      // subheads
  med: "Sora Medium",                  // medium accents
  body: "Jost",                        // body
  bodyMed: "Jost Medium Medium",       // eyebrows / labels
  bodyLight: "Jost Light Light",       // quiet captions
};

/* ---- seeded RNG so starfields are reproducible ---- */
function rng(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

function starfield(seed, n = 90) {
  const r = rng(seed); let out = "";
  for (let i = 0; i < n; i++) {
    const x = Math.round(r() * W), y = Math.round(r() * H);
    const rad = (r() * 1.6 + 0.4).toFixed(2);
    const op = (r() * 0.5 + 0.12).toFixed(2);
    out += `<circle cx="${x}" cy="${y}" r="${rad}" fill="#fff" opacity="${op}"/>`;
  }
  // a few brighter brand-tinted stars
  for (let i = 0; i < 10; i++) {
    const x = Math.round(r() * W), y = Math.round(r() * H);
    out += `<circle cx="${x}" cy="${y}" r="${(r()*1.4+1).toFixed(2)}" fill="${C.light}" opacity="${(r()*0.4+0.25).toFixed(2)}"/>`;
  }
  return out;
}

/* ---- background variants: glow position (gx,gy) by post ---- */
function bg(seed, gx, gy, accent = C.brand) {
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="g1" cx="${gx}" cy="${gy}" r="62%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.55"/>
      <stop offset="42%" stop-color="${accent}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g2" cx="${100-gx}%" cy="${gy < 50 ? 92 : 12}%" r="55%">
      <stop offset="0%" stop-color="${C.sky}" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="${C.sky}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vig" cx="50%" cy="42%" r="75%">
      <stop offset="55%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.55"/>
    </radialGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${C.brand}"/>
      <stop offset="100%" stop-color="${C.light}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#000000"/>
  <rect width="${W}" height="${H}" fill="url(#g1)"/>
  <rect width="${W}" height="${H}" fill="url(#g2)"/>
  ${starfield(seed)}
  <rect width="${W}" height="${H}" fill="url(#vig)"/>
  <rect x="40" y="40" width="${W-80}" height="${H-80}" fill="none" stroke="#ffffff" stroke-opacity="0.10" stroke-width="1"/>
</svg>`;
  return Buffer.from(svg);
}

/* ---- accent rule (gradient bar) as its own SVG ---- */
function ruleBar(w = 78, h = 5) {
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="r" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="${C.brand}"/><stop offset="100%" stop-color="${C.light}"/></linearGradient></defs><rect width="${w}" height="${h}" rx="2.5" fill="url(#r)"/></svg>`);
}

/* ---- Pango text → {buf,w,h} ---- */
async function T(markup, font, { width, align = "left", spacing = 0 } = {}) {
  const opts = { text: markup, font, rgba: true, dpi: 72, align };
  if (width) opts.width = width;
  if (spacing) opts.spacing = spacing;
  const buf = await sharp({ text: opts }).png().toBuffer();
  const m = await sharp(buf).metadata();
  return { buf, w: m.width, h: m.height };
}
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const span = (t, color, ls) => `<span foreground="${color}"${ls ? ` letter_spacing="${ls}"` : ""}>${esc(t)}</span>`;

/* drawn right-arrow (→ is missing from the font subset) */
function arrowBuf(color, h) {
  const w = 40, cy = (h / 2).toFixed(1);
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><path d="M3 ${cy} H33 M25 ${(h/2-8).toFixed(1)} L35 ${cy} L25 ${(h/2+8).toFixed(1)}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
}
async function withArrow(label, color, font, ls) {
  const t = await T(span(label, color, ls), font);
  const gap = 16, aw = 40;
  const ab = arrowBuf(color, t.h);
  const buf = await sharp({ create: { width: t.w + gap + aw, height: t.h, channels: 4, background: "#00000000" } })
    .composite([{ input: t.buf, left: 0, top: 0 }, { input: ab, left: t.w + gap, top: 0 }]).png().toBuffer();
  return { buf, w: t.w + gap + aw, h: t.h };
}

/* ---- compositing helpers ---- */
const layers = [];
const add = (el, left, top) => layers.push({ input: el.buf || el, left: Math.round(left), top: Math.round(top) });
const centerX = w => Math.round((W - w) / 2);

async function logoMark(height = 132) {
  // full WA logo (monogram + wordmark), scaled
  return sharp("ig/logo.webp").resize({ height }).png().toBuffer();
}
async function monogram(height = 60) {
  // crop the monogram (top ~72% of the logo art) for a compact corner mark
  const meta = await sharp("ig/logo.webp").metadata();
  const cropH = Math.round(meta.height * 0.72);
  const cropped = await sharp("ig/logo.webp")
    .extract({ left: 0, top: 0, width: meta.width, height: cropH })
    .toBuffer();
  return await sharp(cropped).trim().resize({ height }).png().toBuffer();
}

/* small reusable corner brand + index, returns array of layers */
async function chrome(idx, total) {
  // logo mark only — carousel index (01/05) intentionally omitted
  const out = [];
  const mono = await monogram(54);
  out.push({ input: mono, left: M, top: 78 });
  return out;
}

async function footerBrand() {
  const t = await T(span("WEBACTIONHELLAS.COM", C.muted, 5000), F.bodyMed + " 20", {});
  return { input: t.buf, left: M, top: H - M - t.h - 6 };
}

async function swipe() {
  const t = await withArrow("SWIPE", C.sky, F.bodyMed + " 20", 4000);
  return { input: t.buf, left: W - M - t.w, top: H - M - t.h - 6 };
}

/* ============================================================
   SLIDE BUILDERS
   ============================================================ */

async function render(name, base, content) {
  layers.length = 0;
  await content();
  await sharp(base).composite(layers).png().toFile(`${OUT}/${name}.png`);
  console.log("✓", name);
}

/* cover-style: big logo, title, sub, divider */
async function coverSlide(name, seed, glow, { eyebrow, title, titleSpans, sub, foot, idx, total, big }) {
  await render(name, bg(seed, glow[0], glow[1]), async () => {
    // centered stack: eyebrow → hero (logo OR title text) → sub
    const blocks = [];
    if (eyebrow) blocks.push({ ...(await T(span(eyebrow, C.sky, 5000), F.bodyMed + " 24")), gap: big ? 44 : 30 });
    if (big) {
      const lg = await logoMark(big);
      const m = await sharp(lg).metadata();
      blocks.push({ buf: lg, w: m.width, h: m.height, gap: sub ? 46 : 0 });
    } else {
      blocks.push({ ...(await T(titleSpans || span(esc(title), C.white), F.black + " 92", { width: W - M*2, align: "center" })), gap: sub ? 30 : 0 });
    }
    if (sub) blocks.push({ ...(await T(span(esc(sub), C.muted), F.body + " 32", { width: 840, align: "center", spacing: 6 })), gap: 0 });

    const totalH = blocks.reduce((a,b)=>a+b.h+b.gap,0);
    let y = Math.round((H - totalH) / 2) - 20;
    for (const b of blocks) { add(b, centerX(b.w), y); y += b.h + b.gap; }

    // divider under title area accent
    for (const l of await chrome(idx, total)) layers.push(l);
    layers.push(await footerBrand());
  });
}

/* editorial content slide: eyebrow, headline (left), body, optional list */
async function contentSlide(name, seed, glow, { idx, total, eyebrow, headSpans, body, list, cta, swipeOn }) {
  await render(name, bg(seed, glow[0], glow[1]), async () => {
    for (const l of await chrome(idx, total)) layers.push(l);
    let y = 250;
    const rb = ruleBar(); layers.push({ input: rb, left: M, top: y }); y += 34;
    const eb = await T(span(eyebrow, C.sky, 5000), F.bodyMed + " 24"); add(eb, M, y); y += eb.h + 26;
    const hd = await T(headSpans, F.black + " 66", { width: W - M*2 - 10, spacing: 2 }); add(hd, M, y); y += hd.h + 34;
    if (body) { const bd = await T(span(esc(body), C.muted), F.body + " 30", { width: W - M*2 - 20, spacing: 8 }); add(bd, M, y); y += bd.h + 36; }
    if (list) {
      for (const item of list) {
        const dot = Buffer.from(`<svg width="14" height="14" xmlns="http://www.w3.org/2000/svg"><circle cx="7" cy="7" r="5" fill="${C.brand}"/></svg>`);
        layers.push({ input: dot, left: M, top: Math.round(y + 12) });
        const li = await T(span(esc(item), C.white), F.med + " 30", { width: W - M*2 - 46 });
        add(li, M + 42, y); y += li.h + 24;
      }
    }
    if (cta) await drawCta(cta, 540);
    layers.push(await footerBrand());
  });
}

/* CTA pill (auto-fits width, draws arrow if label ends with " →") */
async function drawCta(cta, minW = 520) {
  let label = cta, arrow = false;
  if (label.endsWith(" →")) { arrow = true; label = label.slice(0, -2); }
  const ct = arrow ? await withArrow(label, C.white, F.bodyMed + " 26") : await T(span(label, C.white), F.bodyMed + " 26");
  const pad = 54, pillW = Math.max(minW, ct.w + pad * 2), pillH = 78;
  const cy = H - M - 152;
  const pill = Buffer.from(`<svg width="${pillW}" height="${pillH}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="${C.brand}"/><stop offset="100%" stop-color="${C.mid}"/></linearGradient></defs><rect width="${pillW}" height="${pillH}" rx="${pillH/2}" fill="url(#g)"/></svg>`);
  layers.push({ input: pill, left: M, top: cy });
  add(ct, M + Math.round((pillW - ct.w) / 2), cy + Math.round((pillH - ct.h) / 2));
}

/* service slide: giant index number + service + blurb */
async function serviceSlide(name, seed, glow, { idx, total, no, title, blurb, swipeOn, cta }) {
  await render(name, bg(seed, glow[0], glow[1]), async () => {
    for (const l of await chrome(idx, total)) layers.push(l);
    // giant ghost number
    const gn = await T(span(no, C.white), F.black + " 300", {});
    layers.push({ input: await sharp(gn.buf).ensureAlpha().modulate({}).composite([]).toBuffer(), left: W - gn.w - 40, top: 120, blend: "over" });
    // dim it: re-render with low opacity instead
    layers.pop();
    const gn2 = await T(`<span foreground="${C.brand}" alpha="22%">${no}</span>`, F.black + " 300", {});
    layers.push({ input: gn2.buf, left: W - gn2.w - 30, top: 110 });

    let y = 560;
    const rb = ruleBar(); layers.push({ input: rb, left: M, top: y }); y += 36;
    const lab = await T(span("SERVICE " + no, C.sky, 5000), F.bodyMed + " 24"); add(lab, M, y); y += lab.h + 24;
    const hd = await T(span(esc(title), C.white), F.black + " 76", { width: W - M*2 }); add(hd, M, y); y += hd.h + 28;
    const bd = await T(span(esc(blurb), C.muted), F.body + " 32", { width: W - M*2 - 40, spacing: 8 }); add(bd, M, y); y += bd.h;

    if (cta) await drawCta(cta, 480);
    layers.push(await footerBrand());
  });
}

/* ============================================================
   BUILD ALL
   ============================================================ */

// glow presets
const G = { topR: [78, 16], botC: [50, 92], topC: [50, 14], topL: [22, 18], midR: [86, 46] };

/* ---------- POST 1 — GET TO KNOW US ---------- */
await coverSlide("post1_1", 101, G.topR, {
  big: 240,
  titleSpans: `${span("Web ", C.white)}${span("Action", C.light)}`,
  sub: "Design · Code · Action",
  idx: 1, total: 3, foot: true,
});
await contentSlide("post1_2", 102, G.botC, {
  idx: 2, total: 3, eyebrow: "GET TO KNOW US",
  headSpans: `${span("We build websites that ", C.white)}${span("take action.", C.light)}`,
  body: "Web Action is a small Athens studio with a serious obsession for the web. No page builders. No recycled themes. Every site we make is drawn by hand, coded by hand, and built to be fast, because your brand deserves better than something a thousand others already use.",
  swipeOn: true,
});
await contentSlide("post1_3", 103, G.topL, {
  idx: 3, total: 3, eyebrow: "HOW WE WORK",
  headSpans: `${span("Three things we ", C.white)}${span("never", C.light)}${span(" compromise.", C.white)}`,
  list: ["Hand-built, never templated", "Performance as a first principle", "Clear, honest communication"],
  cta: "Follow along, we’re just getting started",
});

/* ---------- POST 2 — SERVICES ---------- */
await coverSlide("post2_1", 201, G.botC, {
  eyebrow: "WHAT WE DO",
  titleSpans: `${span("A full studio", C.white)}`,
  sub: "for everything you ship on the web.",
  idx: 1, total: 5, foot: true,
});
await serviceSlide("post2_2", 202, G.topR, { idx:2,total:5, no:"01", title:"Web Design", blurb:"Distinctive, on-brand interfaces designed pixel by pixel. Never templated.", swipeOn:true });
await serviceSlide("post2_3", 203, G.midR, { idx:3,total:5, no:"02", title:"Web Development", blurb:"Hand-coded, lightning-fast websites on a modern, maintainable stack.", swipeOn:true });
await serviceSlide("post2_4", 204, G.topL, { idx:4,total:5, no:"03", title:"Mobile Apps", blurb:"Native-feeling cross-platform apps your users will actually keep.", swipeOn:true });
await serviceSlide("post2_5", 205, G.botC, { idx:5,total:5, no:"04", title:"E-commerce", blurb:"Storefronts built to convert, from first impression to checkout.", cta:"Start a project →" });

/* ---------- POST 3 — GOAL & MISSION ---------- */
await coverSlide("post3_1", 301, G.topC, {
  eyebrow: "WHY WE EXIST",
  titleSpans: `${span("Our ", C.white)}${span("mission", C.light)}`,
  sub: "Make the web faster, bolder, and built by hand.",
  idx: 1, total: 3, foot: true,
});
await contentSlide("post3_2", 302, G.midR, {
  idx: 2, total: 3, eyebrow: "OUR GOAL",
  headSpans: `${span("Fast by principle. ", C.white)}${span("Distinctive by design. ", C.light)}${span("Honest in every conversation.", C.white)}`,
  body: "We started Web Action because too much of the web looks the same: slow, templated, forgettable. We want to change that, one brand at a time.",
  swipeOn: true,
});
await contentSlide("post3_3", 303, G.topR, {
  idx: 3, total: 3, eyebrow: "LET’S BUILD",
  headSpans: `${span("When your brand grows, ", C.white)}${span("we’ve done our job.", C.light)}`,
  body: "A startup studio, hungry, hands-on, and genuinely in love with this craft. If that’s the partner you’ve been looking for, let’s start something worth shipping.",
  cta: "Start a project →",
});

console.log("\nAll slides written to", OUT);
