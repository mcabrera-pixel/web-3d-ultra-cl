// Bomba centrífuga horizontal de una etapa, modelada desde el corte y la representación de conjunto del manual
// (cierre mecánico normativo con cubierta de presión encajada, Tabla 28). Cada número de pieza es un objeto propio.
// Unidades en metros. Eje de giro: X. x = 0 es el plano del eje de la boca de descarga; la boca de aspiración
// queda en x = -0,160 y el extremo del eje en x = +0,530, como en el plano de instalación del tamaño 150-315.
import * as THREE from '../vendor/three.module.min.js';
import { TAU, rad, V, lerp, interp, Malla, unir, tinte, revol, tubo, cilX, cilY, hexX, toroX, caja, anillo, resorte, perno, chaveta, orientar, prisma } from './geo.js';

const pt = (x, r, a) => [x, r * Math.cos(a), r * Math.sin(a)];
// El despiece va en dos filas paralelas al eje, como en la representación de conjunto del manual: arriba la parte
// hidráulica y el cierre del eje; abajo (fila B) el eje, los cojinetes y el soporte.
const FILA_B = new Set(['411', '360.1', '932', '321', '210', '940.2', '940.3', '330', '8B', '81-92', '901.3', '183', '901.2', '901.1', '920.5']);
const DESPLAZA_B = [-1.85, 0, 0.78];
const S = { s: true };

export function crearBomba(mat) {
  const grupo = new THREE.Group(); grupo.name = 'bomba';
  const inst = [];
  const malla = (geoms, m) => { const o = new THREE.Mesh(unir([geoms]), m); o.castShadow = true; o.receiveShadow = true; return o; };
  const conj = (...hijos) => { const g = new THREE.Group(); g.add(...hijos); return g; };

  // numero: número de pieza del manual. o.lado: sufijo de instancia. o.detalle: dónde va. o.interno: no se ve desde afuera.
  function pieza(numero, obj, ex, o = {}) {
    const id = o.lado ? `${numero}-${o.lado}` : numero;
    if (FILA_B.has(numero) || (numero === '930.3' && o.lado !== 'R')) ex = [ex[0] + DESPLAZA_B[0], ex[1] || 0, (ex[2] || 0) + DESPLAZA_B[2]];
    obj.traverse((h) => { h.userData.sel = { tipo: 'pieza', id, numero }; });
    grupo.add(obj);
    inst.push({ id, numero, obj, ex: V(ex[0], ex[1] || 0, ex[2] || 0), detalle: o.detalle || '', interno: !!o.interno, sub: !!o.sub });
  }

  // ---------- 102 Carcasa espiral ----------
  {
    const G = 0.085, aT = rad(10), lim = rad(325);
    // Crecimiento de la voluta: nace en la lengüeta (a = 10°) y crece en el sentido de giro hasta la garganta (a = 45°).
    const g = (a) => {
      const psi = (((aT - a) % TAU) + TAU) % TAU;
      if (psi <= lim) return (G * psi) / lim;
      const u = (psi - lim) / (TAU - lim); return G * (1 - u * u * (3 - 2 * u));
    };
    const ext = revol([
      [-0.160, 0.100], [-0.160, 0.170], [-0.136, 0.170], [-0.136, 0.124], [-0.100, 0.124, S], [-0.082, 0.140, S],
      [-0.070, 0.165, { s: true, k: 0.3 }], [-0.062, 0.186, { s: true, k: 0.7 }], [-0.040, 0.199, { s: true, k: 1 }], [0, 0.204, { s: true, k: 1 }],
      [0.040, 0.199, { s: true, k: 1 }], [0.060, 0.188, { k: 0.7 }], [0.062, 0.228], [0.084, 0.228], [0.084, 0.174],
    ], { seg: 120, g });
    const int = tinte(revol([
      [0.084, 0.174], [0.050, 0.174], [0.048, 0.178, { k: 0.7 }], [0.034, 0.188, { s: true, k: 1 }], [0, 0.192, { s: true, k: 1 }],
      [-0.034, 0.188, { s: true, k: 1 }], [-0.050, 0.176, { s: true, k: 0.7 }], [-0.054, 0.150], [-0.054, 0.127], [-0.078, 0.127],
      [-0.078, 0.100], [-0.160, 0.100],
    ], { seg: 120, g }), 0.5);
    // Tubuladura de impulsión: sale de la garganta (lado +Z) y vuelve al eje vertical de la bomba.
    const cam = new THREE.CatmullRomCurve3([V(0, 0.115, 0.178), V(0, 0.185, 0.138), V(0, 0.265, 0.072), V(0, 0.33, 0.02), V(0, 0.378, 0)]);
    const cuello = tubo(cam, (t) => 0.083 + 0.005 * t, { seg: 40, rad: 36, pared: 0.013 });
    const tg = cam.getTangent(0.35), pc = cam.getPoint(0.35);
    const fondo = tinte(new THREE.CircleGeometry(0.073, 28).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), tg)).translate(pc.x, pc.y, pc.z), 0.12);
    const bridaD = revol([[0.376, 0.075], [0.376, 0.1425], [0.400, 0.1425], [0.400, 0.075]], { cerrar: true, seg: 72 }).rotateZ(Math.PI / 2);
    const agujeros = [];
    for (let i = 0; i < 8; i++) {
      const a = rad(22.5 + i * 45);
      agujeros.push(tinte(cilX(0.011, 0.0246, -0.1603, 14).translate(0, 0.1475 * Math.cos(a), 0.1475 * Math.sin(a)), 0.06));
      agujeros.push(tinte(cilY(0.011, 0.0246, 14).translate(0.120 * Math.cos(a), 0.388, 0.120 * Math.sin(a)), 0.06));
      agujeros.push(tinte(cilX(0.009, 0.0226, 0.0617, 12).translate(0, 0.205 * Math.cos(a), 0.205 * Math.sin(a)), 0.06));
    }
    const pies = [
      caja(0.11, 0.10, 0.075, 0, -0.225, 0.185), caja(0.11, 0.10, 0.075, 0, -0.225, -0.185),
      caja(0.14, 0.022, 0.11, 0, -0.269, 0.19), caja(0.14, 0.022, 0.11, 0, -0.269, -0.19), caja(0.025, 0.05, 0.37, 0, -0.25, 0),
      tinte(cilY(0.009, 0.0226, 12).translate(0.045, -0.269, 0.205), 0.06), tinte(cilY(0.009, 0.0226, 12).translate(0.045, -0.269, -0.205), 0.06),
      tinte(cilY(0.009, 0.0226, 12).translate(-0.045, -0.269, 0.205), 0.06), tinte(cilY(0.009, 0.0226, 12).translate(-0.045, -0.269, -0.205), 0.06),
    ];
    pieza('102', malla([ext, int, cuello, fondo, bridaD, agujeros, pies], mat.pintura), [0, 0, 0]);
  }

  // ---------- conexiones 1M, 6D, 6B, 8B y tornillos de cierre 903.1 ----------
  function conexion(numero, pos, dir, o) {
    const boss = [cilX(0.018, 0.016, -0.006, 20), tinte(cilX(0.0085, 0.0005, 0.0100, 16), 0.05)];
    orientar(boss, dir, pos);
    const sal = dir.clone().multiplyScalar(0.035);
    if (o.tapon === 'propio') { // 8B: taladrada y cerrada, sin número propio para el tapón en esta representación
      const tap = [cilX(0.0125, 0.003, 0.0100, 16), hexX(0.019, 0.008, 0.0130)]; orientar(tap, dir, pos);
      pieza(numero, conj(malla(boss, mat.pintura), malla(tap, mat.zinc)), [o.dx + sal.x, sal.y, sal.z], { detalle: o.detalle });
      return;
    }
    pieza(numero, malla(boss, mat.pintura), [o.dx, 0, 0], { detalle: o.detalle });
    const tap = [cilX(0.0095, 0.012, -0.002, 14), cilX(0.0135, 0.003, 0.0100, 18), hexX(0.021, 0.009, 0.0130)];
    orientar(tap, dir, pos);
    const lejos = dir.clone().multiplyScalar(0.11);
    pieza('903.1', malla(tap, mat.zinc), [o.dx + lejos.x, lejos.y, lejos.z], { lado: numero, detalle: `en la conexión ${numero}` });
  }
  conexion('1M', V(0, 0.335, -0.066), V(0, 0, -1), { dx: 0, detalle: 'en la tubuladura de impulsión' });
  conexion('6D', V(-0.084, 0.330, 0.02), V(-1, 0, 0), { dx: 0, detalle: 'en la tubuladura de impulsión' });
  conexion('6B', V(0, -0.262, 0), V(0, -1, 0), { dx: 0, detalle: 'en el punto bajo de la carcasa' });

  // ---------- 502.1 y 502.2 Anillo partido ----------
  pieza('502.1', malla(anillo(0.1125, 0.1268, -0.078, -0.056, 72), mat.fundicion), [0.367, 0, 0], { detalle: 'lado de aspiración, en la carcasa', interno: true });
  pieza('502.2', malla(anillo(0.1125, 0.1268, 0.030, 0.052, 72), mat.fundicion), [0.749, 0, 0], { detalle: 'lado de presión, en la cubierta', interno: true });

  // ---------- 920.1, 930 y 550 en la punta del eje ----------
  pieza('920.1', malla([hexX(0.036, 0.022, -0.074), tinte(cilX(0.0122, 0.0224, -0.0742, 16), 0.2)], mat.zinc), [0.463, 0, 0], { detalle: 'tuerca del rodete', interno: true });
  pieza('930.3', malla([anillo(0.0125, 0.0215, -0.052, -0.0495, 32), caja(0.0025, 0.006, 0.008, -0.0507, 0.0235, 0)], mat.zinc), [0.50, 0, 0],
    { lado: 'R', detalle: 'seguro de la tuerca del rodete (en la ilustración figura como 930)', interno: true });
  pieza('550', malla(anillo(0.0125, 0.0245, -0.0495, -0.045, 32), mat.acero), [0.537, 0, 0], { detalle: 'bajo la tuerca del rodete', interno: true });

  // ---------- 230 Rodete (radial cerrado, álabes curvados hacia atrás) ----------
  {
    const delantero = revol([
      [-0.078, 0.098], [-0.078, 0.112], [-0.050, 0.112], [-0.040, 0.125, S], [-0.031, 0.145, S], [-0.028, 0.157],
      [-0.022, 0.157], [-0.025, 0.145, S], [-0.034, 0.122, S], [-0.046, 0.105, S], [-0.060, 0.098, S],
    ], { cerrar: true, seg: 96 });
    const trasero = revol([
      [-0.045, 0.019], [-0.045, 0.030], [-0.020, 0.036, S], [0.005, 0.050, S], [0.018, 0.075, S], [0.022, 0.110, S], [0.022, 0.157],
      [0.030, 0.157], [0.030, 0.112], [0.052, 0.112], [0.052, 0.100], [0.032, 0.100], [0.032, 0.060], [0.040, 0.045], [0.040, 0.019],
    ], { cerrar: true, seg: 96 });
    const M = new Malla(), n = 6, beta = rad(24), r1 = 0.062, r2 = 0.1565, esp = 0.006, ns = 16;
    const xb = (r) => interp(r, [[0.05, 0.006], [0.075, 0.019], [0.11, 0.023], [0.157, 0.023]]);
    const xf = (r) => (r < 0.098 ? lerp(-0.012, -0.058, (r - r1) / (0.098 - r1))
      : interp(r, [[0.098, -0.059], [0.105, -0.047], [0.122, -0.035], [0.145, -0.026], [0.157, -0.023]]));
    for (let k = 0; k < n; k++) {
      const t0 = (k * TAU) / n, est = [];
      for (let s = 0; s <= ns; s++) {
        const r = lerp(r1, r2, s / ns), tc = t0 + Math.log(r / r1) / Math.tan(beta), dt = esp / (2 * r);
        est.push({ tc, A: pt(xf(r), r, tc - dt), B: pt(xb(r), r, tc - dt), C: pt(xf(r), r, tc + dt), D: pt(xb(r), r, tc + dt), m: pt(0, r, tc) });
      }
      for (let s = 0; s <= ns; s++) {
        const a = est[Math.max(0, s - 1)].m, b = est[Math.min(ns, s + 1)].m, e = est[s];
        const ty = b[1] - a[1], tz = b[2] - a[2], L = Math.hypot(ty, tz);
        let ny = -tz / L, nz = ty / L;
        if (ny * (e.A[1] - e.C[1]) + nz * (e.A[2] - e.C[2]) < 0) { ny = -ny; nz = -nz; }
        e.n = [0, ny, nz]; e.nn = [0, -ny, -nz]; e.t = [0, ty / L, tz / L];
      }
      for (let s = 0; s < ns; s++) {
        const p = est[s], q = est[s + 1];
        M.quad(p.A, q.A, q.B, p.B, p.n, q.n, q.n, p.n);
        M.quad(p.C, q.C, q.D, p.D, p.nn, q.nn, q.nn, p.nn);
        M.quad(p.A, q.A, q.C, p.C, [-1, 0, 0]);
      }
      const u = est[ns]; M.quad(u.A, u.B, u.D, u.C, [0, Math.cos(u.tc), Math.sin(u.tc)]);
      const i0 = est[0]; M.quad(i0.A, i0.B, i0.D, i0.C, [0, -i0.t[1], -i0.t[2]]);
    }
    pieza('230', malla([delantero, trasero, M.geo()], mat.rodete), [0.638, 0, 0], { interno: true });
  }

  // ---------- 433 Cierre mecánico (un solo número, varios elementos) ----------
  {
    const sub = (geo, m, exx) => { const o = malla(geo, m); o.userData.exx = exx; return o; };
    pieza('433', conj(
      sub(anillo(0.0278, 0.039, 0.044, 0.047, 40), mat.inox, -0.050),
      sub(resorte(0.0335, 0.0022, 0.0475, 0.0675, 5), mat.inox, -0.034),
      sub(anillo(0.0278, 0.0405, 0.068, 0.086, 40), mat.inox, -0.012),
      sub(toroX(0.0345, 0.0026, 0.0872), mat.goma, 0.004),
      sub(revol([[0.0885, 0.030], [0.0885, 0.039], [0.096, 0.037], [0.096, 0.030]], { cerrar: true, seg: 40 }), mat.carbon, 0.018),
      sub(anillo(0.0305, 0.0385, 0.096, 0.108, 40), mat.ceramica, 0.036),
      sub(toroX(0.0388, 0.0021, 0.1062), mat.goma, 0.050),
    ), [0.842, 0, 0], { interno: true, sub: true });
  }

  // ---------- 523 casquillo, 400.3 y 400.1 juntas planas, 476 soporte del anillo estacionario, 412 junta tórica ----------
  pieza('523', malla(anillo(0.0225, 0.0275, 0.040, 0.132, 48), mat.inox), [1.014, 0, 0], { interno: true });
  pieza('400.3', malla(anillo(0.0226, 0.0274, 0.132, 0.1335, 40), mat.junta), [1.057, 0, 0], { detalle: 'entre el casquillo protector y el resalte del eje', interno: true });
  pieza('400.1', malla(anillo(0.176, 0.198, 0.084, 0.086, 96), mat.junta), [1.185, 0, 0], { detalle: 'entre la carcasa espiral y la cubierta de presión', interno: true });
  pieza('476', malla(revol([[0.098, 0.0387], [0.098, 0.0445], [0.124, 0.0445], [0.124, 0.031], [0.118, 0.031], [0.118, 0.0387]], { cerrar: true, seg: 48 }), mat.inox),
    [1.249, 0, 0], { interno: true });
  pieza('412', malla(toroX(0.0457, 0.0022, 0.111), mat.goma), [1.299, 0, 0], { detalle: 'sobre el soporte del anillo estacionario', interno: true });

  // ---------- 163.2 Cubierta de presión (encajada entre carcasa y soporte) ----------
  {
    const cub = revol([
      [0.056, 0.045], [0.056, 0.127], [0.034, 0.127], [0.034, 0.137], [0.056, 0.137], [0.056, 0.1735], [0.086, 0.1735], [0.086, 0.228],
      [0.094, 0.228], [0.094, 0.150], [0.078, 0.080], [0.078, 0.062], [0.130, 0.062], [0.130, 0.031], [0.125, 0.031], [0.125, 0.045],
    ], { cerrar: true, seg: 96 });
    const ag = [];
    for (let i = 0; i < 8; i++) { const a = rad(22.5 + i * 45); ag.push(tinte(cilX(0.009, 0.0086, 0.0857, 12).translate(0, 0.205 * Math.cos(a), 0.205 * Math.sin(a)), 0.06)); }
    pieza('163.2', malla([cub, ag], mat.pintura2), [1.456, 0, 0]);
  }

  // ---------- rodamientos y su cierre, a cada lado del soporte ----------
  function rodamiento(x0, tapaLado) {
    const B = 0.029, x1 = x0 + B, xc = x0 + B / 2, bolas = [];
    for (let i = 0; i < 9; i++) { const a = (i * TAU) / 9; bolas.push(new THREE.SphereGeometry(0.0105, 16, 12).translate(xc, 0.0439 * Math.cos(a), 0.0439 * Math.sin(a))); }
    const xt = tapaLado < 0 ? x0 + 0.0015 : x1 - 0.0035;
    return conj(
      malla([anillo(0.0275, 0.0370, x0, x1, 48), anillo(0.0508, 0.0600, x0, x1, 64), bolas], mat.acero),
      malla(anillo(0.0405, 0.0473, xc - 0.0045, xc + 0.0045, 48), mat.laton),
      malla(anillo(0.0372, 0.0506, xt, xt + 0.002, 48), mat.zinc),
    );
  }
  function seeger(x0) { // anillo de seguridad interior, con abertura y orejas
    const g = [revol([[x0, 0.0535], [x0, 0.0612], [x0 + 0.003, 0.0612], [x0 + 0.003, 0.0535]], { cerrar: true, tapas: true, a0: rad(196), a1: rad(524), seg: 56 })];
    for (const a of [rad(193), rad(167)]) g.push(anillo(0.0022, 0.0062, x0, x0 + 0.003, 16).translate(0, 0.0525 * Math.cos(a), 0.0525 * Math.sin(a)));
    return g;
  }
  const tapaCoj = (x0, sg) => revol(sg > 0
    ? [[x0, 0.031], [x0, 0.0595], [x0 + 0.010, 0.0595], [x0 + 0.010, 0.050], [x0 + 0.005, 0.046], [x0 + 0.005, 0.031]]
    : [[x0, 0.031], [x0, 0.046], [x0 - 0.005, 0.050], [x0 - 0.005, 0.0595], [x0 + 0.005, 0.0595], [x0 + 0.005, 0.031]], { cerrar: true, seg: 64 });
  const vring = (x0, sg) => revol(sg > 0 // el labio mira hacia la tapa de cojinetes
    ? [[x0, 0.0275], [x0, 0.035], [x0 + 0.005, 0.035], [x0 + 0.009, 0.041], [x0 + 0.009, 0.038], [x0 + 0.006, 0.0275]]
    : [[x0, 0.0275], [x0 - 0.003, 0.038], [x0 - 0.003, 0.041], [x0 + 0.001, 0.035], [x0 + 0.006, 0.035], [x0 + 0.006, 0.0275]], { cerrar: true, seg: 48 });

  const LL = 'lado de la bomba (lado libre)', LA = 'lado del motor (lado acoplamiento)';
  pieza('411', malla(vring(0.191, 1), mat.goma), [1.4945, 0, 0], { lado: 'LL', detalle: LL, interno: true });
  pieza('360.1', malla(tapaCoj(0.200, 1), mat.fundicion), [1.545, 0, 0], { lado: 'LL', detalle: LL, interno: true });
  pieza('932', malla(seeger(0.2118), mat.zinc), [1.5965, 0, 0], { lado: 'LL', detalle: LL, interno: true });
  pieza('321', rodamiento(0.215, 1), [1.6605, 0, 0], { lado: 'LL', detalle: LL, interno: true });
  pieza('321', rodamiento(0.395, -1), [2.8305, 0, 0], { lado: 'LA', detalle: LA, interno: true });
  pieza('932', malla(seeger(0.4243), mat.zinc), [2.8945, 0, 0], { lado: 'LA', detalle: LA, interno: true });
  pieza('360.1', malla(tapaCoj(0.4345, -1), mat.fundicion), [2.946, 0, 0], { lado: 'LA', detalle: LA });
  pieza('411', malla(vring(0.4405, -1), mat.goma), [2.9965, 0, 0], { lado: 'LA', detalle: LA });

  // ---------- 210 Eje, con sus chaveteros ----------
  {
    const rosca = tinte(revol([[-0.076, 0], [-0.076, 0.0105], [-0.074, 0.012], [-0.045, 0.012]], { seg: 32 }), 0.62);
    const eje = revol([
      [-0.045, 0.012], [-0.045, 0.019], [0.040, 0.019], [0.040, 0.0225], [0.1335, 0.0225], [0.1335, 0.0275], [0.244, 0.0275], [0.244, 0.0325],
      [0.395, 0.0325], [0.395, 0.0275], [0.450, 0.0275], [0.450, 0.021], [0.528, 0.021], [0.530, 0.019], [0.530, 0],
    ], { seg: 48 });
    const chaveteros = [
      tinte(caja(0.052, 0.002, 0.0102, -0.003, 0.0185, 0), 0.1), tinte(caja(0.052, 0.002, 0.0102, -0.003, -0.0185, 0), 0.1),
      tinte(caja(0.066, 0.002, 0.0122, 0.4895, 0.0205, 0), 0.1),
    ];
    pieza('210', malla([rosca, eje, chaveteros], mat.acero), [2.076, 0, 0], { interno: true });
  }
  pieza('940.2', malla(chaveta(0.050, 0.008, 0.010).map((g) => g.translate(-0.003, 0.0205, 0)), mat.zinc), [2.076, 0.075, 0], { lado: 'A', detalle: 'chaveta del rodete', interno: true });
  pieza('940.2', malla(chaveta(0.050, 0.008, 0.010).map((g) => g.translate(-0.003, -0.0205, 0)), mat.zinc), [2.076, -0.075, 0], { lado: 'B', detalle: 'chaveta del rodete (segunda, en la unidad de eje 55)', interno: true });
  pieza('940.3', malla(chaveta(0.064, 0.008, 0.012).map((g) => g.translate(0.4895, 0.0225, 0)), mat.zinc), [2.076, 0.075, 0], { detalle: 'chaveta del acoplamiento' });

  // ---------- 330 Soporte de cojinetes ----------
  const cono = (x) => 0.168 - (x - 0.112) * (0.060 / 0.088);
  const nCono = (a) => V(0.563, 0.826 * Math.cos(a), 0.826 * Math.sin(a));
  const DX = 2.656;
  {
    const linterna = [[0.112, 0.154], [0.112, 0.168], [0.200, 0.108], [0.200, 0.094]];
    const ag = [];
    for (let i = 0; i < 8; i++) { const a = rad(22.5 + i * 45); ag.push(tinte(cilX(0.009, 0.0186, 0.0937, 12).translate(0, 0.205 * Math.cos(a), 0.205 * Math.sin(a)), 0.06)); }
    const g = [
      anillo(0.150, 0.228, 0.094, 0.112, 96), ag,
      revol(linterna, { cerrar: true, tapas: true, a0: rad(-55), a1: rad(55), seg: 28 }),
      revol(linterna, { cerrar: true, tapas: true, a0: rad(125), a1: rad(235), seg: 28 }),
      revol([[0.196, 0.060], [0.196, 0.110], [0.214, 0.110], [0.226, 0.086, S], [0.440, 0.086], [0.440, 0.060]], { cerrar: true, seg: 72 }),
      caja(0.10, 0.018, 0.075, 0.30, 0.090, 0),                       // refuerzo superior con la flecha de giro
      tinte(caja(0.05, 0.0008, 0.012, 0.30, 0.0994, 0), 0.25), tinte(prisma([[0.325, 0.0994], [0.325, 0.1002], [0.345, 0.1002], [0.345, 0.0994]], 0.026), 0.25),
      prisma([[0.112, -0.215], [0.300, -0.088], [0.205, -0.088], [0.112, -0.150]], 0.014),
      prisma([[0.112, 0.215], [0.112, 0.150], [0.205, 0.088], [0.262, 0.088]], 0.014),
      caja(0.030, 0.075, 0.12, 0.426, -0.118, 0),                     // oreja para el pie de apoyo
    ];
    pieza('330', malla(g, mat.pintura), [DX, 0, 0]);
  }
  conexion('8B', V(0.150, -cono(0.150) + 0.002, 0), V(0, -1, 0), { dx: DX, tapon: 'propio', detalle: 'en el punto bajo de la linterna del soporte' });

  // ---------- 81-92 Chapa de cubierta, con 901.3 y 930.3 ----------
  for (const [lado, ac, sg] of [['A', rad(90), 1], ['B', rad(270), -1]]) {
    const chapa = [revol([[0.116, cono(0.116) + 0.001], [0.116, cono(0.116) + 0.003], [0.196, cono(0.196) + 0.003], [0.196, cono(0.196) + 0.001]],
      { cerrar: true, tapas: true, a0: ac - rad(39), a1: ac + rad(39), seg: 20 })];
    for (const x of [0.134, 0.156, 0.178]) for (const da of [-24, -12, 12, 24]) {
      const a = ac + rad(da), n = nCono(a), r = cono(x) + 0.0031;
      chapa.push(tinte(orientar(cilX(0.0055, 0.0006, 0, 12), n, V(x, r * Math.cos(a), r * Math.sin(a))), 0.05));
    }
    pieza('81-92', malla(chapa, mat.galv), [DX, 0, 0.13 * sg], { lado, detalle: `ventana de la linterna, lado ${lado}` });
    const n = nCono(ac), r = cono(0.156) + 0.003, p = V(0.156, r * Math.cos(ac), r * Math.sin(ac));
    const arandela = orientar([anillo(0.0035, 0.009, -0.002, 0, 20)], n.clone().negate(), p.clone().addScaledVector(n, 0.0001));
    pieza('930.3', malla(arandela, mat.zinc), [DX, 0, 0.21 * sg], { lado, detalle: `bajo el tornillo de la chapa de cubierta ${lado}` });
    const tor = orientar(perno(0.006, 0.014), n.clone().negate(), p.clone().addScaledVector(n, 0.0021));
    pieza('901.3', malla(tor, mat.zinc), [DX, 0, 0.27 * sg], { lado, detalle: `fija la chapa de cubierta ${lado}` });
  }

  // ---------- 183 Pie de apoyo, 901.2 y 901.1 ----------
  pieza('183', malla([
    caja(0.010, 0.185, 0.14, 0.446, -0.1825, 0), caja(0.10, 0.010, 0.16, 0.401, -0.275, 0),
    prisma([[0.441, -0.270], [0.441, -0.215], [0.386, -0.270]], 0.008),
    tinte(cilY(0.008, 0.0106, 12).translate(0.385, -0.275, 0.055), 0.06), tinte(cilY(0.008, 0.0106, 12).translate(0.385, -0.275, -0.055), 0.06),
  ], mat.pintura), [DX + 0.06, -0.13, 0]);
  for (const [lado, z] of [['A', 0.035], ['B', -0.035]]) {
    pieza('901.2', malla(orientar(perno(0.012, 0.030), V(-1, 0, 0), V(0.451, -0.125, z)), mat.zinc), [DX + 0.20, -0.13, 0], { lado, detalle: 'une el pie de apoyo al soporte de cojinetes' });
  }
  pieza('901.1', malla(orientar(perno(0.010, 0.020), V(0, -1, 0), V(0.412, 0.086, 0)), mat.zinc), [DX, 0.085, 0], { detalle: 'en el soporte de cojinetes, lado del motor' });

  // ---------- 902.3 pernos roscados y 920.5 tuercas (unión carcasa, cubierta y soporte) ----------
  for (let i = 0; i < 8; i++) {
    const a = rad(22.5 + i * 45), y = 0.205 * Math.cos(a), z = 0.205 * Math.sin(a);
    pieza('902.3', malla(cilX(0.008, 0.066, 0.066, 14).translate(0, y, z), mat.zinc), [0.085, 0, 0], { lado: String(i + 1), detalle: 'roscado en la carcasa espiral' });
    pieza('920.5', malla([hexX(0.024, 0.013, 0.112).translate(0, y, z), tinte(cilX(0.0082, 0.0134, 0.1118, 12).translate(0, y, z), 0.25)], mat.zinc),
      [DX + 0.075, 0, 0], { lado: String(i + 1), detalle: 'sobre la brida del soporte de cojinetes' });
  }

  // posición de cada pieza según el factor de despiece f ∈ [0, 1]
  function despiezar(f) {
    for (const i of inst) {
      i.obj.position.copy(i.ex).multiplyScalar(f);
      if (i.sub) for (const h of i.obj.children) h.position.x = (h.userData.exx || 0) * f;
    }
  }
  // punto de anclaje de la etiqueta de cada pieza (arriba de su caja, en coordenadas del objeto)
  const caja3 = new THREE.Box3();
  for (const i of inst) {
    caja3.setFromObject(i.obj);
    i.centro = caja3.getCenter(new THREE.Vector3());
    i.ancla = V(i.centro.x, caja3.max.y, i.centro.z);
    i.radio = caja3.getSize(new THREE.Vector3()).length() / 2;
  }
  return { grupo, inst, despiezar, filaB: DESPLAZA_B[2] };
}
