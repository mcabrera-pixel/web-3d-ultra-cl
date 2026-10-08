import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/modelos/[archivo].js';

function r2(objetos) {
  return {
    async get(clave) {
      if (!(clave in objetos)) return null;
      return { body: objetos[clave], httpEtag: '"e1"', writeHttpMetadata() {} };
    },
  };
}
const pedir = (archivo, env) =>
  onRequestGet({ params: { archivo }, env, request: new Request(`https://3d-ultra.cl/modelos/${archivo}`) });

test('entrega el GLB con su tipo y caché', async () => {
  const r = await pedir('sandvik-lh621.glb', { MEDIOS: r2({ 'biblioteca/sandvik-lh621.glb': 'GLB' }) });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'model/gltf-binary');
  assert.match(r.headers.get('cache-control'), /max-age=86400/);
  assert.equal(await r.text(), 'GLB');
});

test('404 si el modelo no existe', async () => {
  const r = await pedir('no-existe.glb', { MEDIOS: r2({}) });
  assert.equal(r.status, 404);
});

test('rechaza nombres raros sin consultar R2', async () => {
  let consultado = false;
  const env = { MEDIOS: { async get() { consultado = true; return null; } } };
  for (const a of ['../secreto.glb', 'a.fbx', 'A.GLB', 'x/y.glb', '', 'a--b.glb']) {
    const r = await pedir(a, env);
    assert.equal(r.status, 404, a);
  }
  assert.equal(consultado, false);
});

test('503 si falta el binding de R2', async () => {
  const r = await pedir('sandvik-lh621.glb', {});
  assert.equal(r.status, 503);
});

test('304 cuando el navegador ya tiene esa versión', async () => {
  const env = { MEDIOS: { async get() { return { httpEtag: '"e1"', writeHttpMetadata() {} }; } } };
  const r = await pedir('sandvik-lh621.glb', env);
  assert.equal(r.status, 304);
});
