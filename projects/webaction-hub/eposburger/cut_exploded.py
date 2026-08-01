# Cut out the exploded-burger studio shot (near-white bg, 10 separated pieces
# incl. WHITE ONIONS) -> true transparency. rembg/isnet keeps every piece;
# colour-distance keying would erase the white onions, so we use the model.
import os
import numpy as np
from rembg import remove, new_session
from PIL import Image, ImageEnhance, ImageFilter
from scipy import ndimage

SRC = r"C:\Users\mikef\Downloads\ChatGPT Image 17 Ιουν 2026, 03_10_46 π.μ..png"
DST = r"C:\Users\mikef\Downloads\epos-exploded"

im = Image.open(SRC).convert("RGB")
# birefnet-general keeps EVERY piece incl. the white onion cubes that isnet/u2net
# drop; post_process_mask=False so small onion cubes aren't culled as specks.
session = new_session("birefnet-general")
out = remove(im, session=session, post_process_mask=False).convert("RGBA")

# --- gentle alpha clean: drop sub-threshold fringe + a hair of feather (no erode,
#     birefnet edges are already tight and erode would nibble the onion cubes)
r, g, b, a = out.split()
am = np.asarray(a)
am = np.where(am > 10, am, 0).astype("uint8")
a = Image.fromarray(am, "L").filter(ImageFilter.GaussianBlur(0.4))

# --- mild, brand-consistent enhance on the colour channels only (keep alpha)
rgb = Image.merge("RGB", (r, g, b))
rgb = ImageEnhance.Color(rgb).enhance(1.13)
rgb = ImageEnhance.Contrast(rgb).enhance(1.07)
rgb = ImageEnhance.Brightness(rgb).enhance(1.02)
rgb = rgb.filter(ImageFilter.UnsharpMask(radius=2.2, percent=110, threshold=2))
out = Image.merge("RGBA", (*rgb.split(), a))

# --- crop to content, then size for a ~340-420px render (retina-safe)
bbox = out.getbbox()
if bbox:
    pad = 10
    l, t, rr, bb = bbox
    out = out.crop((max(0, l - pad), max(0, t - pad),
                    min(out.width, rr + pad), min(out.height, bb + pad)))
TW = 820
if out.width > TW:
    out = out.resize((TW, round(out.height * TW / out.width)), Image.LANCZOS)

out.save(DST + ".png")
out.save(DST + ".webp", "WEBP", quality=90, method=6)
print("final size", out.size)
for ext in ("png", "webp"):
    print(ext, os.path.getsize(DST + "." + ext), "bytes")
