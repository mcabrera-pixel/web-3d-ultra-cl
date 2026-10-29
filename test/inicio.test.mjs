import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { enlaceConsulta, findBestMatch } from '../src/scripts/asistente-inicio.js';
import { verifyInicio } from '../scripts/verificar-adopcion.mjs';

// prebuild valida datos y lógica sin depender de dist. Los contratos de tarjetas,
// CTA, anclas, contenido y payload renderizados viven en verificar-adopcion.mjs.
test('los tres equipos conservan sus pósters locales y datos de tarjeta', () => {
  const files = readdirSync('src/content/equipos').filter(f => f.endsWith('.md'));
  assert.equal(files.length, 3);
  for (const file of files) {
    const ficha = yaml.load(readFileSync(`src/content/equipos/${file}`, 'utf8').split(/^---$/m)[1]);
    assert.ok(ficha.nombre && ficha.tipo);
    assert.ok(existsSync(`public/biblioteca/${file.replace(/\.md$/, '')}/poster.webp`));
  }
});
test('consulta desconocida conserva la derivación sin enviar mensajes', () => {
  const texto = 'Consulta singular <prueba> & "revisión"';
  assert.equal(findBestMatch(texto), null);
  const site = yaml.load(readFileSync('site.yaml', 'utf8'));
  const base = `https://wa.me/${site.contact.whatsapp.replace(/\D/g, '')}`;
  const url = new URL(enlaceConsulta(base, texto));
  assert.equal(url.origin + url.pathname, base);
  assert.equal(url.searchParams.get('text'), `Hola, consulta: ${texto}`);
  assert.ok(findBestMatch('Cotización'));
});
test('el verificador posterior al build rechaza portada vacía o sin tarjetas', () => {
  const errors = verifyInicio('<main><h1>Portada</h1></main>', {});
  assert.ok(errors.includes('Inicio: tres tarjetas de equipos'));
  assert.ok(errors.includes('Inicio: CTA Ver Demo Virtual'));
  assert.ok(errors.includes('Inicio: una nube y un campo'));
});
test('la CSP sigue sin abrir marcos para visores externos', () => {
  assert.deepEqual(yaml.load(readFileSync('site.yaml', 'utf8')).csp.frame_src, []);
});
