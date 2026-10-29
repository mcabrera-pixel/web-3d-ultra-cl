// Gate aditivo de Tarea 2: conserva intactos el verificador y la captura T1.
// Solo permite las tres adiciones explícitas de /gracias, nunca pérdidas.
// Ejecutar desde la raíz, después de npm run build:
// node docs/registros/adopcion-3d-ultra/verificar-t2.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { loadSite } from '@mcco/web-kit/lib/site.mjs';
import { captureFromFile, compareReport } from '../../../scripts/verificar-adopcion.mjs';

const base = JSON.parse(fs.readFileSync(new URL('./seo-antes.json', import.meta.url), 'utf8'));
const site = loadSite();
const esperado = structuredClone(base.pages);
const gracias = esperado['/gracias'];
gracias.anchors = [...new Set([...gracias.anchors, '#std-gnav-enlaces'])].sort();
gracias.contacts.mailto = [...new Set([...gracias.contacts.mailto, site.contact.email])].sort();
gracias.contacts.contactAnchors = [...new Set([...gracias.contacts.contactAnchors, '/#contacto'])].sort();

const nuevo = Object.fromEntries(await Promise.all(Object.keys(base.pages).map(async ruta =>
  [ruta, await captureFromFile('dist', site.domain, ruta)]
)));
const diferencias = compareReport(esperado, nuevo);
assert.deepEqual(diferencias, [], `Regresión fuera de las adiciones T2:\n${JSON.stringify(diferencias, null, 2)}`);

// Una pérdida en cualquiera de las listas de contratos originales sigue fallando.
for (const [ruta, pagina] of Object.entries(base.pages)) {
  if (pagina.status !== 200) continue;
  for (const ancla of pagina.anchors) assert.ok(nuevo[ruta].anchors.includes(ancla), `${ruta}: perdió ${ancla}`);
  for (const [tipo, destinos] of Object.entries(pagina.contacts)) {
    for (const destino of destinos) assert.ok(nuevo[ruta].contacts[tipo].includes(destino), `${ruta}: perdió ${destino}`);
  }
}
console.log(`OK: ${Object.keys(nuevo).length} rutas, contratos T1 conservados; solo las tres adiciones previstas en /gracias.`);
