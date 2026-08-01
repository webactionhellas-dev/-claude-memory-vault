import sharp from 'sharp';
const D = 'C:/Users/USER/Downloads/';
// Jordan: transparent Travis Scott cut-out -> floating cutout (overwrite jordan.webp)
await sharp(D+'_image-removebg-preview.png').trim({threshold:10}).resize(560,420,{fit:'inside'}).webp({quality:90,alphaQuality:100}).toFile('public/brands/jordan.webp');
// Full-bleed dark brand graphics -> cover images
await sharp(D+'couverture-stone-island-histoire.webp').resize(640,480,{fit:'cover',position:'centre'}).webp({quality:86}).toFile('public/brands/cover-stone-island.webp');
await sharp(D+'10858983.jpg').resize(640,480,{fit:'cover',position:'centre'}).webp({quality:86}).toFile('public/brands/cover-yeezy.webp');
await sharp(D+'c169f13648cd7af4f6ea0ca10e333d1c.jpg').resize(640,480,{fit:'cover',position:'centre'}).webp({quality:86}).toFile('public/brands/cover-fear-of-god.webp');
console.log('done: jordan cutout + stone-island/yeezy/fear-of-god covers');
