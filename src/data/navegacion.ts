import type { ComponentProps } from 'astro/types';
import type NavGlobal from '@mcco/web-kit/components/estandar/NavGlobal.astro';
import type SubNav from '@mcco/web-kit/components/estandar/SubNav.astro';

export const enlaces: ComponentProps<typeof NavGlobal>['enlaces'] = [
  { href: '/#twins', texto: 'Gemelos digitales' },
  { href: '/biblioteca/', texto: 'Biblioteca' },
  { href: '/#process', texto: 'Proceso' },
  { href: '/#casos', texto: 'Casos' },
  { href: '/#contacto', texto: 'Contacto' },
];

// Astro puede entregar .html en build.format="preserve". Hub y fichas
// conservan su formulario local cuando adopten este layout.
export function accionContacto(pathname: string): ComponentProps<typeof SubNav>['accion'] {
  const ruta = pathname.replace(/\.html$/, '').replace(/\/$/, '');
  return {
    href: ruta === '/biblioteca' || ruta.startsWith('/biblioteca/') ? '#contacto' : '/#contacto',
    texto: 'Hablar con un ingeniero',
    textoCorto: 'Contactar',
  };
}
