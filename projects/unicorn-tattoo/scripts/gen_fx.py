# Generates the Zeus-lightning FX assets for unicorn-tattoo:
#   public/images/fx/bolt-1..3.png  - photoreal fractal lightning (hot white
#                                     core + blue glow + fine branches),
#                                     vertical, striking downward, transparent
#   public/images/fx/cloud.png      - gray storm cloud w/ alpha, wide, made to
#                                     straddle the photo's top edge
#   scratchpad/fx_CHECK.png         - assembly preview to READ before wiring
import math
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = r"C:\Users\mikef\unicorn-tattoo\public\images\fx"
CHECK = r"C:\Users\mikef\AppData\Local\Temp\claude\C--Users-mikef\67eaeddd-0ee3-481f-8509-123812466636\scratchpad\fx_CHECK.png"

import os
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- lightning
def displaced_path(p0, p1, roughness, levels, rng):
    """Midpoint-displacement polyline between p0 and p1 (lateral jitter)."""
    pts = [np.array(p0, float), np.array(p1, float)]
    for _ in range(levels):
        nxt = [pts[0]]
        for a, b in zip(pts, pts[1:]):
            mid = (a + b) / 2
            seg = b - a
            # displace perpendicular to the segment
            perp = np.array([-seg[1], seg[0]])
            n = np.linalg.norm(perp)
            if n > 1e-6:
                perp /= n
            mid = mid + perp * rng.uniform(-1, 1) * np.linalg.norm(seg) * roughness
            nxt += [mid, b]
        pts = nxt
    return pts

def gen_bolt(seed, W=1400, H=2800):
    rng = random.Random(seed)
    core = Image.new("F", (W, H), 0.0)
    dr = ImageDraw.Draw(core)

    def draw_poly(pts, width):
        for a, b in zip(pts, pts[1:]):
            dr.line([tuple(a), tuple(b)], fill=1.0,
                    width=max(1, int(round(width))))

    # main channel: top center -> near bottom, wandering
    x0 = W * rng.uniform(0.42, 0.58)
    x1 = W * rng.uniform(0.30, 0.70)
    main = displaced_path((x0, H * 0.01), (x1, H * 0.94), 0.16, 7, rng)
    draw_poly(main, 6)

    def branch(from_pt, base_angle, length, width, depth):
        if depth <= 0 or length < H * 0.02:
            return
        ang = base_angle + rng.uniform(-0.5, 0.5)
        end = (from_pt[0] + math.sin(ang) * length,
               from_pt[1] + math.cos(ang) * length * 0.9)
        pts = displaced_path(tuple(from_pt), end, 0.22, 5, rng)
        draw_poly(pts, width)
        # sub-branches off this branch
        for _ in range(rng.randint(1, 2)):
            src = pts[rng.randint(len(pts) // 3, len(pts) - 1)]
            branch(src, ang + rng.choice([-1, 1]) * rng.uniform(0.35, 0.9),
                   length * rng.uniform(0.35, 0.6), max(1.0, width * 0.55),
                   depth - 1)

    # branches off the main channel (denser near the top half, like the ref)
    n_br = rng.randint(9, 12)
    for _ in range(n_br):
        idx = rng.randint(int(len(main) * 0.05), int(len(main) * 0.85))
        src = main[idx]
        side = rng.choice([-1, 1])
        branch(src, side * rng.uniform(0.5, 1.25),
               H * rng.uniform(0.06, 0.16), 3.2, 3)

    core_np = np.asarray(core)
    core_np = np.clip(core_np, 0, 1)
    core_img = Image.fromarray((core_np * 255).astype(np.uint8), "L")

    inner = core_img.filter(ImageFilter.GaussianBlur(6))
    outer = core_img.filter(ImageFilter.GaussianBlur(22))

    c = np.asarray(core_img, float) / 255.0
    gi = np.asarray(inner, float) / 255.0
    go = np.asarray(outer, float) / 255.0

    # composite transparent -> outer glow -> inner glow -> hot core
    rgb = np.zeros((H, W, 3), float)
    alpha = np.zeros((H, W), float)

    def over(color, a):
        nonlocal rgb, alpha
        a = np.clip(a, 0, 1)
        col = np.array(color, float) / 255.0
        rgb = col[None, None, :] * a[..., None] + rgb * (1 - a[..., None])
        alpha = a + alpha * (1 - a)

    over((45, 105, 235), np.clip(go * 2.2, 0, 1) * 0.8)   # outer blue haze
    over((120, 180, 255), np.clip(gi * 1.6, 0, 1) * 0.95)  # inner glow
    over((246, 250, 255), np.clip(c * 1.8, 0, 1))          # white-hot core

    out = np.dstack([np.clip(rgb, 0, 1) * 255,
                     np.clip(alpha, 0, 1) * 255]).astype(np.uint8)
    img = Image.fromarray(out, "RGBA").resize((W // 2, H // 2), Image.LANCZOS)
    return img

# ------------------------------------------------------------------- cloud
def value_noise(W, H, seed):
    rng = np.random.default_rng(seed)
    total = np.zeros((H, W))
    amp, amps = 1.0, 0.0
    for cells in [(3, 8), (6, 16), (12, 32), (24, 64), (48, 128), (96, 256)]:
        g = rng.random((cells[0], cells[1]))
        layer = np.asarray(
            Image.fromarray((g * 255).astype(np.uint8), "L")
                 .resize((W, H), Image.BICUBIC), float) / 255.0
        total += layer * amp
        amps += amp
        amp *= 0.55
    total /= amps
    t = total.min(), total.max()
    return (total - t[0]) / (t[1] - t[0] + 1e-9)

def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a + 1e-9), 0, 1)
    return t * t * (3 - 2 * t)

def gen_cloud(seed, W=1600, H=640):
    rng = random.Random(seed)
    noise = value_noise(W, H, seed)

    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    # lobed cumulus silhouette: one broad base + puffy blobs
    def blob(cx, cy, rx, ry):
        d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
        return np.clip(1 - d, 0, 1)

    mask = blob(W * 0.5, H * 0.55, W * 0.44, H * 0.34)
    for _ in range(9):
        mask = np.maximum(mask, blob(W * rng.uniform(0.16, 0.84),
                                     H * rng.uniform(0.30, 0.62),
                                     W * rng.uniform(0.09, 0.18),
                                     H * rng.uniform(0.16, 0.30)))
    mask = np.asarray(
        Image.fromarray((mask * 255).astype(np.uint8), "L")
             .filter(ImageFilter.GaussianBlur(26)), float) / 255.0

    field = mask * 1.05 + (noise - 0.5) * 0.62
    alpha = smoothstep(0.34, 0.78, field)

    # guarantee fully transparent borders
    fade = np.ones((H, W))
    m = int(H * 0.10)
    ramp = np.linspace(0, 1, m)
    fade[:m, :] *= ramp[:, None]
    fade[-m:, :] *= ramp[::-1][:, None]
    mw = int(W * 0.06)
    rampw = np.linspace(0, 1, mw)
    fade[:, :mw] *= rampw[None, :]
    fade[:, -mw:] *= rampw[::-1][None, :]
    alpha *= fade

    # storm-gray shading: lit tops, dark bellies, noise-broken
    t = np.clip((1 - yy / H) * 0.55 + noise * 0.55, 0, 1)
    dark = np.array([40, 44, 52], float)
    light = np.array([148, 156, 168], float)
    rgb = dark[None, None, :] + (light - dark)[None, None, :] * t[..., None]

    out = np.dstack([rgb, np.clip(alpha, 0, 1) * 255 * 0.96]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")

# ----------------------------------------------------------------- outputs
bolts = []
for i, seed in enumerate([11, 47, 83], start=1):
    b = gen_bolt(seed)
    b.save(os.path.join(OUT, f"bolt-{i}.png"))
    bolts.append(b)
    print(f"bolt-{i}.png", b.size)

cloud = gen_cloud(7)
cloud.save(os.path.join(OUT, "cloud.png"))
print("cloud.png", cloud.size)

# ------------------------------------------------------- assembly preview
CW, CH = 1500, 1400
canvas = Image.new("RGB", (CW, CH), (10, 10, 10))
d = ImageDraw.Draw(canvas)

# "photo" frame: top edge at y=330
frame_top, frame_l, frame_r = 330, 90, 780
d.rectangle([frame_l, frame_top, frame_r, CH - 40], fill=(26, 26, 28),
            outline=(70, 70, 74))

# cloud straddling the frame's top edge (center on the edge), 112% frame width
fw = frame_r - frame_l
cw = int(fw * 1.12)
cs = cloud.resize((cw, int(cw * cloud.size[1] / cloud.size[0])), Image.LANCZOS)
cx = frame_l + fw // 2 - cs.size[0] // 2
cy = frame_top - cs.size[1] // 2
tmp = Image.new("RGBA", canvas.size, (0, 0, 0, 0))

# bolt from under the cloud into the frame
bs = bolts[0]
bh = int((CH - 40 - frame_top) * 0.64)
bw = int(bh * bs.size[0] / bs.size[1])
br = bs.resize((bw, bh), Image.LANCZOS)
tmp.paste(br, (frame_l + fw // 2 - bw // 2 + 20, frame_top - int(bh * 0.04)), br)
tmp.paste(cs, (cx, cy), cs)  # cloud OVER the bolt origin
canvas = Image.alpha_composite(canvas.convert("RGBA"), tmp).convert("RGB")

# the 3 bolt variants side by side on the right
d2 = ImageDraw.Draw(canvas)
for i, b in enumerate(bolts):
    h = 620
    w = int(h * b.size[0] / b.size[1])
    x = 850 + i * 215
    canvas.paste(Image.new("RGB", (200, h), (16, 16, 18)), (x - 10, 60))
    bb = b.resize((w, h), Image.LANCZOS)
    canvas.paste(bb, (x + (180 - w) // 2, 60), bb)
    d2.text((x, 695), f"bolt-{i+1}", fill=(180, 180, 180))

# cloud alone
ca = cloud.resize((560, int(560 * cloud.size[1] / cloud.size[0])), Image.LANCZOS)
canvas.paste(Image.new("RGB", (580, ca.size[1] + 20), (16, 16, 18)), (850, 740))
canvas.paste(ca, (860, 750), ca)
d2.text((860, 760 + ca.size[1]), "cloud (on ink bg)", fill=(180, 180, 180))

canvas.save(CHECK)
print("CHECK ->", CHECK)
