"""Construction du lexique du jeu du pendu.

Sources libres :
  - Lexique.org 3.83 (CC BY-SA)  -> noms communs, frequences, genre
  - Wiktionnaire francophone     -> definitions en francais, categories

Sorties :
  - data/mots.txt        un mot par ligne, MAJUSCULES, sans accents
  - data/mots.json       index complet (definition, difficulte, themes, stats)
  - assets/data.js       donnees embarquees pour le jeu (window.PENDU_DATA)

Usage :
  python tools/build_mots.py --fetch     # recupere les definitions (cache)
  python tools/build_mots.py --build     # reconstruit les fichiers de sortie
"""
import argparse
import csv
import hashlib
import json
import math
import os
import re
import sys
import threading
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RAW = os.path.join(ROOT, "data", "_raw")
OUT = os.path.join(ROOT, "data")
ASSETS = os.path.join(ROOT, "assets")
CACHE = os.path.join(RAW, "definitions.jsonl")
TSV = os.path.join(RAW, "Lexique383.tsv")

UA = "PenduEdukisto/1.0 (jeu educatif; contact: fireman358 sur GitHub)"
VOWELS = set("AEIOUY")
RANK = {"E": 10.0, "A": 9.2, "S": 8.4, "I": 7.6, "N": 6.8, "T": 6.0,
        "R": 5.2, "U": 4.4, "O": 3.6, "L": 2.8}
RARE_WEIGHT = 1.2

# --------------------------------------------------------------------------- utils


def strip_accents(s):
    s = s.replace("œ", "oe").replace("æ", "ae").replace("Œ", "OE").replace("Æ", "AE")
    return "".join(c for c in unicodedata.normalize("NFD", s)
                   if unicodedata.category(c) != "Mn")


def normalize_word(s):
    return strip_accents(s).upper().strip()


# ------------------------------------------------------------------ 1. Lexique

def lexique_candidates(min_freq=1.0):
    rows = list(csv.DictReader(open(TSV, encoding="utf-8"), delimiter="\t",
                               quoting=csv.QUOTE_NONE))
    cand = {}
    for r in rows:
        if r["cgram"] != "NOM" or r["nombre"] != "s" or r["lemme"] != r["ortho"]:
            continue
        ortho = r["ortho"].strip()
        w = normalize_word(ortho)
        if not (5 <= len(w) <= 12) or not w.isalpha() or not w.isascii():
            continue
        try:
            freq = float(r["freqlemlivres"] or 0) + float(r["freqlemfilms2"] or 0)
        except ValueError:
            continue
        if freq < min_freq:
            continue
        prev = cand.get(w)
        if prev:
            prev["freq"] = max(prev["freq"], freq)
            continue
        cand[w] = {"w": w, "ortho": ortho, "freq": freq, "genre": r["genre"]}
    return cand


# --------------------------------------------------- 2. Definitions Wiktionnaire

SEC_LANG = re.compile(r"^==\s*\{\{\s*langue\s*\|\s*fr\s*\}\}\s*==\s*$", re.M)
SEC_HEAD = re.compile(r"^(==+)\s*(.*?)\s*\1\s*$", re.M)
NOM_SECTION = re.compile(r"\{\{\s*S\s*\|\s*nom\s*\|\s*fr", re.I)

TAG_RE = re.compile(r"<ref[^>]*?/>|<ref[^>]*>.*?</ref>|<[^>]+>", re.S | re.I)
COMMENT_RE = re.compile(r"<!--.*?-->", re.S)
FILE_RE = re.compile(r"\[\[\s*(?:Fichier|Image|File)\s*:[^\]]*\]\]", re.I)


def _strip_templates(s):
    out = []
    depth = 0
    i = 0
    n = len(s)
    while i < n:
        if s.startswith("{{", i):
            depth += 1
            i += 2
            continue
        if s.startswith("}}", i) and depth:
            depth -= 1
            i += 2
            continue
        if depth == 0:
            out.append(s[i])
        i += 1
    return "".join(out)


LINK_RE = re.compile(r"\[\[([^\]\|]+)(?:\|([^\]]*))?\]\]")


def _links(s):
    def repl(m):
        target = m.group(1)
        label = m.group(2) if m.group(2) is not None else target
        if ":" in target and target.split(":", 1)[0].lower() in (
                "catégorie", "categorie", "fichier", "image", "file", "media", "média"):
            return ""
        label = label.split("#")[0]
        return label
    for _ in range(3):
        s2 = LINK_RE.sub(repl, s)
        if s2 == s:
            break
        s = s2
    return s


def clean_definition(raw):
    s = COMMENT_RE.sub(" ", raw)
    s = TAG_RE.sub(" ", s)
    s = FILE_RE.sub(" ", s)
    s = _strip_templates(s)
    s = _links(s)
    s = s.replace("'''", "").replace("''", "")
    s = s.replace("&nbsp;", " ").replace("&quot;", '"').replace("&amp;", "&")
    s = s.replace("→", "→").replace(" ", " ")
    s = re.sub(r"\[\[|\]\]", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    s = s.strip(" :;,-–—")
    # premiere phrase si trop long
    if len(s) > 150:
        cut = re.split(r"(?<=[.!?])\s+", s)
        s = cut[0] if cut and len(cut[0]) > 25 else s[:147].rsplit(" ", 1)[0] + "…"
    return s


BAD_DEF_START = re.compile(
    r"^(variante|pluriel|féminin|feminin|forme|orthographe|ancienne orthographe|"
    r"diminutif|augmentatif|synonyme|abréviation|abreviation|sigle|acronyme|"
    r"participe|conjugaison|erreur|coquille|graphie|translittération)", re.I)


def parse_page(content):
    """Retourne (definitions, categories) de la premiere section nom commun FR.

    On garde l'ordre du Wiktionnaire (sens principal d'abord) : la premiere
    definition valide est retenue, les suivantes servent de secours.
    """
    m = SEC_LANG.search(content)
    if not m:
        return [], []
    body = content[m.end():]
    # couper a la langue suivante
    nxt = re.search(r"^==\s*\{\{\s*langue\s*\|", body, re.M)
    if nxt:
        body = body[:nxt.start()]
    cats = re.findall(r"\[\[\s*Catégorie\s*:\s*([^\]\|]+)", body, re.I)
    # decouper en sections de niveau 3
    heads = list(SEC_HEAD.finditer(body))
    best = []
    for idx, h in enumerate(heads):
        level = len(h.group(1))
        title = h.group(2)
        if level != 3:
            continue
        if not NOM_SECTION.search(title):
            continue
        start = h.end()
        end = len(body)
        for h2 in heads[idx + 1:]:
            if len(h2.group(1)) <= 3:
                end = h2.start()
                break
        chunk = body[start:end]
        defs = []
        for line in chunk.splitlines():
            if re.match(r"^#\s+\S", line) and not line.startswith("##"):
                d = clean_definition(line[1:].strip())
                if d and len(d) >= 12 and not BAD_DEF_START.match(d):
                    defs.append(d)
        if defs:
            best = defs
            break
    return best, cats


class Throttle:
    """Limiteur global : une requete toutes les `interval` secondes."""

    def __init__(self, interval=0.4):
        self.interval = interval
        self.lock = threading.Lock()
        self.last = 0.0

    def wait(self):
        with self.lock:
            now = time.time()
            delta = now - self.last
            if delta < self.interval:
                time.sleep(self.interval - delta)
            self.last = time.time()


THROTTLE = Throttle(0.45)


def fetch_titles(titles, tries=5):
    params = {
        "action": "query", "format": "json", "formatversion": "2",
        "prop": "revisions", "rvprop": "content", "rvslots": "main",
        "redirects": "1", "titles": "|".join(titles),
    }
    url = "https://fr.wiktionary.org/w/api.php?" + urllib.parse.urlencode(params)
    last = None
    for attempt in range(tries):
        THROTTLE.wait()
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:  # noqa: PERF203
            last = e
            if e.code == 429:
                retry = e.headers.get("Retry-After")
                time.sleep(float(retry) if retry else 4.0 * (attempt + 1))
            else:
                time.sleep(1.5 * (attempt + 1))
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1.5 * (attempt + 1))
    print("  echec batch:", last, file=sys.stderr)
    return None


def do_fetch(cands, workers=2, chunk=50):
    done = set()
    if os.path.exists(CACHE):
        for line in open(CACHE, encoding="utf-8"):
            try:
                done.add(json.loads(line)["w"])
            except Exception:  # noqa: BLE001
                pass
    print(f"cache: {len(done)} pages deja traitees")
    todo = [c for w, c in sorted(cands.items()) if w not in done]
    print(f"a recuperer: {len(todo)}")
    chunks = [todo[i:i + chunk] for i in range(0, len(todo), chunk)]
    counter = {"n": 0, "ok": 0, "fail": 0, "miss": 0}
    fh = open(CACHE, "a", encoding="utf-8")
    fh_lock = threading.Lock()

    def work(batch):
        data = fetch_titles([c["ortho"] for c in batch])
        with fh_lock:
            counter["n"] += 1
            if data is None:
                counter["fail"] += 1
                print(f"  LOT PERDU ({len(batch)} mots)", file=sys.stderr, flush=True)
                return
            pages = data.get("query", {}).get("pages", [])
            by_title = {}
            for p in pages:
                by_title[p["title"].lower().replace("_", " ")] = p
            for c in batch:
                page = by_title.get(c["ortho"].lower())
                rec = {"w": c["w"], "def": None, "alts": [], "cats": [], "miss": True}
                if page and page.get("revisions"):
                    content = page["revisions"][0]["slots"]["main"].get("content", "")
                    defs, cats = parse_page(content)
                    if defs:
                        rec["def"] = defs[0]
                        rec["alts"] = defs[1:3]
                    rec["cats"] = cats
                    rec["miss"] = False
                if rec["def"]:
                    counter["ok"] += 1
                elif rec["miss"]:
                    counter["miss"] += 1
                fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
            fh.flush()
            if counter["n"] % 20 == 0:
                print(f"  {counter['n']}/{len(chunks)} lots - {counter['ok']} defs - "
                      f"{counter['miss']} absents - {counter['fail']} echecs", flush=True)

    with ThreadPoolExecutor(max_workers=workers) as pool:
        list(pool.map(work, chunks))
    fh.close()
    print("termine.", counter)


# ------------------------------------------------------------------ 3. Themes

THEME_RULES = [
    ("animaux", r"animal|animaux|mammif|oiseau|poisson|insect|reptil|amphibi|arachnid|"
                r"crustac|mollusqu|felin|canid|bovin|equid|rongeur|primate|cetac|rapace|"
                r"quadrupede|vertebre|invertebre|carnivore|herbivore|omnivore|bestiau|"
                r"troupeau|faune|zoolog"),
    ("nourriture", r"aliment|fruit|legume|boisson|cuisin|patisserie|fromage|viande|"
                   r"epice|condiment|dessert|soupe|pain|gateau|confiture|chocolat|"
                   r"gastronomie|nourriture|repas|recette"),
    ("metiers", r"metier|profession|artisan|ouvrier|employe|fonctionnaire|commercant|"
                r"salarie|patron|secteur (primaire|secondaire|tertiaire)"),
    ("vetements", r"vetement|chaussure|coiffure|tissu|costume|lingerie|"
                  r"couvre-chef|bijou|parure"),
    ("corps", r"anatomie|organe|corps humain|maladie|symptome|medecine|physiolog|"
              r"chirurgie|\bos\b|muscle|sang|squelette"),
    ("sports", r"sport|athletisme|football|tennis|cyclisme|natation|ski|escalade|"
               r"competition|championnat|olympique|athlete"),
    ("musique", r"musique|instrument de musique|chanson|danse|melodie|orchestre|"
                r"concert|chanteur|compositeur"),
    ("transports", r"vehicule|transport|automobile|aeronautique|ferroviaire|"
                   r"maritime|bateau|avion|train|voiture|moto|bicyclette|navire|"
                   r"motocyclisme|circulation"),
    ("maison", r"meuble|habitation|logement|outil|bricolage|ameublement|"
               r"vaisselle|ustensile|electromenager|jardinage|architecture|edifice|"
               r"vie domestique"),
    ("espace", r"astronomie|astronautique|astre|planete|etoile|galaxie|satellite|"
               r"espace|cosmos|univers|orbite|comete|nebuleuse"),
    ("ecole", r"education|ecole|enseignement|eleve|etudiant|universite|"
              r"mathematique|grammaire|linguistique|pedagogie|savoir|science"),
    ("societe", r"politique|droit|\bloi\b|justice|societe|economie|religion|histoire|"
                r"guerre|armee|militaire|monnaie|finance|banque|impot|famille|"
                r"administration|institution|citoyen"),
    ("arts", r"\bart\b|peinture|cinema|photographie|sculpture|litterature|theatre|"
             r"bande dessinee|artiste|tableau|roman|poesie|film"),
    ("tech", r"informatique|technologie|electronique|internet|telecommunication|"
             r"industrie|mecanique|machine|moteur|robot|numerique|logiciel|"
             r"electricite|energie"),
    ("jeux", r"\bjeu\b|\bjeux\b|jouet|loisir|puzzle|cartes|divertissement"),
    ("nature", r"plante|arbre|fleur|champignon|botanique|geographie|montagne|"
               r"riviere|fleuve|\bmer\b|ocean|meteorologie|foret|jardin|paysage|"
               r"volcan|desert|climat|vegetal"),
    ("mer", r"marine|\bport\b|maritime|navigation|peche|voilier|plongee|ocean|"
            r"littoral|phare|coquillage"),
    ("temps", r"calendrier|mois|jour|fete|saison|annee|heure|chronolog|"
              r"duree|periode|epoque"),
]

CURSE = set("""
MERDE PUTAIN CON CONNE CONNARD CONNASSE SALAUD SALOPE ENCULE ENCULER BITE COUILLE
COUILLES CHATTE FOUTRE BORDEL CUL CULS PENIS VAGIN NIQUE NIQER PUTE PUTAIN
TROUDUC BITTE ZOB QUEUE? CHIER CHIOTTE PISSOU FESSE FESSES SEIN SEINS NIPPLE
BRANLER BRANLEUSE SODOMIE ORGASME EJACULATION MASTURBATION PORNO PORNOGRAPHIQUE
""".split())
CURSE.discard("QUEUE?")

# mots trop specialises / anatomiques / techniques
STOP = set("""
ACETABULUM ADENINE ADENOPATHIE ACTINE ALCALOIDE AMYGDALE APONEVROSE ARACHNOIDE
ASTROCYTE AXONE BRONCHE BRONCHIOLE CALCANEUM CARDIOMYOCYTE CARTILAGE CHOLECYSTITE
CORTISOL CYTOLOGIE DENDROLOGIE DERMATOSE DIAPHYSE DIASTOLE DUODENUM ECTOPLASME
ENCEPHALE ENDOMETRE ENDOSCOPE EPIDERME EPIPHYSE EPISTAXIS ERYTHROCYTE FASCICULE
FIBROBLASTE GANGLION GLOMERULE GLYCEMIE HEMATOME HEMOGLOBINE HEPATITE HORMONE
HYPOPHYSE ILEON KYSTE LARYNX LEUCOCYTE LIGAMENT LYMPHOCYTE MEDIASTIN MENINGE
METABOLISME MITOCHONDRIE MYOCARDE NEPHRON NEURONE NEUROTRANSMETTEUR OEDEME
OSTEOPOROSE OVAIRE PANCREAS PAPILLOME PERITOINE PHLYCTENE PHOSPHATASE
PNEUMOTHORAX PROSTATE PSORIASIS PYELONEPHRITE RACHIS RETINE RHUMATISME SCLEROSE
SCROTUM SEBACEE SPERMATOZOIDE SPLEEN STAPHYLOCOQUE STERNUM SYNAPSE SYSTOLE
TENDON THROMBOSE THYMUS THYROIDE TIBIA TRACHEE URETERE URETRE VESICULE
""".split())

REGIONAL = set("""
AISSEAU AISSELLE? AGUICHAGE AGGRAVE ACTUATION ADENT ADRESSAGE AFFACTURAGE
""".split())
REGIONAL.discard("AISSELLE?")

# noms propres / marques glissees dans les noms communs
PROPER = set("""
PARIS FRANCE EUROPE AFRIQUE ASIE AMERIQUE LONDRES MARSEILLE LYON TOULOUSE NICE
BORDEAUX LILLE NANTES STRASBOURG MONTREAL QUEBEC BRETAGNE CORSE NORMANDIE
PROVENCE SAVOIE ALSACE GASCOGNE LORRAINE BOURGOGNE PICARDIE
""".split())


CATEGORY_RULES = [
    ("metiers", r"metiers|professions|secteur (primaire|secondaire|tertiaire)"),
    ("sports", r"sports? en francais"),
    ("musique", r"instruments? de musique"),
    ("nourriture", r"aliments|fruits|legumes|boissons|fromages|patisseries|plats"),
]


def themes_for(cats, w, definition):
    # On ne regarde que le debut de la definition (le genre prochain) : une
    # simple mention d'un animal dans une definition ne suffit pas a classer.
    blob = strip_accents(definition).lower()[:90]
    found = []
    for key, pat in THEME_RULES:
        if re.search(pat, blob):
            found.append(key)
    if not found:
        # les categories ne servent que pour les domaines ou elles sont fiables
        catblob = strip_accents(" ".join(cats)).lower()
        for key, pat in CATEGORY_RULES:
            if re.search(pat, catblob):
                found.append(key)
    if not found:
        found = ["general"]
    return found[:4]


# --------------------------------------------------------------- 4. Difficulte

def difficulty(w, freq):
    letters = [c for c in w]
    weights = [RANK.get(c, RARE_WEIGHT) for c in letters]
    rarity = 1 - (sum(weights) / len(weights)) / 10.0
    nvow = sum(1 for c in letters if c in VOWELS)
    vshare = nvow / len(letters)
    vowel_pen = max(0.0, min(1.0, (0.30 - vshare) / 0.30))
    distinct = len(set(letters))
    distinct_f = max(0.0, min(1.0, (distinct - 4) / 5.0))
    freq_f = 1 - min(1.0, math.log10(1 + max(freq, 0)) / 3.4)
    score = 0.45 * rarity + 0.20 * vowel_pen + 0.20 * distinct_f + 0.15 * freq_f
    return round(score, 4), nvow, distinct


def bucket(score):
    if score < 0.375:
        return "facile"
    if score < 0.46:
        return "moyen"
    return "difficile"


# ------------------------------------------------------------------- 5. Build

def sanitize_def(d):
    d = re.sub(r"^(?:ou|et|aussi|puis)\s+", "", d.strip(), flags=re.I)
    d = re.sub(r"^[•·\-–—]\s*", "", d)
    d = d.strip()
    if len(d) > 175:
        d = d[:172].rsplit(" ", 1)[0] + "…"
    return d


def build(min_freq=1.0):
    cands = lexique_candidates(min_freq)
    defs = {}
    if os.path.exists(CACHE):
        for line in open(CACHE, encoding="utf-8"):
            try:
                r = json.loads(line)
            except Exception:  # noqa: BLE001
                continue
            if r.get("def"):
                defs.setdefault(r["w"], r)
    print(f"candidats {len(cands)} | definitions {len(defs)}")

    words = []
    stats = {"no_def": 0, "curse": 0, "stop": 0, "shortdef": 0}
    seen = set()
    for w, c in cands.items():
        if w in seen:
            continue
        if w in CURSE or w in STOP or w in REGIONAL or w in PROPER:
            stats["curse" if w in CURSE else "stop"] += 1
            continue
        rec = defs.get(w)
        if not rec:
            stats["no_def"] += 1
            continue
        d = rec["def"].strip()
        if len(d) < 18:
            stats["shortdef"] += 1
            continue
        if re.search(r"\b(pluriel de|forme conjugu|variante orthographique)\b", d, re.I):
            stats["shortdef"] += 1
            continue
        d = sanitize_def(d)
        if len(d) < 18:
            stats["shortdef"] += 1
            continue
        score, nvow, distinct = difficulty(w, c["freq"])
        words.append({
            "w": w,
            "d": d,
            "l": len(w),
            "f": round(c["freq"], 2),
            "s": score,
            "b": bucket(score),
            "v": nvow,
            "u": distinct,
            "t": themes_for(rec.get("cats", []), w, d),
        })
        seen.add(w)

    words.sort(key=lambda x: (-x["f"], x["w"]))
    print("retenus:", len(words), stats)
    from collections import Counter
    print("difficultes:", Counter(w["b"] for w in words))
    print("themes:", Counter(t for w in words for t in w["t"]).most_common(12))
    if words:
        scores = sorted(w["s"] for w in words)
        n = len(scores)
        qs = [scores[int(n * q)] for q in (0.1, 0.25, 0.35, 0.5, 0.65, 0.75, 0.9)]
        print("quantiles score:", [round(x, 3) for x in qs])
    return words


def write_outputs(words):
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(ASSETS, exist_ok=True)
    with open(os.path.join(OUT, "mots.txt"), "w", encoding="utf-8", newline="\n") as f:
        for w in sorted(words, key=lambda x: x["w"]):
            f.write(w["w"] + "\n")
    payload = {
        "version": "1.0.0",
        "source": "Lexique.org 3.83 (CC BY-SA 4.0) + Wiktionnaire francophone (CC BY-SA 3.0)",
        "words": words,
    }
    with open(os.path.join(OUT, "mots.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    # version embarquée : on ne garde que ce dont le jeu a besoin
    light = dict(payload)
    light["words"] = [{k: w[k] for k in ("w", "d", "l", "s", "b", "t")} for w in words]
    js = "/* Genere par tools/build_mots.py - ne pas editer a la main. */\n"
    js += "window.PENDU_LEXIQUE = " + json.dumps(light, ensure_ascii=False, separators=(",", ":")) + ";\n"
    with open(os.path.join(ASSETS, "lexique.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write(js)
    print("ecrit: data/mots.txt, data/mots.json, assets/lexique.js")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--fetch", action="store_true")
    ap.add_argument("--build", action="store_true")
    ap.add_argument("--min-freq", type=float, default=1.0)
    ap.add_argument("--cache", default="definitions.jsonl",
                    help="nom du fichier cache dans data/_raw")
    args = ap.parse_args()
    CACHE = os.path.join(RAW, args.cache)
    if args.fetch:
        do_fetch(lexique_candidates(args.min_freq))
    if args.build:
        write_outputs(build(args.min_freq))
