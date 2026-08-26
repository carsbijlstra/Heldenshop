#!/usr/bin/env python3
"""
sitemap-bijwerken.py - zet in sitemap.xml per URL de datum waarop de pagina
echt voor het laatst is gewijzigd.

Waarom dit bestaat (nachtploeg 26 augustus 2026). De sitemap van Heldenshop
stond op 65 URL's met lastmod 2026-06-29 en op 35 URL's zonder lastmod, terwijl
diezelfde pagina's in augustus zijn herschreven. Google leest lastmod als
"hier is niets veranderd" en heeft dan geen reden om opnieuw te crawlen. Dat is
een mechanische rem op de indexdekking, en die hoort niet met de hand
bijgehouden te worden.

Wat het doet: voor elke <loc> in sitemap.xml het bijbehorende .html-bestand
zoeken, de datum van de laatste commit op dat bestand opvragen, en die als
<lastmod> wegschrijven. Staat het bestand op dit moment gewijzigd in de
werkmap, dan wordt het vandaag. loc, changefreq en priority blijven ongemoeid.

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


def loc_naar_bestand(loc):
    pad = loc.replace(BASIS, "").strip("/")
    return "index.html" if pad == "" else pad + ".html"


def git(args, cwd):
    return subprocess.run(["git"] + args, cwd=cwd,
                          capture_output=True, text=True).stdout.strip()


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

    tekst = open(pad, encoding="utf-8").read()
    ontbreekt = []
    teller = {"n": 0}

    def vervang(m):
        blok, loc = m.group(0), m.group(1)
        bestand = loc_naar_bestand(loc)
        if not os.path.exists(os.path.join(root, bestand)):
            ontbreekt.append(loc)
            return blok
        if bestand in gewijzigd:
            datum = vandaag
        else:
            datum = git(["log", "-1", "--format=%as", "--", bestand], root)
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
