// La portada heredada (src/legacy/index-body.html) se retira en la Tarea 7. Su contrato queda congelado en
// docs/registros/adopcion-3d-ultra/inicio-antes.json y el verificador lo usa en lugar del HTML.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractInicioBase, verifyInicio } from '../scripts/verificar-adopcion.mjs';

const LEGADO = `<section id="contacto"><h2>Hablemos — hoy</h2><p>Texto heredado</p>
  <form action="/api/contact" method="POST"><input type="hidden" name="subject" value="Asunto">
  <input name="email" type="email" required><select name="servicio"><option>Uno</option><option value="2">Dos</option></select>
  <button type="submit">Enviar</button></form>
  <a href="mailto:proyectos@ejemplo.invalid">correo</a><a href="https://wa.me/56900000000">wa</a><a href="/otra">otra</a></section>
  <div><p>Fuera de una sección</p></div>`;
const PORTADA = (form, extra = '') => `<main><h1>Portada</h1><p>Hablemos, hoy</p><p>Texto heredado</p>${form}
  <a href="mailto:proyectos@ejemplo.invalid">correo</a><a href="https://wa.me/56900000000">wa</a>${extra}</main>`;
const FORM = `<form action="/api/contact" method="POST"><input type="hidden" name="subject" value="Asunto">
  <input name="email" type="email" required><select name="servicio"><option>Uno</option><option value="2">Dos</option></select>
  <button type="submit">Enviar</button></form>`;

test('extractInicioBase congela formulario, textos de secciones y contactos auxiliares', () => {
  const base = extractInicioBase(LEGADO);
  assert.deepEqual(base.contenido, ['hablemos, hoy', 'texto heredado']);
  assert.deepEqual(base.contactos, ['mailto:proyectos@ejemplo.invalid', 'https://wa.me/56900000000']);
  assert.equal(base.formularios.length, 1);
  assert.deepEqual(base.formularios[0].fields.map(f => f.name), ['subject', 'email', 'servicio', '']);
  assert.deepEqual(base.formularios[0].fields[2].options, [{ value: '', text: 'Uno' }, { value: '2', text: 'Dos' }]);
});

test('verifyInicio con la base congelada detecta pérdidas de formulario, texto y contactos', () => {
  const base = extractInicioBase(LEGADO);
  const ok = verifyInicio(PORTADA(FORM), {}, base).filter(e => /heredad|auxiliar|formulario/.test(e));
  assert.deepEqual(ok, []);
  const sinOpcion = verifyInicio(PORTADA(FORM.replace('<option value="2">Dos</option>', '')), {}, base);
  assert.ok(sinOpcion.includes('Inicio: payload, opciones y validación del formulario heredado'));
  const sinTexto = verifyInicio(PORTADA(FORM).replace('<p>Texto heredado</p>', ''), {}, base);
  assert.ok(sinTexto.includes('Inicio: contenido heredado perdido: texto heredado'));
  const sinWa = verifyInicio(PORTADA(FORM).replace('<a href="https://wa.me/56900000000">wa</a>', ''), {}, base);
  assert.ok(sinWa.includes('Inicio: contacto auxiliar https://wa.me/56900000000'));
});

test('la base congelada de la portada conserva el formulario heredado completo', () => {
  const base = JSON.parse(readFileSync('docs/registros/adopcion-3d-ultra/inicio-antes.json', 'utf8'));
  const [form] = base.formularios;
  assert.equal(form.action, '/api/contact');
  assert.deepEqual(form.fields.filter(f => f.name).map(f => f.name), ['subject', 'from_name', 'website_url', 'nombre', 'empresa', 'servicio', 'email']);
  assert.equal(form.fields.find(f => f.name === 'servicio').options.length, 6);
  assert.ok(form.fields.find(f => f.name === 'email').required);
  assert.ok(base.contactos.some(h => h.startsWith('https://wa.me/')));
  assert.ok(base.contenido.length > 20);
});
