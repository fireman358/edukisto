"""Genere les icones PWA et l'image de partage du jeu (charte Edukisto)."""
import math
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PUB = os.path.join(ROOT, "assets", "img")
os.makedirs(PUB, exist_ok=True)

CYAN = (56, 189, 248)
GOLD = (255, 210, 63)
GOLD2 = (232, 168, 24)
BG = (5, 7, 15)


def hexrgb(c):
    return c


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def star_points(cx, cy, outer, inner, n=5, rot=-math.pi / 2):
    pts = []
    for i in range(n * 2):
        r = outer if i % 2 == 0 else inner
        a = rot + i * math.pi / n
        pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    return pts


def vertical_gradient(size, top, bottom):
    w, h = size
    img = Image.new("RGB", (1, h))
    for y in range(h):
        img.putpixel((0, y), lerp(top, bottom, y / max(1, h - 1)))
    return img.resize((w, h), Image.BILINEAR)


def radial_glow(size, center, radius, color, strength=1.0):
    w, h = size
    img = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(img)
    steps = 40
    for i in range(steps, 0, -1):
        t = i / steps
        r = radius * t
        a = int(255 * (1 - t) ** 2.2 * strength)
        d.ellipse([center[0] - r, center[1] - r, center[0] + r, center[1] + r], fill=a)
    img = img.filter(ImageFilter.GaussianBlur(radius / 15))
    col = Image.new("RGB", (w, h), color)
    return col, img


def make_icon(size):
    S = 4
    W = size * S
    base = vertical_gradient((W, W), (7, 12, 24), (3, 5, 10))
    # halo cyan
    col, mask = radial_glow((W, W), (W * 0.35, W * 0.3), W * 0.75, CYAN, 0.55)
    base = Image.composite(col, base, mask)
    # halo or
    col, mask = radial_glow((W, W), (W * 0.75, W * 0.8), W * 0.55, GOLD2, 0.35)
    base = Image.composite(col, base, mask)

    d = ImageDraw.Draw(base)

    # anneau discret
    d.ellipse([W * 0.12, W * 0.12, W * 0.88, W * 0.88], outline=(30, 52, 88), width=int(W * 0.012))

    # etoile degradee (diagonale cyan -> or)
    star = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    pts = star_points(W / 2, W * 0.51, W * 0.35, W * 0.15)
    grad = Image.new("RGB", (W, W))
    gd = ImageDraw.Draw(grad)
    for y in range(W):
        t = y / W
        gd.line([(0, y), (W, y)], fill=lerp(lerp(CYAN, (90, 210, 240), t * 0.4), GOLD, min(1, t * 1.25)))
    # diagonale : melange selon x + y
    px = grad.load()
    diag = Image.new("RGB", (W, W))
    dp = diag.load()
    for y in range(W):
        for x in range(W):
            t = (x / W * 0.35 + y / W * 0.65)
            dp[x, y] = lerp(CYAN, GOLD, min(1, max(0, (t - 0.15) / 0.75)))
    m = Image.new("L", (W, W), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    star.paste(diag, (0, 0), m)

    # ombre portee de l'etoile
    blur = star.filter(ImageFilter.GaussianBlur(W * 0.02))
    base.paste((0, 0, 0), (0, 0), blur.split()[3].point(lambda v: int(v * 0.8)))
    base.paste(star, (0, 0), star.split()[3])

    # coins arrondis
    mask = Image.new("L", (W, W), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, W - 1, W - 1], radius=int(W * 0.22), fill=255)
    out = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    out.paste(base, (0, 0), mask)
    return out.resize((size, size), Image.LANCZOS)


def find_font(names, size):
    roots = [r"C:\Windows\Fonts", os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts")]
    for root in roots:
        for n in names:
            p = os.path.join(root, n)
            if os.path.exists(p):
                try:
                    return ImageFont.truetype(p, size)
                except Exception:
                    pass
    return ImageFont.load_default()


def make_og():
    W, H = 1200, 630
    base = vertical_gradient((W, H), (10, 20, 38), (3, 5, 11))
    col, mask = radial_glow((W, H), (W * 0.2, H * 0.05), W * 0.7, (24, 58, 110), 0.9)
    base = Image.composite(col, base, mask)
    col, mask = radial_glow((W, H), (W * 0.85, H * 0.1), W * 0.45, (60, 30, 100), 0.7)
    base = Image.composite(col, base, mask)
    col, mask = radial_glow((W, H), (W * 0.5, H * 0.95), W * 0.5, (20, 70, 120), 0.5)
    base = Image.composite(col, base, mask)

    d = ImageDraw.Draw(base)
    # grille perspective
    grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    for i in range(-14, 15):
        x = W / 2 + i * 90
        gd.line([(x, H * 0.62), (W / 2 + i * 260, H)], fill=(56, 189, 248, 22), width=2)
    for j in range(1, 9):
        y = H * 0.62 + (H * 0.38) * (j / 8) ** 1.9
        gd.line([(0, y), (W, y)], fill=(56, 189, 248, 18), width=2)
    base = Image.alpha_composite(base.convert("RGBA"), grid)
    d = ImageDraw.Draw(base)

    f_title = find_font(["bahnschrift.ttf", "seguibl.ttf", "segoeuib.ttf", "arialbd.ttf"], 146)
    f_sub = find_font(["segoeuib.ttf", "seguisb.ttf", "arialbd.ttf"], 34)
    f_small = find_font(["segoeui.ttf", "arial.ttf"], 27)

    # etoile
    star = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(star)
    pts = star_points(150, 150, 86, 37)
    grad = Image.new("RGB", (W, H))
    gd = ImageDraw.Draw(grad)
    for y in range(H):
        gd.line([(0, y), (W, y)], fill=lerp((56, 189, 248), (255, 210, 63), y / H))
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    star.paste(grad, (0, 0), m)
    glow = star.filter(ImageFilter.GaussianBlur(26))
    base = Image.alpha_composite(base, glow)
    base = Image.alpha_composite(base, star)
    d = ImageDraw.Draw(base)

    d.text((286, 92), "PENDU", font=f_title, fill=(240, 248, 255))
    d.text((292, 268), "LE JEU DU PENDU EN 2.5D", font=f_sub, fill=(56, 189, 248))

    # potence stylisee a droite
    gx, gy = 1012, 302
    d.line([(gx - 120, gy + 190), (gx + 120, gy + 190)], fill=(44, 74, 122), width=9)
    d.line([(gx, gy + 190), (gx, gy - 150)], fill=(56, 90, 145), width=9)
    d.line([(gx - 120, gy - 150), (gx, gy - 150)], fill=(56, 90, 145), width=9)
    d.line([(gx - 120, gy - 150), (gx - 120, gy - 78)], fill=(255, 210, 63), width=5)
    d.ellipse([gx - 152, gy - 58, gx - 88, gy + 6], outline=(255, 210, 63), width=5)
    d.line([(gx - 120, gy + 6), (gx - 120, gy + 110)], fill=(255, 210, 63), width=5)
    d.line([(gx - 120, gy + 40), (gx - 166, gy + 92)], fill=(255, 210, 63), width=5)
    d.line([(gx - 120, gy + 40), (gx - 74, gy + 92)], fill=(255, 210, 63), width=5)
    d.line([(gx - 120, gy + 110), (gx - 158, gy + 168)], fill=(255, 210, 63), width=5)
    d.line([(gx - 120, gy + 110), (gx - 82, gy + 168)], fill=(255, 210, 63), width=5)

    # pastilles de lettres
    letters = "A B C D E F"
    x = 292
    for i, ch in enumerate(letters.split()):
        bx = x + i * 62
        by = 360
        d.rounded_rectangle([bx, by, bx + 48, by + 58], radius=10,
                            fill=(22, 35, 61), outline=(60, 98, 150), width=2)
        d.text((bx + 14, by + 12), ch, font=f_sub, fill=(230, 240, 255))

    d.text((292, 470), "8 mécaniques · 6 à 11 traits · solo ou à deux", font=f_small,
           fill=(150, 180, 215))
    d.text((292, 512), "Plus de 7 000 mots définis · analyse de difficulté", font=f_small,
           fill=(120, 150, 190))

    # pied
    d.line([(0, H - 4), (W, H - 4)], fill=(56, 189, 248), width=3)
    d.text((W - 250, H - 54), "Edukisto", font=f_sub, fill=(56, 189, 248))

    return base.convert("RGB")


if __name__ == "__main__":
    for size in (192, 512):
        icon = make_icon(size)
        icon.save(os.path.join(PUB, f"icon-{size}.png"))
        print("assets/img/icon-%d.png" % size)
    og = make_og()
    og.save(os.path.join(PUB, "og.png"), quality=92)
    print("assets/img/og.png")
    fav = make_icon(64)
    fav.save(os.path.join(ROOT, "assets", "favicon.png"))
    print("assets/favicon.png")
