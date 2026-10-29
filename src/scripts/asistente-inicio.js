// Base heredada. Su revisión editorial está fuera de la adopción visual.
const KNOWLEDGE_BASE = [{
                keys: ["precio", "costo", "valor", "cotizacion", "cotizar", "presupuesto", "uf", "dinero", "cuanto vale"],
                response: "💰 <strong>Sobre Precios:</strong><br>El servicio de Escáner Láser comienza desde <strong>25 UF/jornada</strong>.<br>El modelado BIM y planos As-Built se cotizan por m² según complejidad.<br><br>¿Te gustaría agendar una visita técnica sin costo?"
            },
            {
                keys: ["precision", "exactitud", "error", "tolerancia", "milimetros", "mm"],
                response: "📏 <strong>Precisión Técnica:</strong><br>Usamos escáner láser FARO Focus con un error máximo de <strong>±2 mm</strong>.<br>Esto cumple con estándares para montaje de estructuras metálicas y análisis de verticalidad."
            },
            {
                keys: ["entregable", "formato", "archivo", "revit", "cad", "autocad", "nube de puntos", "software"],
                response: "📂 <strong>Formatos de Entrega:</strong><br>• Nube de Puntos: .RCP (ReCap), .E57, .LAS<br>• Modelos BIM: .RVT (Revit 2021-25), .IFC, .NWD<br>• Planos 2D: .DWG y PDF Ploteable."
            },
            {
                keys: ["tiempo", "demora", "plazo", "rapido", "dias", "tardan"],
                respuesta: "⏱ <strong>Plazos Estimados:</strong><br>• Levantamiento: Hasta 3.000 m² por día.<br>• Procesamiento de Nube: 24 horas.<br>• Modelado 3D: Aprox. 5 días hábiles para una nave industrial promedio."
            },
            {
                keys: ["norma", "legal", "nch", "sismo", "certifi", "firma"],
                respuesta: "⚖️ <strong>Normativa y Calidad:</strong><br>Trabajamos bajo NCh 2369 (Diseño Sísmico) y ACI 117 (Tolerancias).<br>Todas las memorias de cálculo son firmadas por un Ingeniero Civil colegiado."
            }
            ];

export function enlaceConsulta(base, texto) {
  return `${base}?text=Hola,%20consulta:%20${encodeURIComponent(texto)}`;
}

export function findBestMatch(userText) {
  const cleanText = userText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let bestMatch = null, maxHits = 0;
  for (const item of KNOWLEDGE_BASE) {
    const hits = item.keys.filter(key => cleanText.includes(key)).length;
    if (hits > maxHits) { maxHits = hits; bestMatch = item.response || item.respuesta; }
  }
  return bestMatch;
}

function iniciar() {
  const root = document.querySelector('.inicio-asistente');
  if (!root) return;
  const byId = id => root.querySelector(`#${id}`);
  const toggle = byId('ai-toggle'), panel = byId('ai-window'), input = byId('ai-input');
  const body = byId('ai-body'), typing = byId('ai-typing');
  toggle.hidden = false;
  const cerrar = () => { panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); };
  toggle.addEventListener('click', () => {
    if (!panel.hidden) return cerrar();
    panel.hidden = false; toggle.setAttribute('aria-expanded', 'true'); input.focus();
  });
  byId('ai-close').addEventListener('click', cerrar);
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); cerrar(); } });
  const agregar = (contenido, tipo, html = false) => {
    const fila = document.createElement('div'); fila.className = `msg-row ${tipo}`;
    const burbuja = document.createElement('div'); burbuja.className = 'msg-bubble';
    // Solo la base local es HTML. Las consultas nunca se interpretan como marcado.
    if (html) burbuja.innerHTML = contenido; else burbuja.textContent = contenido;
    fila.append(burbuja); body.append(fila); body.scrollTop = body.scrollHeight;
    return burbuja;
  };
  const enviar = () => {
    const texto = input.value.trim(); if (!texto) return;
    agregar(texto, 'user'); input.value = ''; typing.hidden = false;
    setTimeout(() => {
      typing.hidden = true;
      const respuesta = findBestMatch(texto);
      if (respuesta) agregar(respuesta, 'bot', true);
      else {
        const mensaje = agregar('No tengo ese dato específico en mi manual técnico. Pero he preparado un enlace directo con nuestro Ingeniero Jefe para que te responda ahora:', 'bot');
        const enlace = document.createElement('a');
        enlace.className = 'agent-link'; enlace.href = enlaceConsulta(root.dataset.whatsapp, texto);
        enlace.target = '_blank'; enlace.rel = 'noopener noreferrer';
        enlace.textContent = 'Hablar con Ingeniero (WhatsApp)'; mensaje.append(enlace);
      }
      body.scrollTop = body.scrollHeight;
    }, 1200);
  };
  byId('ai-send').addEventListener('click', enviar);
  input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); enviar(); } });
}
if (typeof document !== 'undefined') iniciar();
