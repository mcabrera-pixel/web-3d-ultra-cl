// Muestra 3D Ultra: bomba PP-101 con nube de puntos, modelo, despiece y datos de SAP y PI (datos de ejemplo).
// Contrato de revisión: ?vista=nube|modelo|despiece &pieza=<número> &panel=sap|pi &paso=1..6 &evento=1, y window.muestra.
import * as THREE from '../vendor/three.module.min.js';
import { crearEscena } from './escena.js';
import { crearSala, EJE_Y } from './sala.js';
import { cargarNube, simularNube, crearNube, exportarNube } from './nube.js';
import { crearPaneles } from './paneles.js';
import { crearGuia } from './guia.js';
import { crearTomas } from './tomas.js';
import { V, lerp } from './geo.js';
import { paleta } from './graficos.js';

const $ = (s) => document.querySelector(s);
const q = new URLSearchParams(location.search);
const app = $('#app');
const VISTAS = ['nube', 'modelo', 'despiece'];
window.muestra = { lista: false };

// cache: 'no-cache' obliga a revalidar: los datos y el manifiesto de nubes cambian sin cambiar de nombre
async function json(ruta) { const r = await fetch(ruta, { cache: 'no-cache' }); if (!r.ok) throw new Error(`No se pudo leer ${ruta}`); return r.json(); }

async function iniciar() {
  const [manual, sap, pi, enlaces] = await Promise.all(['manual', 'sap', 'pi', 'enlaces'].map((n) => json(`./data/${n}.json`)));
  // grabar=1 quita los paneles laterales; grabar=2 deja solo el 3D con sus rótulos
  if (q.get('grabar') === '1' || q.get('grabar') === '2') app.classList.add('grabar');
  if (q.get('grabar') === '2') app.classList.add('limpio');
  if (q.get('rotulo') === '0') app.classList.add('sin-rotulo'); // en las tomas, quita también el rótulo de la vista
  const E = crearEscena($('#lienzo'));
  const S = crearSala(E);
  E.scene.add(S.contexto, S.bomba.grupo, S.escaneres);

  // ---------- índices ----------
  const PZ = new Map(manual.piezas.map((p) => [p.numero, p]));
  const INST = new Map(S.bomba.inst.map((i) => [i.id, i]));
  const porNumero = new Map();
  for (const i of S.bomba.inst) { if (!porNumero.has(i.numero)) porNumero.set(i.numero, []); porNumero.get(i.numero).push(i); }
  const incoherencias = [];
  for (const p of manual.piezas) if (!porNumero.has(p.numero)) incoherencias.push(`La pieza ${p.numero} del manual no tiene geometría`);
  for (const n of porNumero.keys()) if (!PZ.has(n)) incoherencias.push(`La geometría ${n} no está en el manual`);
  const MAT = new Map(sap.materiales.filter((m) => m.pieza_manual).map((m) => [m.pieza_manual, m]));
  const PUNTO = new Map(pi.puntos.map((p) => [p.instrumento, p]));
  const inicioMs = Date.parse(pi.inicio), pasoMs = pi.paso_s * 1000;
  const estadoPunto = (p, i = p.valores.length - 1) => {
    const v = p.valores[i], L = p.limites;
    if (L.HH != null && v >= L.HH) return { clase: 'rojo', texto: 'Alarma muy alta' };
    if (L.H != null && v >= L.H) return { clase: 'alerta', texto: 'Alarma alta' };
    if (L.LL != null && v <= L.LL) return { clase: 'rojo', texto: 'Alarma muy baja' };
    if (L.L != null && v <= L.L) return { clase: 'alerta', texto: 'Alarma baja' };
    return { clase: 'ok', texto: 'Normal' };
  };
  const enAlarma = pi.puntos.filter((p) => estadoPunto(p).clase !== 'ok');

  const miles = (n) => n.toLocaleString('es-CL');
  // ---------- estado ----------
  const est = {
    vista: 'modelo', sel: { tipo: 'tag', id: enlaces.tag }, panel: 'ficha', f: 0, mezcla: 1, paso: 0, evento: 0,
    tags: q.get('tags') !== '0', numeros: window.innerWidth > 860, rayosx: false, corte: q.get('corte') === '1', altura: q.get('color') === 'altura', mezclaManual: false,
    senal: 'VT-101A', dias: 7, ordenes: 'programadas', sobre: null, alarma3d: false, progreso: 1, nube: 'simulada', toma: 0,
    tema: document.documentElement.dataset.tema === 'claro' ? 'claro' : 'oscuro', // lo fijó src/tema.js antes del primer pintado
  };

  // ---------- materiales de resalte ----------
  // colores del 3D que dependen del tema: rayos X, piezas atenuadas, resalte de la selección y líneas
  const TEMA3D = {
    oscuro: { fantasma: 0xb4c6cf, opFantasma: 0.15, atenuado: 0xaeb8c0, opAtenuado: 0.3, sel: 0xe53935, selLuz: 0xd32f2f, piso: 0x74787c, mesa: 0x2b3036, ejes: 0x6f7780, barra: '#050505' },
    claro: { fantasma: 0x51616e, opFantasma: 0.13, atenuado: 0x77828c, opAtenuado: 0.36, sel: 0xb8542a, selLuz: 0xb8542a, piso: 0x8a8b8f, mesa: 0xa9aaaf, ejes: 0x7d7e83, barra: '#ffffff' },
  };
  const fantasma = new THREE.MeshStandardMaterial({ color: 0xb4c6cf, transparent: true, opacity: 0.15, roughness: 0.5, metalness: 0.1, depthWrite: false });
  const variantes = new Map();
  const variante = (base, tipo) => {
    const k = base.uuid + tipo; if (variantes.has(k)) return variantes.get(k);
    const m = base.clone();
    if (tipo === 'sel') { const T = TEMA3D[est.tema]; m.color = m.color.clone().lerp(new THREE.Color(T.sel), 0.72); m.emissive = new THREE.Color(T.selLuz); m.emissiveIntensity = 0.38; }
    if (tipo === 'alarma') { m.color = m.color.clone().lerp(new THREE.Color(0xf0a52b), 0.7); m.emissive = new THREE.Color(0xf0a52b); m.emissiveIntensity = 0.9; m.userData.pulso = true; }
    if (tipo === 'sobre') { m.emissive = new THREE.Color(0xffffff); m.emissiveIntensity = 0.16; }
    if (m.transparent) m.opacity = Math.min(1, m.opacity + 0.25);
    variantes.set(k, m); return m;
  };
  const mallasDe = (obj) => { const l = []; obj.traverse((h) => { if (h.isMesh) { h.userData.base = h.material; l.push(h); } }); return l; };
  // piezas de la tabla que no se montan en esta ejecución (notas del manual y hoja de datos): atenuadas, pero seleccionables
  const atenuado = new THREE.MeshStandardMaterial({ color: 0xaeb8c0, transparent: true, opacity: 0.3, roughness: 0.6, metalness: 0.15, depthWrite: false });
  for (const i of S.bomba.inst) {
    i.mallas = mallasDe(i.obj); i.noMonta = PZ.get(i.numero)?.monta === false;
    if (i.noMonta) for (const m of i.mallas) { m.userData.base = atenuado; m.material = atenuado; m.castShadow = false; }
  }
  for (const c of S.conjuntos) c.mallas = mallasDe(c.obj);

  function pintar() {
    aplicarCorte();
    const enCorte = est.corte && est.vista === 'modelo';
    const s = est.sel, selPieza = s.tipo === 'pieza', rx = est.vista === 'modelo' && !enCorte && (est.rayosx || selPieza || est.alarma3d);
    for (const i of S.bomba.inst) {
      const elegido = selPieza && (s.inst ? s.inst === i.id : s.numero === i.numero);
      const alarma = est.alarma3d && i.id === '321-LA';
      let modo = 'base';
      if (alarma) modo = 'alarma'; else if (elegido) modo = 'sel'; else if (rx && (selPieza || est.alarma3d || !i.interno)) modo = 'fantasma'; else if (est.sobre === i.id) modo = 'sobre';
      for (const m of i.mallas) { m.material = modo === 'base' ? m.userData.base : modo === 'fantasma' ? fantasma : variante(m.userData.base, modo); m.castShadow = modo !== 'fantasma' && !i.noMonta; }
    }
    for (const c of S.conjuntos) {
      const modo = s.tipo === 'conjunto' && s.id === c.id ? 'sel' : (rx && (selPieza || est.alarma3d)) && c.id === 'acoplamiento' ? 'fantasma' : est.sobre === c.id ? 'sobre' : 'base';
      for (const m of c.mallas) m.material = modo === 'base' ? m.userData.base : modo === 'fantasma' ? fantasma : variante(m.userData.base, modo);
    }
    E.invalidar();
  }
  // corte longitudinal por el eje de la bomba: deja ver el interior como en el dibujo en corte del manual
  E.renderer.localClippingEnabled = true;
  const planoCorte = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.0005);
  let corteAplicado = false;
  function aplicarCorte() {
    const activo = est.corte && est.vista === 'modelo';
    if (activo === corteAplicado) return; corteAplicado = activo;
    const vistos = new Set();
    for (const i of S.bomba.inst) for (const m of i.mallas) for (const mt of [m.userData.base, variante(m.userData.base, 'sel'), variante(m.userData.base, 'sobre'), variante(m.userData.base, 'alarma')]) {
      if (vistos.has(mt)) continue; vistos.add(mt);
      mt.clippingPlanes = activo ? [planoCorte] : null; mt.side = activo ? THREE.DoubleSide : THREE.FrontSide; mt.needsUpdate = true;
    }
  }
  // pulso de la pieza en alarma
  let pulsoActivo = null;
  function pulso(activo) {
    if (activo && !pulsoActivo) pulsoActivo = E.alFrame((t) => { const k = 0.55 + 0.45 * Math.sin(t / 260); for (const m of variantes.values()) if (m.userData.pulso) m.emissiveIntensity = 0.35 + 0.9 * k; });
    if (!activo && pulsoActivo) { pulsoActivo(); pulsoActivo = null; }
  }

  function pulsoFijo() { pulso(false); for (const m of variantes.values()) if (m.userData.pulso) m.emissiveIntensity = 0.9; E.invalidar(); }

  // ---------- mesa del despiece ----------
  const mesa = new THREE.Group(); mesa.visible = false; mesa.userData.sinNube = true;
  {
    const tablero = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.02, 2.0), E.mat.mesa); tablero.position.set(0.72, EJE_Y - 0.33, 0.36); tablero.receiveShadow = true; mesa.add(tablero);
    const pts = [];
    for (let x = -0.6; x <= 2.05; x += 0.25) pts.push(x, EJE_Y - 0.319, -0.62, x, EJE_Y - 0.319, 1.34);
    for (let z = -0.6; z <= 1.35; z += 0.25) pts.push(-0.62, EJE_Y - 0.319, z, 2.06, EJE_Y - 0.319, z);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const lm = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x2b3036 })); mesa.add(lm); mesa.userData.lineas = lm;
    const ejes = new THREE.BufferGeometry(); ejes.setAttribute('position', new THREE.Float32BufferAttribute([-0.45, EJE_Y, 0, 1.9, EJE_Y, 0, -0.45, EJE_Y, S.bomba.filaB, 1.9, EJE_Y, S.bomba.filaB], 3));
    const le = new THREE.LineSegments(ejes, new THREE.LineDashedMaterial({ color: 0x6f7780, dashSize: 0.05, gapSize: 0.03 })); le.computeLineDistances(); mesa.add(le); mesa.userData.ejes = le;
    E.scene.add(mesa);
  }

  // ---------- rótulos ----------
  const rotTag = S.tags.map((t) => {
    const luz = t.tag === enlaces.tag ? `<i class="luz ${enAlarma.length ? 'alerta' : ''}"></i>` : '';
    const o = E.rotulo(luz + t.tag, `tag ${t.clase}`, t.pos);
    const p = PUNTO.get(t.tag); if (p && estadoPunto(p).clase !== 'ok') o.element.classList.add('alerta');
    if (t.sel) o.element.addEventListener('click', () => A.seleccionar(t.sel, { origen: 'rotulo' }));
    return { ...t, o };
  });
  const rotNum = [];
  for (const [numero, lista] of porNumero) {
    lista.forEach((i, k) => {
      if (lista.length > 3 && k > 0) return;
      const o = E.rotulo(numero, 'num3d' + (i.noMonta ? ' nomonta' : ''), i.ancla, i.obj);
      if (i.noMonta) o.element.title = 'No se monta en esta ejecución';
      o.element.addEventListener('click', () => A.seleccionar({ tipo: 'pieza', numero, inst: lista.length > 1 ? i.id : null }, { origen: 'rotulo' }));
      o.element.addEventListener('pointerenter', () => { est.sobre = i.id; pintar(); });
      o.element.addEventListener('pointerleave', () => { est.sobre = null; pintar(); });
      rotNum.push({ i, o });
    });
  }
  // los rótulos vecinos de una misma fila alternan de altura para no taparse
  for (const fila of [rotNum.filter((r) => r.i.ex.z < 0.4), rotNum.filter((r) => r.i.ex.z >= 0.4)]) {
    fila.sort((a, b) => a.i.centro.x + a.i.ex.x - (b.i.centro.x + b.i.ex.x)).forEach((r, k) => r.o.element.classList.toggle('alto', k % 2 === 1));
  }
  // Los números no se tapan entre sí: después de cada cuadro se proyectan a la pantalla y, cuando dos se pisan, queda
  // el de la pieza más grande (o la elegida). Al acercar la cámara aparecen los demás.
  const vPant = new THREE.Vector3();
  function despejar() {
    if (est.vista !== 'despiece') return;
    const w = E.cont.clientWidth, h = E.cont.clientHeight, puestos = [], cand = [];
    for (const r of rotNum) {
      if (!r.o.visible) continue;
      const el = r.o.element;
      if (!r.ancho) { r.ancho = el.offsetWidth || el.textContent.length * 7 + 12; r.alto = el.offsetHeight || 17; r.sube = -parseFloat(getComputedStyle(el).marginTop) || 26; }
      r.o.getWorldPosition(vPant).project(E.camera);
      const elegido = el.classList.contains('sel') || el.classList.contains('alarma') || el.classList.contains('sobre');
      cand.push({ r, cx: (vPant.x * 0.5 + 0.5) * w, cy: (-vPant.y * 0.5 + 0.5) * h - r.sube, fuera: vPant.z > 1 || vPant.z < -1, p: (elegido ? 1000 : 0) + (r.i.noMonta ? 0 : r.i.radio) });
    }
    cand.sort((a, b) => b.p - a.p);
    for (const c of cand) {
      const x0 = c.cx - c.r.ancho / 2 - 3, x1 = c.cx + c.r.ancho / 2 + 3, y0 = c.cy - c.r.alto / 2 - 2, y1 = c.cy + c.r.alto / 2 + 2;
      const choca = c.fuera || puestos.some((q) => x0 < q[1] && x1 > q[0] && y0 < q[3] && y1 > q[2]);
      c.r.o.element.classList.toggle('tapado', choca);
      if (!choca) puestos.push([x0, x1, y0, y1]);
    }
  }
  E.alDibujar(despejar);
  const llamada = E.rotulo('', 'llamada', V(0, 0, 0)); llamada.visible = false;
  let simulada = true;
  function rotulos() {
    const s = est.sel, modelo = est.vista === 'modelo' && est.mezcla > 0.02, desp = est.vista === 'despiece';
    const corte = lerp(S.limites.X0 - 0.4, S.limites.X1 + 0.4, est.mezcla), todo = est.mezcla >= 0.999;
    for (const r of rotTag) {
      r.o.visible = r.clase === 'estacion' ? est.vista === 'nube' && simulada && est.mezcla < 0.5 && !realActiva()
        : modelo && est.tags && est.f < 0.05 && (todo || r.pos.x < corte);
      r.o.element.classList.toggle('sel', !!r.sel && r.sel.id === s.id && r.sel.tipo === s.tipo);
    }
    for (const r of rotNum) {
      const elegido = s.tipo === 'pieza' && (s.inst ? s.inst === r.i.id : s.numero === r.i.numero);
      r.o.visible = desp && est.f > (est.toma ? 0.985 : 0.5) && (est.numeros || elegido);
      r.o.element.classList.toggle('sel', elegido && !(est.alarma3d && r.i.id === '321-LA'));
      r.o.element.classList.toggle('alarma', est.alarma3d && r.i.id === '321-LA');
    }
    // llamada sobre la pieza elegida dentro del modelo armado
    let obj = null;
    if (est.vista === 'modelo' && est.alarma3d) obj = INST.get('321-LA');
    else if (est.vista === 'modelo' && s.tipo === 'pieza') obj = s.inst ? INST.get(s.inst) : porNumero.get(s.numero)[0];
    llamada.visible = !!obj && est.mezcla > 0.5;
    if (obj) {
      const p = PZ.get(obj.numero);
      llamada.element.className = 'llamada' + (est.alarma3d && obj.id === '321-LA' ? ' alarma' : '');
      llamada.element.innerHTML = `<b>${p.numero}</b>${p.nombre}${obj.detalle && (s.inst || est.alarma3d) ? `<small>${obj.detalle}</small>` : ''}`;
      obj.obj.add(llamada); llamada.position.copy(obj.ancla);
    }
  }

  // ---------- nube de puntos ----------
  // nube=generada simula en el navegador; nube=real y nube=simulada eligen entre las dos nubes; otro valor es una carpeta
  const pNube = q.get('nube'), reservado = !pNube || pNube === 'real' || pNube === 'simulada';
  const carpetaNube = pNube === 'generada' ? null : (reservado ? './data/nube' : pNube).replace(/\/$/, '');
  // La nube real de escáner es opcional: data/nubes.json dice si está (ver tools/nubes.mjs).
  const nubes = await json('./data/nubes.json').catch(() => ({ real: null }));
  let realDisponible = !!(nubes && nubes.real) && reservado;
  let datosNube = carpetaNube ? await cargarNube(carpetaNube) : null;
  const delArchivo = !!datosNube;
  if (!datosNube) {
    const movil = Math.min(window.innerWidth, window.innerHeight) < 700;
    datosNube = simularNube([S.contexto, S.bomba.grupo].concat(), S.estaciones, { densidad: movil ? 2600 : 5200 });
  }
  // la bomba se muestrea solo por fuera: las piezas internas no las ve el escáner
  simulada = datosNube.origen === 'simulada';
  const nube = crearNube(datosNube, S.estaciones);
  E.scene.add(nube);
  const cajaNube = new THREE.Box3(new THREE.Vector3(...datosNube.caja.slice(0, 3)), new THREE.Vector3(...datosNube.caja.slice(3)));
  const plano = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  const { X0, X1 } = S.limites;

  // nube real: se carga solo cuando se pide (son 18,5 MB) y se muestra sola, sin el modelo ni los TAG de PP-101
  let nubeReal = null, datosReal = null, cargaReal = null;
  const aviso = $('#aviso');
  function cargarReal() {
    if (nubeReal || !realDisponible) return Promise.resolve(!!nubeReal);
    if (cargaReal) return cargaReal;
    aviso.textContent = `Cargando la nube de escáner: ${miles(nubes.real.puntos)} puntos, ${String(nubes.real.mb).replace('.', ',')} MB`; aviso.hidden = false;
    cargaReal = cargarNube(`./data/${nubes.real.carpeta}`).then((d) => {
      aviso.hidden = true; cargaReal = null;
      if (!d) { realDisponible = false; if (est.nube === 'real') est.nube = 'simulada'; return false; }
      const tope = Math.min(window.innerWidth, window.innerHeight) < 700 ? 450000 : Infinity; // en celular se dibuja una parte, repartida pareja
      if (d.n > tope) {
        const k = Math.ceil(d.n / tope), n = Math.floor(d.n / k), pos = new Float32Array(n * 3), col = new Uint8Array(n * 3);
        for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) { pos[i * 3 + c] = d.pos[i * k * 3 + c]; col[i * 3 + c] = d.col[i * k * 3 + c]; }
        d = { ...d, n, pos, col, total: d.n };
      }
      datosReal = d; nubeReal = crearNube(d, []);
      nubeReal.material.uniforms.uTam.value = Math.max(0.03, (nubes.real.voxel_m || 0.035) * 1.2);
      E.scene.add(nubeReal); escalaPuntos();
      return true;
    });
    return cargaReal;
  }
  const realActiva = () => est.nube === 'real' && est.vista === 'nube' && !!nubeReal;
  // elige la nube que muestra la vista Nube. La real se muestra sin transición con el modelo: no son la misma sala.
  async function usarNube(cual, o = {}) {
    est.nube = cual === 'real' && realDisponible ? 'real' : 'simulada';
    if (est.nube === 'real') { await cargarReal(); if (est.nube !== 'real') { refrescar(); return false; } } // la carpeta no estaba: se sigue con la simulada
    if (est.vista === 'nube') { if (tM) tM.cancelar(); aplicarMezcla(0); if (est.nube === 'real') pararBarrido(); if (!o.sinCamara) camaraVista(o.instante ? 0 : 1200); }
    refrescar();
    return est.nube === cual;
  }

  function aplicarMezcla(m) {
    est.mezcla = m;
    const x = lerp(X0 - 0.4, X1 + 0.4, m), hayModelo = m > 0.001, hayNube = m < 0.999;
    S.bomba.grupo.visible = hayModelo; S.contexto.visible = hayModelo && est.f < 0.02;
    E.cont.classList.toggle('con-nube', hayNube); // la nube va siempre sobre fondo oscuro, también en el tema claro
    E.renderer.clippingPlanes = hayModelo && hayNube ? [plano] : []; plano.constant = x;
    const real = realActiva();
    nube.visible = hayNube && !real; nube.material.uniforms.uLado.value = hayModelo ? 1 : 0; nube.material.uniforms.uCorte.value = x;
    if (nubeReal) nubeReal.visible = real;
    S.escaneres.visible = hayNube && simulada && est.vista === 'nube' && !real;
    rotulos(); E.invalidar();
  }
  function aplicarDespiece(f) {
    est.f = f; S.bomba.despiezar(f);
    S.contexto.visible = est.mezcla > 0.001 && f < 0.02; mesa.visible = f >= 0.02;
    rotulos(); E.invalidar();
  }
  let tM = null, tF = null, tP = null;
  function irMezcla(a, dur) { if (tM) tM.cancelar(); const de = est.mezcla; if (dur <= 0 || de === a) return aplicarMezcla(a); tM = E.animar({ dur, paso: (k) => aplicarMezcla(lerp(de, a, k)) }); }
  function irDespiece(a, dur) { if (tF) tF.cancelar(); const de = est.f; if (dur <= 0 || de === a) return aplicarDespiece(a); tF = E.animar({ dur, paso: (k) => aplicarDespiece(lerp(de, a, k)) }); }
  function progresoNube(v) { est.progreso = v; nube.material.uniforms.uProg.value = v; E.invalidar(); }
  function barrido(dur = 9000) { // el escáner «levanta» la sala estación por estación
    if (tP) tP.cancelar(); progresoNube(0);
    tP = E.animar({ dur, ease: (t) => t, paso: (k) => progresoNube(k), fin: () => { tP = null; } });
  }
  function pararBarrido() { if (tP) { tP.cancelar(); tP = null; } progresoNube(1); }
  function escalaPuntos() {
    const k = E.cont.clientHeight / (2 * Math.tan(THREE.MathUtils.degToRad(E.camera.fov) / 2)) * E.renderer.getPixelRatio();
    nube.material.uniforms.uEscala.value = k; if (nubeReal) nubeReal.material.uniforms.uEscala.value = k;
  }

  // ---------- cámara ----------
  const ir = (obj, dir, radio, dur) => E.volar(obj.clone().addScaledVector(dir.clone().normalize(), E.distanciaPara(radio)), obj, dur);
  function camaraVista(dur = 1200) {
    if (est.vista === 'modelo') ir(V(0.66, 0.9, -0.05), V(0.36, 0.4, 0.84), 2.05, dur);
    else if (est.vista === 'nube' && realActiva()) {
      const c = new THREE.Vector3((datosReal.caja[0] + datosReal.caja[3]) / 2, 0.6, (datosReal.caja[2] + datosReal.caja[5]) / 2);
      ir(c, V(0.62, 0.52, 0.59), Math.hypot(datosReal.caja[3] - datosReal.caja[0], datosReal.caja[5] - datosReal.caja[2]) * 0.4, dur);
    } else if (est.vista === 'nube') {
      if (datosNube.origen === 'escaner') { const c = cajaNube.getCenter(new THREE.Vector3()); ir(c, V(-0.5, 0.55, 0.67), cajaNube.getSize(new THREE.Vector3()).length() * 0.5, dur); }
      else ir(V(0.6, 1.25, -1.2), V(-0.5, 0.48, 0.72), 4.6, dur);
    } else ir(V(0.74, EJE_Y - 0.04, S.bomba.filaB / 2), V(-0.16, 0.56, 0.81), 1.1, dur);
  }
  const centroDe = (i) => i.centro.clone().addScaledVector(i.ex, est.vista === 'despiece' ? 1 : 0).add(S.bomba.grupo.position);
  function enfocar(sel, dur = 1100) {
    if (sel.tipo !== 'pieza') return;
    const lista = sel.inst ? [INST.get(sel.inst)] : porNumero.get(sel.numero);
    const caja = new THREE.Box3(); let radio = 0;
    for (const i of lista) { caja.expandByPoint(centroDe(i)); radio = Math.max(radio, i.radio); }
    const c = caja.getCenter(new THREE.Vector3()), r = caja.getSize(new THREE.Vector3()).length() / 2 + radio;
    if (est.vista === 'despiece') ir(c, V(-0.16, 0.5, 0.85), Math.max(0.42, r * 2.2), dur);
    else ir(c, V(-0.25, 0.38, 0.89), Math.max(0.82, r * 2.2), dur);
  }

  // ---------- acciones ----------
  function resolver(x) {
    if (x == null) return null;
    const s = String(x).trim(), m = s.toLowerCase();
    if (INST.has(s)) { const i = INST.get(s); return { tipo: 'pieza', numero: i.numero, inst: porNumero.get(i.numero).length > 1 ? i.id : null }; }
    if (PZ.has(s)) return { tipo: 'pieza', numero: s, inst: null };
    const fila = manual.piezas.find((p) => p.fila === s) || manual.piezas.find((p) => p.numero.toLowerCase() === m) || manual.piezas.find((p) => p.numero.startsWith(s + '.'));
    if (fila) return { tipo: 'pieza', numero: fila.numero, inst: null };
    if (S.conjuntos.some((c) => c.id === m)) return { tipo: 'conjunto', id: m };
    if (m === 'bomba' || m === enlaces.tag.toLowerCase()) return { tipo: 'tag', id: enlaces.tag };
    if (PUNTO.has(s.toUpperCase())) return { tipo: 'instrumento', id: s.toUpperCase() };
    return null;
  }
  function seleccionar(sel, o = {}) {
    if (!sel) sel = { tipo: 'tag', id: enlaces.tag };
    est.sel = sel;
    if (sel.tipo === 'instrumento' && PUNTO.has(sel.id)) est.senal = sel.id;
    if (sel.tipo === 'pieza') { // la tendencia que se muestra es la de una señal ligada a la pieza elegida
      const ligadas = pi.puntos.filter((p) => p.pieza_manual === sel.numero && (!sel.inst || sel.inst.endsWith(p.instancia)));
      const otras = (enlaces.piezas.find((p) => p.pieza_manual === sel.numero) || { puntos_pi: [] }).puntos_pi.map((t) => pi.puntos.find((p) => p.tag === t)).filter(Boolean);
      const lista = ligadas.length ? ligadas : otras;
      if (lista.length && !lista.some((p) => p.instrumento === est.senal)) est.senal = lista[0].instrumento;
    }
    if (o.panel) est.panel = o.panel;
    else if (o.origen) est.panel = sel.tipo === 'instrumento' && PUNTO.has(sel.id) ? 'pi' : 'ficha';
    if (o.volar) enfocar(sel, o.instante ? 0 : 1100);
    app.classList.remove('lista-abierta');
    refrescar();
    return true;
  }
  function setVista(v, o = {}) {
    if (!VISTAS.includes(v)) return false;
    const dur = o.instante ? 0 : 1300, conReal = est.nube === 'real' && !!nubeReal && (v === 'nube' || est.vista === 'nube');
    est.vista = v; app.dataset.vista = v;
    if (v === 'nube' && est.nube === 'real' && !nubeReal) cargarReal().then((ok) => { if (est.vista === 'nube') { aplicarMezcla(0); if (ok && !o.sinCamara) camaraVista(0); refrescar(); } });
    if (!o.mantenerMezcla) { est.mezclaManual = false; irMezcla(v === 'nube' ? 0 : 1, conReal ? 0 : dur); }
    irDespiece(v === 'despiece' ? 1 : 0, o.instante ? 0 : 1500);
    if (v !== 'nube') pararBarrido();
    if (!o.sinCamara) { if (est.sel.tipo === 'pieza' && v !== 'nube' && o.enfocar) enfocar(est.sel, dur); else camaraVista(dur); }
    refrescar();
    return true;
  }
  function setPanel(p) { if (!['ficha', 'sap', 'pi'].includes(p)) return false; est.panel = p; refrescar(); return true; }

  // ---------- controles de la vista ----------
  const rotVista = $('#rotulo-vista'), controles = $('#controles');
  function controlesVista() {
    const b = (texto, activo, fn) => { const e = document.createElement('button'); e.type = 'button'; e.className = 'boton chico' + (activo ? ' activo' : ''); e.textContent = texto; e.onclick = fn; return e; };
    controles.innerHTML = ''; rotVista.className = ''; const sim0 = datosNube.origen === 'simulada';
    if (est.vista === 'nube') {
      const sim = datosNube.origen === 'simulada', real = realActiva();
      if (realDisponible) {
        const g = document.createElement('span'); g.className = 'grupo';
        g.append(b('Simulada', est.nube !== 'real', () => usarNube('simulada')), b('Escáner real', est.nube === 'real', () => usarNube('real')));
        controles.append(g);
      }
      rotVista.className = sim && !real ? 'simulada' : '';
      if (real) rotVista.innerHTML = `<b>Nube de escáner láser · levantamiento real de una sala de máquinas</b><span>${miles(datosReal.total || datosReal.n)} puntos${nubes.real.estaciones ? ' · ' + nubes.real.estaciones + ' estaciones' : ''}${nubes.real.sala_m ? ' · sala de ' + nubes.real.sala_m.map((x) => x.toFixed(1).replace('.', ',')).join(' × ') + ' m' : ''}${est.toma ? '' : ' · se muestra sola: el modelo y los TAG de PP-101 no son de esta sala'}</span>`;
      else rotVista.innerHTML = sim ? `<b>Nube simulada desde el modelo</b><span>${miles(datosNube.n)} puntos · ${S.estaciones.length} estaciones de escáner${est.toma ? '' : delArchivo ? ' · leída de data/nube/nube.bin' : ' · generada en el navegador'}</span>`
        : `<b>Nube de escáner láser</b><span>${miles(datosNube.n)} puntos · leída de ${carpetaNube}/nube.bin</span>`;
      controles.append(b('Color', !est.altura, () => { est.altura = false; refrescar(); }), b('Altura', est.altura, () => { est.altura = true; refrescar(); }));
      if (sim && !real) controles.append(b('Repetir barrido', false, () => barrido()));
    } else if (est.vista === 'modelo') {
      rotVista.innerHTML = est.mezclaManual ? `<b>Del levantamiento al modelo</b><span>A un lado la ${sim0 ? 'nube simulada desde el modelo' : 'nube de escáner'}, al otro el modelo con sus TAG</span>`
        : est.corte ? `<b>Bomba en corte por el eje</b><span>Como el dibujo en corte del manual (página ${manual.documento.pagina_corte}). Clic en una pieza para ver su ficha</span>`
        : '<b>Modelo 3D con TAG</b><span>Clic en un equipo, un instrumento o un TAG para ver sus datos</span>';
      if (est.mezclaManual) {
        const l = document.createElement('label'); l.innerHTML = 'Nube <input type="range" min="0" max="100" value="' + Math.round(est.mezcla * 100) + '" aria-label="Mezcla entre nube y modelo"> Modelo';
        l.querySelector('input').oninput = (ev) => { if (tM) tM.cancelar(); aplicarMezcla(ev.target.value / 100); };
        controles.append(l);
      }
      controles.append(b('TAG', est.tags, () => { est.tags = !est.tags; refrescar(); }),
        b('Corte', est.corte, () => { est.corte = !est.corte; if (est.corte) { est.rayosx = false; ir(V(0.2, 0.66, 0), V(0.05, 0.22, 0.97), 0.62, 900); } refrescar(); }),
        b('Rayos X', !est.corte && (est.rayosx || est.sel.tipo === 'pieza'), () => { est.corte = false; est.rayosx = !(est.rayosx || est.sel.tipo === 'pieza'); if (!est.rayosx && est.sel.tipo === 'pieza') est.sel = { tipo: 'tag', id: enlaces.tag }; refrescar(); }));
    } else {
      rotVista.innerHTML = `<b>Despiece según el manual</b><span>${manual.piezas.length} piezas de la ${manual.documento.tabla} · fila del fondo: hidráulica y cierre · fila del frente: eje y cojinetes</span>`;
      const l = document.createElement('label'); l.innerHTML = 'Separación <input type="range" min="0" max="100" value="' + Math.round(est.f * 100) + '" aria-label="Separación del despiece">';
      l.querySelector('input').oninput = (ev) => { if (tF) tF.cancelar(); aplicarDespiece(Math.max(0.03, ev.target.value / 100)); };
      controles.append(l, b('Números', est.numeros, () => { est.numeros = !est.numeros; refrescar(); }));
    }
    // en una toma de grabación el rótulo queda solo donde informa algo: nube, mezcla o despiece
    rotVista.hidden = !!est.toma && est.toma !== 6 && est.vista === 'modelo' && !est.mezclaManual;
    nube.material.uniforms.uModo.value = est.altura ? 1 : 0; if (nubeReal) nubeReal.material.uniforms.uModo.value = est.altura ? 1 : 0;
    for (const e of document.querySelectorAll('#vistas button')) e.classList.toggle('activo', e.dataset.vista === est.vista);
  }

  // ---------- URL ----------
  function sincronizarURL() {
    if (!window.muestra.lista || est.toma) return; // en una toma de grabación la dirección queda como se escribió
    const u = new URLSearchParams();
    for (const k of ['grabar', 'tags', 'color', 'animar']) if (q.get(k)) u.set(k, q.get(k));
    if (!reservado) u.set('nube', pNube); else if (est.nube === 'real' && est.vista === 'nube') u.set('nube', 'real'); else if (realDisponible && est.nube === 'simulada' && (est.paso === 2 || pNube === 'simulada')) u.set('nube', 'simulada');
    if (est.corte && est.vista === 'modelo') u.set('corte', '1');
    if (est.paso) u.set('paso', est.paso);
    u.set('vista', est.vista);
    u.set('tema', est.tema);
    if (est.sel.tipo === 'pieza') u.set('pieza', est.sel.inst || est.sel.numero);
    else if (est.sel.tipo !== 'tag') u.set('pieza', est.sel.id);
    if (est.panel !== 'ficha') u.set('panel', est.panel);
    if (est.evento) u.set('evento', est.evento);
    history.replaceState(null, '', location.pathname + '?' + u.toString().replace(/%2F/g, '/'));
  }
  function refrescar() { pintar(); rotulos(); controlesVista(); paneles.dibujar(); guia.dibujar(); margenesSiCambia(); sincronizarURL(); E.invalidar(); }

  // ---------- tema oscuro o claro ----------
  const lineasPiso = []; S.contexto.traverse((o) => { if (o.isLineSegments) lineasPiso.push(o); });
  function aplicarTema(nombre, o = {}) {
    est.tema = nombre === 'claro' ? 'claro' : 'oscuro';
    const T = TEMA3D[est.tema];
    document.documentElement.dataset.tema = est.tema;
    E.tema(est.tema);
    fantasma.color.set(T.fantasma); fantasma.opacity = T.opFantasma; atenuado.color.set(T.atenuado); atenuado.opacity = T.opAtenuado;
    for (const l of lineasPiso) l.material.color.set(T.piso);
    mesa.userData.lineas.material.color.set(T.mesa); mesa.userData.ejes.material.color.set(T.ejes);
    for (const m of variantes.values()) m.dispose(); variantes.clear(); // el resalte de la selección cambia de color con el tema
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = T.barra;
    const b = $('#btn-tema'); b.textContent = est.tema === 'claro' ? 'Tema oscuro' : 'Tema claro';
    if (o.recordar) { try { localStorage.setItem('muestra-tema', est.tema); } catch { /* sin localStorage: el tema vale solo para esta visita */ } }
    if (window.muestra.lista) refrescar(); else E.invalidar();
    return est.tema;
  }

  // ---------- la aplicación, para los paneles y la guía ----------
  const A = {
    E, S, est, manual, sap, pi, enlaces, PZ, INST, porNumero, MAT, PUNTO, inicioMs, pasoMs, estadoPunto, enAlarma, datosNube,
    seleccionar, setVista, setPanel, refrescar, resolver, enfocar, camaraVista, irMezcla, aplicarMezcla, barrido, pararBarrido, pulso, pintar, rotulos, ir,
    q, pNube, usarNube, cargarReal, realActiva, realDisponible: () => realDisponible, cajaReal: () => datosReal.caja, progresoNube, aplicarDespiece, pulsoFijo,
    margenes: () => margenes(),
  };
  const paneles = crearPaneles(A);
  const guia = crearGuia(A);
  const tomas = crearTomas(A);
  A.guia = guia; A.paneles = paneles; A.tomas = tomas;

  // ---------- selección con el puntero ----------
  const rayo = new THREE.Raycaster(), ndc = new THREE.Vector2(), ayuda = $('#ayuda'), lienzo = E.renderer.domElement;
  function bajoPuntero(ev) {
    const r = lienzo.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    if (est.mezcla < 0.02) return null;
    rayo.setFromCamera(ndc, E.camera);
    const corte = est.mezcla >= 0.999 ? Infinity : plano.constant;
    const enCorte = est.corte && est.vista === 'modelo'; // lo que el plano de corte quitó no se puede seleccionar
    const hits = rayo.intersectObjects([S.bomba.grupo, S.contexto], true).filter((h) => h.object.visible && h.object.userData.sel && h.point.x <= corte && visibleEnArbol(h.object)
      && !(enCorte && h.object.userData.sel.tipo === 'pieza' && h.point.z > 0.001));
    if (!hits.length) return null;
    const piezasActivas = est.vista === 'despiece' || est.rayosx || est.corte || est.sel.tipo === 'pieza';
    const h = hits.find((x) => x.object.material !== fantasma) || hits[0];
    const sel = h.object.userData.sel;
    if (sel.tipo === 'pieza') {
      if (!piezasActivas) return { tipo: 'tag', id: enlaces.tag };
      return { tipo: 'pieza', numero: sel.numero, inst: porNumero.get(sel.numero).length > 1 ? sel.id : null, id: sel.id };
    }
    return sel;
  }
  const visibleEnArbol = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  let abajo = null, pendiente = null;
  lienzo.addEventListener('pointerdown', (ev) => { abajo = { x: ev.clientX, y: ev.clientY }; guia.pausar(); });
  lienzo.addEventListener('pointerup', (ev) => {
    if (!abajo || Math.hypot(ev.clientX - abajo.x, ev.clientY - abajo.y) > 6 || tomas.estado.corriendo) return;
    const s = bajoPuntero(ev);
    if (s) seleccionar(s.tipo === 'pieza' ? { tipo: 'pieza', numero: s.numero, inst: s.inst } : s, { origen: '3d' });
    else if (est.sel.tipo !== 'tag' && est.mezcla > 0.5) seleccionar(null, { origen: '3d' });
  });
  lienzo.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'touch' || ev.buttons) { ayuda.style.display = 'none'; return; }
    pendiente = ev;
  });
  lienzo.addEventListener('pointerleave', () => { pendiente = null; ayuda.style.display = 'none'; if (est.sobre) { est.sobre = null; pintar(); } });
  setInterval(() => {
    if (!pendiente) return; const ev = pendiente; pendiente = null;
    const s = bajoPuntero(ev), id = s ? (s.tipo === 'pieza' ? s.id : s.id) : null;
    lienzo.style.cursor = s ? 'pointer' : '';
    if (id !== est.sobre) { est.sobre = id; pintar(); paneles.sobre(s && s.tipo === 'pieza' ? s.numero : null); for (const r of rotNum) r.o.element.classList.toggle('sobre', r.i.id === id); }
    if (!s) { ayuda.style.display = 'none'; return; }
    const r = $('#escenario').getBoundingClientRect();
    ayuda.innerHTML = s.tipo === 'pieza' ? `<b>${s.numero}</b>${PZ.get(s.numero).nombre}` : s.tipo === 'conjunto' ? manual.conjuntos.find((c) => c.id === s.id).nombre : `<b>${s.id}</b>${paneles.nombreDe(s)}`;
    ayuda.style.display = 'block'; ayuda.style.left = ev.clientX - r.left + 14 + 'px'; ayuda.style.top = ev.clientY - r.top + 14 + 'px';
  }, 60);

  // ---------- barra superior ----------
  for (const e of document.querySelectorAll('#vistas button')) e.onclick = () => { guia.cerrarTodo(); setVista(e.dataset.vista, { enfocar: true }); };
  $('#btn-evento').onclick = () => guia.evento(1);
  $('#btn-pasos').onclick = () => (est.paso ? guia.cerrarPasos() : guia.paso(1));
  $('#btn-lista').onclick = () => app.classList.toggle('lista-abierta');
  $('#btn-tema').onclick = () => aplicarTema(est.tema === 'claro' ? 'oscuro' : 'claro', { recordar: true });
  aplicarTema(est.tema);

  // ---------- márgenes según la disposición ----------
  function margenes() {
    const chico = window.innerWidth <= 860 || app.classList.contains('grabar');
    const abajo = est.paso ? $('#pasos').offsetHeight + 40 : 30, arriba = est.evento ? $('#evento').offsetHeight : 0;
    const grabar = app.classList.contains('grabar'), lat = chico ? 0 : 24;
    const t5 = app.classList.contains('toma-5') && window.innerWidth > 860; // la toma 5 deja libre el ancho de su panel
    E.margenes({ izq: chico ? 0 : $('#izq').offsetWidth + lat, der: t5 ? $('#toma-panel').offsetWidth + 56 : chico ? 0 : $('#der').offsetWidth + lat, abajo: window.innerWidth <= 860 && !grabar ? 0 : est.toma && est.toma !== 6 ? 0 : abajo, arriba });
    escalaPuntos();
    for (const r of rotNum) r.ancho = 0; // los rótulos se vuelven a medir
  }
  let firmaMargen = '';
  function margenesSiCambia() { const f = `${est.paso ? 1 : 0}|${est.evento ? 1 : 0}`; if (f !== firmaMargen) { firmaMargen = f; margenes(); } }
  window.addEventListener('resize', () => { margenes(); paneles.dibujar(); });
  margenes();

  // ---------- estado inicial desde la URL ----------
  const pasoURL = Number(q.get('paso')), eventoURL = Number(q.get('evento')), vistaURL = q.get('vista'), piezaURL = q.get('pieza'), panelURL = q.get('panel');
  const tomaURL = Number(q.get('toma')) >= 1 && Number(q.get('toma')) <= 6 ? Number(q.get('toma')) : 0;
  aplicarMezcla(1); aplicarDespiece(0);
  // si la dirección pide la nube real, se espera a que cargue antes de dar la escena por lista
  if (pNube === 'real' && realDisponible) est.nube = 'real';
  if (realDisponible && pNube !== 'simulada' && (est.nube === 'real' || pasoURL === 2 || tomaURL === 2)) await cargarReal();
  if (est.nube === 'real' && !nubeReal) est.nube = 'simulada';
  if (pasoURL >= 1 && pasoURL <= 6) guia.paso(pasoURL, { instante: true });
  if (VISTAS.includes(vistaURL)) setVista(vistaURL, { instante: true, mantenerMezcla: pasoURL === 3 && vistaURL === 'modelo' });
  else if (!pasoURL) setVista(pNube === 'real' && !tomaURL ? 'nube' : 'modelo', { instante: true }); // nube=real sin más abre la vista Nube
  if (est.corte && est.vista === 'modelo') ir(V(0.2, 0.66, 0), V(0.05, 0.22, 0.97), 0.62, 0);
  if (piezaURL) { const s = resolver(piezaURL); if (s) { seleccionar(s, { instante: true }); if (est.vista !== 'nube') enfocar(s, 0); } }
  if (['ficha', 'sap', 'pi'].includes(panelURL)) setPanel(panelURL);
  if (eventoURL >= 1 && eventoURL <= 4) guia.evento(eventoURL, { instante: true, auto: eventoURL === 1 });
  // animar=1 con vista=despiece: parte con la bomba armada sobre la mesa y la separa sola (para grabar)
  if (q.get('animar') === '1' && est.vista === 'despiece') { aplicarDespiece(0.02); setTimeout(() => irDespiece(1, 4500), 1800); }
  if (tomaURL) await tomas.preparar(tomaURL);

  // ---------- API pública ----------
  Object.assign(window.muestra, {
    vista: (n) => { guia.cerrarTodo(); return setVista(String(n), { enfocar: true }); },
    pieza: (n) => { const s = resolver(n); if (!s) return false; return seleccionar(s, { volar: est.vista !== 'nube', origen: 'api' }); },
    panel: (n) => setPanel(String(n)),
    paso: (n) => guia.paso(Number(n)),
    evento: (n) => guia.evento(n ? Number(n) : 1),
    tema: (nombre, recordar = false) => aplicarTema(String(nombre), { recordar }), // 'oscuro' o 'claro'; con true también lo recuerda
    paleta: () => ({ ...paleta() }),                 // colores vigentes de los gráficos
    nube: (cual) => usarNube(String(cual)),          // 'simulada' o 'real'; devuelve una promesa
    toma: tomas.estado,                              // estado de la toma de grabación en curso
    camara: () => ({ pos: E.camera.position.toArray().map((v) => Number(v.toFixed(4))), obj: E.controls.target.toArray().map((v) => Number(v.toFixed(4))) }),
    tomar: (n) => tomas.iniciar(Number(n)),          // prepara la toma n y la corre
    piezas: () => manual.piezas.map((p) => ({ numero: p.numero, nombre: p.nombre, grupo: p.grupo, fila: p.fila, monta: p.monta !== false, cantidad: porNumero.get(p.numero)?.length || 0, instancias: (porNumero.get(p.numero) || []).map((i) => i.id) })),
    conjuntos: () => manual.conjuntos.map((c) => ({ id: c.id, nombre: c.nombre })),
    estado: () => ({ tema: est.tema, vista: est.vista, seleccion: { ...est.sel }, panel: est.panel, paso: est.paso, evento: est.evento, despiece: est.f, mezcla: est.mezcla, nube: realActiva() ? { activa: 'real', origen: datosReal.origen, puntos: datosReal.total || datosReal.n, deArchivo: true, realDisponible } : { activa: 'simulada', origen: datosNube.origen, puntos: datosNube.n, deArchivo: delArchivo, realDisponible }, toma: est.toma, incoherencias }),
    exportarNube: () => { // devuelve la nube simulada en el formato del contrato (binario en base64)
      const f = est.f; S.bomba.despiezar(0);
      const d = simularNube([S.contexto, S.bomba.grupo], S.estaciones, { densidad: 5200 }); const x = exportarNube(d);
      S.bomba.despiezar(f);
      let s = ''; const B = x.bin; for (let i = 0; i < B.length; i += 0x8000) s += String.fromCharCode.apply(null, B.subarray(i, i + 0x8000));
      return { json: x.json, base64: btoa(s) };
    },
  });
  window.muestra.lista = true;
  refrescar();
  if (tomaURL) tomas.programar();
  $('#cargando').classList.add('fuera');
  setTimeout(() => $('#cargando').remove(), 500);
}

iniciar().catch((e) => {
  const c = document.querySelector('#cargando');
  if (c) c.innerHTML = `<p>No se pudo cargar la muestra. ${e.message}. Abra la página desde un servidor local: <code>python -m http.server</code>.</p>`;
  window.muestra.error = e.message;
  throw e;
});
