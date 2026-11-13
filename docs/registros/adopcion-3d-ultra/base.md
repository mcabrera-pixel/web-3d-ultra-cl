# Línea base de 3d-ultra.cl — Tarea 1 de adopción del estándar Apple + antigravity

Fecha de captura: 2026-10-29.
Base: producción `https://3d-ultra.cl`.
Rama de trabajo: `feat/estandar-apple`.
Commit de partida: `aec77ff` — `chore(kit): sube @mcco/web-kit a v1.2.0`.
Kit fijado: `@mcco/web-kit` `v1.2.0` (`package.json:19`, `package-lock.json:1611`, workflows `@v1.2.0`).

## Conteos

- **11 indexables** según `sitemap.xml`.
- **4 auxiliares** (`/blog/`, `/gracias`, `/contacto-error`, `/404`).
- **6 aliases `.html`** de las páginas legacy (responden 200 con canonical limpio).
- **1 sonda 404** (`/ruta-que-no-existe-b5t1`).
- **22 rutas** en total capturadas en `seo-antes.json`.

## Rutas

Ver `rutas.txt`. Resumen por grupo:

Indexables:

1. `/`
2. `/biblioteca/`
3. `/biblioteca/komatsu-930e-5`
4. `/biblioteca/pala-ph-4100xpc`
5. `/biblioteca/sandvik-lh621`
6. `/casos/gemelo-digital-raf-potrerillos`
7. `/casos/analisis-chimenea-cps-salvador`
8. `/casos/hornos-isasmelt-extension-vida-util`
9. `/casos/rueda-moldeo-anodos-potrerillos`
10. `/guias/gemelos-digitales-fundiciones-cobre`
11. `/en/faq`

Auxiliares:

12. `/blog/`
13. `/gracias`
14. `/contacto-error`
15. `/404`

Aliases `.html`:

16. `/casos/gemelo-digital-raf-potrerillos.html`
17. `/casos/analisis-chimenea-cps-salvador.html`
18. `/casos/hornos-isasmelt-extension-vida-util.html`
19. `/casos/rueda-moldeo-anodos-potrerillos.html`
20. `/guias/gemelos-digitales-fundiciones-cobre.html`
21. `/en/faq.html`

Sonda 404:

22. `/ruta-que-no-existe-b5t1`

## Contratos capturados

Para cada ruta se guarda en `seo-antes.json`:

- Estado HTTP.
- `lang` del `<html>`.
- `title`, `description`, `h1` (espacios normalizados).
- `canonical` absoluto.
- `alternates` con `hreflang`.
- `robots`.
- `jsonld` normalizado (claves ordenadas, espacios estándar).
- Anclas (`id` de secciones y `href` internos).
- Destinos de contacto: `action` de formularios, `mailto`, WhatsApp (`wa.me`) y anclas `#contacto`.

Los correos ofuscados por Cloudflare se decodifican antes de comparar, de modo que la base conserve el destino real (`mcabrera@mccocopper.cl`, `proyectos@mccocopper.cl`).

## Defectos previos (no regresiones)

`npm run check` reporta **0 errores y 18 avisos** sobre `dist` actual. Son preexistentes al commit de partida:

- **R12-medios**: 1 aviso — video del hero sin poster (`https://pub-dd66483f8e7f497f9490ea37068612b0.r2.dev/VID.mp4`).
- **R2-description**: 6 avisos — descriptions de casos, guía e inglés >160 caracteres.
- **R2-title**: 4 avisos — titles de casos y guía >60 caracteres.
- **R7-entidad**: 6 avisos — páginas legacy sin bloque Grupo MCCO (RUT/dirección).
- **R8-csp**: 1 aviso — CSP con `'unsafe-eval'` sin justificar (`site.yaml csp.unsafe_eval`).

Estos avisos quedan registrados como previos; no se declaran resueltos en esta tarea.

## Uso del verificador

Capturar base:

```bash
node scripts/verificar-adopcion.mjs --capturar --base https://3d-ultra.cl --salida docs/registros/adopcion-3d-ultra/seo-antes.json
```

Comparar contra `dist` o contra otra URL:

```bash
node scripts/verificar-adopcion.mjs --base docs/registros/adopcion-3d-ultra/seo-antes.json --nuevo dist
node scripts/verificar-adopcion.mjs --base docs/registros/adopcion-3d-ultra/seo-antes.json --nuevo https://preview-3d-ultra.pages.dev
```

Salida distinta de cero ante pérdida de rutas, metadatos, idioma, JSON-LD, anclas o destinos de contacto. Ignora orden de claves JSON y espacios insignificantes.

## Resultado de la verificación inicial

- `node scripts/verificar-adopcion.mjs --base docs/registros/adopcion-3d-ultra/seo-antes.json --nuevo dist` → **OK**.
- `node scripts/verificar-adopcion.mjs --base docs/registros/adopcion-3d-ultra/seo-antes.json --nuevo https://3d-ultra.cl` → **OK**.
- `npm run parity -- --old https://3d-ultra.cl` → **paridad OK** (11 rutas).
- `node --test test/verificar-adopcion.test.mjs` → **6/6**.
