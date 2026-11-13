// Repaso editorial del texto publicado en dist: emojis, flechas, rayas como conector, exclamaciones y voseo.
// Lo heredado de producción que se conserva por paridad (títulos, casos, guía, FAQ y asistente) no se reescribe en
// la adopción: está registrado, segmento por segmento, en docs/registros/adopcion-3d-ultra/texto-heredado.json.
// Todo lo demás que caiga en una regla es hallazgo y el script sale con 1.
// Uso: node scripts/repaso-texto.mjs [--dist dist] [--archivos doc1.md doc2.md ...]
//   --archivos revisa además documentos Markdown completos, sin registro de heredados (para textos nuevos).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as parse5 from 'parse5';

export const HEREDADO = 'docs/registros/adopcion-3d-ultra/texto-heredado.json';

const REGLAS = [
  ['emoji', /[\u{1F000}-\u{1FAFF}\u{2600}-\u{2793}\u{2B50}-\u{2B55}\u{FE0F}]/u],
  ['flecha', /[←-⇿⟰-⟿⤀-⥿⬅-⬇➔➜➝]|->|=>/u],
  ['raya', /—|\s–\s/u],
  ['exclamacion', /[!¡]/u],
  // Solo formas inequívocas de voseo: «elegí» o «escribí» también son pretéritos de tú.
  ['voseo', /(?<![\p{L}])(vos|tenés|podés|querés|sabés|hacés|decís|venís|conocé|probá|mirá|contanos|escribinos|llamanos|hablá|mandá|dejá|agendá|consultá|contactanos|sumate)(?![\p{L}])/iu],
];

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const OMITIR = new Set(['script', 'style', 'noscript', 'template']);
const METAS = new Set(['description', 'og:title', 'og:description', 'twitter:title', 'twitter:description']);

// Textos que lee una persona o un buscador: nodos de texto, title, metas de descripción, alt y aria-label.
export function segmentos(html) {
  const salida = [];
  const visitar = (nodo) => {
    if (OMITIR.has(nodo.nodeName)) return;
    if (nodo.nodeName === '#text') {
      const t = norm(nodo.value);
      if (t) salida.push(t);
      return;
    }
    const attr = (n) => nodo.attrs?.find((a) => a.name === n)?.value;
    if (nodo.nodeName === 'meta' && METAS.has(attr('name') ?? attr('property'))) salida.push(norm(attr('content') ?? ''));
    for (const n of ['alt', 'aria-label']) if (attr(n)) salida.push(norm(attr(n)));
    for (const hijo of nodo.childNodes ?? []) visitar(hijo);
  };
  visitar(parse5.parse(html));
  return salida.filter(Boolean);
}

export function hallazgos(texto) {
  return REGLAS.filter(([, re]) => re.test(texto)).map(([regla]) => ({ regla, texto }));
}

// paginas: [{ archivo, html }] o [{ archivo, lineas }]. heredados: segmentos exactos registrados.
export function repasar(paginas, heredados = []) {
  const registro = new Set(heredados);
  const usados = new Set();
  const r = { hallazgos: [], heredados: [], sinUso: [] };
  for (const { archivo, html, lineas } of paginas) {
    for (const texto of lineas ?? segmentos(html)) {
      for (const h of hallazgos(texto)) {
        if (registro.has(texto)) { usados.add(texto); r.heredados.push({ ...h, archivo }); }
        else r.hallazgos.push({ ...h, archivo });
      }
    }
  }
  r.sinUso = heredados.filter((t) => !usados.has(t));
  return r;
}

// Markdown: cada línea, sin bloques ni fragmentos de código.
export function lineasMarkdown(md) {
  return md.replace(/```[\s\S]*?```/g, '').split('\n').map((l) => norm(l.replace(/`[^`]*`/g, ' '))).filter(Boolean);
}

function archivosDe(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? archivosDe(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

function main(args) {
  const dist = args.includes('--dist') ? args[args.indexOf('--dist') + 1] : 'dist';
  const i = args.indexOf('--archivos');
  const docs = i >= 0 ? args.slice(i + 1).filter((a) => !a.startsWith('--')) : [];
  const paginas = archivosDe(dist).filter((f) => f.endsWith('.html')).sort().map((archivo) => ({ archivo, html: fs.readFileSync(archivo, 'utf8') }));
  const heredados = JSON.parse(fs.readFileSync(HEREDADO, 'utf8')).segmentos.map((s) => s.texto);
  const web = repasar(paginas, heredados);
  const textos = repasar(docs.map((archivo) => ({ archivo, lineas: lineasMarkdown(fs.readFileSync(archivo, 'utf8')) })));
  const todos = [...web.hallazgos, ...textos.hallazgos];
  for (const h of todos) console.log(`${h.regla.padEnd(12)} ${h.archivo}: ${h.texto.slice(0, 160)}`);
  for (const t of web.sinUso) console.log(`aviso        registro heredado que ya no aparece en ${dist}: ${t.slice(0, 120)}`);
  const heredadosUnicos = new Set(web.heredados.map((h) => h.texto)).size;
  console.log(`\n${paginas.length} páginas y ${docs.length} documentos revisados · ${todos.length} hallazgos · ${heredadosUnicos} segmentos heredados registrados (${web.heredados.length} apariciones)`);
  return todos.length ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
