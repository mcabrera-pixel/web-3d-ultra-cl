# DESIGN.md — 3d-ultra.cl

Identidad visual vigente de 3D Ultra (documentada a partir del sitio en producción, sin cambios). Base de grupo para webs nuevas: `DESIGN-mcco-copper.md` del toolkit MCCO; esta división conserva su propia identidad.

## Tema
Ingeniería 4.0 en blanco y negro con acento rojo aviso. Secciones claras (#ffffff / #f4f6f8) alternadas con bloques oscuros (#050505 / #0f0f0f). Tipografía única Montserrat 300-800. Bordes finos, sombras suaves, movimiento por `reveal` al hacer scroll.

## Tokens (valores en `src/styles/theme.css`)
| Token | Valor | Uso |
|---|---|---|
| `--color-bg` | #ffffff | fondo base |
| `--color-bg-alt` | #f4f6f8 | secciones alternas, bloque Grupo MCCO |
| `--color-text` | #1a1a1a | texto |
| `--color-muted` | #555555 | texto secundario |
| `--color-accent` | #d32f2f (hover #b71c1c) | CTA, subrayados, énfasis |
| `--color-border` | #e1e1e1 | bordes |
| `--font-body` / `--font-display` | 'Montserrat', sans-serif | todo el sitio |
| `--maxw` | 1440px | contenedor (`--container-width` original) |

El CSS original del home vive en `src/styles/site.css` con sus propias variables (`--bg-body`, `--accent`…). Al componentizar secciones, migrar esas variables a los tokens de arriba.

## Reglas
- Sin gradientes morados ni glassmorphism. Sin fuentes genéricas nuevas.
- Un solo acento (rojo) por pantalla. Los bloques oscuros llevan texto blanco puro.
- Imágenes: renders y capturas propias (3D Ultra no usa imágenes IA); WebP ≤ 150 KB en heroes.
- `og.webp` 1200×630 recortada desde `ens.png` (render propio). `logo.png` actual es provisional generado por script: reemplazar por el logo oficial.
