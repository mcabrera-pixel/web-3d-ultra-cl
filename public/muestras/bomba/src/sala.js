// Sala de bombas genérica: piso, muros, dos grupos de bombeo (PP-101 en detalle y PP-102 de respaldo), cañerías de
// succión y descarga con sus válvulas, instrumentos y soportes. Motor, acoplamiento y base van como conjuntos
// aparte, fuera de la numeración del manual de la bomba.
import * as THREE from '../vendor/three.module.min.js';
import { TAU, rad, V, unir, revol, cilX, cilY, hexX, caja, anillo } from './geo.js';
import { crearBomba } from './bomba.js';

export const EJE_Y = 0.62;          // altura del eje sobre el piso: fundación 0,20 + base 0,14 + altura de eje 0,28
export const SEPARACION = 2.4;      // distancia entre los ejes de las dos bombas

export function crearSala(E) {
  const { mat } = E;
  const contexto = new THREE.Group(); contexto.name = 'contexto';
  const tags = [];      // { tag, clase, pos, sel }
  const conjuntos = []; // { id, obj }
  const M = (g, m, sel) => {
    const o = new THREE.Mesh(unir([g]), m); o.castShadow = true; o.receiveShadow = true;
    if (sel) o.userData.sel = sel; return o;
  };
  const marcar = (obj, sel) => { obj.traverse((h) => { h.userData.sel = sel; }); return obj; };
  const frustoX = (r0, r1, L, x0, seg = 48) => new THREE.CylinderGeometry(r1, r0, L, seg).rotateZ(-Math.PI / 2).translate(x0 + L / 2, 0, 0);
  const tramo = (a, b, r, seg = 28) => {
    const d = b.clone().sub(a), L = d.length();
    const g = new THREE.CylinderGeometry(r, r, L, seg);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()));
    return g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  };
  // par de bridas con sus pernos, centrado en «pos» y perpendicular a «dir»
  // lado: 0 = las dos bridas; -1 o +1 = solo la del lado indicado (la otra es la del equipo)
  const bridas = (pos, dir, rTubo, rBrida, n = 8, lado = 0) => {
    const g = [];
    if (lado <= 0) g.push(anillo(rTubo * 0.9, rBrida, -0.026, -0.002, 48));
    if (lado >= 0) g.push(anillo(rTubo * 0.9, rBrida, 0.002, 0.026, 48));
    for (let i = 0; i < n; i++) { const a = (i + 0.5) * TAU / n, r = (rTubo + rBrida) / 2 + 0.006; g.push(hexX(0.026, 0.07, -0.035).translate(0, r * Math.cos(a), r * Math.sin(a))); }
    const q = new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), dir.clone().normalize());
    for (const h of g) { h.applyQuaternion(q); h.translate(pos.x, pos.y, pos.z); }
    return g;
  };

  // ---------- válvulas e instrumentos (construidos sobre el eje X, con el bonete hacia +Y) ----------
  function compuerta(r, L) {
    const cuerpo = [
      revol([[-L / 2, r * 0.9], [-L / 2, r * 1.58], [-L / 2 + 0.024, r * 1.58], [-L / 2 + 0.024, r * 1.1], [-0.06, r * 1.42, { s: true }], [0.06, r * 1.42, { s: true }],
        [L / 2 - 0.024, r * 1.1], [L / 2 - 0.024, r * 1.58], [L / 2, r * 1.58], [L / 2, r * 0.9]], { seg: 40 }),
      cilY(r * 0.95, r * 2.0, 28).translate(0, r * 1.7, 0), cilY(r * 1.3, 0.03, 28).translate(0, r * 2.72, 0),
      caja(0.02, r * 1.9, 0.03, 0, r * 3.6, r * 0.55), caja(0.02, r * 1.9, 0.03, 0, r * 3.6, -r * 0.55), caja(0.03, 0.03, r * 1.4, 0, r * 4.55, 0),
    ];
    const vastago = [cilY(0.013, r * 2.4, 12).translate(0, r * 3.9, 0)];
    const volante = [new THREE.TorusGeometry(r * 1.55, 0.013, 10, 40).rotateX(Math.PI / 2).translate(0, r * 4.8, 0), cilY(0.03, 0.05, 16).translate(0, r * 4.8, 0)];
    for (let i = 0; i < 4; i++) volante.push(caja(r * 3.0, 0.012, 0.016, 0, r * 4.8, 0).rotateY((i * Math.PI) / 4));
    const g = new THREE.Group();
    g.add(M(cuerpo, mat.valvula), M(vastago, mat.aceroS), M(volante, mat.volante));
    return g;
  }
  function retencion(r, L) {
    const cuerpo = [
      revol([[-L / 2, r * 0.9], [-L / 2, r * 1.58], [-L / 2 + 0.024, r * 1.58], [-L / 2 + 0.024, r * 1.1], [-0.07, r * 1.55, { s: true }], [0.07, r * 1.55, { s: true }],
        [L / 2 - 0.024, r * 1.1], [L / 2 - 0.024, r * 1.58], [L / 2, r * 1.58], [L / 2, r * 0.9]], { seg: 40 }),
      cilY(r * 1.15, r * 1.3, 28).translate(-0.02, r * 1.6, 0), cilY(r * 1.45, 0.028, 28).translate(-0.02, r * 2.3, 0),
    ];
    for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6; cuerpo.push(new THREE.CylinderGeometry(0.014, 0.014, 0.016, 6).translate(-0.02 + r * 1.2 * Math.cos(a), r * 2.3 + 0.02, r * 1.2 * Math.sin(a))); }
    const g = new THREE.Group(); g.add(M(cuerpo, mat.valvula));
    return g;
  }
  function transmisor() { // toma con válvula de bloqueo y transmisor
    const g = new THREE.Group();
    g.add(M([cilY(0.012, 0.11, 12).translate(0, 0.055, 0), caja(0.04, 0.035, 0.04, 0, 0.115, 0), cilY(0.008, 0.05, 10).rotateZ(Math.PI / 2).translate(0.035, 0.115, 0)], mat.aceroS));
    g.add(M([cilX(0.045, 0.09, -0.045, 28).translate(0, 0.185, 0), cilY(0.02, 0.05, 16).translate(0, 0.145, 0)], mat.inst));
    g.add(M([cilX(0.036, 0.004, 0.045, 24).translate(0, 0.185, 0)], mat.blanco));
    return g;
  }

  // ---------- un grupo de bombeo: fundación, base, motor, acoplamiento y sus cañerías ----------
  function unidad(tag, z0, principal) {
    const u = new THREE.Group(); u.position.set(0, 0, z0); contexto.add(u);
    const selTag = { tipo: 'tag', id: tag };
    const sel = (id) => (principal ? { tipo: 'conjunto', id } : selTag);
    u.add(M(caja(2.1, 0.20, 1.06, 0.77, 0.10, 0), mat.hormigon2));

    // base (bancada de perfiles con placa)
    const pernosAnclaje = [];
    for (const x of [0.22, 0.77, 1.32]) for (const z of [0.43, -0.43]) pernosAnclaje.push(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 6).translate(x, 0.22, z), cilY(0.01, 0.05, 10).translate(x, 0.235, z));
    const base = new THREE.Group();
    base.add(M([caja(1.80, 0.012, 0.78, 0.77, 0.334, 0), caja(1.80, 0.128, 0.06, 0.77, 0.264, 0.36), caja(1.80, 0.128, 0.06, 0.77, 0.264, -0.36),
      caja(0.06, 0.128, 0.66, -0.10, 0.264, 0), caja(0.06, 0.128, 0.66, 1.64, 0.264, 0), caja(0.06, 0.128, 0.66, 0.45, 0.264, 0), caja(0.06, 0.128, 0.66, 1.0, 0.264, 0),
      caja(1.80, 0.01, 0.10, 0.77, 0.205, 0.42), caja(1.80, 0.01, 0.10, 0.77, 0.205, -0.42)], mat.base), M(pernosAnclaje, mat.aceroS));
    u.add(marcar(base, sel('base')));

    // motor eléctrico (carcasa 280M, eje a 280 mm)
    const motor = new THREE.Group(); motor.position.y = EJE_Y;
    const aletas = [];
    for (let i = 0; i < 48; i++) {
      const a = (i * TAU) / 48, g = (a * 180) / Math.PI;
      if (g < 24 || g > 336 || (g > 138 && g < 222)) continue;
      aletas.push(caja(0.57, 0.026, 0.007, 1.155, 0.262, 0).rotateX(a));
    }
    motor.add(M([cilX(0.25, 0.59, 0.86, 48), frustoX(0.15, 0.256, 0.06, 0.80), cilX(0.258, 0.03, 1.45, 48), aletas,
      caja(0.26, 0.15, 0.24, 1.08, 0.30, 0), caja(0.28, 0.02, 0.26, 1.08, 0.385, 0),
      caja(0.50, 0.03, 0.10, 1.155, -0.265, 0.2285), caja(0.50, 0.03, 0.10, 1.155, -0.265, -0.2285),
      caja(0.42, 0.115, 0.04, 1.155, -0.2075, 0.20), caja(0.42, 0.115, 0.04, 1.155, -0.2075, -0.20),
      new THREE.TorusGeometry(0.028, 0.008, 8, 20).translate(0.93, 0.27, 0), new THREE.TorusGeometry(0.028, 0.008, 8, 20).translate(1.38, 0.27, 0)], mat.motor));
    motor.add(M([cilX(0.268, 0.215, 1.48, 48), frustoX(0.268, 0.225, 0.035, 1.695), cilY(0.022, 0.05, 12).rotateX(Math.PI / 2).translate(1.02, 0.30, -0.14), cilY(0.022, 0.05, 12).rotateX(Math.PI / 2).translate(1.14, 0.30, -0.14)], mat.motor2));
    motor.add(M([cilX(0.21, 0.002, 1.7302, 40)], mat.oscuro), M([cilX(0.0375, 0.14, 0.67, 24)], mat.aceroS), M([caja(0.12, 0.07, 0.002, 1.25, 0.05, 0.264)], mat.blanco));
    u.add(marcar(motor, sel('motor')));

    // acoplamiento flexible con pieza de separación de 140 mm, y su defensa
    const acop = new THREE.Group(); acop.position.y = EJE_Y;
    const pernosA = [];
    for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6; for (const x of [0.504, 0.556, 0.636, 0.688]) pernosA.push(hexX(0.016, 0.008, x).translate(0, 0.075 * Math.cos(a), 0.075 * Math.sin(a))); }
    acop.add(M([
      revol([[0.452, 0.021], [0.452, 0.048], [0.512, 0.048], [0.512, 0.095], [0.534, 0.095], [0.534, 0.021]], { cerrar: true, seg: 48 }),
      revol([[0.541, 0.03], [0.541, 0.095], [0.556, 0.095], [0.556, 0.05], [0.644, 0.05], [0.644, 0.095], [0.659, 0.095], [0.659, 0.03]], { cerrar: true, seg: 48 }),
      revol([[0.666, 0.0375], [0.666, 0.095], [0.688, 0.095], [0.688, 0.06], [0.765, 0.06], [0.765, 0.0375]], { cerrar: true, seg: 48 }), pernosA], mat.aceroS));
    acop.add(M([anillo(0.055, 0.09, 0.534, 0.541, 40), anillo(0.055, 0.09, 0.659, 0.666, 40)], mat.elastico));
    const defensa = M([revol([[0.455, 0.150], [0.455, 0.153], [0.80, 0.153], [0.80, 0.150]], { cerrar: true, tapas: true, a0: rad(-92), a1: rad(92), seg: 32 }),
      caja(0.345, 0.275, 0.003, 0.6275, -0.142, 0.1515), caja(0.345, 0.275, 0.003, 0.6275, -0.142, -0.1515)], mat.defensa);
    defensa.castShadow = false; acop.add(defensa);
    u.add(marcar(acop, sel('acoplamiento')));

    // succión: carrete DN 200 con válvula de compuerta, hasta el colector
    const Y = EJE_Y, rs = 0.1095, rd = 0.084;
    const can = [tramo(V(-0.188, Y, 0), V(-0.585, Y, 0), rs), tramo(V(-0.905, Y, 0), V(-2.2, Y, 0), rs), bridas(V(-0.162, Y, 0), V(1, 0, 0), rs, 0.17, 8, -1), bridas(V(-0.57, Y, 0), V(1, 0, 0), rs, 0.17), bridas(V(-0.92, Y, 0), V(1, 0, 0), rs, 0.17)];
    // descarga: carrete DN 150, retención, compuerta y subida al colector
    can.push(tramo(V(0, Y + 0.428, 0), V(0, Y + 0.66, 0), rd), tramo(V(0, Y + 0.98, 0), V(0, Y + 1.17, 0), rd), tramo(V(0, Y + 1.47, 0), V(0, 2.75, 0), rd),
      bridas(V(0, Y + 0.402, 0), V(0, 1, 0), rd, 0.1425, 8, 1), bridas(V(0, Y + 0.655, 0), V(0, 1, 0), rd, 0.1425), bridas(V(0, Y + 0.985, 0), V(0, 1, 0), rd, 0.1425),
      bridas(V(0, Y + 1.165, 0), V(0, 1, 0), rd, 0.1425), bridas(V(0, Y + 1.475, 0), V(0, 1, 0), rd, 0.1425));
    u.add(M(can, mat.caneria));
    u.add(M([anillo(rs + 0.001, rs + 0.003, -1.55, -1.43, 32).translate(0, Y, 0), cilY(rd + 0.002, 0.12, 28).translate(0, 2.35, 0)], mat.banda));
    u.add(M([caja(0.10, Y - rs, 0.10, -1.3, (Y - rs) / 2, 0), caja(0.16, 0.02, 0.26, -1.3, Y - rs - 0.01, 0)], mat.estructura));

    const hv1 = compuerta(rs, 0.30); hv1.position.set(-0.745, Y, 0); u.add(marcar(hv1, principal ? { tipo: 'valvula', id: 'HV-101' } : selTag));
    const cv = retencion(rd, 0.31); cv.rotation.z = Math.PI / 2; cv.position.set(0, Y + 0.82, 0); u.add(marcar(cv, principal ? { tipo: 'valvula', id: 'CV-101' } : selTag));
    const hv2 = compuerta(rd, 0.29); hv2.rotation.z = Math.PI / 2; hv2.position.set(0, Y + 1.32, 0); u.add(marcar(hv2, principal ? { tipo: 'valvula', id: 'HV-102' } : selTag));
    const pit1 = transmisor(); pit1.position.set(-0.37, Y + rs - 0.004, 0); u.add(marcar(pit1, principal ? { tipo: 'instrumento', id: 'PIT-101' } : selTag));
    const pit2 = transmisor(); pit2.rotation.x = Math.PI / 2; pit2.position.set(0, Y + 0.53, rd - 0.004); u.add(marcar(pit2, principal ? { tipo: 'instrumento', id: 'PIT-102' } : selTag));

    // botonera local
    u.add(M([caja(0.05, 1.15, 0.05, 2.0, 0.575, 0.62), caja(0.2, 0.02, 0.2, 2.0, 0.01, 0.62)], mat.estructura), M([caja(0.17, 0.26, 0.10, 2.0, 1.22, 0.62)], mat.oscuro),
      M([cilY(0.016, 0.012, 14).rotateX(Math.PI / 2).translate(2.0, 1.27, 0.675)], mat.banda), M([cilY(0.016, 0.012, 14).rotateX(Math.PI / 2).translate(2.0, 1.19, 0.675)], mat.volante));
    // demarcación de seguridad en el piso
    u.add(M([caja(2.7, 0.004, 0.05, 0.77, 0.002, 0.86), caja(2.7, 0.004, 0.05, 0.77, 0.002, -0.86), caja(0.05, 0.004, 1.72, -0.58, 0.002, 0), caja(0.05, 0.004, 1.72, 2.12, 0.002, 0)], mat.amarillo));

    if (principal) {
      conjuntos.push({ id: 'base', obj: base }, { id: 'motor', obj: motor }, { id: 'acoplamiento', obj: acop });
      // sensores sobre el soporte de cojinetes y el motor
      const sens = (x, y, z, id) => { const o = M([cilY(0.011, 0.034, 12).translate(x, y + 0.017, z), cilY(0.004, 0.03, 8).rotateZ(Math.PI / 2).translate(x + 0.02, y + 0.03, z)], mat.inst, { tipo: 'instrumento', id }); o.position.y = Y; u.add(o); };
      sens(0.405, 0.086, 0.028, 'VT-101A'); sens(0.235, 0.086, 0.028, 'VT-101B'); sens(0.385, 0.080, -0.032, 'TT-101A'); sens(0.250, 0.080, -0.032, 'TT-101B');
      tags.push(
        { tag, clase: 'equipo', pos: V(0.72, Y + 0.72, z0), sel: { tipo: 'tag', id: tag } },
        { tag: 'HV-101', clase: 'valv', pos: V(-0.745, Y + 0.60, z0), sel: { tipo: 'valvula', id: 'HV-101' } },
        { tag: 'CV-101', clase: 'valv', pos: V(-0.26, Y + 0.84, z0), sel: { tipo: 'valvula', id: 'CV-101' } },
        { tag: 'HV-102', clase: 'valv', pos: V(-0.50, Y + 1.36, z0), sel: { tipo: 'valvula', id: 'HV-102' } },
        { tag: 'PIT-101', clase: 'inst', pos: V(-0.37, Y + 0.36, z0), sel: { tipo: 'instrumento', id: 'PIT-101' } },
        { tag: 'PIT-102', clase: 'inst', pos: V(0.0, Y + 0.66, z0 + 0.12), sel: { tipo: 'instrumento', id: 'PIT-102' } },
        { tag: 'VT-101A', clase: 'inst', pos: V(0.55, Y + 0.34, z0 + 0.03), sel: { tipo: 'instrumento', id: 'VT-101A' } },
        { tag: 'VT-101B', clase: 'inst', pos: V(0.13, Y + 0.25, z0 + 0.03), sel: { tipo: 'instrumento', id: 'VT-101B' } },
        { tag: 'TT-101A', clase: 'inst', pos: V(0.50, Y - 0.20, z0 + 0.34), sel: { tipo: 'instrumento', id: 'TT-101A' } },
        { tag: 'TT-101B', clase: 'inst', pos: V(0.16, Y - 0.20, z0 + 0.34), sel: { tipo: 'instrumento', id: 'TT-101B' } },
        { tag: 'IT-101', clase: 'inst', pos: V(1.08, Y + 0.47, z0), sel: { tipo: 'instrumento', id: 'IT-101' } },
      );
    } else {
      tags.push({ tag, clase: 'equipo respaldo', pos: V(0.72, Y + 0.72, z0), sel: selTag });
    }
    return u;
  }

  // ---------- la sala ----------
  const X0 = -4.2, X1 = 5.8, Z0 = -5.4, Z1 = 2.8;
  contexto.add(M(caja(X1 - X0, 0.12, Z1 - Z0, (X0 + X1) / 2, -0.06, (Z0 + Z1) / 2), mat.hormigon));
  contexto.add(M([caja(X1 - X0, 4.3, 0.2, (X0 + X1) / 2, 2.15, Z0 - 0.1), caja(0.2, 4.3, Z1 - Z0, X0 - 0.1, 2.15, (Z0 + Z1) / 2)], mat.muro));
  { // juntas del piso y zócalo
    const pts = [];
    for (let x = X0 + 2; x < X1; x += 2) pts.push(x, 0.003, Z0, x, 0.003, Z1);
    for (let z = Z0 + 2; z < Z1; z += 2) pts.push(X0, 0.003, z, X1, 0.003, z);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x74787c })); l.userData.sinNube = true; contexto.add(l);
    contexto.add(M([caja(X1 - X0, 0.12, 0.02, (X0 + X1) / 2, 0.06, Z0 + 0.01), caja(0.02, 0.12, Z1 - Z0, X0 + 0.01, 0.06, (Z0 + Z1) / 2)], mat.hormigon2));
    contexto.add(M([caja(X1 - X0 - 1, 0.012, 0.28, (X0 + X1) / 2, 0.004, 1.75)], mat.oscuro)); // canaleta con rejilla
  }
  const u1 = unidad('PP-101', 0, true);
  const u2 = unidad('PP-102', -SEPARACION, false);

  // colectores, soportes y caudalímetro
  const Y = EJE_Y, rcs = 0.162, rcd = 0.1365;
  contexto.add(M([tramo(V(-2.2, Y, Z0), V(-2.2, Y, 0.95), rcs, 36), bridas(V(-2.2, Y, 0.95), V(0, 0, 1), rcs, 0.225, 12), cilY(0.225, 0.03, 36).rotateX(Math.PI / 2).translate(-2.2, Y, 0.99),
    tramo(V(0, 2.75, Z0), V(0, 2.75, -3.95), rcd, 36), tramo(V(0, 2.75, -3.45), V(0, 2.75, 0.8), rcd, 36), bridas(V(0, 2.75, 0.8), V(0, 0, 1), rcd, 0.2, 12), cilY(0.2, 0.03, 36).rotateX(Math.PI / 2).translate(0, 2.75, 0.84),
    bridas(V(0, 2.75, -3.45), V(0, 0, 1), rcd, 0.2, 12), bridas(V(0, 2.75, -3.95), V(0, 0, 1), rcd, 0.2, 12)], mat.caneria));
  contexto.add(M([cilY(rcs + 0.002, 0.14, 36).rotateX(Math.PI / 2).translate(-2.2, Y, -0.6), cilY(rcd + 0.002, 0.14, 36).rotateX(Math.PI / 2).translate(0, 2.75, -0.7)], mat.banda));
  const fit = new THREE.Group();
  fit.add(M([cilY(0.2, 0.36, 36).rotateX(Math.PI / 2).translate(0, 2.75, -3.7)], mat.inst), M([caja(0.16, 0.2, 0.14, 0, 3.05, -3.7), cilY(0.03, 0.08, 12).translate(0, 2.96, -3.7)], mat.oscuro), M([caja(0.1, 0.07, 0.004, 0.0, 3.07, -3.628)], mat.blanco));
  contexto.add(marcar(fit, { tipo: 'instrumento', id: 'FIT-101' }));
  tags.push({ tag: 'FIT-101', clase: 'inst', pos: V(0, 3.28, -3.7), sel: { tipo: 'instrumento', id: 'FIT-101' } });
  const sop = [];
  for (const z of [0.45, -1.2, -3.6]) sop.push(caja(0.34, Y - rcs, 0.3, -2.2, (Y - rcs) / 2, z));
  contexto.add(M(sop, mat.hormigon2));
  const port = [];
  for (const z of [-1.2, -4.6]) port.push(caja(0.1, 2.55, 0.1, -0.75, 1.275, z), caja(0.1, 2.55, 0.1, 0.75, 1.275, z), caja(1.7, 0.12, 0.1, 0, 2.553, z), caja(0.3, 0.012, 0.3, -0.75, 0.006, z), caja(0.3, 0.012, 0.3, 0.75, 0.006, z));
  contexto.add(M(port, mat.estructura));
  // bandeja de cables en el muro del fondo
  contexto.add(M([caja(X1 - X0 - 0.6, 0.06, 0.3, (X0 + X1) / 2, 3.45, Z0 + 0.2), caja(X1 - X0 - 0.6, 0.1, 0.012, (X0 + X1) / 2, 3.5, Z0 + 0.35)], mat.aceroS));

  // ---------- la bomba PP-101 en detalle ----------
  const bomba = crearBomba(mat);
  bomba.grupo.position.set(0, EJE_Y, 0);
  for (const i of bomba.inst) if (i.interno) i.obj.userData.sinNube = true; // el escáner solo ve la bomba por fuera
  // PP-102: misma bomba, sin detalle de piezas
  const respaldo = crearBomba(mat);
  respaldo.grupo.position.set(0, EJE_Y, -SEPARACION);
  respaldo.grupo.traverse((h) => { if (h.userData.sel) h.userData.sel = { tipo: 'tag', id: 'PP-102' }; });
  for (const i of respaldo.inst) if (i.interno) i.obj.userData.sinNube = true;
  contexto.add(respaldo.grupo);

  // ---------- estaciones del escáner ----------
  const estaciones = [V(-1.9, 1.65, 1.95), V(2.9, 1.65, 1.85), V(2.6, 1.65, -1.25), V(-1.25, 1.65, -1.25)];
  const escaneres = new THREE.Group(); escaneres.visible = false; escaneres.userData.sinNube = true;
  estaciones.forEach((p, i) => {
    const g = new THREE.Group(); g.position.set(p.x, 0, p.z);
    const patas = [];
    for (let k = 0; k < 3; k++) { const a = (k * TAU) / 3; patas.push(tramo(V(0, 1.42, 0), V(0.42 * Math.cos(a), 0, 0.42 * Math.sin(a)), 0.014, 8)); }
    g.add(M([patas, cilY(0.03, 0.1, 12).translate(0, 1.45, 0)], mat.oscuro), M([caja(0.11, 0.27, 0.2, 0, 1.64, 0)], mat.blanco), M([cilY(0.045, 0.115, 16).rotateZ(Math.PI / 2).translate(0, 1.66, 0)], mat.volante));
    g.traverse((h) => { h.userData.sinNube = true; h.castShadow = false; });
    escaneres.add(g);
    tags.push({ tag: `E${i + 1}`, clase: 'estacion', pos: V(p.x, 1.95, p.z), sel: null });
  });

  return { contexto, bomba, respaldo, tags, conjuntos, estaciones, escaneres, limites: { X0, X1, Z0, Z1 } };
}
