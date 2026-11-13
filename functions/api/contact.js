// POST /api/contact: Pages Function estándar del kit. Honeypot, Turnstile si hay secreto, lead al Worker
// formularios-mcco y acuse opcional; 302 a /gracias o a /contacto-error?reason=... Web3Forms ya no se usa.
// Variables en Cloudflare Pages, Settings, Environment variables (nunca en el repo): FORMULARIOS_URL,
// FORMULARIOS_CLAVE y MARCA obligatorias; TURNSTILE_SECRET, RESEND_API_KEY, ACUSE_FROM, SITE_NAME, WHATSAPP y WEB
// opcionales. Detalle en @mcco/web-kit/functions/contact.js. Pruebas: test/contacto.test.mjs y test/build/contacto.test.mjs.
export { onRequestPost } from '@mcco/web-kit/functions/contact.js';
