// Geometría de la sala de bombas y del conjunto PP-101.
// Sin DOM: este módulo también lo usa herramientas/generar-nube.mjs en Node para muestrear la nube simulada.
// Unidades en metros. Eje X = eje de la bomba (aspiración hacia -X, motor hacia +X). Y hacia arriba.
// Origen local del conjunto = centro del rodete sobre el eje. Altura de eje sobre el piso: 0,77 m.
import * as THREE from '../vendor/three.module.min.js';

export const ALTURA_EJE = 0.77;

// ------------------------------------------------------------------ materiales
const std = (c, r = 0.6, m = 0.1, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...extra });
export const MAT = {
  bomba: std(0x1f3f8f, 0.5, 0.25),        // azul ultramar (hoja de datos: RAL 5002)
  bombaInt: std(0x2a4aa0, 0.6, 0.2),
  fundicion: std(0x55595e, 0.7, 0.45),
  acero: std(0xb8bec4, 0.3, 0.85),
  aceroOsc: std(0x6f767c, 0.4, 0.7),
  inox: std(0xd2d6da, 0.22, 0.9),
  bronce: std(0xa77b3b, 0.35, 0.8),
  goma: std(0x1d1d1d, 0.85, 0.0),
  junta: std(0x6b4f2c, 0.9, 0.0),
  carbon: std(0x2b2b2e, 0.5, 0.2),
  motor: std(0x56636e, 0.45, 0.35),
  motorOsc: std(0x3c454d, 0.5, 0.4),
  guarda: std(0xe0a21a, 0.5, 0.2),
  base: std(0x1f3f8f, 0.55, 0.3),
  hormigon: std(0xbdb7ab, 0.95, 0.0),
  piso: std(0xa9a49a, 0.92, 0.0),
  muro: std(0xd8d3c8, 0.9, 0.0),
  tuberia: std(0x5d7f6a, 0.5, 0.3),       // verde tubería de agua de proceso
  valvula: std(0x2f3a45, 0.45, 0.5),
  volante: std(0xb02a20, 0.5, 0.3),
  estructura: std(0xc9c4b8, 0.55, 0.3),
  amarillo: std(0xe8b71c, 0.5, 0.1),
  gris: std(0x8a8f94, 0.6, 0.3),
  tablero: std(0xd9d9d4, 0.5, 0.2),
  instrumento: std(0xdedede, 0.4, 0.3),
  escaner: std(0x30353a, 0.4, 0.5),
  escanerCab: std(0xe8e8e8, 0.35, 0.3),
  blanco: std(0xf2f2f2, 0.6, 0.0),
  negro: std(0x151515, 0.6, 0.0),
};

// ------------------------------------------------------------------ utilitarios
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function mk(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
const box = (w, h, d, mat, x, y, z) => mk(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
function cyl(r, L, mat, eje, x, y, z, s = 32, r2 = r) {
  const m = mk(new THREE.CylinderGeometry(r2, r, L, s), mat, x, y, z);
  if (eje === 'x') m.rotation.z = -Math.PI / 2; if (eje === 'z') m.rotation.x = Math.PI / 2; return m;
}
// Torneado alrededor del eje X. perfil: [[radio, x], ...]
function torneado(perfil, mat, s = 48, x = 0) {
  const pts = perfil.map(([r, a]) => new THREE.Vector2(Math.max(r, 0.0001), a));
  const m = mk(new THREE.LatheGeometry(pts, s), mat, x, 0, 0); m.rotation.z = -Math.PI / 2; return m;
}
// anillo macizo de sección rectangular en eje X, centrado en x
function anillo(rIn, rOut, t, mat, x = 0, s = 48) {
  return torneado([[rIn, -t / 2], [rOut, -t / 2], [rOut, t / 2], [rIn, t / 2], [rIn, -t / 2]], mat, s, x);
}
function toro(R, r, mat, x = 0) { const m = mk(new THREE.TorusGeometry(R, r, 10, 48), mat, x, 0, 0); m.rotation.y = Math.PI / 2; return m; }
function entre(a, b, r, mat, s = 24) {
  const d = b.clone().sub(a); const L = d.length();
  const m = mk(new THREE.CylinderGeometry(r, r, L, s), mat);
  m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return m;
}
function hex(r, L, mat, eje = 'x') { return cyl(r, L, mat, eje, 0, 0, 0, 6); }
function brida(rOut, t, nPernos, rPernos, mat, eje = 'x', rIn = 0) {
  const g = new THREE.Group();
  if (eje === 'x') g.add(anillo(rIn, rOut, t, mat, 0, 40));
  else { const a = anillo(rIn, rOut, t, mat, 0, 40); g.add(a); g.rotation.z = Math.PI / 2; }
  for (let i = 0; i < nPernos; i++) {
    const a = (i + 0.5) / nPernos * Math.PI * 2;
    const p = cyl(0.011, t + 0.03, MAT.aceroOsc, 'x', 0, Math.cos(a) * rPernos, Math.sin(a) * rPernos, 6); g.add(p);
  }
  return g;
}

// Carcasa espiral: tubo de sección creciente enrollado alrededor del eje X.
function voluta(mat) {
  const nA = 72, nS = 20, pos = [], idx = [];
  const a0 = 0.35, a1 = Math.PI * 2 + 0.15;
  for (let i = 0; i <= nA; i++) {
    const t = i / nA, a = a0 + (a1 - a0) * t;
    const R = 0.205 + 0.05 * t, r = 0.035 + 0.075 * Math.pow(t, 0.9);
    const ry = Math.cos(a), rz = Math.sin(a);
    for (let j = 0; j <= nS; j++) {
      const b = j / nS * Math.PI * 2;
      const rad = R + r * Math.cos(b) * 1.0, ax = r * Math.sin(b) * 0.82;
      pos.push(ax, ry * rad, rz * rad);
    }
  }
  for (let i = 0; i < nA; i++) for (let j = 0; j < nS; j++) {
    const a = i * (nS + 1) + j, b = a + nS + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return mk(g, mat);
}

// Álabe curvado hacia atrás, extruido a lo largo del eje X.
function alabe(a0, ancho, x, mat) {
  const sh = new THREE.Shape(), n = 14, ext = [], int = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n, r = 0.055 + 0.1 * s, a = a0 + 1.15 * s, e = 0.0045 + 0.003 * Math.sin(s * Math.PI);
    ext.push([Math.cos(a) * (r), Math.sin(a) * (r), a, e]);
  }
  ext.forEach(([px, py, a, e], i) => { const nx = -Math.sin(a), ny = Math.cos(a); const P = [px + nx * e, py + ny * e]; i ? sh.lineTo(...P) : sh.moveTo(...P); });
  for (let i = ext.length - 1; i >= 0; i--) { const [px, py, a, e] = ext[i]; const nx = -Math.sin(a), ny = Math.cos(a); sh.lineTo(px - nx * e, py - ny * e); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: ancho, bevelEnabled: false, curveSegments: 4 });
  const m = mk(g, mat); m.rotation.y = Math.PI / 2; m.position.x = x;
  // tras la rotación, x local -> -z mundo, y local -> y, z local -> x
  return m;
}

// ------------------------------------------------------------------ bomba (piezas de la Tabla 28)
// Cada instancia registra su desplazamiento de despiece: ex = (dx, dy, dz).
function construirBomba() {
  const g = new THREE.Group(); g.name = 'bomba';
  const piezas = new Map(); // numero -> [obj]
  const despiece = [];      // { obj, base, ex }
  const reg = (numero, obj, ex = [0, 0, 0], nombreInst = '') => {
    obj.userData.numero = numero; obj.userData.instancia = nombreInst;
    obj.traverse(o => { o.userData.numero = numero; });
    g.add(obj);
    if (!piezas.has(numero)) piezas.set(numero, []);
    piezas.get(numero).push(obj);
    despiece.push({ obj, base: obj.position.clone(), ex: V(...ex) });
    return obj;
  };
  const grp = (...hijos) => { const q = new THREE.Group(); hijos.forEach(h => q.add(h)); return q; };
  const RA = 0;   // fila A (carcasa, cierre, soporte)
  const RB = 0.62; // fila B (eje con rodamientos), por encima

  // 102 carcasa espiral
  {
    const c = new THREE.Group();
    c.add(voluta(MAT.bomba));
    // cámara del rodete y boca de aspiración axial DN 200
    c.add(torneado([[0.100, -0.43], [0.170, -0.43], [0.170, -0.405], [0.118, -0.40], [0.118, -0.16], [0.13, -0.11], [0.20, -0.075], [0.235, -0.04], [0.245, 0.035], [0.31, 0.04], [0.31, 0.068], [0.26, 0.068], [0.23, 0.05], [0.20, 0.04], [0.20, -0.03], [0.12, -0.065], [0.100, -0.09], [0.100, -0.43]], MAT.bomba, 56));
    // pernos de la brida de aspiración (8 x DN200 PN10)
    for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2; c.add(cyl(0.011, 0.05, MAT.aceroOsc, 'x', -0.418, Math.cos(a) * 0.1475, Math.sin(a) * 0.1475, 6)); }
    // tubuladura de impulsión DN 150 hacia arriba y su brida PN16
    c.add(cyl(0.105, 0.30, MAT.bomba, 'y', 0, 0.335, 0.035, 36, 0.088));
    c.add(cyl(0.105, 0.06, MAT.bomba, 'y', 0, 0.20, 0.06, 36));
    const bI = brida(0.1425, 0.028, 8, 0.12, MAT.bomba, 'y'); bI.position.set(0, 0.516, 0.035); c.add(bI);
    // nervios
    c.add(box(0.02, 0.16, 0.07, MAT.bomba, -0.05, 0.27, 0.035));
    c.add(box(0.02, 0.16, 0.07, MAT.bomba, 0.05, 0.27, 0.035));
    // pie de la carcasa
    c.add(box(0.13, 0.12, 0.30, MAT.bomba, -0.01, -0.315, 0));
    c.add(box(0.17, 0.025, 0.44, MAT.bomba, -0.01, -0.3875, 0));
    c.add(box(0.04, 0.09, 0.40, MAT.bomba, -0.01, -0.33, 0));
    // bosses de conexiones
    c.add(cyl(0.022, 0.05, MAT.bomba, 'y', -0.03, -0.355 + 0.03, 0.12, 16));
    reg('102', c, [-1.55, RA, 0]);
  }
  // conexiones como puntos propios
  const conexion = (numero, x, y, z, eje, ex) => {
    const q = new THREE.Group();
    const b = cyl(0.02, 0.035, MAT.bomba, eje, 0, 0, 0, 16); q.add(b);
    const marca = cyl(0.012, 0.006, MAT.amarillo, eje, eje === 'y' ? 0 : 0, eje === 'y' ? 0.02 * Math.sign(y || 1) : 0, eje === 'z' ? 0.02 * Math.sign(z || 1) : 0, 16);
    q.add(marca); q.position.set(x, y, z); return reg(numero, q, ex);
  };
  conexion('6D', -0.03, 0.315, -0.17, 'y', [-1.55, 0.06, 0]);
  conexion('6B', -0.03, -0.30, 0.17, 'y', [-1.55, -0.03, 0.08]);
  conexion('1M', 0.0, 0.40, 0.135, 'z', [-1.55, 0.03, 0.08]);
  conexion('8B', 0.17, -0.115, 0.0, 'y', [0.75, -0.06, 0]);
  // 903.1 tornillos de cierre en 6D y 6B
  {
    const t1 = grp(hex(0.016, 0.012, MAT.aceroOsc, 'y'), cyl(0.011, 0.03, MAT.acero, 'y', 0, -0.018, 0, 12)); t1.position.set(-0.03, 0.345, -0.17); reg('903.1', t1, [-1.55, 0.16, 0], '6D');
    const t2 = grp(hex(0.016, 0.012, MAT.aceroOsc, 'y'), cyl(0.011, 0.03, MAT.acero, 'y', 0, 0.018, 0, 12)); t2.position.set(-0.03, -0.33, 0.17); reg('903.1', t2, [-1.55, -0.14, 0.12], '6B');
  }
  // 902 pernos roscados (8) y 920.5 tuercas
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) / 8 * Math.PI * 2, y = Math.cos(a) * 0.285, z = Math.sin(a) * 0.285;
    const p = cyl(0.008, 0.10, MAT.aceroOsc, 'x', 0.085, y, z, 8); reg('902.1-3', p, [-1.22, RA, 0]);
    const t = hex(0.014, 0.012, MAT.acero); t.position.set(0.112, y, z); reg('920.1/.5', t, [-1.03, RA, 0], '920.5');
  }
  // 502.1 anillo partido lado aspiración (en la carcasa)
  reg('502.1/.2', anillo(0.100, 0.118, 0.022, MAT.fundicion, -0.075), [-0.95, RA, 0], '502.1');
  // 230 rodete cerrado
  {
    const r = new THREE.Group();
    r.add(torneado([[0.026, -0.04], [0.045, -0.04], [0.05, 0.0], [0.157, 0.014], [0.157, 0.024], [0.05, 0.024], [0.044, 0.05], [0.026, 0.05], [0.026, -0.04]], MAT.fundicion, 56)); // cubo + disco trasero
    r.add(torneado([[0.092, -0.085], [0.103, -0.085], [0.103, -0.055], [0.157, -0.012], [0.157, -0.002], [0.098, -0.04], [0.092, -0.055], [0.092, -0.085]], MAT.fundicion, 56)); // disco delantero y cuello
    for (let i = 0; i < 6; i++) r.add(alabe(i / 6 * Math.PI * 2, 0.026, -0.012, MAT.fundicion));
    // anillo de desgaste trasero (cara del cubo)
    r.add(anillo(0.075, 0.085, 0.012, MAT.fundicion, 0.03));
    reg('230', r, [-0.62, RA, 0]);
  }
  // 920.1 tuerca del rodete, 930.3 seguro, 550 arandela
  { const t = hex(0.026, 0.024, MAT.acero); t.position.x = -0.062; reg('920.1/.5', t, [-0.84, RA, 0], '920.1'); }
  reg('930.3', anillo(0.016, 0.03, 0.004, MAT.aceroOsc, -0.048, 24), [-0.80, RA, 0], 'rodete');
  reg('550', anillo(0.016, 0.034, 0.006, MAT.acero, -0.043, 24), [-0.76, RA, 0]);
  // 502.2 anillo partido lado impulsión (en la cubierta)
  reg('502.1/.2', anillo(0.085, 0.10, 0.018, MAT.fundicion, 0.045), [-0.44, RA, 0], '502.2');
  // 400.3 junta plana pequeña
  reg('400.1/.3', anillo(0.025, 0.036, 0.003, MAT.junta, 0.052, 32), [-0.33, RA, 0], '400.3');
  // 433 cierre mecánico: resorte, anillo rotativo, anillo estacionario, juntas
  {
    const resorte = new THREE.Group();
    const curva = new THREE.Curve(); curva.getPoint = (t, out = new THREE.Vector3()) => { const a = t * Math.PI * 2 * 5; return out.set(0.06 + 0.035 * t, Math.cos(a) * 0.041, Math.sin(a) * 0.041); };
    resorte.add(mk(new THREE.TubeGeometry(curva, 200, 0.0028, 6, false), MAT.inox));
    reg('433', resorte, [-0.25, RA, 0], 'resorte');
    const anRot = grp(anillo(0.031, 0.047, 0.012, MAT.inox, 0.103), anillo(0.034, 0.045, 0.006, MAT.carbon, 0.112));
    reg('433', anRot, [-0.16, RA, 0], 'anillo rotativo');
    reg('433', toro(0.038, 0.0035, MAT.goma, 0.118), [-0.12, RA, 0], 'junta elastomérica');
    const anEst = grp(anillo(0.033, 0.05, 0.012, MAT.inox, 0.127), anillo(0.036, 0.048, 0.004, MAT.carbon, 0.12));
    reg('433', anEst, [-0.08, RA, 0], 'anillo estacionario');
    reg('433', toro(0.05, 0.0035, MAT.goma, 0.136), [-0.04, RA, 0], 'junta del asiento');
  }
  // 523 casquillo protector del eje
  reg('523', torneado([[0.0252, 0.054], [0.031, 0.054], [0.031, 0.205], [0.0252, 0.205], [0.0252, 0.054]], MAT.inox, 40), [0.12, RA, 0]);
  // 400.1 junta plana carcasa / cubierta
  reg('400.1/.3', anillo(0.245, 0.275, 0.003, MAT.junta, 0.07, 64), [0.33, RA, 0], '400.1');
  // 476 soporte del anillo estacionario y 412 junta tórica (no aplican en ejecución G)
  reg('476', anillo(0.05, 0.062, 0.016, MAT.inox, 0.145, 40), [0.42, RA, 0]);
  reg('412', toro(0.056, 0.0035, MAT.goma, 0.155), [0.50, RA, 0]);
  // 163.2 cubierta de presión encajada con cámara del cierre
  reg('163.2', torneado([[0.052, 0.21], [0.075, 0.21], [0.078, 0.20], [0.078, 0.13], [0.11, 0.105], [0.21, 0.09], [0.272, 0.085], [0.272, 0.068], [0.255, 0.068], [0.255, 0.058], [0.10, 0.058], [0.088, 0.075], [0.06, 0.09], [0.052, 0.12], [0.052, 0.21]], MAT.bomba, 56), [0.62, RA, 0]);
  // 330 soporte de cojinetes: brida linterna, ventanas, alojamiento de rodamientos
  {
    const s = new THREE.Group();
    s.add(anillo(0.20, 0.31, 0.026, MAT.bomba, 0.085, 56)); // brida a la carcasa
    s.add(torneado([[0.20, 0.098], [0.22, 0.098], [0.13, 0.20], [0.11, 0.20]], MAT.bomba, 56)); // cono linterna (exterior)
    s.add(torneado([[0.06, 0.205], [0.098, 0.205], [0.098, 0.62], [0.075, 0.635], [0.06, 0.635]], MAT.bomba, 56)); // alojamiento
    s.add(torneado([[0.09, 0.22], [0.108, 0.22], [0.108, 0.255], [0.09, 0.255]], MAT.bomba, 56)); // asiento lado bomba
    s.add(torneado([[0.09, 0.545], [0.108, 0.545], [0.108, 0.60], [0.09, 0.60]], MAT.bomba, 56)); // asiento lado acoplamiento
    // nervios superior e inferior y aleta de apoyo
    s.add(box(0.36, 0.03, 0.05, MAT.bomba, 0.41, 0.105, 0));
    s.add(box(0.36, 0.03, 0.05, MAT.bomba, 0.41, -0.105, 0));
    s.add(box(0.06, 0.03, 0.15, MAT.bomba, 0.52, -0.1, 0));
    // flecha de sentido de giro
    s.add(box(0.06, 0.006, 0.012, MAT.blanco, 0.45, 0.123, 0));
    reg('330', s, [0.75, RA, 0]);
  }
  // 183 pie de apoyo
  {
    const p = new THREE.Group();
    p.add(box(0.03, 0.27, 0.13, MAT.bomba, 0.52, -0.255, 0));
    p.add(box(0.16, 0.022, 0.22, MAT.bomba, 0.52, -0.389, 0));
    p.add(box(0.12, 0.08, 0.02, MAT.bomba, 0.52, -0.34, 0));
    reg('183', p, [0.75, -0.08, 0]);
  }
  // 81-92 chapa de cubierta (ventana lateral de la linterna)
  {
    const c = new THREE.Group();
    c.add(box(0.07, 0.11, 0.004, MAT.aceroOsc, 0, 0, 0));
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) c.add(cyl(0.006, 0.006, MAT.negro, 'z', -0.015 + j * 0.03, -0.035 + i * 0.023, 0, 10));
    c.position.set(0.155, 0, 0.175); c.rotation.y = -0.5;
    reg('81-92', c, [0.75, 0, 0.18]);
  }
  // 901 tornillos hexagonales
  { const t = grp(hex(0.012, 0.01, MAT.acero, 'y'), cyl(0.007, 0.03, MAT.acero, 'y', 0, -0.018, 0, 8)); t.position.set(0.40, 0.128, 0); reg('901.1-3', t, [0.75, 0.12, 0], '901.1'); }
  { const t = grp(hex(0.012, 0.01, MAT.acero, 'y'), cyl(0.007, 0.03, MAT.acero, 'y', 0, -0.018, 0, 8)); t.position.set(0.58, -0.37, 0.07); reg('901.1-3', t, [0.75, 0.06, 0.1], '901.2'); }
  { const t = grp(hex(0.01, 0.008, MAT.acero, 'z'), cyl(0.006, 0.02, MAT.acero, 'z', 0, 0, -0.012, 8)); t.position.set(0.165, 0.045, 0.19); reg('901.1-3', t, [0.75, 0.0, 0.26], '901.3'); }
  reg('930.3', (() => { const w = anillo(0.006, 0.012, 0.003, MAT.aceroOsc, 0, 16); w.rotation.set(0, Math.PI / 2, 0); w.position.set(0.165, 0.045, 0.182); return w; })(), [0.75, 0.0, 0.23], 'chapa de cubierta');

  // ---- fila B: eje y rodamientos
  // 210 eje escalonado
  reg('210', torneado([[0.0001, -0.10], [0.015, -0.10], [0.016, -0.072], [0.0225, -0.072], [0.0225, 0.05], [0.0252, 0.05], [0.0252, 0.215], [0.0275, 0.215], [0.0275, 0.29], [0.0325, 0.29], [0.0325, 0.55], [0.0275, 0.55], [0.0275, 0.64], [0.026, 0.645], [0.026, 0.765], [0.0001, 0.765]], MAT.acero, 40), [0.12, RB, 0]);
  // 940.2 chavetas del rodete (2), 940.3 chaveta del acoplamiento
  reg('940.2', box(0.08, 0.008, 0.012, MAT.aceroOsc, -0.012, 0.0245, 0), [0.12, RB + 0.12, 0]);
  reg('940.2', box(0.08, 0.008, 0.012, MAT.aceroOsc, -0.012, -0.0245, 0), [0.12, RB - 0.12, 0]);
  reg('940.3', box(0.09, 0.009, 0.014, MAT.aceroOsc, 0.70, 0.0285, 0), [0.12, RB + 0.12, 0]);
  // 321 rodamientos de bolas (lado bomba y lado acoplamiento)
  const rodamiento = (x) => {
    const q = new THREE.Group();
    q.add(anillo(0.051, 0.06, 0.029, MAT.acero, 0, 48));
    q.add(anillo(0.0275, 0.036, 0.029, MAT.acero, 0, 48));
    q.add(anillo(0.036, 0.051, 0.012, MAT.aceroOsc, 0, 32)); // jaula
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; q.add(mk(new THREE.SphereGeometry(0.0085, 12, 8), MAT.inox, 0, Math.cos(a) * 0.0435, Math.sin(a) * 0.0435)); }
    q.position.x = x; return q;
  };
  reg('321', rodamiento(0.272), [-0.20, RB, 0], 'lado bomba');
  reg('321', rodamiento(0.572), [0.42, RB, 0], 'lado acoplamiento');
  // 932 anillos de seguridad
  const circlip = (x) => { const m = mk(new THREE.TorusGeometry(0.063, 0.003, 6, 40, Math.PI * 1.8), MAT.aceroOsc, x, 0, 0); m.rotation.y = Math.PI / 2; return m; };
  reg('932', circlip(0.292), [-0.42, RB, 0], 'lado bomba');
  reg('932', circlip(0.552), [0.60, RB, 0], 'lado acoplamiento');
  // 360.1 tapas de cojinetes
  reg('360.1', torneado([[0.0285, 0.0], [0.09, 0.0], [0.09, 0.012], [0.062, 0.012], [0.062, 0.022], [0.0285, 0.022], [0.0285, 0.0]], MAT.bomba, 48, 0.20), [-0.58, RB, 0], 'lado bomba');
  reg('360.1', torneado([[0.0285, 0.0], [0.062, 0.0], [0.062, 0.010], [0.09, 0.010], [0.09, 0.022], [0.0285, 0.022], [0.0285, 0.0]], MAT.bomba, 48, 0.612), [0.78, RB, 0], 'lado acoplamiento');
  // 411 juntas anulares (anillo V)
  reg('411', anillo(0.0255, 0.036, 0.008, MAT.goma, 0.193, 32), [-0.72, RB, 0], 'lado bomba');
  reg('411', anillo(0.0255, 0.036, 0.008, MAT.goma, 0.642, 32), [0.92, RB, 0], 'lado acoplamiento');

  return { grupo: g, piezas, despiece };
}

// ------------------------------------------------------------------ acoplamiento, motor y base (conjuntos aparte)
function construirAcoplamiento() {
  const g = new THREE.Group(); g.name = 'ACO';
  g.add(torneado([[0.026, 0.645], [0.055, 0.645], [0.055, 0.70], [0.085, 0.70], [0.085, 0.735], [0.026, 0.735]], MAT.aceroOsc, 40));
  g.add(cyl(0.045, 0.15, MAT.acero, 'x', 0.81, 0, 0, 32));
  g.add(torneado([[0.03, 0.885], [0.095, 0.885], [0.095, 0.925], [0.06, 0.925], [0.06, 0.99], [0.03, 0.99]], MAT.aceroOsc, 40));
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.add(box(0.03, 0.025, 0.025, MAT.goma, 0.75, Math.cos(a) * 0.07, Math.sin(a) * 0.07)); }
  // protector (guarda) abierto por abajo
  const gu = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.15, 0.15, 0.42, 32, 1, true, Math.PI * 0.88, Math.PI * 1.24);
  const m = mk(geo, MAT.guarda.clone(), 0.84, 0, 0); m.rotation.z = -Math.PI / 2; m.material.side = THREE.DoubleSide; gu.add(m);
  gu.add(box(0.42, 0.012, 0.02, MAT.guarda, 0.84, -0.1, 0.11)); gu.add(box(0.42, 0.012, 0.02, MAT.guarda, 0.84, -0.1, -0.11));
  gu.add(box(0.03, 0.27, 0.2, MAT.guarda, 0.84, -0.25, 0.0));
  gu.name = 'guarda'; g.add(gu);
  return g;
}
function construirMotor() {
  const g = new THREE.Group(); g.name = 'MOT';
  const x0 = 1.0;
  g.add(cyl(0.0325, 0.12, MAT.acero, 'x', x0 - 0.02, 0, 0, 24));
  g.add(torneado([[0.04, x0 + 0.04], [0.20, x0 + 0.04], [0.25, x0 + 0.08], [0.25, x0 + 0.10]], MAT.motor, 48)); // escudo frontal
  g.add(cyl(0.235, 0.70, MAT.motor, 'x', x0 + 0.45, 0, 0, 48));
  for (let i = 0; i < 28; i++) {
    const a = i / 28 * Math.PI * 2; if (Math.abs(Math.cos(a) + 1) < 0.25) continue;
    const f = box(0.66, 0.05, 0.008, MAT.motor, x0 + 0.45, Math.cos(a) * 0.255, Math.sin(a) * 0.255);
    f.rotation.x = a; g.add(f);
  }
  g.add(torneado([[0.25, x0 + 0.80], [0.25, x0 + 0.82], [0.20, x0 + 0.86], [0.04, x0 + 0.86]], MAT.motor, 48));
  g.add(torneado([[0.0001, x0 + 1.07], [0.20, x0 + 1.07], [0.235, x0 + 1.02], [0.24, x0 + 0.87], [0.0001, x0 + 0.87]], MAT.motorOsc, 48)); // tapa ventilador
  for (let i = 0; i < 4; i++) g.add(box(0.15, 0.13, 0.08, MAT.motor, x0 + 0.20 + (i % 2) * 0.55, -0.215, i < 2 ? 0.2 : -0.2));
  g.add(box(0.24, 0.16, 0.22, MAT.motor, x0 + 0.38, 0.30, 0)); // caja de bornes arriba (0°)
  g.add(box(0.26, 0.02, 0.24, MAT.motorOsc, x0 + 0.38, 0.39, 0));
  g.add(cyl(0.025, 0.08, MAT.aceroOsc, 'z', x0 + 0.38, 0.29, 0.14, 16));
  g.add(mk(new THREE.TorusGeometry(0.035, 0.009, 8, 20), MAT.acero, x0 + 0.62, 0.31, 0));
  g.add(box(0.08, 0.05, 0.002, MAT.blanco, x0 + 0.62, 0.05, 0.257)); // placa
  return g;
}
function construirBase() {
  const g = new THREE.Group(); g.name = 'BAS';
  const y0 = -0.40, h = 0.17, x0 = -0.55, x1 = 2.15, L = x1 - x0, xc = (x0 + x1) / 2;
  for (const z of [-0.36, 0.36]) {
    g.add(box(L, 0.012, 0.10, MAT.base, xc, y0 - 0.006, z));
    g.add(box(L, h, 0.012, MAT.base, xc, y0 - h / 2, z + Math.sign(z) * 0.044));
    g.add(box(L, 0.012, 0.10, MAT.base, xc, y0 - h + 0.006, z));
  }
  g.add(box(L, 0.008, 0.62, MAT.base, xc, y0 - 0.03, 0)); // placa rebordeada
  for (const x of [x0 + 0.05, -0.02, 0.52, 1.2, 1.75, x1 - 0.05]) g.add(box(0.1, h - 0.02, 0.62, MAT.base, x, y0 - h / 2, 0));
  // suplementos del motor (altura de eje 280 vs 400)
  for (const x of [1.2, 1.75]) for (const z of [0.2, -0.2]) g.add(box(0.19, 0.12, 0.12, MAT.aceroOsc, x, -0.34, z));
  // pernos de anclaje
  for (const x of [x0 + 0.1, xc, x1 - 0.1]) for (const z of [-0.43, 0.43]) g.add(cyl(0.016, 0.05, MAT.acero, 'y', x, y0 - h + 0.03, z, 6));
  return g;
}

// ------------------------------------------------------------------ tuberías, válvulas, instrumentos
function valvulaCompuerta(r, eje = 'x', volanteEje = 'y') {
  const g = new THREE.Group();
  g.add(cyl(r * 1.25, r * 2.6, MAT.valvula, eje, 0, 0, 0, 28));
  g.add(brida(r * 1.6, 0.03, 8, r * 1.35, MAT.valvula, eje === 'x' ? 'x' : 'y'));
  const bonete = cyl(r * 0.55, r * 3.2, MAT.valvula, volanteEje, 0, 0, 0, 20);
  const dir = volanteEje === 'y' ? V(0, 1, 0) : volanteEje === 'z' ? V(0, 0, 1) : V(1, 0, 0);
  bonete.position.copy(dir.clone().multiplyScalar(r * 1.6)); g.add(bonete);
  const vastago = cyl(0.012, r * 2.0, MAT.acero, volanteEje, 0, 0, 0, 10); vastago.position.copy(dir.clone().multiplyScalar(r * 3.6)); g.add(vastago);
  const vol = mk(new THREE.TorusGeometry(r * 1.2, 0.012, 8, 32), MAT.volante);
  vol.position.copy(dir.clone().multiplyScalar(r * 4.4));
  if (volanteEje === 'y') vol.rotation.x = Math.PI / 2; if (volanteEje === 'x') vol.rotation.y = Math.PI / 2;
  g.add(vol);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const ra = mk(new THREE.BoxGeometry(r * 1.2, 0.012, 0.012), MAT.volante); ra.position.copy(vol.position); if (volanteEje === 'y') ra.rotation.y = a; else if (volanteEje === 'z') ra.rotation.z = a; else ra.rotation.x = a; ra.translateX(r * 0.6); g.add(ra); }
  return g;
}
function valvulaRetencion(r) { // vertical, flujo hacia arriba
  const g = new THREE.Group();
  g.add(cyl(r * 1.3, r * 2.4, MAT.valvula, 'y', 0, 0, 0, 28));
  g.add(box(r * 2.2, r * 1.6, r * 1.4, MAT.valvula, 0, 0, r * 0.6));
  g.add(cyl(r * 0.9, 0.03, MAT.valvula, 'z', 0, 0, r * 1.35, 24));
  for (const y of [-r * 1.25, r * 1.25]) { const b = brida(r * 1.6, 0.03, 8, r * 1.35, MAT.valvula, 'y'); b.position.y = y; g.add(b); }
  return g;
}
function codo(R, r, mat, s = 16) { const m = mk(new THREE.TorusGeometry(R, r, 16, s, Math.PI / 2), mat); return m; }
function transmisor(color = MAT.instrumento) {
  const g = new THREE.Group();
  g.add(cyl(0.008, 0.08, MAT.acero, 'y', 0, 0.04, 0, 8));
  g.add(cyl(0.035, 0.05, color, 'z', 0, 0.11, 0, 20));
  g.add(box(0.05, 0.05, 0.05, MAT.gris, 0, 0.16, 0));
  return g;
}

// Unidad completa: plinto + conjunto + tuberías propias. Devuelve referencias útiles.
function construirUnidad(tag) {
  const u = new THREE.Group(); u.name = 'unidad-' + tag;
  // plinto de hormigón
  u.add(box(3.1, 0.2, 1.3, MAT.hormigon, 0.8, 0.1, 0));
  // conjunto en coordenadas del eje
  const conj = new THREE.Group(); conj.name = 'conjunto-' + tag; conj.position.set(0, ALTURA_EJE, 0); u.add(conj);
  const bomba = construirBomba(); conj.add(bomba.grupo);
  const aco = construirAcoplamiento(); conj.add(aco);
  const motor = construirMotor(); conj.add(motor);
  const base = construirBase(); conj.add(base);
  // succión DN200: brida bomba en x=-0.43 -> colector en x=-2.6
  const tub = new THREE.Group(); tub.name = 'tuberia-' + tag; u.add(tub);
  const ys = ALTURA_EJE;
  const fs = brida(0.17, 0.025, 8, 0.1475, MAT.tuberia); fs.position.set(-0.455, ys, 0); tub.add(fs);
  tub.add(cyl(0.11, 0.42, MAT.tuberia, 'x', -0.67, ys, 0));       // carrete con toma de presión
  const vs = valvulaCompuerta(0.11, 'x', 'y'); vs.position.set(-1.05, ys, 0); vs.name = 'XV-S'; tub.add(vs);
  tub.add(cyl(0.11, 1.32, MAT.tuberia, 'x', -1.86, ys, 0));
  // soporte de la succión
  tub.add(box(0.12, ys - 0.11, 0.12, MAT.estructura, -1.7, (ys - 0.11) / 2, 0));
  tub.add(box(0.3, 0.02, 0.3, MAT.estructura, -1.7, 0.01, 0));
  // descarga DN150 -> DN200 hacia arriba hasta el colector a y=3.2
  const yd = ALTURA_EJE + 0.53, zd = 0.035;
  const fd = brida(0.1425, 0.025, 8, 0.12, MAT.tuberia, 'y'); fd.position.set(0, yd + 0.012, zd); tub.add(fd);
  let cur = yd + 0.025;
  tub.add(cyl(0.085, 0.26, MAT.tuberia, 'y', 0, cur + 0.13, zd, 28, 0.11)); cur += 0.26; // ampliación concéntrica 150 -> 200
  const vr = valvulaRetencion(0.11); vr.position.set(0, cur + 0.132, zd); vr.name = 'XV-R'; tub.add(vr); cur += 0.264;
  const vd = valvulaCompuerta(0.11, 'y', 'z'); vd.position.set(0, cur + 0.143, zd); vd.name = 'XV-D'; tub.add(vd); cur += 0.286;
  tub.add(cyl(0.11, 0.25, MAT.tuberia, 'y', 0, cur + 0.125, zd)); cur += 0.25;
  // apoyo de la descarga
  tub.add(box(0.1, 0.1, 0.5, MAT.estructura, 0, cur - 0.1, zd - 0.3));
  tub.add(box(0.1, cur - 0.15, 0.1, MAT.estructura, 0, (cur - 0.15) / 2, zd - 0.5));
  // caudalímetro electromagnético
  const ft = new THREE.Group();
  ft.add(cyl(0.135, 0.36, MAT.tuberia, 'y', 0, 0, 0, 28)); ft.add(cyl(0.15, 0.30, MAT.instrumento, 'y', 0, 0, 0, 28, 0.15));
  ft.add(cyl(0.045, 0.12, MAT.gris, 'z', 0, 0, 0.19, 16)); ft.add(box(0.14, 0.16, 0.08, MAT.instrumento, 0, 0, 0.27));
  ft.position.set(0, cur + 0.18, zd); tub.add(ft); cur += 0.36;
  tub.add(cyl(0.11, 3.2 - cur, MAT.tuberia, 'y', 0, (3.2 + cur) / 2, zd));
  // instrumentos
  const pts = transmisor(); pts.position.set(-0.67, ys + 0.11, 0); tub.add(pts);
  const ptd = transmisor(); ptd.position.set(0, yd + 0.16, zd + 0.11); ptd.rotation.x = Math.PI / 2; tub.add(ptd);
  // sensores de vibración y temperatura en el soporte de cojinetes
  const sensores = new THREE.Group(); conj.add(sensores);
  const sens = (x, y, z, rx, rz) => { const s = new THREE.Group(); s.add(cyl(0.017, 0.055, MAT.inox, 'y', 0, 0.027, 0, 16)); s.add(cyl(0.008, 0.06, MAT.negro, 'y', 0, 0.08, 0, 8)); s.position.set(x, y, z); s.rotation.set(rx, 0, rz); sensores.add(s); return s; };
  const vLA = sens(0.572, 0.098, 0, 0, 0); const vLL = sens(0.272, 0.098, 0, 0, 0);
  const tLA = sens(0.572, 0, 0.098, Math.PI / 2, 0); const tLL = sens(0.272, 0, 0.098, Math.PI / 2, 0);
  sensores.userData.lista = { vLA, vLL, tLA, tLL };
  return { u, conj, bomba, aco, motor, base, tub, refs: { vLA, vLL, tLA, tLL, pts, ptd, ft, vs, vd, vr } };
}

// ------------------------------------------------------------------ sala de bombas
export function construirPlanta() {
  const root = new THREE.Group(); root.name = 'planta';
  const sala = new THREE.Group(); sala.name = 'sala'; root.add(sala);
  sala.add(box(13, 0.1, 10.5, MAT.piso, 0, -0.05, -0.25));
  // muros (fondo y lateral izquierdo) con zócalo
  sala.add(box(13, 6.2, 0.25, MAT.muro, 0, 3.1, -5.5));
  sala.add(box(0.25, 6.2, 10.5, MAT.muro, -6.5, 3.1, -0.25));
  sala.add(box(13, 0.4, 0.02, MAT.hormigon, 0, 0.2, -5.37));
  sala.add(box(0.02, 0.4, 10.5, MAT.hormigon, -6.37, 0.2, -0.25));
  // pilares y viga carril del puente grúa
  for (const x of [-6.2, -1.5, 3.2]) { sala.add(box(0.3, 6, 0.3, MAT.estructura, x, 3, -5.2)); sala.add(box(0.3, 6, 0.3, MAT.estructura, x, 3, 4.6)); }
  sala.add(box(10, 0.35, 0.25, MAT.amarillo, -1.5, 5.6, -5.0)); sala.add(box(10, 0.35, 0.25, MAT.amarillo, -1.5, 5.6, 4.4));
  sala.add(box(0.45, 0.45, 9.4, MAT.amarillo, -0.5, 5.5, -0.3));
  // líneas de seguridad en el piso
  for (const z of [-1.15, 0.95, -3.65]) sala.add(box(4.6, 0.004, 0.08, MAT.amarillo, 0.6, 0.002, z));
  // tablero eléctrico (CCM) y bandeja de cables
  const ccm = new THREE.Group();
  for (let i = 0; i < 4; i++) { ccm.add(box(0.8, 2.2, 0.6, MAT.tablero, 3.2 + i * 0.82, 1.1, -5.05)); ccm.add(box(0.05, 0.25, 0.02, MAT.gris, 3.5 + i * 0.82, 1.2, -4.74)); ccm.add(box(0.5, 0.3, 0.01, MAT.gris, 3.2 + i * 0.82, 1.8, -4.745)); }
  sala.add(ccm);
  sala.add(box(7.5, 0.08, 0.4, MAT.gris, 1.8, 4.2, -5.1));
  for (const x of [-1.5, 1.5, 4.5]) sala.add(box(0.05, 0.6, 0.05, MAT.gris, x, 4.5, -5.1));
  // colector de succión DN300 a lo largo de Z en x=-2.6 y de descarga sobre las bombas
  sala.add(cyl(0.165, 9.2, MAT.tuberia, 'z', -2.6, ALTURA_EJE, -0.7));
  sala.add(cyl(0.22, 0.04, MAT.tuberia, 'z', -2.6, ALTURA_EJE, 3.9, 32));
  for (const z of [-3.8, -1.2, 1.2, 3.3]) { sala.add(box(0.14, ALTURA_EJE - 0.16, 0.14, MAT.estructura, -2.6, (ALTURA_EJE - 0.16) / 2, z)); }
  sala.add(cyl(0.165, 9.2, MAT.tuberia, 'z', 0, 3.2 + 0.13, -0.7));
  sala.add(cyl(0.22, 0.04, MAT.tuberia, 'z', 0, 3.33, 3.9, 32));
  for (const z of [-3.6, -1.2, 1.2, 3.4]) { // colgadores desde la viga del puente grúa
    for (const x of [-0.25, 0.25]) sala.add(box(0.03, 5.3 - 3.16, 0.03, MAT.aceroOsc, x, (5.3 + 3.16) / 2, z));
    sala.add(box(0.6, 0.06, 0.06, MAT.estructura, 0, 3.13, z)); }
  // escalera de acceso y baranda a una plataforma lateral (contexto)
  const plat = new THREE.Group();
  plat.add(box(1.6, 0.06, 2.4, MAT.gris, 5.4, 1.8, 2.3));
  for (const [x, z] of [[4.65, 1.15], [6.15, 1.15], [4.65, 3.45], [6.15, 3.45]]) plat.add(box(0.08, 1.8, 0.08, MAT.amarillo, x, 0.9, z));
  for (const z of [1.15, 3.45]) { plat.add(box(1.6, 0.04, 0.04, MAT.amarillo, 5.4, 2.85, z)); plat.add(box(1.6, 0.04, 0.04, MAT.amarillo, 5.4, 2.35, z)); }
  for (const x of [4.65, 6.15]) for (let k = 0; k < 2; k++) plat.add(box(0.04, 1.05, 0.04, MAT.amarillo, x, 2.33, 1.75 + k * 1.2));
  plat.add(box(1.6, 0.04, 0.04, MAT.amarillo, 5.4, 2.85, 1.15));
  sala.add(plat);
  // estanque pequeño de cebado (contexto)
  sala.add(cyl(0.6, 1.8, MAT.gris, 'y', -4.8, 0.9, 2.8, 40));
  sala.add(cyl(0.62, 0.05, MAT.aceroOsc, 'y', -4.8, 1.82, 2.8, 40));

  // unidades PP-101 (servicio) y PP-102 (reserva)
  const u1 = construirUnidad('PP-101'); u1.u.position.set(0, 0, 0); root.add(u1.u);
  const u2 = construirUnidad('PP-102'); u2.u.position.set(0, 0, -2.4); root.add(u2.u);
  // tees de los colectores
  for (const z of [0, -2.4]) { root.add(cyl(0.11, 0.12, MAT.tuberia, 'x', -2.48, ALTURA_EJE, z)); }

  // estaciones de escáner y dianas de registro (paso 1 y 2)
  const escaneo = new THREE.Group(); escaneo.name = 'escaneo'; root.add(escaneo);
  const estaciones = [V(-1.4, 0, 1.3), V(2.9, 0, -1.6), V(2.6, 0, 3.6), V(-4.2, 0, -2.6)];
  for (const p of estaciones) {
    const t = new THREE.Group();
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; t.add(entre(V(Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35), V(0, 1.35, 0), 0.012, MAT.escaner, 8)); }
    t.add(cyl(0.06, 0.08, MAT.escaner, 'y', 0, 1.39, 0, 16));
    t.add(box(0.16, 0.22, 0.12, MAT.escanerCab, 0, 1.54, 0));
    t.add(cyl(0.045, 0.06, MAT.negro, 'z', 0, 1.58, 0.065, 16));
    t.position.copy(p); escaneo.add(t);
  }
  const dianas = [];
  for (const [x, y, z, ry] of [[-3, 2.4, -5.36, 0], [2, 2.6, -5.36, 0], [-6.36, 2.5, -2, Math.PI / 2], [-6.36, 2.3, 2.5, Math.PI / 2], [5.0, 2.0, 3.5, 0]]) {
    const d = new THREE.Group();
    d.add(box(0.3, 0.3, 0.01, MAT.blanco, 0, 0, 0));
    d.add(box(0.15, 0.15, 0.012, MAT.negro, -0.075, 0.075, 0)); d.add(box(0.15, 0.15, 0.012, MAT.negro, 0.075, -0.075, 0));
    d.position.set(x, y, z); d.rotation.y = ry; escaneo.add(d); dianas.push(d);
  }
  escaneo.visible = false;

  root.updateMatrixWorld(true);
  return { root, sala, u1, u2, escaneo, estaciones, dianas };
}
