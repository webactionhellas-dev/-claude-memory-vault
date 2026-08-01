import fs from 'fs'
import path from 'path'

// NOTE: 'dist/' is stuck locked by Windows (rm/rebuild both fail with EPERM /
// "Device or resource busy" on dist/assets, even after stopping every preview
// server — no process shows an open handle on it either). 'dist_new/' is a
// fresh, unlocked output directory; rebuild into it with:
//   npx vite build --outDir dist_new
const dist = 'C:/Users/mikef/web-action-site/dist_new'
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')

// inline CSS
html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (m, href) => {
  const css = fs.readFileSync(path.join(dist, href.replace(/^\//, '')), 'utf8')
  return `<style>${css}</style>`
})

// inline JS module bundle — pull it out of <head> and place it at the end of
// <body>, since an *inline* module script (unlike one with src=) runs the
// instant the parser hits it, before <div id="root"> exists, so the app
// mounts to nothing and the page stays solid black.
let inlinedScript = ''
html = html.replace(/<script[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>\n?/, (m, src) => {
  const js = fs.readFileSync(path.join(dist, src.replace(/^\//, '')), 'utf8')
  inlinedScript = `<script type="module">\n${js}\n</script>`
  return ''
})
// use a replacement function — a replacement string would treat literal `$&`,
// $`, $' sequences inside the (huge, minified) bundle as special patterns and
// splice in copies of the surrounding html, bloating the output many times over
html = html.replace('</body>', () => `${inlinedScript}\n</body>`)

const mimes = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
}

const inlined = []
for (const file of fs.readdirSync(dist)) {
  const ext = path.extname(file).toLowerCase()
  if (!mimes[ext]) continue
  // keep favicons as real files (search engines/browsers need a crawlable URL,
  // not a data: URI), so leave their <link href> references untouched
  if (/^(favicon|apple-touch-icon)/i.test(file)) continue
  if (!html.includes('/' + file)) continue // only inline images actually referenced
  const data = fs.readFileSync(path.join(dist, file))
  const uri = `data:${mimes[ext]};base64,${data.toString('base64')}`
  const esc = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // query-string suffix must stop at backticks/commas/etc too — the bundle
  // embeds these URLs in template literals like `/logo.png?v=7`,Mp=`...`,
  // and an over-greedy class here eats into the following code (e.g. swallows
  // `,Mp=` and corrupts the next string), deleting bindings the app needs
  const re = new RegExp('/' + esc + '(\\?[\\w=&%.-]*)?', 'g')
  const before = html.length
  html = html.replace(re, () => uri)
  if (html.length !== before) inlined.push(file)
}

const out = 'C:/Users/mikef/Downloads/web-action.html'
fs.writeFileSync(out, html)
console.log('inlined images:', inlined.join(', '))
console.log('wrote', out)
console.log('size MB:', (Buffer.byteLength(html) / 1048576).toFixed(2))
