#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
nieuws-bouwen.py - bouwt het superheldennieuws van Heldenshop uit de berichtbestanden.

Waarom dit bestaat (6 oktober 2026, vraag van Cars: "moeten we elk heldennieuws
bericht niet een aparte blog pagina van maken voor een betere vindbaarheid?").
Tot die dag stonden alle berichten onder elkaar op /nieuws, met een anker per
bericht. Google indexeert geen ankers ("Google Search generally doesn't support
URL fragments"), dus zeven berichten waren voor Google een pagina met een titel.
Google News vraagt een eigen, vaste URL per artikel, en Discover toont per URL
hooguit een kaart. Sindsdien krijgt elk bericht een eigen pagina op
/nieuws/<slug>. Met de hand zou dat per bericht acht plekken raken (pagina,
/nieuws, homepage, sitemap, zoekindex, RSS, gestructureerde data, beeld); dit
script doet die acht plekken in een keer en altijd hetzelfde.

Wat erin gaat (alles in gereedschap/berichten/, dat niet mee de site op gaat):
  <slug>.html     een bericht: kopregels tussen twee regels '---', daarna de tekst in HTML
  agenda.json     Nu te zien en Binnenkort, voor de homepage en /nieuws tegelijk
  beeld/          bronfoto's voor de berichten (de site krijgt alleen de uitsneden)

Wat eruit komt:
  nieuws/<slug>.html                     een eigen pagina per bericht (NewsArticle)
  nieuws/feed.xml                        RSS met de nieuwste twintig berichten
  nieuws.html                            overzicht, agenda, JSON-LD, metabeschrijving
  index.html                             topnieuws, Net binnen, agenda, metabeschrijving
  images/paginas/nieuws-<slug>*.jpg      16:9 (1200 breed), 4:3, 1:1 en een kleine kaart
  sitemap.xml                            elke berichtpagina met de datum van het bericht
  app.js                                 de zoekindex van de site

Gebruik, altijd vanuit de hoofdmap van de repo:
  python3 gereedschap/nieuws-bouwen.py              bouwen en wegschrijven
  python3 gereedschap/nieuws-bouwen.py --controle   alleen controleren, niets schrijven
  python3 gereedschap/nieuws-bouwen.py --paden      na het bouwen de gewijzigde paden als JSON
  python3 gereedschap/nieuws-bouwen.py --vandaag 2026-10-08   rekenen alsof het die dag is

Het script stopt met een foutmelding (en schrijft niets) bij een ontbrekend verplicht
veld, een dode interne link, een gedachtestreepje of een beeld dat niet bestaat.
Waarschuwingen (te lange titel, beeld te smal voor Discover, topnieuws ouder dan
zeven dagen, geen "Voor ouders") schrijven wel, maar horen in het verslag.

Geen git, geen netwerk: veilig in de gekoppelde map op Boris. Python 3.10 en Pillow.
"""
import argparse
import datetime
import glob
import hashlib
import html
import json
import os
import re
import sys

try:
    from zoneinfo import ZoneInfo
    AMS = ZoneInfo("Europe/Amsterdam")
except Exception:  # pragma: no cover
    AMS = None

BASIS = "https://www.heldenshop.nl"
BRONMAP = os.path.join("gereedschap", "berichten")
BEELDMAP = os.path.join("images", "paginas")
MAX_NET_BINNEN = 6        # homepage: lijst naast het topnieuws
MAX_KAARTEN = 11          # /nieuws: kaarten onder het topnieuws, de rest in "Eerder nieuws"
MAX_FEED = 20
MAX_AGENDA_HOME = 6
TOP_MAX_DAGEN = 7

MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli",
           "augustus", "september", "oktober", "november", "december"]
MAAND_KORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"]

# soort -> (emoji, achtergrond, tekstkleur). Onbekende soort: blauw.
SOORTEN = {
    "bioscoop": ("🎫", "#FDE7EA", "#C2283A"),
    "kaartverkoop": ("🎫", "#FDE7EA", "#C2283A"),
    "thuis kijken": ("🏠", "#E6F0FF", "#2B54E0"),
    "streaming": ("📺", "#ECE7FB", "#5A3FD6"),
    "serie": ("📺", "#E3F6E6", "#14743F"),
    "nieuwe film": ("🎬", "#FFE9D6", "#B5571A"),
    "film": ("🎬", "#FFE9D6", "#B5571A"),
    "trailer": ("▶️", "#E7EEF6", "#1E3A6B"),
    "record": ("🏆", "#FFF1DC", "#9A5B00"),
    "jubileum": ("🎂", "#FFF1C2", "#8A6100"),
    "games": ("🎮", "#E3F7F3", "#13786C"),
    "speelgoed": ("🧸", "#FFEAD6", "#B5571A"),
}
WAAR_KLEUR = {
    "bioscoop": ("#FDE7EA", "#C2283A"),
    "thuis": ("#E6F0FF", "#2B54E0"),
    "netflix": ("#FBE3E3", "#B1060F"),
    "hbo max": ("#ECE7FB", "#5A3FD6"),
    "disney+": ("#E3EEFF", "#113CCF"),
    "prime video": ("#E3F2FB", "#0F6E99"),
    "videoland": ("#FFE9F1", "#C2185B"),
    "stripboeken": ("#FFF1C2", "#8A6100"),
}
VERPLICHT = ["datum", "soort", "kop", "omschrijving", "samenvatting", "beeld", "beeld_alt",
             "onderwerp", "bron"]
STREEPJES = ["\u2014", "&mdash;", "&#8212;", "&#x2014;", "&#X2014;"]


# ------------------------------------------------------------------ hulpjes
def esc(s):
    return html.escape(s or "", quote=True)


def lees(pad):
    with open(pad, encoding="utf-8") as f:
        return f.read()


def datum_lang(d, jaar=True):
    t = "%d %s" % (d.day, MAANDEN[d.month - 1])
    return t + (" %d" % d.year if jaar else "")


def datum_kort(d):
    return "%d %s" % (d.day, MAAND_KORT[d.month - 1])


def iso_tijd(d, hhmm):
    """ISO 8601 met de echte Nederlandse tijdzone van die dag (zomer- of wintertijd)."""
    if not hhmm:
        return d.isoformat()
    u, m = [int(x) for x in hhmm.split(":")]
    if AMS:
        dt = datetime.datetime(d.year, d.month, d.day, u, m, tzinfo=AMS)
        return dt.isoformat()
    # terugval zonder zoneinfo: zomertijd van de laatste zondag van maart t/m oktober
    def laatste_zondag(jaar, maand):
        dag = datetime.date(jaar, maand, 31)
        return dag - datetime.timedelta(days=(dag.weekday() + 1) % 7)
    zomer = laatste_zondag(d.year, 3) <= d < laatste_zondag(d.year, 10)
    return "%sT%02d:%02d:00%s" % (d.isoformat(), u, m, "+02:00" if zomer else "+01:00")


def soort_stijl(soort, emoji=""):
    e, bg, fg = SOORTEN.get(soort.lower(), ("📰", "#E6F0FF", "#2B54E0"))
    return (emoji or e), bg, fg


def tag_html(b, klasse="nb-tag"):
    e, bg, fg = soort_stijl(b["soort"], b.get("emoji", ""))
    return '<span class="%s" style="--tag-bg:%s;--tag-fg:%s">%s %s</span>' % (
        klasse, bg, fg, e, esc(b["soort"]))


def woorden(htmltekst):
    t = re.sub(r"<[^>]+>", " ", htmltekst)
    return len(re.findall(r"[A-Za-zÀ-ÿ0-9'’-]+", html.unescape(t)))


# ------------------------------------------------------------------ inlezen
def lees_bericht(pad, fouten, waarschuwingen):
    ruw = lees(pad)
    m = re.match(r"\s*---\s*\n(.*?)\n---\s*\n(.*)\Z", ruw, re.S)
    naam = os.path.basename(pad)
    if not m:
        fouten.append("%s: geen kopregels tussen twee regels '---'" % naam)
        return None
    kop, tekst = m.group(1), m.group(2).strip()
    b = {"feiten": [], "bestand": pad, "body": tekst}
    for regel in kop.splitlines():
        regel = regel.rstrip()
        if not regel.strip() or regel.lstrip().startswith("#"):
            continue
        if ":" not in regel:
            fouten.append("%s: regel zonder dubbele punt: %s" % (naam, regel))
            continue
        k, v = regel.split(":", 1)
        k, v = k.strip().lower(), v.strip()
        if k == "feit":
            if "|" not in v:
                fouten.append("%s: feit zonder | tussen label en waarde: %s" % (naam, v))
                continue
            label, waarde = [x.strip() for x in v.split("|", 1)]
            b["feiten"].append((label, waarde))
        else:
            b[k] = v
    b.setdefault("slug", os.path.splitext(naam)[0])
    if not re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", b["slug"]):
        fouten.append("%s: slug '%s' mag alleen kleine letters, cijfers en koppeltekens bevatten" % (naam, b["slug"]))
    for k in VERPLICHT:
        if not b.get(k):
            fouten.append("%s: verplicht veld '%s' ontbreekt" % (naam, k))
    try:
        b["d"] = datetime.date.fromisoformat(b.get("datum", ""))
    except ValueError:
        fouten.append("%s: datum '%s' is geen jjjj-mm-dd" % (naam, b.get("datum")))
        return None
    if b.get("tijd") and not re.match(r"^\d{2}:\d{2}$", b["tijd"]):
        fouten.append("%s: tijd '%s' is geen uu:mm" % (naam, b["tijd"]))
    bw = b.get("bijgewerkt", "")
    if bw:
        delen = bw.split()
        try:
            b["bd"] = datetime.date.fromisoformat(delen[0])
            b["bt"] = delen[1] if len(delen) > 1 else ""
        except ValueError:
            fouten.append("%s: bijgewerkt '%s' is geen jjjj-mm-dd [uu:mm]" % (naam, bw))
    b["volgorde"] = int(b.get("volgorde", "0") or 0)
    b["topnieuws"] = b.get("topnieuws", "").lower() in ("ja", "j", "1", "true")
    # inhoudelijke toetsen
    if re.search(r"<h1[\s>]", tekst, re.I):
        fouten.append("%s: de tekst bevat een <h1>; de kop is de enige H1" % naam)
    if re.search(r"<h[4-6][\s>]", tekst, re.I) and not re.search(r"<h3[\s>]", tekst, re.I):
        waarschuwingen.append("%s: tussenkop slaat een niveau over (h4 zonder h3)" % naam)
    if "voor ouders" not in tekst.lower() and "let op" not in tekst.lower():
        waarschuwingen.append("%s: geen kader 'Voor ouders' of 'Let op' in de tekst" % naam)
    n = woorden(tekst)
    b["woorden"] = n
    if n < 180:
        waarschuwingen.append("%s: maar %d woorden; een eigen pagina moet de lezer iets opleveren "
                              "(liever een alinea op de onderwerppagina of een update van een bestaand bericht)" % (naam, n))
    if len(b.get("kop", "")) > 110:
        waarschuwingen.append("%s: kop is %d tekens, Google kapt af boven 110" % (naam, len(b["kop"])))
    om = b.get("omschrijving", "")
    if om and not (70 <= len(om) <= 160):
        waarschuwingen.append("%s: omschrijving is %d tekens (70 tot 160)" % (naam, len(om)))
    return b


def lees_agenda(vandaag, fouten, waarschuwingen):
    pad = os.path.join(BRONMAP, "agenda.json")
    if not os.path.exists(pad):
        fouten.append("agenda.json ontbreekt in %s" % BRONMAP)
        return {"nu": [], "binnenkort": []}
    try:
        a = json.loads(lees(pad))
    except ValueError as e:
        fouten.append("agenda.json is geen geldige JSON: %s" % e)
        return {"nu": [], "binnenkort": []}
    nu, bk = [], []
    for item in a.get("nu", []):
        if not item.get("titel") or not item.get("waar"):
            fouten.append("agenda.json: item onder 'nu' zonder titel of waar: %s" % item)
            continue
        tot = item.get("tot")
        if tot:
            try:
                if datetime.date.fromisoformat(tot) < vandaag:
                    waarschuwingen.append("agenda: '%s' liep tot %s en is van de site gehaald; haal hem ook uit agenda.json" % (item["titel"], tot))
                    continue
            except ValueError:
                fouten.append("agenda.json: tot '%s' is geen jjjj-mm-dd" % tot)
        nu.append(item)
    for item in a.get("binnenkort", []):
        try:
            d = datetime.date.fromisoformat(item.get("datum", ""))
        except ValueError:
            fouten.append("agenda.json: datum '%s' bij '%s' is geen jjjj-mm-dd" % (item.get("datum"), item.get("titel")))
            continue
        if d < vandaag:
            waarschuwingen.append("agenda: '%s' (%s) is voorbij en staat niet meer onder Binnenkort; zet hem onder 'nu' als hij nu te zien is" % (item.get("titel"), item["datum"]))
            continue
        item["d"] = d
        bk.append(item)
    bk.sort(key=lambda x: x["d"])
    return {"nu": nu, "binnenkort": bk}


# ------------------------------------------------------------------ beeld
def maak_beelden(b, manifest, schrijf, waarschuwingen, fouten, gewijzigd):
    """Uitsneden voor een bericht: 16:9 (hoofdbeeld, og:image), 4:3, 1:1 en een kleine kaart."""
    bron = b["beeld"].lstrip("/")
    slug = b["slug"]
    doel = {
        "16x9": os.path.join(BEELDMAP, "nieuws-%s.jpg" % slug),
        "4x3": os.path.join(BEELDMAP, "nieuws-%s-4x3.jpg" % slug),
        "1x1": os.path.join(BEELDMAP, "nieuws-%s-1x1.jpg" % slug),
        "klein": os.path.join(BEELDMAP, "nieuws-%s-klein.jpg" % slug),
    }
    b["img"] = doel
    if not os.path.exists(bron):
        fouten.append("%s: beeld %s bestaat niet" % (slug, bron))
        return
    if bron.lower().endswith(".svg"):
        fouten.append("%s: beeld %s is een SVG; een bericht vraagt een echte foto van minstens 1200 px breed" % (slug, bron))
        return
    try:
        from PIL import Image
    except ImportError:
        fouten.append("Pillow ontbreekt: pip install pillow")
        return
    sha = hashlib.sha256(open(bron, "rb").read()).hexdigest()[:16]
    focus = b.get("beeld_focus", "0.5,0.5")
    sleutel = "%s|%s|%s" % (bron, sha, focus)
    with Image.open(bron) as im0:
        im0 = im0.convert("RGB")
        w0, h0 = im0.size
        if w0 < 1200:
            waarschuwingen.append("%s: bronbeeld is %d px breed; Discover vraagt minstens 1200 px" % (slug, w0))
        alles_er = all(os.path.exists(p) for p in doel.values())
        if manifest.get(slug) == sleutel and alles_er:
            with Image.open(doel["16x9"]) as k:
                b["img_wh"] = k.size
            for v in ("4x3", "1x1"):
                with Image.open(doel[v]) as k:
                    b["img_wh_" + v] = k.size
            return
        try:
            fx, fy = [float(x) for x in focus.split(",")]
        except ValueError:
            fx, fy = 0.5, 0.5

        def uitsnede(rw, rh, maxw):
            # grootst mogelijke uitsnede in verhouding rw:rh, rond het focuspunt
            if w0 / h0 > rw / rh:
                ch, cw = h0, int(round(h0 * rw / rh))
            else:
                cw, ch = w0, int(round(w0 * rh / rw))
            x = int(round(min(max(fx * w0 - cw / 2, 0), w0 - cw)))
            y = int(round(min(max(fy * h0 - ch / 2, 0), h0 - ch)))
            c = im0.crop((x, y, x + cw, y + ch))
            if cw > maxw:
                c = c.resize((maxw, int(round(maxw * rh / rw))), Image.LANCZOS)
            return c

        stukken = {
            "16x9": uitsnede(16, 9, 1200),
            "4x3": uitsnede(4, 3, 1200),
            "1x1": uitsnede(1, 1, 1200),
            "klein": uitsnede(16, 9, 640),
        }
        for v, c in stukken.items():
            if schrijf:
                c.save(doel[v], "JPEG", quality=82, optimize=True, progressive=True)
            gewijzigd.add(doel[v])
        b["img_wh"] = stukken["16x9"].size
        b["img_wh_4x3"] = stukken["4x3"].size
        b["img_wh_1x1"] = stukken["1x1"].size
        manifest[slug] = sleutel


# ------------------------------------------------------------------ site-onderdelen
def chrome_uit(nieuws_html):
    """Kop, voet, mascotte en onderbalk uit nieuws.html: een menuwijziging daar gaat vanzelf mee."""
    def pak(patroon):
        m = re.search(patroon, nieuws_html, re.S)
        if not m:
            raise SystemExit("nieuws.html: onderdeel niet gevonden (%s)" % patroon[:40])
        return m.group(0)
    held = pak(r'<svg width="0" height="0"[^>]*>\s*<symbol id="held".*?</symbol></svg>')
    kop = pak(r'<header class="site">.*?</header>')
    kop = kop.replace(' aria-current="page"', "")
    voet = pak(r'<footer class="site">.*?</footer>')
    onder = pak(r'<div class="topbar">.*?</div>')
    body = pak(r"<body[^>]*>")
    fonts = pak(r'<link href="https://fonts.googleapis.com/css2[^>]*>')
    return {"held": held, "kop": kop, "voet": voet, "onder": onder, "body": body, "fonts": fonts}


def voet_met_tekst(voet, tekst):
    return re.sub(r'(<div class="seo-text">\s*)<p[^>]*>.*?</p>',
                  lambda m: m.group(1) + '<p style="margin:0 0 10px">' + tekst + "</p>",
                  voet, count=1, flags=re.S)


def onderwerp_info(pad):
    """Titel (h1) en beeld van de onderwerppagina, voor de kaart onder een bericht.

    Alleen beeld uit images/paginas/ (het eigen beeld van die pagina). Nooit het og:image
    als dat een Filmdepot-still is: die mag alleen op de pagina over die film zelf."""
    p = pad.split("#")[0].strip("/")
    bestand = (p + ".html") if p else "index.html"
    if not os.path.exists(bestand):
        return None
    s = lees(bestand)
    h1 = re.search(r"<h1[^>]*>(.*?)</h1>", s, re.S)
    titel = html.unescape(re.sub(r"<[^>]+>", "", h1.group(1))).strip() if h1 else p
    titel = re.sub(r"\s+", " ", titel)
    beeld = ""
    naam = p.replace("/", "-") or "index"
    for ext in ("jpg", "webp", "png"):
        kandidaat = "%s/%s.%s" % (BEELDMAP.replace(os.sep, "/"), naam, ext)
        if os.path.exists(kandidaat):
            beeld = kandidaat
            break
    if not beeld:
        og = re.search(r'<meta property="og:image" content="https://www\.heldenshop\.nl/(images/paginas/[^"]+\.(?:jpg|webp|png))"', s)
        beeld = og.group(1) if og else ""
    alt = ""
    if beeld:
        m = re.search(r'<img[^>]+src="(?:\.\./|/)?%s"[^>]*alt="([^"]*)"' % re.escape(beeld), s)
        if not m:
            m = re.search(r'<img[^>]+alt="([^"]*)"[^>]+src="(?:\.\./|/)?%s"' % re.escape(beeld), s)
        alt = html.unescape(m.group(1)) if m else ""
    return {"titel": titel, "beeld": beeld, "alt": alt}


NIEUWS_CSS = """
.nb-tag{display:inline-flex;align-items:center;gap:6px;font-family:var(--body);font-weight:700;font-size:.68rem;text-transform:uppercase;letter-spacing:.08em;border-radius:999px;padding:5px 11px;line-height:1;background:var(--tag-bg,#E6F0FF);color:var(--tag-fg,#2B54E0);white-space:nowrap}
.nb-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:0;font-family:var(--body);font-weight:600;font-size:.86rem;color:#6a7099}
.nb-kaarten{list-style:none;margin:0;padding:0;display:grid;gap:clamp(14px,2vw,22px);grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
.nb-kaart{min-width:0}
.nb-kaart>a{display:flex;flex-direction:column;height:100%;text-decoration:none;color:var(--ink);background:#fff;border:3px solid var(--ink);border-radius:20px;overflow:hidden;box-shadow:5px 6px 0 rgba(26,31,61,.14);transition:transform .16s ease,box-shadow .16s ease}
.nb-kaart>a:hover{transform:translateY(-5px);box-shadow:7px 9px 0 rgba(26,31,61,.2)}
.nb-kaart>a:focus-visible{outline:4px solid #ffd23f;outline-offset:2px}
.nb-kaart img{width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;display:block;border-bottom:3px solid var(--ink);background:#0e1430}
.nk-body{padding:14px 16px 16px;display:flex;flex-direction:column;gap:8px;flex:1}
.nb-kaart h3{font-family:var(--body);font-weight:700;font-size:1.08rem;line-height:1.28;margin:0;color:var(--ink);text-wrap:pretty}
.nb-kaart p{margin:0;font-weight:600;font-size:.93rem;line-height:1.5;color:#4a5077}
.nb-lead{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);background:#fff;border:3px solid var(--ink);border-radius:26px;overflow:hidden;box-shadow:var(--shadow);margin:0 0 clamp(22px,3vw,34px)}
.nb-lead-beeld{position:relative;display:block;background:#0e1430;min-height:100%}
.nb-lead-beeld img{width:100%;height:100%;min-height:260px;object-fit:cover;display:block}
.nb-sticker{position:absolute;top:14px;left:14px;font-family:var(--display);font-weight:400;letter-spacing:.6px;font-size:.95rem;background:var(--yellow);color:var(--ink);border:3px solid var(--ink);border-radius:12px;padding:6px 12px;transform:rotate(-4deg);box-shadow:3px 3px 0 var(--ink)}
.nb-lead-tekst{padding:clamp(20px,3vw,34px);display:flex;flex-direction:column;gap:12px;justify-content:center;border-left:3px solid var(--ink)}
.nb-lead-kop{font-family:var(--display);font-weight:400;letter-spacing:.4px;font-size:clamp(1.45rem,2.8vw,2.1rem);line-height:1.1;margin:0}
.nb-lead-kop a{color:var(--ink);text-decoration:none}
.nb-lead-kop a:hover{text-decoration:underline;text-decoration-color:var(--red);text-decoration-thickness:3px}
.nb-lead-tekst p{margin:0;font-weight:600;font-size:1.02rem;line-height:1.55;color:#3c4267}
.nb-lead-tekst .btn{align-self:flex-start;margin-top:4px}
@media (max-width:760px){.nb-lead{grid-template-columns:1fr}.nb-lead-tekst{border-left:0;border-top:3px solid var(--ink)}.nb-lead-beeld img{min-height:0;aspect-ratio:16/9;height:auto}}
.nb-eerder{display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));margin-top:10px}
.nb-eerder h3{font-family:var(--display);font-weight:400;letter-spacing:.3px;font-size:1.1rem;margin:0 0 6px;color:var(--ink)}
.nb-eerder ul{list-style:none;margin:0;padding:0}
.nb-eerder li{display:grid;grid-template-columns:4.2rem 1fr;gap:10px;padding:8px 0;border-bottom:2px dotted #DfE3F0;align-items:baseline}
.nb-eerder time{font-family:var(--body);font-weight:700;font-size:.8rem;color:#6a7099}
.nb-eerder a{font-weight:700;color:var(--ink);text-decoration:none}
.nb-eerder a:hover{text-decoration:underline}
.ag-wanneer-kaart{flex:0 0 auto;width:58px;text-align:center;background:#fff;border:2.5px solid var(--ink);border-radius:12px;box-shadow:2px 2px 0 var(--ink);padding:5px 0 4px;transform:rotate(-3deg);line-height:1}
.ag-wanneer-kaart .d{display:block;font-family:var(--display);font-weight:400;font-size:1.45rem;color:var(--red)}
.ag-wanneer-kaart .m{display:block;font-family:var(--display);font-weight:400;font-size:.72rem;letter-spacing:.5px;color:var(--ink);margin-top:2px;text-transform:uppercase}
.ag-wanneer-kaart .j{display:block;font-family:var(--body);font-weight:700;font-size:.6rem;color:#6a7099;margin-top:2px}
.ag-waar{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;min-width:5.6rem;font-family:var(--body);font-weight:700;font-size:.66rem;text-transform:uppercase;letter-spacing:.06em;border-radius:999px;padding:6px 10px;line-height:1;background:var(--tag-bg,#E6F0FF);color:var(--tag-fg,#2B54E0)}
.ag-lijst{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.ag-lijst li{display:flex;gap:14px;align-items:center;padding:11px 0;border-bottom:2px dotted #DfE3F0}
.ag-lijst li:last-child{border-bottom:0}
.ag-wat{min-width:0;display:flex;flex-direction:column;gap:2px}
.ag-wat b,.ag-wat a{font-family:var(--body);font-weight:700;font-size:1rem;color:var(--ink);text-decoration:none;line-height:1.25}
.ag-wat a:hover{text-decoration:underline}
.ag-wat span{font-weight:600;font-size:.88rem;color:#5a6086;line-height:1.45}
.ag-wat .ag-leeftijd{font-family:var(--body);font-weight:700;font-size:.78rem;color:#14743F}
.ag-vs{font-family:var(--body);font-weight:700;font-size:.62rem;color:#6a7099;letter-spacing:.04em}
.nb-meer .nb-kaarten{grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
@media (max-width:520px){.ag-nu li{flex-direction:column;align-items:flex-start;gap:6px}}
.nb-sectie{font-family:var(--display);font-weight:400;letter-spacing:.4px;font-size:clamp(1.4rem,2.8vw,1.9rem);line-height:1.1;margin:0 0 14px;color:var(--ink)}
.nb-anker{display:block;height:0}
.nb-kaart[id],.nb-anker,.nb-eerder li[id]{scroll-margin-top:clamp(110px,17vh,180px)}
"""

ARTIKEL_CSS = """
.nb-wrap{max-width:820px}
.nb-kop{margin:clamp(16px,3vw,26px) 0 20px}
.nb-h1{font-family:var(--display);font-weight:400;font-size:clamp(1.8rem,4.4vw,2.8rem);color:var(--ink);margin:12px 0 12px;letter-spacing:.4px;line-height:1.08}
.nb-intro{font-size:clamp(1.06rem,1.8vw,1.22rem);line-height:1.55;color:#3c4267;font-weight:600;margin:0 0 12px;max-width:64ch}
.nb-door{font-size:.86rem;color:#6a7099;font-weight:700;margin:0}
.nb-door a{color:var(--blue)}
.nb-beeld{margin:0 0 24px}
.nb-beeld img{width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:20px;border:3px solid var(--ink);box-shadow:6px 8px 0 rgba(26,31,61,.16);background:#0e1430;display:block}
.nb-feiten{background:#FFF6DC;border:3px solid var(--ink);border-radius:20px;box-shadow:var(--shadow-sm);padding:18px 22px;margin:0 0 26px}
.nb-feiten h2{font-family:var(--display);font-weight:400;letter-spacing:.4px;font-size:1.25rem;margin:0 0 10px;color:var(--ink)}
.nb-feiten dl{display:grid;grid-template-columns:minmax(7rem,auto) 1fr;gap:8px 18px;margin:0}
.nb-feiten dt{font-family:var(--body);font-weight:700;color:var(--ink)}
.nb-feiten dd{margin:0;font-weight:600;color:#2c3157;line-height:1.5}
.nb-feiten a{color:var(--blue);font-weight:700}
@media (max-width:520px){.nb-feiten dl{grid-template-columns:1fr;gap:2px}.nb-feiten dd{margin-bottom:8px}}
.nb-prose{max-width:none}
.nb-bron{font-size:.9rem!important;color:#5a6086;border-top:2px dotted #DfE3F0;padding-top:14px;margin-top:26px!important}
.nb-onderwerp{display:grid;grid-template-columns:200px 1fr;gap:0;background:#fff;border:3px solid var(--ink);border-radius:22px;overflow:hidden;box-shadow:var(--shadow);margin:30px 0 0}
.nb-onderwerp img{width:100%;height:100%;object-fit:cover;display:block;border-right:3px solid var(--ink);min-height:150px}
.nb-onderwerp.zonder-beeld{grid-template-columns:1fr}
.nb-ond-tekst{padding:18px 20px;display:flex;flex-direction:column;gap:8px;justify-content:center}
.nb-ond-tekst .eyebrow{color:var(--red)}
.nb-ond-tekst h2{font-family:var(--body);font-weight:700;font-size:1.2rem;line-height:1.25;margin:0}
.nb-ond-tekst h2 a{color:var(--ink);text-decoration:none}
.nb-ond-tekst h2 a:hover{text-decoration:underline}
.nb-ond-tekst p{margin:0;color:#4a5077;font-weight:600}
@media (max-width:600px){.nb-onderwerp{grid-template-columns:1fr}.nb-onderwerp img{border-right:0;border-bottom:3px solid var(--ink);aspect-ratio:16/9;height:auto;min-height:0}}
.nb-meer{padding-top:clamp(28px,4vw,48px)}
.nb-meer .sec-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap}
"""


def kaart_html(b, kopniveau="h3", beeld_laden="lazy", met_id=False):
    d = b["d"]
    idattr = ' id="%s"' % esc(b["anker"]) if met_id and b.get("anker") else ""
    return ('<li class="nb-kaart"%s><a href="/nieuws/%s"><img src="/%s" alt="%s" width="640" height="360" loading="%s">'
            '<span class="nk-body"><span class="nb-meta">%s<time datetime="%s">%s</time></span>'
            '<%s>%s</%s><p>%s</p></span></a></li>') % (
        idattr, b["slug"], b["img"]["klein"], esc(b["beeld_alt"]), beeld_laden,
        tag_html(b), d.isoformat(), datum_kort(d), kopniveau, esc(b["kop"]), kopniveau, esc(b["samenvatting"]))


def lead_html(b, sticker="Topnieuws", kopniveau="h2", knop="Lees het hele bericht"):
    d = b["d"]
    w, h = b.get("img_wh", (1200, 675))
    return ('<article class="nb-lead"><a class="nb-lead-beeld" href="/nieuws/%s" tabindex="-1" aria-hidden="true">'
            '<img src="/%s" alt="%s" width="%d" height="%d" fetchpriority="high"><span class="nb-sticker">%s</span></a>'
            '<div class="nb-lead-tekst"><p class="nb-meta">%s<time datetime="%s">%s</time></p>'
            '<%s class="nb-lead-kop"><a href="/nieuws/%s">%s</a></%s><p>%s</p>'
            '<a class="btn btn-red" href="/nieuws/%s">%s &rarr;</a></div></article>') % (
        b["slug"], b["img"]["16x9"], esc(b["beeld_alt"]), w, h, esc(sticker),
        tag_html(b), d.isoformat(), datum_lang(d), kopniveau, b["slug"], esc(b["kop"]), kopniveau,
        esc(b["samenvatting"]), b["slug"], esc(knop))


def waar_html(waar):
    bg, fg = WAAR_KLEUR.get(waar.lower(), ("#E6F0FF", "#2B54E0"))
    return '<span class="ag-waar" style="--tag-bg:%s;--tag-fg:%s">%s</span>' % (bg, fg, esc(waar))


def titel_link(item):
    if item.get("link"):
        return '<a href="%s">%s</a>' % (esc(item["link"]), esc(item["titel"]))
    return "<b>%s</b>" % esc(item["titel"])


def agenda_home(ag, vandaag):
    nu = "".join('<li>%s<span class="ag-wat">%s<span>%s</span>%s</span></li>' % (
        waar_html(i["waar"]), titel_link(i), esc(i.get("tekst", "")),
        ('<span class="ag-leeftijd">%s</span>' % esc(i["leeftijd"])) if i.get("leeftijd") else "")
        for i in ag["nu"])
    bk = []
    for i in ag["binnenkort"][:MAX_AGENDA_HOME]:
        d = i["d"]
        jaar = ('<span class="j">%d%s</span>' % (d.year, " VS" if i.get("land", "").upper() == "VS" else "")
                if (d.year != vandaag.year or i.get("land", "").upper() == "VS") else "")
        bk.append('<li><span class="ag-wanneer-kaart" aria-hidden="true"><span class="d">%d</span><span class="m">%s</span>%s</span>'
                  '<span class="ag-wat">%s<span><time datetime="%s">%s</time>%s. %s</span>%s</span></li>' % (
                      d.day, MAAND_KORT[d.month - 1], jaar, titel_link(i), d.isoformat(), datum_lang(d),
                      " (VS)" if i.get("land", "").upper() == "VS" else "",
                      esc(i.get("tekst", "")),
                      ('<span class="ag-leeftijd">%s</span>' % esc(i["leeftijd"])) if i.get("leeftijd") else ""))
    return ('<div class="agenda-grid"><div class="agenda-kol"><h3>&#127871; Nu te zien</h3><ul class="ag-lijst ag-nu">%s</ul></div>'
            '<div class="agenda-kol"><h3>&#128197; Binnenkort</h3><ul class="ag-lijst">%s</ul></div></div>') % (nu, "".join(bk))


def agenda_tabellen(ag):
    nu = "".join("<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>" % (
        esc(i["waar"]), titel_link(i), esc(i.get("tekst", "")), esc(i.get("leeftijd", "") or "Nog niet bekend"))
        for i in ag["nu"])
    bk = "".join("<tr><td>%s%s</td><td>%s</td><td>%s</td><td>%s</td></tr>" % (
        datum_lang(i["d"]), " (VS)" if i.get("land", "").upper() == "VS" else "", titel_link(i),
        esc(i.get("waar", "")), esc(i.get("leeftijd", "") or "Nog niet bekend"))
        for i in ag["binnenkort"])
    return ('<h3>Nu te zien</h3><div class="tablewrap"><table><thead><tr><th>Waar</th><th>Wat</th><th>Goed om te weten</th><th>Voor wie</th></tr></thead><tbody>%s</tbody></table></div>'
            '<h3>Binnenkort</h3><div class="tablewrap"><table><thead><tr><th>Wanneer</th><th>Wat</th><th>Waar</th><th>Voor wie</th></tr></thead><tbody>%s</tbody></table></div>'
            '<p>Staat er (VS) bij, dan is dat de Amerikaanse datum. De Nederlandse datum zetten we erbij zodra de filmdistributeur hem bekendmaakt; meestal is die een of twee dagen eerder.</p>') % (nu, bk)


def artikel_html(b, alle, chrome, vandaag):
    slug, d = b["slug"], b["d"]
    url = "%s/nieuws/%s" % (BASIS, slug)
    iso = iso_tijd(d, b.get("tijd", ""))
    iso_mod = iso_tijd(b["bd"], b.get("bt", "")) if b.get("bd") else iso
    titel = b.get("titel") or b["kop"]
    if len(titel) + len(" | Heldenshop") <= 60:
        titel += " | Heldenshop"
    w, h = b.get("img_wh", (1200, 675))
    beelden = ["%s/%s" % (BASIS, b["img"][v]) for v in ("16x9", "4x3", "1x1")]
    kruimel = b.get("kort") or b["kop"]
    kruimel = kruimel[0].upper() + kruimel[1:]
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": BASIS + "/"},
            {"@type": "ListItem", "position": 2, "name": "Superheldennieuws", "item": BASIS + "/nieuws"},
            {"@type": "ListItem", "position": 3, "name": kruimel, "item": url}]},
        {"@type": "NewsArticle", "@id": url + "#bericht", "mainEntityOfPage": url, "url": url,
         "headline": b["kop"], "description": b["omschrijving"], "image": beelden,
         "datePublished": iso, "dateModified": iso_mod, "inLanguage": "nl-NL",
         "articleSection": "Superheldennieuws", "wordCount": b["woorden"],
         "author": {"@type": "Organization", "name": "Heldenshop", "url": BASIS + "/over-ons"},
         "publisher": {"@type": "Organization", "name": "Heldenshop", "url": BASIS + "/"},
         "isPartOf": {"@type": "CollectionPage", "@id": BASIS + "/nieuws", "name": "Superheldennieuws"}}]}
    feiten = ""
    if b["feiten"]:
        feiten = ('<section class="nb-feiten" aria-labelledby="in-het-kort"><h2 id="in-het-kort">In het kort</h2><dl>%s</dl></section>'
                  % "".join("<dt>%s</dt><dd>%s</dd>" % (esc(k), v) for k, v in b["feiten"]))
    bijgewerkt = ""
    if b.get("bd") and b["bd"] != d:
        bijgewerkt = '<span>bijgewerkt op <time datetime="%s">%s</time></span>' % (b["bd"].isoformat(), datum_lang(b["bd"]))
    ond = onderwerp_info(b["onderwerp"])
    ond_html = ""
    if ond:
        img = ('<img src="/%s" alt="%s" loading="lazy">' % (esc(ond["beeld"]), esc(ond["alt"]))) if ond["beeld"] else ""
        ond_html = ('<aside class="nb-onderwerp%s" aria-labelledby="meer-over">%s<div class="nb-ond-tekst">'
                    '<span class="eyebrow">Meer over dit onderwerp</span><h2 id="meer-over"><a href="%s">%s</a></h2>'
                    '<p>%s</p><a class="btn btn-white" href="%s" style="align-self:flex-start">Lees verder &rarr;</a></div></aside>') % (
            "" if img else " zonder-beeld", img, esc(b["onderwerp"]), esc(b.get("onderwerp_naam") or ond["titel"]),
            esc(b.get("onderwerp_tekst") or "Alles op een rij, met de leeftijd erbij en eerlijk voor wie het is."),
            esc(b["onderwerp"]))
    # "Meer nieuws": de drie berichten van vlak voor dit bericht (bij de oudste aangevuld
    # met de eerstvolgende nieuwere). Die buren veranderen niet als er nieuws bijkomt, dus een
    # oud bericht blijft byte voor byte gelijk en zijn sitemapdatum blijft eerlijk. Samen vormen
    # de berichten zo een ketting: elk bericht krijgt links van zijn opvolgers.
    idx = alle.index(b)
    eerder = alle[idx + 1: idx + 4]
    if len(eerder) < 3:
        eerder = eerder + alle[:idx][::-1][:3 - len(eerder)]
    meer = ('<section class="nb-meer"><div class="wrap"><div class="sec-head"><div><span class="eyebrow" style="color:var(--red)">Superheldennieuws</span>'
            '<h2 class="sec-title" style="font-size:clamp(1.5rem,3vw,2.1rem)">Meer nieuws</h2></div>'
            '<a href="/nieuws" style="font-family:var(--display);color:var(--blue);text-decoration:none">Al het nieuws &rarr;</a></div>'
            '<ul class="nb-kaarten">%s</ul></div></section>') % "".join(kaart_html(x) for x in eerder) if eerder else ""
    voettekst = ('%s Heldenshop is een onafhankelijke Nederlandse fansite over superhelden, voor kinderen en hun ouders, '
                 'met het laatste <a href="/nieuws">superheldennieuws</a>, weetjes en eerlijke cadeautips.') % esc(b["samenvatting"])
    delen = [
        "<!doctype html>\n<html lang=\"nl\">\n<head>\n<meta charset=\"utf-8\">\n",
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n',
        "<title>%s</title>\n" % esc(titel),
        '<meta name="description" content="%s">\n' % esc(b["omschrijving"]),
        '<meta name="robots" content="index,follow,max-image-preview:large">\n',
        '<meta name="theme-color" content="#EE2A3C">\n',
        '<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n',
        '<link rel="canonical" href="%s">\n' % url,
        '<link rel="alternate" type="application/rss+xml" title="Superheldennieuws van Heldenshop" href="%s/nieuws/feed.xml">\n' % BASIS,
        '<meta property="og:type" content="article">\n<meta property="og:site_name" content="Heldenshop">\n',
        '<meta property="og:title" content="%s">\n' % esc(b["kop"]),
        '<meta property="og:description" content="%s">\n' % esc(b["omschrijving"]),
        '<meta property="og:url" content="%s">\n<meta property="og:locale" content="nl_NL">\n' % url,
        '<meta property="og:image" content="%s">\n' % beelden[0],
        '<meta property="og:image:width" content="%d">\n<meta property="og:image:height" content="%d">\n' % (w, h),
        '<meta property="og:image:alt" content="%s">\n' % esc(b["beeld_alt"]),
        '<meta property="article:published_time" content="%s">\n' % iso,
        '<meta property="article:modified_time" content="%s">\n' % iso_mod,
        '<meta property="article:section" content="Superheldennieuws">\n',
        '<meta property="article:tag" content="%s">\n' % esc(b["soort"]),
        '<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:image" content="%s">\n' % beelden[0],
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n',
        chrome["fonts"] + "\n",
        '<link rel="stylesheet" href="/styles.css">\n',
        "<style>/* Berichtpagina, gebouwd door gereedschap/nieuws-bouwen.py. Stijl staat in de pagina, want styles.css wordt een dag gecachet */%s%s</style>\n"
        % (NIEUWS_CSS.replace("\n", ""), ARTIKEL_CSS.replace("\n", "")),
        '<script type="application/ld+json">%s</script>\n' % json.dumps(ld, ensure_ascii=False, separators=(",", ":")),
        "</head>\n", chrome["body"], "\n", chrome["held"], "\n", chrome["kop"], "\n<main>\n",
        '<nav aria-label="Kruimelpad" class="wrap"><ol class="crumbs"><li><a href="/">Home</a></li><li class="sep" aria-hidden="true">&rsaquo;</li>'
        '<li><a href="/nieuws">Superheldennieuws</a></li><li class="sep" aria-hidden="true">&rsaquo;</li>'
        '<li aria-current="page" style="color:var(--ink)">%s</li></ol></nav>\n' % esc(kruimel),
        '<article class="nb-artikel"><div class="wrap nb-wrap">\n',
        '<header class="nb-kop"><p class="nb-meta">%s<time datetime="%s">%s</time>%s</p>\n' % (
            tag_html(b), iso, datum_lang(d), bijgewerkt),
        '<h1 class="nb-h1">%s</h1>\n<p class="nb-intro">%s</p>\n' % (esc(b["kop"]), esc(b["samenvatting"])),
        '<p class="nb-door">Door de redactie van Heldenshop &middot; <a href="/hoe-wij-werken">zo werken wij</a></p></header>\n',
        '<figure class="nb-beeld"><img src="/%s" alt="%s" width="%d" height="%d" fetchpriority="high"></figure>\n' % (
            b["img"]["16x9"], esc(b["beeld_alt"]), w, h),
        feiten + "\n",
        '<div class="prose nb-prose">\n%s\n<p class="nb-bron">Bron: %s</p>\n</div>\n' % (b["body"], b["bron"]),
        ond_html + "\n</div></article>\n", meer, "\n</main>\n",
        voet_met_tekst(chrome["voet"], voettekst), "\n", chrome["onder"], "\n",
        '<script src="/app.js" defer></script>\n<script src="/eigen-bezoek.js"></script>\n<script defer src="/_vercel/insights/script.js"></script>\n'
        '<script defer src="/_vercel/speed-insights/script.js"></script>\n</body>\n</html>\n',
    ]
    return "".join(delen)


def vervang_blok(tekst, naam, inhoud, bestand, fouten):
    patroon = re.compile(r"(<!-- nieuws:%s -->)(.*?)(<!-- /nieuws:%s -->)" % (naam, naam), re.S)
    if not patroon.search(tekst):
        fouten.append("%s: markering <!-- nieuws:%s --> ontbreekt" % (bestand, naam))
        return tekst
    return patroon.sub(lambda m: m.group(1) + inhoud + m.group(3), tekst, count=1)


def vervang_stijl(tekst, css, bestand, fouten):
    # Gedeelde nieuwsstijl in <style id="nieuws-stijl">; een HTML-commentaar als
    # markering binnen <style> zou de eerste CSS-regel breken, vandaar het id.
    patroon = re.compile(r'(<style id="nieuws-stijl">)(.*?)(</style>)', re.S)
    if not patroon.search(tekst):
        fouten.append('%s: <style id="nieuws-stijl"> ontbreekt' % bestand)
        return tekst
    return patroon.sub(lambda m: m.group(1) + css + m.group(3), tekst, count=1)


def zet_meta(tekst, naam, waarde):
    tekst = re.sub(r'(<meta name="%s" content=")[^"]*(")' % naam, lambda m: m.group(1) + esc(waarde) + m.group(2), tekst, count=1)
    tekst = re.sub(r'(<meta property="og:%s" content=")[^"]*(")' % naam, lambda m: m.group(1) + esc(waarde) + m.group(2), tekst, count=1)
    return tekst


def omschrijving_met(begin, berichten, eind, maxlen=160):
    korte = [b["kort"] for b in berichten if b.get("kort")]
    gekozen = []
    for k in korte:
        proef = begin + ", ".join(gekozen + [k]) + eind
        if len(proef) <= maxlen:
            gekozen.append(k)
        else:
            break
    if not gekozen:
        return None
    return begin + ", ".join(gekozen) + eind


def bouw_overzicht(nieuws, alle, top, ag, vandaag, fouten):
    rest = [b for b in alle if b is not top]
    kaarten = rest[:MAX_KAARTEN]
    eerder = rest[MAX_KAARTEN:]
    blok = lead_html(top, sticker="Topnieuws")
    if top.get("anker"):
        blok = '<span id="%s" class="nb-anker"></span>' % esc(top["anker"]) + blok
    blok += '<h2 class="nb-sectie">Meer nieuws</h2><ul class="nb-kaarten">%s</ul>' % "".join(
        kaart_html(b, met_id=True) for b in kaarten)
    if eerder:
        per_maand = {}
        for b in eerder:
            per_maand.setdefault((b["d"].year, b["d"].month), []).append(b)
        groepen = []
        for (j, m), bs in sorted(per_maand.items(), reverse=True):
            groepen.append('<div><h3>%s %d</h3><ul>%s</ul></div>' % (MAANDEN[m - 1].capitalize(), j, "".join(
                '<li%s><time datetime="%s">%s</time><a href="/nieuws/%s">%s</a></li>' % (
                    (' id="%s"' % esc(b["anker"])) if b.get("anker") else "", b["d"].isoformat(), datum_kort(b["d"]),
                    b["slug"], esc(b["kop"])) for b in bs)))
        blok += ('<h2 id="eerder" style="margin-top:clamp(28px,4vw,40px)">Eerder nieuws</h2><div class="nb-eerder">%s</div>'
                 % "".join(groepen))
    nieuws = vervang_blok(nieuws, "overzicht", blok, "nieuws.html", fouten)
    nieuws = vervang_blok(nieuws, "agenda", agenda_tabellen(ag), "nieuws.html", fouten)
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": BASIS + "/"},
            {"@type": "ListItem", "position": 2, "name": "Superheldennieuws", "item": BASIS + "/nieuws"}]},
        {"@type": "CollectionPage", "@id": BASIS + "/nieuws", "url": BASIS + "/nieuws",
         "name": "Superheldennieuws voor kinderen en ouders", "inLanguage": "nl-NL",
         "image": BASIS + "/images/paginas/nieuws.jpg",
         "mainEntity": {"@type": "ItemList", "itemListOrder": "https://schema.org/ItemListOrderDescending",
                        "numberOfItems": len(alle),
                        "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": "%s/nieuws/%s" % (BASIS, b["slug"]),
                                             "name": b["kop"]} for i, b in enumerate(alle[:30])]}}]}
    nieuws, n = re.subn(r'(<script type="application/ld\+json" id="ld-nieuws">).*?(</script>)',
                        lambda m: m.group(1) + json.dumps(ld, ensure_ascii=False, separators=(",", ":")) + m.group(2),
                        nieuws, count=1, flags=re.S)
    if not n:
        fouten.append('nieuws.html: <script type="application/ld+json" id="ld-nieuws"> ontbreekt')
    om = omschrijving_met("Het laatste superheldennieuws, simpel uitgelegd: ", [top] + rest, ", en wat eraan komt.")
    if om:
        nieuws = zet_meta(nieuws, "description", om)
    nieuws = vervang_stijl(nieuws, NIEUWS_CSS.replace("\n", ""), "nieuws.html", fouten)
    return nieuws


def bouw_home(index, alle, top, ag, vandaag, fouten):
    rest = [b for b in alle if b is not top]
    index = vervang_blok(index, "top", lead_html(top, sticker="Topnieuws", knop="Lees het nieuws"), "index.html", fouten)
    rijen = "".join(
        '<li><a href="/nieuws/%s"><img src="/%s" alt="" width="640" height="360" loading="lazy">'
        '<span class="hn-l-tekst"><span class="nb-meta">%s<time datetime="%s">%s</time></span><h3>%s</h3></span></a></li>' % (
            b["slug"], b["img"]["klein"], tag_html(b), b["d"].isoformat(), datum_kort(b["d"]), esc(b["kop"]))
        for b in rest[:MAX_NET_BINNEN])
    index = vervang_blok(index, "lijst", '<ul class="hn-lijst">%s</ul>' % rijen, "index.html", fouten)
    index = vervang_blok(index, "agenda", agenda_home(ag, vandaag), "index.html", fouten)
    index = vervang_stijl(index, NIEUWS_CSS.replace("\n", ""), "index.html", fouten)
    om = omschrijving_met("Superheldennieuws voor kinderen en ouders: ", [top] + rest, ", weetjes en eerlijke cadeautips.")
    if om:
        index = zet_meta(index, "description", om)
    return index


def rfc822(dt):
    # Engelse dag- en maandnamen ongeacht de taalinstelling van de machine (RSS eist RFC 822)
    dagen = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    maanden = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return "%s, %02d %s %d %02d:%02d:%02d %s" % (dagen[dt.weekday()], dt.day, maanden[dt.month - 1], dt.year,
                                                 dt.hour, dt.minute, dt.second, dt.strftime("%z"))


def bouw_feed(alle):
    nu = alle[0]
    items = []
    for b in alle[:MAX_FEED]:
        url = "%s/nieuws/%s" % (BASIS, b["slug"])
        dt = datetime.datetime.fromisoformat(iso_tijd(b["d"], b.get("tijd") or "08:00"))
        items.append(
            "<item><title>%s</title><link>%s</link><guid isPermaLink=\"true\">%s</guid><pubDate>%s</pubDate>"
            "<category>%s</category><description>%s</description>"
            "<enclosure url=\"%s/%s\" type=\"image/jpeg\" length=\"%d\"/></item>" % (
                esc(b["kop"]), url, url, rfc822(dt), esc(b["soort"]),
                esc(b["samenvatting"]), BASIS, b["img"]["16x9"],
                os.path.getsize(b["img"]["16x9"]) if os.path.exists(b["img"]["16x9"]) else 0))
    laatst = rfc822(datetime.datetime.fromisoformat(iso_tijd(nu["d"], nu.get("tijd") or "08:00")))
    return ('<?xml version="1.0" encoding="utf-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>'
            "<title>Superheldennieuws van Heldenshop</title><link>%s/nieuws</link>"
            '<atom:link href="%s/nieuws/feed.xml" rel="self" type="application/rss+xml"/>'
            "<description>Het laatste superheldennieuws voor kinderen en hun ouders: films, series, thuis kijken en wat eraan komt, met de leeftijd erbij.</description>"
            "<language>nl-nl</language><lastBuildDate>%s</lastBuildDate>%s</channel></rss>\n") % (BASIS, BASIS, laatst, "".join(items))


def bouw_sitemap(sitemap, alle):
    # bestaande berichtregels eruit, verse erin, direct onder /nieuws
    sitemap = re.sub(r"\s*<url><loc>%s/nieuws/[^<]+</loc>.*?</url>" % re.escape(BASIS), "", sitemap, flags=re.S)
    regels = "".join("\n  <url><loc>%s/nieuws/%s</loc><lastmod>%s</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>" % (
        BASIS, b["slug"], (b.get("bd") or b["d"]).isoformat()) for b in alle)
    nieuwste = max((b.get("bd") or b["d"]) for b in alle).isoformat()
    sitemap = re.sub(r"(<url><loc>%s/nieuws</loc><lastmod>)[^<]*(</lastmod>.*?</url>)" % re.escape(BASIS),
                     lambda m: m.group(1) + nieuwste + m.group(2), sitemap, count=1, flags=re.S)
    m = re.search(r"<url><loc>%s/nieuws</loc>.*?</url>" % re.escape(BASIS), sitemap, re.S)
    if m:
        sitemap = sitemap[:m.end()] + regels + sitemap[m.end():]
    else:
        sitemap = sitemap.replace("</urlset>", regels + "\n</urlset>")
    return sitemap


def bouw_zoekindex(appjs, alle, fouten):
    m = re.search(r"(var SEARCH_INDEX = )(\[.*?\]);", appjs, re.S)
    if not m:
        fouten.append("app.js: SEARCH_INDEX niet gevonden")
        return appjs
    try:
        idx = json.loads(m.group(2))
    except ValueError as e:
        fouten.append("app.js: SEARCH_INDEX is geen geldige JSON (%s)" % e)
        return appjs
    idx = [x for x in idx if not str(x.get("u", "")).startswith("/nieuws/")]
    plek = next((i + 1 for i, x in enumerate(idx) if x.get("u") == "/nieuws"), len(idx))
    nieuw = []
    for b in alle:
        k = " ".join([b["kop"], b["soort"], b.get("kort", ""), b["samenvatting"], b.get("zoekwoorden", ""), "nieuws"]).lower()
        k = re.sub(r"[^\w\s:+-]", " ", k)
        k = re.sub(r"\s+", " ", k).strip()
        nieuw.append({"t": b["kop"], "u": "/nieuws/" + b["slug"], "c": "Nieuws", "k": k})
    idx = idx[:plek] + nieuw + idx[plek:]
    return appjs[:m.start(2)] + json.dumps(idx, ensure_ascii=False, separators=(",", ":")) + appjs[m.end(2):]


# ------------------------------------------------------------------ controles
def interne_links(tekst):
    return set(re.findall(r'href="(/[^"#?]*)', tekst)) | set(re.findall(r'src="(/[^"#?]*)', tekst))


def bestaat(pad, nieuwe_paden):
    p = pad.split("#")[0].split("?")[0]
    if p.startswith(("/_vercel/", "/api/")):
        return True
    p = p.strip("/")
    kandidaten = ["index.html"] if p == "" else [p, p + ".html", os.path.join(p, "index.html")]
    return any(os.path.exists(k) or k in nieuwe_paden for k in kandidaten)


def controleer_pagina(naam, tekst, nieuwe_paden, fouten):
    for s in STREEPJES:
        if s in tekst:
            fouten.append("%s: bevat een gedachtestreepje (%s)" % (naam, s))
            break
    h1 = len(re.findall(r"<h1[\s>]", tekst))
    if h1 != 1:
        fouten.append("%s: %d keer een <h1>, moet er precies een zijn" % (naam, h1))
    for link in sorted(interne_links(tekst)):
        if not bestaat(link, nieuwe_paden):
            fouten.append("%s: dode interne link %s" % (naam, link))
    for m in re.finditer(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', tekst, re.S):
        try:
            json.loads(m.group(1))
        except ValueError as e:
            fouten.append("%s: JSON-LD is ongeldig (%s)" % (naam, e))
    for m in re.finditer(r"<img\b[^>]*>", tekst):
        if 'alt="' not in m.group(0):
            fouten.append("%s: beeld zonder alt-tekst: %s" % (naam, m.group(0)[:80]))


# ------------------------------------------------------------------ hoofdroutine
def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--controle", action="store_true", help="alleen controleren, niets wegschrijven")
    ap.add_argument("--paden", action="store_true", help="gewijzigde paden als JSON-lijst afdrukken")
    ap.add_argument("--vandaag", help="jjjj-mm-dd, standaard de datum in Nederland")
    args = ap.parse_args()
    if not (os.path.exists("index.html") and os.path.isdir(BRONMAP)):
        print("Draai dit vanuit de hoofdmap van de Heldenshop-repo (waar index.html en %s staan)." % BRONMAP)
        return 2
    if args.vandaag:
        vandaag = datetime.date.fromisoformat(args.vandaag)
    else:
        vandaag = datetime.datetime.now(AMS).date() if AMS else datetime.date.today()
    schrijf = not args.controle
    fouten, waarschuwingen = [], []

    berichten = []
    for pad in sorted(glob.glob(os.path.join(BRONMAP, "*.html"))):
        if os.path.basename(pad).startswith("_"):
            continue
        b = lees_bericht(pad, fouten, waarschuwingen)
        if b:
            berichten.append(b)
    slugs = [b["slug"] for b in berichten]
    for s in set(slugs):
        if slugs.count(s) > 1:
            fouten.append("slug '%s' komt %d keer voor" % (s, slugs.count(s)))
    if not berichten:
        fouten.append("geen enkel bericht gevonden in %s" % BRONMAP)
    # nieuwste eerst; op dezelfde dag de laatste tijd eerst, daarna volgorde
    berichten.sort(key=lambda b: (b["d"], b.get("tijd", ""), -b["volgorde"]), reverse=True)
    for b in berichten:
        if b["d"] > vandaag:
            fouten.append("%s: datum %s ligt in de toekomst" % (b["slug"], b["datum"]))
    ag = lees_agenda(vandaag, fouten, waarschuwingen)

    manifestpad = os.path.join(BRONMAP, "beelden.json")
    manifest = json.loads(lees(manifestpad)) if os.path.exists(manifestpad) else {}
    gewijzigd = set()
    for b in berichten:
        maak_beelden(b, manifest, schrijf, waarschuwingen, fouten, gewijzigd)
    register = lees(os.path.join("images", "BRONNEN.md")) if os.path.exists(os.path.join("images", "BRONNEN.md")) else ""
    for b in berichten:
        if ("nieuws-%s.jpg" % b["slug"]) not in register:
            waarschuwingen.append("%s: nieuws-%s.jpg staat niet in images/BRONNEN.md; zet de bron erbij (zonder regel geen beeld)" % (b["slug"], b["slug"]))
    if fouten:
        return afsluiten(fouten, waarschuwingen, [], args)

    # topnieuws: het nieuwste bericht met 'topnieuws: ja' van hooguit zeven dagen oud, anders het nieuwste
    kandidaten = [b for b in berichten if b["topnieuws"] and (vandaag - b["d"]).days <= TOP_MAX_DAGEN]
    top = kandidaten[0] if kandidaten else berichten[0]
    if (vandaag - top["d"]).days > TOP_MAX_DAGEN:
        waarschuwingen.append("topnieuws '%s' is %d dagen oud; schrijf een nieuw bericht (desnoods over wat eraan komt)" % (
            top["kop"], (vandaag - top["d"]).days))

    nieuws_oud = lees("nieuws.html")
    chrome = chrome_uit(nieuws_oud)
    uitvoer = {}
    for b in berichten:
        uitvoer[os.path.join("nieuws", b["slug"] + ".html")] = artikel_html(b, berichten, chrome, vandaag)
    uitvoer["nieuws.html"] = bouw_overzicht(nieuws_oud, berichten, top, ag, vandaag, fouten)
    uitvoer["index.html"] = bouw_home(lees("index.html"), berichten, top, ag, vandaag, fouten)
    uitvoer[os.path.join("nieuws", "feed.xml")] = bouw_feed(berichten)
    uitvoer["sitemap.xml"] = bouw_sitemap(lees("sitemap.xml"), berichten)
    uitvoer["app.js"] = bouw_zoekindex(lees("app.js"), berichten, fouten)

    nieuwe_paden = set(uitvoer) | gewijzigd
    for pad, tekst in uitvoer.items():
        if pad.endswith(".html"):
            controleer_pagina(pad, tekst, nieuwe_paden, fouten)
    # berichtpagina's die niet meer bij een bron horen
    for pad in glob.glob(os.path.join("nieuws", "*.html")):
        if pad not in uitvoer:
            waarschuwingen.append("%s heeft geen bron meer in %s; een bericht weghalen mag niet zonder doorverwijzing" % (pad, BRONMAP))
    if fouten:
        return afsluiten(fouten, waarschuwingen, [], args)

    if schrijf:
        os.makedirs("nieuws", exist_ok=True)
    for pad, tekst in uitvoer.items():
        oud = lees(pad) if os.path.exists(pad) else None
        if oud != tekst:
            gewijzigd.add(pad)
            if schrijf:
                with open(pad, "w", encoding="utf-8") as f:
                    f.write(tekst)
    if schrijf:
        nieuw_manifest = json.dumps(manifest, ensure_ascii=False, indent=1, sort_keys=True) + "\n"
        if not os.path.exists(manifestpad) or lees(manifestpad) != nieuw_manifest:
            with open(manifestpad, "w", encoding="utf-8") as f:
                f.write(nieuw_manifest)
            gewijzigd.add(manifestpad)
    print("%d berichten, topnieuws: %s" % (len(berichten), top["kop"]))
    print("agenda: %d nu te zien, %d binnenkort" % (len(ag["nu"]), len(ag["binnenkort"])))
    return afsluiten(fouten, waarschuwingen, sorted(gewijzigd), args)


def afsluiten(fouten, waarschuwingen, gewijzigd, args):
    for w in waarschuwingen:
        print("LET OP: " + w)
    if fouten:
        for f in fouten:
            print("FOUT: " + f)
        print("Niets weggeschreven: los eerst de fouten op.")
        return 1
    if args.controle:
        print("Controle geslaagd (niets weggeschreven). Zou wijzigen: %d bestanden." % len(gewijzigd))
    else:
        print("Gewijzigd: %d bestanden." % len(gewijzigd))
    if args.paden:
        print(json.dumps(gewijzigd, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
