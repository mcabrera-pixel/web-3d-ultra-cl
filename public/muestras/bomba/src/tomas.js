// Tomas de grabación: ?toma=1..6. Una por etapa de «Cómo se hace», sin paneles sobre la escena y con un movimiento de
// cámara de 14 segundos que parte y termina quieto. La toma 5 corre el evento de ejemplo completo dentro de ese tiempo.
// La tecla R repite la toma. window.muestra.toma informa { etapa, duracion_s, corriendo, terminada }.
import { V, rad, lerp } from './geo.js';
import { muySuave } from './escena.js';
import { tendencia, num, fecha } from './graficos.js';

const DUR = 14000, ESPERA = 1000;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const entre = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));

export function crearTomas(A) {
  const { E, S, est, pi, sap, manual, enlaces } = A;
  const $ = (s) => document.querySelector(s);
  const app = $('#app'), panel = $('#toma-panel');
  const ev = pi.evento, PIEZA = { tipo: 'pieza', numero: ev.pieza_manual, inst: `${ev.pieza_manual}-${ev.instancia}` }, TAG = { tipo: 'tag', id: enlaces.tag };
  const estado = { etapa: 0, duracion_s: DUR / 1000, corriendo: false, terminada: false, medido_s: null };
  let tarea = null, reloj = null, etapaEv = 0, ordenVista = false;

  // cámara en coordenadas polares alrededor de un punto: az desde +Z hacia +X, el sobre el horizonte, r = radio a encuadrar
  const posicion = (c) => {
    const vertical = E.cont.clientWidth < E.cont.clientHeight; // en una ventana vertical se deja un poco más de aire a los lados
    const az = rad(c.az), el = rad(c.el), d = E.distanciaPara(c.r * (vertical ? 1.15 : 1));
    return c.obj.clone().add(V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(d));
  };
  const mezclar = (a, b, k) => ({ obj: a.obj.clone().lerp(b.obj, k), az: lerp(a.az, b.az, k), el: lerp(a.el, b.el, k), r: lerp(a.r, b.r, k) });
  function camara(c) { E.camera.position.copy(posicion(c)); E.controls.target.copy(c.obj); E.camera.lookAt(c.obj); E.invalidar(); }

  // ---------- las seis tomas: escena inicial, cámara de ida y de llegada, y lo que pasa mientras tanto ----------
  function definir(n) {
    const real = n === 2 && A.realActiva();
    if (n === 1) return {
      de: { obj: V(0.6, 1.05, -1.2), az: -40, el: 27, r: 5.6 }, a: { obj: V(0.55, 0.9, -0.9), az: -14, el: 22, r: 4.3 },
      avanzar: (t) => A.progresoNube(entre(t, 400, 11600)),            // el escáner levanta la sala estación por estación
    };
    if (n === 2 && real) {
      const c = A.cajaReal(), cx = (c[0] + c[3]) / 2, cz = (c[2] + c[5]) / 2, diag = Math.hypot(c[3] - c[0], c[5] - c[2]);
      return { de: { obj: V(cx, 0.4, cz), az: 58, el: 62, r: diag * 0.42 }, a: { obj: V(cx + 1.2, 1.0, cz + 2.5), az: 24, el: 20, r: diag * 0.2 } };
    }
    if (n === 2) return { de: { obj: V(0.6, 1.1, -1.2), az: -34, el: 36, r: 5.0 }, a: { obj: V(0.4, 0.78, -0.15), az: -6, el: 15, r: 1.5 } };
    if (n === 3) return {
      de: { obj: V(0.75, 0.95, -0.4), az: -24, el: 27, r: 3.0 }, a: { obj: V(0.66, 0.9, -0.05), az: 23, el: 24, r: 2.1 },
      avanzar: (t) => A.aplicarMezcla(muySuave(entre(t, 1200, 10800))),   // el modelo avanza sobre la nube
    };
    if (n === 4) return {
      de: { obj: V(0.2, 0.62, 0), az: -18, el: 19, r: 0.66 }, a: { obj: V(0.74, 0.7, S.bomba.filaB / 2), az: -11, el: 31, r: 1.0 },
      avanzar: (t) => A.aplicarDespiece(lerp(0.02, 1, muySuave(entre(t, 1500, 9800)))),   // la bomba se separa en sus piezas
    };
    if (n === 5) return {
      de: { obj: V(0.5, 0.84, 0), az: 23, el: 24, r: 1.7 }, a: { obj: V(0.41, 0.64, 0), az: -14, el: 21, r: 0.74 },
      avanzar: evento,
    };
    return {
      de: { obj: V(0.66, 0.9, -0.05), az: 6, el: 21, r: 2.25 }, a: { obj: V(0.66, 0.88, -0.05), az: 31, el: 25, r: 2.0 },
      avanzar: (t) => { const p = t < 4700 ? 'ficha' : t < 9300 ? 'sap' : 'pi'; if (est.panel !== p) { est.panel = p; A.refrescar(); } },   // la plataforma: ficha, mantenimiento y operación
    };
  }

  // ---------- escena de partida de cada toma ----------
  async function preparar(n) {
    n = n | 0; if (n < 1 || n > 6) return false;
    detener();
    A.guia.cerrarTodo();
    estado.etapa = n; estado.corriendo = false; estado.terminada = false; est.toma = n;
    app.classList.add('toma', `toma-${n}`); for (let k = 1; k <= 6; k++) if (k !== n) app.classList.remove(`toma-${k}`);
    app.classList.toggle('grabar', n !== 6); app.classList.toggle('limpio', n !== 6);
    est.rayosx = false; est.corte = false; est.mezclaManual = false; est.alarma3d = false; est.tags = true; est.numeros = true; est.cursorEvento = null; est.altura = A.q.get('color') === 'altura';
    A.pulso(false); est.sel = TAG; est.panel = 'ficha'; est.senal = 'VT-101A'; est.dias = 7; panel.hidden = n !== 5;
    if (n === 1) { est.nube = 'simulada'; A.setVista('nube', { instante: true, sinCamara: true }); A.progresoNube(0); }
    if (n === 2) {
      est.nube = A.realDisponible() && A.pNube !== 'simulada' ? 'real' : 'simulada';
      if (est.nube === 'real') await A.cargarReal();
      A.setVista('nube', { instante: true, sinCamara: true }); A.pararBarrido();
    }
    if (n === 3) { est.nube = 'simulada'; A.pararBarrido(); A.setVista('modelo', { instante: true, sinCamara: true, mantenerMezcla: true }); est.mezclaManual = true; A.aplicarMezcla(0); }
    if (n === 4) { A.setVista('despiece', { instante: true, sinCamara: true }); A.aplicarDespiece(0.02); }
    if (n === 5) { A.setVista('modelo', { instante: true, sinCamara: true }); est.sel = { tipo: 'instrumento', id: 'VT-101A' }; armarPanel(); }
    if (n === 6) A.setVista('modelo', { instante: true, sinCamara: true });
    A.margenes(); A.refrescar();
    const d = definir(n); E.cancelarVuelo(); camara(d.de); if (d.avanzar) d.avanzar(0);
    return true;
  }

  function detener() { clearTimeout(reloj); reloj = null; if (tarea) { tarea.cancelar(); tarea = null; } E.controls.enabled = true; estado.corriendo = false; }

  // corre el movimiento: 14 s exactos, con partida y llegada suaves
  function correr() {
    const n = estado.etapa; if (!n) return false;
    detener();
    const d = definir(n), t0 = performance.now(); estado.corriendo = true; estado.terminada = false; estado.medido_s = null; E.controls.enabled = false;
    camara(d.de); if (d.avanzar) d.avanzar(0);
    tarea = E.animar({
      dur: DUR, ease: (t) => t,
      paso: (_, t) => { camara(mezclar(d.de, d.a, muySuave(t))); if (d.avanzar) d.avanzar(t * DUR); },
      fin: () => { tarea = null; camara(d.a); if (d.avanzar) d.avanzar(DUR); E.controls.enabled = true; estado.corriendo = false; estado.terminada = true; estado.medido_s = Number(((performance.now() - t0) / 1000).toFixed(2)); if (n === 5) A.pulsoFijo(); },
    });
    return true;
  }
  async function iniciar(n, o = {}) {
    if (!(await preparar(n))) return false;
    reloj = setTimeout(correr, o.espera ?? ESPERA);
    return true;
  }
  window.addEventListener('keydown', (e) => { if (est.toma && (e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) iniciar(est.toma, { espera: 600 }); });

  // ---------- toma 5: el evento de ejemplo, con la señal, la pieza, el aviso, la orden y el repuesto a la vista ----------
  const n = pi.puntos[0].valores.length, punto = A.PUNTO.get('VT-101A');
  const desde = n - 1 - Math.round((7 * 86400e3) / A.pasoMs), i0 = desde + Math.round((n - 1 - desde) * 0.3);
  function armarPanel() {
    const aviso = sap.avisos.find((a) => a.QMNUM === ev.aviso), orden = sap.ordenes.find((o) => o.AUFNR === ev.orden);
    const pz = A.PZ.get(ev.pieza_manual), inst = A.INST.get(PIEZA.inst), m = A.MAT.get(ev.pieza_manual), st = m.stock;
    panel.innerHTML = `
      <div class="tp-cab"><b>Evento de ejemplo</b><span class="ejemplo">Datos de ejemplo</span></div>
      <section class="tp-tarjeta visible" data-n="1">
        <h4><i>1</i>Operación · PI</h4>
        <div class="tp-fila"><span><b class="mono">${punto.instrumento}</b> ${esc(punto.descripcion)}</span><span class="tp-valor"><b id="tp-val"></b><small>${esc(punto.unidad)}</small></span></div>
        <canvas id="tp-lienzo"></canvas>
        <div class="tp-pie" id="tp-estado"></div>
      </section>
      <section class="tp-tarjeta" data-n="2">
        <h4><i>2</i>Modelo 3D · pieza del manual</h4>
        <div class="tp-fila"><span><b class="mono tp-num">${esc(pz.numero)}</b> ${esc(pz.nombre)}</span><span class="tp-pie">${esc(inst.detalle)}</span></div>
      </section>
      <section class="tp-tarjeta" data-n="3">
        <h4><i>3</i>Mantenimiento · SAP</h4>
        <div class="tp-doc"><span class="tp-pie">Aviso</span><b class="mono">${aviso.QMNUM}</b><span>${esc(aviso.QMTXT)}</span><span class="tp-pie">${fecha(aviso.QMDAT)} ${aviso.MZEIT} · prioridad ${esc(aviso.prioridad.toLowerCase())}</span></div>
        <div class="tp-doc tp-orden"><span class="tp-pie">Orden</span><b class="mono">${orden.AUFNR}</b><span>${esc(orden.KTEXT)}</span><span class="tp-pie">Programada ${fecha(orden.GSTRP)} · ${num(orden.horas, 0)} h · ${esc(orden.ARBPL)}</span></div>
      </section>
      <section class="tp-tarjeta" data-n="4">
        <h4><i>4</i>Repuesto · SAP</h4>
        <div class="tp-doc"><span class="tp-pie">Material</span><b class="mono">${m.MATNR}</b><span>${esc(m.MAKTX)}</span><span class="tp-pie">${esc(st.LGOBE)} · ubicación ${esc(st.LGPBE)}</span></div>
        <div class="tp-stock"><div><b>${st.LABST}</b><span>en stock</span></div><div><b>${st.reservado}</b><span>reservados para la orden</span></div><div><b>${st.LABST - st.reservado}</b><span>disponibles</span></div></div>
      </section>`;
    etapaEv = 0; ordenVista = false; ultimoCursor = -1;
  }
  let ultimoCursor = -1;
  function evento(t) {
    // 1. la tendencia se dibuja y cruza el umbral
    const cur = Math.round(i0 + (n - 1 - i0) * entre(t, 300, 4200));
    if (cur !== ultimoCursor) {
      ultimoCursor = cur;
      const c = document.getElementById('tp-lienzo');
      if (c) tendencia(c, { valores: punto.valores, inicioMs: A.inicioMs, pasoMs: A.pasoMs, desde, hasta: n - 1, limites: punto.limites, dec: punto.decimales, hastaDibujo: cur, fuente: 13, marca: { i: ev.indice_cruce, texto: 'Cruza el umbral' } });
      const e = A.estadoPunto(punto, cur), v = document.getElementById('tp-val'), s = document.getElementById('tp-estado');
      if (v) v.textContent = num(punto.valores[cur], punto.decimales);
      if (s) { s.textContent = `${e.texto} · umbral de alarma alta en ${num(punto.limites.H, 1)} ${punto.unidad}`; s.classList.toggle('alerta', e.clase !== 'ok'); }
    }
    // 2 a 4. pieza en el 3D, aviso y orden, repuesto
    const etapa = t < 4400 ? 1 : t < 7700 ? 2 : t < 10900 ? 3 : 4;
    if (etapa !== etapaEv) {
      etapaEv = etapa;
      for (const s of panel.querySelectorAll('.tp-tarjeta')) { s.classList.toggle('visible', Number(s.dataset.n) <= etapa); s.classList.toggle('activa', Number(s.dataset.n) === etapa); }
      est.alarma3d = etapa >= 2; A.pulso(est.alarma3d);
      est.sel = etapa >= 2 ? { ...PIEZA } : { tipo: 'instrumento', id: 'VT-101A' };
      A.pintar(); A.rotulos();
    }
    const orden = t >= 9300;
    if (orden !== ordenVista) { ordenVista = orden; const o = panel.querySelector('.tp-orden'); if (o) o.classList.toggle('visible', orden); }
  }

  const programar = (espera = ESPERA) => { clearTimeout(reloj); reloj = setTimeout(correr, espera); };
  return { preparar, correr, iniciar, programar, detener, estado };
}
