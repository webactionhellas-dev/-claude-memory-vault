import sharp from 'sharp';
const D='C:/Users/USER/Downloads/';
const jobs=[
  ['ChatGPT Image 22 Ιουν 2026, 02_00_36 π.μ..png','public/brands/cover-new-balance.webp'],
  ['ChatGPT Image 22 Ιουν 2026, 02_12_46 π.μ..png','public/brands/cover-ugg.webp'],
  ['e8ef2a369171d0f66ef3fa936d52c412.jpg','public/brands/cover-stussy.webp'],
];
for (const [src,out] of jobs){
  await sharp(D+src).resize(640,480,{fit:'cover',position:'centre'}).webp({quality:86}).toFile(out);
  console.log('wrote',out);
}
