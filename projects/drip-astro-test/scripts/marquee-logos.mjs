import sharp from 'sharp';
const SRC = 'C:/Users/USER/Downloads/ChatGPT Image 22 Ιουν 2026, 05_04_16 π.μ..png';
const cells = {
  'nike':         [48, 130, 340, 270],
  'jordan':       [445, 120, 240, 290],
  'yeezy':        [658, 130, 352, 270],
  'new-balance':  [1030, 130, 218, 270],
  'adidas':       [1255, 120, 270, 290],
  'asics':        [48, 440, 345, 250],
  'ugg':          [410, 440, 255, 250],
  'essentials':   [665, 440, 345, 250],
  'stone-island': [1025, 440, 240, 270],
  'stussy':       [1268, 440, 258, 250],
  'fear-of-god':  [470, 710, 600, 150],
};
async function keyBlack(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  for (let i = 0; i < w * h; i++) {
    const luma = 0.3*data[i*c] + 0.59*data[i*c+1] + 0.11*data[i*c+2];
    data[i*c+3] = Math.max(0, Math.min(255, Math.round(luma * 2.2)));
  }
  return sharp(data, { raw: { width: w, height: h, channels: c } });
}
for (const [slug, [l, t, cw, ch]] of Object.entries(cells)) {
  const crop = await sharp(SRC).extract({ left: l, top: t, width: cw, height: ch }).png().toBuffer();
  await (await keyBlack(crop)).trim({ threshold: 12 }).webp({ quality: 92, alphaQuality: 100 }).toFile(`public/brands/logo-${slug}.webp`);
}
console.log('done');
