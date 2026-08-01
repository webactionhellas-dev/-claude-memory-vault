import sharp from 'sharp';
const F='frame-tiffany.webp';
const W=375,H=812;
for(const fit of ['fill','cover','contain']){
  const resized = await sharp(F).resize(W,H,{fit, background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  await sharp({create:{width:W,height:H,channels:3,background:{r:8,g:9,b:10}}})
    .composite([{input:resized}]).png().toFile('phone-'+fit+'.png');
  console.log('wrote phone-'+fit+'.png');
}
