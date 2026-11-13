// Proveedor simulado para las pruebas de contacto. Ejecuta la función real del sitio (reexport del kit) con
// variables ficticias y reemplaza fetch por un espía: ninguna llamada sale a la red y cada una queda registrada.
import { onRequestPost } from '../../functions/api/contact.js';

export const ENV_FICTICIO = Object.freeze({
  FORMULARIOS_URL: 'https://formularios.invalid/lead',
  FORMULARIOS_CLAVE: 'clave-ficticia-de-prueba',
  MARCA: '3d-ultra',
});

const respuestaPorDefecto = (url) => Response.json(url === ENV_FICTICIO.FORMULARIOS_URL ? { ok: true } : { id: 'acuse-ficticio' });

// pares: [[nombre, valor], ...] en el orden del formulario, como los serializa un navegador sin JS.
export async function enviar(pares, { env = ENV_FICTICIO, referer, respuesta = respuestaPorDefecto } = {}) {
  const llamadas = [];
  const pendientes = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    llamadas.push({ url: String(url), method: init.method, headers: { ...init.headers }, body: init.body ? JSON.parse(init.body) : undefined });
    return respuesta(String(url), init);
  };
  try {
    const headers = { 'content-type': 'application/x-www-form-urlencoded' };
    if (referer) headers.referer = referer;
    const request = new Request('https://3d-ultra.cl/api/contact', { method: 'POST', headers, body: new URLSearchParams(pares) });
    const res = await onRequestPost({ request, env, waitUntil: (p) => pendientes.push(p) });
    await Promise.all(pendientes);
    return { status: res.status, location: res.headers.get('location'), llamadas, worker: llamadas.filter((l) => l.url === env.FORMULARIOS_URL) };
  } finally {
    globalThis.fetch = original;
  }
}

// Nombres de los campos de un componente .astro, en orden de aparición.
export const nombresDelFormulario = (fuente) => [...fuente.matchAll(/<(?:input|select|textarea)\b[^>]*\bname="([^"]+)"/g)].map((m) => m[1]);
