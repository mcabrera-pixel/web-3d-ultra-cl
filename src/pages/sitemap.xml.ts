import { makeSitemap } from '@mcco/web-kit/endpoints/sitemap';
export const GET = makeSitemap(import.meta.glob('/src/pages/**/*.{astro,html,md,mdx}'));
