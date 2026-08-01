import sharp from 'sharp';
const D='C:/Users/USER/Downloads/';
// Drip Exclusive tile cover (tags pile)
await sharp(D+'725781286_2570886316690310_6887921082940679204_n.jpg').resize(640,480,{fit:'cover',position:'centre'}).webp({quality:86}).toFile('public/brands/cover-drip-exclusive.webp');
// Editorial section background (AF1 + Drip Verified tag in case) — wide
await sharp(D+'726336654_1484271949615472_3517867878804711845_n.jpg').resize(1400,1000,{fit:'cover',position:'centre'}).webp({quality:84}).toFile('public/editorial-drip.webp');
console.log('done');
