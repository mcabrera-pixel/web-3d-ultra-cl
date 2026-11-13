// Lógica pura del visor de la biblioteca (sin Three.js ni DOM): se prueba con node --test.

/**
 * Distancia de cámara para que una esfera de radio `radio` quepa en el campo de visión más estrecho.
 * `fovGrados` es el FOV vertical y `aspecto` = ancho / alto. El margen baja de forma continua (smoothstep)
 * de 1,35 (aspecto 1,0 o menos) a 0,82 (aspecto 1,6 o más). Un aspecto no finito o no positivo (canvas oculto) cuenta como 1.
 */
export function distanciaEncuadre(radio, fovGrados, aspecto) {
  const a = Number.isFinite(aspecto) && aspecto > 0 ? aspecto : 1;
  const v = (fovGrados * Math.PI) / 360;
  const h = Math.atan(Math.tan(v) * a);
  const t = Math.min(1, Math.max(0, (a - 1) / 0.6));
  const s = t * t * (3 - 2 * t);
  const margen = 1.35 + (0.82 - 1.35) * s;
  return (radio * margen) / Math.sin(Math.min(v, h));
}

/** Desplazamiento de explosionado: del centro del equipo al centro de la pieza, con largo `radio`. */
export function pasoExplosion(centroPieza, centroEquipo, radio) {
  const d = centroPieza.map((c, i) => c - centroEquipo[i]);
  const largo = Math.hypot(...d);
  if (largo < 1e-9) return [0, radio, 0];
  return d.map((c) => (c / largo) * radio);
}

/** ¿La pieza queda del lado que mira la cámara? Compara en el plano horizontal (x, z). */
export function ladoVisible(pieza, objetivo, camara, umbral = -0.25) {
  const lx = pieza[0] - objetivo[0];
  const lz = pieza[2] - objetivo[2];
  const cx = camara[0] - objetivo[0];
  const cz = camara[2] - objetivo[2];
  const ll = Math.hypot(lx, lz);
  const lc = Math.hypot(cx, cz);
  if (ll < 1e-9 || lc < 1e-9) return true;
  return (lx * cx + lz * cz) / (ll * lc) > umbral;
}

/** Tocar la pieza ya elegida la suelta (vuelve al equipo completo); tocar otra la elige. */
export function alternarSeleccion(actual, tocada) {
  return actual !== null && actual === tocada ? null : tocada;
}

/** Nombre en español de un nodo del modelo. Solo cuenta una propiedad propia, no una heredada de Object.prototype. */
export function nombrePieza(nombres, nodo) {
  const nombre = Object.hasOwn(nombres, nodo) ? nombres[nodo] : undefined;
  return nombre ?? 'Pieza del equipo';
}

/** La rueda sin Ctrl ni Cmd baja la página; con Ctrl o Cmd acerca el modelo. */
export function ruedaAcerca(evento) {
  return Boolean(evento.ctrlKey || evento.metaKey);
}

/**
 * Avance de la barra de carga (0 a 100), o null sin total conocido. Con el GLB en gzip, `cargado` cuenta bytes ya
 * descomprimidos y `total` es el largo del archivo comprimido: el cociente pasa de 1 y la barra se queda en 100.
 */
export function porcentajeCarga(cargado, total) {
  if (!total) return null;
  return Math.min(100, Math.round((cargado / total) * 100));
}

/** Etiquetas de piezas a la vista: bajo 400 px de ancho, solo las 2 primeras de las que miran a la cámara, para que no se monten. */
export function etiquetasAVer(visibles, ancho) {
  const tope = ancho < 400 ? 2 : Infinity;
  let vistas = 0;
  return visibles.map((v) => v && vistas++ < tope);
}
