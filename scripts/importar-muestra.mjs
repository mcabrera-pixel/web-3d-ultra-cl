#!/usr/bin/env node
// scripts/importar-muestra.mjs · Copia una muestra interactiva estática a public/muestras/<nombre>/ y le aplica los
// ajustes que exige el estándar del sitio, porque mcco-check y las pruebas de build revisan todo HTML de dist:
//   - meta robots noindex, canonical propia, descripción y Open Graph (la muestra queda fuera del sitemap);
//   - la marca de la barra pasa a ser el único h1, sin cambiar cómo se ve;
//   - la línea de la entidad (razón social, RUT y dirección, desde el kit) bajo un ancla fija;
//   - sin Montserrat ni fuentes remotas;
//   - una hoja propia, conformidad-mcco.css, con los estilos de esos ajustes (nada de estilos en línea).
// No se copian _headers (las cabeceras las genera mcco-headers), el paso a paso ni el video (va a R2).
// Uso: node scripts/importar-muestra.mjs <nombre>|--todas [--origen <carpeta>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEntity } from '@mcco/web-kit/lib/site.mjs';

const DOMINIO = 'https://3d-ultra.cl';
export const EXCLUIR = ['_headers', 'paso-a-paso.html', 'paso-a-paso.css', 'video'];
const TEXTO = /\.(html|css|js|mjs|json|svg|txt)$/i;

// Cada muestra declara su origen (carpeta hermana del repo, fuera de git), sus textos y dos anclas exactas de su HTML:
// la etiqueta de apertura de la marca y el elemento tras el que va la línea de la entidad.
export const MUESTRAS = {
  bomba: {
    origen: '../muestra-planta-bomba/publico',
    titulo: 'Muestra de gemelo digital: bomba PP-101 | 3D Ultra',
    descripcion: 'Muestra de 3D Ultra: una sala de bombas en 3D, con despiece según el manual de partes y datos de mantenimiento y operación. Datos de ejemplo.',
    marca: '<div class="marca">',
    entidadDespuesDe: '<div class="panel-pie">Piezas según la Tabla 28 del manual de la bomba</div>',
  },
  'bomba-esencial': {
    origen: '../muestra-planta-bomba/publico-opus',
    titulo: 'Muestra esencial de gemelo digital: bomba PP-101 | 3D Ultra',
    descripcion: 'Versión esencial de la muestra de 3D Ultra: sala de bombas en 3D, despiece según el manual de partes y paneles de SAP y PI. Datos de ejemplo.',
    marca: '<div class="brand">',
    entidadDespuesDe: '<div id="lista"></div>',
  },
};

export const CSS_CONFORMIDAD = `/* Generado por scripts/importar-muestra.mjs: estilos de los ajustes de conformidad del sitio. No editar a mano. */
[data-mcco-marca] { margin: 0; font-size: inherit; font-weight: inherit; line-height: inherit; }
.mcco-entidad { margin: 0; padding: 6px 12px 10px; font-size: 11px; line-height: 1.4; opacity: .72; }
.mcco-rut { white-space: nowrap; }
`;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function quitarFuentes(texto) {
  if (/fonts\.(googleapis|gstatic)\.com/.test(texto)) throw new Error('importar-muestra: la muestra pide una fuente remota');
  return texto.replace(/Montserrat\s*,\s*/g, '').replace(/,\s*Montserrat\b/g, '');
}

// Cierre del elemento que abre en `inicio`, contando aperturas y cierres de la misma etiqueta.
function cierreDe(html, inicio, etiqueta) {
  const re = new RegExp(`<(/?)${etiqueta}\\b[^>]*>`, 'gi');
  re.lastIndex = inicio;
  let nivel = 0;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    nivel += m[1] ? -1 : 1;
    if (nivel === 0) return { desde: m.index, hasta: m.index + m[0].length };
  }
  throw new Error(`importar-muestra: la marca no cierra su <${etiqueta}>`);
}

export function ajustarHTML(html, conf) {
  if (/data-mcco-marca|conformidad-mcco\.css/.test(html)) throw new Error('importar-muestra: el HTML ya fue ajustado; importa desde el origen');
  if (/<h1[\s>]/i.test(html)) throw new Error('importar-muestra: el origen ya trae un h1; revisa qué título debe quedar');
  const entidad = loadEntity();
  let out = html
    .replace(/[ \t]*<meta\s+name="(description|robots)"[^>]*>\r?\n?/gi, '')
    .replace(/[ \t]*<link\s+rel="canonical"[^>]*>\r?\n?/gi, '')
    .replace(/[ \t]*<meta\s+property="og:[^"]*"[^>]*>\r?\n?/gi, '');
  const viewport = out.match(/<meta\s+name="viewport"[^>]*>/i);
  if (!viewport) throw new Error('importar-muestra: falta meta viewport');
  const cabeza = [
    `<meta name="description" content="${esc(conf.descripcion)}">`,
    '<meta name="robots" content="noindex, nofollow">',
    `<link rel="canonical" href="${DOMINIO}/muestras/${conf.nombre}/">`,
    `<meta property="og:title" content="${esc(conf.titulo)}">`,
    `<meta property="og:description" content="${esc(conf.descripcion)}">`,
  ].join('\n');
  out = out.replace(viewport[0], `${viewport[0]}\n${cabeza}`);
  out = out.replace(/<\/head>/i, '<link rel="stylesheet" href="./conformidad-mcco.css">\n</head>');

  const i = out.indexOf(conf.marca);
  if (i < 0) throw new Error(`importar-muestra: no encuentro la marca ${conf.marca}`);
  const etiqueta = conf.marca.match(/^<([a-z0-9]+)/i)[1];
  const cierre = cierreDe(out, i, etiqueta);
  const apertura = conf.marca.replace(new RegExp(`^<${etiqueta}`), '<h1').replace(/>$/, ' data-mcco-marca>');
  out = out.slice(0, i) + apertura + out.slice(i + conf.marca.length, cierre.desde) + '</h1>' + out.slice(cierre.hasta);

  const j = out.indexOf(conf.entidadDespuesDe);
  if (j < 0) throw new Error(`importar-muestra: no encuentro el ancla de la entidad ${conf.entidadDespuesDe}`);
  const linea = `<p class="mcco-entidad">3D Ultra · ${esc(entidad.legalName)} · <span class="mcco-rut">RUT ${esc(entidad.taxID)}</span> · ${esc(entidad.addressText)}</p>`;
  const k = j + conf.entidadDespuesDe.length;
  return out.slice(0, k) + linea + out.slice(k);
}

function listar(dir) {
  return fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((d) => d.isFile())
    .map((d) => path.relative(dir, path.join(d.parentPath, d.name)).replaceAll('\\', '/'));
}
const excluido = (ruta) => EXCLUIR.some((e) => ruta === e || ruta.startsWith(`${e}/`));

/** Archivos de la muestra ya ajustados, como Map<ruta relativa, Buffer>. No escribe nada. */
export function generarMuestra(nombre, origen) {
  const conf = MUESTRAS[nombre];
  if (!conf) throw new Error(`importar-muestra: no conozco la muestra "${nombre}" (${Object.keys(MUESTRAS).join(', ')})`);
  const dir = origen ?? conf.origen;
  if (!fs.existsSync(path.join(dir, 'index.html'))) throw new Error(`importar-muestra: ${dir} no tiene index.html`);
  const salida = new Map();
  for (const ruta of listar(dir).filter((r) => !excluido(r)).sort()) {
    let buf = fs.readFileSync(path.join(dir, ruta));
    if (TEXTO.test(ruta)) {
      let txt = buf.toString('utf8').replace(/\r\n/g, '\n');
      if (/\.(html|css)$/i.test(ruta)) txt = quitarFuentes(txt);
      if (ruta === 'index.html') txt = ajustarHTML(txt, { ...conf, nombre });
      buf = Buffer.from(txt, 'utf8');
    }
    salida.set(ruta, buf);
  }
  salida.set('conformidad-mcco.css', Buffer.from(CSS_CONFORMIDAD, 'utf8'));
  return salida;
}

function importar(nombre, origen) {
  const archivos = generarMuestra(nombre, origen);
  const destino = path.resolve('public/muestras', nombre);
  if (!destino.startsWith(path.resolve('public/muestras') + path.sep)) throw new Error('importar-muestra: destino fuera de public/muestras');
  fs.rmSync(destino, { recursive: true, force: true });
  for (const [ruta, buf] of archivos) {
    fs.mkdirSync(path.dirname(path.join(destino, ruta)), { recursive: true });
    fs.writeFileSync(path.join(destino, ruta), buf);
  }
  const bytes = [...archivos.values()].reduce((a, b) => a + b.length, 0);
  console.log(`importar-muestra: ${nombre} → public/muestras/${nombre}/ (${archivos.size} archivos, ${(bytes / 1e6).toFixed(1)} MB)`);
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--origen');
  const origen = i >= 0 ? args[i + 1] : undefined;
  const nombres = args.includes('--todas') ? Object.keys(MUESTRAS) : args.filter((a, k) => !a.startsWith('--') && k !== i + 1);
  if (!nombres.length || (origen && nombres.length > 1)) {
    console.error('Uso: node scripts/importar-muestra.mjs <nombre>|--todas [--origen <carpeta>]');
    process.exit(2);
  }
  for (const n of nombres) importar(n, origen);
}
