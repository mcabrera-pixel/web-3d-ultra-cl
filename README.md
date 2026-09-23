# web-3d-ultra-cl — 3d-ultra.cl

Web de **3D Ultra** (gemelos digitales, plantas virtuales y simulación para minería y fundición de cobre), división de MCCO Group SpA. Conforme al **Estándar Web MCCO v2**: Astro 7 + `@mcco/web-kit` + Cloudflare Pages, verificación `mcco-check` en CI, deploy automático en cada merge a `main`.

- Contrato para agentes y humanos: [`AGENTS.md`](AGENTS.md)
- Manifiesto del sitio: [`site.yaml`](site.yaml)
- Identidad visual: [`DESIGN.md`](DESIGN.md)
- Estándar: `mcco-engineering-standards/docs/sitios-web/ESTANDAR-WEB-MCCO-v2.md`

```bash
npm ci && npm run dev        # http://localhost:4321
npm run build && npm run check
```

Producción: Cloudflare Pages, proyecto `3d-ultra` (3d-ultra.cl). Push a `main` = deploy (con los secrets `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` en el repo).
