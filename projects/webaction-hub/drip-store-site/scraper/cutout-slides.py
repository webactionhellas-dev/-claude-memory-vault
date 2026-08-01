# Hero slideshow cutouts -> transparent, defringed, trimmed WebP + base64 manifest.
import io, json, sys, base64, urllib.request
from pathlib import Path
from rembg import remove, new_session
from PIL import Image
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/images/hero/slides"
OUT.mkdir(parents=True, exist_ok=True)

# curated hero line-up (colour variety, clean studio side shots)
SLUGS = [
    "jordan-1-retro-high-virgil-abloh-archive-alaska",
    "nike-kobe-4-protro-fc-barcelona-team-gold",
    "nike-sb-dunk-high-pro-iso-kentucky",
    "nike-dunk-low-laser-orange",
    "nike-kobe-6-protro-reverse-grinch",
    "adidas-yeezy-boost-350-v2-ash-pearl",
    "nike-air-max-97-black-white",
    "nike-sb-dunk-low-verdy-visty",
]

raw = json.loads((ROOT / "scraper/raw/products.json").read_text(encoding="utf-8"))
first_src = {p["handle"]: (p["images"][0]["src"].split("?")[0] if p.get("images") else None) for p in raw}
prods = {p["slug"]: p for p in json.loads((ROOT / "data/products.json").read_text(encoding="utf-8"))}

session = new_session("u2netp")

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Referer": "https://drip.store/"})
    return Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=40).read())).convert("RGBA")

def load(slug):
    src = first_src.get(slug)
    if src:
        try:
            return fetch(src)
        except Exception as e:
            print("  fetch failed, trying local:", e)
    for ext in ("jpg", "png", "webp"):
        f = ROOT / f"assets/images/products/{slug}-1.{ext}"
        if f.exists():
            return Image.open(f).convert("RGBA")
    return None

def defringe_and_trim(img):
    arr = np.array(img)
    a = arr[:, :, 3]
    kernel = np.ones((3, 3), np.uint8)
    a_er = cv2.erode(a, kernel, iterations=1)
    a_er = cv2.GaussianBlur(a_er, (3, 3), 0)
    arr[:, :, 3] = a_er
    ys, xs = np.where(a_er > 12)
    if len(xs) == 0:
        return Image.fromarray(arr)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    pad = int(0.03 * max(x1 - x0, y1 - y0))
    x0 = max(0, x0 - pad); y0 = max(0, y0 - pad)
    x1 = min(arr.shape[1] - 1, x1 + pad); y1 = min(arr.shape[0] - 1, y1 + pad)
    return Image.fromarray(arr[y0:y1 + 1, x0:x1 + 1])

manifest = []
for slug in SLUGS:
    im = load(slug)
    if im is None:
        print("MISSING:", slug); continue
    cut = remove(im, session=session, post_process_mask=True)
    out = defringe_and_trim(cut)
    if out.width > 1000:
        out = out.resize((1000, round(out.height * 1000 / out.width)), Image.LANCZOS)
    p = OUT / f"{slug}.webp"
    out.save(p, "WEBP", quality=82, method=6)
    b64 = base64.b64encode(p.read_bytes()).decode("ascii")
    pr = prods.get(slug, {})
    manifest.append({
        "slug": slug,
        "name": pr.get("name", ""),
        "brand": pr.get("brand", ""),
        "price": pr.get("price"),
        "path": f"assets/images/hero/slides/{slug}.webp",
        "img": "data:image/webp;base64," + b64,
    })
    kb = p.stat().st_size // 1024
    print(f"  ok {slug}  {out.size}  {kb}KB")

(ROOT / "scraper/showcase-b64.json").write_text(json.dumps(manifest), encoding="utf-8")
print("done:", len(manifest), "hero slide cutouts -> scraper/showcase-b64.json")
