// GET /modelos/<slug>.glb → el modelo desde R2 (binding MEDIOS, carpeta biblioteca/). Mismo dominio: sin CORS ni r2.dev.
const NOMBRE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.glb$/;

export async function onRequestGet({ params, env, request }) {
  const archivo = String(params.archivo ?? '');
  if (!NOMBRE.test(archivo)) return new Response('No encontrado', { status: 404 });
  if (!env.MEDIOS) return new Response('Modelos no configurados', { status: 503 });
  const objeto = await env.MEDIOS.get(`biblioteca/${archivo}`, { onlyIf: request.headers });
  if (objeto === null) return new Response('No encontrado', { status: 404 });
  const headers = new Headers();
  objeto.writeHttpMetadata(headers);
  headers.set('content-type', 'model/gltf-binary');
  headers.set('cache-control', 'public, max-age=86400');
  headers.set('etag', objeto.httpEtag);
  headers.set('x-content-type-options', 'nosniff');
  // Con onlyIf, R2 devuelve el objeto sin cuerpo cuando la versión del navegador sigue vigente.
  if (!('body' in objeto) || objeto.body == null) return new Response(null, { status: 304, headers });
  return new Response(objeto.body, { headers });
}
