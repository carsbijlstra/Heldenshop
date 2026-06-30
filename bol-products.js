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
    '.bol-card__img{position:relative;max-width:100%;max-height:100%;object-fit:contain}' +
    '.bol-card__note{position:absolute;top:10px;left:10px;z-index:2;background:var(--accent,#EE2A3C);color:#fff;font-family:"Fredoka",system-ui,sans-serif;font-weight:600;font-size:.72rem;padding:5px 11px;border-radius:999px;border:2px solid #1c2240;box-shadow:2px 2px 0 rgba(28,34,64,.2)}' +
    '.bol-card__body{display:flex;flex-direction:column;gap:7px;padding:15px 16px 16px;flex:1}' +
    '.bol-card__title{font-family:"Fredoka",system-ui,sans-serif;font-weight:600;font-size:1rem;line-height:1.22;color:#1c2240;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
    '.bol-card__stars{display:flex;align-items:center;gap:6px;font-size:.84rem;color:#6A7099;font-weight:700}' +
    '.bol-card__stars b{color:#1c2240}' +
    '.bol-star{color:#FFB400;letter-spacing:1px}' +
    '.bol-card__price{font-family:"Fredoka",system-ui,sans-serif;font-weight:700;font-size:1.5rem;color:#EE2A3C;line-height:1;margin-top:2px}' +
    '.bol-card__price span{font-size:.72rem;color:#9aa0bd;font-weight:600;font-family:"Nunito",system-ui,sans-serif}' +
    '.bol-card__deliv{font-size:.78rem;color:#2E9E4F;font-weight:700}' +
    '.bol-card__btn{margin-top:auto;display:flex;align-items:center;justify-content:center;gap:7px;text-decoration:none;background:#0a50e6;color:#fff;font-family:"Fredoka",system-ui,sans-serif;font-weight:600;font-size:1rem;padding:13px 16px;border-radius:999px;border:2.5px solid #1c2240;box-shadow:0 4px 0 #1c2240;transition:transform .12s ease,box-shadow .12s ease}' +
    '.bol-card__btn:hover{transform:translateY(2px);box-shadow:0 2px 0 #1c2240}' +
    '.bol-card__btn:active{transform:translateY(4px);box-shadow:0 0 0 #1c2240}' +
    '.bol-disc{grid-column:1/-1;font-size:.76rem;color:#8a8fb0;font-weight:600;margin-top:2px}' +
    '.bol-skel .bol-card__title,.bol-skel .bol-card__price,.bol-skel .bol-card__stars{background:#eceff6;color:transparent;border-radius:7px;min-height:14px}' +
    '.bol-skel .bol-card__img{width:60%;height:60%;background:#eceff6;border-radius:10px}' +
    '.bol-skel{animation:bolpulse 1.3s ease-in-out infinite}' +
    '@keyframes bolpulse{0%,100%{opacity:1}50%{opacity:.55}}' +
    '@media (prefers-reduced-motion: reduce){.bol-card,.bol-card__btn,.bol-skel{transition:none;animation:none}}';

  function injectCSS() {
    if (document.getElementById('bol-products-css')) return;
    var s = document.createElement('style');
    s.id = 'bol-products-css';
    s.textContent = CSS;
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

  function realCard(p, note) {
    if (!p || p.error || (!p.title && !p.image)) return '';
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

  function init() {
    var shelves = Array.prototype.slice.call(document.querySelectorAll('.bol-shelf[data-bol-ids],.bol-shelf[data-bol-query]'));
    if (!shelves.length) return;
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

    if (allIds.length) {
      fetch('/api/products?ids=' + encodeURIComponent(allIds.join(',')))
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var byId = {};
          (data.products || []).forEach(function (p) { byId[p.id] = p; });
          idShelves.forEach(function (shelf) {
            renderShelf(shelf, shelf._ids.map(function (id) { return byId[id]; }));
          });
        })
        .catch(function () { idShelves.forEach(function (shelf) { shelf.innerHTML = ''; }); });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
