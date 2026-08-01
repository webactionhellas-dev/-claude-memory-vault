import sharp from 'sharp'
const src = 'C:/Users/mikef/web-action-site/public/earth.png'
const out = 'C:/Users/mikef/Downloads/earth_edge_preview.png'

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H, channels: C } = info
const cx = 852, cy = 1036
const idx = (x, y) => (y * W + x) * C
const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H
const A = (x, y) => data[idx(x, y) + 3]

// 1) recompute a clean, eroded + feathered alpha along the silhouette.
//    For each opaque pixel, find how far (outward, away from center) until we
//    hit transparency. The outermost ERODE px are cut; the next FEATHER px
//    ramp back to solid — a soft limb with no dark band and no bright dashes.
const ERODE = 7, FEATHER = 7
const newA = new Uint8Array(W * H)
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const a = A(x, y)
    if (a === 0) { newA[y * W + x] = 0; continue }
    const dx = x - cx, dy = y - cy
    const len = Math.hypot(dx, dy) || 1
    const ox = dx / len, oy = dy / len
    let dOut = ERODE + FEATHER + 2
    for (let s = 1; s <= ERODE + FEATHER + 2; s++) {
      const sx = Math.round(x + ox * s), sy = Math.round(y + oy * s)
      if (!inb(sx, sy) || A(sx, sy) < 12) { dOut = s; break }
    }
    let f = (dOut - ERODE) / FEATHER
    f = f < 0 ? 0 : f > 1 ? 1 : f
    f = f * f * (3 - 2 * f) // smoothstep
    newA[y * W + x] = Math.round(a * f)
  }
}

// 2) smooth the RGB in the outer rim band so the painted dashes melt into one
//    continuous edge: replace each near-edge pixel's RGB with the average of
//    its opaque neighbours (a small box blur applied to the edge only).
const out8 = Buffer.from(data)
const R = 3
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (newA[y * W + x] === 0) continue
    // only near-edge pixels (those that got partially eroded just now)
    if (newA[y * W + x] > 245 && A(x, y) > 250) continue
    let r = 0, g = 0, b = 0, n = 0
    for (let yy = -R; yy <= R; yy++) for (let xx = -R; xx <= R; xx++) {
      const sx = x + xx, sy = y + yy
      if (inb(sx, sy) && A(sx, sy) > 200) {
        const j = idx(sx, sy); r += data[j]; g += data[j + 1]; b += data[j + 2]; n++
      }
    }
    if (n > 0) { const i = idx(x, y); out8[i] = r / n; out8[i + 1] = g / n; out8[i + 2] = b / n }
  }
}
// write back the new alpha
for (let p = 0; p < W * H; p++) out8[p * C + 3] = newA[p]

await sharp(out8, { raw: { width: W, height: H, channels: C } }).png().toFile(out)
console.log('wrote', out)
