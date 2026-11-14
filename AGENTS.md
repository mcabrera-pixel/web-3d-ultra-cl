# AGENTS.md — 3d-ultra.cl (3D Ultra)

Web de marketing de **3D Ultra**, división de **MCCO Group SpA** (Chile): gemelos digitales, plantas virtuales navegables, simulación y escaneo láser para fundiciones y plantas de cobre. Sitio estático **Astro 7** sobre **`@mcco/web-kit`**, desplegado en **Cloudflare Pages**. Cumple el **Estándar Web MCCO v2** (`mcco-engineering-standards/docs/reglas/sitios-web.md`). Responder y escribir commits en español.

## 1. Contrato del repositorio (idéntico en todas las webs MCCO)

| Ruta | Qué es | Regla |
|---|---|---|
| `site.yaml` | Manifiesto: dominio, proyecto Cloudflare, contacto, CSP, prohibidos, páginas para llms.txt | Única fuente de verdad. Nada de esto se hardcodea. |
| `src/pages/index.astro` | Portada con `Sitio` (layout `Estandar` del kit): hero, nube, historia, servicios, casos, asistente y formulario en `src/components/InicioContenido.astro` y vecinos | Mismos H1, title, descripción y destinos. Sin FAQ JSON-LD: la portada no muestra esas preguntas (se quitó en el encargo F6-faq). El contrato de la portada antigua quedó en `docs/registros/adopcion-3d-ultra/inicio-antes.json`. |
| `src/pages/casos/*.astro`, `guias/*.astro`, `en/faq.astro` | Casos, guía y FAQ inglesa con `Sitio`, contenido heredado tal cual | `legacy_pages: false`. Los alias `.html` se siguen generando. No cambiar title, H1, canonical ni JSON-LD. |
| `src/content/blog/*.md` | Artículos (colección validada por Zod). Aún vacía: el índice `/blog/` lleva `noindex` hasta el primer post | El motor de contenido y los agentes escriben **solo aquí**. |
| `src/styles/theme.css` · `DESIGN.md` | Tokens del sitio (rojo de acción y sus variantes) · identidad | Estética del Estándar del kit: blanco, parchment y bloques negros, con SF Pro del sistema e Inter local del kit. Sin fuentes remotas (Montserrat y Google Fonts retirados en la Tarea 7). |
| `public/` | `og.webp`, `logo.png` (provisional), `sim.JPG`, `media/` (nube e inicio), pósters de biblioteca, `favicon.svg` (origen del favicon), `favicon.ico` (16, 32 y 48 px; el único ícono que declaran las páginas, desde `Sitio.astro`) y clave IndexNow. `mcco_foto.png` ya no lo usa ninguna página | `_headers` y `_redirects` los genera `mcco-headers`: **no editar a mano**. |
| `functions/api/contact.js` | Reexport de la Pages Function del kit para los formularios de portada, hub y fichas: honeypot, Turnstile si hay secreto, lead al Worker `formularios-mcco`, acuse opcional y 302 a `/gracias` o `/contacto-error` | Variables en Cloudflare Pages, Settings: `FORMULARIOS_URL`, `FORMULARIOS_CLAVE` y `MARCA` (obligatorias), y `TURNSTILE_SECRET`, `RESEND_API_KEY`, `ACUSE_FROM`, `SITE_NAME`, `WHATSAPP`, `WEB` (opcionales). Web3Forms ya no se usa. Contrato y pruebas: `docs/registros/adopcion-3d-ultra/contacto-csp.md`. |
| `.github/workflows/ci.yml`, `deploy.yml` | Llaman a los workflows reutilizables del kit | No duplicar lógica de CI. |

Carpetas hermanas en disco (`02_Marketing/`, `03_Documentos/`, `04_Propuestas/`, `05_Codigo/`, `06_Recursos/`) son trabajo local de la división y **no se versionan** (`.gitignore`). `06_Recursos/LargeVideos/` guarda los mp4 originales; los videos del sitio se sirven desde Cloudflare R2 (`https://pub-dd66483f8e7f497f9490ea37068612b0.r2.dev/`).

## 2. Comandos

```bash
npm ci
npm run dev                                   # http://localhost:4321
npm run build                                 # prebuild: mcco-headers → astro build → dist/
npm test                                      # pruebas de test/ (también las corre prebuild)
npm run check                                 # mcco-check, verificador de adopción y test/build: OBLIGATORIO verde antes de PR
node scripts/repaso-texto.mjs                 # repaso editorial de dist: sin hallazgos antes de PR
npm run parity -- --old https://3d-ultra.cl   # migraciones: producción vs dist
```

## 3. Flujo

Rama → PR → CI (build + `mcco-check` + preview si hay credenciales Cloudflare) → merge a `main` = **producción** (`deploy.yml`). Nunca push directo a `main`, nunca `--force`. Rollback: Cloudflare Pages → Deployments.

## 4. URLs y SEO/GEO

- Canónica = URL limpia (sin `.html`, carpetas con `/`). Rutas actuales: `/`, `/casos/<slug>`, `/guias/gemelos-digitales-fundiciones-cobre`, `/en/faq`, `/blog/` (noindex hasta tener posts). `/casos/gemelo-digital-bomba-despiece-sap-pi` es un caso de demostración con datos de ejemplo y abre la muestra estática en dos versiones, `/muestras/bomba/` (detallada) y `/muestras/bomba-esencial/` (esencial), con `noindex` (meta y `X-Robots-Tag` en la sección del sitio de `_headers`) y fuera del sitemap. Se importan con `node scripts/importar-muestra.mjs --todas`, que copia desde las carpetas de origen y aplica los ajustes de conformidad; no se editan a mano. No renombrar sin 301 en `_redirects`.
- Artículo nuevo: `src/content/blog/<slug>.md` con `title`, `description` (70-160), `date`, `capsule`, `faq` (3-8), `related` (casos/guías propias), `sister` (as-built.cl o condron.cl), `sources`. Sin eso no compila.
- Caso nuevo: preferir `src/content/casos/<slug>.md` (`casoSchema`, `kind: real`, `client` nombrable, métricas con fuente) sobre otra página `.html`.

## 5. Verdad y contenido

- **Cero cifras, clientes o resultados inventados.** Casos reales publicados: CODELCO División Salvador (Potrerillos: gemelo digital RAF, rueda de moldeo de ánodos; chimenea CPS; hornos Isasmelt). Cliente nombrable: CODELCO, **sin cifras económicas** (decisión Mario 05-sep-2026). Respetar NDA: la blacklist del kit hace fallar el build.
- Entidad desde el kit: MCCO Group SpA · RUT 77.715.147-9 · constituida en 2022 (el JSON-LD antiguo decía 2003: corregido por el kit) · Suecia 283, of. 402, Providencia, Santiago · cargo único "Gerente General, MCCO Group SpA".
- Equipo real: escáner **FARO Focus** (nunca Leica; `site.yaml → forbidden` lo rechaza). Drones DJI vía ConDron.
- Contacto publicado: WhatsApp +56 9 7986 0843 · mcabrera@mccocopper.cl · proyectos@mccocopper.cl.
- Imágenes: 3D Ultra usa renders y capturas propias, no IA. Heroes WebP ≤ 150 KB y todo medio bajo 400 KB. `site.yaml` tiene `check: { visual: error }`, así que `mcco-check` falla con medios pesados, ilustraciones sin rótulo o animación sin movimiento reducido.

## 6. Qué no hacer

- No editar `dist/`, `public/_headers` ni `public/_redirects` a mano.
- No subir videos al repo (R2). No agregar `<script src>` externo sin declararlo en `site.yaml → csp`.
- No copiar componentes del kit al sitio: PR al kit.
- No volver a crear `01_Web/`, `CNAME`, `.nojekyll` ni el workflow de GitHub Pages: producción es Cloudflare Pages.

## 7. Datos de este sitio

- Dominio `https://3d-ultra.cl` · proyecto Cloudflare `3d-ultra` · zona: checklist §9 del estándar **pendiente** (AI Crawl Control, robots gestionado, Crawler Hints, custom domain www).
- Secrets de CI (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`): **pendientes** (hasta entonces el deploy es manual: `npx wrangler pages deploy dist --project-name 3d-ultra --branch main` tras `npm run build && npm run check`).
- Idiomas: es (todo) + en (`/en/faq`). Analítica: ninguna configurada (agregar `cf_beacon_token` o GA4 en `site.yaml`). Sin IDs no se mide ninguna conversión: la conversión funcional es el formulario, `/gracias` y WhatsApp.
- Backlog de contenido (fuera del alcance de la migración): título del home más descriptivo; convertir casos/guía a colecciones; componentizar el home por secciones; logo oficial.

## 8. Commits

Conventional Commits en español: `feat(web): …`, `fix(seo): …`, `content(casos): …`, `chore(kit): sube @mcco/web-kit a vX`.

Al subir el kit cambian juntos, en el mismo commit, `package.json`, el lockfile (regenerado en Linux con npm 11.19.0) y los dos workflows; `test/kit-version.test.mjs` fija el tag y el commit del kit y hay que actualizarlo antes de la subida. `test/build/saltar-contenido.test.mjs` exige un solo enlace de salto por página, el del kit (v1.4.2), y que ningún enlace a un ancla quede sin destino. `test/build/favicon.test.mjs` exige que `/favicon.ico` sea un ICO con 16, 32 y 48 px y que cada página con `Estandar` lo declare una sola vez; las muestras de `/muestras/` conservan su propio ícono y los artículos con `Post`, que no tiene slot `head` en el kit, quedan como excepción listada (hoy no hay ninguno). Desde el kit v1.4.3 el campo y la nube crean su contexto WebGL2 400 ms después de quedar a la vista; el sitio no cambia nada por eso.
