// Heldenshop — bol Marketing Catalog API proxy (Vercel serverless function).
//
// WHY THIS EXISTS: bol's product data (foto, titel, prijs, beoordeling) can only be
// fetched server-side with your secret credentials. This function does that securely;
// your Secret never reaches the browser. The frontend calls /api/products?ids=...
//
// SETUP (eenmalig, in Vercel → Project → Settings → Environment Variables):
//   BOL_CLIENT_ID      = <jouw Client ID>
//   BOL_CLIENT_SECRET  = <jouw Secret key>
// Daarna opnieuw deployen (Vercel → Deployments → Redeploy).
//
// Test:  https://heldenshop.nl/api/products?ids=9300000166566955&debug=1

const TOKEN_URL = 'https://login.bol.com/token?grant_type=client_credentials';
const BASE = 'https://api.bol.com/marketing/catalog/v1';
const SITE_ID = process.env.BOL_SITE_ID || '1528404';

// Build a commission-tracked bol affiliate deeplink from a product URL + name.
function buildAffiliateUrl(productUrl, name) {
  if (!productUrl) return null;
  return 'https://partner.bol.com/click/click?p=2&t=url&s=' + SITE_ID + '&f=TXL&url=' + encodeURIComponent(productUrl) + '&name=' + encodeURIComponent(name || '');
}

let cachedToken = null; // { token, exp }

async function getToken() {
  const id = process.env.BOL_CLIENT_ID;
  const secret = process.env.BOL_CLIENT_SECRET;
  if (!id || !secret) {
    const err = new Error('Ontbrekende credentials: zet BOL_CLIENT_ID en BOL_CLIENT_SECRET als Environment Variables in Vercel.');
    err.code = 'NO_CREDENTIALS';
    throw err;
  }
  const now = Date.now();
  if (cachedToken && cachedToken.exp > now + 15000) return cachedToken.token;
  const basic = Buffer.from(id + ':' + secret).toString('base64');
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + basic, Accept: 'application/json' }
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    const err = new Error('Token-aanvraag mislukt (' + r.status + '). Controleer of de credentials kloppen en het account is goedgekeurd.');
    err.code = 'TOKEN_FAILED';
    err.detail = body.slice(0, 300);
    throw err;
  }
  const j = await r.json();
  cachedToken = { token: j.access_token, exp: now + (j.expires_in || 290) * 1000 };
  return cachedToken.token;
}

async function apiGet(path, token) {
  const r = await fetch(BASE + path, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json', 'Accept-Language': 'nl' }
  });
  const text = await r.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { json = { __raw: text.slice(0, 300) }; }
  return { ok: r.ok, status: r.status, json };
}

// --- defensive extractors (bol response shapes can vary) ---
function findFirst(obj, pred, depth) {
  depth = depth || 0;
  if (obj == null || depth > 7) return undefined;
  if (Array.isArray(obj)) {
    for (const v of obj) { const r = findFirst(v, pred, depth + 1); if (r !== undefined) return r; }
    return undefined;
  }
  if (typeof obj === 'object') {
    for (const k of Object.keys(obj)) { const hit = pred(k, obj[k]); if (hit !== undefined) return hit; }
    for (const k of Object.keys(obj)) { const r = findFirst(obj[k], pred, depth + 1); if (r !== undefined) return r; }
  }
  return undefined;
}

function extractTitle(product) {
  return findFirst(product, (k, v) => (/title|name/i.test(k) && typeof v === 'string' && v.trim().length > 2) ? v.trim() : undefined);
}
function extractUrl(obj) {
  // prefer a bol product URL
  const productUrl = findFirst(obj, (k, v) => (typeof v === 'string' && /^https?:\/\/[^ ]*bol\.com\/.*\/p(roduct)?s?\//i.test(v)) ? v : undefined);
  if (productUrl) return productUrl;
  return findFirst(obj, (k, v) => (/url/i.test(k) && typeof v === 'string' && /^https?:\/\//.test(v) && /bol\.com/.test(v)) ? v : undefined);
}
function extractImage(media) {
  // bol shape: { images: [ { order, renditions: [ {width,height,url} ] } ] }
  const images = media && media.images;
  if (Array.isArray(images) && images.length) {
    const sorted = images.slice().sort((a, b) => (a.order || 99) - (b.order || 99));
    for (const img of sorted) {
      const r = img && img.renditions;
      if (Array.isArray(r) && r.length) {
        // pick the rendition closest to ~600px wide (crisp, not huge)
        const best = r.slice().sort((a, b) => Math.abs((a.width || 0) - 600) - Math.abs((b.width || 0) - 600))[0];
        if (best && best.url) return best.url;
      }
    }
  }
  // fallback: any bol media URL
  return findFirst(media, (k, v) => (typeof v === 'string' && /^https?:\/\/[^ ]*media\.s-bol\.com/i.test(v)) ? v : undefined) || null;
}
function extractPrice(offer) {
  return findFirst(offer, (k, v) => (/price/i.test(k) && typeof v === 'number' && v > 0) ? v : undefined);
}
function extractRating(ratings) {
  // bol shape: { averageRating, ratings: [ {rating, count} ] }
  let avg = (ratings && typeof ratings.averageRating === 'number') ? ratings.averageRating : null;
  let count = null;
  if (ratings && Array.isArray(ratings.ratings)) {
    count = ratings.ratings.reduce((s, x) => s + (Number(x && x.count) || 0), 0);
  }
  if (avg == null) avg = findFirst(ratings, (k, v) => (/rating|average|score/i.test(k) && typeof v === 'number' && v >= 0 && v <= 5) ? v : undefined) ?? null;
  return { rating: avg, count: count };
}
function extractEan(conv) {
  if (typeof conv === 'string') return conv.replace(/[^0-9]/g, '') || null;
  return findFirst(conv, (k, v) => {
    if (/ean|gtin/i.test(k)) {
      if (typeof v === 'string' && /^[0-9]{8,14}$/.test(v)) return v;
      if (typeof v === 'number') return String(v);
    }
    return undefined;
  }) || null;
}

async function fetchByEan(ean, token, debug, idHint) {
  const out = { id: idHint || null, ean: ean };
  const [prod, media, offer, ratings] = await Promise.all([
    apiGet('/products/' + ean + '?country-code=NL', token),
    apiGet('/products/' + ean + '/media?country-code=NL', token),
    apiGet('/products/' + ean + '/offers/best?country-code=NL', token),
    apiGet('/products/' + ean + '/ratings?country-code=NL', token)
  ]);
  if (!out.id && prod.ok) {
    out.id = findFirst(prod.json, (k, v) => (/bolproductid|productid/i.test(k) && (typeof v === 'string' || typeof v === 'number')) ? String(v) : undefined) || null;
  }
  out.title = prod.ok ? (extractTitle(prod.json) || null) : null;
  out.url = (prod.ok && extractUrl(prod.json)) || (media.ok && extractUrl(media.json)) || (offer.ok && extractUrl(offer.json)) || null;
  out.affiliateUrl = buildAffiliateUrl(out.url, out.title);
  out.image = media.ok ? (extractImage(media.json) || (prod.ok ? extractImage(prod.json) : null)) : (prod.ok ? extractImage(prod.json) : null);
  out.price = offer.ok ? (extractPrice(offer.json) ?? null) : null;
  out.delivery = (offer.ok && offer.json && typeof offer.json.deliveryDescription === 'string') ? offer.json.deliveryDescription : null;
  const rt = ratings.ok ? extractRating(ratings.json) : { rating: null, count: null };
  out.rating = rt.rating;
  out.ratingCount = rt.count;
  if (debug) out.debug = { product: prod, media: media, offer: offer, ratings: ratings };
  return out;
}

async function fetchProduct(bolId, token, debug) {
  const conv = await apiGet('/products/' + encodeURIComponent(bolId) + '/to-ean?country-code=NL', token);
  const ean = conv.ok ? extractEan(conv.json) : null;
  if (!ean) {
    const out = { id: bolId, ean: null, error: 'Geen EAN gevonden voor product-ID ' + bolId + ' (status ' + conv.status + ').' };
    if (debug) out.debug = { convert: conv };
    return out;
  }
  return fetchByEan(ean, token, debug, bolId);
}

// Collect {ean,id} pairs from a bol search response (shape can vary — probe defensively).
function extractSearchHits(searchJson, max) {
  const hits = [];
  const seen = {};
  (function walk(node, depth) {
    if (node == null || depth > 8 || hits.length >= max) return;
    if (Array.isArray(node)) { for (const v of node) walk(v, depth + 1); return; }
    if (typeof node === 'object') {
      const ean = (typeof node.ean === 'string' && /^[0-9]{8,14}$/.test(node.ean)) ? node.ean : null;
      const id = node.bolProductId != null ? String(node.bolProductId) : (node.productId != null ? String(node.productId) : null);
      if (ean && !seen[ean]) { seen[ean] = 1; hits.push({ ean: ean, id: id }); }
      for (const k of Object.keys(node)) walk(node[k], depth + 1);
    }
  })(searchJson, 0);
  return hits.slice(0, max);
}

async function searchProducts(term, maxRaw, token, debug) {
  const max = Math.min(Math.max(parseInt(maxRaw, 10) || 3, 1), 8);
  const search = await apiGet('/products/search?country-code=NL&search-term=' + encodeURIComponent(term), token);
  if (!search.ok) {
    return { error: 'Zoeken mislukt voor "' + term + '" (status ' + search.status + ').', products: [], searchDebug: debug ? { search: search } : undefined };
  }
  const hits = extractSearchHits(search.json, max);
  const products = [];
  for (const h of hits) {
    try { products.push(await fetchByEan(h.ean, token, debug, h.id)); }
    catch (e) { products.push({ id: h.id, ean: h.ean, error: String(e && e.message || e) }); }
  }
  const result = { products: products };
  if (debug) result.searchDebug = { term: term, hitCount: hits.length, search: search };
  return result;
}

module.exports = async (req, res) => {
  const q = req.query || {};
  const debug = q.debug === '1' || q.debug === 'true';
  const term = (q.q || q.query || q.search || '').toString().trim();
  const idsRaw = (q.ids || q.id || '').toString();
  const ids = idsRaw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 12);

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // Cache at the CDN so we don't hammer bol; product data changes slowly.
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  if (!term && !ids.length) {
    res.status(400).end(JSON.stringify({ error: 'Geef product-ID(s) op (?ids=...) of een zoekterm (?q=...).' }));
    return;
  }
  try {
    const token = await getToken();
    if (term) {
      const result = await searchProducts(term, q.max, token, debug);
      res.status(200).end(JSON.stringify(result, null, debug ? 2 : 0));
      return;
    }
    const products = [];
    for (const id of ids) {
      try { products.push(await fetchProduct(id, token, debug)); }
      catch (e) { products.push({ id, error: String(e && e.message || e) }); }
    }
    res.status(200).end(JSON.stringify({ products }, null, debug ? 2 : 0));
  } catch (e) {
    res.status(e.code === 'NO_CREDENTIALS' ? 500 : 502).end(JSON.stringify({
      error: String(e && e.message || e), code: e && e.code || null, detail: e && e.detail || null
    }, null, 2));
  }
};
