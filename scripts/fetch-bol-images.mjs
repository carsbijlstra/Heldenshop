// Heldenshop — haalt productfoto's op via de bol Marketing Catalog API
// en zet ze in de productkaarten. Draait als Vercel build-stap.
//
// Nodig: env-variabelen BOL_CLIENT_ID en BOL_CLIENT_SECRET
// (Account > API toegang > "Client credentials voor de API" in het bol-partnerprogramma).
//
// Fail-safe: zonder sleutels of bij een API-fout blijven de placeholders staan
// en blijft de site gewoon werken (build faalt nooit hierop).

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ID = process.env.BOL_CLIENT_ID;
const SECRET = process.env.BOL_CLIENT_SECRET;

const ROOT = process.cwd();
const SUBDIRS = ['', 'gidsen'];

function log(...a) { console.log('[bol-images]', ...a); }

async function htmlFiles() {
  const out = [];
  for (const d of SUBDIRS) {
    const dir = path.join(ROOT, d);
    let names = [];
    try { names = await readdir(dir); } catch { continue; }
    for (const n of names) if (n.endsWith('.html')) out.push(path.join(dir, n));
  }
  return out;
}

// product-ID uit een bol-link halen (.../p/<slug>/<id>/ , ook ge-encodeerd in een partner-clicklink)
function idFromHref(href) {
  let s = href;
  try { s = decodeURIComponent(href); } catch {}
  const m = s.match(/\/p\/[^/]+\/(\d{8,})\//);
  return m ? m[1] : null;
}

async function getToken() {
  const auth = Buffer.from(`${ID}:${SECRET}`).toString('base64');
  const r = await fetch('https://login.bol.com/token?grant_type=client_credentials', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' }
  });
  if (!r.ok) throw new Error(`token ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.access_token;
}

// Probeer een afbeeldings-URL uit de API-respons te halen (meerdere mogelijke vormen).
function extractImage(j) {
  if (!j || typeof j !== 'object') return null;
  const tryArr = (arr) => {
    if (!Array.isArray(arr)) return null;
    for (const it of arr) {
      if (typeof it === 'string' && /^https?:\/\//.test(it)) return it;
      if (it && typeof it === 'object') {
        const u = it.url || it.imageUrl || it.href || it.src;
        if (u && /^https?:\/\//.test(u)) return u;
      }
    }
    return null;
  };
  return (
    tryArr(j.images) || tryArr(j.media) || tryArr(j.imageUrls) ||
    (j.image && (j.image.url || j.image)) ||
    (j.product && extractImage(j.product)) ||
    (Array.isArray(j.products) && extractImage(j.products[0])) ||
    null
  );
}

async function fetchProduct(token, id, debug) {
  // Marketing Catalog API — endpoint/vorm kan per accounttype iets verschillen;
  // we proberen het en loggen de eerste respons zodat we 'm exact kunnen afstellen.
  const url = `https://api.bol.com/marketing/catalog/v1/products/${id}`;
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  });
  const text = await r.text();
  if (debug) {
    log('--- BOL discovery: ruwe respons voor product', id, '(status ' + r.status + ') ---');
    log(text.slice(0, 1500));
    log('--- einde discovery ---');
  }
  if (!r.ok) return null;
  let j; try { j = JSON.parse(text); } catch { return null; }
  return extractImage(j);
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
    const titleMatch = c.match(/<h3>([\s\S]*?)<\/h3>/);
    const alt = escAttr(titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '') : 'Spider-Man speelgoed');
    // media-placeholder -> echte foto (rank-medaille blijft staan)
    c = c.replace('<div class="media placeholder"', '<div class="media"');
    c = c.replace(
      /<span class="ph-tag">[\s\S]*?<\/span>/,
      `<img src="${escAttr(img)}" alt="${alt}" loading="lazy" style="width:100%;height:100%;object-fit:contain;background:#fff">`
    );
    parts[k] = c;
  }
  return parts.join('<article class="card">');
}

async function main() {
  if (!ID || !SECRET) {
    log('Geen BOL_CLIENT_ID/SECRET ingesteld — placeholders blijven staan. (Site werkt gewoon.)');
    return;
  }
  const files = await htmlFiles();

  // verzamel unieke product-ID's uit alle kaarten
  const ids = new Set();
  for (const f of files) {
    const html = await readFile(f, 'utf8');
    const re = /href="([^"]*\/p\/[^"]*|[^"]*partner\.bol\.com[^"]*)"/g;
    let m;
    while ((m = re.exec(html))) { const id = idFromHref(m[1]); if (id) ids.add(id); }
  }
  log('gevonden product-ID\u0027s:', ids.size);
  if (!ids.size) return;

  let token;
  try { token = await getToken(); }
  catch (e) { log('Inloggen bij bol mislukt — placeholders blijven staan.', String(e)); return; }

  const imgById = new Map();
  let first = true;
  for (const id of ids) {
    try {
      const img = await fetchProduct(token, id, first);
      first = false;
      if (img) imgById.set(id, img);
    } catch (e) { log('product', id, 'overgeslagen:', String(e)); }
  }
  log('foto\u0027s gevonden voor', imgById.size, 'van', ids.size, 'producten');
  if (!imgById.size) { log('Geen foto\u0027s kunnen ophalen — placeholders blijven staan. Stuur de discovery-log hierboven door, dan stel ik de parser af.'); return; }

  let changed = 0;
  for (const f of files) {
    const before = await readFile(f, 'utf8');
    const after = injectInto(before, imgById);
    if (after !== before) { await writeFile(f, after); changed++; }
  }
  log('foto\u0027s geplaatst in', changed, 'bestanden. Klaar!');
}

main().catch((e) => { console.log('[bol-images] onverwachte fout (genegeerd):', String(e)); });
