#!/usr/bin/env node
// scripts/verificar-adopcion.mjs — línea base y verificador de la adopción del estándar en 3d-ultra.cl.
// Modo capturar:  node scripts/verificar-adopcion.mjs --capturar --base https://3d-ultra.cl --salida <json>
// Modo comparar: node scripts/verificar-adopcion.mjs --base <json> --nuevo dist|url

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as parse5 from 'parse5';

const INDEXABLES = [
  '/',
  '/biblioteca/',
  '/biblioteca/komatsu-930e-5',
  '/biblioteca/pala-ph-4100xpc',
  '/biblioteca/sandvik-lh621',
  '/casos/gemelo-digital-raf-potrerillos',
  '/casos/analisis-chimenea-cps-salvador',
  '/casos/hornos-isasmelt-extension-vida-util',
  '/casos/rueda-moldeo-anodos-potrerillos',
  '/guias/gemelos-digitales-fundiciones-cobre',
  '/en/faq',
];

const AUXILIARES = ['/blog/', '/gracias', '/contacto-error', '/404'];

const ALIASES = INDEXABLES.filter((r) =>
  r.startsWith('/casos/') || r.startsWith('/guias/') || r === '/en/faq'
).map((r) => `${r}.html`);

const SONDA_404 = '/ruta-que-no-existe-b5t1';

export const RUTAS_BASE = [...INDEXABLES, ...AUXILIARES, ...ALIASES, SONDA_404];

function isElement(node) {
  return node && typeof node.nodeName === 'string' && !node.nodeName.startsWith('#');
}

function getAttr(node, name) {
  if (!isElement(node)) return '';
  const attr = node.attrs?.find((a) => a.name === name);
  return attr?.value ?? '';
}

function* walk(node) {
  if (!node) return;
  yield node;
  for (const child of node.childNodes ?? []) yield* walk(child);
}

function findAll(doc, tagName) {
  return [...walk(doc)].filter((n) => isElement(n) && n.nodeName === tagName);
}

function findOne(doc, tagName) {
  return findAll(doc, tagName)[0];
}

function allElements(doc) {
  return [...walk(doc)].filter(isElement);
}

function textContent(node) {
  if (!node) return '';
  const parts = [];
  let lastIsWord = false;
  for (const n of walk(node)) {
    if (n.nodeName === '#text') {
      const txt = n.value;
      if (lastIsWord && /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/.test(txt)) {
        parts.push(' ');
      }
      parts.push(txt);
      lastIsWord = /[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]$/.test(txt);
    } else if (n.nodeName === 'br' || n.nodeName === 'wbr') {
      lastIsWord = true;
    }
  }
  return norm(parts.join(''));
}

export function norm(text) {
  return (text ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, sortKeys(value[k])])
    );
  }
  return value;
}

export function normalizeJSONLD(text) {
  const out = [];
  for (const raw of [text].flat()) {
    const cleaned = (raw ?? '').replace(/^[\s\uFEFF]*<!--[\s\S]*?-->/g, '').trim();
    if (!cleaned) continue;
    try {
      const parsed = JSON.parse(cleaned);
      out.push(JSON.stringify(sortKeys(parsed), null, 2));
    } catch {
      out.push(norm(cleaned));
    }
  }
  return out;
}

function absoluteUrl(href, base) {
  if (!href) return '';
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

function decodeCfEmail(hash) {
  if (!hash || hash.length < 2) return '';
  const key = parseInt(hash.slice(0, 2), 16);
  const out = [];
  for (let i = 2; i < hash.length; i += 2) {
    out.push(parseInt(hash.slice(i, i + 2), 16) ^ key);
  }
  return String.fromCharCode(...out);
}

function extractEmail(href) {
  if (!href) return '';
  if (href.startsWith('mailto:')) return href.replace(/^mailto:/, '').split('?')[0];
  const m = href.match(/\/cdn-cgi\/l\/email-protection#([0-9a-f]+)$/i);
  if (m) return decodeCfEmail(m[1]);
  return '';
}

export function extractMetadata(html, pageUrl, route) {
  const doc = parse5.parse(html);
  const htmlEl = findOne(doc, 'html');
  const head = findOne(doc, 'head') ?? doc;

  const titleEl = findOne(head, 'title');
  const h1El = findOne(doc, 'h1');
  const descEl = findAll(head, 'meta').find((m) => getAttr(m, 'name').toLowerCase() === 'description');
  const robotsEl = findAll(head, 'meta').find((m) => getAttr(m, 'name').toLowerCase() === 'robots');
  const canonicalEl = findAll(head, 'link').find((l) => getAttr(l, 'rel') === 'canonical');
  const alternateEls = findAll(head, 'link').filter((l) =>
    getAttr(l, 'rel').includes('alternate')
  );
  const jsonldEls = findAll(head, 'script').filter(
    (s) => getAttr(s, 'type') === 'application/ld+json'
  );

  const anchors = new Set();
  for (const el of allElements(doc)) {
    const id = getAttr(el, 'id');
    if (id && /^[a-zA-Z][\w-]*$/.test(id)) anchors.add(`#${id}`);
    const href = getAttr(el, 'href');
    if (href?.startsWith('#') && href.length > 1) anchors.add(href);
  }

  const forms = [];
  const mailto = new Set();
  const whatsapp = new Set();
  const contactAnchors = new Set();

  for (const form of findAll(doc, 'form')) {
    const action = getAttr(form, 'action');
    if (action) forms.push(action);
  }
  for (const a of findAll(doc, 'a')) {
    const href = getAttr(a, 'href');
    const email = extractEmail(href);
    if (email) mailto.add(email);
    if (href?.includes('wa.me/')) whatsapp.add(href);
    if (href === '#contacto' || href?.endsWith('#contacto')) contactAnchors.add(href);
  }

  return {
    route,
    url: pageUrl,
    lang: getAttr(htmlEl, 'lang').toLowerCase(),
    title: norm(textContent(titleEl)),
    description: norm(getAttr(descEl, 'content')),
    h1: norm(textContent(h1El)),
    canonical: absoluteUrl(getAttr(canonicalEl, 'href'), pageUrl),
    alternates: alternateEls
      .map((l) => ({
        hreflang: getAttr(l, 'hreflang') || 'x-default',
        href: absoluteUrl(getAttr(l, 'href'), pageUrl),
      }))
      .sort((a, b) => a.hreflang.localeCompare(b.hreflang) || a.href.localeCompare(b.href)),
    robots: norm(getAttr(robotsEl, 'content')),
    jsonld: normalizeJSONLD(jsonldEls.map((s) => textContent(s))),
    anchors: [...anchors].sort(),
    contacts: {
      forms: [...new Set(forms)].sort(),
      mailto: [...mailto].sort(),
      whatsapp: [...whatsapp].sort(),
      contactAnchors: [...contactAnchors].sort(),
    },
  };
}

function statusForRoute(route, base) {
  if (route === SONDA_404) return 404;
  return 200;
}

export async function captureFromURL(baseURL, route) {
  const url = new URL(route, baseURL).href;
  const expected = statusForRoute(route, baseURL);
  const res = await fetch(url, { redirect: 'follow' });
  const status = res.status;
  const html = await res.text();
  const meta = extractMetadata(html, url, route);
  return { ...meta, status, expectedStatus: expected };
}

export function resolveRouteToFile(route, distDir) {
  const clean = route.replace(/^\/+|\/+$/g, '');
  if (!clean) return path.join(distDir, 'index.html');
  // Alias .html heredados: la ruta ya incluye la extensión.
  if (clean.endsWith('.html')) return path.join(distDir, clean);
  const asDir = path.join(distDir, clean, 'index.html');
  if (fs.existsSync(asDir) && fs.statSync(asDir).isFile()) return asDir;
  return path.join(distDir, `${clean}.html`);
}

export async function captureFromFile(distDir, baseURL, route) {
  const filePath = resolveRouteToFile(route, distDir);
  const url = new URL(route, baseURL).href;
  if (!fs.existsSync(filePath)) {
    const expected = statusForRoute(route, baseURL);
    if (route === SONDA_404) {
      return { route, url, status: 404, expectedStatus: expected };
    }
    return { route, url, status: 0, expectedStatus: expected, missing: true };
  }
  const html = fs.readFileSync(filePath, 'utf8');
  const meta = extractMetadata(html, url, route);
  return { ...meta, status: statusForRoute(route, baseURL), expectedStatus: statusForRoute(route, baseURL) };
}

export async function capture(base, route) {
  if (/^https?:\/\//i.test(base)) {
    return captureFromURL(base, route);
  }
  const site = await loadSiteYaml();
  return captureFromFile(base, site.domain ?? 'https://3d-ultra.cl', route);
}

function deepEqual(a, b) {
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
}

function diffValue(label, baseVal, nuevoVal) {
  if (deepEqual(baseVal, nuevoVal)) return null;
  return { field: label, base: baseVal, nuevo: nuevoVal };
}

export function comparePage(basePage, nuevoPage) {
  const diffs = [];
  if (nuevoPage.missing) {
    diffs.push({ field: 'exists', base: true, nuevo: false });
    return diffs;
  }
  if (basePage.status !== nuevoPage.status) {
    diffs.push({ field: 'status', base: basePage.status, nuevo: nuevoPage.status });
  }
  if (basePage.status !== 200) return diffs;

  const checks = [
    ['lang', norm(basePage.lang), norm(nuevoPage.lang)],
    ['title', norm(basePage.title), norm(nuevoPage.title)],
    ['description', norm(basePage.description), norm(nuevoPage.description)],
    ['h1', norm(basePage.h1), norm(nuevoPage.h1)],
    ['canonical', basePage.canonical, nuevoPage.canonical],
    ['alternates', basePage.alternates, nuevoPage.alternates],
    ['robots', norm(basePage.robots), norm(nuevoPage.robots)],
    ['jsonld', basePage.jsonld, nuevoPage.jsonld],
    ['anchors', basePage.anchors, nuevoPage.anchors],
    ['contacts', basePage.contacts, nuevoPage.contacts],
  ];
  for (const [label, b, n] of checks) {
    const d = diffValue(label, b, n);
    if (d) diffs.push(d);
  }
  return diffs;
}

export function compareReport(base, nuevo) {
  const report = [];
  for (const route of Object.keys(base)) {
    if (!nuevo[route]) {
      report.push({ route, diffs: [{ field: 'exists', base: true, nuevo: false }] });
      continue;
    }
    const diffs = comparePage(base[route], nuevo[route]);
    if (diffs.length) report.push({ route, diffs });
  }
  for (const route of Object.keys(nuevo)) {
    if (!base[route]) {
      report.push({ route, diffs: [{ field: 'exists', base: false, nuevo: true }] });
    }
  }
  return report;
}

async function loadSiteYaml() {
  try {
    const yaml = await import('yaml');
    const text = fs.readFileSync('site.yaml', 'utf8');
    return yaml.parse(text);
  } catch {
    return {};
  }
}

async function main() {
  const args = process.argv.slice(2);
  const has = (flag) => args.includes(flag);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
  };

  if (has('--capturar')) {
    const base = get('--base') || 'https://3d-ultra.cl';
    const salida = get('--salida') || 'docs/registros/adopcion-3d-ultra/seo-antes.json';
    const site = await loadSiteYaml();
    const domain = base || site.domain || 'https://3d-ultra.cl';
    const result = { capturedAt: new Date().toISOString(), base: domain, pages: {} };
    for (const route of RUTAS_BASE) {
      try {
        result.pages[route] = await captureFromURL(domain, route);
      } catch (err) {
        result.pages[route] = { route, url: new URL(route, domain).href, error: err.message };
      }
    }
    fs.mkdirSync(path.dirname(salida), { recursive: true });
    fs.writeFileSync(salida, JSON.stringify(result, null, 2));
    console.log(`Capturadas ${Object.keys(result.pages).length} rutas en ${salida}`);
    return 0;
  }

  if (has('--base') && has('--nuevo')) {
    const basePath = get('--base');
    const nuevoPath = get('--nuevo');
    const baseData = JSON.parse(fs.readFileSync(basePath, 'utf8'));
    const site = await loadSiteYaml();
    const domain = site.domain || baseData.base || 'https://3d-ultra.cl';
    const nuevo = { capturedAt: new Date().toISOString(), base: domain, pages: {} };
    for (const route of Object.keys(baseData.pages)) {
      try {
        nuevo.pages[route] = await capture(nuevoPath, route);
      } catch (err) {
        nuevo.pages[route] = { route, url: new URL(route, domain).href, error: err.message };
      }
    }
    const report = compareReport(baseData.pages, nuevo.pages);
    if (report.length === 0) {
      console.log('OK: sin diferencias respecto de la base.');
      return 0;
    }
    for (const { route, diffs } of report) {
      console.log(`\nDIFERENCIA ${route}`);
      for (const d of diffs) {
        console.log(`  · ${d.field}`);
        if (process.env.VERBOSE) {
          console.log('    base:', JSON.stringify(d.base, null, 2));
          console.log('    nuevo:', JSON.stringify(d.nuevo, null, 2));
        }
      }
    }
    return 1;
  }

  console.log(`Uso:
  node scripts/verificar-adopcion.mjs --capturar --base https://3d-ultra.cl --salida docs/registros/adopcion-3d-ultra/seo-antes.json
  node scripts/verificar-adopcion.mjs --base docs/registros/adopcion-3d-ultra/seo-antes.json --nuevo dist`);
  return 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(await main());
}
