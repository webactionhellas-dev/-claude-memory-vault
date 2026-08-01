import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

def enhance_rgba(src, dst_base, sat=1.18, con=1.08, bri=1.02, sharp=115, maxw=760):
    im = Image.open(src).convert("RGBA")
    r, g, b, a = im.split()
    rgb = Image.merge("RGB", (r, g, b))
    rgb = ImageEnhance.Color(rgb).enhance(sat)
    rgb = ImageEnhance.Contrast(rgb).enhance(con)
    rgb = ImageEnhance.Brightness(rgb).enhance(bri)
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=1.8, percent=sharp, threshold=2))
    out = Image.merge("RGBA", (*rgb.split(), a))
    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)
    if out.width > maxw:
        rr = maxw / out.width
        out = out.resize((maxw, int(out.height * rr)), Image.LANCZOS)
    out.save(dst_base + ".png")
    out.save(dst_base + ".webp", "WEBP", quality=92, method=6)
    print("ok", dst_base, out.size)

# clean, professionally-masked cutouts (no pink)
enhance_rgba(r"C:/Users/mikef/Downloads/49693db5-2f67-4130-98bf-d603278572fe.png",
             r"C:/Users/mikef/eposburger/assets/burger-house")
enhance_rgba("C:/Users/mikef/Downloads/Ανώνυμο σχέδιο (2).png",
             r"C:/Users/mikef/eposburger/assets/burger-classic")
