// Solo posterior a build: ninguna página, hoja o script de dist pide Google Fonts ni nombra Montserrat.
// _headers queda fuera: el permiso heredado de la CSP lo pone mcco-headers (dependencia del kit, contacto-csp.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const archivos = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? archivos(path.join(dir, e.name)) : [path.join(dir, e.name)]));

test('dist no pide Google Fonts ni Montserrat', () => {
  const revisados = archivos('dist').filter((f) => /\.(html|css|js|txt|xml)$/.test(f));
  assert.ok(revisados.length > 20);
  const hallados = revisados.filter((f) => /fonts\.googleapis|fonts\.gstatic|Montserrat/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(hallados, []);
});
