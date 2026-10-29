// test/verificar-adopcion.test.mjs — pruebas del verificador de adopción del estándar.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compareReport, normalizeJSONLD, norm } from '../scripts/verificar-adopcion.mjs';

function page(overrides = {}) {
  return {
    route: '/',
    url: 'https://3d-ultra.cl/',
    lang: 'es',
    title: 'Título de prueba',
    description: 'Descripción de prueba',
    h1: 'H1 original',
    canonical: 'https://3d-ultra.cl/',
    alternates: [],
    robots: 'index, follow',
    jsonld: [],
    anchors: ['#contacto'],
    contacts: {
      forms: ['/api/contact'],
      mailto: ['proyectos@mccocopper.cl'],
      whatsapp: ['https://wa.me/56979860843'],
      contactAnchors: ['#contacto'],
    },
    status: 200,
    ...overrides,
  };
}

describe('comparación de páginas', () => {
  it('falla cuando falta una ruta en el nuevo sitio', () => {
    const base = { '/perdida': page({ route: '/perdida' }) };
    const nuevo = {};
    const report = compareReport(base, nuevo);
    assert.equal(report.length, 1);
    assert.equal(report[0].route, '/perdida');
    assert.ok(report[0].diffs.some((d) => d.field === 'exists'));
  });

  it('falla cuando cambia el H1', () => {
    const base = { '/': page() };
    const nuevo = { '/': page({ h1: 'H1 cambiado' }) };
    const report = compareReport(base, nuevo);
    assert.ok(report.length > 0);
    assert.ok(report[0].diffs.some((d) => d.field === 'h1'));
  });

  it('falla cuando cambia el lang en /en/faq.html', () => {
    const base = { '/en/faq.html': page({ route: '/en/faq.html', lang: 'en' }) };
    const nuevo = { '/en/faq.html': page({ route: '/en/faq.html', lang: 'es' }) };
    const report = compareReport(base, nuevo);
    assert.ok(report.length > 0);
    assert.ok(report[0].diffs.some((d) => d.field === 'lang'));
  });

  it('falla cuando desaparece un destino de contacto', () => {
    const base = { '/': page() };
    const nuevo = {
      '/': page({
        contacts: { forms: [], mailto: [], whatsapp: [], contactAnchors: [] },
      }),
    };
    const report = compareReport(base, nuevo);
    assert.ok(report.length > 0);
    assert.ok(report[0].diffs.some((d) => d.field === 'contacts'));
  });

  it('no falla por el orden de las claves JSON en JSON-LD', () => {
    const objA = { '@type': 'FAQPage', '@context': 'https://schema.org', mainEntity: [] };
    const objB = { mainEntity: [], '@type': 'FAQPage', '@context': 'https://schema.org' };
    const base = { '/': page({ jsonld: normalizeJSONLD(JSON.stringify(objA)) }) };
    const nuevo = { '/': page({ jsonld: normalizeJSONLD(JSON.stringify(objB)) }) };
    const report = compareReport(base, nuevo);
    assert.equal(report.length, 0);
  });

  it('no falla por espacios insignificantes en el texto', () => {
    const base = { '/': page({ h1: 'GEMELOS DIGITALES  &   PLANTAS VIRTUALES.' }) };
    const nuevo = { '/': page({ h1: 'GEMELOS DIGITALES & PLANTAS VIRTUALES.' }) };
    const report = compareReport(base, nuevo);
    assert.equal(report.length, 0);
    assert.equal(norm(base['/'].h1), norm(nuevo['/'].h1));
  });
});

describe('verificador: reglas de listas', () => {
  it('verificador: un ancla nueva se informa y no falla', () => {
    const base = { '/': page({ anchors: ['#contacto'] }) };
    const nuevo = { '/': page({ anchors: ['#contacto', '#nueva-seccion'] }) };
    const report = compareReport(base, nuevo);
    const addition = report
      .find((r) => r.route === '/')
      ?.diffs.find((d) => d.field === 'anchors' && d.severity === 'addition');
    assert.ok(addition, 'se informa la adición del ancla');
    assert.ok(addition.nuevo.includes('#nueva-seccion'));
    const failures = report.filter((entry) => entry.diffs.some((d) => d.severity !== 'addition'));
    assert.equal(failures.length, 0, 'no debe generar fallas');
  });

  it('verificador: un contacto nuevo se informa y no falla', () => {
    const basePage = page();
    const nuevo = {
      '/': page({
        contacts: {
          ...basePage.contacts,
          mailto: [...basePage.contacts.mailto, 'nuevo@example.com'],
        },
      }),
    };
    const base = { '/': basePage };
    const report = compareReport(base, nuevo);
    const addition = report
      .find((r) => r.route === '/')
      ?.diffs.find((d) => d.field === 'contacts.mailto' && d.severity === 'addition');
    assert.ok(addition, 'se informa la adición del contacto');
    assert.ok(addition.nuevo.includes('nuevo@example.com'));
    const failures = report.filter((entry) => entry.diffs.some((d) => d.severity !== 'addition'));
    assert.equal(failures.length, 0, 'no debe generar fallas');
  });

  it('verificador: un contacto que desaparece falla', () => {
    const base = { '/': page() };
    const nuevo = {
      '/': page({
        contacts: { forms: [], mailto: [], whatsapp: [], contactAnchors: [] },
      }),
    };
    const report = compareReport(base, nuevo);
    const failures = report.filter((entry) => entry.diffs.some((d) => d.severity !== 'addition'));
    assert.ok(failures.length > 0, 'debe generar al menos una falla');
    assert.ok(
      failures.some((entry) => entry.diffs.some((d) => d.field === 'contacts' && d.severity === 'missing')),
      'la falla debe estar en los contactos'
    );
  });
});
