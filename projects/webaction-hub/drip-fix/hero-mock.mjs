import sharp from 'sharp';
async function halfAlpha(buf){
  const {data,info}=await sharp(buf).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let i=3;i<data.length;i+=4) data[i]=Math.round(data[i]*0.5);
  return sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer();
}
async function mock(W,H,fit,logoW,out){
  const frame = await sharp('frame-tiffany.webp').resize(W,H,{fit, background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  const frame50 = await halfAlpha(frame);
  const logo = await sharp('logo-clean.webp').resize({width:logoW}).png().toBuffer();
  const lm = await sharp(logo).metadata();
  // dark hero bg with faint radial glow
  const bg = Buffer.from(`<svg width="${W}" height="${H}"><defs><radialGradient id="g" cx="50%" cy="44%" r="62%"><stop offset="0%" stop-color="#0c1314"/><stop offset="100%" stop-color="#060708"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
  await sharp(bg).composite([
    {input:frame50, top:0, left:0},
    {input:logo, top:Math.round(H*0.5 - lm.height/2 - H*0.06), left:Math.round(W/2 - lm.width/2)}
  ]).png().toFile(out);
  console.log('wrote',out);
}
await mock(1280,800,'fill',500,'hero-mock-desktop.png');
await mock(375,812,'contain',240,'hero-mock-mobile.png');
