#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
nieuwste-paginas.py — welke contentpagina's zijn het laatst nieuw gemaakt of herbouwd.

Aanleiding: 12 september 2026. Cars zag dat de homepage al weken niets liet zien van
wat de studio bouwde: de Green Lantern-koopgids was op 11 september herbouwd, de
surprisegids op 8 september nieuw, en op de voorpagina stond daar niets van.

Het script leest de git-geschiedenis en geeft de laatst aangeraakte contentpagina's,
met per pagina de datum, de titel (de <h1> uit het bestand) en of hij nieuw was of
bijgewerkt. Twee zeven houden de ruis eruit:

1. Bulkcommits worden overgeslagen. Een commit die meer dan DREMPEL bestanden raakt
   is een sweep (canonicals, footers, alt-teksten) en zegt niets over verse inhoud.
   Dat is dezelfde les als bij de sitemap, hoofdstuk 4m van het dossier.
2. Een wijziging telt pas mee vanaf MINREGELS gewijzigde regels. Eén tekstlink erbij
   is geen nieuws en hoort niet op de voorpagina als "bijgewerkt".

Gebruik:
    python3 gereedschap/nieuwste-paginas.py                # de tien laatste
    python3 gereedschap/nieuwste-paginas.py --aantal 6     # de zes laatste
    python3 gereedschap/nieuwste-paginas.py --json         # als json
"""
import argparse, json, re, subprocess, sys, os

DREMPEL = 15
MINREGELS = 20
NEGEER = re.compile(r'^(api-test|contact|cookies|faq|privacy|over-ons|hoe-wij-werken|index|helden|gidsen|schurken)\.html$')

def git(*a):
    return subprocess.run(['git', '--no-optional-locks', *a], capture_output=True, text=True).stdout

def h1_van(pad):
    try:
        s = open(pad, encoding='utf-8').read()
    except OSError:
        return None
    m = re.search(r'<h1[^>]*>(.*?)</h1>', s, re.S)
    if not m:
        return None
    t = re.sub(r'<[^>]+>', '', m.group(1))
    return re.sub(r'\s+', ' ', t).strip()

def regeltellingen():
    """Per commit en pad het aantal gewijzigde regels, uit git numstat."""
    ruw = git('log', '--since=12.weeks', '--numstat', '--format=%x01%H')
    uit, commit = {}, None
    for regel in ruw.split('\n'):
        if regel.startswith('\x01'):
            commit = regel[1:]
        elif regel.strip() and commit:
            d = regel.split('\t')
            if len(d) == 3 and d[0].isdigit() and d[1].isdigit():
                uit[(commit, d[2])] = int(d[0]) + int(d[1])
    return uit


def verzamel(aantal):
    ruw = git('log', '--since=12.weeks', '--name-status', '--format=%x01%as%x02%H')
    tellen = regeltellingen()
    gevonden, volgorde = {}, []
    datum = commit = None
    blok = []

    def verwerk(datum, blok):
        if not datum or len(blok) > DREMPEL:
            return
        for status, pad, regels in blok:
            if not pad.endswith('.html'):
                continue
            if not status.startswith('A') and regels < MINREGELS:
                continue
            if NEGEER.match(os.path.basename(pad)) and '/' not in pad:
                continue
            if pad in gevonden:
                continue
            gevonden[pad] = {'pad': pad, 'datum': datum,
                             'soort': 'nieuw' if status.startswith('A') else 'bijgewerkt'}
            volgorde.append(pad)

    for regel in ruw.split('\n'):
        if regel.startswith('\x01'):
            verwerk(datum, blok)
            datum, commit = regel[1:].split('\x02')
            blok = []
        elif regel.strip():
            deel = regel.split('\t')
            if len(deel) >= 2:
                blok.append((deel[0], deel[-1], tellen.get((commit, deel[-1]), 0)))
    verwerk(datum, blok)

    uit = []
    for pad in volgorde:
        r = gevonden[pad]
        kop = h1_van(pad)
        if not kop:
            continue
        r['titel'] = kop
        r['url'] = '/' + pad[:-5]
        uit.append(r)
        if len(uit) >= aantal:
            break
    return uit

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--aantal', type=int, default=10)
    ap.add_argument('--json', action='store_true')
    a = ap.parse_args()
    rijen = verzamel(a.aantal)
    if a.json:
        print(json.dumps(rijen, ensure_ascii=False, indent=2))
    else:
        for r in rijen:
            print(f"{r['datum']}  {r['soort']:<11} {r['url']:<52} {r['titel'][:70]}")
