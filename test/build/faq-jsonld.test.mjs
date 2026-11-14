// Solo posterior a build: npm run check. Encargo F6-faq (14-nov-2026): el FAQPage del JSON-LD de cada página debe
// decir lo mismo que sus preguntas frecuentes visibles. Mismo número de preguntas, mismo orden, mismo texto de pregunta
// y de respuesta. Solo se quitan etiquetas y se colapsan y recortan los espacios; nada más se normaliza (ni guiones ni
// comillas), así que una semirraya en la página y un guion en el JSON-LD es una diferencia.
//
// Cubre todas las páginas HTML de dist que tengan un FAQPage. Marcados visibles del sitio:
// - /en/faq: `.faq-item` con `.faq-question` (pregunta) y `.faq-answer` (respuesta).
// - Fichas de /biblioteca/: componente Faq del kit, `section.mcco-faq` con `details` (pregunta en `summary`, respuesta
//   en el resto del `details`).
// Una página con FAQPage y sin ninguno de esos marcados falla. Para no pasar en vacío se exige un piso de páginas con
// FAQPage, las cuatro que lo tienen, y que la portada no lo tenga: su FAQPage (src/legacy/index-faq.jsonld) no tenía
// preguntas visibles y se quitó en este encargo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, parseFragment } from 'parse5';

const DIST = path.join(fileURLToPath(new URL('../..', import.meta.url)), 'dist');
const elements = (node) => [node, ...(node.childNodes ?? []).flatMap(elements)];
const attr = (node, name) => node?.attrs?.find((a) => a.name === name)?.value;
const clases = (node) => (attr(node, 'class') ?? '').split(/\s+/).filter(Boolean);
const textoCrudo = (node) => [node.value ?? '', ...(node.childNodes ?? []).map(textoCrudo)].join('');
const normalizar = (texto) => texto.replace(/\s+/g, ' ').trim();
const texto = (node) => normalizar(textoCrudo(node));
// El texto del JSON-LD se lee igual que el visible: sin etiquetas y con los espacios colapsados.
const textoJsonLd = (valor) => texto(parseFragment(String(valor ?? '')));

const PISO = 4;
const OBLIGATORIAS = ['/en/faq', '/biblioteca/komatsu-930e-5', '/biblioteca/pala-ph-4100xpc', '/biblioteca/sandvik-lh621'];
const SIN_FAQPAGE = ['/'];

const htmls = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const ruta = path.join(dir, e.name);
  if (e.isDirectory()) return htmls(ruta);
  return e.name.endsWith('.html') ? [ruta] : [];
});
const rutaPublica = (archivo) => `/${path.relative(DIST, archivo).split(path.sep).join('/')}`
  .replace(/index\.html$/, '').replace(/\.html$/, '');

const tipos = (t) => (Array.isArray(t) ? t : [t]);
const bloquesFaq = (dato) => {
  if (Array.isArray(dato)) return dato.flatMap(bloquesFaq);
  if (!dato || typeof dato !== 'object') return [];
  if (tipos(dato['@type']).includes('FAQPage')) return [dato];
  return Object.values(dato).flatMap(bloquesFaq);
};

function faqJsonLd(nodos) {
  const faqs = nodos
    .filter((n) => n.tagName === 'script' && attr(n, 'type') === 'application/ld+json')
    .flatMap((n) => bloquesFaq(JSON.parse(textoCrudo(n))));
  if (!faqs.length) return null;
  return faqs.flatMap((f) => [].concat(f.mainEntity ?? []).map((q) => ({
    pregunta: textoJsonLd(q.name),
    respuesta: textoJsonLd([].concat(q.acceptedAnswer ?? [])[0]?.text),
  })));
}

const dentroDe = (node, condicion) => {
  for (let p = node.parentNode; p; p = p.parentNode) if (condicion(p)) return true;
  return false;
};
const esItemFaq = (n) => clases(n).includes('faq-item');
const esDetallesKit = (n) => n.tagName === 'details' && dentroDe(n, (p) => clases(p).includes('mcco-faq'));

// Preguntas visibles en orden de documento, de cualquiera de los dos marcados.
function faqVisible(nodos) {
  return nodos.filter((n) => esItemFaq(n) || esDetallesKit(n)).map((item) => {
    if (esItemFaq(item)) {
      const interno = elements(item);
      const pregunta = interno.find((n) => clases(n).includes('faq-question'));
      const respuesta = interno.find((n) => clases(n).includes('faq-answer'));
      return { pregunta: pregunta ? texto(pregunta) : '', respuesta: respuesta ? texto(respuesta) : '' };
    }
    const summary = item.childNodes.find((n) => n.tagName === 'summary');
    const resto = item.childNodes.filter((n) => n !== summary);
    return { pregunta: summary ? texto(summary) : '', respuesta: normalizar(resto.map(textoCrudo).join(' ')) };
  });
}

const paginas = htmls(DIST).map((archivo) => {
  const nodos = elements(parse(readFileSync(archivo, 'utf8')));
  return { ruta: rutaPublica(archivo), jsonLd: faqJsonLd(nodos), visible: faqVisible(nodos) };
});
const conFaqPage = paginas.filter((p) => p.jsonLd).sort((a, b) => a.ruta.localeCompare(b.ruta));

test(`hay al menos ${PISO} páginas con FAQPage y entre ellas están ${OBLIGATORIAS.join(', ')}`, () => {
  const rutas = conFaqPage.map((p) => p.ruta);
  assert.ok(rutas.length >= PISO, `se esperaban al menos ${PISO} páginas con FAQPage; hay ${rutas.length}: ${rutas.join(', ')}`);
  for (const ruta of OBLIGATORIAS) assert.ok(rutas.includes(ruta), `${ruta}: debe tener FAQPage`);
});

for (const ruta of SIN_FAQPAGE) {
  test(`${ruta}: no tiene FAQPage en el JSON-LD`, () => {
    const pagina = paginas.find((p) => p.ruta === ruta);
    assert.ok(pagina, `${ruta}: no está en dist`);
    assert.equal(pagina.jsonLd, null, `${ruta}: tiene FAQPage y la página no muestra esas preguntas`);
  });
}

for (const { ruta, jsonLd, visible } of conFaqPage) {
  test(`${ruta}: el FAQPage es igual a las preguntas visibles`, () => {
    assert.ok(visible.length > 0, `${ruta}: tiene FAQPage y no muestra preguntas frecuentes`);
    assert.equal(jsonLd.length, visible.length, `${ruta}: mismo número de preguntas`);
    assert.deepEqual(jsonLd.map((q) => q.pregunta), visible.map((q) => q.pregunta), `${ruta}: mismas preguntas, en el mismo orden`);
    assert.deepEqual(jsonLd, visible, `${ruta}: mismo texto de respuesta`);
  });
}
