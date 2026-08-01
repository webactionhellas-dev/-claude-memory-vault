# Precise background knockout for hero shoes -> trimmed transparent PNGs.
import io, json, sys, urllib.request
from pathlib import Path
from rembg import remove, new_session
from PIL import Image
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parent.parent
HERO = ROOT / "assets/images/hero"
HERO.mkdir(parents=True, exist_ok=True)

slugs = json.loads(sys.argv[1]) if len(sys.argv) > 1 else []
raw = json.loads((ROOT / "scraper/raw/products.json").read_text(encoding="utf-8"))
first_src = {p["handle"]: (p["images"][0]["src"].split("?")[0] if p.get("images") else None) for p in raw}

session = new_session("u2netp")

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Referer": "https://drip.store/"})
    return Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=30).read())).convert("RGBA")

def load(slug):
    src = first_src.get(slug)
    if src:
        try:
            return fetch(src)  # master resolution
        except Exception as e:
            print("  fetch failed, using local:", e)
    # fallback to a local downloaded image
    for ext in ("jpg", "png", "webp"):
        f = ROOT / f"assets/images/products/{slug}-1.{ext}"
        if f.exists():
            return Image.open(f).convert("RGBA")
    return None

def defringe_and_trim(img):
    arr = np.array(img)  # HxWx4
    a = arr[:, :, 3]
    # erode alpha 1px to kill the thin white halo left from the white backdrop
    kernel = np.ones((3, 3), np.uint8)
    a_er = cv2.erode(a, kernel, iterations=1)
    # feather: slight blur for smooth edges
    a_er = cv2.GaussianBlur(a_er, (3, 3), 0)
    arr[:, :, 3] = a_er
    # trim to content bounding box with padding
    ys, xs = np.where(a_er > 12)
    if len(xs) == 0:
        return Image.fromarray(arr)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    pad = int(0.03 * max(x1 - x0, y1 - y0))
    x0 = max(0, x0 - pad); y0 = max(0, y0 - pad)
    x1 = min(arr.shape[1] - 1, x1 + pad); y1 = min(arr.shape[0] - 1, y1 + pad)
    return Image.fromarray(arr[y0:y1 + 1, x0:x1 + 1])

manifest = {}
for slug in slugs:
    im = load(slug)
    if im is None:
        print("MISSING:", slug); continue
    cut = remove(im, session=session, post_process_mask=True)
    out = defringe_and_trim(cut)
    # cap size for sane base64 weight
    if out.width > 1100:
        out = out.resize((1100, round(out.height * 1100 / out.width)), Image.LANCZOS)
    p = HERO / f"{slug}.png"
    out.save(p, optimize=True)
    manifest[slug] = f"assets/images/hero/{slug}.png"
    kb = p.stat().st_size // 1024
    print(f"  ok {slug}  {out.size}  {kb}KB")

(ROOT / "assets/images/hero/manifest.json").write_text(json.dumps(manifest, indent=2))
print("done:", len(manifest), "hero cutouts")
