// Nube de puntos: muestreo desde el modelo (simulada) y lectura del contrato data/nube/nube.json + nube.bin.
// Sin DOM en la parte de muestreo: la usa también herramientas/generar-nube.mjs.
import * as THREE from '../vendor/three.module.min.js';

function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// Muestrea N puntos sobre las superficies de los objetos visibles de `raiz`, ponderado por área.
// pesoDe(mesh) permite bajar la densidad de piso y muros. Ordena por estación más cercana
// para poder mostrar el levantamiento estación por estación.
export function muestrearNube(raiz, N, { pesoDe = () => 1, estaciones = [], semilla = 4242, excluir = () => false } = {}) {
  const rnd = mulberry32(semilla);
  raiz.updateMatrixWorld(true);
  const tris = []; let total = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
  const visible = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  raiz.traverse(o => {
    if (!o.isMesh || excluir(o) || !visible(o)) return;
    const g = o.geometry, pos = g.attributes.position, idx = g.index, w = pesoDe(o);
    if (w <= 0) return;
    const col = new THREE.Color(); o.material.color.getRGB(col, THREE.SRGBColorSpace);
    const n = idx ? idx.count / 3 : pos.count / 3;
    for (let t = 0; t < n; t++) {
      const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(o.matrixWorld);
      b.fromBufferAttribute(pos, i1).applyMatrix4(o.matrixWorld);
      c.fromBufferAttribute(pos, i2).applyMatrix4(o.matrixWorld);
      const area = ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() / 2;
      if (area < 1e-9) continue;
      const nrm = ab.clone().normalize();
      total += area * w;
      tris.push({ acc: total, ax: a.x, ay: a.y, az: a.z, bx: b.x, by: b.y, bz: b.z, cx: c.x, cy: c.y, cz: c.z, col, ny: nrm.y });
    }
  });
  const P = new Float32Array(N * 3), C = new Uint8Array(N * 3), E = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const r = rnd() * total;
    let lo = 0, hi = tris.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (tris[m].acc < r) lo = m + 1; else hi = m; }
    const T = tris[lo];
    let u = rnd(), v = rnd(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const ruido = () => (rnd() - 0.5) * 0.005;
    const x = T.ax + (T.bx - T.ax) * u + (T.cx - T.ax) * v + ruido();
    const y = T.ay + (T.by - T.ay) * u + (T.cy - T.ay) * v + ruido();
    const z = T.az + (T.bz - T.az) * u + (T.cz - T.az) * v + ruido();
    P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z;
    // color de escáner: color del material con iluminación plana y variación de intensidad
    const luz = 0.72 + 0.28 * Math.abs(T.ny) + (rnd() - 0.5) * 0.14;
    C[i * 3] = Math.min(255, T.col.r * 255 * luz); C[i * 3 + 1] = Math.min(255, T.col.g * 255 * luz); C[i * 3 + 2] = Math.min(255, T.col.b * 255 * luz);
    let best = 0, bd = Infinity;
    estaciones.forEach((s, k) => { const d = (s.x - x) ** 2 + (s.z - z) ** 2; if (d < bd) { bd = d; best = k; } });
    E[i] = best;
  }
  if (!estaciones.length) return { posiciones: P, colores: C };
  // reordenar por estación
  const orden = Array.from({ length: N }, (_, i) => i).sort((i, j) => E[i] - E[j] || i - j);
  const P2 = new Float32Array(N * 3), C2 = new Uint8Array(N * 3), cortes = new Array(estaciones.length).fill(0);
  orden.forEach((src, dst) => { P2.set(P.subarray(src * 3, src * 3 + 3), dst * 3); C2.set(C.subarray(src * 3, src * 3 + 3), dst * 3); cortes[E[src]]++; });
  return { posiciones: P2, colores: C2, porEstacion: cortes };
}

// Empaqueta en el formato del contrato: N×3 Float32 LE seguidos de N×3 Uint8.
export function empaquetar(posiciones, colores) {
  const N = posiciones.length / 3;
  const buf = new ArrayBuffer(N * 12 + N * 3);
  const dv = new DataView(buf);
  for (let i = 0; i < N * 3; i++) dv.setFloat32(i * 4, posiciones[i], true);
  new Uint8Array(buf, N * 12).set(colores);
  return buf;
}
export function desempaquetar(buf, N) {
  const dv = new DataView(buf);
  if (buf.byteLength < N * 15) throw new Error(`nube.bin tiene ${buf.byteLength} bytes y se esperaban ${N * 15}`);
  const P = new Float32Array(N * 3);
  for (let i = 0; i < N * 3; i++) P[i] = dv.getFloat32(i * 4, true);
  const C = new Uint8Array(buf.slice(N * 12, N * 15));
  return { posiciones: P, colores: C };
}
export function caja(P) {
  const m = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { m[k] = Math.min(m[k], P[i + k]); m[k + 3] = Math.max(m[k + 3], P[i + k]); }
  return m.map(v => +v.toFixed(3));
}

// Pesos por defecto: piso y muros con menos densidad que los equipos.
export function pesoPorDefecto(o) {
  let p = o; while (p && p.name !== 'sala' && !p.name.startsWith('unidad')) p = p.parent;
  if (!p) return 1;
  if (p.name === 'sala') { const g = o.geometry.parameters || {}; const grande = (g.width || 0) > 6 || (g.depth || 0) > 6; return grande ? 0.22 : 0.8; }
  return 1.6;
}
