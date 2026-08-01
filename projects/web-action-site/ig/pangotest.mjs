import sharp from 'sharp';
const T = (text, font) => sharp({ text: { text, font, rgba: true, dpi: 72, align: 'left' }}).png().toBuffer();
const a = await T('<span foreground="#FFFFFF">Web Action</span>', 'Sora ExtraBold ExtraBold 70');
const am = await sharp(a).metadata();
const b = await T('<span foreground="#70B5FF" letter_spacing="4000">DESIGN · CODE · ACTION</span>', 'Jost Medium Medium 22');
const c = await T('<span foreground="#FFFFFF">We build websites that take action.</span>', 'Sora SemiBold SemiBold 30');
const d = await T('<span foreground="#9aa3b2">Athens · Greece</span>', 'Jost 24');
await sharp({create:{width:1080,height:1080,channels:4,background:'#000000'}}).composite([
  {input:a, top:140, left:90},
  {input:b, top:140+am.height+34, left:92},
  {input:c, top:420, left:90},
  {input:d, top:520, left:90}
]).png().toFile('ig/out/_pangotest.png');
console.log('ok', am.width, am.height);
