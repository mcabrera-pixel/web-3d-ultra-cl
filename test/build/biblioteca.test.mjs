// Contratos de la biblioteca construida; solo se ejecuta después del build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'parse5';
import yaml from 'js-yaml';
const elements = node => [node, ...(node.childNodes ?? []).flatMap(elements)];
const attr = (node, name) => node?.attrs?.find(a => a.name === name)?.value;
const has = (node, name) => node?.attrs?.some(a => a.name === name);
const text = node => [node.value ?? '', ...(node.childNodes ?? []).map(text)].join('').replace(/\s+/g, ' ').trim();
const equipos = readdirSync('src/content/equipos').filter(f => f.endsWith('.md')).map(f => ({slug:f.slice(0,-3), data:yaml.load(readFileSync(`src/content/equipos/${f}`, 'utf8').split(/^---$/m)[1])}));
const site = yaml.load(readFileSync('site.yaml', 'utf8'));
const routes = [{slug:'', data:null}, ...equipos];
for (const {slug, data} of routes) {
  test(`biblioteca/${slug}: estructura, formulario, datos y navegación`, () => {
    const nodes = elements(parse(readFileSync(`dist/biblioteca/${slug || 'index'}.html`, 'utf8')));
    const tag = name => nodes.filter(n => n.tagName === name);
    const cls = name => nodes.filter(n => (attr(n, 'class') ?? '').split(/\s+/).includes(name));
    assert.equal(tag('main').length, 1);
    assert.equal(tag('h1').length, 1);
    assert.equal(cls('std-gnav').length, 1);
    assert.equal(nodes.filter(n => attr(n,'data-mcco')==='grupo').length, 1);
    assert.equal(cls('bib-cabecera').length, 0);
    assert.ok(!tag('link').some(n => /fonts\.google/.test(attr(n,'href') ?? '')));
    assert.equal(attr(cls('std-subnav__accion')[0], 'href'), '#contacto');
    const form = cls('bib-form')[0];
    assert.equal(attr(form, 'method'), 'post');
    assert.equal(attr(form, 'action'), '/api/contact');
    const fields = elements(form).filter(n => ['input','textarea'].includes(n.tagName));
    assert.deepEqual(fields.map(n => attr(n,'name')), ['equipo','origen','website_url','nombre','empresa','email','mensaje']);
    assert.equal(attr(fields[0],'value') ?? '', data?.nombre ?? '');
    assert.equal(has(fields[0],'readonly'), !!slug);
    assert.equal(attr(fields[1],'value'), `biblioteca/${slug}`);
    assert.ok(has(fields.find(n=>attr(n,'name')==='nombre'),'required'));
    assert.ok(has(fields.find(n=>attr(n,'name')==='email'),'required'));
    assert.equal(attr(fields.find(n=>attr(n,'name')==='email'),'type'), 'email');
    const wa = new URL(attr(cls('bib-btn-borde')[0], 'href'));
    assert.equal(wa.origin+wa.pathname, `https://wa.me/${site.contact.whatsapp.replace(/\D/g,'')}`);
    assert.equal(wa.searchParams.get('text'), slug ? `Hola, vi ${data.articulo} ${data.nombre} en la biblioteca de ${site.name} y quiero saber más` : `Hola, vi la biblioteca de equipos de ${site.name} y quiero saber más`);
    const cards = cls('bib-tarjeta').filter(n=>has(n,'data-etapa'));
    assert.equal(cards.length, slug?2:3);
    for (const card of cards) assert.ok(equipos.some(e => attr(card,'href')===`/biblioteca/${e.slug}`&&attr(card,'data-etapa')===e.data.etapa));
    if(slug){
      assert.equal(attr(cls('bib-poster')[0],'width'),'1600');
      assert.equal(attr(cls('bib-poster')[0],'height'),'1000');
      assert.equal(attr(cls('bib-poster')[0],'fetchpriority'),'high');
      assert.equal(JSON.parse(text(cls('bib-datos')[0])).modelo, `/modelos/${slug}.glb`);
      assert.equal(text(cls('bib-pie-visor')[0]),'Modelo 3D de referencia. Las marcas y modelos pertenecen a sus fabricantes.');
      for(const q of data.faq) assert.ok(tag('summary').some(n=>text(n)===q.q));
      for(const experiencia of data.experiencia) assert.ok(tag('li').some(n=>text(n)===experiencia));
    }
  });
}
