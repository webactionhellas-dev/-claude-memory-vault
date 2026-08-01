# Download a StockX 360 spin, knock out every frame's background, register to a
# common canvas (no jitter), and emit transparent PNG frames + a base64 manifest.
import io, json, sys, urllib.request
from pathlib import Path
from rembg import remove, new_session
from PIL import Image
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/images/hero/spin"
OUT.mkdir(parents=True, exist_ok=True)

TITLE = "Air-Jordan-1-Retro-High-Off-White-White"
N = 36
def url(n): return f"https://images.stockx.com/360/{TITLE}/Images/{TITLE}/Lv2/img{n:02d}.jpg?w=1100"

def fetch(u):
    req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36", "Referer": "https://stockx.com/"})
    return Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=30).read())).convert("RGBA")

session = new_session("u2netp")
frames, alphas = [], []
print("downloading + cutting", N, "frames...")
for i in range(1, N + 1):
    im = fetch(url(i))
    cut = remove(im, session=session, post_process_mask=True)
    arr = np.array(cut)
    a = cv2.erode(arr[:, :, 3], np.ones((3, 3), np.uint8), 1)
    a = cv2.GaussianBlur(a, (3, 3), 0)
    arr[:, :, 3] = a
    frames.append(arr)
    alphas.append(a)
    if i % 6 == 0: print("  ...", i)

# common (union) bbox across all frames -> consistent registration
H, W = alphas[0].shape
mask = np.zeros((H, W), np.uint8)
for a in alphas: mask = np.maximum(mask, (a > 12).astype(np.uint8))
ys, xs = np.where(mask > 0)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
pad = int(0.04 * max(x1 - x0, y1 - y0))
x0 = max(0, x0 - pad); y0 = max(0, y0 - pad); x1 = min(W - 1, x1 + pad); y1 = min(H - 1, y1 + pad)
print(f"union bbox crop: {x1-x0}x{y1-y0} (from {W}x{H})")

import base64
b64 = []
for i, arr in enumerate(frames, 1):
    crop = Image.fromarray(arr[y0:y1 + 1, x0:x1 + 1])
    if crop.width > 720:
        crop = crop.resize((720, round(crop.height * 720 / crop.width)), Image.LANCZOS)
    p = OUT / f"img{i:02d}.webp"
    crop.save(p, format="WEBP", quality=80, method=6)
    b64.append("data:image/webp;base64," + base64.b64encode(p.read_bytes()).decode())

(ROOT / "assets/images/hero/spin/frames.json").write_text(json.dumps([f"assets/images/hero/spin/img{i:02d}.webp" for i in range(1, N + 1)]))
(ROOT / "scraper/spin-b64.json").write_text(json.dumps(b64))
total = sum((OUT / f"img{i:02d}.webp").stat().st_size for i in range(1, N + 1))
print(f"done: {N} frames, {crop.size}, total {total//1024}KB on disk, b64 ~{sum(len(x) for x in b64)//1024}KB")
