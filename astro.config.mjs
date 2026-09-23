// @ts-check
import { defineConfig } from 'astro/config';
import { mccoConfig } from '@mcco/web-kit/config';

// Toda la configuración estándar (dominio, formato de URLs, kit) sale de site.yaml vía mccoConfig().
// Agrega aquí solo integraciones propias del sitio: defineConfig(mccoConfig({ integrations: [...] }))
export default defineConfig(mccoConfig());
