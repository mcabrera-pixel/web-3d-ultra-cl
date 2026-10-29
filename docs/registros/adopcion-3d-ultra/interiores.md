# Tarea 6: auxiliares integradas, interiores pendientes del kit

## Estado

Entrega parcial B5-t6. Blog, gracias, contacto-error y 404 usan `Sitio`, conservan
metadatos y `noindex`, con un solo `main`, H1 y bloque Grupo. No se modifica la
plantilla de posts ni se crean entradas o URLs del blog.

Los cuatro casos, la guía y la FAQ inglesa conservan sus HTML originales. **No se
han migrado ni retirado** y `legacy_pages` sigue en `true`. El verde del verificador
significa conservación de contratos; no certifica la adopción visual de esos seis
interiores. No se incorporan props inventadas, manipulación de idioma por JS,
`lang` sobre un bloque, copias del layout ni modificaciones al kit instalado.

## Dependencias comprobadas en v1.3.1

- `node_modules/@mcco/web-kit/layouts/Base.astro:12` fija `<html lang={site.lang}>`.
  `Head.astro:8` y `Estandar.astro:16` no ofrecen idioma por página. El manifiesto
  es `es-CL`; los cinco interiores españoles usan `es` y la FAQ `en`. Cambiarlos
  ahora rompe la comparación estricta existente. El documento inglés permanece
  realmente `lang="en"` porque se conserva `src/pages/en/faq.html`.
- `Head.astro:37` siempre emite robots; los seis originales no tienen esa meta.
  No existe prop para conservar su ausencia. No se relaja el verificador.
- `Head.astro:41` fija `og:url` al canonical limpio, mientras los seis originales
  usan `.html`. `:42`/`:43` fijan título y descripción OG a los de SEO, diferentes
  en los originales. El slot puede añadir metadatos pero no sustituirlos sin
  duplicarlos. Hace falta una interfaz publicada que permita conservarlos.
- Los alternates sí pueden preservarse manualmente en el slot `head`, pasando
  `alternates=[]`, para evitar el `x-default` automático de `Head.astro:51`.
  La guía usa `.html` en es/en/x-default; la FAQ usa `/` en es/x-default y `.html`
  en en. No se normalizan silenciosamente.

El plan exige resolver la API antes de convertir y retirar cada HTML junto con
su reemplazo. Por eso tampoco se cambia el manifiesto. El encargo prohíbe tocar
el kit/dependencias y pide registrar esta carencia; no se solicita ni realiza
publicación externa.

## Mapa de sustitución pendiente

Cada ruta limpia y su alias `.html` deben seguir resolviendo el mismo contenido:

| Ruta limpia | Fuente actual | Reemplazo pendiente |
|---|---|---|
| `/casos/gemelo-digital-raf-potrerillos` | `src/pages/casos/gemelo-digital-raf-potrerillos.html` | mismo nombre `.astro` |
| `/casos/analisis-chimenea-cps-salvador` | `src/pages/casos/analisis-chimenea-cps-salvador.html` | mismo nombre `.astro` |
| `/casos/hornos-isasmelt-extension-vida-util` | `src/pages/casos/hornos-isasmelt-extension-vida-util.html` | mismo nombre `.astro` |
| `/casos/rueda-moldeo-anodos-potrerillos` | `src/pages/casos/rueda-moldeo-anodos-potrerillos.html` | mismo nombre `.astro` |
| `/guias/gemelos-digitales-fundiciones-cobre` | `src/pages/guias/gemelos-digitales-fundiciones-cobre.html` | mismo nombre `.astro` |
| `/en/faq` | `src/pages/en/faq.html` | `src/pages/en/faq.astro` |

El grep exigido está en `B5-t6/logs/grep-previo.log`. Sus referencias desde portada,
biblioteca, guía, manifiesto y pruebas siguen válidas; no se elimina ningún destino.
La guía conserva `#definicion`, `#tipos`, `#componentes`, `#aplicaciones`,
`#metodologia`, `#roi`, `#casos` y `#futuro`.

## Guardianes y límites

- `seo-antes.json` permanece intacto. El comparador sigue rechazando cambios de
  idioma, title, description, H1, canonical, robots, alternates y JSON-LD.
- `interiores-antes.json` añade una captura de los seis HTML originales: Open
  Graph, párrafos, títulos, listas, celdas y enlaces del cuerpo. No es una
  recaptura para aceptar regresiones. Dos casos ya carecen de `og:image`.
- `scripts/verificar-adopcion.mjs` comprueba esa captura sobre `dist`, además de
  rechazar duplicados canonical/OG. Las pruebas de build comprueban cuatro
  enlaces a biblioteca, las diez preguntas inglesas, idioma y las auxiliares.
- Los tests previos de casos admiten `.html` o `.astro` y exigen cuatro rutas
  distintas; no se elimina la garantía durante una conversión futura.
- En Chrome a 390 px las tablas RAF (419,34 px) y guía (525,89 px) desbordan.
  Son defectos del HTML conservado. No se certifica todavía la aceptación móvil
  de los interiores. Las cuatro auxiliares no desbordan a 390 y 1440 px.
- La FAQ original es estática: diez preguntas y respuestas siempre visibles.
  Su cierre se alcanza con Tab; no existe acordeón que abrir por teclado.
- Las ocho anclas de la guía siguen en el HTML y cambian el hash. El arnés no
  confirma consistentemente su colocación visual con smooth scroll en Chrome
  headless; esa aceptación queda pendiente, sin ocultar sus resultados fallidos.
- La prueba local de HTTP/404 usa un servidor estático de QA. No equivale a
  Cloudflare Pages. La prueba de Pages para la nueva versión queda pendiente:
  el encargo prohíbe Wrangler y publicar.

Informe, comparación por ruta, capturas y resultados completos:
`/home/cloud/webs/encargos/3d-ultra/B5-t6/RESULTADO.md`.
