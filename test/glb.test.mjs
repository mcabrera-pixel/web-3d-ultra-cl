import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerGlb, problemasSalida } from '../tools/equipos/glb.mjs';

function glb(json, relleno = 0) {
  let txt = JSON.stringify(json);
  while (txt.length % 4) txt += ' ';
  const j = Buffer.from(txt);
  const b = Buffer.alloc(20 + j.length + relleno);
  b.writeUInt32LE(0x46546c67, 0);
  b.writeUInt32LE(2, 4);
  b.writeUInt32LE(b.length, 8);
  b.writeUInt32LE(j.length, 12);
  b.writeUInt32LE(0x4e4f534a, 16);
  j.copy(b, 20);
  return b;
}
const piezas = { marcadas: [{ nodo: 'Bucket_', etiqueta: 'Balde' }], grupos: [{ titulo: 'Carga', nodos: ['Bucket_', 'Main_Boom'] }], nombres: { Bucket_: 'Balde', Main_Boom: 'Brazo de levante' } };

test('lee peso, nodos y extensiones', () => {
  const info = leerGlb(glb({ asset: { version: '2.0' }, nodes: [{ name: 'Bucket_' }, { name: 'Main_Boom' }, {}], extensionsUsed: ['EXT_meshopt_compression'] }));
  assert.deepEqual(info.nodos, ['Bucket_', 'Main_Boom']);
  assert.deepEqual(info.extensiones, ['EXT_meshopt_compression']);
  assert.ok(info.bytes > 20);
});

test('rechaza archivos que no son GLB 2', () => {
  assert.throws(() => leerGlb(Buffer.from('no es un glb, solo texto')), /GLB/);
});

test('salida correcta: sin problemas', () => {
  const info = leerGlb(glb({ nodes: [{ name: 'Bucket_' }, { name: 'Main_Boom' }], extensionsUsed: ['EXT_meshopt_compression'] }));
  assert.deepEqual(problemasSalida(info, piezas), []);
});

test('salida con problemas: peso, compresión y nodo faltante', () => {
  const info = leerGlb(glb({ nodes: [{ name: 'Bucket_' }], extensionsUsed: [] }, 64));
  const p = problemasSalida(info, piezas, 50);
  assert.equal(p.length, 3);
  assert.match(p.join(' | '), /pesa/);
  assert.match(p.join(' | '), /meshopt/);
  assert.match(p.join(' | '), /Main_Boom/);
});

test('un nodo marcado sin nombre en español es un problema', () => {
  const info = leerGlb(glb({ nodes: [{ name: 'Bucket_' }, { name: 'Main_Boom' }], extensionsUsed: ['EXT_meshopt_compression'] }));
  const p = problemasSalida(info, { ...piezas, nombres: { Main_Boom: 'Brazo de levante' } });
  assert.deepEqual(p, ['el nodo Bucket_ no tiene nombre en español']);
});

test('el CLI verifica aunque la ruta pase por un enlace (symlink o junction)', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'glb-'));
  try {
    const real = join(tmp, 'real');
    mkdirSync(real);
    copyFileSync(fileURLToPath(new URL('../tools/equipos/glb.mjs', import.meta.url)), join(real, 'glb.mjs'));
    symlinkSync(real, join(tmp, 'enlace'), 'junction');
    writeFileSync(join(tmp, 'x.glb'), glb({ nodes: [{ name: 'Bucket_' }, { name: 'Main_Boom' }], extensionsUsed: ['EXT_meshopt_compression'] }));
    writeFileSync(join(tmp, 'piezas.json'), JSON.stringify(piezas));
    const salida = execFileSync(process.execPath, [join(tmp, 'enlace', 'glb.mjs'), join(tmp, 'x.glb'), join(tmp, 'piezas.json')], { encoding: 'utf8' });
    assert.match(salida, /2 nodos/);
    assert.match(salida, /OK/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('compara los nombres como los deja three.js: espacios a _ y sin [ ] . : /', () => {
  const info = leerGlb(glb({ nodes: [{ name: 'Pieza.001' }, { name: 'Brazo de levante' }], extensionsUsed: ['EXT_meshopt_compression'] }));
  const p = problemasSalida(info, {
    marcadas: [{ nodo: 'Pieza.001', etiqueta: 'Balde' }],
    grupos: [{ titulo: 'Carga', nodos: ['Pieza.001', 'Brazo_de_levante'] }],
    nombres: { 'Pieza.001': 'Balde', Brazo_de_levante: 'Brazo de levante' },
  });
  assert.equal(p.length, 1);
  assert.match(p[0], /Pieza\.001/);
  assert.match(p[0], /Pieza001/);
});

test('marca los nombres repetidos, porque three.js renombra las copias con _1', () => {
  const info = leerGlb(glb({ nodes: [{ name: 'Rueda' }, { name: 'Rueda' }, { name: 'Eje.1' }, { name: 'Eje1' }], extensionsUsed: ['EXT_meshopt_compression'] }));
  const p = problemasSalida(info, { marcadas: [], grupos: [{ titulo: 'Ruedas', nodos: ['Rueda', 'Eje1'] }], nombres: { Rueda: 'Rueda', Eje1: 'Eje' } });
  assert.equal(p.length, 2);
  assert.match(p.join(' | '), /Rueda.*repite/);
  assert.match(p.join(' | '), /Eje1.*repite/);
});

test('la etiqueta de una pieza marcada es su nombre en español', () => {
  const info = leerGlb(glb({ nodes: [{ name: 'Bucket_' }, { name: 'Main_Boom' }], extensionsUsed: ['EXT_meshopt_compression'] }));
  const p = problemasSalida(info, { ...piezas, marcadas: [{ nodo: 'Bucket_', etiqueta: 'Pala' }] });
  assert.equal(p.length, 1);
  assert.match(p[0], /etiqueta de Bucket_/);
  assert.match(p[0], /Balde/);
});

test('sin argumentos el CLI muestra el modo de uso', () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('../tools/equipos/glb.mjs', import.meta.url))], { encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Uso: node tools\/equipos\/glb\.mjs <archivo\.glb> <piezas\.json>/);
  assert.doesNotMatch(r.stderr, /TypeError/);
});
