# DESIGN.md de 3d-ultra.cl

La identidad visual de 3D Ultra es la del Estándar Web MCCO del kit (`@mcco/web-kit`, `docs/ESTANDAR.md`). Este archivo no la repite y solo fija lo propio del sitio.

## Base del kit
- Superficies blanco, parchment y bloques negros. Tinta `#1d1d1f`, gris `#6e6e73` y línea `#d2d2d7`.
- SF Pro del sistema e Inter local del kit, cuerpo de 17 px. Sin fuentes remotas: Montserrat y Google Fonts se retiraron en la Tarea 7.
- Bloques sin radio, tarjetas de 18 px y píldoras de 980 px. Sin degradados ni sombras decorativas.
- Layout `Sitio.astro` sobre `Estandar`: barra global, sub-navegación, un solo `main` y bloque Grupo.

## Acción en rojo (`src/styles/theme.css`)
Un solo color de acción por pantalla.

| Variable | Valor | Uso |
|---|---|---|
| `--accion`, `--accion-boton`, `--accion-foco` | `#d32f2f` | Botones, enlaces y foco sobre blanco o parchment (4,98:1 sobre blanco) |
| `--accion-oscuro` | `#ff8a80` | Texto, enlaces y foco sobre negro (9,20:1) |
| `--campo-claro`, `--campo-oscuro` | `#ff8a80`, `#d32f2f` | Puntos del campo antigravity, decorativos |

El rojo oscuro no se usa para enlaces ni foco sobre negro.

## Imágenes
- Renders y capturas propias, nunca IA. Cada medio lleva su rótulo verdadero: «Render 3D», «Captura de simulación» o foto real.
- Los modelos de la biblioteca son de referencia: no se presentan como levantamientos reales.
- Heroes WebP de 150 KB o menos y todo medio bajo 400 KB (`check: { visual: error }` en `site.yaml`). Procedencia y pesos en `docs/MEDIOS-ESTANDAR.md`.
- `og.webp` 1200×630 recortada de `ens.png` (render propio). `logo.png` es provisional: reemplazar por el logo oficial.

## Visor 3D de la biblioteca
- Three.js solo en las fichas de `/biblioteca/`, con su escenario claro propio (`src/styles/visor3d.css`). La portada no lo carga.
- Cámara, geometría, controles, carga diferida y Meshopt quedan aislados del estándar: los cambios de presentación no los tocan.
- El canvas del visor conserva su nombre accesible y su foco. Sin GLB o sin WebGL queda el póster con el aviso.
- Sin fondo de partículas detrás de la página: se retiró en la Tarea 7 porque las superficies opacas lo tapaban y seguía dibujando sin verse.
