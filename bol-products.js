/* Heldenshop — bol productkaarten (self-contained widget).
 *
 * GEBRUIK: zet ergens op een pagina:
 *   <div class="bol-shelf" data-bol-ids="9300000166566955,9300000124627771" data-bol-note="Held van het moment"></div>
 *   <script src="bol-products.js" defer></script>
 *
 * Het script haalt foto/titel/prijs/sterren op via /api/products en bouwt de kaarten.
 * De knop "Bekijk bij bol" opent in een nieuw tabblad met rel="sponsored".
 */
(function () {
  'use strict';

  // --- styles (injected once) ---
  var CSS = '' +
    '.bol-shelf{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:clamp(14px,2vw,22px)}' +
    '.bol-card{position:relative;display:flex;flex-direction:column;background:#fff;border:3px solid #1c2240;border-radius:22px;overflow:hidden;box-shadow:6px 6px 0 rgba(28,34,64,.14);min-height:392px;transition:transform .14s ease,box-shadow .14s ease}' +
    '.bol-card:hover{transform:translate(-2px,-2px);box-shadow:9px 9px 0 rgba(28,34,64,.18)}' +
    '.bol-card__imgwrap{position:relative;height:188px;background:radial-gradient(circle at 30% 25%, #ffffff 0, #eef1f8 100%);display:flex;align-items:center;justify-content:center;padding:14px;border-bottom:3px solid #1c2240}' +
    '.bol-card__imgwrap::before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(28,34,64,.10) 1.4px,transparent 1.5px);background-size:13px 13px;opacity:.5}' +
    '.bol-shelf .bol-card__img{position:relative;max-width:100%;max-height:100%;object-fit:contain;margin:0;border-radius:0}' +
    '.bol-card__note{position:absolute;top:10px;left:10px;z-index:2;background:var(--accent,#EE2A3C);color:#fff;font-family:"Fredoka",system-ui,sans-serif;font-weight:600;font-size:.72rem;padding:5px 11px;border-radius:999px;border:2px solid #1c2240;box-shadow:2px 2px 0 rgba(28,34,64,.2)}' +
    '.bol-card__body{display:flex;flex-direction:column;gap:7px;padding:15px 16px 16px;flex:1}' +
    '.bol-shelf .bol-card__title{font-family:"Fredoka",system-ui,sans-serif;font-weight:600;font-size:1rem;line-height:1.22;color:#1c2240;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
    '.bol-card__stars{display:flex;align-items:center;gap:6px;font-size:.84rem;color:#6A7099;font-weight:700}' +
    '.bol-card__stars b{color:#1c2240}' +
    '.bol-star{color:#FFB400;letter-spacing:1px}' +
    '.bol-card__price{font-family:"Fredoka",system-ui,sans-serif;font-weight:700;font-size:1.5rem;color:#EE2A3C;line-height:1;margin-top:2px}' +
    '.bol-card__price span{font-size:.72rem;color:#9aa0bd;font-weight:600;font-family:"Nunito",system-ui,sans-serif}' +
    '.bol-card__deliv{font-size:.78rem;color:#2E9E4F;font-weight:700}' +
    '.bol-shelf .bol-card__btn{margin-top:auto;display:flex;align-items:center;justify-content:center;gap:7px;text-decoration:none!important;background:#0a50e6;color:#fff!important;font-family:"Fredoka",system-ui,sans-serif;font-weight:600;font-size:1rem;padding:13px 16px;border-radius:999px;border:2.5px solid #1c2240;box-shadow:0 4px 0 #1c2240;transition:transform .12s ease,box-shadow .12s ease}' +
    '.bol-shelf .bol-card__btn:hover{transform:translateY(2px);box-shadow:0 2px 0 #1c2240}' +
    '.bol-shelf .bol-card__btn:active{transform:translateY(4px);box-shadow:0 0 0 #1c2240}' +
    '.bol-disc{grid-column:1/-1;font-size:.76rem;color:#8a8fb0;font-weight:600;margin-top:2px}' +
    '.bol-skel .bol-card__title,.bol-skel .bol-card__price,.bol-skel .bol-card__stars{background:#eceff6;color:transparent;border-radius:7px;min-height:14px}' +
    '.bol-skel .bol-card__img{width:60%;height:60%;background:#eceff6;border-radius:10px}' +
    '.bol-skel{animation:bolpulse 1.3s ease-in-out infinite}' +
    '@keyframes bolpulse{0%,100%{opacity:1}50%{opacity:.55}}' +
    '@media (prefers-reduced-motion: reduce){.bol-card,.bol-shelf .bol-card__btn,.bol-skel{transition:none;animation:none}}';


  // Redactionele keuzelijst: de tekst hoort bij het product en verdwijnt ermee.
  var PICKCSS = '' +
    '.bol-picktable{width:100%;border-collapse:separate;border-spacing:0;border:3px solid #1c2240;border-radius:18px;overflow:hidden;margin:22px 0;font-size:.94rem;background:#fff}' +
    '.bol-picktable th,.bol-picktable td{padding:11px 13px;text-align:left;border-bottom:2px solid #e6e9f3;vertical-align:top}' +
    '.bol-picktable thead th{background:#1c2240;color:#fff;font-family:"Fredoka",system-ui,sans-serif;font-weight:600;border-bottom:none;font-size:.9rem}' +
    '.bol-picktable tbody tr:last-child th,.bol-picktable tbody tr:last-child td{border-bottom:none}' +
    '.bol-picktable tbody th{font-family:"Fredoka",system-ui,sans-serif;font-weight:600;color:#1c2240;white-space:normal}' +
    '.bol-picktable a{color:#0a50e6;font-weight:700}' +
    '.bol-picktable .pt-price{font-family:"Fredoka",system-ui,sans-serif;font-weight:700;color:#EE2A3C;white-space:nowrap}' +
    '.bol-picktable-wrap{overflow-x:auto}' +
    '.bol-pick{display:block;background:#fff;border:3px solid #1c2240;border-radius:22px;box-shadow:6px 6px 0 rgba(28,34,64,.14);padding:16px;margin:20px 0;scroll-margin-top:90px}' +
    '.bol-pick.is-ready{display:grid;grid-template-columns:150px 1fr;gap:16px}' +
    '@media (max-width:620px){.bol-pick.is-ready{grid-template-columns:1fr}}' +
    '.bol-pick__official{font-size:.82rem;color:#8a8fb0;font-weight:600;margin:0 0 8px;line-height:1.35}' +
    '.bol-pick__figure{display:flex;align-items:flex-start;justify-content:center;background:radial-gradient(circle at 30% 25%,#fff 0,#eef1f8 100%);border:2px solid #1c2240;border-radius:14px;padding:10px;min-height:130px}' +
    '.bol-pick__figure img{max-width:100%;max-height:190px;object-fit:contain;margin:0}' +
    '.bol-pick__label{display:inline-block;background:var(--accent,#EE2A3C);color:#fff;font-family:"Fredoka",system-ui,sans-serif;font-weight:600;font-size:.76rem;padding:5px 12px;border-radius:999px;border:2px solid #1c2240;margin-bottom:8px}' +
    '.bol-pick h3{font-family:"Fredoka",system-ui,sans-serif;font-weight:600;font-size:1.12rem;line-height:1.25;color:#1c2240;margin:0 0 6px}' +
    '.bol-pick__meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin:0 0 10px;font-size:.86rem;color:#6A7099;font-weight:700}' +
    '.bol-pick__meta .bol-pick__price{font-family:"Fredoka",system-ui,sans-serif;font-size:1.3rem;color:#EE2A3C}' +
    '.bol-pick__meta .bol-pick__deliv{color:#2E9E4F}' +
    '.bol-pick__norating{color:#8a8fb0;font-weight:700}' +
    '.bol-pick__why{margin:0 0 10px;line-height:1.55}' +
    '.bol-pick__cols{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;margin:0 0 12px}' +
    '@media (max-width:520px){.bol-pick__cols{grid-template-columns:1fr}}' +
    '.bol-pick__cols h4{font-family:"Fredoka",system-ui,sans-serif;font-weight:600;font-size:.9rem;margin:0 0 4px;color:#1c2240}' +
    '.bol-pick__cols ul{margin:0;padding-left:18px;font-size:.9rem;line-height:1.5}' +
    '.bol-pick__cols li{margin:0 0 3px}' +
    '.bol-pick__plus li::marker{content:"✓  ";color:#2E9E4F;font-weight:700}' +
    '.bol-pick__min li::marker{content:"•  ";color:#c26a28;font-weight:700}' +
    '.bol-pick__for{font-size:.88rem;color:#3c4267;font-weight:700;margin:0 0 12px}' +
    '.bol-pick__btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;text-decoration:none!important;background:#0a50e6;color:#fff!important;font-family:"Fredoka",system-ui,sans-serif;font-weight:600;font-size:.98rem;padding:11px 20px;border-radius:999px;border:2.5px solid #1c2240;box-shadow:0 4px 0 #1c2240;transition:transform .12s ease,box-shadow .12s ease}' +
    '.bol-pick__btn:hover{transform:translateY(2px);box-shadow:0 2px 0 #1c2240}' +
    '.bol-picks-empty{display:none}' +
    '@media (prefers-reduced-motion: reduce){.bol-pick__btn{transition:none}}';

  function injectCSS() {
    if (document.getElementById('bol-products-css')) return;
    var s = document.createElement('style');
    s.id = 'bol-products-css';
    s.textContent = CSS + PICKCSS;
    document.head.appendChild(s);
  }

  function euro(n) {
    if (n == null) return '';
    return '€\u00a0' + Number(n).toFixed(2).replace('.', ',');
  }

  function stars(rating, count) {
    if (rating == null) return '';
    var full = Math.round(rating);
    var s = '';
    for (var i = 1; i <= 5; i++) s += (i <= full ? '\u2605' : '\u2606');
    var txt = String(rating).replace('.', ',');
    return '<span class="bol-star">' + s + '</span> <b>' + txt + '</b>' + (count ? ' \u00b7 ' + count + ' reviews' : '');
  }

  // The "Bekijk bij bol" link. The API returns the plain product URL; tracking
  // params are added centrally here so commission is always attributed.
  function affiliateHref(p) {
    return p.affiliateUrl || p.url || '#';
  }

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function skeletonCard(note) {
    return '<article class="bol-card bol-skel" aria-hidden="true">' +
      '<div class="bol-card__imgwrap">' + (note ? '<span class="bol-card__note">' + esc(note) + '</span>' : '') + '<div class="bol-card__img"></div></div>' +
      '<div class="bol-card__body"><h3 class="bol-card__title">\u00a0</h3><div class="bol-card__stars">\u00a0</div><div class="bol-card__price">\u00a0</div>' +
      '<a class="bol-card__btn" href="#" tabindex="-1">Laden\u2026</a></div></article>';
  }

  // Een kaart is alleen bruikbaar als hij een naam heeft, een prijs heeft en naar een
  // echte bol-productpagina wijst. De catalogus geeft soms een half record terug: geen
  // titel en een link naar een losse afbeelding, of een product dat niet meer te
  // bestellen is. Zo'n kaart oogt niet kapot maar leidt nergens heen; die tonen we niet.
  function usable(p) {
    if (!p || p.error) return false;
    if (!p.title) return false;
    if (p.price == null) return false;
    return /^https?:\/\/(www\.)?bol\.com\//i.test(p.url || '');
  }

  function realCard(p, note) {
    if (!usable(p)) return '';
    var href = affiliateHref(p);
    var img = p.image
      ? '<img class="bol-card__img" src="' + esc(p.image) + '" alt="' + esc(p.title || 'Productfoto') + ' kopen bij bol" loading="lazy">'
      : '<div class="bol-card__img"></div>';
    return '<article class="bol-card">' +
      '<div class="bol-card__imgwrap">' + (note ? '<span class="bol-card__note">' + esc(note) + '</span>' : '') + img + '</div>' +
      '<div class="bol-card__body">' +
        '<h3 class="bol-card__title">' + esc(p.title || 'Bekijk dit product') + '</h3>' +
        (p.rating != null ? '<div class="bol-card__stars">' + stars(p.rating, p.ratingCount) + '</div>' : '') +
        (p.price != null ? '<div class="bol-card__price">' + euro(p.price) + ' <span>richtprijs</span></div>' : '') +
        (p.delivery ? '<div class="bol-card__deliv">' + esc(p.delivery) + '</div>' : '') +
        '<a class="bol-card__btn" href="' + esc(href) + '" target="_blank" rel="sponsored noopener" aria-label="Bekijk ' + esc(p.title || 'dit product') + ' bij bol (opent in nieuw tabblad)">Bekijk bij bol \u2197</a>' +
      '</div></article>';
  }

  var DISC = '<p class="bol-disc">Prijzen zijn richtprijzen; de actuele prijs zie je bij bol. Via onze links verdienen wij een kleine commissie.</p>';

  function renderShelf(shelf, products) {
    var note = shelf.getAttribute('data-bol-note') || '';
    var html = (products || []).map(function (p) { return realCard(p, note); }).join('');
    shelf.innerHTML = html.replace(/\s/g, '') ? (html + DISC) : '';
  }


  // --- Redactionele keuzelijst -------------------------------------------------
  // Een <article class="bol-pick" data-bol-id="..."> bevat de tekst van de redactie:
  // waarom deze keuze, plussen, minnen en voor wie hij bedoeld is. Het script hangt
  // daar de levende productgegevens omheen (foto, titel, sterren, prijs, knop).
  // Valt het product bij bol weg, dan verdwijnt het hele blok inclusief die tekst.
  // Zo kan er nooit een aanbeveling blijven staan bij een product dat er niet meer is.

  function pickList(el, attr, kop, cls) {
    var bron = el.querySelector('[' + attr + ']');
    if (!bron) return '';
    return '<div><h4>' + kop + '</h4><ul class="' + cls + '">' + bron.innerHTML + '</ul></div>';
  }

  function renderPick(el, p) {
    if (!usable(p)) { el.parentNode && el.parentNode.removeChild(el); return false; }

    var label = el.getAttribute('data-pick-label') || '';
    var voor = el.getAttribute('data-pick-for') || '';
    var naamEl = el.querySelector('[data-pick-name]');
    var naam = naamEl ? naamEl.innerHTML : esc(p.title);
    var whyEl = el.querySelector('[data-pick-why]');
    var why = whyEl ? whyEl.innerHTML : '';
    var plus = pickList(el, 'data-pick-plus', 'Pluspunten', 'bol-pick__plus');
    var min = pickList(el, 'data-pick-min', 'Let op', 'bol-pick__min');

    var beoordeling = (p.rating != null && p.ratingCount)
      ? '<span>' + stars(p.rating, p.ratingCount) + '</span>'
      : '<span class="bol-pick__norating">Nog geen beoordelingen bij bol</span>';

    el.innerHTML =
      '<div class="bol-pick__figure">' +
        (p.image ? '<img src="' + esc(p.image) + '" alt="' + esc(p.title) + '" loading="lazy">' : '') +
      '</div>' +
      '<div class="bol-pick__body">' +
        (label ? '<span class="bol-pick__label">' + esc(label) + '</span>' : '') +
        '<h3>' + naam + '</h3>' +
        '<p class="bol-pick__official">Bij bol: ' + esc(p.title) + '</p>' +
        '<div class="bol-pick__meta">' +
          '<span class="bol-pick__price">' + euro(p.price) + '</span>' +
          beoordeling +
          (p.delivery ? '<span class="bol-pick__deliv">' + esc(p.delivery) + '</span>' : '') +
        '</div>' +
        (why ? '<p class="bol-pick__why">' + why + '</p>' : '') +
        ((plus || min) ? '<div class="bol-pick__cols">' + plus + min + '</div>' : '') +
        (voor ? '<p class="bol-pick__for">Past bij: ' + esc(voor) + '</p>' : '') +
        '<a class="bol-pick__btn" href="' + esc(affiliateHref(p)) + '" target="_blank" rel="sponsored noopener" aria-label="Bekijk ' + esc(p.title) + ' bij bol (opent in nieuw tabblad)">Bekijk bij bol ↗</a>' +
      '</div>';
    el.className = 'bol-pick is-ready';
    return true;
  }

  // De keuzehulp bovenaan wordt uit dezelfde gegevens gebouwd, zodat er nooit een
  // prijs in de tekst staat die niet meer klopt.
  function buildPickTable(byId) {
    var tabel = document.querySelector('[data-pick-table]');
    if (!tabel) return;
    var picks = Array.prototype.slice.call(document.querySelectorAll('.bol-pick[data-bol-id]'));
    var rijen = '';
    picks.forEach(function (el, i) {
      var p = byId[el.getAttribute('data-bol-id')];
      if (!usable(p)) return;
      var anker = 'keuze-' + (i + 1);
      el.id = anker;
      rijen += '<tr>' +
        '<th scope="row"><a href="#' + anker + '">' + esc(el.getAttribute('data-pick-label') || p.title) + '</a></th>' +
        '<td>' + esc(el.getAttribute('data-pick-for') || '') + '</td>' +
        '<td>' + esc(el.getAttribute('data-pick-short') || '') + '</td>' +
        '<td class="pt-price">' + euro(p.price) + '</td>' +
        '</tr>';
    });
    if (!rijen) { tabel.style.display = 'none'; return; }
    tabel.innerHTML = '<div class="bol-picktable-wrap"><table class="bol-picktable">' +
      '<thead><tr><th scope="col">Onze keuze</th><th scope="col">Voor wie</th><th scope="col">Wat het is</th><th scope="col">Prijs</th></tr></thead>' +
      '<tbody>' + rijen + '</tbody></table></div>';
  }

  function init() {
    var shelves = Array.prototype.slice.call(document.querySelectorAll('.bol-shelf[data-bol-ids],.bol-shelf[data-bol-query]'));
    var picks = Array.prototype.slice.call(document.querySelectorAll('.bol-pick[data-bol-id]'));
    if (!shelves.length && !picks.length) return;
    injectCSS();

    var idShelves = [];
    var allIds = [];
    shelves.forEach(function (shelf) {
      var note = shelf.getAttribute('data-bol-note') || '';
      var query = (shelf.getAttribute('data-bol-query') || '').trim();
      if (query) {
        var max = parseInt(shelf.getAttribute('data-bol-max'), 10) || 3;
        var sk = ''; for (var i = 0; i < max; i++) sk += skeletonCard(note);
        shelf.innerHTML = sk;
        fetch('/api/products?q=' + encodeURIComponent(query) + '&max=' + max)
          .then(function (r) { return r.json(); })
          .then(function (data) { renderShelf(shelf, data.products); })
          .catch(function () { shelf.innerHTML = ''; });
      } else {
        var ids = (shelf.getAttribute('data-bol-ids') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        shelf._ids = ids;
        shelf.innerHTML = ids.map(function () { return skeletonCard(note); }).join('');
        ids.forEach(function (id) { if (allIds.indexOf(id) < 0) allIds.push(id); });
        idShelves.push(shelf);
      }
    });

    picks.forEach(function (el) {
      var id = (el.getAttribute('data-bol-id') || '').trim();
      if (id && allIds.indexOf(id) < 0) allIds.push(id);
    });

    if (allIds.length) {
      // In porties van drie ophalen. De proxy doet per product vier aanvragen bij bol;
      // zes ID's in een keer duurt daardoor te lang en levert een leeg antwoord op,
      // waarna alle vastgezette schappen tegelijk leeg blijven. Drie past ruim.
      var CHUNK = 3;
      var groepen = [];
      for (var g = 0; g < allIds.length; g += CHUNK) groepen.push(allIds.slice(g, g + CHUNK));
      Promise.all(groepen.map(function (groep) {
        return fetch('/api/products?ids=' + encodeURIComponent(groep.join(',')))
          .then(function (r) { return r.json(); })
          .then(function (data) { return (data && data.products) || []; })
          .catch(function () { return []; });
      })).then(function (delen) {
        var byId = {};
        delen.forEach(function (lijst) {
          lijst.forEach(function (p) { if (p && p.id) byId[p.id] = p; });
        });
        idShelves.forEach(function (shelf) {
          renderShelf(shelf, shelf._ids.map(function (id) { return byId[id]; }));
        });
        buildPickTable(byId);
        picks.forEach(function (el) { renderPick(el, byId[el.getAttribute('data-bol-id')]); });
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
