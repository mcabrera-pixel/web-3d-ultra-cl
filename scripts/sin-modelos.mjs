// scripts/sin-modelos.mjs · Falla si git versiona modelos 3D o comprimidos: los modelos comprados no se publican en el repo.
// Uso: node scripts/sin-modelos.mjs. Lo corren prebuild (cada npm run build, también en la CI) y npm run check.
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const PROHIBIDAS = ['.fbx', '.obj', '.3ds', '.max', '.c4d', '.lwo', '.stl', '.stp', '.step', '.igs', '.iges', '.x_t', '.blend', '.glb', '.gltf', '.usdz', '.rar', '.zip'];

export function archivosProhibidos(rutas) {
  return rutas.filter((r) => PROHIBIDAS.some((ext) => r.toLowerCase().endsWith(ext)));
}

// Rutas reales en ambos lados: con un symlink o junction en la ruta, la URL del módulo y argv[1] no coinciden.
let principal = false;
try {
  principal = realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
} catch {
  // sin argv[1] o ruta ilegible: el módulo se importó, no se ejecutó
}

if (principal) {
  const rutas = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  const malos = archivosProhibidos(rutas);
  if (malos.length) {
    console.error(`sin-modelos: ${malos.length} archivo(s) de modelo en el repo:\n${malos.map((m) => `  ${m}`).join('\n')}`);
    process.exit(1);
  }
  console.log(`sin-modelos: OK (${rutas.length} archivos revisados)`);
}
