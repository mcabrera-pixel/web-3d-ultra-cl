# AGENTS.md — 3d-ultra.cl (3D Ultra)

Web de marketing de **3D Ultra**, división de **MCCO Group SpA** (Chile): gemelos digitales, plantas virtuales navegables, simulación y escaneo láser para fundiciones y plantas de cobre. Sitio estático **Astro 7** sobre **`@mcco/web-kit`**, desplegado en **Cloudflare Pages**. Cumple el **Estándar Web MCCO v2** (`mcco-engineering-standards/docs/reglas/sitios-web.md`). Responder y escribir commits en español.

## 1. Contrato del repositorio (idéntico en todas las webs MCCO)

| Ruta | Qué es | Regla |
|---|---|---|
| `site.yaml` | Manifiesto: dominio, proyecto Cloudflare, contacto, CSP, prohibidos, páginas para llms.txt | Única fuente de verdad. Nada de esto se hardcodea. |
| `src/pages/index.astro` | Home: cabecera, JSON-LD y bloque Grupo del kit; cuerpo = `src/legacy/index-body.html` (HTML original) | Al tocar el home, editar `src/legacy/index-body.html` o componentizar la sección en `.astro`. |
| `src/pages/casos/*.html`, `guias/*.html`, `en/faq.html` | Páginas legado byte-idénticas a producción (con canonical manual) | Permitidas mientras `legacy_pages: true`. Al editarlas de fondo, convertirlas a `.astro` con `Base`. |
| `src/content/blog/*.md` | Artículos (colección validada por Zod). Aún vacía: el índice `/blog/` lleva `noindex` hasta el primer post | El motor de contenido y los agentes escriben **solo aquí**. |
| `src/styles/theme.css` · `site.css` · `DESIGN.md` | Tokens del sitio · CSS original del home · identidad | El kit fija nombres de tokens, no la estética. |
| `public/` | `og.webp`, `logo.png` (provisional), `sim.JPG`, `mcco_foto.png`, favicon, clave IndexNow | `_headers` y `_redirects` los genera `mcco-headers`: **no editar a mano**. |
| `functions/api/contact.js` | Formulario del home → Pages Function del kit (honeypot + Turnstile + Web3Forms) | Variables en Cloudflare Pages → Settings: `WEB3FORMS_KEY` (obligatoria para que envíe), `TURNSTILE_SECRET`, `RESEND_API_KEY`, `ACUSE_FROM`, `SITE_NAME`, `WHATSAPP`. |
| `.github/workflows/ci.yml`, `deploy.yml` | Llaman a los workflows reutilizables del kit | No duplicar lógica de CI. |

Carpetas hermanas en disco (`02_Marketing/`, `03_Documentos/`, `04_Propuestas/`, `05_Codigo/`, `06_Recursos/`) son trabajo local de la división y **no se versionan** (`.gitignore`). `06_Recursos/LargeVideos/` guarda los mp4 originales; los videos del sitio se sirven desde Cloudflare R2 (`https://pub-dd66483f8e7f497f9490ea37068612b0.r2.dev/`).

## 2. Comandos

```bash
npm ci
npm run dev                                   # http://localhost:4321
npm run build                                 # prebuild: mcco-headers → astro build → dist/
npm run check                                 # mcco-check: OBLIGATORIO verde antes de PR
npm run parity -- --old https://3d-ultra.cl   # migraciones: producción vs dist
```

## 3. Flujo

Rama → PR → CI (build + `mcco-check` + preview si hay credenciales Cloudflare) → merge a `main` = **producción** (`deploy.yml`). Nunca push directo a `main`, nunca `--force`. Rollback: Cloudflare Pages → Deployments.

## 4. URLs y SEO/GEO

- Canónica = URL limpia (sin `.html`, carpetas con `/`). Rutas actuales: `/`, `/casos/<slug>`, `/guias/gemelos-digitales-fundiciones-cobre`, `/en/faq`, `/blog/` (noindex hasta tener posts). No renombrar sin 301 en `_redirects`.
- Artículo nuevo: `src/content/blog/<slug>.md` con `title`, `description` (70-160), `date`, `capsule`, `faq` (3-8), `related` (casos/guías propias), `sister` (as-built.cl o condron.cl), `sources`. Sin eso no compila.
- Caso nuevo: preferir `src/content/casos/<slug>.md` (`casoSchema`, `kind: real`, `client` nombrable, métricas con fuente) sobre otra página `.html`.

## 5. Verdad y contenido

- **Cero cifras, clientes o resultados inventados.** Casos reales publicados: CODELCO División Salvador (Potrerillos: gemelo digital RAF, rueda de moldeo de ánodos; chimenea CPS; hornos Isasmelt). Cliente nombrable: CODELCO, **sin cifras económicas** (decisión Mario 05-sep-2026). Respetar NDA: la blacklist del kit hace fallar el build.
- Entidad desde el kit: MCCO Group SpA · RUT 77.715.147-9 · constituida en 2022 (el JSON-LD antiguo decía 2003: corregido por el kit) · Suecia 283, of. 402, Providencia, Santiago · cargo único "Gerente General, MCCO Group SpA".
- Equipo real: escáner **FARO Focus** (nunca Leica; `site.yaml → forbidden` lo rechaza). Drones DJI vía ConDron.
- Contacto publicado: WhatsApp +56 9 7986 0843 · mcabrera@mccocopper.cl · proyectos@mccocopper.cl.
- Imágenes: 3D Ultra usa renders y capturas propias, no IA. Heroes WebP ≤ 150 KB.

## 6. Qué no hacer

- No editar `dist/`, `public/_headers` ni `public/_redirects` a mano.
- No subir videos al repo (R2). No agregar `<script src>` externo sin declararlo en `site.yaml → csp`.
- No copiar componentes del kit al sitio: PR al kit. No reformatear `src/legacy/index-body.html` completo (2.000 líneas: diffs ilegibles).
- No volver a crear `01_Web/`, `CNAME`, `.nojekyll` ni el workflow de GitHub Pages: producción es Cloudflare Pages.

## 7. Datos de este sitio

- Dominio `https://3d-ultra.cl` · proyecto Cloudflare `3d-ultra` · zona: checklist §9 del estándar **pendiente** (AI Crawl Control, robots gestionado, Crawler Hints, custom domain www).
- Secrets de CI (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`): **pendientes** (hasta entonces el deploy es manual: `npx wrangler pages deploy dist --project-name 3d-ultra --branch main` tras `npm run build && npm run check`).
- Idiomas: es (todo) + en (`/en/faq`). Analítica: ninguna configurada (agregar `cf_beacon_token` o GA4 en `site.yaml`).
- Backlog de contenido (fuera del alcance de la migración): título del home más descriptivo; convertir casos/guía a colecciones; componentizar el home por secciones; logo oficial.

## 8. Commits

Conventional Commits en español: `feat(web): …`, `fix(seo): …`, `content(casos): …`, `chore(kit): sube @mcco/web-kit a vX`.
