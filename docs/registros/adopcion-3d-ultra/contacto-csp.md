# Contactos y CSP de 3d-ultra.cl (Tarea 7)

Fecha: 13-nov-2026. Rama `feat/estandar-apple`, kit `@mcco/web-kit` v1.4.0.

## Transporte real

`functions/api/contact.js` reexporta `onRequestPost` de `@mcco/web-kit/functions/contact.js`. En el sitio solo
cambia el comentario. Web3Forms ya no se usa y no se restaura.

1. Lee el formulario con límite de 32 KB y 40 campos (`reason=tamano` si se pasa).
2. Honeypot `website_url` con texto: `reason=spam`, sin ninguna llamada externa.
3. Faltan `FORMULARIOS_URL`, `FORMULARIOS_CLAVE` o `MARCA`: `reason=config`, sin ninguna llamada externa.
4. Con `TURNSTILE_SECRET`, sin token o con token rechazado: `reason=turnstile`. El sitio no tiene Turnstile
   configurado (`turnstile_sitekey: ""`).
5. POST JSON al Worker `formularios-mcco` con la cabecera `x-formularios-clave` y el cuerpo
   `{ marca: MARCA, origen: Referer o "/contacto/", campos }`. `campos` lleva todos los campos de texto salvo
   `access_key`, `cf-turnstile-response`, `website_url` y `botcheck`.
6. El Worker responde 2xx con `{ ok: true }`: acuse opcional por Resend (solo con `RESEND_API_KEY`) y 302 a
   `/gracias`. Si responde otra cosa: `reason=correo`. Si vence el plazo de 25 s: `reason=demora`.

Hay dos «origen» distintos. El de primer nivel es el `Referer` de la página que envió. `campos.origen` es el
hidden de la biblioteca (`biblioteca/` o `biblioteca/<slug>`). Ninguno reemplaza al otro.

## Formularios

| Formulario | Página | Campos que viajan al Worker | Notas |
|---|---|---|---|
| `FormularioInicio.astro` | `/` | `subject`, `from_name`, `nombre`, `empresa`, `servicio`, `email` | Seis opciones de servicio, `email` obligatorio y botón «Solicitar Reunión» |
| `FormularioEquipo.astro` | `/biblioteca/` | `equipo`, `origen` = `biblioteca/`, `nombre`, `empresa`, `email`, `mensaje` | Equipo editable, con `nombre` y `email` obligatorios |
| `FormularioEquipo.astro` | `/biblioteca/<slug>` | `equipo` = nombre del equipo, `origen` = `biblioteca/<slug>`, `nombre`, `empresa`, `email`, `mensaje` | Equipo de solo lectura. WhatsApp sale del manifiesto |

Los tres llevan la trampa `website_url` fuera de la vista, con `tabindex="-1"` y `aria-hidden`, y no viaja.

## Pruebas con proveedor simulado

Todas usan la función real del sitio, variables ficticias (`https://formularios.invalid/lead`,
`clave-ficticia-de-prueba`, `MARCA` `3d-ultra`) y un `fetch` espía que no sale a la red. Correos y nombres
son de prueba (`persona@ejemplo.invalid`).

- `test/contacto.test.mjs` (prebuild, 10 pruebas). Comprueba que los fixtures tienen los mismos campos, y en el
  mismo orden, que los dos componentes. Revisa el payload de inicio, hub y ficha con `MARCA`, `Referer` y
  `campos.origen`, y la caída a `/contacto/` sin `Referer`. Cubre también el honeypot, las tres variables de
  configuración, el rechazo del Worker, la respuesta sin `ok`, el plazo vencido, Turnstile sin token y el acuse
  opcional, que sale solo con clave y solo si el Worker acepta.
- `test/build/contacto.test.mjs` (posterior al build, 6 pruebas). Serializa los formularios de `dist/index.html`,
  `dist/biblioteca/index.html` y `dist/biblioteca/komatsu-930e-5.html` como un navegador sin JS y los pasa por la
  función. Comprueba además que quitar el hidden `origen` de la ficha se nota en el payload, que el equipo es de
  solo lectura en la ficha y editable en el hub, y que la página de error no invita a reenviar sin advertir.
- Navegador (Chrome headless del encargo, `dist` servido con su `_headers`): POST sin JS desde portada, hub y
  ficha llegan a `/gracias` y el Worker simulado recibe los campos, `MARCA`, `Referer` y `campos.origen`.

## Página de error y `reason=demora`

`/contacto-error` es estática y muestra lo mismo para todos los motivos. Antes invitaba a «intentarlo de nuevo».
Con `reason=demora` el Worker pudo recibir el lead aunque venció el plazo, y reenviarlo lo duplicaría. Ahora dice
que el mensaje pudo llegar igual y pide confirmarlo por WhatsApp o correo antes de enviarlo otra vez. Title,
descripción y H1 no cambian.

## Analítica y conversiones

`site.yaml` deja GA4, Ads y beacon vacíos. El `Analytics` del kit, que el layout incluye una sola vez, no emite
nada sin IDs. No hay medición de conversiones. La conversión funcional es el formulario con su 302 a `/gracias`
y el enlace de WhatsApp. El navegador confirmó cero solicitudes a Google Tag Manager, Google Analytics, Ads y
Cloudflare Insights.

## CSP

Política que genera `mcco-headers` desde `site.yaml` (no se edita `_headers` a mano):

| Directiva | Valor | Origen |
|---|---|---|
| `script-src` | `'self' 'unsafe-inline'`, Turnstile, Cloudflare Insights, `'wasm-unsafe-eval'` | Base del kit, más Wasm para el decodificador Meshopt del visor |
| `style-src` | `'self' 'unsafe-inline' https://fonts.googleapis.com` | Base del kit (Google Fonts, ver abajo) |
| `font-src` | `'self' data: https://fonts.gstatic.com` | Base del kit (Google Fonts, ver abajo) |
| `img-src` | `'self' data: blob:` | Base del kit. Se quitó `https://images.unsplash.com`, que ya no usaba ninguna página |
| `media-src` | `'self'` y el origen R2 de los videos | R2 declarado en `site.yaml` |
| `connect-src` | `'self'`, Turnstile, Cloudflare Insights, `blob:` | `blob:` para las texturas del visor |
| `frame-src` | Turnstile | Sin marcos de visores externos |
| `form-action` | `'self' https://api.web3forms.com` | Base del kit (Web3Forms, ver abajo) |

- El Worker de la nube (`nube-worker-*.js`) es del mismo origen. No hay `worker-src` ni `child-src`, así que
  vale `script-src 'self'`. En el navegador la historia llegó al estado `nube` sin violaciones.
- `unsafe_eval: false`: el sitio no usa `eval` ni `new Function`.
- Cero solicitudes a Google Fonts: Montserrat, `index-head-extra.html` y `site.css` se retiraron, y
  `test/build/fuentes.test.mjs` exige que ningún HTML, CSS o JS de `dist` nombre Google Fonts ni Montserrat.
- Console sin violaciones de CSP en portada, hub, ficha con el visor cargado, un caso, la guía, la FAQ inglesa,
  gracias y contacto-error.

### Dependencias de limpieza en el kit

El sitio no puede quitar estos permisos sin editar `_headers` a mano o inventar una clave local, y ninguna de
las dos cosas se hace. Quedan para el kit:

1. `kit/scripts/headers.mjs:18-19` agrega siempre `https://fonts.googleapis.com` a `style-src` y
   `https://fonts.gstatic.com` a `font-src`. Ninguna web del Estándar las necesita (Inter es local).
2. `kit/scripts/headers.mjs:24` agrega siempre `https://api.web3forms.com` a `form-action`, aunque la función
   de contacto del kit ya envía al Worker.
3. `kit/scripts/check.mjs:228` avisa «CSP con 'unsafe-eval' sin justificar» porque la expresión `/unsafe-eval/`
   también encuentra `'wasm-unsafe-eval'`. Es un falso positivo, porque `unsafe_eval` sigue en `false`.

## Pendiente para la Tarea 8

- Repetir la prueba bajo Cloudflare Pages real: cabeceras servidas por Pages, la función con sus variables
  reales y un lead de prueba acordado con Mario. Aquí no se publicó nada ni se usó wrangler.
- Los textos del asistente y de los casos siguen pendientes de revisión editorial aparte.
