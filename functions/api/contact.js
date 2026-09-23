// POST /api/contact — Pages Function estándar del kit (honeypot + Turnstile + Web3Forms + acuse opcional).
// Variables en Cloudflare Pages → Settings → Environment variables (nunca en el repo): ver kit/functions/contact.js.
export { onRequestPost } from '@mcco/web-kit/functions/contact.js';
