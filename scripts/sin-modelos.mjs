// scripts/sin-modelos.mjs · Falla si git versiona modelos 3D o comprimidos: los modelos comprados no se publican en el repo.
// Uso: node scripts/sin-modelos.mjs (parte de npm run check).
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const PROHIBIDAS = ['.fbx', '.obj', '.3ds', '.max', '.c4d', '.lwo', '.stl', '.stp', '.step', '.igs', '.iges', '.x_t', '.blend', '.glb', '.gltf', '.usdz', '.rar', '.zip'];

export function archivosProhibidos(rutas) {
  return rutas.filter((r) => PROHIBIDAS.some((ext) => r.toLowerCase().endsWith(ext)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rutas = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  const malos = archivosProhibidos(rutas);
  if (malos.length) {
    console.error(`sin-modelos: ${malos.length} archivo(s) de modelo en el repo:\n${malos.map((m) => `  ${m}`).join('\n')}`);
    process.exit(1);
  }
  console.log(`sin-modelos: OK (${rutas.length} archivos revisados)`);
}
