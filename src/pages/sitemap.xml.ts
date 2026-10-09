import { makeSitemap } from '@mcco/web-kit/endpoints/sitemap';
// Colecciones con página propia: blog (las del kit) y la biblioteca de equipos (/biblioteca/<slug>).
export const GET = makeSitemap(import.meta.glob('/src/pages/**/*.{astro,html,md,mdx}'), {
  collections: [{ name: 'blog', base: '/blog/' }, { name: 'equipos', base: '/biblioteca/' }],
});
