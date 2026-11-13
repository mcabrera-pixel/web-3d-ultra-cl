// Los dos recorridos guiados: el evento de ejemplo (PI → 3D → SAP → repuesto) y «Cómo se hace» (seis etapas).
import { V } from './geo.js';

export function crearGuia(A) {
  const { est, pi, sap, enlaces } = A;
  const $ = (s) => document.querySelector(s);
  const app = $('#app'), cajaEv = $('#evento'), listaEv = $('#ev-pasos'), cajaPasos = $('#pasos'), nav = $('#pasos-nav'), cuerpoP = $('#pasos-cuerpo');
  const ev = pi.evento, PIEZA = { tipo: 'pieza', numero: ev.pieza_manual, inst: `${ev.pieza_manual}-${ev.instancia}` };
  const n = pi.puntos[0].valores.length;

  // ================= evento de ejemplo =================
  const EV = [
    { k: 'Operación', t: 'La vibración sube en PI', d: 'El rodamiento del lado acoplamiento cruza el umbral de alarma', dur: 7000 },
    { k: 'Modelo 3D', t: `Se destaca la pieza ${ev.pieza_manual}`, d: 'El gemelo ubica el rodamiento dentro de la bomba', dur: 5500 },
    { k: 'Mantenimiento', t: 'Aviso y orden en SAP', d: `El aviso ${ev.aviso} da origen a la orden ${ev.orden}`, dur: 6500 },
    { k: 'Repuesto', t: 'Repuesto con su stock', d: 'La ficha muestra el material, la bodega y la reserva', dur: 0 },
  ];
  let reloj = null, anim = null, auto = false;
  const limpiar = () => { clearTimeout(reloj); reloj = null; if (anim) { anim.cancelar(); anim = null; } est.cursorEvento = null; };
  function pausar() { if (!auto) return; auto = false; clearTimeout(reloj); reloj = null; if (anim) { anim.cancelar(); anim = null; est.cursorEvento = null; A.paneles.dibujarGrafico(); } cajaEv.classList.add('pausa'); }

  function evento(etapa = 1, o = {}) {
    etapa = Math.max(1, Math.min(4, etapa | 0 || 1));
    limpiar();
    if (est.paso) { est.paso = 0; cajaPasos.hidden = true; app.classList.remove('con-pasos'); }
    A.pararBarrido();
    est.corte = false;
    auto = o.auto ?? true; est.evento = etapa; cajaEv.hidden = false; cajaEv.classList.toggle('pausa', !auto);
    const inst = !!o.instante, i321 = A.INST.get(PIEZA.inst);
    if (est.vista !== 'modelo' || est.mezcla < 1) A.setVista('modelo', { instante: inst, sinCamara: true });
    est.alarma3d = etapa >= 2; A.pulso(est.alarma3d);
    est.senal = 'VT-101A'; est.dias = 7;
    if (etapa === 1) {
      est.sel = { tipo: 'instrumento', id: 'VT-101A' }; est.panel = 'pi';
      A.ir(V(0.36, 0.78, 0.0), V(-0.25, 0.38, 0.89), 0.95, inst ? 0 : 1200);
      const desde = n - 1 - Math.round((7 * 86400e3) / A.pasoMs), i0 = desde + Math.round((n - 1 - desde) * 0.35);
      if (auto) { est.cursorEvento = i0; anim = A.E.animar({ dur: 5200, ease: (t) => t, paso: (k) => { est.cursorEvento = Math.round(i0 + (n - 1 - i0) * k); A.paneles.dibujarGrafico(); }, fin: () => { est.cursorEvento = null; anim = null; A.paneles.dibujarGrafico(); } }); }
    } else {
      est.sel = { ...PIEZA };
      if (etapa === 2) { if (est.panel === 'ficha') est.panel = 'pi'; }
      if (etapa === 3) { est.panel = 'sap'; est.ordenes = 'programadas'; }
      if (etapa === 4) est.panel = 'ficha';
      A.ir(i321.centro.clone().add(A.S.bomba.grupo.position), V(-0.25, 0.38, 0.89), 0.72, inst ? 0 : 1300);
    }
    A.refrescar();
    if (etapa === 3) { setTimeout(() => A.paneles.mostrar(`[data-aviso="${ev.aviso}"]`), 60); if (auto) setTimeout(() => est.evento === 3 && A.paneles.mostrar(`[data-orden="${ev.orden}"]`), 3200); }
    if (etapa === 4) setTimeout(() => A.paneles.mostrar('.tarjeta.destaca'), 60);
    if (auto && EV[etapa - 1].dur) reloj = setTimeout(() => evento(etapa + 1, { auto: true }), EV[etapa - 1].dur);
    return true;
  }
  function cerrarEvento() {
    if (!est.evento) return;
    limpiar(); auto = false; est.evento = 0; est.alarma3d = false; A.pulso(false); cajaEv.hidden = true;
  }
  listaEv.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) evento(Number(li.dataset.n), { auto: false }); });
  $('#ev-cerrar').onclick = () => { cerrarEvento(); A.seleccionar({ tipo: 'tag', id: enlaces.tag }, { panel: 'ficha' }); A.camaraVista(); };

  // ================= cómo se hace =================
  const PASOS = [
    { t: 'Levantamiento con escáner láser',
      p: 'Un escáner láser sobre trípode recorre la sala. En cada estación mide millones de puntos en pocos minutos, con la planta en operación.',
      l: [`${A.S.estaciones.length} estaciones para esta sala de bombas`, 'Se mide sin detener ni tocar los equipos', 'Cada punto queda con su posición y su color'] },
    { t: 'Nube de puntos registrada',
      p: 'Las estaciones se unen en una sola nube, en coordenadas de planta. Sobre ella ya se puede medir y revisar interferencias.',
      l: ['Una sola nube para toda el área levantada', 'Se ve con su color o por altura', 'Es el respaldo de todo lo que se modela después'] },
    { t: 'Modelo 3D',
      p: 'Sobre la nube se modela cada equipo, cañería y válvula, y a cada uno se le asigna su TAG de terreno.',
      l: ['El modelo calza con la nube: mueva el control para comparar', 'Cada objeto se selecciona por su TAG', 'Se modela lo que hay que operar y mantener'] },
    { t: 'Despiece según el manual',
      p: 'Los equipos críticos se despiezan siguiendo el manual de partes del fabricante. Cada pieza conserva su número y su denominación.',
      l: [`${A.manual.piezas.length} piezas de la ${A.manual.documento.tabla} del manual`, 'La ficha indica la página donde aparece cada pieza', 'Sirve para planificar el desarme y pedir repuestos'] },
    { t: 'Conexión con SAP y PI',
      p: 'Una tabla de llaves une el TAG con el equipo de SAP, los puntos de PI y las piezas del manual. Así cada pieza muestra su repuesto, su stock y sus señales.',
      l: ['La plataforma solo lee: no escribe en SAP ni en PI', 'Las consultas pasan por un intermediario seguro', 'En esta muestra los datos son de ejemplo'] },
    { t: 'Plataforma web',
      p: 'El resultado es una página web. Se abre con un enlace desde el computador o el celular, sin instalar programas.',
      l: ['Tres vistas del mismo activo', 'Mantenimiento y operación al lado del 3D', 'Cada escena tiene su propio enlace para compartir'] },
  ];
  function paso(k, o = {}) {
    k = k | 0; if (k < 1 || k > 6) return false;
    cerrarEvento();
    est.paso = k; cajaPasos.hidden = false; app.classList.add('con-pasos');
    const inst = !!o.instante, dur = inst ? 0 : 1300, TAG = { tipo: 'tag', id: enlaces.tag };
    est.mezclaManual = false; est.rayosx = false; est.corte = false; est.numeros = window.innerWidth > 860; est.tags = true;
    if (k === 1) { est.sel = TAG; est.altura = false; est.nube = 'simulada'; A.setVista('nube', { instante: inst }); if (A.datosNube.origen === 'simulada') A.barrido(10000); }
    if (k === 2) { // la nube registrada es la del escáner real, cuando está; si no, la simulada
      est.sel = TAG; const real = A.realDisponible() && A.pNube !== 'simulada';
      est.nube = real ? 'real' : 'simulada';
      A.setVista('nube', { instante: inst, sinCamara: true }); A.pararBarrido();
      if (real) A.usarNube('real', { instante: inst }); else if (A.datosNube.origen === 'simulada') A.ir(V(0.45, 0.85, -0.5), V(-0.42, 0.3, 0.85), 2.5, dur); else A.camaraVista(dur);
    }
    if (k === 3) { est.sel = TAG; est.nube = 'simulada'; A.pararBarrido(); A.setVista('modelo', { instante: inst, sinCamara: true, mantenerMezcla: true }); est.mezclaManual = true; A.irMezcla(0.5, dur); A.ir(V(0.75, 0.95, -0.35), V(-0.3, 0.44, 0.85), 2.5, dur); }
    if (k === 4) { est.sel = TAG; est.panel = 'ficha'; A.setVista('despiece', { instante: inst }); }
    if (k === 5) { est.sel = { ...PIEZA }; est.panel = 'ficha'; A.setVista('modelo', { instante: inst, sinCamara: true }); A.enfocar(est.sel, dur); }
    if (k === 6) { est.sel = TAG; est.panel = 'sap'; A.setVista('modelo', { instante: inst }); }
    A.refrescar();
    if (k === 5) setTimeout(() => A.paneles.mostrar('.llaves'), 80);
    return true;
  }
  function cerrarPasos() { if (!est.paso) return; est.paso = 0; cajaPasos.hidden = true; app.classList.remove('con-pasos'); est.mezclaManual = false; A.pararBarrido(); if (est.mezcla > 0 && est.mezcla < 1) A.irMezcla(est.vista === 'nube' ? 0 : 1, 600); A.refrescar(); }
  nav.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) paso(Number(li.dataset.n)); });
  $('#pasos-cerrar').onclick = cerrarPasos;
  cuerpoP.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.ir) paso(Number(b.dataset.ir)); else if (b.dataset.accion === 'evento') evento(1);
  });
  function cerrarTodo() { cerrarEvento(); if (est.paso) { est.paso = 0; cajaPasos.hidden = true; app.classList.remove('con-pasos'); est.mezclaManual = false; A.pararBarrido(); } }

  function dibujar() {
    $('#btn-pasos').classList.toggle('activo', !!est.paso);
    if (est.evento) listaEv.innerHTML = EV.map((x, i) => `<li data-n="${i + 1}" class="${i + 1 < est.evento ? 'hecho' : i + 1 === est.evento ? 'activo' : ''}"><div class="k"><i>${i + 1}</i>${x.k}</div><div class="t">${x.t}</div><div class="d">${x.d}</div></li>`).join('');
    if (est.evento) listaEv.querySelectorAll('li').forEach((li, i) => li.style.setProperty('--dur', `${EV[i].dur || 1}ms`)); // por CSSOM: sin estilos en línea
    if (est.paso) {
      const x = PASOS[est.paso - 1];
      nav.innerHTML = PASOS.map((y, i) => `<li data-n="${i + 1}" class="${i + 1 === est.paso ? 'activo' : ''}"><i>${i + 1}</i>${y.t}</li>`).join('');
      cuerpoP.innerHTML = `<h3>${est.paso}. ${x.t}</h3><p>${x.p}</p><ul>${x.l.map((y) => `<li>${y}</li>`).join('')}</ul>
        <div class="pie-paso"><span>Etapa ${est.paso} de 6</span>${est.paso === 5 ? '<button class="boton chico primario" data-accion="evento">Reproducir el evento de ejemplo</button>' : ''}
        ${est.paso > 1 ? `<button class="boton chico" data-ir="${est.paso - 1}">Anterior</button>` : ''}${est.paso < 6 ? `<button class="boton chico activo" data-ir="${est.paso + 1}">Siguiente</button>` : ''}</div>`;
      const act = nav.querySelector('.activo'); if (act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  }
  return { evento, paso, pausar, cerrarEvento, cerrarPasos, cerrarTodo, dibujar };
}
