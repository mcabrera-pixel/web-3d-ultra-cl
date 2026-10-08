import { test } from 'node:test';
import assert from 'node:assert/strict';
import { archivosProhibidos } from '../scripts/sin-modelos.mjs';

test('detecta modelos y comprimidos sin importar mayúsculas', () => {
  assert.deepEqual(
    archivosProhibidos(['public/a.webp', 'x/Modelo.FBX', 'b.glb', 'c.zip', 'src/x.astro', 'd.blend']),
    ['x/Modelo.FBX', 'b.glb', 'c.zip', 'd.blend'],
  );
});

test('deja pasar imágenes, json, ajustes y código', () => {
  assert.deepEqual(archivosProhibidos(['public/biblioteca/x/poster.webp', 'public/biblioteca/x/piezas.json', 'tools/equipos/x.json', 'tools/equipos/preparar.py']), []);
});

test('no confunde nombres que solo contienen la extensión', () => {
  assert.deepEqual(archivosProhibidos(['notas.objetivos.md', 'glb-notas.txt', 'a.step.md', 'zipper.js']), []);
});
