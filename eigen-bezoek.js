/* Studio Bijlstra, 6 oktober 2026 (M3 uit de affiliate-doorlichting van 28 september 2026):
   eigen bezoek buiten de bezoekcijfers houden. Open eenmalig <site>/?studio=eigen op een
   apparaat van de studio of van Cars; dat zet een vlag in de localStorage van deze site en
   vanaf dan telt Vercel Web Analytics dit apparaat niet meer mee als bezoeker.
   ?studio=bezoeker haalt de vlag weer weg. Geen cookie, niets gaat naar buiten; de vlag
   blijft op het apparaat zelf. Dit bestand moet VOOR /_vercel/insights/script.js staan. */
(function () {
  var SLEUTEL = 'studio-eigen-bezoek';
  var eigen = false, gezet = null;
  try {
    var q = new URLSearchParams(location.search).get('studio');
    if (q === 'eigen') { localStorage.setItem(SLEUTEL, '1'); gezet = 'aan'; }
    if (q === 'bezoeker') { localStorage.removeItem(SLEUTEL); gezet = 'uit'; }
    eigen = localStorage.getItem(SLEUTEL) === '1';
  } catch (e) { eigen = false; }
  if (gezet) {
    var melding = function () {
      var el = document.createElement('div');
      el.setAttribute('role', 'status');
      el.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;background:#1c2240;color:#fff;padding:12px 16px;border-radius:10px;font:15px/1.4 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.25)';
      el.textContent = gezet === 'aan'
        ? 'Studio: dit apparaat telt vanaf nu niet meer mee in de bezoekcijfers van deze site.'
        : 'Studio: dit apparaat telt weer gewoon mee als bezoeker.';
      document.body.appendChild(el);
      setTimeout(function () { el.remove(); }, 6000);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', melding); else melding();
  }
  if (!eigen) return;
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  window.va('beforeSend', function () { return null; });
})();
