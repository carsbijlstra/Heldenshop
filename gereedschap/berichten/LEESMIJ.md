# Berichten van Heldenshop: zo schrijf je er een

*Sinds 6 oktober 2026 krijgt elk nieuwsbericht een eigen pagina op `/nieuws/<slug>`. De berichten staan hier als bronbestand; `gereedschap/nieuws-bouwen.py` maakt er de pagina's van en werkt in dezelfde beweging `/nieuws`, de homepage, de sitemap, de zoekindex in `app.js`, de RSS-feed en de beelden bij. Deze map gaat niet mee de site op (`.vercelignore`). De opdracht van de nieuwsronde staat in de kennisbank: `claude/nieuwsronde-heldenshop.md`.*

## Een nieuw bericht in vijf stappen

1. Kopieer `_sjabloon.html` naar `<slug>.html`. De slug is de URL: kleine letters, cijfers en koppeltekens, met de woorden waarop mensen zoeken (`clayface-kijkwijzer-bekend`, niet `nieuws-22-oktober`). Een slug verandert nooit meer.
2. Vul de kopregels in (hieronder) en schrijf de tekst eronder in gewone HTML.
3. Kies het beeld. Past de foto van de pagina over het onderwerp (`images/paginas/<pagina>.jpg`), gebruik die. Anders een eigen Pexels-foto via Chrome op Boris, die je in `beeld/<slug>.jpg` zet. Nooit een Filmdepot-still, nooit kinderen, en minstens 1200 px breed.
4. Zet de regel voor `nieuws-<slug>.jpg` in `images/BRONNEN.md` (kopje "Nieuwsberichten").
5. Draai vanuit de hoofdmap van de repo: `python3 gereedschap/nieuws-bouwen.py --paden`. Dat bouwt alles en drukt de gewijzigde paden af voor de klus. Met `--controle` kijkt hij alleen.

## De kopregels

Tussen twee regels `---`, een veld per regel, `naam: waarde`. Platte tekst, gewoon in UTF-8 (é, ë, ï); alleen `bron` en de waarde achter `feit:` mogen HTML bevatten.

| Veld | Verplicht | Wat |
|---|---|---|
| `datum` | ja | Dag van publicatie op Heldenshop, `jjjj-mm-dd`. Niet de datum van de gebeurtenis; die staat in de tekst. |
| `tijd` | nee | Tijd van publicatie, `uu:mm`. Ordent berichten van dezelfde dag (de laatste bovenaan). |
| `bijgewerkt` | nee | `jjjj-mm-dd uu:mm` als je een bestaand bericht inhoudelijk aanvult. Dan zegt de pagina "bijgewerkt op". |
| `volgorde` | nee | Alleen nodig bij berichten met precies dezelfde datum en tijd: 1 komt boven 2. |
| `topnieuws` | nee | `ja` als dit groot genoeg is voor de kop van de homepage. Het nieuwste topnieuws van hooguit zeven dagen oud wint; is er geen, dan het nieuwste bericht. |
| `anker` | nee | Oud anker op `/nieuws#...` dat moet blijven werken. Alleen voor de zeven berichten van vóór 6 oktober. |
| `soort` | ja | Het label: Bioscoop, Thuis kijken, Streaming, Serie, Nieuwe film, Trailer, Record, Jubileum, Games, Speelgoed. Kleur en emoji volgen vanzelf. |
| `kop` | ja | De H1 en de kop op kaarten. Hooguit 110 tekens, liever onder de 70. |
| `titel` | nee | De `<title>` voor Google, als die anders moet dan de kop. Hooguit 60 tekens; past " \| Heldenshop" erachter, dan zet het gereedschap het erbij. |
| `kort` | ja, eigenlijk | Drie tot zes woorden, zoals "kaartjes voor Avengers: Doomsday". Gaat de metabeschrijving van de homepage en `/nieuws` in. |
| `omschrijving` | ja | De metabeschrijving, 70 tot 160 tekens. |
| `samenvatting` | ja | Een of twee zinnen voor de kaarten en de intro onder de kop. |
| `beeld` | ja | Pad vanaf de hoofdmap, bijvoorbeeld `images/paginas/lanterns.jpg` of `gereedschap/berichten/beeld/<slug>.jpg`. |
| `beeld_alt` | ja | Wat er echt op de foto staat. |
| `beeld_focus` | nee | `x,y` tussen 0 en 1, het punt waar de uitsnede omheen moet (standaard `0.5,0.5`). |
| `onderwerp` | ja | De pagina over het onderwerp, bijvoorbeeld `/clayface`. Daar komt de kaart "Meer over dit onderwerp" naartoe. |
| `onderwerp_naam` | nee | De tekst op die kaart. Standaard de H1 van die pagina. |
| `onderwerp_tekst` | nee | Een zin onder die kaart. |
| `zoekwoorden` | nee | Extra woorden voor de zoekfunctie van de site. |
| `feit` | nee, wel aangeraden | `Label \| Waarde`, een regel per feit. Samen het kader "In het kort" bovenaan: wanneer, waar, voor wie, hoe lang. |
| `bron` | ja | Waar het vandaan komt, met datum. |
| `schap_ids` | nee | Een tot drie bol-product-ID's, gescheiden door komma's, voor een productschap onder het bericht (sinds 6 oktober 2026). Alleen ID's die je via `/api/products?ids=` hebt nagemeten (prijs én levertijd terug), nooit uit de zoekroute. Het schap krijgt als subid `nieuws-<slug>`, dus per bericht is te zien wat het oplevert. |
| `schap_kop` | bij een schap | De H2 boven het schap, in gewone taal: waarom horen deze producten bij dit nieuws. |
| `schap_tekst` | bij een schap | Een of twee zinnen onder die kop; eindig met dat prijs en levertijd van bol komen. Geen prijs in de tekst. |

## De tekst

- Gewone HTML: `<h2>`, `<h3>`, `<p>`, `<ul>`, `<ol>`, `<div class="tablewrap"><table>...</table></div>`. Geen `<h1>`; de kop is de H1.
- Altijd een kader voor ouders: `<div class="callout parent"><p class="ct">&#128106; Voor ouders</p><p style="margin:0">...</p></div>`. De leeftijd uit een bron (Kijkwijzer, of wat de streamingdienst erbij zet), of dat er nog geen leeftijd bekend is.
- Eindig met "Lees verder" en links naar onze eigen pagina's.
- Geen gedachtestreepje, geen prijs, geen gerucht als feit, geen datum of rolverdeling die je niet uit een bron hebt.
- Een bericht moet de lezer iets opleveren: wat er gebeurde, wat het betekent, voor wie het is en waar je verder kunt lezen. Het gereedschap waarschuwt onder de 180 woorden. Is er niet meer te zeggen, dan is het geen eigen bericht maar een alinea op de onderwerppagina of een aanvulling op een bestaand bericht (`bijgewerkt`).

## agenda.json

`nu`: wat nu te zien is, in de volgorde waarin het op de site moet (het meest actuele bovenaan). Velden `waar`, `titel`, `link`, `tekst`, `leeftijd`, en `tot` (`jjjj-mm-dd`) voor iets dat op een bekende dag stopt; daarna verdwijnt het vanzelf van de site.

`binnenkort`: `datum` (`jjjj-mm-dd`), `land` (`NL` of `VS`), `titel`, `link`, `tekst`, `waar`, `leeftijd`. Een datum die voorbij is, verdwijnt vanzelf van de site; zet hem dan onder `nu` als hij nu te zien is. De homepage toont de eerste zes, `/nieuws` alles.

## Wat je niet doet

- Een bericht weghalen. Klopt er iets niet, verbeter het, zet `bijgewerkt` en zeg in de tekst wat er veranderde. Moet het echt weg, dan is dat een doorverwijzing in `vercel.json` en een besluit, geen ronde.
- Een slug wijzigen. De URL is van het bericht, voor altijd.
- `nieuws/*.html` met de hand bewerken: de volgende ronde bouwt ze opnieuw uit dit bronbestand.
