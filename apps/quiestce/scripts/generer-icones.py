#!/usr/bin/env python3
"""Génère les icônes PWA locales de « Qui suis-je ? » sans ressource externe."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

RACINE = Path(__file__).resolve().parent.parent
ASSETS = RACINE / "assets"
ASSETS.mkdir(parents=True, exist_ok=True)

POLICES = [
    "C:/Windows/Fonts/segoeuib.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/trebucbd.ttf",
]


def charger_police(taille: int):
    for chemin in POLICES:
        if Path(chemin).exists():
            try:
                return ImageFont.truetype(chemin, taille)
            except OSError:
                pass
    return ImageFont.load_default()


def melange(a, b, t: float):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def fond_icon(taille: int) -> Image.Image:
    """Fond sombre avec halo chaud et trame discrète."""
    image = Image.new("RGBA", (taille, taille), (7, 12, 18, 255))
    pixels = image.load()
    haut = (15, 28, 40)
    bas = (5, 9, 14)
    for y in range(taille):
        couleur = melange(haut, bas, y / max(1, taille - 1))
        for x in range(taille):
            pixels[x, y] = (*couleur, 255)

    halo = Image.new("RGBA", (taille, taille), (0, 0, 0, 0))
    dessin = ImageDraw.Draw(halo)
    dessin.ellipse(
        (-taille * 0.2, -taille * 0.28, taille * 0.8, taille * 0.7),
        fill=(247, 185, 85, 46),
    )
    dessin.ellipse(
        (taille * 0.42, taille * 0.55, taille * 1.25, taille * 1.3),
        fill=(84, 214, 161, 32),
    )
    halo = halo.filter(ImageFilter.GaussianBlur(taille * 0.09))
    image = Image.alpha_composite(image, halo)

    trame = Image.new("RGBA", (taille, taille), (0, 0, 0, 0))
    d = ImageDraw.Draw(trame)
    pas = max(20, taille // 13)
    for x in range(0, taille, pas):
        d.line([(x, 0), (x, taille)], fill=(255, 255, 255, 9), width=1)
    for y in range(0, taille, pas):
        d.line([(0, y), (taille, y)], fill=(255, 255, 255, 9), width=1)
    return Image.alpha_composite(image, trame)


def carte(taille: int, couleur_haut, couleur_bas) -> Image.Image:
    """Carte arrondie remplie d'un dégradé vertical."""
    carte_img = Image.new("RGBA", (taille, taille), (0, 0, 0, 0))
    masque = Image.new("L", (taille, taille), 0)
    ImageDraw.Draw(masque).rounded_rectangle(
        (0, 0, taille - 1, taille - 1),
        radius=int(taille * 0.095),
        fill=255,
    )
    degrade = Image.new("RGBA", (taille, taille), (0, 0, 0, 0))
    p = degrade.load()
    for y in range(taille):
        couleur = melange(couleur_haut, couleur_bas, y / max(1, taille - 1))
        for x in range(taille):
            p[x, y] = (*couleur, 255)
    carte_img.paste(degrade, (0, 0), masque)
    return carte_img


def dessiner_icone(taille: int, maskable: bool = False) -> Image.Image:
    ss = 2
    t = taille * ss
    image = fond_icon(t)

    marge = t * (0.21 if maskable else 0.14)
    largeur = t - marge * 2
    hauteur = largeur * 1.27
    if hauteur > t - marge * 1.25:
        hauteur = t - marge * 1.25
        largeur = hauteur / 1.27

    # Ombre décalée de la carte.
    ombre = Image.new("RGBA", (t, t), (0, 0, 0, 0))
    do = ImageDraw.Draw(ombre)
    ox = t * 0.52
    oy = t * 0.54
    do.rounded_rectangle(
        (ox - largeur / 2 + t * 0.035, oy - hauteur / 2 + t * 0.045,
         ox + largeur / 2 + t * 0.035, oy + hauteur / 2 + t * 0.045),
        radius=largeur * 0.095,
        fill=(0, 0, 0, 150),
    )
    ombre = ombre.filter(ImageFilter.GaussianBlur(t * 0.035))
    image = Image.alpha_composite(image, ombre)

    # Tranche de la carte (effet 2.5D).
    tranche = carte(int(largeur * 0.9), (161, 104, 22), (88, 51, 8))
    tranche = tranche.resize((int(largeur), int(hauteur)), Image.Resampling.LANCZOS)
    tranche_ombre = Image.new("RGBA", (t, t), (0, 0, 0, 0))
    tranche_ombre.paste(tranche, (int(t * 0.52 - largeur / 2 + t * 0.026), int(t * 0.53 - hauteur / 2 + t * 0.032)), tranche)
    image = Image.alpha_composite(image, tranche_ombre)

    # Carte principale dorée.
    carte_img = carte(int(largeur * 1.2), (255, 214, 118), (217, 145, 35))
    carte_img = carte_img.resize((int(largeur), int(hauteur)), Image.Resampling.LANCZOS)
    angle = -6
    carte_tournee = carte_img.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)
    cx = int(t * 0.48)
    cy = int(t * 0.48)
    image.alpha_composite(carte_tournee, (cx - carte_tournee.width // 2, cy - carte_tournee.height // 2))

    # Cadre intérieur et symbole.
    cadre = Image.new("RGBA", (t, t), (0, 0, 0, 0))
    dc = ImageDraw.Draw(cadre)
    interieur = Image.new("RGBA", (int(largeur), int(hauteur)), (0, 0, 0, 0))
    di = ImageDraw.Draw(interieur)
    di.rounded_rectangle(
        (largeur * 0.055, hauteur * 0.045, largeur * 0.945, hauteur * 0.955),
        radius=largeur * 0.06,
        outline=(45, 29, 9, 72),
        width=max(1, int(t * 0.005)),
    )
    police = charger_police(int(hauteur * 0.56))
    boite = di.textbbox((0, 0), "?", font=police)
    tw = boite[2] - boite[0]
    th = boite[3] - boite[1]
    di.text(
        ((largeur - tw) / 2 - boite[0], (hauteur - th) / 2 - boite[1] - hauteur * 0.015),
        "?",
        font=police,
        fill=(36, 23, 8, 255),
    )
    interieur = interieur.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)
    cadre.alpha_composite(interieur, (cx - interieur.width // 2, cy - interieur.height // 2))
    image = Image.alpha_composite(image, cadre)

    # Petite pastille de profondeur.
    accent = Image.new("RGBA", (t, t), (0, 0, 0, 0))
    da = ImageDraw.Draw(accent)
    r = t * 0.078
    ax = t * 0.77
    ay = t * 0.77
    da.ellipse((ax - r, ay - r, ax + r, ay + r), fill=(84, 214, 161, 255))
    da.ellipse(
        (ax - r * 0.62, ay - r * 0.62, ax + r * 0.62, ay + r * 0.62),
        outline=(9, 31, 25, 150),
        width=max(1, int(t * 0.006)),
    )
    image = Image.alpha_composite(image, accent)

    return image.resize((taille, taille), Image.Resampling.LANCZOS).convert("RGB")


def principal():
    sorties = [
        ("icone-192.png", 192, False),
        ("icone-512.png", 512, False),
        ("icone-maskable-512.png", 512, True),
        ("apple-touch-icon.png", 180, True),
    ]
    for nom, taille, maskable in sorties:
        icone = dessiner_icone(taille, maskable=maskable)
        chemin = ASSETS / nom
        icone.save(chemin, "PNG", optimize=True)
        print(f"OK {chemin.relative_to(RACINE)} ({taille}x{taille})")


if __name__ == "__main__":
    principal()
