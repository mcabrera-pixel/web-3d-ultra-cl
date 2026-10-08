import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  distanciaEncuadre, pasoExplosion, ladoVisible, alternarSeleccion,
  avanceScroll, aperturaNube, nombrePieza, ruedaAcerca,
} from '../src/scripts/visor3d-logica.js';

const cerca = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} no es ${b}`);

test('encuadre: en pantalla ancha usa el campo vertical con margen 0,82', () => {
  const v = (35 * Math.PI) / 360;
  cerca(distanciaEncuadre(1, 35, 16 / 9), 0.82 / Math.sin(v));
});

test('encuadre: en celular usa el campo horizontal y más margen', () => {
  const v = (35 * Math.PI) / 360;
  const h = Math.atan(Math.tan(v) * 0.5);
  cerca(distanciaEncuadre(1, 35, 0.5), 1.35 / Math.sin(h));
  assert.ok(distanciaEncuadre(1, 35, 0.5) > distanciaEncuadre(1, 35, 16 / 9));
});

test('explosión: va del centro del equipo al de la pieza, con largo igual al radio', () => {
  const p = pasoExplosion([3, 0, 4], [0, 0, 0], 10);
  cerca(p[0], 6); cerca(p[1], 0); cerca(p[2], 8);
});

test('explosión: una pieza en el centro sube', () => {
  assert.deepEqual(pasoExplosion([1, 1, 1], [1, 1, 1], 2), [0, 2, 0]);
});

test('lado visible: de frente sí, detrás no, y la altura no cuenta', () => {
  assert.equal(ladoVisible([1, 0, 0], [0, 0, 0], [5, 2, 0]), true);
  assert.equal(ladoVisible([-1, 0, 0], [0, 0, 0], [5, 2, 0]), false);
  assert.equal(ladoVisible([0, 9, 0], [0, 0, 0], [5, 2, 0]), true);
});

test('alternar: tocar la pieza elegida vuelve al equipo completo; tocar otra la cambia', () => {
  const a = { id: 'a' };
  const b = { id: 'b' };
  assert.equal(alternarSeleccion(null, a), a);
  assert.equal(alternarSeleccion(a, a), null);
  assert.equal(alternarSeleccion(a, b), b);
});

test('avance del scroll: acotado entre 0 y 1', () => {
  assert.equal(avanceScroll(0, 100, 300), 0);
  assert.equal(avanceScroll(200, 100, 300), 0.5);
  assert.equal(avanceScroll(900, 100, 300), 1);
  assert.equal(avanceScroll(50, 300, 300), 0);
});

test('nube: cerrada al inicio, abierta a un sexto y quieta con movimiento reducido', () => {
  cerca(aperturaNube(0), 0.03);
  cerca(aperturaNube(1 / 6), 0.17);
  assert.equal(aperturaNube(0.4, true), 0.05);
});

test('nombres: en español si existe, genérico si no', () => {
  assert.equal(nombrePieza({ Door: 'Cabina del operador' }, 'Door'), 'Cabina del operador');
  assert.equal(nombrePieza({}, 'Mesh_12'), 'Pieza del equipo');
});

test('rueda: solo acerca con Ctrl o Cmd', () => {
  assert.equal(ruedaAcerca({ ctrlKey: false, metaKey: false }), false);
  assert.equal(ruedaAcerca({ ctrlKey: true }), true);
  assert.equal(ruedaAcerca({ metaKey: true }), true);
});
