// El paquete @mcco/web-kit, el lockfile y los dos workflows del sitio apuntan al mismo tag del kit (docs/LOCKFILE.md del
// kit: paquete, lockfile y workflows van juntos). El tag v1.4.3 (61d6dff) apunta al commit df57af4 del kit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const TAG = 'v1.4.3';
const COMMIT = 'df57af40a25317233c7a30ce831f1053a15e8d49';
const ESPEC = `github:mcabrera-pixel/mcco-web-kit#${TAG}`;
const leer = (ruta) => fs.readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');

test(`kit: package.json pide @mcco/web-kit ${TAG}`, () => {
  assert.equal(JSON.parse(leer('package.json')).dependencies['@mcco/web-kit'], ESPEC);
});

test(`kit: el lockfile resuelve @mcco/web-kit en ${TAG} (${COMMIT.slice(0, 7)})`, () => {
  const lock = JSON.parse(leer('package-lock.json'));
  assert.equal(lock.packages[''].dependencies['@mcco/web-kit'], ESPEC);
  const kit = lock.packages['node_modules/@mcco/web-kit'];
  assert.equal(kit.version, TAG.slice(1));
  assert.equal(kit.resolved, `git+ssh://git@github.com/mcabrera-pixel/mcco-web-kit.git#${COMMIT}`);
});

test(`kit: ci.yml y deploy.yml usan los workflows del kit en @${TAG}`, () => {
  for (const [archivo, workflow] of [['ci.yml', 'site-ci.yml'], ['deploy.yml', 'site-deploy.yml']]) {
    const usos = [...leer(`.github/workflows/${archivo}`).matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
    assert.deepEqual(usos, [`mcabrera-pixel/mcco-web-kit/.github/workflows/${workflow}@${TAG}`], archivo);
  }
});
