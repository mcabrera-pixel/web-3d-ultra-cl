// Contratos de contacto con proveedor simulado: la función real del kit (vía functions/api/contact.js) recibe
// POST como los de un navegador sin JS, y fetch queda reemplazado por un espía. Ningún dato es real.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ENV_FICTICIO, enviar, nombresDelFormulario } from './apoyo/proveedor-simulado.mjs';

const INICIO = [
  ['subject', 'Nuevo contacto desde 3d-ultra.cl'],
  ['from_name', '3D Ultra'],
  ['website_url', ''],
  ['nombre', 'Persona Ficticia'],
  ['empresa', 'Empresa de Prueba / Jefatura'],
  ['servicio', 'Modelado 3D BIM/LODS'],
  ['email', 'persona@ejemplo.invalid'],
];
const equipo = (nombreEquipo, origen) => [
  ['equipo', nombreEquipo],
  ['origen', origen],
  ['website_url', ''],
  ['nombre', 'Persona Ficticia'],
  ['empresa', 'Faena de Prueba'],
  ['email', 'persona@ejemplo.invalid'],
  ['mensaje', 'Mensaje ficticio de prueba'],
];
const camposEsperados = pares => Object.fromEntries(pares.filter(([k]) => k !== 'website_url'));

test('los fixtures usan los mismos campos, en el mismo orden, que los formularios del sitio', () => {
  assert.deepEqual(nombresDelFormulario(readFileSync('src/components/FormularioInicio.astro', 'utf8')), INICIO.map(([k]) => k));
  assert.deepEqual(nombresDelFormulario(readFileSync('src/components/FormularioEquipo.astro', 'utf8')), equipo('', '').map(([k]) => k));
});

test('inicio: el Worker recibe MARCA, Referer y todos los campos salvo la trampa; 302 a gracias', async () => {
  const r = await enviar(INICIO, { referer: 'https://3d-ultra.cl/' });
  assert.equal(r.status, 302);
  assert.equal(r.location, 'https://3d-ultra.cl/gracias');
  assert.equal(r.llamadas.length, 1, 'sin acuse ni Turnstile configurados, solo se llama al Worker');
  const [w] = r.worker;
  assert.equal(w.method, 'POST');
  assert.equal(w.headers['x-formularios-clave'], ENV_FICTICIO.FORMULARIOS_CLAVE);
  assert.deepEqual(w.body, { marca: '3d-ultra', origen: 'https://3d-ultra.cl/', campos: camposEsperados(INICIO) });
});

test('hub: equipo escrito por la persona y campos.origen del hidden, distinto del Referer', async () => {
  const pares = equipo('Camión de prueba escrito a mano', 'biblioteca/');
  const r = await enviar(pares, { referer: 'https://3d-ultra.cl/biblioteca/' });
  assert.equal(r.location, 'https://3d-ultra.cl/gracias');
  const { body } = r.worker[0];
  assert.equal(body.marca, '3d-ultra');
  assert.equal(body.origen, 'https://3d-ultra.cl/biblioteca/');
  assert.equal(body.campos.origen, 'biblioteca/');
  assert.deepEqual(body.campos, camposEsperados(pares));
});

test('ficha: equipo fijo y origen de la ficha conservados', async () => {
  const pares = equipo('Komatsu 930E-5', 'biblioteca/komatsu-930e-5');
  const r = await enviar(pares, { referer: 'https://3d-ultra.cl/biblioteca/komatsu-930e-5' });
  const { body } = r.worker[0];
  assert.equal(body.origen, 'https://3d-ultra.cl/biblioteca/komatsu-930e-5');
  assert.equal(body.campos.origen, 'biblioteca/komatsu-930e-5');
  assert.equal(body.campos.equipo, 'Komatsu 930E-5');
  assert.deepEqual(body.campos, camposEsperados(pares));
});

test('sin Referer el origen del Worker cae en el valor del kit y el hidden sigue intacto', async () => {
  const r = await enviar(equipo('Sandvik LH621', 'biblioteca/sandvik-lh621'));
  assert.equal(r.worker[0].body.origen, '/contacto/');
  assert.equal(r.worker[0].body.campos.origen, 'biblioteca/sandvik-lh621');
});

test('honeypot lleno: 302 a contacto-error con reason=spam y ninguna llamada externa', async () => {
  const pares = INICIO.map(([k, v]) => [k, k === 'website_url' ? 'https://spam.invalid' : v]);
  const r = await enviar(pares, { referer: 'https://3d-ultra.cl/' });
  assert.equal(r.location, 'https://3d-ultra.cl/contacto-error?reason=spam');
  assert.equal(r.llamadas.length, 0);
});

test('falta cualquiera de las tres variables: reason=config antes de llamar a nadie', async () => {
  for (const falta of ['FORMULARIOS_URL', 'FORMULARIOS_CLAVE', 'MARCA']) {
    const env = { ...ENV_FICTICIO, [falta]: '' };
    const r = await enviar(INICIO, { env, referer: 'https://3d-ultra.cl/' });
    assert.equal(r.location, 'https://3d-ultra.cl/contacto-error?reason=config', falta);
    assert.equal(r.llamadas.length, 0, falta);
  }
});

test('el Worker rechaza o responde sin ok: reason=correo; vence el plazo: reason=demora', async () => {
  const rechazo = await enviar(INICIO, { referer: 'https://3d-ultra.cl/', respuesta: () => Response.json({ ok: false }, { status: 500 }) });
  assert.equal(rechazo.location, 'https://3d-ultra.cl/contacto-error?reason=correo');
  const sinOk = await enviar(INICIO, { referer: 'https://3d-ultra.cl/', respuesta: () => Response.json({}) });
  assert.equal(sinOk.location, 'https://3d-ultra.cl/contacto-error?reason=correo');
  const demora = await enviar(INICIO, { referer: 'https://3d-ultra.cl/', respuesta: () => { throw new DOMException('plazo vencido', 'TimeoutError'); } });
  assert.equal(demora.location, 'https://3d-ultra.cl/contacto-error?reason=demora');
});

test('Turnstile configurado y sin token: reason=turnstile sin llegar al Worker', async () => {
  const r = await enviar(INICIO, { env: { ...ENV_FICTICIO, TURNSTILE_SECRET: 'secreto-ficticio' }, referer: 'https://3d-ultra.cl/' });
  assert.equal(r.location, 'https://3d-ultra.cl/contacto-error?reason=turnstile');
  assert.equal(r.llamadas.length, 0);
});

test('acuse opcional: solo con RESEND_API_KEY, al correo del formulario y después de que el Worker acepta', async () => {
  const env = { ...ENV_FICTICIO, RESEND_API_KEY: 'clave-resend-ficticia', SITE_NAME: '3D Ultra', WHATSAPP: '+56 9 0000 0000' };
  const r = await enviar(equipo('Pala P&H 4100XPC', 'biblioteca/pala-ph-4100xpc'), { env, referer: 'https://3d-ultra.cl/biblioteca/pala-ph-4100xpc' });
  assert.equal(r.location, 'https://3d-ultra.cl/gracias');
  assert.deepEqual(r.llamadas.map(l => l.url), [ENV_FICTICIO.FORMULARIOS_URL, 'https://api.resend.com/emails']);
  assert.deepEqual(r.llamadas[1].body.to, ['persona@ejemplo.invalid']);
  assert.match(r.llamadas[1].body.text, /^Hola Persona Ficticia:/);
  const fallo = await enviar(INICIO, { env, referer: 'https://3d-ultra.cl/', respuesta: () => Response.json({ ok: false }, { status: 502 }) });
  assert.equal(fallo.location, 'https://3d-ultra.cl/contacto-error?reason=correo');
  assert.equal(fallo.llamadas.length, 1, 'sin lead aceptado no hay acuse');
});
