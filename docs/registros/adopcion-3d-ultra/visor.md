# Visor y biblioteca — B5-t5

Fecha: 29-oct-2026. Base `dc8c654`, rama `feat/estandar-apple`.

## Alcance y condición pendiente

Hub y tres fichas integrados con `Sitio`/`Bloque`. La cámara, geometría, iluminación,
selección, controles, fondo propio, Meshopt y carga diferida conservan su código original.
`Visor3D.astro`, `visor3d.js`, `visor3d-logica.js`, `fondo-particulas.js`, los datos de piezas,
pósters y endpoint no tienen diff. Los cambios del visor se limitan a su CSS.

**La aceptación integral del visor queda pendiente:** no hay GLB locales ni binding MEDIOS
en el worktree. La guardia impide incluirlos en `dist`. Se solicitó su ubicación local
por el canal de aclaraciones; no se descargaron modelos de producción, no se fabricaron
mallas sustitutas y no se presentó una maqueta de controles como prueba del render.

Servidor de pruebas estático sobre el build local; `/modelos/<slug>.glb` devuelve 404
sin copia local. Los tres slugs son `komatsu-930e-5`, `pala-ph-4100xpc`, `sandvik-lh621`.
Chrome existente de la receta B4-t2, headless con SwiftShader, no teléfono físico/Safari.
El arnés bloquea métodos distintos de GET y peticiones a otros orígenes. No se enviaron
formularios, mensajes, leads ni eventos de conversión.

## Matriz por equipo

Cada columna corresponde a pruebas ejecutadas individualmente para ese equipo.
**OK CSS** verifica disposición con panel/barra visibles y nombres del JSON de piezas
insertados únicamente en el DOM de prueba; no comprueba respuesta del modelo.
**Pendiente GLB** no es un aprobado ni queda sustituido por una prueba unitaria.

| Prueba | Komatsu 930E-5 | Pala P&H 4100XPC | Sandvik LH621 |
|---|---|---|---|
| Un main/H1, Inter local, póster 1600 × 1000, sin desborde | OK | OK | OK |
| 320/390/899 px: ninguna petición GLB antes del toque | OK | OK | OK |
| 900/901 px: decisión según ancho útil del visor | OK | OK | OK |
| 1366/1440 px: solicita únicamente su GLB local | OK | OK | OK |
| Toque CDP en «Ver en 3D»: comienza solicitud local | OK | OK | OK |
| GLB local 404: permanece póster y aviso, controles ocultos | OK | OK | OK |
| Red caída antes de activar: póster y aviso | OK | OK | OK |
| Chrome con WebGL apagado: póster y aviso | OK | OK | OK |
| Sin JS: póster, contenido y formulario; ninguna petición GLB | OK | OK | OK |
| Selección desde panel y clic en malla | Pendiente GLB | Pendiente GLB | Pendiente GLB |
| Aislamiento y retorno al equipo completo | Pendiente GLB | Pendiente GLB | Pendiente GLB |
| Separar 0/100 y vuelta a 0 en geometría | Pendiente GLB | Pendiente GLB | Pendiente GLB |
| Zoom Ctrl/Cmd con rueda; rueda sin modificador | Pendiente GLB | Pendiente GLB | Pendiente GLB |
| Zoom por botones y límites | Pendiente GLB | Pendiente GLB | Pendiente GLB |
| Giro automático y arrastre | Pendiente GLB | Pendiente GLB | Pendiente GLB |
| Vista inicial | Pendiente GLB | Pendiente GLB | Pendiente GLB |
| Escape restituye modelo tras seleccionar | Pendiente GLB | Pendiente GLB | Pendiente GLB |
| Panel y barra sin solape, objetivos de 44 px | OK CSS | OK CSS | OK CSS |
| Pestaña con panel cerrado: 44 px completos visibles | OK CSS | OK CSS | OK CSS |
| Fullscreen vertical y horizontal: altura y controles | OK CSS | OK CSS | OK CSS |
| Salida de fullscreen mediante API y retorno de disposición | OK CSS | OK CSS | OK CSS |
| Botón fullscreen con malla, Escape y estado de cámara al volver | Pendiente GLB | Pendiente GLB | Pendiente GLB |
| Teclado: selección y acciones con modelo cargado | Pendiente GLB | Pendiente GLB | Pendiente GLB |
| Touch: órbita, selección y zoom sobre malla | Pendiente GLB | Pendiente GLB | Pendiente GLB |
| Rotación 390 × 844 ↔ 844 × 390: disposición | OK CSS | OK CSS | OK CSS |
| Rotación del teléfono: encuadre de la malla | Pendiente GLB | Pendiente GLB | Pendiente GLB |
| Red caída durante descarga de GLB real | Pendiente GLB | Pendiente GLB | Pendiente GLB |

La condición existente es `el.clientWidth < 900`, no `window.innerWidth`. Chrome reserva
15 px para scroll: ventanas 900/901 tienen visor 885/886 y esperan el toque. Se conserva
esa condición, independiente del corte de antigravity. A 1366 × 768 el visor descuenta
44 + 52 px y mide 672 px; a 390 × 844 descuenta 44 + 48 y mide 752 px. En fullscreen
no descuenta barras. La hoja reserva dos filas bajo 430 px y coloca el panel al costado
en horizontal bajo. Se revisan también 320 × 844, 900/901 × 900, 1440 × 900 y 1366 × 500.

## Biblioteca, contactos y teclado

- Filtros Todos/Transporte/Carguío/Subterránea a 320, 390 y 1440 px: tarjetas y
  `aria-pressed` correctos. Sin JS los filtros se ocultan y quedan las tres tarjetas.
- Tres fichas: campo equipo igual al H1, readonly, origen `biblioteca/<slug>`.
  Hub: equipo editable, origen `biblioteca/`. Pruebas construidas comprueban los siete
  campos, método POST, `/api/contact`, validación, honeypot y URL/texto de WhatsApp
  contra el manifiesto. Se usa `FormData` y validación nativa sin enviar.
- Menú con Enter, cierre con Escape y retorno de foco; filtro Carguío con Enter;
  FAQ nativa con Enter; CTA local deja `#contacto` bajo la subnav.
- Un bloque corporativo y una cabecera por página. WebPage/Service, canonical,
  H1/title/descripción, anclas y contactos conservados por el verificador.
- El escenario claro y su degradado original permanecen. Tipografía SF/Inter y
  colores de texto neutros; sin fuentes de Google en las cuatro páginas.

## Contrastes

Colores computados comprobados en Chrome; ratios mediante luminancia WCAG sRGB.
Para el vidrio blanco al 86% se calcula el caso mínimo sobre negro, `#dbdbdb`.
La selección roja usa blanco opaco para no perder AA sobre una pieza oscura.

| Uso | Frente / fondo | Ratio mínimo comprobado |
|---|---|---|
| Acción clara y texto blanco del botón | #d32f2f / #ffffff | 4,9793:1 |
| Acción en parchment | #d32f2f / #f5f5f7 | 4,5731:1 |
| Enlace sobre negro | #ff8a80 / #000000 | 9,1991:1 |
| Foco de campos oscuros | #ff8a80 / #2a2a2c | 6,2749:1 |
| Texto y migas sobre vidrio | #333336 y #515154 / #dbdbdb | ≥ 4,5:1 |
| Foco sobre vidrio | #d32f2f / #dbdbdb | ≥ 3:1 |
| Equipo readonly | #a1a1a6 / #161617 | ≥ 4,5:1 |

## Evidencias y reproducción

Carpeta autorizada: `/home/cloud/webs/encargos/3d-ultra/B5-t5`.

- `entorno.sh`: temporales, cachés, perfiles y logs propios; Chrome y bibliotecas B4-t2.
- `server.mjs`, `cdp.mjs`: servidor local en grupo propio, cierre por SIGTERM al grupo
  dentro de `finally`, Chrome por CDP/objeto hijo. Sin proxy a producción.
- `navegador.mjs`, `browser/resultados.json`: pruebas del sitio real sin mallas disponibles.
- `presentacion.mjs`, `browser/presentacion.json`: ensayo explícito de CSS; datos de
  piezas reales, sin afirmar selección, render o carga de modelos.
- `complementarias.mjs`, `browser/complementarias.json`: teclado, payloads, contrastes.
- `browser/hub-{390,1440}.png`, `browser/ficha-{390,1440}.png`: capturas solicitadas.
  La ficha móvil muestra el póster antes del toque; la de escritorio muestra el aviso
  por GLB local ausente. `*-completa-*.png` conserva toda la página.
- `browser/presentacion-controles-*.png`: maquetas de disposición con póster, claramente
  separadas de las capturas del estado real. No son modelos cargados.

Desde el worktree, cargar `source /home/cloud/webs/encargos/3d-ultra/B5-t5/entorno.sh`.
Ejecutar build antes de las pruebas de navegador, sin reconstruir mientras sirven `dist`.
Luego `node "$B5_DIR/navegador.mjs"`, `node "$B5_DIR/presentacion.mjs"` y
`node "$B5_DIR/complementarias.mjs"`, guardando sus logs en `$B5_DIR/logs`.

La suite de prebuild mantiene las 86 pruebas, incluyendo visor3d-logica, biblioteca-logica,
equipos, glb, modelos y sin-modelos. Son evidencia de lógica/contratos, no certificación de
las interacciones 3D pendientes. `npm run check` añade la comparación de 22 rutas y siete
pruebas sobre HTML construido, incluidas mutaciones del CTA y de cada tarjeta de portada.

Resultados: 85/85 comprobaciones del sitio, 36/36 ensayos de presentación y 16/16
complementarias. La última corrección limita el traslado del panel cerrado para que
la pestaña no pierda 5 px fuera del escenario; se repitieron build, check y presentación.
