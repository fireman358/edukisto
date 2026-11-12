#!/usr/bin/env python3
"""Génère le pack de portraits semi-réalistes via AI Horde, puis le stocke localement.

AI Horde est une file de calcul communautaire gratuite. Les images sont générées
une seule fois à la constitution du pack, puis l'application ne fait plus aucun
appel réseau : elle sert uniquement les fichiers locaux.

Usage :
    python scripts/generer-portraits-ia.py --submit
    python scripts/generer-portraits-ia.py --poll
    python scripts/generer-portraits-ia.py --all
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import random
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image

# La console Windows peut être en cp1252 ; on force UTF-8 pour les accents et
# les messages de progression, sans jamais interrompre une soumission.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

RACINE = Path(__file__).resolve().parent.parent
THEMES_DIR = RACINE / "data" / "themes"
PROMPTS_FICHIER = RACINE / "scripts" / "portraits-prompts.json"
SORTIE = RACINE / "assets" / "portraits"
ETAT_FICHIER = RACINE / "scripts" / "portraits-jobs.json"
INDEX_FICHIER = SORTIE / "index.json"
META_FICHIER = RACINE / "scripts" / "portraits-meta.json"

API = "https://aihorde.net/api/v2"
API_KEY = "0000000000"
CLIENT_AGENT = "qui-suis-je-portraits:1.0:local-build"
MODELE = "Deliberate"
TAILLE = (512, 640)
STEPS = 24
TIMEOUT_SECONDES = 3 * 60 * 60

STYLES = {
    "classique": "Photorealistic studio portrait, head and shoulders, centered, soft neutral warm-grey background, natural skin texture, everyday person, sharp focus, friendly and believable.",
    "star-wars": "Semi-realistic cinematic sci-fi portrait, head and shoulders, centered, dramatic rim lighting, dark starfield background, richly detailed costume, sharp focus.",
    "harry-potter": "Semi-realistic cinematic fantasy portrait, head and shoulders, centered, warm candlelight, Hogwarts stone and candle bokeh background, richly detailed clothing, sharp focus.",
    "marvel": "Semi-realistic cinematic superhero portrait, head and shoulders, centered, dramatic comic-book movie lighting, high-tech or cosmic background, detailed costume, sharp focus.",
    "dc-comics": "Semi-realistic cinematic superhero portrait, head and shoulders, centered, moody graphic-novel lighting, dark city or cosmic background, detailed costume, sharp focus.",
    "seigneur-des-anneaux": "Semi-realistic epic fantasy portrait, head and shoulders, centered, painterly cinematic lighting, Middle-earth landscape background, detailed costume, sharp focus.",
    "animaux": "Photorealistic wildlife portrait, head and shoulders, centered, sharp focus, natural habitat background, detailed fur feathers or scales, professional wildlife photography.",
    "nourriture": "Professional food photography, centered vertical composition, rustic table, warm dramatic light, shallow depth of field, highly detailed, appetizing.",
}

NEGATIFS = {
    "classique": "text, watermark, logo, frame, cartoon, anime, illustration, painting, low quality, blurry, extra people, deformed face, collage, contact sheet, celebrity",
    "star-wars": "text, watermark, logo, frame, cartoon, anime, illustration, low quality, blurry, extra people, deformed face, collage, contact sheet",
    "harry-potter": "text, watermark, logo, frame, cartoon, anime, low quality, blurry, extra people, deformed face, collage, contact sheet",
    "marvel": "text, watermark, logo, frame, cartoon, low quality, blurry, extra people, deformed face, collage, contact sheet",
    "dc-comics": "text, watermark, logo, frame, cartoon, low quality, blurry, extra people, deformed face, collage, contact sheet",
    "seigneur-des-anneaux": "text, watermark, logo, frame, cartoon, anime, low quality, blurry, extra people, deformed face, collage, contact sheet",
    "animaux": "text, watermark, logo, people, cartoon, illustration, painting, low quality, blurry, extra animals, collage, contact sheet",
    "nourriture": "text, watermark, logo, people, hands, cutlery, cartoon, illustration, low quality, blurry, collage, contact sheet",
}

HEADERS = {
    "apikey": API_KEY,
    "Client-Agent": CLIENT_AGENT,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
    "Content-Type": "application/json",
}


def charger_json(fichier: Path):
    return json.loads(fichier.read_text(encoding="utf-8"))


def charger_themes():
    index = charger_json(THEMES_DIR / "index.json")
    themes = {}
    for entree in index["themes"]:
        themes[entree["id"]] = charger_json(RACINE / entree["fichier"])
    return themes


def seed_pour(theme_id: str, pers_id: str) -> int:
    digest = hashlib.sha1(f"{theme_id}:{pers_id}".encode()).hexdigest()
    return int(digest[:8], 16) % 2147483647


def requete_json(methode: str, chemin: str, corps=None, timeout=40):
    data = None if corps is None else json.dumps(corps).encode("utf-8")
    req = urllib.request.Request(API + chemin, data=data, headers=HEADERS, method=methode)
    with urllib.request.urlopen(req, timeout=timeout) as reponse:
        return json.loads(reponse.read().decode("utf-8"))


def prompt_complet(theme_id: str, description: str) -> str:
    return f"{STYLES[theme_id]} {description}. No text, no watermark, no logo, no frame."


def construire_taches():
    themes = charger_themes()
    descriptions = charger_json(PROMPTS_FICHIER)
    taches = []
    for theme_id, theme in themes.items():
        for pers in theme["personnages"]:
            description = descriptions.get(theme_id, {}).get(pers["id"])
            if not description:
                raise RuntimeError(f"Prompt manquant : {theme_id}/{pers['id']}")
            taches.append({
                "theme": theme_id,
                "id": pers["id"],
                "nom": pers["nom"],
                "description": description,
                "prompt": prompt_complet(theme_id, description),
                "negative_prompt": NEGATIFS[theme_id],
                "seed": seed_pour(theme_id, pers["id"]),
                "fichier": str((SORTIE / theme_id / f"{pers['id']}.jpg").relative_to(RACINE)),
            })
    return taches


def charger_etat():
    if ETAT_FICHIER.exists():
        return charger_json(ETAT_FICHIER)
    return {"jobs": {}}


def sauver_etat(etat):
    ETAT_FICHIER.write_text(json.dumps(etat, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def image_existe(tache):
    return (RACINE / tache["fichier"]).exists()


def soumettre(tache):
    corps = {
        "prompt": tache["prompt"],
        "params": {
            "width": TAILLE[0],
            "height": TAILLE[1],
            "steps": STEPS,
            "cfg_scale": 7,
            "sampler_name": "k_euler",
            "n": 1,
            "seed": str(tache["seed"]),
            "karras": True,
        },
        "negative_prompt": tache["negative_prompt"],
        "models": [MODELE],
        "r2": True,
        "nsfw": False,
        "trusted_workers": False,
        "slow_workers": True,
    }
    return requete_json("POST", "/generate/async", corps)


def soumettre_une(tache):
    """Soumet une tâche avec quelques tentatives, utilisable en parallèle."""
    cle = f"{tache['theme']}/{tache['id']}"
    for tentative in range(4):
        try:
            reponse = soumettre(tache)
            return tache, reponse, tentative + 1
        except urllib.error.HTTPError as erreur:
            details = ""
            try:
                details = erreur.read().decode("utf-8")
            except Exception:
                pass
            print(f"Erreur HTTP {erreur.code} pour {cle} : {details}")
            if erreur.code in (429, 503):
                time.sleep(2.5 + tentative * 2.5)
            else:
                time.sleep(4 + tentative * 4)
        except Exception as erreur:
            print(f"Erreur de soumission pour {cle} : {erreur}")
            time.sleep(4 + tentative * 4)
    return tache, None, 4


def soumettre_tout(taches, etat):
    a_soumettre = [t for t in taches if not image_existe(t) and t["theme"] + "/" + t["id"] not in etat["jobs"]]
    print(f"À soumettre : {len(a_soumettre)} / {len(taches)}")
    erreurs = 0
    traites = 0
    # Quatre soumissions concurrentes : la file accepte ce débit et cela évite
    # de passer plusieurs dizaines de minutes uniquement en appels HTTP.
    with ThreadPoolExecutor(max_workers=2) as executeur:
        futurs = {executeur.submit(soumettre_une, tache): tache for tache in a_soumettre}
        for futur in as_completed(futurs):
            tache, reponse, tentatives = futur.result()
            traites += 1
            if reponse is None:
                erreurs += 1
                print(f"[{traites}/{len(a_soumettre)}] ÉCHEC {tache['theme']}/{tache['id']}")
                continue
            cle = f"{tache['theme']}/{tache['id']}"
            etat["jobs"][cle] = {
                **tache,
                "job_id": reponse["id"],
                "kudos": reponse.get("kudos"),
                "soumis": True,
                "termine": False,
                "echec": False,
                "tentatives": tentatives,
            }
            sauver_etat(etat)
            print(f"[{traites}/{len(a_soumettre)}] soumis {cle} -> {reponse['id']}")
    print(f"Soumissions terminées, échecs : {erreurs}")


def telecharger_image(url, destination: Path):
    req = urllib.request.Request(url, headers={"User-Agent": HEADERS["User-Agent"]})
    with urllib.request.urlopen(req, timeout=90) as reponse:
        data = reponse.read()
    image = Image.open(io.BytesIO(data)).convert("RGB")
    # On conserve le cadrage 4:5 fourni par la génération ; redimensionnement
    # léger uniquement si le service a renvoyé une autre taille.
    if image.size != TAILLE:
        image = image.resize(TAILLE, Image.Resampling.LANCZOS)
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, "JPEG", quality=84, optimize=True, progressive=True)
    return destination.stat().st_size


def verifier_jobs(etat, taches):
    tous = []
    for cle, job in etat["jobs"].items():
        if job.get("termine") or job.get("echec"):
            continue
        try:
            check = requete_json("GET", f"/generate/check/{job['job_id']}")
            if check.get("done"):
                status = requete_json("GET", f"/generate/status/{job['job_id']}")
                generations = status.get("generations") or []
                if not generations:
                    job["echec"] = True
                    print(f"ÉCHEC {cle} : aucune génération")
                else:
                    generation = generations[0]
                    destination = RACINE / job["fichier"]
                    taille = telecharger_image(generation["img"], destination)
                    job["termine"] = True
                    job["image_seed"] = generation.get("seed")
                    job["modele_image"] = generation.get("model")
                    job["taille_octets"] = taille
                    print(f"OK {cle} ({taille // 1024} Ko)")
            elif check.get("faulted"):
                job["echec"] = True
                print(f"ÉCHEC {cle} : job faulted")
            else:
                tous.append((cle, check.get("queue_position"), check.get("wait_time")))
        except Exception as erreur:
            print(f"Erreur de vérification {cle} : {erreur}")
            tous.append((cle, None, None))
    sauver_etat(etat)
    return tous


def poll(etat, taches):
    debut = time.time()
    while time.time() - debut < TIMEOUT_SECONDES:
        restants = verifier_jobs(etat, taches)
        if not restants:
            break
        positions = [r[1] for r in restants if isinstance(r[1], int)]
        attentes = [r[2] for r in restants if isinstance(r[2], int)]
        print(
            f"En attente : {len(restants)} · "
            f"queue min/moy {min(positions) if positions else '?'}/"
            f"{round(sum(positions) / len(positions)) if positions else '?'} · "
            f"ETA max {max(attentes) if attentes else '?'} s"
        )
        time.sleep(30)
    # Deuxième passe pour récupérer les jobs terminés pendant la dernière boucle.
    verifier_jobs(etat, taches)
    manquants = [t for t in taches if not (RACINE / t["fichier"]).exists()]
    print(f"Terminés : {len(taches) - len(manquants)} / {len(taches)}")
    if manquants:
        print("Manquants :", ", ".join(f"{t['theme']}/{t['id']}" for t in manquants[:20]))
    return manquants


def ecrire_index_et_meta(taches, etat):
    fichiers = [t["fichier"].replace("\\", "/") for t in taches if (RACINE / t["fichier"]).exists()]
    INDEX_FICHIER.write_text(
        json.dumps({"version": 1, "fichiers": fichiers}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    meta = {
        "generateur": "AI Horde",
        "modele": MODELE,
        "client": CLIENT_AGENT,
        "largeur": TAILLE[0],
        "hauteur": TAILLE[1],
        "steps": STEPS,
        "portraits": [
            {
                "theme": t["theme"],
                "id": t["id"],
                "nom": t["nom"],
                "prompt": t["prompt"],
                "negative_prompt": t["negative_prompt"],
                "seed": t["seed"],
                "fichier": t["fichier"],
            }
            for t in taches
            if (RACINE / t["fichier"]).exists()
        ],
    }
    META_FICHIER.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Index : {len(fichiers)} fichiers · métadonnées : {META_FICHIER.name}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--submit", action="store_true")
    parser.add_argument("--poll", action="store_true")
    parser.add_argument("--all", action="store_true")
    args = parser.parse_args()
    if not (args.submit or args.poll or args.all):
        parser.error("Utilise --submit, --poll ou --all")

    SORTIE.mkdir(parents=True, exist_ok=True)
    taches = construire_taches()
    etat = charger_etat()
    if args.submit or args.all:
        soumettre_tout(taches, etat)
    if args.poll or args.all:
        poll(etat, taches)
        ecrire_index_et_meta(taches, etat)
    else:
        sauver_etat(etat)


if __name__ == "__main__":
    main()
