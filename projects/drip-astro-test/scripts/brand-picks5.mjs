import sharp from 'sharp';
const D='C:/Users/USER/Downloads/';
await sharp(D+'ChatGPT Image 22 Ιουν 2026, 03_23_40 π.μ..png').resize(640,480,{fit:'cover',position:'centre'}).webp({quality:86}).toFile('public/brands/cover-essentials.webp');
await sharp(D+'726349517_1006679615476521_6723348774901436583_n.jpg').resize(1400,1000,{fit:'cover',position:'centre'}).webp({quality:84}).toFile('public/about-flatlay.webp');
console.log('done');
