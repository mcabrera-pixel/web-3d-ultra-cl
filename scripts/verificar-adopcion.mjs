#!/usr/bin/env node
// scripts/verificar-adopcion.mjs — línea base y verificador de la adopción del estándar en 3d-ultra.cl.
// Modo capturar:  node scripts/verificar-adopcion.mjs --capturar --base https://3d-ultra.cl --salida <json>
// Modo comparar: node scripts/verificar-adopcion.mjs --base <json> --nuevo dist|url

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as parse5 from 'parse5';
import { load as yamlLoad } from 'js-yaml';
import { slug as githubSlug } from 'github-slugger';

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
  return { field: label, base: baseVal, nuevo: nuevoVal, severity: 'changed' };
}

function itemKey(item) {
  return JSON.stringify(sortKeys(item));
}

function diffList(field, baseArr, nuevoArr, kind = 'primitive') {
  baseArr = baseArr ?? [];
  nuevoArr = nuevoArr ?? [];
  const missing = [];
  const additions = [];
  const changed = [];

  if (kind === 'alternates') {
    for (const b of baseArr) {
      const n = nuevoArr.find((x) => x.hreflang === b.hreflang);
      if (!n) missing.push(b);
      else if (!deepEqual(b, n)) changed.push({ field, base: b, nuevo: n, severity: 'changed' });
    }
    for (const n of nuevoArr) {
      if (!baseArr.some((b) => b.hreflang === n.hreflang)) additions.push(n);
    }
  } else {
    const nuevoSet = new Set(nuevoArr.map(itemKey));
    const baseSet = new Set(baseArr.map(itemKey));
    for (const b of baseArr) {
      if (!nuevoSet.has(itemKey(b))) missing.push(b);
    }
    for (const n of nuevoArr) {
      if (!baseSet.has(itemKey(n))) additions.push(n);
    }
  }

  const out = [];
  if (missing.length) out.push({ field, base: missing, nuevo: [], severity: 'missing' });
  out.push(...changed);
  if (additions.length) out.push({ field, base: [], nuevo: additions, severity: 'addition' });
  return out;
}

export function comparePage(basePage, nuevoPage) {
  const diffs = [];
  if (nuevoPage.missing) {
    diffs.push({ field: 'exists', base: true, nuevo: false, severity: 'missing' });
    return diffs;
  }
  if (basePage.status !== nuevoPage.status) {
    diffs.push({ field: 'status', base: basePage.status, nuevo: nuevoPage.status, severity: 'missing' });
  }
  if (basePage.status !== 200) return diffs;

  const scalarChecks = [
    ['lang', norm(basePage.lang), norm(nuevoPage.lang)],
    ['title', norm(basePage.title), norm(nuevoPage.title)],
    ['description', norm(basePage.description), norm(nuevoPage.description)],
    ['h1', norm(basePage.h1), norm(nuevoPage.h1)],
    ['canonical', basePage.canonical, nuevoPage.canonical],
    ['alternates', basePage.alternates, nuevoPage.alternates],
    ['robots', norm(basePage.robots), norm(nuevoPage.robots)],
    ['jsonld', basePage.jsonld, nuevoPage.jsonld],
  ];
  for (const [label, b, n] of scalarChecks) {
    const d = diffValue(label, b, n);
    if (d) diffs.push(d);
  }

  diffs.push(...diffList('anchors', basePage.anchors, nuevoPage.anchors));

  const contactKeys = ['forms', 'mailto', 'whatsapp', 'contactAnchors'];
  const contactDiffs = [];
  for (const key of contactKeys) {
    contactDiffs.push(...diffList(`contacts.${key}`, basePage.contacts?.[key], nuevoPage.contacts?.[key]));
  }
  if (contactDiffs.some((d) => d.severity !== 'addition')) {
    diffs.push({ field: 'contacts', base: basePage.contacts, nuevo: nuevoPage.contacts, severity: 'missing' });
  }
  diffs.push(...contactDiffs);

  return diffs;
}

export function compareReport(base, nuevo) {
  const report = [];
  for (const route of Object.keys(base)) {
    if (!nuevo[route]) {
      report.push({ route, diffs: [{ field: 'exists', base: true, nuevo: false, severity: 'missing' }] });
      continue;
    }
    const diffs = comparePage(base[route], nuevo[route]);
    if (diffs.length) report.push({ route, diffs });
  }
  for (const route of Object.keys(nuevo)) {
    if (!base[route]) {
      report.push({ route, diffs: [{ field: 'exists', base: false, nuevo: true, severity: 'addition' }] });
    }
  }
  return report;
}

export function reportFailures(report) {
  return report.filter((entry) => entry.diffs.some((d) => d.severity !== 'addition'));
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

// Contrato del formulario de contacto: acción, método, campos, valores, validación y opciones, en orden.
function formContract(root) {
  return findAll(root, 'form').filter(f => getAttr(f, 'action') === '/api/contact').map(f => ({
    action: getAttr(f, 'action'), method: getAttr(f, 'method'),
    fields: allElements(f).filter(e => ['input', 'select', 'textarea', 'button'].includes(e.nodeName)).map(e => ({
      tag: e.nodeName, name: getAttr(e, 'name'), type: getAttr(e, 'type'), value: getAttr(e, 'value'),
      required: e.attrs?.some(a => a.name === 'required') ?? false,
      options: findAll(e, 'option').map(o => ({ value: getAttr(o, 'value'), text: textContent(o) })),
    })),
  }));
}

// Base congelada de la portada heredada (Tarea 7): formulario, párrafos y títulos de sus secciones (sin scripts ni
// la conversación del asistente) y contactos auxiliares. Se guarda en docs/registros/adopcion-3d-ultra/inicio-antes.json.
export function extractInicioBase(legacyHtml) {
  const legacy = parse5.parse(legacyHtml);
  const contenido = [];
  for (const section of findAll(legacy, 'section')) {
    for (const el of allElements(section).filter(e => /^(p|h[1-5])$/.test(e.nodeName))) {
      const texto = norm(textContent(el)).replace(/ — /g, ', ').toLowerCase();
      if (texto) contenido.push(texto);
    }
  }
  const contactos = [...new Set(findAll(legacy, 'a').map(a => getAttr(a, 'href')).filter(href => /^(tel:|mailto:|https:\/\/(wa.me|instagram.com))/.test(href)))];
  return { formularios: formContract(legacy), contenido, contactos };
}

// Contratos de la portada renderizada: se ejecutan después del build, nunca en prebuild.
export function verifyInicio(html, fichas, base) {
  const doc = parse5.parse(html), errors = [];
  const els = allElements(doc), links = findAll(doc, 'a');
  const hasClass = (el, c) => getAttr(el, 'class').split(/\s+/).includes(c);
  const check = (ok, message) => { if (!ok) errors.push(message); };
  const hero = els.find(el => hasClass(el, 'std-hero'));
  const equipos = els.find(el => getAttr(el, 'id') === 'twins-2');
  check(findAll(doc, 'main').length === 1 && findAll(doc, 'h1').length === 1, 'Inicio: un main y un H1');
  check(links.some(el => getAttr(el, 'href') === '/biblioteca/' && textContent(el) === 'Biblioteca'), 'Inicio: enlace de navegación a biblioteca');
  check(findAll(hero, 'a').some(el => getAttr(el, 'href') === '/biblioteca/' && textContent(el) === 'Ver Demo Virtual'), 'Inicio: CTA Ver Demo Virtual');
  check(getAttr(findAll(hero, 'a')[0], 'href') === '#contacto', 'Inicio: contacto como acción principal');
  const tarjetas = findAll(equipos, 'article');
  check(tarjetas.length === 3, 'Inicio: tres tarjetas de equipos');
  for (const [slug, ficha] of Object.entries(fichas)) {
    const tarjeta = tarjetas.find(t => findAll(t, 'a').some(a => getAttr(a, 'href') === `/biblioteca/${slug}`));
    const img = findOne(tarjeta, 'img');
    check(!!tarjeta && textContent(findOne(tarjeta, 'h3')) === ficha.nombre && findAll(tarjeta, 'p').some(p => textContent(p) === ficha.tipo), `Inicio: nombre y tipo de ${slug}`);
    check(getAttr(img, 'src') === `/biblioteca/${slug}/poster.webp` && getAttr(img, 'alt') === `Modelo 3D de referencia: ${ficha.nombre}`, `Inicio: póster y alt de ${slug}`);
  }
  check(findAll(doc, 'iframe').length === 0 && !findAll(doc, 'script').some(s => /visor3d|three|\.glb/.test(getAttr(s, 'src'))), 'Inicio: sin visor, Three.js ni GLB');
  check(els.filter(el => getAttr(el, 'data-std-nube') === 'hero').length === 1 && els.filter(el => el.attrs?.some(a => a.name === 'data-std-campo')).length === 1, 'Inicio: una nube y un campo');
  check(els.filter(el => el.attrs?.some(a => a.name === 'data-std-paso')).length === 3, 'Inicio: tres pasos de historia');
  const formas = els.filter(el => el.attrs?.some(a => a.name === 'data-std-forma'));
  check(formas.length === 3 && formas.every(el => getAttr(el, 'data-origen') === 'render'), 'Inicio: tres renders rotulados');
  const first = findAll(hero, 'img').find(el => getAttr(el, 'src').includes('/media/nube/'));
  check(getAttr(first, 'src') === getAttr(formas[0], 'src') && getAttr(first, 'data-origen') === 'render', 'Inicio: hero y primer paso comparten el render');
  check(els.filter(el => hasClass(el, 'std-hero__rotulo')).some(el => textContent(el) === 'Render 3D'), 'Inicio: pie del hero Render 3D');
  const video = findOne(doc, 'video');
  check(!!getAttr(video, 'poster') && getAttr(video, 'preload') === 'none' && !findAll(hero, 'video').length, 'Inicio: video fuera del hero, con póster y carga diferida');
  if (base) {
    check(deepEqual(base.formularios, formContract(doc)), 'Inicio: payload, opciones y validación del formulario heredado');
    const contenido = norm(textContent(doc)).toLowerCase();
    for (const texto of base.contenido) check(contenido.includes(texto), `Inicio: contenido heredado perdido: ${texto}`);
    for (const href of base.contactos) check(links.some(n => getAttr(n, 'href') === href), `Inicio: contacto auxiliar ${href}`);
  }
  return [...new Set(errors)];
}

export const INICIO_ANTES = 'docs/registros/adopcion-3d-ultra/inicio-antes.json';
async function verifyInicioDist(distDir) {
  const yaml = await import('js-yaml');
  const fichas = Object.fromEntries(fs.readdirSync('src/content/equipos').filter(f => f.endsWith('.md')).map(f => [f.replace(/\.md$/, ''), yaml.load(fs.readFileSync(`src/content/equipos/${f}`, 'utf8').split(/^---$/m)[1])]));
  return verifyInicio(fs.readFileSync(path.join(distDir, 'index.html'), 'utf8'), fichas, JSON.parse(fs.readFileSync(INICIO_ANTES, 'utf8')));
}

// Suplemento de T6: conserva contenido editorial y OG que parity no compara.
// La captura original de SEO sigue intacta; esta base procede de los seis HTML originales.
// El cuerpo es <main> en las páginas del estándar y <body> en los originales, que no tenían <main>. Se omiten la
// barra y el pie antiguos (.top-bar, footer) y las piezas del kit (barra global, sub-navegación y bloque Grupo).
const CLASES_TEXTO = ['label', 'stat-number', 'stat-label', 'tag'];
function fueraDelCuerpo(el) {
  const clases = getAttr(el, 'class').split(/\s+/);
  return el.nodeName === 'footer' || ['script', 'style', 'template'].includes(el.nodeName)
    || clases.some(c => ['top-bar', 'std-gnav', 'std-subnav'].includes(c)) || getAttr(el, 'data-mcco') === 'grupo';
}
const esTexto = el => /^(h[1-6]|p|li|th|td)$/.test(el.nodeName) || getAttr(el, 'class').split(/\s+/).some(c => CLASES_TEXTO.includes(c));

export function extractInterior(html) {
  const doc = parse5.parse(html);
  const head = findOne(doc, 'head');
  const cuerpo = findOne(doc, 'main') ?? findOne(doc, 'body') ?? doc;
  const contenido = [], enlaces = [];
  const visitar = (node, dentroDeTexto) => {
    for (const el of node.childNodes ?? []) {
      if (!isElement(el) || fueraDelCuerpo(el)) continue;
      const texto = esTexto(el);
      // Encabezados, párrafos, listas, celdas, rótulos y cifras; un enlace suelto (la píldora del cierre) también.
      if (texto || (el.nodeName === 'a' && !dentroDeTexto)) contenido.push(textContent(el));
      if (el.nodeName === 'a') enlaces.push({ href: getAttr(el, 'href'), texto: textContent(el) });
      visitar(el, dentroDeTexto || texto || el.nodeName === 'a');
    }
  };
  visitar(cuerpo, false);
  return {
    opengraph: findAll(head, 'meta').filter(el => getAttr(el, 'property').startsWith('og:'))
      .map(el => ({ property: getAttr(el, 'property'), content: getAttr(el, 'content') })),
    // Las respuestas, listas, encabezados, celdas, rótulos y el cierre deben sobrevivir al cambio de presentación.
    contenido,
    enlaces,
  };
}

// Una imagen de vista previa que la base no tenía (o distinta) no es una pérdida: se avisa sin fallar. Con el kit
// v1.4.0, Head siempre emite og:image y twitter:image; la omisión espera ogImage={false} en v1.4.1.
export function interiorWarnings(html, base) {
  const doc = parse5.parse(html), metas = findAll(findOne(doc, 'head'), 'meta');
  const previa = base.opengraph.find(m => m.property === 'og:image')?.content;
  const avisos = [];
  for (const [attr, key] of [['property', 'og:image'], ['name', 'twitter:image']]) {
    for (const el of metas.filter(m => getAttr(m, attr) === key)) {
      const valor = getAttr(el, 'content');
      if (!previa) avisos.push(`Interior: ${key} agregada (${valor}); la base no tenía imagen de vista previa`);
      else if (valor !== previa) avisos.push(`Interior: ${key} distinta de la base (${valor}; antes ${previa})`);
    }
  }
  return avisos;
}

// Busca la secuencia base dentro de la nueva, en el mismo orden y con sus repeticiones. La presentación puede
// intercalar piezas propias, pero no reordenar, fusionar ni perder lo heredado (una celda movida a otra fila falla).
export function firstSequenceLoss(base, nuevo) {
  let i = 0;
  for (const [pos, item] of base.entries()) {
    while (i < nuevo.length && !deepEqual(nuevo[i], item)) i++;
    if (i === nuevo.length) return { pos, item };
    i++;
  }
  return null;
}

export function verifyInterior(html, base) {
  const nuevo = extractInterior(html), errors = [];
  const doc = parse5.parse(html), head = findOne(doc, 'head');
  // OG es un conjunto de metas: el orden en la cabecera no importa.
  for (const item of base.opengraph) {
    if (!nuevo.opengraph.some(n => deepEqual(n, item))) errors.push(`Interior: pérdida en opengraph: ${JSON.stringify(item)}`);
  }
  for (const key of ['contenido', 'enlaces']) {
    const loss = firstSequenceLoss(base[key], nuevo[key]);
    if (loss) errors.push(`Interior: pérdida o cambio de orden en ${key} (posición ${loss.pos + 1} de ${base[key].length}): ${JSON.stringify(loss.item)}`);
  }
  const metas = findAll(head, 'meta');
  for (const key of ['og:type', 'og:url', 'og:title', 'og:description', 'og:image']) {
    const count = metas.filter(el => getAttr(el, 'property') === key).length;
    if (count > 1 || (count === 0 && base.opengraph.some(el => el.property === key))) errors.push(`Interior: ${key} ausente o duplicado respecto de la base`);
  }
  if (findAll(head, 'link').filter(el => getAttr(el, 'rel') === 'canonical').length !== 1) errors.push('Interior: canonical debe aparecer una vez');
  return errors;
}

// Índice del blog (Estándar v2 §4): sin entradas publicadas, noindex y sin enlaces a artículos; con entradas,
// indexable y con un enlace por cada una. La expectativa sale de las entradas, no de un estado fijo.
export function verifyBlogIndex(html, slugs) {
  const doc = parse5.parse(html), head = findOne(doc, 'head') ?? doc, errors = [];
  const robots = norm(getAttr(findAll(head, 'meta').find(m => getAttr(m, 'name').toLowerCase() === 'robots'), 'content'));
  const enlazados = [...new Set(findAll(doc, 'a').map(a => getAttr(a, 'href').match(/^\/blog\/(.+?)\/?$/)?.[1]).filter(Boolean))].sort();
  const esperados = [...new Set(slugs)].sort();
  if (!esperados.length) {
    if (robots !== 'noindex, nofollow') errors.push(`Blog: sin entradas publicadas debe llevar noindex (robots: "${robots}")`);
  } else if (/noindex/i.test(robots)) {
    errors.push(`Blog: con ${esperados.length} entradas publicadas debe ser indexable (robots: "${robots}")`);
  }
  for (const s of esperados) if (!enlazados.includes(s)) errors.push(`Blog: falta el enlace a /blog/${s}`);
  for (const s of enlazados) if (!esperados.includes(s)) errors.push(`Blog: enlace a /blog/${s}, que no es una entrada publicada`);
  return errors;
}

// Entradas publicadas de la colección blog con el id que les da el loader glob de Astro (src/content.config.ts):
// Markdown cuyo nombre no empieza con «_», sin draft: true; id = slug del frontmatter o ruta con github-slugger.
export function publishedBlogSlugs(dir) {
  if (!fs.existsSync(dir)) return [];
  const archivos = fs.readdirSync(dir, { recursive: true }).map(String)
    .filter(f => f.endsWith('.md') && !path.basename(f).startsWith('_'));
  return archivos.flatMap(rel => {
    const texto = fs.readFileSync(path.join(dir, rel), 'utf8');
    const fm = texto.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const data = (fm && yamlLoad(fm[1])) || {};
    if (data.draft === true) return [];
    if (data.slug) return [String(data.slug)];
    return [rel.replace(/\.md$/, '').split(path.sep).map(seg => githubSlug(seg)).join('/').replace(/\/index$/, '')];
  }).sort();
}

function verifyInterioresDist(distDir) {
  const base = JSON.parse(fs.readFileSync('docs/registros/adopcion-3d-ultra/interiores-antes.json', 'utf8'));
  const errores = [], avisos = [];
  for (const [route, page] of Object.entries(base.pages)) {
    const file = resolveRouteToFile(route, distDir);
    if (!fs.existsSync(file)) { errores.push(`${route}: interior ausente`); continue; }
    const html = fs.readFileSync(file, 'utf8');
    errores.push(...verifyInterior(html, page).map(error => `${route}: ${error}`));
    avisos.push(...interiorWarnings(html, page).map(aviso => `${route}: ${aviso}`));
  }
  return { errores, avisos };
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
    const interiores = /^https?:\/\//i.test(nuevoPath) ? { errores: [], avisos: [] } : verifyInterioresDist(nuevoPath);
    const inicioErrors = /^https?:\/\//i.test(nuevoPath) ? [] : [...await verifyInicioDist(nuevoPath), ...interiores.errores];
    for (const error of inicioErrors) console.log(`FALLA ${error}`);
    // Avisos visibles que no fallan, como las adiciones: imágenes de vista previa que la base no tenía.
    for (const aviso of interiores.avisos) console.log(`AVISO ${aviso}`);
    if (!/^https?:\/\//i.test(nuevoPath) && !inicioErrors.length) console.log('OK: contratos de portada e interiores renderizados.');
    const report = compareReport(baseData.pages, nuevo.pages);
    const failures = reportFailures(report);
    const additions = report.filter((entry) => entry.diffs.some((d) => d.severity === 'addition'));

    if (failures.length === 0 && additions.length === 0 && inicioErrors.length === 0 && interiores.avisos.length === 0) {
      console.log('OK: sin diferencias respecto de la base.');
      return 0;
    }

    for (const { route, diffs } of failures) {
      console.log(`\nDIFERENCIA ${route}`);
      for (const d of diffs) {
        if (d.severity === 'addition') continue;
        console.log(`  · ${d.field}`);
        if (process.env.VERBOSE) {
          console.log('    base:', JSON.stringify(d.base, null, 2));
          console.log('    nuevo:', JSON.stringify(d.nuevo, null, 2));
        }
      }
    }

    for (const { route, diffs } of additions) {
      console.log(`\nADICIÓN ${route}`);
      for (const d of diffs) {
        if (d.severity !== 'addition') continue;
        console.log(`  · + ${d.field}`);
        if (process.env.VERBOSE) {
          console.log('    nuevo:', JSON.stringify(d.nuevo, null, 2));
        }
      }
    }

    return failures.length > 0 || inicioErrors.length > 0 ? 1 : 0;
  }

  console.log(`Uso:
  node scripts/verificar-adopcion.mjs --capturar --base https://3d-ultra.cl --salida docs/registros/adopcion-3d-ultra/seo-antes.json
  node scripts/verificar-adopcion.mjs --base docs/registros/adopcion-3d-ultra/seo-antes.json --nuevo dist`);
  return 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(await main());
}
