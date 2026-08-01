# Slice the exploded burger into 6 full-canvas transparent layers and compute the
# collapse offsets that re-stack them into an assembled burger (scroll progress 0).
# Each layer keeps the FULL canvas so all layers share one coordinate system:
#   progress 1 -> translateY 0 -> exact source spread (exploded)
#   progress 0 -> translateY collapseFrac -> layers tucked together (assembled)
import base64, json
import numpy as np
from PIL import Image

SRC = r"C:\Users\mikef\Downloads\epos-exploded.png"
OUT = r"C:\Users\mikef\Downloads"
im = Image.open(SRC).convert("RGBA")
W, H = im.size                      # 765 x 1484

# row-cut boundaries between the 6 logical layers (from gap midpoints) + content centers
cuts    = [0, 213, 510, 644, 948, 1268, H]
centers = [102, 359, 582, 795, 1113, 1372]   # actual ingredient centre of each layer
names   = ["topbun", "sauces", "pickles", "pattyA", "pattyB", "botbun"]
n = len(centers)

# heights of the real content per layer (for the assembled stack)
arr = np.asarray(im)[:, :, 3]
heights = []
for i in range(n):
    band = arr[cuts[i]:cuts[i+1]]
    rows = np.where((band > 20).mean(axis=1) > 0.015)[0]
    heights.append(int(rows.max() - rows.min() + 1) if len(rows) else 1)

# assembled stack: tuck consecutive layers with an overlap, centred on the canvas
OVERLAP = 46
Hasm = sum(heights) - OVERLAP * (n - 1)
top = H / 2 - Hasm / 2
a_center = []
for i in range(n):
    a_center.append(top + heights[i] / 2)
    top += heights[i] - OVERLAP

collapse = [round((a_center[i] - centers[i]) / H, 4) for i in range(n)]
print("heights ", heights)
print("collapse", collapse)

# build + save each full-canvas layer (downscaled to 700w), gather base64
TW = 700
b64 = []
pink = Image.new("RGBA", im.size, (248, 225, 232, 255))
asm  = Image.new("RGBA", im.size, (248, 225, 232, 255))   # assembled preview
exp  = Image.new("RGBA", im.size, (248, 225, 232, 255))   # exploded preview
for i in range(n):
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    box = (0, cuts[i], W, cuts[i+1])
    layer.paste(im.crop(box), box)
    # previews
    exp.alpha_composite(layer)
    dy = int(round(collapse[i] * H))
    asm.alpha_composite(layer.transform(im.size, Image.AFFINE, (1,0,0,0,1,-dy)))
    # export downscaled
    small = layer.resize((TW, round(H * TW / W)), Image.LANCZOS)
    p = OUT + r"\layer_%d_%s.webp" % (i, names[i])
    small.save(p, "WEBP", quality=88, method=6)
    b64.append(base64.b64encode(open(p, "rb").read()).decode("ascii"))

asm.convert("RGB").save(OUT + r"\preview_assembled.png")
exp.convert("RGB").save(OUT + r"\preview_exploded.png")
json.dump({"names": names, "collapse": collapse, "b64": b64},
          open(OUT + r"\layers.json", "w"))
print("sizes(b64 KB):", [round(len(x)*3/4/1024) for x in b64], "total",
      round(sum(len(x) for x in b64)*3/4/1024), "KB")
print("saved previews + layers.json")
