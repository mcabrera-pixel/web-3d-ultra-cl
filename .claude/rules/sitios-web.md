# Sitios Web MCCO — Estándar v2.0 (regla operativa)

Aplica a toda web de marketing del grupo (as-built.cl, condron.cl, 3d-ultra.cl, mcco.cl y las que vengan). Perfil `SITE`.
Documento completo con decisiones, evidencia y playbook de migración: `docs/sitios-web/ESTANDAR-WEB-MCCO-v2.md`.
El estándar vive en código: kit `@mcco/web-kit` (github.com/mcabrera-pixel/mcco-web-kit) y plantilla `mcco-web-template`.

## 1. Cinco principios

1. **Manifiesto único**: todo lo que describe al sitio está en `site.yaml`. Nada de eso se hardcodea en páginas.
2. **Contrato idéntico**: las webs difieren en contenido y estética, nunca en forma de repositorio.
3. **Verificación por máquina**: `mcco-check` corre en cada PR y antes de cada deploy. Error = no se mergea.
4. **Contenido como datos**: artículos, casos y guías son Markdown con frontmatter validado por Zod. Índice, sitemap y llms.txt se derivan.
5. **Cero invención**: ninguna cifra, cliente, certificación, testimonio o fecha sin fuente. La entidad es una y viene del kit.

## 2. Contrato del repositorio (`web-<dominio>-cl`)

```
site.yaml · AGENTS.md · CLAUDE.md (→ AGENTS.md) · README.md · DESIGN.md · astro.config.mjs · package.json
src/pages/            ruta = URL. .astro con layouts del kit; .html legado byte-idéntico solo durante migración
src/content/{blog,casos,guias}/*.md   contenido validado (kit/schemas). El motor de contenido escribe SOLO aquí
src/content.config.ts · src/styles/theme.css (valores de tokens)
public/               estáticos; _headers y _redirects GENERADOS por mcco-headers (no editar a mano)
functions/api/*.js    Pages Functions opcionales; secretos solo en Cloudflare
.github/workflows/ci.yml (PR) · deploy.yml (main)   → workflows reutilizables del kit
```

- Kit fijado por tag: `"@mcco/web-kit": "github:mcabrera-pixel/mcco-web-kit#vX.Y.Z"`. Cambios de layout, cabecera, schema o reglas se hacen **en el kit**, nunca copiando código al sitio.
- `astro.config.mjs` = `defineConfig(mccoConfig())`. `build.format: 'preserve'`: los archivos físicos no cambian.
- Sin secretos en el repo (`.env`, `.dev.vars` ignorados). Sin videos (> 10 MB → Cloudflare R2). Carpetas de trabajo no se versionan.
- `.gitattributes` con `eol=lf`; Node ≥ 22 (`.node-version` = 24).

## 3. URLs y SEO técnico

- **URL canónica = la que sirve Cloudflare Pages: sin `.html`, carpetas con `/`** (Pages redirige 308 lo demás). El kit la calcula; en páginas `.html` legado se escribe a mano igual.
- Por página: 1 `<title>` ≤ 60, 1 meta description 70-160, 1 canonical exacta, 1 H1, viewport, Open Graph, `lang`. EN con hreflang recíproco.
- Renombrar una ruta exige 301 en `public/_redirects` (sección `# --- reglas del sitio ---`).
- Sitemap solo con URLs canónicas indexables y `lastmod` real. `robots.txt` permite todos los crawlers de IA (kit/data/ai-bots.json). `llms.txt` se genera; no se invierte en él.

## 4. Contenido

- `blogSchema`: `title`, `description` 70-160, `date`, `capsule` (3-4 frases autocontenidas), `faq` 3-8, `related` 1-6 (servicios propios), `sister` (1 web hermana), `sources`, `generated_by`. Sin cápsula/FAQ/related **no compila**.
- `casoSchema`: `kind: real | escenario` (escenario = disclaimer visible), `client` solo de `clients_allowed`, toda `metrics[].value` con `source`.
- JSON-LD: Organization (+ProfessionalService) con `taxID`, `foundingDate`, `address`, `parentOrganization` en la home; BlogPosting + BreadcrumbList + FAQPage en artículos. **Prohibido** `Review`/`AggregateRating` sin reseñas reales.
- Motor de contenido (v3): lee `site.yaml` del repo, escribe `src/content/blog/<slug>.md`, commit + push/PR; la CI publica. No inyecta HTML ni edita sitemaps.

## 5. Identidad de grupo

- Entidad única (`kit/data/entity.json`): MCCO Group SpA · RUT 77.715.147-9 · constituida 2022 · Suecia 283, of. 402, Providencia, Santiago · cargo único de Mario Cabrera: "Gerente General, MCCO Group SpA". "20+ años" solo como experiencia del equipo.
- Bloque Grupo MCCO (`FooterGrupo`) en **toda** página: pertenencia + hermanas + RUT + dirección.
- `sameAs` solo con perfiles reales verificados. Clientes nombrables: `site.yaml → clients_allowed` (hoy CODELCO, BHP, ASTER, CAPSTONE COPPER, EL ABRA). Blacklist NDA del kit = la del motor.

## 6. CI/CD y agentes

- Rama → PR → `site-ci` (build · `mcco-check` · preview) → merge → `site-deploy` (build · check · deploy · smoke). **Push a main = producción.** Nunca directo, nunca `--force`. Rollback en Cloudflare Pages → Deployments.
- Secrets por repo: `CLOUDFLARE_API_TOKEN` (Pages: Edit) + `CLOUDFLARE_ACCOUNT_ID`. Variables de funciones en Cloudflare Pages → Settings.
- `AGENTS.md` con la misma estructura en todos los repos (contrato, comandos, flujo, URLs/SEO, verdad, qué no hacer, datos del sitio, commits). Codex lo lee; Claude entra por `CLAUDE.md`.
- Comando de verificación para cualquier agente: `npm ci && npm run build && npm run check`.

## 7. Seguridad

- CSP generada por `mcco-headers` desde `site.yaml → csp` (base verificada en producción + orígenes declarados). Todo `<script src>` externo nuevo se declara primero. `unsafe-eval` solo con `csp.unsafe_eval: true` y justificación.
- HSTS preload, `nosniff`, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy. HTML `no-cache`; `/_astro/*` inmutable.
- Formularios: honeypot + Turnstile + Web3Forms (kit/functions/contact.js). PII nunca en logs ni en el repo (Ley 19.628).

## 8. Zona Cloudflare (manual, por dominio)

Z1 AI Crawl Control = Allow · Z2 Block AI training bots = Do not block · Z3 robots.txt gestionado OFF · Z4 Crawler Hints ON · Z5 custom domains apex + www.
Verificar con la tabla Allowed/Unsuccessful del dashboard (un `curl -A` con UA falsa no prueba nada). Marcar `cloudflare.zone_checklist_done: true`.

## 9. Verificación ejecutable (`mcco-check` R1-R10)

R1 archivos obligatorios (index, 404, robots, sitemap, llms, _headers) · R2 cabecera (title, description, canonical exacta, H1, viewport, OG, lang) · R3 sitemap == páginas indexables · R4 enlaces y recursos internos resuelven · R5 JSON-LD válido, Organization con taxID y parentOrganization, BlogPosting en artículos, sin aggregateRating · R6 blacklist NDA + `forbidden` + placeholders (`EDITAR:`, `TODO:`, `lorem`, `tupagina`) · R7 RUT + dirección en toda página · R8 CSP/HSTS/nosniff y scripts externos permitidos · R9 imágenes > 2 MB, videos > 10 MB, og > 600 KB · R10 hreflang en /en/.
`mcco-parity --old https://dominio` es el gate de migración (status, title, H1 por ruta).

## 10. Migrar un sitio existente / crear uno nuevo

- Migración en 4 fases con gate: **A** estructura (páginas `.html` byte-idénticas, `mcco-parity` sin diferencias duras) → **B** conformidad (`mcco-check` sin errores, `legacy_pages: true`) → **C** adopción del kit (home y blog en `.astro`/colecciones, `--strict`) → **D** producción (PR + preview + smoke + zona). Orden decidido: 3D-Ultra → ConDrone → as-built (Ads vivos: verificar conversiones en preview).
- Sitio nuevo: "Use this template" → `site.yaml` → `npm run build && npm run check` → proyecto Pages + zona → secrets → push a main → GSC/BWT → PR al kit (`data/sites.json`).

## 11. Anti-patrones (rechazar en revisión)

| NO | SÍ |
|---|---|
| Editar `public/_headers` a mano | Declarar el origen en `site.yaml → csp` y regenerar |
| Crear un post copiando el HTML de otro | Markdown en `src/content/blog/` con el frontmatter completo |
| Canonical con `.html` o sin canonical | URL limpia calculada por el kit |
| Cifras, clientes o testimonios sin fuente | `metrics[].source`, `clients_allowed`, nada de avatares IA |
| Deploy con wrangler desde el PC "para ir rápido" | PR → CI → main |
| Copiar un componente del kit al sitio | PR al kit + tag nuevo |
| Subir un mp4 al repo | Cloudflare R2 + `csp.media_src` |
