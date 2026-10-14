import { test } from 'node:test';
import assert from 'node:assert/strict';
import { otrosEquipos } from '../src/scripts/biblioteca-logica.js';

const e = (id, etapa, orden) => ({ id, data: { etapa, orden } });
// Biblioteca de F2 (9 equipos), con etapas repetidas
const F2 = [
  e('a', 'transporte', 1), e('b', 'carguio', 2), e('c', 'subterranea', 3), e('d', 'transporte', 4), e('e', 'carguio', 5),
  e('f', 'chancado', 6), e('g', 'transporte', 7), e('h', 'molienda', 8), e('i', 'clasificacion', 9),
];

test('otros equipos: primero los de la misma etapa y después por orden, hasta 3', () => {
  assert.deepEqual(otrosEquipos(F2, F2[0]).map((x) => x.id), ['d', 'g', 'b']);
  assert.deepEqual(otrosEquipos(F2, F2[1]).map((x) => x.id), ['e', 'a', 'c']);
  assert.deepEqual(otrosEquipos([...F2].reverse(), F2[0]).map((x) => x.id), ['d', 'g', 'b'], 'no depende del orden de entrada');
});

test('otros equipos: nunca trae la ficha que se está viendo', () => {
  for (const actual of F2) assert.ok(!otrosEquipos(F2, actual).some((x) => x.id === actual.id), actual.id);
});

test('otros equipos: con 3 fichas quedan 2 (la tercera tarjeta es la de contacto)', () => {
  const F1 = [e('komatsu-930e-5', 'transporte', 1), e('pala-ph-4100xpc', 'carguio', 2), e('sandvik-lh621', 'subterranea', 3)];
  assert.deepEqual(otrosEquipos(F1, F1[2]).map((x) => x.id), ['komatsu-930e-5', 'pala-ph-4100xpc']);
});
