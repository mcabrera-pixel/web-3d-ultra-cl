// 3D Ultra · muestra: sala de bombas con PP-101, despiece según manual y datos de ejemplo de SAP y PI.
// Contrato: ?vista=nube|modelo|despiece &pieza=<n> &panel=sap|pi &paso=1..6 &evento=1 ; window.muestra
import * as THREE from '../vendor/three.module.min.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from '../vendor/CSS2DRenderer.js';
import { construirPlanta } from './escena.js';
import { PIEZAS, CONJUNTOS, GRUPOS, buscarPieza } from './piezas.js';
import { muestrearNube, desempaquetar, pesoPorDefecto } from './nube.js';
import { sparkline, tendencia, fmt } from './graficos.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fechaCL = (iso) => { if (!iso) return '-'; const [a, m, d] = iso.slice(0, 10).split('-'); return `${d}-${m}-${a}`; };
const muestra = window.muestra = { lista: false };

// ===================================================================== estado
const S = {
  vista: 'modelo', pieza: null, tag: 'PP-101', panel: 'ficha', paso: 0,
  senal: 'PP101_VI_011.PV', rango: '7d',
  ev: { activo: false, fase: 0, k: 0, timers: [], sap: false },
  k: 0, kT: 0,
};

// ===================================================================== render
const box3d = $('#c3d');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(box3d.clientWidth, box3d.clientHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
box3d.appendChild(renderer.domElement);
const labelR = new CSS2DRenderer();
labelR.setSize(box3d.clientWidth, box3d.clientHeight);
Object.assign(labelR.domElement.style, { position: 'absolute', top: '0', left: '0', pointerEvents: 'none' });
box3d.appendChild(labelR.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe9e5de);
const camera = new THREE.PerspectiveCamera(35, box3d.clientWidth / box3d.clientHeight, 0.05, 200);
camera.position.set(8.5, 6.2, 9.5);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.target.set(0.2, 1.2, 0.6);
controls.maxPolarAngle = Math.PI * 0.49; controls.minDistance = 0.4; controls.maxDistance = 30; controls.autoRotateSpeed = 0.6;

function envScene() {
  const s = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(24, 12, 24), new THREE.MeshBasicMaterial({ color: 0x8f8a82, side: THREE.BackSide })); room.position.y = 5; s.add(room);
  const add = (w, h, d, x, y, z, k) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: 0xffffff })); m.material.color.setScalar(k); m.position.set(x, y, z); s.add(m); };
  add(10, 0.2, 10, 0, 10.8, 0, 5.5); add(0.2, 5, 8, -11.8, 6, 0, 2.6); add(0.2, 5, 8, 11.8, 6, 0, 1.8); add(8, 5, 0.2, 0, 6, -11.8, 2.2);
  return s;
}
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(envScene(), 0.04).texture;
scene.add(new THREE.HemisphereLight(0xffffff, 0xb3a58e, 0.5));
const sol = new THREE.DirectionalLight(0xffffff, 1.6);
sol.position.set(7, 12, 8); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.02;
scene.add(sol);

// ===================================================================== escena
const P = construirPlanta();
scene.add(P.root);
scene.add(P.escaneo); // fuera de la planta para verlo junto a la nube
const U1 = P.u1, BOMBA = U1.bomba;
const sensores = U1.refs.vLA.parent;
const guarda = U1.aco.getObjectByName('guarda');
// instancia por malla (para destacar solo el rodamiento lado acoplamiento)
for (const d of BOMBA.despiece) { d.ex.x *= 0.85; d.obj.traverse(o => { o.userData.inst = d.obj.userData.instancia; }); }
// señales PI asociadas a objetos 3D
const SENAL_OBJ = [
  [U1.refs.vLA, 'PP101_VI_011.PV', 'VT-101A'], [U1.refs.vLL, 'PP101_VI_012.PV', 'VT-101B'],
  [U1.refs.tLA, 'PP101_TI_011.PV', 'TT-101A'], [U1.refs.tLL, 'PP101_TI_012.PV', 'TT-101B'],
  [U1.refs.pts, 'PP101_PI_001.PV', 'PT-101A'], [U1.refs.ptd, 'PP101_PI_002.PV', 'PT-101B'], [U1.refs.ft, 'PP101_FI_001.PV', 'FT-101'],
];
SENAL_OBJ.forEach(([o, s, t]) => { o.userData.senal = s; o.userData.tag = t; });

// ---- materiales de selección
const original = new Map();
U1.conj.traverse(o => { if (o.isMesh) original.set(o, o.material); });
const hiCache = new Map();
const hi = (m) => { if (!hiCache.has(m.uuid)) { const c = m.clone(); c.emissive = new THREE.Color(0xba521a); c.emissiveIntensity = 0.55; hiCache.set(m.uuid, c); } return hiCache.get(m.uuid); };
const GHOST = new THREE.MeshStandardMaterial({ color: 0x9fb6cc, transparent: true, opacity: 0.12, depthWrite: false, roughness: 0.6 });
const ALARMA = new THREE.MeshStandardMaterial({ color: 0xd8473a, emissive: 0xc8382c, emissiveIntensity: 0.6, roughness: 0.4, metalness: 0.3 });
function conjuntoDe(o) { for (let p = o; p; p = p.parent) if (['MOT', 'ACO', 'BAS'].includes(p.name)) return p.name; return null; }
function aplicarMateriales() {
  const sel = S.pieza, esPiezaBomba = sel && sel.grupo !== 'conjunto' && S.vista !== 'despiece'; // en el despiece no hace falta transparentar
  original.forEach((mat, mesh) => {
    const num = mesh.userData.numero, cj = conjuntoDe(mesh);
    const id = num || cj;
    let m = mat;
    if (S.ev.activo && S.ev.fase >= 2 && num === '321' && mesh.userData.inst === 'lado acoplamiento') m = ALARMA;
    else if (sel && id === sel.numero) m = hi(mat);
    else if (esPiezaBomba && num) m = GHOST;
    else if (esPiezaBomba && cj === 'ACO' && guarda && isDesc(mesh, guarda)) m = GHOST;
    mesh.material = m;
    mesh.castShadow = m !== GHOST;
  });
}
const isDesc = (o, p) => { for (let q = o; q; q = q.parent) if (q === p) return true; return false; };

// ===================================================================== etiquetas
function etiqueta(html, cls, pos, parent, onClick) {
  const d = document.createElement('div'); d.className = cls; d.innerHTML = html;
  if (onClick) d.addEventListener('pointerdown', (e) => { e.stopPropagation(); onClick(); });
  const o = new CSS2DObject(d); o.position.copy(pos); parent.add(o); return o;
}
const ETQ_TAG = [];
ETQ_TAG.push(etiqueta('PP-101', 'lbl', new THREE.Vector3(-0.55, 0.3, 0.55), U1.conj, () => seleccionarTag('PP-101')));
ETQ_TAG.push(etiqueta('PP-102', 'lbl', new THREE.Vector3(-0.55, 0.3, 0.55), P.u2.conj, () => seleccionarTag('PP-102')));
ETQ_TAG.push(etiqueta('M-101', 'lbl sec', new THREE.Vector3(1.5, 0.5, 0), U1.conj, () => seleccionarTag('M-101')));
const ETQ_SEN = {};
for (const [o, s, t] of SENAL_OBJ) {
  if (t.startsWith('TT')) continue;
  const off = t === 'FT-101' ? new THREE.Vector3(0, 0, 0.38) : t === 'VT-101A' ? new THREE.Vector3(0.05, 0.14, 0) : t === 'VT-101B' ? new THREE.Vector3(-0.05, 0.3, 0) : new THREE.Vector3(0, 0.26, 0);
  const lab = t.startsWith('VT') ? `${t} / TT-101${t.slice(-1)}` : t;
  ETQ_SEN[t] = etiqueta(lab, 'lbl sec', off, o, () => seleccionarTag(t));
  ETQ_TAG.push(ETQ_SEN[t]);
}
// números de pieza (visibles en el despiece)
const ETQ_NUM = new Map();
{
  const info = PIEZAS.map(p => {
    const obj = BOMBA.piezas.get(p.numero)[0], d = BOMBA.despiece.find(x => x.obj === obj);
    const bb = new THREE.Box3().setFromObject(obj), c = bb.getCenter(new THREE.Vector3());
    return { p, obj, bb, c, fx: c.x + d.ex.x, fila: d.ex.y > 0.3 ? 'B' : 'A' };
  });
  for (const fila of ['A', 'B']) {
    info.filter(i => i.fila === fila).sort((a, b) => a.fx - b.fx).forEach((i, k) => {
      const arriba = k % 2 === 0;
      const pos = new THREE.Vector3(i.c.x, arriba ? i.bb.max.y + 0.04 : i.bb.min.y - 0.04, i.c.z);
      i.obj.worldToLocal(pos);
      ETQ_NUM.set(i.p.numero, etiqueta(i.p.numero, 'num' + (i.p.aplica === false ? ' na' : ''), pos, i.obj, () => seleccionarPieza(i.p)));
    });
  }
}
muestra._interno = { P, S };

// ===================================================================== datos
let SAP = null, PI = null;
const nube = { obj: null, origen: '', N: 0, cortes: [] };
async function cargarJSON(url) { const r = await fetch(url); if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); }
async function cargarNube() {
  let pos, col, origen = 'simulada', cortes = [];
  try {
    const meta = await cargarJSON('data/nube/nube.json');
    const r = await fetch('data/nube/' + meta.archivo);
    if (!r.ok) throw new Error('sin nube.bin');
    ({ posiciones: pos, colores: col } = desempaquetar(await r.arrayBuffer(), meta.puntos));
    origen = meta.origen; cortes = meta.estaciones || [];
  } catch (e) {
    // sin archivo: se genera en el navegador desde el modelo
    const r = muestrearNube(P.root, 200000, { pesoDe: pesoPorDefecto, estaciones: P.estaciones });
    pos = r.posiciones; col = r.colores; cortes = r.porEstacion; origen = 'simulada';
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
  const m = new THREE.PointsMaterial({ size: 0.02, vertexColors: true, sizeAttenuation: true });
  const pts = new THREE.Points(g, m); pts.visible = false; pts.frustumCulled = false; scene.add(pts);
  Object.assign(nube, { obj: pts, origen, N: pos.length / 3, cortes });
}

// ===================================================================== cámara
let camTw = null;
function volar(pos, tgt, ms = 900) { camTw = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: tgt.clone(), ini: performance.now(), ms }; }
const VEC = (x, y, z) => new THREE.Vector3(x, y, z);
const CAM = {
  general: [VEC(8.2, 6.0, 8.2), VEC(0.0, 1.0, -0.8)],
  pp101: [VEC(4.3, 2.5, 4.4), VEC(0.55, 0.8, -0.1)],
  pp102: [VEC(4.3, 2.5, 2.0), VEC(0.55, 0.8, -2.5)],
  despiece: [VEC(0.25, 1.55, 4.3), VEC(0.25, 1.05, 0)],
};
function enfocar(objs, factor = 2.4) {
  const bb = new THREE.Box3();
  const dk = S.kT - S.k;
  for (const o of objs) {
    const b = new THREE.Box3().setFromObject(o);
    const d = BOMBA.despiece.find(x => x.obj === o);
    if (d && dk) b.translate(d.ex.clone().multiplyScalar(dk));
    if (!b.isEmpty()) bb.union(b);
  }
  if (bb.isEmpty()) return;
  const c = bb.getCenter(new THREE.Vector3()), r = Math.max(bb.getSize(new THREE.Vector3()).length(), 0.25);
  const dir = VEC(0.55, 0.42, 1).normalize();
  const estrecho = Math.max(1, 0.95 / camera.aspect);
  volar(c.clone().addScaledVector(dir, (r * factor + 0.5) * estrecho), c);
}

// ===================================================================== vistas
const rotulo = $('#rotulo');
function vista(v) {
  if (!['nube', 'modelo', 'despiece'].includes(v)) return S.vista;
  const antes = S.vista; S.vista = v;
  document.querySelectorAll('#vistas button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  const enNube = v === 'nube';
  P.root.visible = !enNube;
  scene.background.setHex(enNube ? 0x1c1f23 : 0xe9e5de);
  if (nube.obj) { nube.obj.visible = enNube; nube.obj.geometry.setDrawRange(0, Infinity); }
  S.kT = v === 'despiece' ? 1 : 0;
  if (enNube) S.k = S.kT = 0;
  actualizarEtiquetas(); actualizarRotulo(); aplicarMateriales();
  if (antes !== v && !S.pieza) volar(...(v === 'despiece' ? CAM.despiece : v === 'nube' ? CAM.general : (S.tag === 'PP-102' ? CAM.pp102 : CAM.pp101)));
  if (S.pieza && antes !== v) setTimeout(() => S.pieza && enfocarPieza(), 30);
  syncURL();
  return v;
}
function actualizarRotulo() {
  if (S.vista === 'nube') {
    const t = nube.origen === 'escaner' ? 'Nube de escáner registrada' : 'Nube simulada desde el modelo';
    rotulo.innerHTML = `${t}<span>${nube.N.toLocaleString('es-CL')} puntos · ${nube.cortes.length || 4} estaciones</span>`;
    rotulo.style.display = 'block';
  } else if (S.vista === 'despiece') {
    rotulo.innerHTML = `Despiece según Tabla 28 del manual<span>${PIEZAS.length} posiciones · ilustración 24, pág. 63</span>`; rotulo.style.display = 'block';
  } else rotulo.style.display = 'none';
}
function actualizarEtiquetas() {
  const desp = S.vista === 'despiece', mod = S.vista === 'modelo';
  ETQ_TAG.forEach(e => { e.visible = mod; e.element.style.display = mod ? '' : 'none'; });
  ETQ_NUM.forEach((e, n) => { e.visible = desp; e.element.style.display = desp ? '' : 'none'; e.element.classList.toggle('sel', S.pieza?.numero === n); });
  ETQ_TAG.forEach(e => e.element.classList.toggle('sel', e.element.textContent.startsWith(S.tag) && !S.pieza));
  const al = S.ev.activo && S.ev.fase >= 1;
  if (ETQ_SEN['VT-101A']) ETQ_SEN['VT-101A'].element.classList.toggle('al', al);
}

// ===================================================================== selección
function seleccionarPieza(p, { panel = true, enfocarCam = true } = {}) {
  S.pieza = p || null;
  if (p) S.tag = 'PP-101';
  aplicarMateriales(); actualizarEtiquetas(); pintarLista();
  if (p && enfocarCam) enfocarPieza();
  if (panel) setPanel('ficha'); else renderPanel();
  syncURL();
  return S.pieza;
}
function objetosDe(p) {
  if (!p) return [];
  if (p.grupo === 'conjunto') return [U1[{ MOT: 'motor', ACO: 'aco', BAS: 'base' }[p.numero]]];
  return BOMBA.piezas.get(p.numero) || [];
}
function enfocarPieza() {
  const objs = objetosDe(S.pieza); if (!objs.length) return;
  if (S.vista === 'nube') return;
  enfocar(objs, S.pieza.grupo === 'conjunto' ? 1.6 : 2.6);
}
const TAGS = {
  'PP-101': () => { S.tag = 'PP-101'; seleccionarPieza(null, { panel: false }); if (S.vista === 'nube') vista('modelo'); volar(...CAM.pp101); setPanel('ficha'); },
  'PP-102': () => { S.tag = 'PP-102'; seleccionarPieza(null, { panel: false }); S.tag = 'PP-102'; if (S.vista !== 'modelo') vista('modelo'); volar(...CAM.pp102); setPanel('ficha'); actualizarEtiquetas(); },
  'M-101': () => { if (S.vista === 'nube') vista('modelo'); seleccionarPieza(buscarPieza('MOT')); },
  'CP-101': () => { if (S.vista === 'nube') vista('modelo'); seleccionarPieza(buscarPieza('ACO')); },
};
SENAL_OBJ.forEach(([o, s, t]) => { TAGS[t] = () => { if (S.vista !== 'modelo') vista('modelo'); seleccionarPieza(null, { panel: false }); S.senal = s; enfocar([o], 3.5); setPanel('pi'); }; });
function seleccionarTag(t) {
  const k = String(t || '').trim().toUpperCase();
  if (TAGS[k]) { TAGS[k](); $('#tag').value = k; return true; }
  const p = buscarPieza(k); if (p) { if (S.vista === 'nube') vista('modelo'); seleccionarPieza(p); return true; }
  return false;
}

// ---- clic en el 3D
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let down = null;
renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5 || S.vista === 'nube') return;
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects([U1.u, P.u2.u], true).filter(h => { for (let q = h.object; q; q = q.parent) if (!q.visible) return false; return true; });
  const h = hits.find(x => x.object.material !== GHOST) || hits[0];
  if (!h) return;
  const o = h.object;
  for (let q = o; q; q = q.parent) if (q.userData.senal) return seleccionarTag(q.userData.tag);
  if (isDesc(o, P.u2.u)) return seleccionarTag('PP-102');
  if (o.userData.numero) return seleccionarPieza(buscarPieza(o.userData.numero));
  const cj = conjuntoDe(o); if (cj) return seleccionarPieza(buscarPieza(cj));
  if (isDesc(o, U1.tub)) return seleccionarTag('PP-101');
});

// ===================================================================== lista lateral
function pintarLista() {
  const alarma = S.ev.activo && S.ev.fase >= 2;
  let h = '';
  for (const g of GRUPOS) {
    h += `<div class="gr">${g.nombre}</div>`;
    for (const p of PIEZAS.filter(x => x.grupo === g.id))
      h += `<button class="it${S.pieza === p ? ' sel' : ''}${alarma && p.numero === '321' ? ' alarma' : ''}" data-n="${esc(p.numero)}"><span class="n">${esc(p.numero)}</span><span class="t">${esc(p.nombre)}</span>${p.aplica === false ? '<span class="na" title="No se monta en esta ejecución">n/a</span>' : ''}</button>`;
  }
  h += `<div class="gr">Conjuntos aparte</div>`;
  for (const p of CONJUNTOS) h += `<button class="it${S.pieza === p ? ' sel' : ''}" data-n="${p.numero}"><span class="n">${p.numero === 'MOT' ? 'M-101' : p.numero === 'ACO' ? 'CP-101' : 'Base'}</span><span class="t">${esc(p.nombre)}</span></button>`;
  $('#lista').innerHTML = h;
}
$('#lista').addEventListener('click', e => {
  const b = e.target.closest('.it'); if (!b) return;
  if (S.vista === 'nube') vista('modelo');
  seleccionarPieza(buscarPieza(b.dataset.n));
  document.body.classList.remove('verLista');
});

// ===================================================================== paneles
function setPanel(p) {
  if (!['ficha', 'sap', 'pi'].includes(p)) return S.panel;
  S.panel = p;
  document.querySelectorAll('#tabs button[data-p]').forEach(b => b.classList.toggle('on', b.dataset.p === p));
  if (document.body.classList.contains('panelCerrado')) { document.body.classList.remove('panelCerrado'); ajustarCentro(); }
  renderPanel(); $('#panel').scrollTop = 0; syncURL();
  return p;
}
function renderPanel() {
  if (!SAP || !PI) return;
  const el = $('#panel');
  if (S.panel === 'ficha') el.innerHTML = htmlFicha();
  else if (S.panel === 'sap') el.innerHTML = htmlSAP();
  else { el.innerHTML = htmlPI(); dibujarPI(); }
}
$('#tabs').addEventListener('click', e => { const b = e.target.closest('button[data-p]'); if (b) setPanel(b.dataset.p); });
$('#cerrarPanel').addEventListener('click', () => { document.body.classList.toggle('panelCerrado'); ajustarCentro(); });
$('#panel').addEventListener('click', e => {
  const a = e.target.closest('[data-pieza]'); if (a) { if (S.vista === 'nube') vista('modelo'); seleccionarPieza(buscarPieza(a.dataset.pieza), { panel: a.dataset.ir === 'ficha' }); return; }
  const s = e.target.closest('[data-senal]'); if (s) { S.senal = s.dataset.senal; setPanel('pi'); return; }
  const r = e.target.closest('[data-rango]'); if (r) { S.rango = r.dataset.rango; renderPanel(); return; }
  const g = e.target.closest('[data-panel]'); if (g) { setPanel(g.dataset.panel); }
});

const BANNER = '<div class="banner">Datos de ejemplo. No corresponden a un equipo real.</div>';
const matDe = (num) => Object.values(SAP.materiales).find(m => m.posicion_manual === num);
const ESTADO_OT = { CERR: 'Cerrada', LIB: 'Liberada', CRTD: 'Creada' };

function htmlFicha() {
  const p = S.pieza;
  if (!p) {
    if (S.tag === 'PP-102') return `${BANNER}<div class="big">PP-102</div><div class="ttl">Bomba de agua de proceso, reserva</div>
      <div class="chips"><span class="chip">Reserva</span><span class="chip">Mismo modelo que PP-101</span></div>
      <div class="nota">En esta muestra solo PP-101 tiene enlazados los datos de SAP y PI. PP-102 está en la escena para dar contexto a la sala y se activa con el mismo procedimiento.</div>`;
    const eq = SAP.equipo, abiertos = SAP.avisos.length + (S.ev.sap ? 1 : 0);
    const prox = [...SAP.ordenes, ...(S.ev.sap ? [SAP.evento.orden] : [])].filter(o => o.ISTAT !== 'CERR').sort((a, b) => a.GSTRP.localeCompare(b.GSTRP))[0];
    const peor = PI.senales.map(s => estado(valores(s).at(-1), s.umbrales)).sort((a, b) => b.n - a.n)[0];
    return `${BANNER}<div class="big">${eq.TIDNR}</div><div class="ttl">${esc(eq.EQKTX)}</div>
      <div class="chips"><span class="chip">Equipo SAP ${eq.EQUNR}</span><span class="chip ok">En servicio</span><span class="chip">Criticidad ${eq.ABCKZ}</span></div>
      <div class="sec"><h4>Estado</h4>
        <div class="box"><dl class="kv"><dt>Operación (PI)</dt><dd><span class="est ${peor.c}"><i></i>${peor.t}</span> <span class="link" data-panel="pi">ver señales</span></dd>
        <dt>Avisos abiertos</dt><dd>${abiertos} <span class="link" data-panel="sap">ver en SAP</span></dd>
        <dt>Próxima orden</dt><dd>${prox ? `${fechaCL(prox.GSTRP)} · ${esc(prox.KTEXT)}` : '-'}</dd></dl></div></div>
      <div class="sec"><h4>Datos técnicos</h4><dl class="kv">${Object.entries(eq.caracteristicas).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>
      <div class="nota">Seleccione una pieza en el 3D, en la lista de la izquierda o escriba su número en el buscador de TAG (por ejemplo 230). La vista Despiece separa la bomba según la Tabla 28 del manual.</div>`;
  }
  if (p.grupo === 'conjunto') {
    const sub = SAP.subequipos.find(s => s.conjunto === p.numero);
    return `${BANNER}<div class="big">${sub ? sub.TIDNR : 'Base'}</div><div class="ttl">${esc(p.nombre)}</div>
      <div class="chips"><span class="chip">Conjunto aparte</span><span class="chip">Fuera de la numeración del manual</span></div>
      <div class="nota">${esc(p.detalle)}</div>
      ${sub ? `<div class="sec"><h4>SAP</h4><dl class="kv"><dt>Equipo</dt><dd class="mono">${sub.EQUNR}</dd><dt>Descripción</dt><dd>${esc(sub.EQKTX)}</dd><dt>Equipo superior</dt><dd class="mono">${sub.HEQUI} (PP-101)</dd></dl></div>` : ''}
      ${p.numero === 'BAS' ? `<div class="sec"><h4>Aviso relacionado</h4>${SAP.avisos.filter(a => a.conjunto === 'BAS').map(a => `<div class="box"><b class="mono">${a.QMNUM}</b> · ${esc(a.QMTXT)}<div class="mut">${fechaCL(a.QMDAT)} · prioridad ${a.PRIOKX}</div></div>`).join('')}</div>` : ''}`;
  }
  const m = matDe(p.numero);
  const insts = (BOMBA.piezas.get(p.numero) || []).map(o => o.userData.instancia).filter(Boolean);
  const total = m ? m.stock.reduce((a, s) => a + s.LABST, 0) : 0;
  const reserva = S.ev.sap && SAP.evento.orden.componentes.find(c => c.posicion_manual === p.numero);
  const senales = PI.senales.filter(s => s.pieza === p.numero);
  const fuente = p.fuenteMaterial === 'hoja de datos' ? '<span class="chip ok">hoja de datos</span>' : '<span class="chip warn">supuesto</span>';
  const pags = p.paginas;
  return `${BANNER}<div class="big">${esc(p.numero)}</div><div class="ttl">${esc(p.nombre)}</div>
    <div class="chips"><span class="chip cu">Tabla 28 del manual</span><span class="chip">${esc(GRUPOS.find(g => g.id === p.grupo).nombre)}</span>${p.aplica === false ? '<span class="chip warn">No se monta en esta ejecución</span>' : ''}${S.ev.activo && S.ev.fase >= 2 && p.numero === '321' ? '<span class="chip crit">Vibración alta</span>' : ''}</div>
    ${reserva ? `<div class="box" style="border-color:#f0c2bd;background:#fdf0ee"><b>Repuesto reservado</b> para la orden <span class="mono">${SAP.evento.orden.AUFNR}</span>: ${reserva.BDMNG} UN desde bodega ${reserva.LGORT}. Quedan ${total - reserva.BDMNG} UN disponibles.</div>` : ''}
    <div class="sec"><h4>Manual</h4><dl class="kv">
      <dt>Número de pieza</dt><dd class="mono">${esc(p.numero)}</dd>
      <dt>Denominación</dt><dd>${esc(p.nombre)}</dd>
      <dt>Página del manual</dt><dd>${pags[0]} (ilustración 24 y tabla 28)${pags.length > 1 ? `<div class="mut" style="font-weight:400">También en pág. ${pags.slice(1).join(', ')}</div>` : ''}</dd>
      <dt>Material</dt><dd>${esc(p.material)} ${fuente}</dd>
      <dt>Cantidad en el equipo</dt><dd>${p.cantidad}${insts.length > 1 ? ` <span class="mut" style="font-weight:400">(${[...new Set(insts)].join(', ')})</span>` : ''}</dd>
    </dl>${p.detalle ? `<div class="nota">${esc(p.detalle)}</div>` : ''}</div>
    ${m ? `<div class="sec"><h4>SAP MM</h4><dl class="kv">
      <dt>Código de material</dt><dd class="mono">${m.MATNR}</dd>
      <dt>Texto breve</dt><dd>${esc(m.MAKTX)}</dd>
      <dt>Último cambio</dt><dd>${m.ultimo_cambio ? `${fechaCL(m.ultimo_cambio.fecha)} · orden <span class="mono">${m.ultimo_cambio.AUFNR}</span>` : 'Sin cambios registrados'}</dd>
      <dt>Plazo de reposición</dt><dd>${m.plazo_entrega_dias} días</dd>
      <dt>Precio de referencia</dt><dd>$ ${m.precio_clp.toLocaleString('es-CL')}</dd></dl>
      <table class="t" style="margin-top:8px"><tr><th>Bodega</th><th>Ubicación</th><th class="r">Stock</th></tr>
      ${m.stock.map(s => `<tr><td><span class="mono">${s.LGORT}</span> ${esc(s.LGOBE)}</td><td class="mono">${s.LGPBE}</td><td class="r"><b>${s.LABST}</b> UN</td></tr>`).join('')}
      <tr><td colspan="2"><b>Total centro ${SAP.sistema.centro}</b></td><td class="r"><b>${total}</b> UN</td></tr></table>
      ${total === 0 && p.aplica !== false ? '<div class="nota">Sin stock. Pieza de reposición por compra; revisar el plazo antes de planificar.</div>' : ''}</div>`
      : `<div class="nota">Es un punto de conexión de la carcasa o del soporte, no un repuesto con código de material.</div>`}
    ${senales.length ? `<div class="sec"><h4>Señales PI de esta pieza</h4>${senales.map(s => { const v = valores(s).at(-1), e = estado(v, s.umbrales); return `<div class="box link" data-senal="${s.tag}" style="display:flex;justify-content:space-between;color:inherit"><span>${esc(s.nombre)}</span><span><b>${fmt(v, s.decimales)}</b> ${s.unidad} <span class="est ${e.c}"><i></i>${e.t}</span></span></div>`; }).join('')}</div>` : ''}`;
}

function htmlSAP() {
  const eq = SAP.equipo, u = SAP.ubicacion_tecnica;
  const nuevo = S.ev.sap;
  const avisos = [...(nuevo ? [{ ...SAP.evento.aviso, _nuevo: true }] : []), ...SAP.avisos];
  const ords = [...SAP.ordenes, ...(nuevo ? [{ ...SAP.evento.orden, _nuevo: true }] : [])];
  const prog = ords.filter(o => o.ISTAT !== 'CERR').sort((a, b) => a.GSTRP.localeCompare(b.GSTRP));
  const hist = ords.filter(o => o.ISTAT === 'CERR').sort((a, b) => b.GSTRP.localeCompare(a.GSTRP));
  const fila = (o) => `<tr class="${o._nuevo ? 'nuevo' : ''}"><td class="mono">${o.AUFNR}</td><td>${o.AUART}</td><td>${esc(o.KTEXT)}${o._nuevo ? ' <span class="chip crit">Nueva</span>' : ''}${o.componentes?.length ? `<div class="mut">Repuestos: ${o.componentes.map(c => `<span class="link" data-pieza="${c.posicion_manual}">${c.posicion_manual}</span>`).join(', ')}</div>` : ''}</td><td>${fechaCL(o.GSTRP)}</td><td>${ESTADO_OT[o.ISTAT] || o.ISTAT}</td></tr>`;
  const sel = S.pieza?.numero;
  return `${BANNER}
    <div class="mut" style="font-size:11.5px">${u.ruta.map(r => esc(r.PLTXT)).join(' › ')}</div>
    <div class="big" style="margin-top:4px">${eq.TIDNR}</div><div class="ttl">${esc(eq.EQKTX)}</div>
    <div class="chips"><span class="chip">Equipo ${eq.EQUNR}</span><span class="chip">Ubicación ${u.TPLNR}</span><span class="chip">${eq.STAT}</span><span class="chip">Pto. trabajo ${eq.GEWRK}</span></div>
    <div class="sec"><h4>Avisos abiertos (${avisos.length})</h4><table class="t"><tr><th>Aviso</th><th>Clase</th><th>Texto</th><th>Prior.</th><th>Fecha</th></tr>
      ${avisos.map(a => `<tr class="${a._nuevo ? 'nuevo' : ''} ${a.posicion_manual || a.conjunto ? 'lk' : ''}" ${a.posicion_manual ? `data-pieza="${a.posicion_manual}"` : a.conjunto ? `data-pieza="${a.conjunto}"` : ''}><td class="mono">${a.QMNUM}</td><td>${a.QMART}</td><td>${esc(a.QMTXT)}${a._nuevo ? ` <span class="chip crit">Nuevo</span><div class="mut">Creado por ${esc(a.QMNAM)}: ${esc(a.origen)}</div>` : ''}</td><td><span class="chip ${a.PRIOK <= '2' ? 'crit' : a.PRIOK === '3' ? 'warn' : ''}">${a.PRIOKX}</span></td><td>${fechaCL(a.QMDAT)}</td></tr>`).join('')}</table></div>
    <div class="sec"><h4>Órdenes programadas</h4><table class="t"><tr><th>Orden</th><th>Clase</th><th>Texto</th><th>Inicio</th><th>Estado</th></tr>${prog.map(fila).join('')}</table></div>
    <div class="sec"><h4>Historial de órdenes</h4><table class="t"><tr><th>Orden</th><th>Clase</th><th>Texto</th><th>Inicio</th><th>Estado</th></tr>${hist.map(fila).join('')}</table></div>
    <div class="sec"><h4>Planes de mantenimiento</h4>${SAP.planes.map(p => `<div class="box"><b>${esc(p.WPTXT)}</b> <span class="mono mut">${p.WARPL}</span><div class="mut">Ciclo ${esc(p.ciclo)} · último ${fechaCL(p.ultimo)} · próximo <b>${fechaCL(p.proximo)}</b></div><div style="margin-top:3px">${p.tareas.map(esc).join(' · ')}</div></div>`).join('')}</div>
    <div class="sec"><h4>Lista de materiales (enlazada al 3D)</h4><table class="t"><tr><th>Pos.</th><th>Pieza</th><th>Denominación</th><th>Material</th><th class="r">Stock</th></tr>
      ${SAP.lista_materiales.items.map(it => { const m = it.IDNRK && SAP.materiales[it.IDNRK]; const st = m ? m.stock.reduce((a, s) => a + s.LABST, 0) : null; return `<tr class="lk ${sel === it.posicion_manual ? 'sel' : ''}" data-pieza="${it.posicion_manual}"><td class="mono">${it.POSNR}</td><td class="mono"><b>${esc(it.posicion_manual)}</b></td><td>${esc(it.MAKTX)}${it.POTX1 ? `<div class="mut">${esc(it.POTX1)}</div>` : ''}</td><td class="mono">${it.IDNRK || '<span class="mut">texto</span>'}</td><td class="r">${st == null ? '' : st}</td></tr>`; }).join('')}</table></div>`;
}

// ---- PI
const NOMBRE_EST = { ok: 'Normal' };
function estado(v, u) {
  if (u.HH != null && v >= u.HH) return { c: 'crit', t: 'Muy alta', n: 3 };
  if (u.LL != null && v <= u.LL) return { c: 'crit', t: 'Muy baja', n: 3 };
  if (u.H != null && v >= u.H) return { c: 'warn', t: 'Alta', n: 2 };
  if (u.L != null && v <= u.L) return { c: 'warn', t: 'Baja', n: 2 };
  return { c: 'ok', t: NOMBRE_EST.ok, n: 0 };
}
function valores(s) {
  const ev = PI.evento, serie = ev.series[s.tag];
  if (!S.ev.activo || !serie) return s.valores;
  const v = s.valores.slice(), k = Math.min(S.ev.k, serie.length);
  for (let i = 0; i < k; i++) v[ev.desde_indice + i] = serie[i];
  return v.slice(0, ev.desde_indice + k);
}
const t0PI = () => Date.parse(PI.inicio.replace(' ', 'T') + ':00-03:00');
function htmlPI() {
  const s = PI.senales.find(x => x.tag === S.senal) || PI.senales[0];
  return `${BANNER}<div class="mut" style="font-size:11.5px">${esc(PI.servidor)} · ${PI.activo} · cada ${PI.paso_min} min · hasta ${PI.fin}</div>
    <div class="sec" style="margin-top:10px"><div class="tiles">${PI.senales.map(x => { const v = valores(x), u = v.at(-1), e = estado(u, x.umbrales); return `<button class="tile${x.tag === s.tag ? ' sel' : ''}" data-senal="${x.tag}"><div class="nm" title="${esc(x.nombre)}">${esc(x.nombre)}</div><div class="row"><div class="v">${fmt(u, x.decimales)}<small>${x.unidad}</small></div><span class="est ${e.c}"><i></i>${e.t}</span></div><canvas data-spark="${x.tag}"></canvas></button>`; }).join('')}</div></div>
    <div class="sec"><h4 style="justify-content:space-between"><span>${esc(s.nombre)}</span><span class="rng"><button data-rango="24h" class="${S.rango === '24h' ? 'on' : ''}">24 h</button><button data-rango="7d" class="${S.rango === '7d' ? 'on' : ''}">7 días</button></span></h4>
      <canvas id="trend"></canvas>
      <dl class="kv" style="margin-top:8px"><dt>Punto PI</dt><dd class="mono">${s.tag}</dd><dt>Instrumento</dt><dd class="mono">${s.instrumento}</dd>
      <dt>Umbrales</dt><dd>${Object.entries(s.umbrales).map(([k, v]) => `${{ HH: 'Muy alta', H: 'Alta', L: 'Baja', LL: 'Muy baja' }[k]} ${fmt(v, s.decimales)}`).join(' · ')} ${s.unidad}</dd>
      ${s.pieza ? `<dt>Pieza del manual</dt><dd><span class="link" data-pieza="${s.pieza}" data-ir="ficha">${s.pieza} ${esc(PIEZAS.find(p => p.numero === s.pieza).nombre)}</span></dd>` : ''}</dl>
      ${s.referencia ? `<div class="nota">${esc(s.referencia)}</div>` : ''}
      <details style="margin-top:8px"><summary class="link">Ver últimos valores en tabla</summary><table class="t" style="margin-top:6px"><tr><th>Hora</th><th class="r">Valor</th></tr>${(() => { const v = valores(s), t = t0PI(); return v.slice(-12).map((x, i) => `<tr><td>${new Date(t + (v.length - 12 + i) * PI.paso_min * 60000 - 3 * 3600000).toISOString().slice(0, 16).replace('T', ' ')}</td><td class="r">${fmt(x, s.decimales)} ${s.unidad}</td></tr>`).reverse().join(''); })()}</table></details>
    </div>`;
}
let consulta = null;
function dibujarPI() {
  document.querySelectorAll('canvas[data-spark]').forEach(cv => { const s = PI.senales.find(x => x.tag === cv.dataset.spark); const v = valores(s); sparkline(cv, v.slice(-144), { umbral: s.umbrales.H ?? null }); });
  const cv = $('#trend'); if (!cv) return;
  const s = PI.senales.find(x => x.tag === S.senal) || PI.senales[0];
  let v = valores(s); const n = S.rango === '24h' ? 144 : v.length; const off = v.length - n; v = v.slice(off);
  const desde = S.ev.activo && PI.evento.series[s.tag] ? PI.evento.desde_indice - off : null;
  consulta = tendencia(cv, { valores: v, t0: t0PI() + off * PI.paso_min * 60000, pasoMin: PI.paso_min, unidad: s.unidad, dec: s.decimales, umbrales: s.umbrales, desdeEvento: desde });
  consulta.s = s;
}
const tip = $('#tip');
$('#panel').addEventListener('pointermove', e => {
  if (e.target.id !== 'trend' || !consulta) { tip.style.display = 'none'; return; }
  const r = e.target.getBoundingClientRect(); const q = consulta.consultar(e.clientX - r.left);
  if (!q) { tip.style.display = 'none'; return; }
  consulta.redibujarCruz(q.i);
  const t = new Date(q.t - 3 * 3600000).toISOString().slice(0, 16).replace('T', ' ');
  tip.innerHTML = `${t}<br><b>${fmt(q.v, consulta.s.decimales)} ${consulta.s.unidad}</b>`;
  tip.style.display = 'block'; tip.style.left = Math.min(e.clientX + 12, innerWidth - 140) + 'px'; tip.style.top = (e.clientY - 40) + 'px';
});
$('#panel').addEventListener('pointerleave', () => { tip.style.display = 'none'; if (S.panel === 'pi') dibujarPI(); });

// ===================================================================== evento de ejemplo
const EV_PASOS = [
  ['PI detecta', 'La vibración del cojinete lado acoplamiento cruza 2,8 mm/s', 'pi'],
  ['3D localiza', 'Se destaca el rodamiento 321 lado acoplamiento', null],
  ['SAP registra', 'Aviso M2 y orden PM01 para el cambio', 'sap'],
  ['Repuesto', 'Ficha del 321 con stock y reserva', 'ficha'],
];
function pintarEvento() {
  $('#evento').style.display = S.ev.activo ? 'block' : 'none';
  $('#evHora').textContent = S.ev.activo ? `alarma ${PI.evento.cruce_alarma_H.hora}` : '';
  $('#evPasos').innerHTML = EV_PASOS.map(([t, d], i) => `<li class="${S.ev.fase > i ? 'on' : ''}" data-f="${i}"><b>${i + 1}. ${t}</b>${d}</li>`).join('');
}
$('#evPasos').addEventListener('click', e => { const li = e.target.closest('li'); if (!li) return; const f = +li.dataset.f; if (f === 1) { seleccionarPieza(buscarPieza('321'), { panel: false }); enfocarRodamiento(); } else setPanel(EV_PASOS[f][2]); });
function resetEvento() {
  S.ev.timers.forEach(clearTimeout); S.ev.timers = [];
  if (S.ev.raf) cancelAnimationFrame(S.ev.raf);
  Object.assign(S.ev, { activo: false, fase: 0, k: 0, sap: false });
  pintarEvento(); aplicarMateriales(); actualizarEtiquetas(); pintarLista();
}
function enfocarRodamiento() {
  const o = BOMBA.piezas.get('321').find(x => x.userData.instancia === 'lado acoplamiento');
  enfocar([o], S.vista === 'despiece' ? 7 : 9);
}
function evento() {
  resetEvento();
  if (S.vista === 'nube') vista('modelo');
  S.ev.activo = true; S.senal = PI.evento.senal_principal; S.rango = '24h';
  const K = PI.evento.series[S.senal].length;
  const at = (ms, f) => S.ev.timers.push(setTimeout(f, ms));
  return new Promise(res => {
    // 1. PI
    S.ev.fase = 1; pintarEvento(); setPanel('pi'); actualizarEtiquetas();
    const ini = performance.now(); let ult = 0;
    const paso = () => {
      const f = Math.min(1, (performance.now() - ini) / 2600);
      S.ev.k = Math.round(f * K);
      if (performance.now() - ult > 90 || f === 1) { ult = performance.now(); if (S.panel === 'pi') { $('#panel').innerHTML = htmlPI(); dibujarPI(); } }
      if (f < 1) S.ev.raf = requestAnimationFrame(paso);
    };
    S.ev.raf = requestAnimationFrame(paso);
    // 2. 3D
    at(3000, () => { S.ev.fase = 2; pintarEvento(); seleccionarPieza(buscarPieza('321'), { panel: false, enfocarCam: false }); enfocarRodamiento(); });
    // 3. SAP
    at(5400, () => { S.ev.fase = 3; S.ev.sap = true; pintarEvento(); setPanel('sap'); });
    // 4. repuesto
    at(8200, () => { S.ev.fase = 4; pintarEvento(); setPanel('ficha'); res(true); });
  });
}
$('#btnEvento').addEventListener('click', () => { if (S.paso) cerrarPaso(); evento(); });

// ===================================================================== paso a paso
const PASOS = [
  { t: 'Levantamiento con escáner láser', p: 'El escáner se instala en cuatro estaciones alrededor de las bombas. Cada estación captura millones de puntos con distancia y color. Las dianas en los muros sirven para unir las estaciones después.',
    ir() { vista('nube'); P.escaneo.visible = true; P.escaneo.children.forEach(c => c.visible = true); revelarNube(); volar(VEC(7.5, 8.5, 9.5), VEC(-0.3, 0.6, 0)); } },
  { t: 'Nube de puntos registrada', p: 'Las cuatro estaciones se unen en una sola nube con coordenadas comunes. Sobre ella se mide la sala tal como está construida: tuberías, válvulas, bases y equipos.',
    ir() { vista('nube'); P.escaneo.visible = true; P.escaneo.children.forEach((c, i) => c.visible = i >= 4); controls.autoRotate = true; volar(VEC(5.5, 4.2, 6.5), VEC(0.4, 1.0, 0.8)); } },
  { t: 'Modelo 3D', p: 'Sobre la nube se modela cada activo y se le asigna su TAG de planta. PP-101 es la bomba en servicio y PP-102 la de reserva. Cada instrumento también lleva su TAG.',
    ir() { vista('modelo'); seleccionarTag('PP-101'); setPanel('ficha'); } },
  { t: 'Despiece según el manual', p: 'La bomba se separa a lo largo del eje con la numeración de la Tabla 28 del manual del fabricante. Cada pieza es un objeto propio con su número, denominación, material y código SAP.',
    ir() { seleccionarPieza(null, { panel: false }); vista('despiece'); volar(...CAM.despiece); S.paso4 = setTimeout(() => { if (S.paso === 4) seleccionarPieza(buscarPieza('230'), { enfocarCam: false }); }, 1800); } },
  { t: 'Conexión con SAP y PI', p: 'Las señales de operación de PI y los datos de mantenimiento de SAP se enlazan con el TAG y con el número de pieza. Ejemplo: sube la vibración de un rodamiento, se destaca la pieza, aparece el aviso y la orden, y se ve el repuesto en bodega.',
    ir() { seleccionarPieza(null, { panel: false }); vista('modelo'); volar(...CAM.pp101); evento(); } },
  { t: 'Plataforma web', p: 'Todo queda en una página web que se abre desde el navegador, sin instalar programas: buscar por TAG, ver la nube, el modelo y el despiece, y consultar mantenimiento y operación en el mismo lugar.',
    ir() { seleccionarPieza(null, { panel: false }); vista('modelo'); volar(...CAM.general); setPanel('sap'); } },
];
function limpiarPaso() {
  controls.autoRotate = false; P.escaneo.visible = false; clearTimeout(S.paso4);
  if (nube.obj) nube.obj.geometry.setDrawRange(0, Infinity);
  if (S.revelar) cancelAnimationFrame(S.revelar);
  resetEvento();
}
function paso(n) {
  n = +n;
  if (!(n >= 1 && n <= 6)) { cerrarPaso(); return 0; }
  limpiarPaso();
  S.paso = n; const d = PASOS[n - 1];
  $('#pasoK').textContent = `Cómo se hace · paso ${n} de 6`;
  $('#pasoT').textContent = d.t; $('#pasoP').textContent = d.p;
  $('#pasoDots').innerHTML = PASOS.map((_, i) => `<button class="${i + 1 === n ? 'on' : ''}" data-n="${i + 1}">${i + 1}</button>`).join('');
  $('#pasoAnt').disabled = n === 1; $('#pasoSig').textContent = n === 6 ? 'Terminar' : 'Siguiente';
  $('#paso').style.display = 'block';
  d.ir(); syncURL();
  return n;
}
function cerrarPaso() { limpiarPaso(); S.paso = 0; $('#paso').style.display = 'none'; syncURL(); }
function revelarNube() {
  if (!nube.obj) return;
  const N = nube.N, ini = performance.now(), dur = 7000, cortes = nube.cortes;
  const g = nube.obj.geometry;
  const anim = () => {
    const f = Math.min(1, (performance.now() - ini) / dur);
    const n = Math.round(N * f); g.setDrawRange(0, n);
    let acc = 0, est = 1; for (let i = 0; i < cortes.length; i++) { acc += cortes[i]; if (n <= acc) { est = i + 1; break; } est = i + 1; }
    rotulo.innerHTML = `${nube.origen === 'escaner' ? 'Nube de escáner' : 'Nube simulada desde el modelo'}<span>estación ${est} de ${cortes.length || 4} · ${n.toLocaleString('es-CL')} puntos</span>`;
    if (f < 1) S.revelar = requestAnimationFrame(anim); else actualizarRotulo();
  };
  g.setDrawRange(0, 0); S.revelar = requestAnimationFrame(anim);
}
$('#btnPasos').addEventListener('click', () => paso(S.paso ? S.paso : 1));
$('#pasoAnt').addEventListener('click', () => paso(Math.max(1, S.paso - 1)));
$('#pasoSig').addEventListener('click', () => S.paso >= 6 ? cerrarPaso() : paso(S.paso + 1));
$('#pasoCerrar').addEventListener('click', cerrarPaso);
$('#pasoDots').addEventListener('click', e => { const b = e.target.closest('button'); if (b) paso(+b.dataset.n); });

// ===================================================================== barra superior
$('#vistas').addEventListener('click', e => { const b = e.target.closest('button'); if (b) vista(b.dataset.v); });
$('#tag').addEventListener('change', e => { if (!seleccionarTag(e.target.value)) e.target.select(); });
$('#tag').addEventListener('keydown', e => { if (e.key === 'Enter') { if (!seleccionarTag(e.target.value)) e.target.select(); } });
$('#abrirLista').addEventListener('click', () => document.body.classList.toggle('verLista'));
$('#tags').innerHTML = ['PP-101', 'PP-102', 'M-101', 'CP-101', ...SENAL_OBJ.map(x => x[2])].map(t => `<option value="${t}">`).join('');

// ===================================================================== URL
let aplicandoURL = false;
function syncURL() {
  if (aplicandoURL || !muestra.lista) return;
  const q = new URLSearchParams(location.search);
  q.set('vista', S.vista);
  if (S.pieza) q.set('pieza', S.pieza.numero); else q.delete('pieza');
  if (S.panel !== 'ficha') q.set('panel', S.panel); else q.delete('panel');
  if (S.paso) q.set('paso', S.paso); else q.delete('paso');
  q.delete('evento');
  history.replaceState(null, '', '?' + q.toString().replace(/%2F/g, '/'));
}
function aplicarURL() {
  aplicandoURL = true;
  const q = new URLSearchParams(location.search);
  if (q.get('limpio') === '1') { document.body.classList.add('limpio'); ajustarCentro(); }
  if (q.has('paso')) paso(q.get('paso'));
  if (q.has('vista')) vista(q.get('vista'));
  if (q.has('pieza')) { const p = buscarPieza(q.get('pieza')); if (p) { if (S.vista === 'nube') vista('modelo'); seleccionarPieza(p, { panel: !q.has('panel') }); } }
  if (q.has('panel')) setPanel(q.get('panel'));
  if (q.get('evento') === '1') evento();
  aplicandoURL = false;
}

// ===================================================================== bucle
const reloj = new THREE.Clock();
function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
let kAplicado = -1;
function bucle() {
  requestAnimationFrame(bucle);
  const dt = Math.min(reloj.getDelta(), 0.05), t = reloj.elapsedTime;
  // despiece
  if (Math.abs(S.kT - S.k) > 1e-4) S.k += Math.sign(S.kT - S.k) * Math.min(Math.abs(S.kT - S.k), dt / 1.1); else S.k = S.kT;
  if (S.k !== kAplicado) {
    kAplicado = S.k; const e = ease(S.k);
    for (const d of BOMBA.despiece) d.obj.position.copy(d.base).addScaledVector(d.ex, e);
    U1.motor.position.x = 1.35 * e; U1.aco.position.x = 0.95 * e;
    const abierto = S.k > 0.001;
    U1.tub.visible = !abierto; sensores.visible = !abierto; if (guarda) guarda.visible = !abierto; P.u2.u.visible = !abierto;
  }
  // cámara
  if (camTw) {
    const f = Math.min(1, (performance.now() - camTw.ini) / camTw.ms), k = ease(f);
    camera.position.lerpVectors(camTw.p0, camTw.p1, k); controls.target.lerpVectors(camTw.t0, camTw.t1, k);
    if (f >= 1) camTw = null;
  }
  ALARMA.emissiveIntensity = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 6));
  controls.update();
  renderer.render(scene, camera); labelR.render(scene, camera);
}
// Centra la escena en el área que dejan libre los paneles (escritorio: entre ambos; celular: sobre la hoja inferior).
function ajustarCentro() {
  const w = box3d.clientWidth, h = box3d.clientHeight, movil = innerWidth <= 860;
  const limpio = document.body.classList.contains('limpio');
  const izq = movil || limpio ? 0 : 286, der = movil || limpio || document.body.classList.contains('panelCerrado') ? 0 : 416;
  const oy = movil && !limpio && !document.body.classList.contains('panelCerrado') ? h * 0.22 : 0;
  camera.setViewOffset(w, h, (der - izq) / 2, oy, w, h);
  camera.updateProjectionMatrix();
}
function redimensionar() {
  const w = box3d.clientWidth, h = box3d.clientHeight;
  renderer.setSize(w, h); labelR.setSize(w, h); camera.aspect = w / h;
  ajustarCentro();
  if (S.panel === 'pi') dibujarPI();
}
addEventListener('resize', redimensionar);

// ===================================================================== inicio
muestra.vista = vista;
muestra.pieza = (n) => { const p = buscarPieza(n); if (p && S.vista === 'nube') vista('modelo'); seleccionarPieza(p); return p ? p.numero : null; };
muestra.paso = paso;
muestra.evento = evento;
muestra.panel = setPanel;
muestra.piezas = () => PIEZAS.map(({ numero, nombre, grupo }) => ({ numero, nombre, grupo }));
muestra.estado = () => ({ vista: S.vista, pieza: S.pieza?.numero || null, panel: S.panel, paso: S.paso, evento: S.ev.activo ? S.ev.fase : 0, nube: nube.origen });

(async function iniciar() {
  try {
    [SAP, PI] = await Promise.all([cargarJSON('data/sap.json'), cargarJSON('data/pi.json')]);
    await cargarNube();
    pintarLista(); pintarEvento(); actualizarEtiquetas(); aplicarMateriales(); ajustarCentro();
    camera.position.copy(CAM.pp101[0]); controls.target.copy(CAM.pp101[1]);
    bucle();
    renderPanel();
    $('#carga').style.display = 'none';
    aplicarURL();
    muestra.lista = true;
    syncURL();
  } catch (e) {
    $('#carga').textContent = 'No se pudo cargar la muestra: ' + e.message + '. Ábrala con python -m http.server desde su carpeta.';
    throw e;
  }
})();
