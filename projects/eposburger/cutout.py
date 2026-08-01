import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

def cutout(src, dst, tol=42, feather=1.6, erode=1):
    im = Image.open(src).convert("RGB")
    arr = np.asarray(im).astype(np.float32)
    h, w, _ = arr.shape

    # Estimate background color from a border frame
    border = np.concatenate([
        arr[:8, :, :].reshape(-1, 3),
        arr[-8:, :, :].reshape(-1, 3),
        arr[:, :8, :].reshape(-1, 3),
        arr[:, -8:, :].reshape(-1, 3),
    ])
    bg = np.median(border, axis=0)

    # Distance from background colour
    dist = np.sqrt(((arr - bg) ** 2).sum(axis=2))
    fg = dist > tol

    # Clean: fill holes, keep largest connected component, drop specks
    fg = ndimage.binary_fill_holes(fg)
    lbl, n = ndimage.label(fg)
    if n > 0:
        sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
        keep = (np.argmax(sizes) + 1)
        fg = lbl == keep
    # erode 1px to kill pink halo, then fill holes again
    fg = ndimage.binary_erosion(fg, iterations=erode)
    fg = ndimage.binary_fill_holes(fg)

    alpha = (fg * 255).astype(np.uint8)
    alpha_img = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(feather))

    # Hard colour gate: kill any pixel still close to the pink bg, even after feather
    colour_ok = ndimage.binary_dilation(dist > tol * 0.55, iterations=2)
    gated = np.minimum(np.asarray(alpha_img), (colour_ok * 255).astype(np.uint8))

    # Final pass: keep only the largest solid blob, drop detached cast-shadow smudges
    solid = gated > 40
    lbl2, n2 = ndimage.label(solid)
    if n2 > 0:
        sizes2 = ndimage.sum(np.ones_like(lbl2), lbl2, range(1, n2 + 1))
        keep2 = np.argmax(sizes2) + 1
        biggest = ndimage.binary_dilation(lbl2 == keep2, iterations=3)
        gated = np.where(biggest, gated, 0).astype(np.uint8)
    alpha_img = Image.fromarray(gated, "L")

    # Colour decontamination: push edge colours away from pink toward interior
    out = Image.fromarray(arr.astype(np.uint8), "RGB")
    out.putalpha(alpha_img)

    # Crop to content bbox with small padding
    bbox = out.getbbox()
    if bbox:
        pad = 12
        l, t, r, b = bbox
        l = max(0, l - pad); t = max(0, t - pad)
        r = min(w, r + pad); b = min(h, b + pad)
        out = out.crop((l, t, r, b))

    out.save(dst)
    print(dst, out.size)

cutout(r"C:/Users/mikef/Downloads/house_special-gy7jtS_e.jpg",
       r"C:/Users/mikef/eposburger/assets/burger-house.png", tol=80, erode=2)
cutout(r"C:/Users/mikef/Downloads/cheeseburger-a2RMZFhl.jpg",
       r"C:/Users/mikef/eposburger/assets/burger-classic.png", tol=50, erode=1)
