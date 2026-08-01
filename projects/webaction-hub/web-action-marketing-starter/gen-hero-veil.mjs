// Build-time asset generator (not shipped). Bakes the hero veil into a single
// dithered RGBA PNG so the whitewash fades with ZERO visible banding.
//
// Why an image instead of a CSS gradient:
//   * CSS linear-gradient is piecewise-linear — every colour stop is a slope
//     discontinuity that the eye enhances into a Mach-band "line".
//   * A tall fade also quantises to 8-bit steps (banding).
// Here the alpha follows a C2-continuous smootherstep curve (no slope kinks)
// and is dithered with triangular-PDF noise at ~1.3 LSB before quantising, so
// neither artefact can appear. Composited over the video it reads as one
// perfectly continuous fade.
import sharp from "sharp";

const W = 256;   // native horizontal resolution; tiled with repeat-x (crisp, no scaling)
const H = 1400;  // vertical resolution; stretched to the hero height (downscaled → safe)

// Navy top (darkens the video / hides the baked-in title) and whitewash bottom
// (blends into the bg-whisper #F8FBFD section below).
const NAVY = [15, 30, 45];
const WHITE = [248, 251, 253];
const NAVY_TOP_ALPHA = 0.3; // top darkening (hides the baked-in video title)
const NAVY_END = 0.5;       // navy has fully faded out by here
// Whitewash controls (tuned 2026-07-05). The ramp is a pure CONVEX EASE-IN
// (u^EASE), NOT an S-curve: an S-curve keeps an inflection/shoulder near the top
// of the fade that the eye reads as a faint bright "line" (Mach band). An ease-in
// has no interior shoulder — it accelerates monotonically, so its steepest point
// sits right at the bottom seam (white-on-white, hidden) with nothing to perceive
// as a line above it. Dim through the body, sealed to full white at the seam.
const WHITE_START = 0.66;   // white begins here (video fully visible above) — pushed lower per user
const WHITE_EASE = 2.8;     // >1 = convex ease-in; higher = dimmer body, steeper only at the very bottom

// smootherstep: 6t^5 - 15t^4 + 10t^3  (zero 1st & 2nd derivative at both ends)
const smoother = (t) => {
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return t * t * t * (t * (t * 6 - 15) + 10);
};

// LSB amplitude on alpha. Above the textbook ±1 LSB because (a) the veil
// composites over a darker video (which compresses alpha→brightness) and (b) the
// gamma back-loaded ramp is steep near the seam (~2.6 LSB/row) — ±3 comfortably
// exceeds that slope so no row-to-row step can escape the dither. Still below
// visible grain, especially in the bright dissolve zone.
const DITHER = 3.0;
// Triangular PDF noise in ~[-1,1] (difference of two uniforms) → ideal dither.
const tpdf = () => (Math.random() - Math.random());

const buf = Buffer.alloc(W * H * 4);

for (let y = 0; y < H; y++) {
  const t = y / (H - 1);

  let rgb, aFloat;
  if (t < NAVY_END) {
    // Navy fades 0.30 → 0 across the top half (smooth, gentle at both ends)
    const u = t / NAVY_END;          // 0..1
    rgb = NAVY;
    aFloat = 255 * NAVY_TOP_ALPHA * (1 - smoother(u));
  } else if (t >= WHITE_START) {
    // Whitewash: convex ease-in (no interior shoulder → no perceived line),
    // reaching full opacity only at the very bottom so the seam stays seamless.
    const u = (t - WHITE_START) / (1 - WHITE_START); // 0..1
    rgb = WHITE;
    aFloat = 255 * Math.pow(u, WHITE_EASE);
  } else {
    // Clear band between navy fade-out and whitewash start (video fully visible)
    rgb = WHITE;
    aFloat = 0;
  }

  for (let x = 0; x < W; x++) {
    let a = Math.round(aFloat + tpdf() * DITHER);
    a = a < 0 ? 0 : a > 255 ? 255 : a;
    const i = (y * W + x) * 4;
    buf[i] = rgb[0];
    buf[i + 1] = rgb[1];
    buf[i + 2] = rgb[2];
    buf[i + 3] = a;
  }
}

await sharp(buf, { raw: { width: W, height: H, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile("public/media/hero-veil.png");

console.log(`wrote public/media/hero-veil.png (${W}x${H})`);
