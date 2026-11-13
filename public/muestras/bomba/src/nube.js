// Capa de nube de puntos.
// Contrato del archivo: data/nube/nube.json = { origen: "simulada" | "escaner", puntos: N, archivo: "nube.bin",
// caja: [minX, minY, minZ, maxX, maxY, maxZ] } y nube.bin = N×3 Float32 (x, y, z en metros, little-endian)
// seguidos de N×3 Uint8 (r, g, b). Si el archivo no existe, la nube se simula desde el modelo.
import * as THREE from '../vendor/three.module.min.js';
import { azar } from './geo.js';

const VERT = `
attribute vec3 aCol; attribute float aRev;
uniform float uTam, uEscala, uProg, uModo, uY0, uY1, uCorte, uLado;
varying vec3 vCol;
vec3 rampa(float t) {
  vec3 a = vec3(0.16, 0.30, 0.85), b = vec3(0.10, 0.75, 0.80), c = vec3(0.45, 0.85, 0.30), d = vec3(0.98, 0.80, 0.20), e = vec3(0.90, 0.25, 0.18);
  if (t < 0.25) return mix(a, b, t / 0.25);
  if (t < 0.5) return mix(b, c, (t - 0.25) / 0.25);
  if (t < 0.75) return mix(c, d, (t - 0.5) / 0.25);
  return mix(d, e, (t - 0.75) / 0.25);
}
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec4 mv = viewMatrix * wp;
  gl_Position = projectionMatrix * mv;
  float ver = step(aRev, uProg);
  if (uLado > 0.5 && wp.x < uCorte) ver = 0.0;
  gl_PointSize = clamp(uTam * uEscala / max(0.1, -mv.z), 1.6, 7.0);
  if (ver < 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  float luz = dot(aCol, vec3(0.3, 0.59, 0.11));
  vCol = mix(aCol, rampa(clamp((wp.y - uY0) / (uY1 - uY0), 0.0, 1.0)) * (0.55 + 0.6 * luz), uModo);
}`;
const FRAG = `
varying vec3 vCol;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  if (dot(c, c) > 0.25) discard;
  gl_FragColor = vec4(vCol, 1.0);
}`;

// Lee la nube del archivo. Devuelve null si no existe o no cumple el contrato.
export async function cargarNube(carpeta) {
  try {
    const r = await fetch(`${carpeta}/nube.json`, { cache: 'no-cache' });
    if (!r.ok) return null;
    const meta = await r.json();
    if (!meta || !meta.archivo || !(meta.puntos > 0)) return null;
    const rb = await fetch(`${carpeta}/${meta.archivo}`, { cache: 'no-cache' });
    if (!rb.ok) return null;
    const buf = await rb.arrayBuffer(), n = meta.puntos;
    if (buf.byteLength < n * 15) return null;
    return { origen: meta.origen === 'escaner' ? 'escaner' : 'simulada', n, caja: meta.caja, pos: new Float32Array(buf, 0, n * 3), col: new Uint8Array(buf, n * 12, n * 3) };
  } catch { return null; }
}

// Simula el levantamiento: muestrea las superficies que mira al menos una estación, con ruido de medición y una
// densidad que cae con la distancia y con el ángulo de incidencia, como en un escaneo real.
export function simularNube(raices, estaciones, { densidad = 5200, semilla = 7 } = {}) {
  const rnd = azar(semilla);
  const gauss = () => { let u = 0; for (let i = 0; i < 4; i++) u += rnd(); return (u - 2) * 1.732; };
  const P = [], C = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3(), nrm = new THREE.Vector3(), p = new THREE.Vector3(), d = new THREE.Vector3();
  const rgb = { r: 1, g: 1, b: 1 };
  const visitar = (o, oculto) => {
    if (oculto || o.userData.sinNube) return;
    if (o.isMesh && o.geometry && o.geometry.attributes.position) {
      const g = o.geometry, pos = g.attributes.position, idx = g.index, colv = g.attributes.color, m = o.matrixWorld;
      const doble = o.material.side === THREE.DoubleSide;
      (o.material.userData.colorNube || o.material.color).getRGB(rgb, THREE.SRGBColorSpace);
      if (!g.boundingBox) g.computeBoundingBox();
      const tam = g.boundingBox.getSize(d), grande = Math.max(tam.x, tam.z) > 6;
      const dens = grande ? densidad * 0.3 : o.userData.sel && o.userData.sel.tipo === 'pieza' ? densidad * 1.8 : densidad;
      const nt = idx ? idx.count / 3 : pos.count / 3;
      for (let t = 0; t < nt; t++) {
        const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
        a.fromBufferAttribute(pos, i0).applyMatrix4(m); b.fromBufferAttribute(pos, i1).applyMatrix4(m); c.fromBufferAttribute(pos, i2).applyMatrix4(m);
        ab.subVectors(b, a); ac.subVectors(c, a); nrm.crossVectors(ab, ac);
        const area = nrm.length() / 2; if (area < 1e-9) continue;
        nrm.multiplyScalar(0.5 / area);
        let k = area * dens, n = Math.floor(k); if (rnd() < k - n) n++;
        const tinte = colv ? colv.getX(i0) : 1;
        for (let q = 0; q < n; q++) {
          let u = rnd(), v = rnd(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
          p.copy(a).addScaledVector(ab, u).addScaledVector(ac, v);
          if (p.y < -0.02) continue;
          let mejor = 0, est = -1, cosm = 0;
          for (let s = 0; s < estaciones.length; s++) {
            d.subVectors(estaciones[s], p); const dist = d.length(); if (dist > 16) continue;
            let cos = nrm.dot(d) / dist; if (doble) cos = Math.abs(cos);
            if (cos < 0.07) continue;
            const w = Math.sqrt(cos) * Math.min(1, Math.max(0.28, 3.4 / dist));
            if (w > mejor) { mejor = w; est = s; cosm = cos; }
          }
          if (est < 0 || rnd() > mejor) continue;
          d.subVectors(p, estaciones[est]).normalize();
          p.addScaledVector(d, gauss() * 0.0016); p.x += gauss() * 0.0008; p.y += gauss() * 0.0008; p.z += gauss() * 0.0008;
          const luz = (0.5 + 0.5 * cosm) * tinte * (1 + gauss() * 0.035);
          P.push(p.x, p.y, p.z);
          C.push(Math.min(255, rgb.r * luz * 255), Math.min(255, rgb.g * luz * 255), Math.min(255, rgb.b * luz * 255));
        }
      }
    }
    for (const h of o.children) visitar(h, false);
  };
  for (const r of raices) { r.updateMatrixWorld(true); visitar(r, false); }
  // se desordenan los puntos para poder dibujar solo una parte en equipos lentos sin perder cobertura
  const n = P.length / 3, pos = new Float32Array(n * 3), col = new Uint8Array(n * 3), orden = new Uint32Array(n);
  for (let i = 0; i < n; i++) orden[i] = i;
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)), t = orden[i]; orden[i] = orden[j]; orden[j] = t; }
  const caja = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) {
    const o = orden[i] * 3;
    for (let k = 0; k < 3; k++) { const v = P[o + k]; pos[i * 3 + k] = v; col[i * 3 + k] = C[o + k]; if (v < caja[k]) caja[k] = v; if (v > caja[k + 3]) caja[k + 3] = v; }
  }
  return { origen: 'simulada', n, pos, col, caja: caja.map((v) => Number(v.toFixed(3))) };
}

// Construye el objeto THREE.Points. El atributo aRev ordena la aparición de los puntos: por estación y por
// azimut alrededor de ella, para animar el barrido del escáner.
export function crearNube(datos, estaciones) {
  const { n, pos, col } = datos;
  const rev = new Float32Array(n), ne = estaciones.length;
  const cx = (datos.caja[0] + datos.caja[3]) / 2, cz = (datos.caja[2] + datos.caja[5]) / 2;
  for (let i = 0; i < n; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    if (datos.origen === 'simulada' && ne) {
      let mejor = 1e9, s = 0;
      for (let k = 0; k < ne; k++) { const e = estaciones[k], dd = (x - e.x) ** 2 + (y - e.y) ** 2 + (z - e.z) ** 2; if (dd < mejor) { mejor = dd; s = k; } }
      rev[i] = (s + (Math.atan2(z - estaciones[s].z, x - estaciones[s].x) + Math.PI) / (2 * Math.PI)) / ne;
    } else rev[i] = (Math.atan2(z - cz, x - cx) + Math.PI) / (2 * Math.PI);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aCol', new THREE.BufferAttribute(col, 3, true));
  g.setAttribute('aRev', new THREE.BufferAttribute(rev, 1));
  g.boundingBox = new THREE.Box3(new THREE.Vector3(datos.caja[0], datos.caja[1], datos.caja[2]), new THREE.Vector3(datos.caja[3], datos.caja[4], datos.caja[5]));
  g.boundingSphere = g.boundingBox.getBoundingSphere(new THREE.Sphere());
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: { uTam: { value: 0.013 }, uEscala: { value: 800 }, uProg: { value: 1 }, uModo: { value: 0 }, uY0: { value: datos.caja[1] }, uY1: { value: Math.min(datos.caja[4], datos.caja[1] + 4.2) }, uCorte: { value: 0 }, uLado: { value: 0 } },
  });
  const puntos = new THREE.Points(g, material);
  puntos.frustumCulled = false; puntos.userData.sinNube = true; puntos.visible = false;
  return puntos;
}

// Serializa la nube según el contrato, para guardarla en data/nube/.
export function exportarNube(datos) {
  const n = datos.n, buf = new Uint8Array(n * 15);
  buf.set(new Uint8Array(datos.pos.buffer, datos.pos.byteOffset, n * 12), 0);
  buf.set(datos.col.subarray(0, n * 3), n * 12);
  return { json: { origen: datos.origen, puntos: n, archivo: 'nube.bin', caja: datos.caja }, bin: buf };
}
