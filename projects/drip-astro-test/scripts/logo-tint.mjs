import sharp from 'sharp';
// Turn a black-on-white logo into a transparent tiffany logo.
// alpha = how dark the pixel is; colour = tiffany.
async function tint(src, out, rgb=[0,192,182]) {
  const { data, info } = await sharp(src).flatten({background:'#ffffff'}).grayscale().raw().toBuffer({resolveWithObject:true});
  const { width:w, height:h } = info;
  const rgba = Buffer.alloc(w*h*4);
  for (let i=0;i<w*h;i++){
    const lum = data[i];                 // 0=black(logo) .. 255=white(bg)
    const a = 255 - lum;                 // dark -> opaque
    rgba[i*4]=rgb[0]; rgba[i*4+1]=rgb[1]; rgba[i*4+2]=rgb[2]; rgba[i*4+3]=a;
  }
  await sharp(rgba,{raw:{width:w,height:h,channels:4}}).trim({threshold:8}).webp({quality:92,alphaQuality:100}).toFile(out);
  console.log('wrote', out);
}
await tint('C:/Users/USER/Downloads/Salomon.jpg','public/brands/salomon.webp');
