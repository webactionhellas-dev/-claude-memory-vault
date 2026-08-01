import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
from scipy import ndimage

def enhance(im):
    im = ImageEnhance.Color(im).enhance(1.26)      # juicier saturation
    im = ImageEnhance.Contrast(im).enhance(1.13)    # punchier
    im = ImageEnhance.Brightness(im).enhance(1.035)
    im = im.filter(ImageFilter.UnsharpMask(radius=2.4, percent=135, threshold=2))  # crisp, alive
    return im

def cutout(src, dst_base, tol, erode=2, feather=1.4):
    im = Image.open(src).convert("RGB")
    im = enhance(im)
    arr = np.asarray(im).astype(np.float32)
    h, w, _ = arr.shape
    border = np.concatenate([arr[:8].reshape(-1,3), arr[-8:].reshape(-1,3),
                             arr[:,:8].reshape(-1,3), arr[:,-8:].reshape(-1,3)])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((arr - bg)**2).sum(axis=2))

    fg = dist > tol
    fg = ndimage.binary_fill_holes(fg)
    lbl, n = ndimage.label(fg)
    if n:
        sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n+1))
        fg = lbl == (np.argmax(sizes) + 1)
    fg = ndimage.binary_erosion(fg, iterations=erode)
    fg = ndimage.binary_fill_holes(fg)

    alpha = Image.fromarray((fg*255).astype("uint8"), "L").filter(ImageFilter.GaussianBlur(feather))
    colour_ok = ndimage.binary_dilation(dist > tol*0.55, iterations=2)
    g = np.minimum(np.asarray(alpha), (colour_ok*255).astype("uint8"))
    solid = g > 40
    lbl2, n2 = ndimage.label(solid)
    if n2:
        sizes2 = ndimage.sum(np.ones_like(lbl2), lbl2, range(1, n2+1))
        big = ndimage.binary_dilation(lbl2 == (np.argmax(sizes2)+1), iterations=3)
        g = np.where(big, g, 0).astype("uint8")

    out = im.convert("RGB")
    out.putalpha(Image.fromarray(g, "L"))
    bbox = out.getbbox()
    if bbox:
        pad = 8
        l, t, r, b = bbox
        out = out.crop((max(0,l-pad), max(0,t-pad), min(w,r+pad), min(h,b+pad)))
    if out.width > 760:
        rr = 760/out.width
        out = out.resize((760, int(out.height*rr)), Image.LANCZOS)
    out.save(dst_base + ".png")
    out.save(dst_base + ".webp", "WEBP", quality=92, method=6)
    print("cutout", dst_base, out.size)

cutout(r"C:/Users/mikef/Downloads/house_special-gy7jtS_e.jpg",
       r"C:/Users/mikef/eposburger/assets/burger-house", tol=80, erode=2)
cutout(r"C:/Users/mikef/Downloads/cheeseburger-a2RMZFhl.jpg",
       r"C:/Users/mikef/eposburger/assets/burger-classic", tol=52, erode=1)
