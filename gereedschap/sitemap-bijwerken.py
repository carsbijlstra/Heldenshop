#!/usr/bin/env python3
"""
sitemap-bijwerken.py - zet in sitemap.xml per URL de datum waarop de pagina
echt voor het laatst inhoudelijk is gewijzigd.

Waarom dit bestaat (nachtploeg 26 augustus 2026). De sitemap van Heldenshop
stond op 65 URL's met lastmod 2026-06-29 en op 35 URL's zonder lastmod, terwijl
diezelfde pagina's in augustus zijn herschreven. Google leest lastmod als
"hier is niets veranderd" en heeft dan geen reden om opnieuw te crawlen. Dat is
een mechanische rem op de indexdekking, en die hoort niet met de hand
bijgehouden te worden.

Wat het doet: voor elke <loc> in sitemap.xml het bijbehorende .html-bestand
zoeken, de datum van de laatste inhoudelijke commit op dat bestand opvragen, en
die als <lastmod> wegschrijven. Staat het bestand op dit moment gewijzigd in de
werkmap, dan wordt het vandaag. loc, changefreq en priority blijven ongemoeid.

Sitebrede sweeps tellen niet mee (5 oktober 2026). Een commit die meer dan
DREMPEL bestanden raakt en in dit bestand minder dan MINREGELS regels verandert,
is een sweep (kop, voet, canonicals) en geen nieuwe inhoud. Zonder deze regel
zette elke sitebrede wijziging alle sitemapdatums op dezelfde dag, en dat
bederft het lastmod-signaal (dossier 4m). Het is dezelfde zeef als in
gereedschap/nieuwste-paginas.py. Heeft een bestand alleen sweeps gehad, dan
telt de datum van zijn oudste commit (de dag dat de inhoud erop kwam).

Berichtpagina's onder /nieuws/ slaat dit script over (6 oktober 2026). Hun datum
zet gereedschap/nieuws-bouwen.py, uit de datum van het bericht of de regel
'bijgewerkt'. Een bericht verandert namelijk ook als het menu of de voet van de
site verandert, en dat is geen nieuwe inhoud.

Draaien vanuit de hoofdmap van de repo, voor de commit:

    python3 gereedschap/sitemap-bijwerken.py

Met --toon verandert er niets en zie je alleen wat er zou gebeuren.
"""
import datetime
import os
import re
import subprocess
import sys

BASIS = "https://www.heldenshop.nl/"
DREMPEL = 15
MINREGELS = 20


def loc_naar_bestand(loc):
    pad = loc.replace(BASIS, "").strip("/")
    return "index.html" if pad == "" else pad + ".html"


def git(args, cwd):
    # --no-optional-locks: verplicht in de gekoppelde map op Boris. De sandbox
    # mag daar geen bestanden verwijderen, dus een gewone git-aanroep laat
    # .git/index.lock staan en daarna kan de publicatiewacht in deze repo niets
    # meer committen (claude/publicatiewacht.md, 13 september 2026). Toegevoegd
    # 14 september 2026 door de contentscan, onder mandaat 5.
    return subprocess.run(["git", "--no-optional-locks"] + args, cwd=cwd,
                          capture_output=True, text=True).stdout.strip()


def historie(root):
    """Per bestand de commits (nieuwste eerst) met datum, of het een sweep was."""
    ruw = git(["log", "--numstat", "--format=%x01%H%x02%as"], root)
    commits = []
    huidig = None
    for regel in ruw.split("\n"):
        if regel.startswith("\x01"):
            h, d = regel[1:].split("\x02")
            huidig = {"datum": d, "bestanden": {}}
            commits.append(huidig)
        elif regel.strip() and huidig is not None:
            delen = regel.split("\t")
            if len(delen) == 3:
                plus, min_, pad = delen
                n = (int(plus) if plus.isdigit() else 0) + (int(min_) if min_.isdigit() else 0)
                huidig["bestanden"][pad] = n
    per_bestand = {}
    for c in commits:
        sweep_commit = len(c["bestanden"]) > DREMPEL
        for pad, n in c["bestanden"].items():
            per_bestand.setdefault(pad, []).append((c["datum"], sweep_commit and n < MINREGELS))
    return per_bestand


def inhoudsdatum(rijen):
    for datum, is_sweep in rijen:
        if not is_sweep:
            return datum
    return rijen[-1][0] if rijen else ""


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pad = os.path.join(root, "sitemap.xml")
    if not os.path.exists(pad):
        print("sitemap.xml niet gevonden in", root)
        return 1

    tonen = "--toon" in sys.argv
    vandaag = datetime.date.today().isoformat()
    gewijzigd = set()
    for regel in git(["status", "--porcelain"], root).splitlines():
        naam = regel[3:].strip().strip('"')
        if naam.endswith(".html"):
            gewijzigd.add(naam)
    hist = historie(root)

    tekst = open(pad, encoding="utf-8").read()
    ontbreekt = []
    teller = {"n": 0}

    def vervang(m):
        blok, loc = m.group(0), m.group(1)
        if loc.startswith(BASIS + "nieuws/"):
            return blok
        bestand = loc_naar_bestand(loc)
        if not os.path.exists(os.path.join(root, bestand)):
            ontbreekt.append(loc)
            return blok
        if bestand in gewijzigd:
            datum = vandaag
        else:
            datum = inhoudsdatum(hist.get(bestand, []))
        if not datum:
            ontbreekt.append(loc)
            return blok
        if "<lastmod>" in blok:
            nieuw = re.sub(r"<lastmod>[^<]*</lastmod>",
                           "<lastmod>%s</lastmod>" % datum, blok)
        else:
            nieuw = blok.replace("</loc>",
                                 "</loc><lastmod>%s</lastmod>" % datum, 1)
        if nieuw != blok:
            teller["n"] += 1
        return nieuw

    uit = re.sub(r"<url>.*?<loc>(.*?)</loc>.*?</url>", vervang, tekst, flags=re.S)

    print("URL's in sitemap: %d, lastmod bijgewerkt: %d"
          % (tekst.count("<loc>"), teller["n"]))
    if ontbreekt:
        print("geen bestand of geen datum gevonden voor:", ontbreekt)
    if tonen:
        print("(--toon: niets weggeschreven)")
        return 0
    if uit != tekst:
        open(pad, "w", encoding="utf-8").write(uit)
        print("sitemap.xml bijgewerkt.")
    else:
        print("sitemap.xml was al goed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
