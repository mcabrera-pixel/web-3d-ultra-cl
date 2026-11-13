# Tarea 6: interiores y auxiliares con el kit v1.4.0

## Estado

Blog, gracias, contacto-error y 404 usan `Sitio` desde B5-t6. En B5-t6-a1 los cuatro casos, la guía y la FAQ
inglesa pasan a `.astro` con `Sitio` y el kit v1.4.0, y sus seis HTML se retiran en el mismo cambio.
`legacy_pages` queda en `false`: ya no hay interiores heredados.

## Mapa de sustitución

Cada ruta limpia y su alias `.html` salen del mismo archivo (`build.format: 'preserve'` del kit).

| Ruta limpia | Fuente retirada | Fuente nueva |
|---|---|---|
| `/casos/gemelo-digital-raf-potrerillos` | `src/pages/casos/gemelo-digital-raf-potrerillos.html` | mismo nombre `.astro` |
| `/casos/analisis-chimenea-cps-salvador` | `src/pages/casos/analisis-chimenea-cps-salvador.html` | mismo nombre `.astro` |
| `/casos/hornos-isasmelt-extension-vida-util` | `src/pages/casos/hornos-isasmelt-extension-vida-util.html` | mismo nombre `.astro` |
| `/casos/rueda-moldeo-anodos-potrerillos` | `src/pages/casos/rueda-moldeo-anodos-potrerillos.html` | mismo nombre `.astro` |
| `/guias/gemelos-digitales-fundiciones-cobre` | `src/pages/guias/gemelos-digitales-fundiciones-cobre.html` | mismo nombre `.astro` |
| `/en/faq` | `src/pages/en/faq.html` | `src/pages/en/faq.astro` |

El grep previo a la eliminación está en `B5-t6-a1/logs/grep-previo.log`. Las referencias de portada,
`site.yaml`, guía y pruebas apuntan a rutas que siguen existiendo; no se cambió ningún destino.

## Qué se conserva y cómo

- Idioma: prop `lang` del kit v1.4.0 (`es` en los cinco españoles, `en` en la FAQ). Llega a `<html lang>`
  y a `og:locale`, sin tocar `site.yaml` ni usar JS.
- Title, description, canonical y JSON-LD: props de `Sitio`, con los valores literales del HTML original.
- Open Graph: `type`, `ogTitle`, `ogDescription` y `ogUrl` (con su `.html` original).
- Robots: `robots={false}`, porque los originales no tenían esa meta.
- Alternates: `alternates={[]}` y los tres enlaces originales en el slot `head`, sin el `x-default`
  automático. La guía apunta a `.html` en es/x-default y a `/en/faq.html` en en; la FAQ apunta a `/` en
  es/x-default y a `.html` en en. Son diferencias previas con el canonical limpio, no se normalizan.
- `keywords` y `author` van en el slot `head`: `Head` no las emite, así que no se duplican.
- Cuerpo: H1, cápsula, encabezados, párrafos, listas, tablas, enlaces y anclas de la guía, en el mismo orden.
  El cierre conserva su título, texto y destino `../index.html#contacto`.

## Lo que el kit agrega y no se puede evitar con v1.4.0

- `og:site_name`, `og:locale` y las cuatro metas `twitter:*` en las seis páginas.
- `og:image` (la imagen por defecto `/og.webp`) en hornos ISASMELT y rueda de moldeo, que no la tenían.
  `Head` siempre emite `og:image`; omitirla necesita una opción nueva del kit. Desviación aceptada por el
  controlador, pendiente de `ogImage={false}` en el kit v1.4.1 antes de publicar.

## Presentación

- Hero claro con rótulo, H1 y línea de autor; el cuerpo se reparte en bloques parchment y blanco por cada
  H2; cierre en bloque negro con una píldora.
- Las tablas del caso RAF, del caso CPS y de la guía se desplazan dentro de su propio contenedor
  (`.interior-tabla`, enfocable con teclado); la página no se desborda a 390 px.
- Las anclas de la guía caen bajo la sub-navegación fija gracias al `scroll-padding-top` del kit.
- La FAQ usa barra, acción y pie en inglés con los textos y destinos del original. Las etiquetas internas
  del kit (menú, «inicio», bloque Grupo MCCO) siguen en español sin `lang="es"` (WCAG 3.1.2). Desviación
  aceptada, pendiente de idioma o `lang` en `NavGlobal`, `SubNav` y `FooterGrupo` en el kit v1.4.1 antes de publicar.

## Guardianes

- `scripts/verificar-adopcion.mjs` compara la secuencia del cuerpo (orden y repeticiones) contra
  `interiores-antes.json`; una celda movida a otra fila falla. El cuerpo se lee en orden de documento sobre
  `<main>` (en los originales, `<body>` sin la barra ni el pie antiguos) y sin las piezas del kit: hero,
  encabezados, párrafos, listas, celdas, rótulo de la cápsula, cifras y etiquetas del recuadro CPS, y el cierre
  con el texto de su botón. `interiores-antes.json` se recalculó con ese extractor desde los HTML del commit
  36f4034, no desde `dist`.
- **Límite del guardián:** admite texto añadido. Exige que lo heredado siga completo, en el mismo orden y con sus
  repeticiones, pero un párrafo o rótulo nuevo intercalado no falla. Es deliberado, para que la presentación
  pueda sumar piezas; un texto nuevo en estas páginas se revisa en el diff, no lo detecta el verificador.
- Una `og:image` o `twitter:image` que la base no tenía, o distinta, sale como `AVISO` en el verificador, sin
  fallar. Hoy avisa en hornos ISASMELT y rueda de moldeo (ver arriba).
- `test/build/interiores.test.mjs` exige idioma, un `main`, el bloque Grupo, ausencia de robots y el número de
  tablas (una en RAF, una en CPS, una en la guía), cada una en un contenedor desplazable; y juzga el índice del
  blog según sus entradas publicadas.

Informe completo: `/home/cloud/webs/encargos/3d-ultra/B5-t6-a1/RESULTADO.md`.
