"""Tests de fumee du jeu dans Chromium headless (a lancer hors bac a sable).

Chaque cas charge index.html avec des parametres de demonstration et lit
l'etat du jeu ecrit dans <title> par le mode probe.
"""
import subprocess
import sys
import tempfile

CHROME = r"C:\Users\david\AppData\Local\ms-playwright\chromium-1248\chrome-win64\chrome.exe"
BASE = "file:///C:/Users/david/Documents/appli%20perso/Pendu/index.html"

CASES = [
    ("classique 2 erreurs", "?demo=1&probe=1&mode=classique&word=MAISON&letters=E,A,S,O,N,T",
     ["over=false", "wrong=2/8", "word=MAISON"]),
    ("victoire", "?demo=1&probe=1&mode=classique&word=MAISON&letters=M,A,I,S,O,N",
     ["over=true", "won=true", "modal=true"]),
    ("defaite", "?demo=1&probe=1&mode=classique&word=MAISON&letters=E,T,R,U,L,P,Y,D",
     ["over=true", "won=false", "modal=true"]),
    ("phrases", "?demo=1&probe=1&mode=phrases&letters=A,E", ["mode=phrases"]),
    ("diabolique", "?demo=1&probe=1&mode=diabolique&letters=A,E,I,S", ["mode=diabolique"]),
    ("inverse", "?demo=1&probe=1&mode=inverse&word=MAISON&letters=M,A", ["mode=inverse"]),
    ("indices", "?demo=1&probe=1&mode=indices&word=BIBLIOTHEQUE&letters=E,I,T,Q", ["mode=indices"]),
    ("chrono", "?demo=1&probe=1&mode=chrono&word=MAISON&letters=A", ["mode=chrono"]),
    ("dedans", "?demo=1&probe=1&mode=dedans&word=MAISON&letters=A,E", ["mode=dedans"]),
    ("theme", "?demo=1&probe=1&mode=theme&letters=A", ["mode=theme"]),
    ("gore off par defaut", "?demo=1&probe=1&mode=classique&word=MAISON&letters=E",
     ["gore=false", "cuts=-"]),
    ("gore 3 sections", "?demo=1&probe=1&gore=1&mode=classique&word=MONTAGNE&letters=I,U,R",
     ["gore=true", "cuts=3", "wrong=3"]),
    ("gore defaite = explosion", "?demo=1&probe=1&gore=1&mode=classique&word=MONTAGNE&letters=I,U,R,L,P,Y,D,B",
     ["gore=true", "over=true", "won=false", "expl=true"]),
    ("gore inverse = classique", "?demo=1&probe=1&gore=1&mode=inverse&word=MAISON&letters=M,A",
     ["mode=inverse", "cuts=-"]),
]


def run(params):
    profile = tempfile.mkdtemp(prefix="pendu-test-")
    cmd = [
        CHROME, "--headless=new", "--no-sandbox", "--disable-gpu",
        "--window-size=1440,960", "--virtual-time-budget=8000",
        "--dump-dom", "--user-data-dir=" + profile,
        BASE + params,
    ]
    out = subprocess.run(cmd, capture_output=True, encoding="utf-8", errors="replace", timeout=150)
    dom = out.stdout or ""
    start = dom.find("<title>")
    end = dom.find("</title>")
    return dom[start + 7:end] if start >= 0 and end > start else "(pas de titre)"


def main():
    failures = 0
    for name, params, expects in CASES:
        title = run(params)
        ok = all(e in title for e in expects)
        # erreurs JS eventuelles
        print(("OK   " if ok else "FAIL ") + name + " -> " + title)
        if not ok:
            failures += 1
    print("---")
    print("echecs:", failures)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
