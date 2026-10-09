// Colecciones de contenido (Estándar Web MCCO v2 §4). Los esquemas de blog, casos y guías viven en el kit;
// la colección equipos es propia de 3d-ultra (biblioteca de equipos 3D).
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { blogSchema, casoSchema, guiaSchema } from '@mcco/web-kit/schemas';
import { ETAPAS } from './scripts/biblioteca-logica.js';

const md = (base: string) => glob({ pattern: '**/[^_]*.md', base });
type Etapa = keyof typeof ETAPAS;

// Experiencias confirmadas por Mario el 08-oct-2026. Una frase nueva entra aquí solo con su confirmación.
const EXPERIENCIAS = [
  'Trabajamos con camiones 930E en Mantoverde (Capstone Copper).',
  'Este modelo fue parte de la presentación del proyecto chimenea colapsada de Potrerillos (CODELCO).',
  'Hicimos el gemelo de la pala 4100 para El Abra.',
  'Animamos los procedimientos del chancador giratorio de Chuquicamata (CODELCO).',
] as const;

const equipoSchema = z.object({
  nombre: z.string(),
  // Artículo del nombre en las frases de la ficha: «el modelo de la Pala P&H 4100XPC», «vi la Pala P&H 4100XPC».
  articulo: z.enum(['el', 'la']).default('el'),
  etapa: z.enum(Object.keys(ETAPAS) as [Etapa, ...Etapa[]]),
  tipo: z.string(),
  bajada: z.string().max(140),
  descripcion: z.string().min(70).max(155),
  experiencia: z.array(z.enum(EXPERIENCIAS)).default([]),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).length(3),
  orden: z.number().int(),
});

export const collections = {
  blog: defineCollection({ loader: md('./src/content/blog'), schema: blogSchema }),
  casos: defineCollection({ loader: md('./src/content/casos'), schema: casoSchema }),
  guias: defineCollection({ loader: md('./src/content/guias'), schema: guiaSchema }),
  equipos: defineCollection({ loader: md('./src/content/equipos'), schema: equipoSchema }),
};
