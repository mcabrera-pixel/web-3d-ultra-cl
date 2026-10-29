# Medios del estándar de 3D Ultra

## Entrega y procedencia

Revisión B5-t3 del 29-oct-2026. Entrega de solo lectura:
`~/webs/activos/3d-ultra-nube-2026-10-18/`.
Se contrastaron `LEEME.md`, `exportaciones.json`, `fuentes.json` y los tres
`hero-<slug>.json`. Son renders propios de los modelos de referencia optimizados
de la biblioteca, no levantamientos de terreno ni imágenes generadas con IA.

Según la entrega, Blender/Cycles distribuye puntos sobre las mallas originales,
con cámara ortográfica de tres cuartos, semilla fija y fondo negro. Se retiraron
materiales y texturas en la escena temporal. La decodificación de Meshopt no
simplificó ni reconstruyó la geometría. Esta revisión contrasta los metadatos
recibidos; no vuelve a ejecutar el render ni verifica los GLB de origen.

Hashes SHA-256 de los modelos, declarados en `fuentes.json` y vinculados por
`model` en cada JSON individual:

| Modelo optimizado | SHA-256 declarado |
|---|---|
| `komatsu-930e-5.glb` | `218a765ab3f0415124415e75e3d6c4c6f6a29aa17a00a07bc0ac8096bc4e0992` |
| `pala-ph-4100xpc.glb` | `e9926873d8c981a75f62a6df45cffa32120b3f9265774bbfc5e02ceb4adf115c` |
| `sandvik-lh621.glb` | `1c5a241395c13493d953ca52c7d3656d53351cdb6a6a45a96a1139c34d4f61e7` |

## Archivos incorporados

Los tres archivos se copiaron sin recomprimir a `public/media/nube/`.
Todos miden **960 × 540 px**. Tamaños en KB decimales (1000 bytes).
Se recalcularon los hashes y tamaños y se decodificaron las imágenes para
comprobar dimensiones y borde exterior RGB negro (0, 0, 0).

| Archivo | Bytes | KB | SHA-256 verificado |
|---|---:|---:|---|
| `hero-komatsu-930e-5-960.webp` | 86298 | 86,298 | `a577726d30517e82ab0cd2606dd1f3125108d1683be79d32b212316315c4b57c` |
| `hero-pala-ph-4100xpc-960.webp` | 81730 | 81,730 | `c5725651469cff467530abbdde1df126224a23e3189e924f050189c9c05fc7d8` |
| `hero-sandvik-lh621-960.webp` | 75380 | 75,380 | `da7013b94ed9471b30110e804a9041b660115b3ecf0b5707c6a7f3b4b325ad9e` |

También se verificaron dimensiones, tamaño, hash y borde negro de los WebP de
1600 × 900 contra `exportaciones.json`. Pesan 194986, 190414 y 193032 bytes,
respectivamente; permanecen en la entrega externa. Solo los tres de 960 forman
parte del sitio. No se copiaron PNG, JSON de geometría ni modelos.

## Revisión visual

Se abrió cada WebP a 960 px y una reducción de revisión a 390 × 219 px,
proporcional con redondeo de altura y filtro Lanczos, sin recorte. Las reducciones
son evidencia de revisión en `~/webs/encargos/3d-ultra/B5-t3/revision/`;
no son nuevos activos del sitio ni una prueba del componente en navegador.

| Render | A 960 px | A 390 px | Decisión |
|---|---|---|---|
| Komatsu 930E-5 | Tolva, cabina, escaleras y neumáticos reconocibles. Silueta completa, margen negro en los cuatro lados y puntos separados. | Conserva el volumen de la tolva y las ruedas. Las barandas se densifican, pero el camión sigue siendo legible. | Apto como respaldo del hero y primer activo. |
| Pala P&H 4100XPC | Pluma, cables, balde, plataforma y orugas completos. El extremo superior y el balde no tocan el borde. | Se distinguen pluma, balde y orugas; las zonas de maquinaria se vuelven más densas sin perder la silueta. | Apto como segundo activo. |
| Sandvik LH621 | Balde, brazos, cabina y ruedas completos. El balde conserva margen inferior y derecho. | El perfil bajo, el balde y las ruedas siguen reconocibles; el interior de la cabina pierde detalle fino. | Apto como tercer activo. |

En los seis tamaños revisados visualmente (tres originales de 960 y tres
reducciones de 390) no se observan logos, marcas impresas, textos, cifras ni
identificadores de clientes. El fondo es negro y el dibujo neutro. Se aceptan
pesos menores de 100 KB porque mantienen encuadre, contraste y reconocimiento;
no se rellenaron ni ampliaron los archivos. Todos cumplen el límite local de
150 KB por hero. La pérdida de detalle fino a 390 px es esperable en esta escala.

## Datos compartidos y origen en el kit

`src/data/nube.ts` entrega `respaldo` (`src`, `width: 960`, `height: 540`, `alt`),
`activos` (`src`, `etiqueta`, `alt`) y `pasos` (`rotulo`, `titulo`). El orden es
930E-5, 4100XPC y LH621. El respaldo toma `src` y `alt` del primer activo.

Los nombres y etapas proceden de `src/content/equipos/komatsu-930e-5.md`,
`pala-ph-4100xpc.md` y `sandvik-lh621.md`: transporte, carguío y minería
subterránea. Sus usos documentados son preparar la mantención del camión,
preparar la parada de la pala y revisar el espacio de galería antes de mantener
el cargador. Los datos nuevos no incorporan métricas, clientes ni resultados.

El kit publicado **v1.3.1**, commit
`b7cfb7ad25ba63e7b5371f932e6386838812e228`, admite `origen` en `NubeAncla` y
`HistoriaNube`; `HeroEstandar` propaga `nube.origen`. Se verificó en el código
instalado y en `CHANGELOG.md` y `docs/ESTANDAR.md` del tag. No hay parches locales.

Para la Tarea 4, usar `nube={nube}` y `rotulo={rotulo}` en el hero; pasar
`activos={activos}`, `pasos={pasos}`, `origen={origen}` y `rotulo={rotulo}` a la
historia. El módulo exporta `origen = 'render'` y `rotulo = 'Render 3D'`.
Los activos heredan ese origen general mediante la API publicada. El hero
requiere el rótulo explícito para sustituir su texto predeterminado.

Esta entrega prepara archivos y datos. La integración, el muestreo y las pruebas
de respaldo con y sin WebGL/JS corresponden a la Tarea 4.
