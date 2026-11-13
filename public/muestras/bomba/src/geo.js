// Utilitarios de geometría. Todo se construye por código: no hay modelos descargados.
// Convención de la bomba: el eje de giro es X; un punto a radio r y ángulo a queda en (x, r·cos a, r·sin a).
import * as THREE from '../vendor/three.module.min.js';

export const TAU = Math.PI * 2;
export const rad = (g) => (g * Math.PI) / 180;
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const lerp = (a, b, t) => a + (b - a) * t;

// Interpolación lineal por tramos sobre una tabla [[x, y], ...] ordenada por x.
export function interp(x, tabla) {
  if (x <= tabla[0][0]) return tabla[0][1];
  for (let i = 1; i < tabla.length; i++) {
    if (x <= tabla[i][0]) {
      const [x0, y0] = tabla[i - 1], [x1, y1] = tabla[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return tabla[tabla.length - 1][1];
}

// Generador pseudoaleatorio determinista (mulberry32).
export function azar(semilla) {
  let s = semilla | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Acumulador de triángulos con normales por vértice. Orienta cada triángulo según la normal pedida,
// así los constructores no dependen del sentido de giro.
export class Malla {
  constructor() { this.p = []; this.n = []; }
  tri(a, b, c, na, nb, nc) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    if (cx * cx + cy * cy + cz * cz < 1e-20) return;
    nb = nb || na; nc = nc || na;
    const d = cx * (na[0] + nb[0] + nc[0]) + cy * (na[1] + nb[1] + nc[1]) + cz * (na[2] + nb[2] + nc[2]);
    if (d < 0) { this.p.push(...a, ...c, ...b); this.n.push(...na, ...nc, ...nb); }
    else { this.p.push(...a, ...b, ...c); this.n.push(...na, ...nb, ...nc); }
  }
  quad(a, b, c, d, na, nb, nc, nd) { // a-b-c-d en orden alrededor del cuadrilátero
    nb = nb || na; nc = nc || na; nd = nd || na;
    this.tri(a, b, c, na, nb, nc); this.tri(a, c, d, na, nc, nd);
  }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    return g;
  }
}

// Une geometrías en una sola no indexada, con posición, normal y color por vértice.
export function unir(lista) {
  const partes = lista.flat(Infinity).filter(Boolean).map((g) => {
    const h = g.index ? g.toNonIndexed() : g;
    if (!h.attributes.normal) h.computeVertexNormals();
    return h;
  });
  let n = 0; for (const g of partes) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3).fill(1);
  let o = 0;
  for (const g of partes) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.color) col.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingBox(); out.computeBoundingSphere();
  return out;
}

// Tiñe una geometría completa (multiplica el color del material). k: número (gris) o [r, g, b].
export function tinte(g, k) {
  const h = g.index ? g.toNonIndexed() : g;
  if (!h.attributes.normal) h.computeVertexNormals();
  const n = h.attributes.position.count, c = new Float32Array(n * 3);
  const [r, v, b] = Array.isArray(k) ? k : [k, k, k];
  for (let i = 0; i < n; i++) { c[i * 3] = r; c[i * 3 + 1] = v; c[i * 3 + 2] = b; }
  h.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return h;
}

// Sólido de revolución alrededor del eje X.
// pts: [x, r, { s: arista suave, k: cuánto le afecta el crecimiento g(a) }]. El perfil se recorre en sentido
// horario visto con x a la derecha y r hacia arriba (cara exterior con x creciente), de modo que la normal
// (-dr, dx) apunta hacia afuera.
export function revol(pts, o = {}) {
  const seg = o.seg ?? 64, a0 = o.a0 ?? 0, a1 = o.a1 ?? TAU, cerrar = !!o.cerrar, g = o.g || null;
  const P = pts.map((p) => ({ x: p[0], r: p[1], s: !!(p[2] && p[2].s), k: (p[2] && p[2].k) || 0 }));
  const n = P.length, m = cerrar ? n : n - 1;
  const N = [];
  for (let j = 0; j < m; j++) {
    const A = P[j], B = P[(j + 1) % n];
    const dx = B.x - A.x, dr = B.r - A.r, L = Math.hypot(dx, dr) || 1;
    N.push([-dr / L, dx / L]);
  }
  const normalEn = (i, j) => { // normal del punto i visto desde el tramo j
    if (!P[i].s) return N[j];
    const jp = i - 1 >= 0 ? i - 1 : (cerrar ? m - 1 : -1);
    const jn = i < m ? i : (cerrar ? 0 : -1);
    if (jp < 0 || jn < 0) return N[j];
    const x = N[jp][0] + N[jn][0], r = N[jp][1] + N[jn][1], L = Math.hypot(x, r) || 1;
    return [x / L, r / L];
  };
  const M = new Malla();
  const pt = (Q, a, ga) => { const r = Q.r + Q.k * ga; return [Q.x, r * Math.cos(a), r * Math.sin(a)]; };
  const nr = (q, a) => [q[0], q[1] * Math.cos(a), q[1] * Math.sin(a)];
  for (let j = 0; j < m; j++) {
    const ia = j, ib = (j + 1) % n, A = P[ia], B = P[ib];
    const nA = normalEn(ia, j), nB = normalEn(ib, j);
    for (let s = 0; s < seg; s++) {
      const u0 = a0 + ((a1 - a0) * s) / seg, u1 = a0 + ((a1 - a0) * (s + 1)) / seg;
      const g0 = g ? g(u0) : 0, g1 = g ? g(u1) : 0;
      M.quad(pt(A, u0, g0), pt(A, u1, g1), pt(B, u1, g1), pt(B, u0, g0), nr(nA, u0), nr(nA, u1), nr(nB, u1), nr(nB, u0));
    }
  }
  if (o.tapas && cerrar && Math.abs(a1 - a0) < TAU - 1e-6) {
    const cont = P.map((Q) => new THREE.Vector2(Q.x, Q.r));
    const caras = THREE.ShapeUtils.triangulateShape(cont, []);
    for (const [a, sg] of [[a0, -1], [a1, 1]]) {
      const nn = [0, -Math.sin(a) * sg, Math.cos(a) * sg], ga = g ? g(a) : 0;
      for (const f of caras) M.tri(pt(P[f[0]], a, ga), pt(P[f[1]], a, ga), pt(P[f[2]], a, ga), nn);
    }
  }
  return M.geo();
}

// Tubo de sección circular y radio variable a lo largo de una curva. Con «pared» agrega la cara interior
// y los dos anillos de los extremos.
export function tubo(curva, radio, o = {}) {
  const seg = o.seg ?? 32, nr = o.rad ?? 24, pared = o.pared ?? 0, up = o.up || V(1, 0, 0);
  const R = typeof radio === 'function' ? radio : () => radio;
  const M = new Malla(), filas = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, p = curva.getPoint(t), T = curva.getTangent(t).normalize();
    let n1 = new THREE.Vector3().crossVectors(up, T);
    if (n1.lengthSq() < 1e-8) n1 = new THREE.Vector3().crossVectors(V(0, 0, 1), T);
    n1.normalize();
    const n2 = new THREE.Vector3().crossVectors(T, n1).normalize();
    const fila = [];
    for (let j = 0; j <= nr; j++) {
      const a = (j / nr) * TAU, c = Math.cos(a), s = Math.sin(a);
      const d = [n1.x * c + n2.x * s, n1.y * c + n2.y * s, n1.z * c + n2.z * s];
      const re = R(t), ri = re - pared;
      fila.push({ d, e: [p.x + d[0] * re, p.y + d[1] * re, p.z + d[2] * re], i: [p.x + d[0] * ri, p.y + d[1] * ri, p.z + d[2] * ri], T: [T.x, T.y, T.z] });
    }
    filas.push(fila);
  }
  const neg = (v) => [-v[0], -v[1], -v[2]];
  for (let i = 0; i < seg; i++) for (let j = 0; j < nr; j++) {
    const a = filas[i][j], b = filas[i][j + 1], c = filas[i + 1][j + 1], d = filas[i + 1][j];
    M.quad(a.e, b.e, c.e, d.e, a.d, b.d, c.d, d.d);
    if (pared > 0) M.quad(a.i, b.i, c.i, d.i, neg(a.d), neg(b.d), neg(c.d), neg(d.d));
  }
  if (pared > 0) for (const [i, sg] of [[0, -1], [seg, 1]]) for (let j = 0; j < nr; j++) {
    const a = filas[i][j], b = filas[i][j + 1], nn = sg < 0 ? neg(a.T) : a.T;
    M.quad(a.e, b.e, b.i, a.i, nn);
  }
  return M.geo();
}

// Primitivas alineadas con el eje X.
export const cilX = (r, L, x0 = 0, seg = 32) => new THREE.CylinderGeometry(r, r, L, seg).rotateZ(-Math.PI / 2).translate(x0 + L / 2, 0, 0);
export const cilY = (r, L, seg = 24) => new THREE.CylinderGeometry(r, r, L, seg);
export function hexX(entreCaras, L, x0 = 0) {
  const g = new THREE.CylinderGeometry(entreCaras / Math.sqrt(3), entreCaras / Math.sqrt(3), L, 6).toNonIndexed();
  g.computeVertexNormals();
  return g.rotateZ(-Math.PI / 2).translate(x0 + L / 2, 0, 0);
}
export const toroX = (R, r, x = 0, seg = 48) => new THREE.TorusGeometry(R, r, 10, seg).rotateY(Math.PI / 2).translate(x, 0, 0);
export const caja = (lx, ly, lz, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(lx, ly, lz).translate(x, y, z);
export const anillo = (rIn, rOut, x0, x1, seg = 64) => revol([[x0, rIn], [x0, rOut], [x1, rOut], [x1, rIn]], { cerrar: true, seg });

class Helice extends THREE.Curve {
  constructor(R, x0, x1, vueltas) { super(); Object.assign(this, { R, x0, x1, vueltas }); }
  getPoint(t, out = new THREE.Vector3()) {
    const a = t * this.vueltas * TAU;
    return out.set(lerp(this.x0, this.x1, t), this.R * Math.cos(a), this.R * Math.sin(a));
  }
}
export const resorte = (R, alambre, x0, x1, vueltas) => new THREE.TubeGeometry(new Helice(R, x0, x1, vueltas), Math.round(vueltas * 28), alambre, 8, false);

// Perno de cabeza hexagonal: cabeza en x ∈ [-0,65·d, 0] y vástago hacia +X.
export function perno(d, L) { return [hexX(1.6 * d, 0.65 * d, -0.65 * d), cilX(d / 2, L, 0, 14)]; }
// Chaveta paralela de extremos redondos, a lo largo de X y centrada en el origen.
export function chaveta(L, alto, ancho) {
  return [caja(L - ancho, alto, ancho), cilY(ancho / 2, alto, 16).translate(-(L - ancho) / 2, 0, 0), cilY(ancho / 2, alto, 16).translate((L - ancho) / 2, 0, 0)];
}
// Lleva una geometría construida sobre +X a la dirección «dir», con su origen en «pos».
export function orientar(g, dir, pos) {
  const q = new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), dir.clone().normalize());
  const lista = Array.isArray(g) ? g.flat(Infinity) : [g];
  for (const h of lista) { h.applyQuaternion(q); h.translate(pos.x, pos.y, pos.z); }
  return g;
}
// Prisma: polígono en el plano XY extruido en Z y centrado en z = 0.
export function prisma(puntos, espesor) {
  const s = new THREE.Shape(puntos.map((p) => new THREE.Vector2(p[0], p[1])));
  return new THREE.ExtrudeGeometry(s, { depth: espesor, bevelEnabled: false }).translate(0, 0, -espesor / 2);
}
