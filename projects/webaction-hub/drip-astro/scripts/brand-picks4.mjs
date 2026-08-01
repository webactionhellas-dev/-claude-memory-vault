import sharp from 'sharp';
const D='C:/Users/USER/Downloads/';
const jobs=[
  ['nike backround.png','public/brands/cover-nike.webp'],
  ['adidas backround.png','public/brands/cover-adidas.webp'],
  ['jordan backround.png','public/brands/cover-jordan.webp'],
  ['ChatGPT Image 22 Ιουν 2026, 02_55_32 π.μ..png','public/brands/cover-asics.webp'],
];
for (const [src,out] of jobs){
  await sharp(D+src).resize(640,480,{fit:'cover',position:'centre'}).webp({quality:86}).toFile(out);
  console.log('wrote',out);
}
