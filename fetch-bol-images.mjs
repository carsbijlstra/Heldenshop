// Heldenshop — haalt productfoto's op via de bol Marketing Catalog API
// en zet ze in de productkaarten. Draait als Vercel build-stap.
//
// Nodig: env-variabelen BOL_CLIENT_ID en BOL_CLIENT_SECRET
// (bol-partnerprogramma > Account > API toegang > "Client credentials voor de API").
//
// Werkwijze (volgens de officiele Marketing Catalog API v1):
//   1. OAuth2 access-token ophalen (client credentials).
//   2. Per bol-product-ID (uit de "Bekijk bij bol"-links) -> EAN via /products/{bolProductId}/to-ean
//   3. Foto ophalen via /products/{ean}?country-code=NL&include-image=true  (header Accept-Language: nl)
//      met fallback op /products/{ean}/media
//   4. Foto in de kaart-placeholder zetten.
//
// Fail-safe: zonder sleutels of bij een API-fout blijven de placeholders staan
// en blijft de site gewoon werken (de build faalt hier nooit op).

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ID = process.env.BOL_CLIENT_ID;
const SECRET = process.env.BOL_CLIENT_SECRET;
const ROOT = process.cwd();
const SUBDIRS = ['', 'gidsen'];
const API = 'https://api.bol.com/marketing/catalog/v1';

const log = (...a) => console.log('[bol-images]', ...a);

async function htmlFiles() {
  const out = [];
  for (const d of SUBDIRS) {
    let names = [];
    try { names = await readdir(path.join(ROOT, d)); } catch { continue; }
    for (const n of names) if (n.endsWith('.html')) out.push(path.join(ROOT, d, n));
  }
  return out;
}

// bol-product-ID uit een bol-link halen (.../p/<slug>/<id>/ , ook ge-encodeerd in een partner-clicklink)
function idFromHref(href) {
  let s = href; try { s = decodeURIComponent(href); } catch {}
  const m = s.match(/\/p\/[^/]+\/(\d{8,})\//);
  return m ? m[1] : null;
}

async function getToken() {
  const auth = Buffer.from(`${ID}:${SECRET}`).toString('base64');
  const r = await fetch('https://login.bol.com/token?grant_type=client_credentials', {
    method: 'POST', headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' }
  });
  if (!r.ok) throw new Error(`token ${r.status}: ${await r.text()}`);
  return (await r.json()).access_token;
}

async function bolIdToEan(token, bolId) {
  const r = await fetch(`${API}/products/${bolId}/to-ean`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  return j && j.ean ? j.ean : null;
}

async function imageForEan(token, ean, debug) {
  // 1) hoofdfoto via product-endpoint
  const r = await fetch(`${API}/products/${ean}?country-code=NL&include-image=true`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Accept-Language': 'nl' }
  });
  const text = await r.text();
  if (debug) { log('--- BOL discovery (product', ean, 'status', r.status + ') ---'); log(text.slice(0, 900)); log('--- einde discovery ---'); }
  if (r.ok) {
    const j = JSON.parse(text);
    if (j && j.image && j.image.url) return j.image.url;
  }
  // 2) fallback: media-endpoint (grootste rendition)
  const m = await fetch(`${API}/products/${ean}/media`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  });
  if (!m.ok) return null;
  const mj = await m.json().catch(() => null);
  if (!mj || !Array.isArray(mj.images)) return null;
  for (const im of mj.images) {
    const rends = im.renditions || [];
    let best = null;
    for (const rr of rends) if (rr.url && (!best || (rr.width || 0) > (best.width || 0))) best = rr;
    if (best && best.url) return best.url;
  }
  return null;
}

function escAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }

function injectInto(html, imgById) {
  const parts = html.split('<article class="card">');
  for (let k = 1; k < parts.length; k++) {
    let c = parts[k];
    const hrefMatch = c.match(/href="([^"]*\/p\/[^"]*|[^"]*partner\.bol\.com[^"]*)"/);
    if (!hrefMatch) continue;
    const id = idFromHref(hrefMatch[1]);
    if (!id) continue;
    const img = imgById.get(id);
    if (!img) continue;
    const t = c.match(/<h3>([\s\S]*?)<\/h3>/);
    const alt = escAttr(t ? t[1].replace(/<[^>]+>/g, '') : 'Spider-Man speelgoed');
    c = c.replace('<div class="media placeholder"', '<div class="media"');
    c = c.replace(/<span class="ph-tag">[\s\S]*?<\/span>/,
      `<img src="${escAttr(img)}" alt="${alt}" loading="lazy" style="width:100%;height:100%;object-fit:contain;background:#fff">`);
    parts[k] = c;
  }
  return parts.join('<article class="card">');
}

async function main() {
  if (!ID || !SECRET) { log('Geen BOL_CLIENT_ID/SECRET — placeholders blijven staan. (Site werkt gewoon.)'); return; }
  const files = await htmlFiles();

  const ids = new Set();
  for (const f of files) {
    const html = await readFile(f, 'utf8');
    const re = /href="([^"]*\/p\/[^"]*|[^"]*partner\.bol\.com[^"]*)"/g;
    let m; while ((m = re.exec(html))) { const id = idFromHref(m[1]); if (id) ids.add(id); }
  }
  log('gevonden bol-product-ID\u0027s:', ids.size);
  if (!ids.size) return;

  let token;
  try { token = await getToken(); }
  catch (e) { log('Inloggen bij bol mislukt — placeholders blijven staan.', String(e)); return; }

  const imgById = new Map();
  let debug = true;
  for (const id of ids) {
    try {
      const ean = await bolIdToEan(token, id);
      if (!ean) { log('geen EAN voor', id); continue; }
      const img = await imageForEan(token, ean, debug);
      debug = false;
      if (img) imgById.set(id, img); else log('geen foto voor', id, '(ean', ean + ')');
    } catch (e) { log('product', id, 'overgeslagen:', String(e)); }
  }
  log('foto\u0027s gevonden voor', imgById.size, 'van', ids.size, 'producten');
  if (!imgById.size) { log('Geen foto\u0027s opgehaald — placeholders blijven staan. Stuur de discovery-log hierboven door als dit onverwacht is.'); return; }

  let changed = 0;
  for (const f of files) {
    const before = await readFile(f, 'utf8');
    const after = injectInto(before, imgById);
    if (after !== before) { await writeFile(f, after); changed++; }
  }
  log('foto\u0027s geplaatst in', changed, 'bestanden. Klaar!');
}

main().catch((e) => console.log('[bol-images] onverwachte fout (genegeerd):', String(e)));
