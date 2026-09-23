# AGENTS.md — 3d-ultra.cl (3D Ultra)

Sitio web de **3D Ultra**, digitalización industrial, gemelos digitales y plantas virtuales para minería y fundiciones de cobre, división de MCCO Group SpA, Chile. Producción: https://3d-ultra.cl. Responder y escribir commits en español.

## Stack

- HTML/CSS/JS estático puro. Sin framework, sin build, sin dependencias npm.
- **Todo el sitio vive en `01_Web/`**, que es la raíz servida. El resto del repo son carpetas de trabajo.
- `01_Web/index.html` es una página única de ~2.200 líneas con el CSS inline en dos bloques `<style>`. No hay hoja de estilos ni JS externos; solo Google Fonts.
- Video hero servido desde Cloudflare R2: `https://pub-dd66483f8e7f497f9490ea37068612b0.r2.dev/VID.mp4`.

## Estructura

```
01_Web/
  index.html                       home (CSS inline)
  casos/*.html                     4 casos: gemelo digital RAF Potrerillos, rueda de moldeo de ánodos,
                                   hornos Isasmelt, análisis de chimenea CPS Salvador
  guias/*.html                     guías técnicas (gemelos digitales en fundiciones de cobre)
  en/faq.html                      FAQ en inglés
  llms.txt, robots.txt, sitemap.xml   SEO/GEO — mantener sincronizados con las páginas
  _headers                         cabeceras de seguridad (Cloudflare Pages)
  CNAME, .nojekyll                 restos de GitHub Pages, no tocar
  *.png, *.jpeg, *.JPG             imágenes sueltas en la raíz
02_Marketing/page arquitectura _Mcco/   prototipo antiguo independiente, no es parte del sitio
06_Recursos/LargeVideos/           respaldo local de videos originales, ignorado por git (385 MB)
reorder_sections.py, launch_viewer.bat, hymotion_colab.ipynb, error_log.txt   herramientas puntuales, legado
```

`README.md` está desactualizado (describe otro nombre de repo y carpetas que no están en git).

## Deploy (manual, no hay CI hacia producción)

Producción es **Cloudflare Pages**, proyecto `3d-ultra` (3d-ultra.cl y 3d-ultra.pages.dev). Push a `main` **no** la actualiza. Se publica con:

```bash
npx wrangler pages deploy 01_Web --project-name 3d-ultra --branch main
```

Requiere sesión Cloudflare local (`npx wrangler login`). Un agente en la nube no puede desplegar: dejar el cambio mergeado en `main` y avisar que falta el deploy.

El workflow `.github/workflows/pages.yml` publica `01_Web/` en GitHub Pages en cada push a `main`. Es un despliegue **legado sin dominio**; no es la web productiva. No confundir un run verde de ese workflow con un deploy a 3d-ultra.cl.

## Verificación (no hay tests automatizados)

- HTML válido, enlaces internos sin romper, imágenes con `alt`, responsive móvil.
- Nueva página: enlazarla desde `index.html`, agregarla a `sitemap.xml` y `llms.txt`.
- Al editar `index.html`, cambiar solo la sección pedida. Es un archivo grande: no reordenar ni reformatear.

## Reglas de contenido y assets

- **Cero cifras, clientes o resultados inventados.** Los casos son proyectos reales (Codelco División Salvador: Potrerillos, CPS). Respetar NDA: no agregar datos que no estén ya publicados en el sitio.
- **Prohibido subir videos al repo.** Cualquier `.mp4` va a Cloudflare R2 y se referencia por URL. El límite de GitHub es 100 MB y ya hubo que sacar videos del árbol.
- Dirección MCCO en documentos y footer: Suecia 283, of. 402, Providencia, Santiago.
- Contacto publicado: WhatsApp +56 9 7986 0843, mcabrera@mccocopper.cl, proyectos@mccocopper.cl.

## Commits

Conventional Commits en español: `feat(web): ...`, `fix(seo): ...`, `chore: ...`. Un cambio lógico por commit.
