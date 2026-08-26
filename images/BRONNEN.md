# Beeldregister Heldenshop

Elk beeldbestand in deze map hoort hier te staan, met de bron erbij. Doel: als iemand ooit vraagt waar een foto vandaan komt, is het antwoord binnen tien seconden te vinden en te bewijzen. Geen regel hier = het bestand hoort er niet.

Aangelegd 19 augustus 2026, bij het beeldbeleid in `claude/mandaten.md` (v8) van de kennisbank.

## Zo vul je het in

Eén regel per bestand, in deze vorm:

`bestandsnaam.jpg` — *wat het toont* — bron: URL — maker: naam — licentie: naam van de licentie — toegevoegd: datum

## Naamsvermelding (besluit Cars, 26 augustus 2026)

**Verplicht de licentie geen naamsvermelding, dan zetten we die er niet bij.** Dat geldt onder meer voor alles van Pexels. Wat wél altijd gebeurt is de registratie hier in dit bestand: dat is geen credit op de pagina maar de herkomstadministratie, en die is de enige manier om later te kunnen bewijzen waar een bestand vandaan komt. Vraagt een licentie wél om naamsvermelding (CC BY, CC BY-SA), dan komt die gewoon zichtbaar op de pagina te staan, anders mag het beeld er niet.

## Regels in het kort

Vrij te gebruiken: eigen beeld (mascotte, datumkaarten, illustraties), productfoto's die via de bol-API binnenkomen (die worden niet in deze map opgeslagen), en beeld uit vrije beeldbanken — Unsplash, Pexels, Pixabay, Wikimedia Commons, Openverse.

Twee dingen die een vrije licentie **niet** oplost, en die op deze site het snelst misgaan:

1. **Wat er op de foto staat.** De fotograaf mag zijn foto weggeven, maar hij mag Spider-Man niet weggeven. Een vrij gelicentieerde foto van een LEGO-minifiguur, een Funko Pop, een filmposter aan de muur of een kostuum in een wassenbeeldenmuseum toont nog steeds een beschermd personage. Niet gebruiken.
2. **Wie er op de foto staat.** Beeldbanken garanderen geen modelvrijgave. Herkenbare mensen — en zeker kinderen — niet gebruiken op een site met affiliate-links.

Verder: beeld wordt altijd hier in de repo gehost, nooit gehotlinkt naar een beeldbank. Beeldbank-bestanden komen binnen via de map `beeld-inbox/` in de kennisbank (de werkplaats kan zelf niet downloaden van de beeldbanken). Altijd een beschrijvende `alt`-tekst, `loading="lazy"`, en let op de bestandsgrootte — beeld dat de pagina traag maakt kost meer dan het oplevert.

## Register

### Nog te herleiden — bestanden van vóór dit register

Op 29 en 30 juni 2026 zijn 27 beeldbestanden geüpload (commits `4088866` en `a0f53b2`), van vóór het beeldbeleid. Van geen van deze bestanden is de bron vastgelegd. Ze staan op 92 van de 95 pagina's, samen goed voor ongeveer 370 verwijzingen — dit is het hele visuele gezicht van de site. Vrijwel allemaal tonen ze een beschermd personage en een deel is duidelijk pers- of filmbeeld; bij `wonder-woman-cut.png` en `geschiedenis-stan-lee.jpg` is bovendien een herkenbare persoon in beeld.

**Stand 26 augustus 2026: nog 26 van de 27 te vervangen.** `spider-man-hero.jpg` is die dag als eerste vervangen, en dat was meteen de grootste: dat bestand stond op 73 plekken.

**Herstelspoor:** de wekelijkse ronde vervangt deze bestanden stapsgewijs door eigen beeldtaal (de stijl van de mascotte en de datumkaarten) — eerst de twee met herkenbare mensen, dan de duidelijke filmstills, daarna de rest. Een behapbaar deel per ronde, register in dezelfde commit bijwerken, en het verdringt nooit het seizoenswerk voor september. Tot een bestand vervangen is komt er in deze categorie niets bij.

| Bestand | Toont | Bron |
|---|---|---|
### Toegevoegd onder het beeldbeleid

`hero/*.svg` (12 bestanden) — *eigen heropbeeld in de huisstijl, zelfde beeldtaal als de kaartbeelden maar in bannerformaat* — bron: eigen werk, gegenereerd met `gereedschap/kaartbeeld.py` — licentie: eigen werk Studio Bijlstra — **vervangt de laatste twaalf bestanden zonder bekende bron, waaronder de twee met een herkenbaar persoon in beeld (`geschiedenis-stan-lee.jpg` en `wonder-woman-cut.png`)** — toegevoegd: 26 augustus 2026

`batman-hero.jpg` — *iemand in een Batman-pak met masker, 's avonds in de stad* — bron: https://www.pexels.com/nl-nl/foto/x-15511010/ — licentie: Pexels-licentie (https://www.pexels.com/license/): gratis, commercieel toegestaan, bewerken toegestaan, naamsvermelding niet verplicht — bewerking: bijgesneden naar een brede band van 1600×780 en gecomprimeerd — toegevoegd: 26 augustus 2026

`superman-hero.jpg` — *een Superman-beeld dat hoog tegen een gebouw omhoog kijkt* — bron: https://www.pexels.com/nl-nl/foto/x-28245751/ — licentie: Pexels-licentie (https://www.pexels.com/license/): gratis, commercieel toegestaan, bewerken toegestaan, naamsvermelding niet verplicht — bewerking: bijgesneden naar een brede band van 1600×780 en gecomprimeerd — toegevoegd: 26 augustus 2026

`supergirl-hero.jpg` — *een superheldenfiguur met cape bij rood neonlicht* — bron: https://www.pexels.com/nl-nl/foto/x-28245750/ — licentie: Pexels-licentie (https://www.pexels.com/license/): gratis, commercieel toegestaan, bewerken toegestaan, naamsvermelding niet verplicht — bewerking: bijgesneden naar een brede band van 1600×780 en gecomprimeerd — toegevoegd: 26 augustus 2026

`star-wars-hero.jpg` — *twee figuren in zwarte helmen en pantser, achter elkaar* — bron: https://www.pexels.com/nl-nl/foto/x-9482199/ — licentie: Pexels-licentie (https://www.pexels.com/license/): gratis, commercieel toegestaan, bewerken toegestaan, naamsvermelding niet verplicht — bewerking: bijgesneden naar een brede band van 1600×780 en gecomprimeerd — toegevoegd: 26 augustus 2026

`super-mario-hero.jpg` — *speelfiguren van Mario en Yoshi naast elkaar* — bron: https://www.pexels.com/nl-nl/foto/x-163077/ — licentie: Pexels-licentie (https://www.pexels.com/license/): gratis, commercieel toegestaan, bewerken toegestaan, naamsvermelding niet verplicht — bewerking: bijgesneden naar een brede band van 1600×780 en gecomprimeerd — toegevoegd: 26 augustus 2026

`pokemon-hero.jpg` — *pakjes Pokemon-kaarten uitgespreid op een blauwe ondergrond* — bron: https://www.pexels.com/nl-nl/foto/x-7708408/ — licentie: Pexels-licentie (https://www.pexels.com/license/): gratis, commercieel toegestaan, bewerken toegestaan, naamsvermelding niet verplicht — bewerking: bijgesneden naar een brede band van 1600×780 en gecomprimeerd — toegevoegd: 26 augustus 2026

`harry-potter-hero.jpg` — *een toverstok op tafel bij een brandende haard* — bron: https://www.pexels.com/nl-nl/foto/x-7979111/ — licentie: Pexels-licentie (https://www.pexels.com/license/): gratis, commercieel toegestaan, bewerken toegestaan, naamsvermelding niet verplicht — bewerking: bijgesneden naar een brede band van 1600×780 en gecomprimeerd — toegevoegd: 26 augustus 2026

`frozen-hero.jpg` — *laarzen in de sneeuw, van bovenaf gezien* — bron: https://www.pexels.com/nl-nl/foto/x-5690752/ — licentie: Pexels-licentie (https://www.pexels.com/license/): gratis, commercieel toegestaan, bewerken toegestaan, naamsvermelding niet verplicht — bewerking: bijgesneden naar een brede band van 1600×780 en gecomprimeerd — toegevoegd: 26 augustus 2026

`paw-patrol-hero.jpg` — *een jonge hond die recht in de camera kijkt* — bron: https://www.pexels.com/nl-nl/foto/x-18074902/ — licentie: Pexels-licentie (https://www.pexels.com/license/): gratis, commercieel toegestaan, bewerken toegestaan, naamsvermelding niet verplicht — bewerking: bijgesneden naar een brede band van 1600×780 en gecomprimeerd — toegevoegd: 26 augustus 2026

`avengers-hero.jpg` — *de skyline van een grote stad bij zonsopkomst* — bron: https://www.pexels.com/nl-nl/foto/x-33319401/ — licentie: Pexels-licentie (https://www.pexels.com/license/): gratis, commercieel toegestaan, bewerken toegestaan, naamsvermelding niet verplicht — bewerking: bijgesneden naar een brede band van 1600×780 en gecomprimeerd — toegevoegd: 26 augustus 2026

`home-hero.jpg` — *uitzicht over een stad bij schemering* — bron: https://www.pexels.com/nl-nl/foto/x-33143671/ — licentie: Pexels-licentie (https://www.pexels.com/license/): gratis, commercieel toegestaan, bewerken toegestaan, naamsvermelding niet verplicht — bewerking: bijgesneden naar een brede band van 1600×780 en gecomprimeerd — toegevoegd: 26 augustus 2026

`guide-geschiedenis.jpg` — *een stapel stripboeken naast elkaar* — bron: https://www.pexels.com/nl-nl/foto/x-5553301/ — licentie: Pexels-licentie (https://www.pexels.com/license/): gratis, commercieel toegestaan, bewerken toegestaan, naamsvermelding niet verplicht — bewerking: bijgesneden naar een brede band van 1600×780 en gecomprimeerd — toegevoegd: 26 augustus 2026

`guide-films.jpg` — *popcorn die omhoog springt voor een bioscooplicht* — bron: https://www.pexels.com/nl-nl/foto/x-35623662/ — licentie: Pexels-licentie (https://www.pexels.com/license/): gratis, commercieel toegestaan, bewerken toegestaan, naamsvermelding niet verplicht — bewerking: bijgesneden naar een brede band van 1600×780 en gecomprimeerd — toegevoegd: 26 augustus 2026

`guide-krachten.jpg` — *iemand met een oplichtend zwaard in een donkere straat* — bron: https://www.pexels.com/nl-nl/foto/x-16904561/ — licentie: Pexels-licentie (https://www.pexels.com/license/): gratis, commercieel toegestaan, bewerken toegestaan, naamsvermelding niet verplicht — bewerking: bijgesneden naar een brede band van 1600×780 en gecomprimeerd — toegevoegd: 26 augustus 2026

`kaart/*.svg` (105 bestanden) — *eigen kaartbeeld per pagina: platte comic-vlakken in de huisstijl met halftone, speedlines, POW-ster en een motief dat het onderwerp toont* — bron: eigen werk, gegenereerd met `gereedschap/kaartbeeld.py` uit de kennisbank; het beeld wordt afgeleid uit de paginanaam, dus elke pagina heeft er een eigen — licentie: eigen werk Studio Bijlstra — toegevoegd: 26 augustus 2026

`spider-man-hero.jpg` — *iemand in een Spider-Man-kostuum zit op de rand van een dak en kijkt uit over een verlichte stad bij nacht; van achteren gefotografeerd, volledig masker, geen gezicht en geen andere herkenbare personen in beeld* — bron: https://www.pexels.com/nl-nl/foto/spider-man-bovenop-gebouw-2854693/ — maker: **Josh Hild** — licentie: Pexels-licentie (https://www.pexels.com/license/): gratis te gebruiken, commercieel toegestaan, bewerken toegestaan, naamsvermelding niet verplicht maar wij doen het toch — bewerking: bijgesneden van 1600×2000 naar een brede band van 1600×780 en gecomprimeerd voor het web — **vervangt het gelijknamige bestand van onbekende herkomst dat op 73 pagina's stond** — toegevoegd: 26 augustus 2026


`avengers-doomsday-still.jpg` — *krijgers van Wakanda schudden The Thing (Fantastic Four) de hand, woestijn met bevroren golf* — bron: https://www.filmdepot.nl/detail/34711/Avengers-Doomsday — film-ID 34711, media-ID 215035 (webversie, 1816×750), origineel `Avengers_-Doomsday_st_2_jpg_sd-low_2026-CTMG-All-Rights-Reserved-2026-MARVEL.jpg` — maker: Marvel Studios; distributie: The Walt Disney Company Netherlands — licentie: officieel Filmdepot-persmateriaal (geautoriseerd account Studio Bijlstra); credit "2026 CTMG. All Rights Reserved. & ™ 2026 MARVEL." staat als bijschrift op de pagina; onbewerkt geplaatst — **voorwaarde: verwijderen zodra het materiaal uit het depot gaat; de wekelijkse ronde controleert dit** — toegevoegd: 19 augustus 2026

`brand-new-day-still.jpg` — *Spider-Man zwiert in zijn nieuwe pak aan een web tussen twee wolkenkrabbers van New York door* — bron: https://www.filmdepot.nl/detail/36048/Spider-Man-Brand-New-Day — film-ID 36048, media-ID 207880 (webversie LR, 1790×750, 212 kB), origineel `Spider-Man_-Brand-New-Day_st_1_jpg_sd-low_2026-CTMG-All-Rights-Reserved-2026-MARVEL.jpg` — maker: Marvel Studios / Columbia Pictures; distributie: Sony Pictures Releasing via Universal Pictures International — licentie: officieel Filmdepot-persmateriaal (geautoriseerd account Studio Bijlstra); credit "2026 CTMG. All Rights Reserved. & ™ 2026 MARVEL." staat als bijschrift op de pagina; onbewerkt geplaatst op `spider-man-brand-new-day.html` — **voorwaarde: verwijderen zodra het materiaal uit het depot gaat; de wekelijkse ronde controleert dit** — toegevoegd: 24 augustus 2026
