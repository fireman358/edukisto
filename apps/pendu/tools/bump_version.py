"""Met à jour le numéro de version partout où il est utilisé.

    python tools/bump_version.py 1.3.0

Fichiers concernés :
  - index.html      : attribut data-version + paramètre ?v= des assets
  - sw.js           : constante VERSION (nom du cache)
  - assets/game.js  : constante APP_VERSION
"""
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def main():
    if len(sys.argv) != 2 or not re.fullmatch(r"\d+\.\d+\.\d+", sys.argv[1]):
        print("usage : python tools/bump_version.py 1.3.0")
        return 1
    v = sys.argv[1]

    p = os.path.join(ROOT, "index.html")
    s = open(p, encoding="utf-8").read()
    s = re.sub(r'data-version="[^"]*"', f'data-version="{v}"', s)
    s = re.sub(r"\?v=[\d.]+", "?v=" + v, s)
    s = re.sub(r'(<b id="app-version">)[^<]*(</b>)', r"\g<1>" + v + r"\g<2>", s)
    open(p, "w", encoding="utf-8", newline="\n").write(s)

    p = os.path.join(ROOT, "sw.js")
    s = open(p, encoding="utf-8").read()
    s = re.sub(r'const VERSION = "[^"]*";', f'const VERSION = "{v}";', s)
    open(p, "w", encoding="utf-8", newline="\n").write(s)

    p = os.path.join(ROOT, "assets", "game.js")
    s = open(p, encoding="utf-8").read()
    s = re.sub(r'const APP_VERSION = "[^"]*";', f'const APP_VERSION = "{v}";', s)
    open(p, "w", encoding="utf-8", newline="\n").write(s)

    print("version", v, "appliquee (index.html, sw.js, game.js)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
