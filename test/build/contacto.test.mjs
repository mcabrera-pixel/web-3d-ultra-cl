// Solo posterior a build: los tres formularios construidos, serializados como los enviaría un navegador sin JS,
// pasan por la función real de contacto con el proveedor simulado. Valores ficticios.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'parse5';
import { enviar } from '../apoyo/proveedor-simulado.mjs';

const elements = (node) => [node, ...(node.childNodes ?? []).flatMap(elements)];
const attr = (node, name) => node?.attrs?.find((a) => a.name === name)?.value;
const has = (node, name) => node?.attrs?.some((a) => a.name === name) ?? false;
const text = (node) => [node.value ?? '', ...(node.childNodes ?? []).map(text)].join('');

// Lo que escribiría una persona en los campos editables vacíos.
const ESCRITO = { nombre: 'Persona Ficticia', empresa: 'Empresa de Prueba', email: 'persona@ejemplo.invalid', mensaje: 'Mensaje ficticio', equipo: 'Equipo escrito a mano' };

// Controles exitosos del único formulario que apunta a /api/contact, en orden de documento.
function serializar(html) {
  const forms = elements(parse(html)).filter((n) => n.tagName === 'form' && attr(n, 'action') === '/api/contact');
  assert.equal(forms.length, 1, 'un formulario de contacto por página');
  assert.equal(attr(forms[0], 'method'), 'post');
  const pares = [];
  for (const n of elements(forms[0])) {
    const name = attr(n, 'name');
    if (!name || has(n, 'disabled')) continue;
    if (n.tagName === 'input') {
      const valor = attr(n, 'value') ?? '';
      const editable = attr(n, 'type') !== 'hidden' && !has(n, 'readonly') && attr(n, 'tabindex') !== '-1';
      pares.push([name, editable && !valor ? ESCRITO[name] ?? '' : valor]);
    } else if (n.tagName === 'textarea') pares.push([name, text(n) || ESCRITO[name] || '']);
    else if (n.tagName === 'select') {
      const opciones = elements(n).filter((o) => o.tagName === 'option');
      const elegida = opciones.find((o) => has(o, 'selected')) ?? opciones[0];
      pares.push([name, attr(elegida, 'value') ?? text(elegida).trim()]);
    }
  }
  return pares;
}

const CASOS = [
  { archivo: 'dist/index.html', referer: 'https://3d-ultra.cl/', nombres: ['subject', 'from_name', 'website_url', 'nombre', 'empresa', 'servicio', 'email'] },
  { archivo: 'dist/biblioteca/index.html', referer: 'https://3d-ultra.cl/biblioteca/', nombres: ['equipo', 'origen', 'website_url', 'nombre', 'empresa', 'email', 'mensaje'], origen: 'biblioteca/', equipo: ESCRITO.equipo },
  { archivo: 'dist/biblioteca/komatsu-930e-5.html', referer: 'https://3d-ultra.cl/biblioteca/komatsu-930e-5', nombres: ['equipo', 'origen', 'website_url', 'nombre', 'empresa', 'email', 'mensaje'], origen: 'biblioteca/komatsu-930e-5', equipo: 'Komatsu 930E-5' },
];

for (const caso of CASOS) {
  test(`${caso.archivo}: POST sin JS llega al Worker simulado con todos sus campos`, async () => {
    const pares = serializar(readFileSync(caso.archivo, 'utf8'));
    assert.deepEqual(pares.map(([k]) => k), caso.nombres);
    assert.equal(pares.find(([k]) => k === 'website_url')[1], '', 'la trampa queda vacía');
    const r = await enviar(pares, { referer: caso.referer });
    assert.equal(r.location, 'https://3d-ultra.cl/gracias');
    assert.equal(r.worker.length, 1);
    const { marca, origen, campos } = r.worker[0].body;
    assert.equal(marca, '3d-ultra');
    assert.equal(origen, caso.referer);
    assert.deepEqual(campos, Object.fromEntries(pares.filter(([k]) => k !== 'website_url')));
    if (caso.origen) {
      assert.equal(campos.origen, caso.origen);
      assert.equal(campos.equipo, caso.equipo);
    } else {
      assert.equal(campos.subject, 'Nuevo contacto desde 3d-ultra.cl');
      assert.equal(campos.servicio, 'Escaner Láser FARO / Nube de puntos');
    }
  });
}

test('quitar el hidden origen de la ficha se nota en el payload', async () => {
  const html = readFileSync('dist/biblioteca/komatsu-930e-5.html', 'utf8');
  const alterado = html.replace(/<input type="hidden" name="origen"[^>]*>/, '');
  assert.notEqual(alterado, html, 'la mutación debe retirar el hidden real');
  const r = await enviar(serializar(alterado), { referer: 'https://3d-ultra.cl/biblioteca/komatsu-930e-5' });
  assert.equal(r.worker[0].body.campos.origen, undefined);
});

test('la ficha deja el equipo de solo lectura y el hub lo deja editable', () => {
  const equipo = (archivo) => elements(parse(readFileSync(archivo, 'utf8'))).find((n) => n.tagName === 'input' && attr(n, 'name') === 'equipo');
  assert.ok(has(equipo('dist/biblioteca/komatsu-930e-5.html'), 'readonly'));
  assert.ok(!has(equipo('dist/biblioteca/index.html'), 'readonly'));
});

// reason=demora (kit v1.4.0) no confirma que el lead se perdió: la página de error no debe empujar a reenviarlo.
test('contacto-error advierte que el mensaje pudo llegar antes de invitar a reenviar', () => {
  const visible = text(parse(readFileSync('dist/contacto-error.html', 'utf8'))).replace(/\s+/g, ' ');
  assert.ok(!/intentarlo de nuevo/i.test(visible), 'sin invitación incondicional a reintentar');
  assert.ok(/pudo llegar igual/i.test(visible), 'advierte que el mensaje pudo llegar');
  assert.ok(/antes de enviarlo otra vez/i.test(visible), 'pide confirmar antes de reenviar');
});
