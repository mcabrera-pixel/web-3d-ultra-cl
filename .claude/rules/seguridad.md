# Seguridad — Estándares de Ingeniería MCCO

## 1. Autenticación y Autorización

- TODOS los endpoints del Worker/API DEBEN validar autenticación (header `X-API-Key` o `Authorization: Bearer <jwt>`)
- Whitelist de agentes válidos: `a0_scraper`, `a1_categorizador`, `a2_buscador`, `a2_5_scraper`, `a3_precios`, `a4_email`, `a5_whatsapp`, `a7_decisor`, `curador`, `supervisor`, `trainer`
- Rechazar cualquier caller con nombre no reconocido — responder 403
- Validar campos enum (status, agent_name) contra lista fija; rechazar valores desconocidos con 400

## 2. Prevención de SQL Injection

NUNCA concatenar input de usuario en SQL. SIEMPRE usar parámetros.

**Python — MAL:**
```python
# NUNCA hacer esto
query = f"SELECT * FROM cas WHERE status = '{status}'"
cursor.execute(query)
```
**Python — BIEN:**
```python
cursor.execute("SELECT * FROM cas WHERE status = ?", (status,))
```

**TypeScript — MAL:**
```typescript
// NUNCA hacer esto
const result = await db.exec(`SELECT * FROM cas WHERE id = '${id}'`);
```
**TypeScript — BIEN:**
```typescript
const result = await db.prepare("SELECT * FROM cas WHERE id = ?").bind(id).all();
```

## 3. CORS

- NUNCA usar `Access-Control-Allow-Origin: *` en producción
- Whitelist de orígenes explícita; denegar el resto con 403

```typescript
const ALLOWED_ORIGINS = ["https://mcco.cl", "https://admin.mcco.cl"];
const origin = request.headers.get("Origin") ?? "";
const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
response.headers.set("Access-Control-Allow-Origin", corsOrigin);
response.headers.set("Access-Control-Allow-Methods", "GET, POST");
response.headers.set("Vary", "Origin");
```

## 4. Gestión de Secretos

- Claves API, passwords, tokens → archivo `.env` ÚNICAMENTE
- `.env` DEBE estar en `.gitignore`; proveer `.env.example` con valores placeholder
- NUNCA hardcodear claves en código fuente
- NUNCA loggear secretos — enmascarar en output:
  ```python
  logger.info(f"Conectando con key={api_key[:4]}***")
  ```
- Rotar tokens periódicamente; revocar inmediatamente si se exponen

## 5. Validación de Input

- Validar todo input externo en el boundary de la API antes de procesarlo
- Usar whitelist (valores permitidos), no blacklist
- Aplicar largo máximo en strings (ej. `nombre` ≤ 255 chars, `descripcion` ≤ 2000)
- Verificar tipos en campos numéricos (presupuesto, cantidades)
- Sanitizar contenido HTML/script antes de almacenar o reenviar

## 6. Rate Limiting

- Agentes internos: máximo 100 req/min por agente (validar en Worker)
- Endpoints públicos o webhooks: implementar rate limit por IP o token
- Webhooks externos: verificar firma HMAC cuando el proveedor la ofrezca

## 7. Privacidad de Datos (Chile)

- NUNCA exponer RUT, email ni teléfono en logs ni mensajes de error
- NUNCA revelar nombre del organismo ni presupuesto de una CA a proveedores externos
- Enmascarar PII en excepciones y stack traces:
  ```python
  # MAL: logger.error(f"Error enviando a {proveedor.email}")
  logger.error(f"Error enviando a proveedor id={proveedor.id}")
  ```
- NUNCA incluir RUT, email ni teléfono de personas en prompts enviados a proveedores LLM
  externos (MiniMax, etc.) — redactar antes del envío, igual que en logs:
  `proveedor id=123` en vez del dato personal. Aplica a todo agente que arme prompts
  con datos de proveedores, contactos u organismos
- Cumplir Ley 19.628 de protección de datos personales (Chile)

## 8. Prompt Injection Defense (ver prompt-security.md)

- NUNCA mezclar instrucciones del sistema con datos de usuario en el mismo bloque de prompt
- SIEMPRE delimitar datos externos con tags XML: `<datos_externos fuente="x">...</datos_externos>`
- Sanitizar datos de Google Sheets, emails, MercadoPublico antes de enviar al LLM
- Detectar caracteres Unicode peligrosos (zero-width, bidi overrides) en input externo
- Ver regla completa en `prompt-security.md`
