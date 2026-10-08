// tools/equipos/glb.mjs · Lee un GLB y verifica la salida de preparar.py antes de subirla a R2.
// Uso: node tools/equipos/glb.mjs <archivo.glb> <piezas.json>   (sale con 1 si hay problemas)
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function leerGlb(buffer) {
  const b = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (b.byteLength < 20) throw new Error('no es GLB: archivo demasiado corto');
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('no es GLB: falta la firma glTF');
  if (dv.getUint32(4, true) !== 2) throw new Error('GLB de una versión distinta de 2');
  const largo = dv.getUint32(12, true);
  if (dv.getUint32(16, true) !== 0x4e4f534a) throw new Error('GLB sin bloque JSON al inicio');
  const json = JSON.parse(new TextDecoder().decode(b.subarray(20, 20 + largo)));
  return {
    bytes: b.byteLength,
    nodos: (json.nodes ?? []).map((n) => n.name).filter(Boolean),
    extensiones: json.extensionsUsed ?? [],
  };
}

// Nombre con que GLTFLoader de three.js deja un nodo (PropertyBinding.sanitizeNodeName): espacios a «_», sin [ ] . : /
export function nombreThree(nombre) {
  return nombre.replace(/\s/g, '_').replace(/[\[\]\.:\/]/g, '');
}

export function problemasSalida(info, piezas, maxBytes = 5_000_000) {
  const p = [];
  if (info.bytes > maxBytes) p.push(`pesa ${(info.bytes / 1e6).toFixed(2)} MB (máximo ${(maxBytes / 1e6).toFixed(2)} MB)`);
  if (!info.extensiones.includes('EXT_meshopt_compression')) p.push('sin compresión meshopt (falta pasar por gltfpack -cc)');
  // Se compara con los nombres que verá el visor: saneados, y si se repiten three.js renombra las copias con _1, _2…
  const enThree = new Map();
  for (const n of info.nodos.map(nombreThree)) enThree.set(n, (enThree.get(n) ?? 0) + 1);
  for (const [n, veces] of enThree) if (veces > 1) p.push(`el nombre ${n} se repite ${veces} veces en el GLB (three.js renombra las copias con _1)`);
  const usados = new Set([...piezas.marcadas.map((m) => m.nodo), ...piezas.grupos.flatMap((g) => g.nodos), ...Object.keys(piezas.nombres)]);
  const crudos = new Set(info.nodos);
  for (const n of usados) {
    if (!enThree.has(n)) p.push(crudos.has(n) ? `el nodo ${n} llega a three.js como ${nombreThree(n)}` : `falta el nodo ${n} en el GLB`);
    else if (!piezas.nombres[n]) p.push(`el nodo ${n} no tiene nombre en español`);
  }
  for (const m of piezas.marcadas) {
    const nombre = piezas.nombres[m.nodo];
    if (nombre && m.etiqueta !== nombre) p.push(`la etiqueta de ${m.nodo} («${m.etiqueta}») no es su nombre en español («${nombre}»)`);
  }
  return p;
}

// Rutas reales en ambos lados: con un symlink o junction en la ruta, la URL del módulo y argv[1] no coinciden.
let principal = false;
try {
  principal = realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
} catch {
  // sin argv[1] o ruta ilegible: no es el principal
}
if (principal) {
  const [archivo, piezasJson] = process.argv.slice(2);
  if (!archivo || !piezasJson) {
    console.error('Uso: node tools/equipos/glb.mjs <archivo.glb> <piezas.json>');
    process.exit(2);
  }
  const info = leerGlb(readFileSync(archivo));
  const p = problemasSalida(info, JSON.parse(readFileSync(piezasJson, 'utf8')));
  console.log(`${archivo}: ${(info.bytes / 1e6).toFixed(2)} MB, ${info.nodos.length} nodos, extensiones ${info.extensiones.join(', ') || 'ninguna'}`);
  if (p.length) { console.error(p.map((x) => `  ${x}`).join('\n')); process.exit(1); }
  console.log('  OK');
}
