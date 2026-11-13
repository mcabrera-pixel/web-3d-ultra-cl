# Revisión y vista previa de la adopción (Tarea 8)

Sesión del PC, 13-nov-2026. Rama `feat/estandar-apple` en 4f13490, que incluye las Tareas 1 a 7 y el caso de
demostración de la bomba (PR #10).

## Vista previa

- https://feat-estandar-apple.3d-ultra.pages.dev (deploy 5cb00632, no es producción).
- Producción al momento de la revisión: deploy 0cb2a376, de `main` en bdbe840.

## Verificación

| Comprobación | Resultado |
|---|---|
| `npm ci`, `npm run build` | 16 páginas |
| `npm run check` | mcco-check 0 errores y 11 avisos de la línea base; `sin-modelos` y verificador de adopción en verde |
| `npm test` | 131 de 131 |
| `npm run parity -- --old https://3d-ultra.cl` | paridad OK |
| Paridad de producción contra la vista previa, 22 rutas de `rutas.txt` | paridad OK, con la ruta inexistente en 404 |
| Modelos de la biblioteca en la vista previa | los tres `.glb` responden 200 por el enlace `MEDIOS` |

## Lighthouse en celular, mediana de cinco corridas

| Página | Producción | Vista previa |
|---|---|---|
| Portada | 81 de rendimiento, 76 de accesibilidad, LCP 4,30 s, CLS 0 | 97 de rendimiento, 100 de accesibilidad, LCP 2,04 s, CLS 0 |
| Ficha Komatsu 930E-5 | 91 de rendimiento, 100 de accesibilidad, LCP 2,97 s | 100 de rendimiento, 100 de accesibilidad, LCP 1,59 s |
| Caso de la bomba (tres corridas) | no existe | 99 de rendimiento, 100 de accesibilidad, LCP 1,67 s |

Medido en un PC que tenía otros trabajos corriendo. Las medianas están en `lighthouse/medianas.json` y las corridas
completas quedaron fuera del repo, en la carpeta de trabajo de la marca.

## Navegador (Chrome)

- Siete páginas en tres anchos (1366, 390 y 320 px, el último con movimiento reducido): sin errores de consola, sin
  desborde horizontal y con un solo H1 en las 21 combinaciones.
- Sin JavaScript: portada, biblioteca y caso muestran su H1 y su contenido.
- Ficha: el visor pide su modelo, responde 200 y dibuja un lienzo, sin errores.
- Leads identificados «PRUEBA» desde portada, biblioteca y ficha: los tres terminan en `/gracias`. La llegada al buzón
  no se comprobó desde esta sesión.

## Sin verificar

Firefox, Safari y un teléfono real. Tampoco se probaron en esta revisión el giro de pantalla, el zoom al 200 %, el
espaciado de texto, el recorrido con teclado, WebGL apagado ni la pérdida de contexto: lo que cubren las suites de las
Tareas 6 y 7 está en sus resultados.

## Para el VB de Mario

- El logo de la barra sigue siendo el provisional.
- El video de la portada no se reproduce solo: el original pesa más de 8 MB y falta optimizarlo en R2.
- En la FAQ en inglés, las etiquetas de la barra y el bloque del grupo salen en español. Se corrige en el kit.
- Los casos ISASMELT y rueda de moldeo ahora llevan `og:image`, porque el kit v1.4.0 la emite siempre.
