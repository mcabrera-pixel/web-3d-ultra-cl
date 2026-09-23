// Colecciones de contenido (Estándar Web MCCO v2 §4). Los esquemas viven en el kit: un post sin cápsula,
// sin FAQ o sin enlaces relacionados no compila → no existen posts a medias ni huérfanos.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { blogSchema, casoSchema, guiaSchema } from '@mcco/web-kit/schemas';

const md = (base: string) => glob({ pattern: '**/[^_]*.md', base });

export const collections = {
  blog: defineCollection({ loader: md('./src/content/blog'), schema: blogSchema }),
  casos: defineCollection({ loader: md('./src/content/casos'), schema: casoSchema }),
  guias: defineCollection({ loader: md('./src/content/guias'), schema: guiaSchema }),
};
