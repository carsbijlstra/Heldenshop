// Heldenshop: /api/uit, de uitgang naar bol met een eigen kliklog (kl-1, 28 september 2026; hier uitgerold op 6 oktober 2026 volgens het recept in claude/affiliate-doorlichting-2026-09.md, M7).
//
// WAAROM. bol telt elke aanroep van partner.bol.com als klik, ook onze eigen controles, en
// Vercel Analytics mist bezoekers met een adblocker. Elke productkaart en tekstlink gaat daarom
// via dit adres: /api/uit?naar=<partnerlink>. Deze functie meldt de klik bij de datakraan
// (/klik/log, met een eigen sitetoken, nooit de hoofdsleutel) en stuurt de bezoeker met een
// 302 door naar precies dezelfde partnerlink als voorheen. bol ziet dus niets anders.
// Plan en leesregels: claude/affiliate-doorlichting-2026-09.md (M7) in de kennisbank.
//
// Deze site heeft geen package.json met type module: CommonJS, net als api/products.js.
// Omgevingsvariabele in Vercel: KLIK_TOKEN (uit /klik/token?site=heldenshop.nl op de datakraan).
// Ontbreekt hij, dan wordt er niets gelogd en werkt de doorverwijzing gewoon.
//
// Eigen apparaat aanmelden: open éénmalig /api/uit?registreer=<naam> op dat apparaat; de hash
// van het adres gaat naar /klik/eigen en kliks vanaf dat apparaat tellen daarna als eigen.
// Geen IP-adres verlaat deze functie: alleen sha256(ip + token), 16 tekens.

const { createHash } = require('node:crypto');

const SITE_ID = process.env.BOL_SITE_ID || '1528404';
const HOST = 'heldenshop.nl';
const KRAAN = 'https://stocers-datakraan.carsbijlstra.workers.dev';

function hashIp(ip, token) {
  return createHash('sha256').update(String(ip || '') + '|' + String(token || '')).digest('hex').slice(0, 16);
}

async function meld(pad, params, token) {
  const u = new URL(KRAAN + pad);
  u.searchParams.set('site', HOST);
  u.searchParams.set('t', token);
  for (const [k, v] of Object.entries(params)) if (v) u.searchParams.set(k, String(v));
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 1500);
  try { return await fetch(u.toString(), { signal: ac.signal, headers: { Accept: 'application/json' } }); }
  finally { clearTimeout(timer); }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const token = process.env.KLIK_TOKEN || '';
  const ipRaw = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || '';
  const ipHash = hashIp(ipRaw, token);

  // Eigen apparaat aanmelden (geen doorverwijzing, geen klik).
  const registreer = req.query && req.query.registreer;
  if (registreer) {
    let uitkomst = 'geen KLIK_TOKEN, niets aangemeld';
    if (token) {
      try { const r = await meld('/klik/eigen', { ip: ipHash, naam: String(registreer).slice(0, 40) }, token); uitkomst = r.ok ? 'aangemeld als ' + String(registreer).slice(0, 40) : 'de kraan gaf ' + r.status; }
      catch (e) { uitkomst = 'de kraan was niet bereikbaar'; }
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Eigen apparaat: ' + uitkomst + '. Kliks vanaf dit apparaat tellen voortaan als eigen, niet als bezoeker.');
    return;
  }

  const naar = String((req.query && req.query.naar) || '');
  const geldig = naar.startsWith('https://partner.bol.com/click/click?') && new RegExp('[?&]s=' + SITE_ID + '(&|$)').test(naar);
  if (!geldig) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Ongeldige link.');
    return;
  }
  let subid = '', product = '';
  try {
    const u = new URL(naar);
    subid = u.searchParams.get('subid') || '';
    const doel = u.searchParams.get('url') || '';
    product = (doel.match(/\/(\d{7,16})\/?(?:[?#]|$)/) || [])[1] || '';
  } catch (e) {}
  let pad = '';
  try { const ref = String(req.headers['referer'] || ''); if (ref) { const ru = new URL(ref); pad = ru.hostname.endsWith(HOST) ? ru.pathname : ''; } } catch (e) {}
  const ua = String(req.headers['user-agent'] || '').slice(0, 120);

  if (token) {
    try { await meld('/klik/log', { subid, p: product, pad, r: pad ? '' : String(req.headers['referer'] || '').slice(0, 120), ua, ip: ipHash }, token); }
    catch (e) { /* het log mag de bezoeker nooit ophouden */ }
  }
  res.statusCode = 302;
  res.setHeader('Location', naar);
  res.end();
};
