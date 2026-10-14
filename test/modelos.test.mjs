import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet, onRequestHead } from '../functions/modelos/[archivo].js';

// R2 falso: como el de verdad, writeHttpMetadata copia la codificación con que se subió el objeto
function r2(objetos, httpMetadata = {}) {
  return {
    async get(clave) {
      if (!(clave in objetos)) return null;
      return {
        body: objetos[clave],
        httpEtag: '"e1"',
        httpMetadata,
        writeHttpMetadata(h) {
          if (httpMetadata.contentEncoding) h.set('content-encoding', httpMetadata.contentEncoding);
        },
      };
    },
  };
}
const contexto = (archivo, env) => ({ params: { archivo }, env, request: new Request(`https://3d-ultra.cl/modelos/${archivo}`) });
const pedir = (archivo, env) => onRequestGet(contexto(archivo, env));

// encodeBody es del runtime de Cloudflare y Node lo ignora: se anota lo que la función le pasa a cada Response
async function conOpciones(fn) {
  const Original = globalThis.Response;
  const opciones = [];
  globalThis.Response = class extends Original {
    constructor(cuerpo, init) {
      super(cuerpo, init);
      opciones.push(init ?? {});
    }
  };
  try {
    return { r: await fn(), opciones };
  } finally {
    globalThis.Response = Original;
  }
}

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

test('el GLB lleva X-Robots-Tag: los buscadores no indexan el archivo', async () => {
  const r = await pedir('sandvik-lh621.glb', { MEDIOS: r2({ 'biblioteca/sandvik-lh621.glb': 'GLB' }) });
  assert.equal(r.headers.get('x-robots-tag'), 'noindex, nofollow');
});

test('HEAD responde lo mismo que GET, sin cuerpo', async () => {
  const env = { MEDIOS: r2({ 'biblioteca/sandvik-lh621.glb': 'GLB' }) };
  const r = await onRequestHead(contexto('sandvik-lh621.glb', env));
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'model/gltf-binary');
  assert.equal(r.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal(r.body, null);
});

test('HEAD de un modelo que no existe o de un nombre raro da 404', async () => {
  const env = { MEDIOS: r2({}) };
  assert.equal((await onRequestHead(contexto('no-existe.glb', env))).status, 404);
  assert.equal((await onRequestHead(contexto('../secreto.glb', env))).status, 404);
});

test('un GLB subido con gzip sale tal cual: Content-Encoding gzip y sin volver a comprimirlo', async () => {
  const env = { MEDIOS: r2({ 'biblioteca/sandvik-lh621.glb': 'GZ' }, { contentEncoding: 'gzip' }) };
  const { r, opciones } = await conOpciones(() => pedir('sandvik-lh621.glb', env));
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-encoding'), 'gzip');
  assert.equal(r.headers.get('content-type'), 'model/gltf-binary');
  assert.equal(opciones.at(-1).encodeBody, 'manual');
  assert.equal(await r.text(), 'GZ');
});

test('un GLB sin comprimir sale sin Content-Encoding y el runtime puede comprimirlo como siempre', async () => {
  const env = { MEDIOS: r2({ 'biblioteca/sandvik-lh621.glb': 'GLB' }) };
  const { r, opciones } = await conOpciones(() => pedir('sandvik-lh621.glb', env));
  assert.equal(r.headers.get('content-encoding'), null);
  assert.notEqual(opciones.at(-1).encodeBody, 'manual');
});
