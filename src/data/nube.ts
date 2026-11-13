import type { ComponentProps } from 'astro/types';
import type NubeAncla from '@mcco/web-kit/components/estandar/NubeAncla.astro';
import type HistoriaNube from '@mcco/web-kit/components/estandar/HistoriaNube.astro';

// Renders propios de los modelos de referencia. Procedencia: docs/MEDIOS-ESTANDAR.md.
export const origen = 'render' as const;
export const rotulo = 'Render 3D';

export const activos = [
  {
    src: '/media/nube/hero-komatsu-930e-5-960.webp',
    etiqueta: 'Komatsu 930E-5',
    alt: 'Render 3D del camión Komatsu 930E-5 en nube de puntos sobre fondo negro.',
  },
  {
    src: '/media/nube/hero-pala-ph-4100xpc-960.webp',
    etiqueta: 'Pala P&H 4100XPC',
    alt: 'Render 3D de la pala P&H 4100XPC en nube de puntos sobre fondo negro.',
  },
  {
    src: '/media/nube/hero-sandvik-lh621-960.webp',
    etiqueta: 'Sandvik LH621',
    alt: 'Render 3D del cargador Sandvik LH621 en nube de puntos sobre fondo negro.',
  },
] satisfies ComponentProps<typeof HistoriaNube>['activos'];

// Hero y primer paso usan exactamente el mismo archivo y texto alternativo.
export const respaldo = {
  src: activos[0].src,
  width: 960,
  height: 540,
  alt: activos[0].alt,
} satisfies ComponentProps<typeof NubeAncla>['respaldo'];

export const nube = { respaldo, origen } satisfies ComponentProps<typeof NubeAncla>;

// Etapas y nombres de src/content/equipos; mismo orden que los activos.
export const pasos = [
  { rotulo: 'Transporte', titulo: activos[0].etiqueta },
  { rotulo: 'Carguío', titulo: activos[1].etiqueta },
  { rotulo: 'Minería subterránea', titulo: activos[2].etiqueta },
] satisfies ComponentProps<typeof HistoriaNube>['pasos'];
