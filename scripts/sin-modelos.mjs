// scripts/sin-modelos.mjs · Falla si git versiona modelos 3D o comprimidos: los modelos comprados no se publican en el repo.
// Uso: node scripts/sin-modelos.mjs. Lo corren prebuild (cada npm run build, también en la CI) y npm run check.
// Con --dist <carpeta> revisa lo que salió del build (lo corre postbuild): Astro copia todo public/ a dist/, también
// public/_local/ (ignorada por git), y el deploy manual publicaría ese modelo.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, realpathSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROHIBIDAS = ['.fbx', '.obj', '.3ds', '.max', '.c4d', '.lwo', '.stl', '.stp', '.step', '.igs', '.iges', '.x_t', '.blend', '.glb', '.gltf', '.usdz', '.rar', '.zip', '.7z', '.dae', '.ply', '.ma', '.mb', '.skp', '.3mf'];

export function archivosProhibidos(rutas) {
  return rutas.filter((r) => PROHIBIDAS.some((ext) => r.toLowerCase().endsWith(ext)));
}

// Problemas de un dist/: modelos o comprimidos, cualquier archivo bajo _local/ (modelos de prueba local) y fichas de la
// biblioteca cuyo visor no pide su propio modelo a /modelos/ (por ejemplo, un PUBLIC_MODELOS_BASE olvidado en un .env).
export function problemasDist(dist) {
  const rutas = readdirSync(dist, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => relative(dist, join(d.parentPath, d.name)).replaceAll('\\', '/'));
  const problemas = [];
  for (const r of rutas) {
    if (r.split('/').includes('_local')) problemas.push(`${r}: está en _local/, la carpeta de modelos para probar en local`);
    else if (archivosProhibidos([r]).length) problemas.push(`${r}: archivo de modelo o comprimido`);
  }
  for (const r of rutas.filter((x) => /^biblioteca\/[^/]+\.html$/.test(x) && x !== 'biblioteca/index.html')) {
    const esperado = `/modelos/${r.slice('biblioteca/'.length, -'.html'.length)}.glb`;
    const modelo = readFileSync(join(dist, r), 'utf8').match(/"modelo":"([^"]*)"/)?.[1];
    if (modelo !== esperado) problemas.push(`${r}: el visor pide ${modelo ?? 'ningún modelo'} en vez de ${esperado}`);
  }
  return problemas;
}

// Rutas reales en ambos lados: con un symlink o junction en la ruta, la URL del módulo y argv[1] no coinciden.
let principal = false;
try {
  principal = realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
} catch {
  // sin argv[1] o ruta ilegible: el módulo se importó, no se ejecutó
}

if (principal && process.argv.includes('--dist')) {
  const dist = process.argv[process.argv.indexOf('--dist') + 1];
  if (!dist) {
    console.error('Uso: node scripts/sin-modelos.mjs [--dist <carpeta del build>]');
    process.exit(2);
  }
  const problemas = problemasDist(dist);
  if (problemas.length) {
    console.error(`sin-modelos: ${problemas.length} problema(s) en ${dist}:\n${problemas.map((p) => `  ${p}`).join('\n')}`);
    process.exit(1);
  }
  console.log(`sin-modelos: ${dist} OK (sin modelos ni _local/, y cada ficha pide su modelo a /modelos/)`);
} else if (principal) {
  const rutas = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  const malos = archivosProhibidos(rutas);
  if (malos.length) {
    console.error(`sin-modelos: ${malos.length} archivo(s) de modelo en el repo:\n${malos.map((m) => `  ${m}`).join('\n')}`);
    process.exit(1);
  }
  console.log(`sin-modelos: OK (${rutas.length} archivos revisados)`);
}
