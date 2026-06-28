// Shared SEO helper for Heldenshop pages.
// Sets <title>, meta description/keywords/robots, canonical, Open Graph, Twitter
// and a JSON-LD structured-data block. Idempotent: re-running updates in place.

const SITE = 'https://heldenshop.nl';

export function url(slug) {
  if (!slug) return SITE + '/';
  return SITE + '/' + String(slug).replace(/^\//, '');
}

export function applySeo(o = {}) {
  const head = document.head;
  document.documentElement.lang = 'nl';
  if (o.title) document.title = o.title;

  const upsert = (selector, make) => {
    let el = head.querySelector(selector);
    if (!el) { el = make(); head.appendChild(el); }
    return el;
  };
  const setMeta = (key, content, isProp) => {
    if (content == null) return;
    const attr = isProp ? 'property' : 'name';
    const el = upsert('meta[' + attr + '="' + key + '"]', () => {
      const m = document.createElement('meta'); m.setAttribute(attr, key); return m;
    });
    el.setAttribute('content', content);
  };

  setMeta('description', o.description);
  setMeta('robots', o.robots || 'index,follow,max-image-preview:large');
  if (o.keywords) setMeta('keywords', o.keywords);
  setMeta('theme-color', '#EE2A3C');

  if (o.canonical) {
    const link = upsert('link[rel="canonical"]', () => {
      const l = document.createElement('link'); l.setAttribute('rel', 'canonical'); return l;
    });
    link.setAttribute('href', o.canonical);
  }

  setMeta('og:site_name', 'Heldenshop', true);
  setMeta('og:type', o.ogType || 'website', true);
  setMeta('og:title', o.ogTitle || o.title, true);
  setMeta('og:description', o.description, true);
  setMeta('og:url', o.canonical, true);
  setMeta('og:locale', 'nl_NL', true);
  setMeta('og:image', o.image, true);
  setMeta('twitter:card', o.image ? 'summary_large_image' : 'summary');
  setMeta('twitter:title', o.ogTitle || o.title);
  setMeta('twitter:description', o.description);

  // JSON-LD: always include Organization, plus any page-specific graph nodes.
  const org = {
    '@type': 'Organization',
    '@id': SITE + '#org',
    name: 'Heldenshop',
    url: SITE + '/',
    description: 'Onafhankelijke Nederlandse fansite met de leukste superhelden-speelgoed tips, samengesteld door echte fans.',
    slogan: 'Samengesteld door echte fans'
  };
  const graph = [org].concat(o.jsonLd ? (Array.isArray(o.jsonLd) ? o.jsonLd : [o.jsonLd]) : []);
  const data = { '@context': 'https://schema.org', '@graph': graph };
  const s = upsert('script[data-seo-jsonld]', () => {
    const sc = document.createElement('script');
    sc.type = 'application/ld+json';
    sc.setAttribute('data-seo-jsonld', '');
    return sc;
  });
  s.textContent = JSON.stringify(data);
}

export function breadcrumb(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, item: url(it.slug)
    }))
  };
}

export function itemList(name, products) {
  return {
    '@type': 'ItemList',
    name: name,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem', position: i + 1, name: p.title
    }))
  };
}

export function article(o) {
  return {
    '@type': 'Article',
    headline: o.headline,
    description: o.description,
    author: { '@type': 'Organization', name: 'Heldenshop' },
    publisher: { '@id': SITE + '#org' },
    inLanguage: 'nl-NL',
    mainEntityOfPage: o.canonical
  };
}

export function faqPage(qa) {
  return {
    '@type': 'FAQPage',
    mainEntity: qa.map((x) => ({
      '@type': 'Question', name: x.q,
      acceptedAnswer: { '@type': 'Answer', text: x.a }
    }))
  };
}
