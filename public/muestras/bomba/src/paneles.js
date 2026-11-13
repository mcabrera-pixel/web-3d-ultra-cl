// Paneles de la interfaz: árbol del activo y lista de piezas (izquierda); ficha, mantenimiento (SAP) y operación (PI) (derecha).
import { tendencia, chispa, num, fecha, fechaHora } from './graficos.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function crearPaneles(A) {
  const { est, manual, sap, pi, enlaces, PZ, INST, porNumero, MAT, PUNTO } = A;
  const $ = (s) => document.querySelector(s);
  const cab = $('#der-cab'), cuerpo = $('#der-cuerpo'), lista = $('#lista'), arbol = $('#arbol'), filtro = $('#filtro');
  const TAG = enlaces.tag, eq = sap.equipo, doc = manual.documento;
  const n = pi.puntos[0].valores.length;

  // ---------- consultas sobre los datos ----------
  const avisosDe = (numero) => sap.avisos.filter((a) => a.abierto && a.pieza_manual === numero);
  const ordenesDe = (numero) => sap.ordenes.filter((o) => o.estado !== 'CTEC' && o.componentes.some((c) => c.pieza_manual === numero));
  function ultimoCambio(numero) {
    const l = sap.ordenes.filter((o) => o.estado === 'CTEC' && o.componentes.some((c) => c.pieza_manual === numero)).sort((a, b) => (a.IDAT2 < b.IDAT2 ? 1 : -1));
    return l[0] || null;
  }
  const posLista = (numero) => sap.lista_materiales.posiciones.find((p) => p.pieza_manual === numero);
  const enlace = (numero) => enlaces.piezas.find((p) => p.pieza_manual === numero);
  const ultimo = (p) => p.valores[n - 1];
  const txt = (grupo, clave) => (sap.textos[grupo] && sap.textos[grupo][clave]) || clave;
  const pz = (numero, inst) => `<span class="pz" data-pieza="${esc(inst || numero)}" title="${esc(PZ.get(numero)?.nombre || '')}">${esc(numero)}</span>`;
  const paginas = (p) => `p. ${p.pagina_despiece} (${doc.ilustracion})${p.pagina_tabla !== p.pagina_despiece ? ` y p. ${p.pagina_tabla} (${doc.tabla})` : ` y ${doc.tabla}`}`;
  function nombreDe(sel) {
    if (sel.tipo === 'tag') return sel.id === TAG ? enlaces.descripcion : 'Bomba de respaldo';
    if (sel.tipo === 'instrumento') return PUNTO.get(sel.id)?.descripcion || 'Instrumento';
    if (sel.tipo === 'valvula') return enlaces.valvulas.find((v) => v.tag === sel.id)?.descripcion || 'Válvula';
    if (sel.tipo === 'conjunto') return manual.conjuntos.find((c) => c.id === sel.id)?.nombre || '';
    return '';
  }

  // ---------- izquierda: árbol y lista ----------
  function dibujarArbol() {
    const s = est.sel, es = (t, id) => (s.tipo === t && s.id === id ? ' sel' : '');
    arbol.innerHTML = `
      <button class="nodo${es('tag', TAG)}" data-tag="${TAG}"><i class="luz ${A.enAlarma.length ? 'alerta' : ''}"></i><b>${TAG}</b>${esc(enlaces.descripcion)}</button>
      <button class="nodo hijo${est.vista === 'despiece' ? ' sel' : ''}" data-vista="despiece">Bomba<span class="der">${manual.piezas.length} piezas</span></button>
      ${manual.conjuntos.map((c) => `<button class="nodo hijo${es('conjunto', c.id)}" data-conjunto="${c.id}">${esc(c.nombre)}</button>`).join('')}
      <button class="nodo${es('tag', 'PP-102')}" data-tag="PP-102"><i class="luz gris"></i><b>PP-102</b>Respaldo</button>`;
  }
  arbol.addEventListener('click', (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    A.guia.cerrarTodo();
    if (b.dataset.vista) { A.seleccionar({ tipo: 'tag', id: TAG }, { panel: 'ficha' }); A.setVista('despiece'); }
    else if (b.dataset.tag) { if (est.vista !== 'modelo') A.setVista('modelo'); A.seleccionar({ tipo: 'tag', id: b.dataset.tag }, { origen: 'arbol' }); }
    else if (b.dataset.conjunto) { if (est.vista !== 'modelo') A.setVista('modelo'); A.seleccionar({ tipo: 'conjunto', id: b.dataset.conjunto }, { origen: 'arbol' }); }
  });
  function construirLista() {
    const f = filtro.value.trim().toLowerCase();
    let html = '';
    for (const g of manual.grupos) {
      const filas = manual.piezas.filter((p) => p.grupo === g && (!f || p.numero.toLowerCase().includes(f) || p.nombre.toLowerCase().includes(f) || p.fila.toLowerCase().includes(f)));
      if (!filas.length) continue;
      html += `<h4>${esc(g)}</h4>` + filas.map((p) => `<button class="fila${p.monta === false ? ' nomonta' : ''}" data-pieza="${esc(p.numero)}"${p.monta === false ? ' title="No se monta en esta ejecución"' : ''}><span class="num">${esc(p.numero)}</span><span class="nom">${esc(p.nombre)}${p.monta === false ? '<small>No se monta en esta ejecución</small>' : ''}</span>${avisosDe(p.numero).length ? '<i class="punto" title="Tiene un aviso abierto"></i>' : ''}<span class="cant">${p.monta !== false && porNumero.get(p.numero).length > 1 ? '× ' + porNumero.get(p.numero).length : ''}</span></button>`).join('');
    }
    lista.innerHTML = html || '<p class="vacio">Ninguna pieza coincide con la búsqueda.</p>';
    marcarLista();
  }
  function marcarLista() {
    for (const e of lista.querySelectorAll('.fila')) e.classList.toggle('sel', est.sel.tipo === 'pieza' && est.sel.numero === e.dataset.pieza);
  }
  function sobre(numero) { for (const e of lista.querySelectorAll('.fila')) e.classList.toggle('sobre', e.dataset.pieza === numero); }
  filtro.addEventListener('input', construirLista);
  lista.addEventListener('click', (ev) => {
    const b = ev.target.closest('.fila'); if (!b) return;
    A.guia.cerrarTodo();
    A.seleccionar(A.resolver(b.dataset.pieza), { origen: 'lista', volar: est.vista !== 'nube' });
  });

  // ---------- derecha: cabecera ----------
  function cabecera() {
    const s = est.sel; let sobret = '', cod = '', nom = '', chips = [];
    if (s.tipo === 'pieza') {
      const p = PZ.get(s.numero), i = s.inst ? INST.get(s.inst) : null;
      sobret = `Pieza del manual · ${p.grupo}`; cod = p.numero; nom = p.nombre;
      if (p.monta === false) chips.push('<span class="chip alerta">No se monta en esta ejecución</span>');
      else chips.push(`<span class="chip">${i ? esc(i.detalle || i.id) : porNumero.get(p.numero).length > 1 ? porNumero.get(p.numero).length + ' en la bomba' : 'Una en la bomba'}</span>`);
      for (const a of avisosDe(p.numero)) if (!a.instancia || !s.inst || s.inst.endsWith(a.instancia)) chips.push(`<span class="chip alerta">Aviso ${a.QMNUM} abierto</span>`);
    } else if (s.tipo === 'tag' && s.id === TAG) {
      sobret = 'Equipo · TAG de terreno'; cod = TAG; nom = enlaces.descripcion;
      chips.push(ultimo(PUNTO.get('FIT-101')) > 1 ? '<span class="chip ok">En marcha</span>' : '<span class="chip">Detenida</span>');
      if (A.enAlarma.length) chips.push(`<span class="chip lleno">${A.enAlarma.length === 1 ? '1 alarma activa' : A.enAlarma.length + ' alarmas activas'}</span>`);
      chips.push(`<span class="chip">Criticidad ${eq.ABCKZ}</span>`);
    } else if (s.tipo === 'tag') {
      sobret = 'Equipo · TAG de terreno'; cod = s.id; nom = 'Bomba de respaldo'; chips.push('<span class="chip">Detenida, en reserva</span>');
    } else if (s.tipo === 'conjunto') {
      const c = manual.conjuntos.find((x) => x.id === s.id);
      sobret = `Conjunto de ${TAG} · fuera de la numeración del manual`; cod = c.nombre; nom = '';
    } else if (s.tipo === 'instrumento') {
      const p = PUNTO.get(s.id), e = A.estadoPunto(p);
      sobret = 'Instrumento · punto de PI'; cod = s.id; nom = p.descripcion; chips.push(`<span class="chip ${e.clase}">${e.texto}</span>`);
    } else { sobret = 'Válvula'; cod = s.id; nom = nombreDe(s); }
    cab.innerHTML = `<div class="sobretit">${esc(sobret)}</div><div class="tit"><b>${esc(cod)}</b><span>${esc(nom)}</span></div><div class="chips">${chips.join('')}</div>`;
    for (const b of document.querySelectorAll('#pestanas button')) b.classList.toggle('activo', b.dataset.panel === est.panel);
  }

  // ---------- bloques comunes ----------
  const kv = (pares) => `<dl class="kv">${pares.filter(Boolean).map(([k, v, sm]) => `<dt>${esc(k)}</dt><dd>${v}${sm ? `<small>${sm}</small>` : ''}</dd>`).join('')}</dl>`;
  function tarjetaAviso(a) {
    return `<div class="tarjeta${est.evento === 3 && a.del_evento ? ' destaca' : ''}" data-aviso="${a.QMNUM}">
      <div class="t1"><b>${a.QMNUM}</b><span>${esc(txt('QMART', a.QMART))}</span><span class="fecha">${fecha(a.QMDAT)} ${a.MZEIT}</span></div>
      <div class="t2">${esc(a.QMTXT)}</div>
      <div class="t3"><span class="chip ${a.PRIOK <= '2' ? 'alerta' : ''}">Prioridad ${esc(a.prioridad.toLowerCase())}</span><span class="chip">${esc(txt('estado', a.estado))}</span>${pz(a.pieza_manual, a.instancia ? a.pieza_manual + '-' + a.instancia : null)}${a.AUFNR ? `<span>Orden <b class="mono">${a.AUFNR}</b></span>` : '<span>Sin orden</span>'}</div>
      ${a.del_evento ? `<div class="t3">${esc(a.texto_largo)}</div>` : ''}</div>`;
  }
  function tarjetaOrden(o, detalle) {
    const comp = o.componentes.filter((c) => c.pieza_manual).map((c) => pz(c.pieza_manual)).join('');
    return `<div class="tarjeta${est.evento === 3 && o.del_evento ? ' destaca' : ''}" data-orden="${o.AUFNR}">
      <div class="t1"><b>${o.AUFNR}</b><span>${esc(txt('AUART', o.AUART))}</span><span class="fecha">${o.estado === 'CTEC' ? fecha(o.IDAT2) : 'Programada ' + fecha(o.GSTRP)}</span></div>
      <div class="t2">${esc(o.KTEXT)}</div>
      <div class="t3"><span class="chip ${o.estado === 'LIB.' ? 'ok' : ''}">${esc(txt('estado', o.estado))}</span><span>${esc(o.ARBPL)} · ${num(o.horas, 1)} h</span>${o.QMNUM ? `<span>Aviso <b class="mono">${o.QMNUM}</b></span>` : ''}</div>
      ${comp ? `<div class="t3"><span>Repuestos:</span>${comp}</div>` : ''}
      ${detalle && o.operaciones ? `<table class="tabla mt7"><tbody>${o.operaciones.map((x) => `<tr><td class="mono">${x.VORNR}</td><td>${esc(x.LTXA1)}</td><td class="d">${num(x.ARBEI, 1)} h</td></tr>`).join('')}</tbody></table>` : ''}</div>`;
  }
  function bloqueLlaves(numero) {
    const filas = [['TAG de terreno', TAG], ['Equipo SAP', eq.EQUNR], ['Ubicación técnica', eq.TPLNR]];
    if (numero) {
      const m = MAT.get(numero), pos = posLista(numero), en = enlace(numero);
      filas.push(['Pieza del manual', `${numero} · ${doc.tabla}`]);
      if (m) filas.push(['Material SAP', m.MATNR]);
      if (pos) filas.push(['Lista de materiales', `${sap.lista_materiales.STLNR} · pos. ${pos.POSNR}`]);
      if (en && en.puntos_pi.length) filas.push(['Puntos de PI', en.puntos_pi.join('<br>')]);
    } else filas.push(['Lista de materiales', sap.lista_materiales.STLNR], ['Elemento de PI', esc(enlaces.elemento_pi)]);
    return `<div class="sec">Llave común<i>cómo se cruzan los sistemas</i></div><div class="llaves">${filas.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>`;
  }
  function tarjetaSenal(p, o = {}) {
    const e = A.estadoPunto(p);
    return `<button class="senal${e.clase !== 'ok' ? ' alerta' : ''}${o.sel ? ' sel' : ''}" data-senal="${p.instrumento}">
      <span class="n"><b>${p.instrumento}</b>${esc(p.descripcion)}</span><span class="v">${num(ultimo(p), p.decimales)}<small>${esc(p.unidad)}</small></span>
      <span class="e">${e.texto}${p.limites.H != null ? ` · alarma alta en ${num(p.limites.H, p.decimales > 1 ? 1 : p.decimales)}` : ''}</span><canvas data-chispa="${p.instrumento}"></canvas></button>`;
  }

  // ---------- ficha ----------
  function fichaPieza(s) {
    const p = PZ.get(s.numero), m = MAT.get(p.numero), uc = ultimoCambio(p.numero), en = enlace(p.numero), insts = porNumero.get(p.numero);
    const nm = p.monta === false;
    let h = nm ? `<p class="nota alerta mt0"><b>No se monta en esta ejecución.</b> ${esc(p.motivo)}</p><p class="nota">Esta bomba es de ${esc(doc.ejecucion.texto)}, según su hoja de datos. La pieza está en la ${doc.tabla} porque la tabla sirve para todas las variantes. En el 3D se muestra atenuada, en el lugar donde va en las variantes que la llevan.</p>` : '';
    h += `<div class="sec">Manual de partes</div>` + kv([
      ['N.º de pieza', `<span class="mono">${esc(p.numero)}</span>`, p.fila !== p.numero ? `Fila «${esc(p.fila)}» de la ${doc.tabla}` : ''],
      ['Denominación', esc(p.nombre)],
      ['Cantidad', nm ? '0 en esta bomba' : `${insts.length}`, nm ? 'No se monta en esta ejecución' : insts.length > 1 && insts.length <= 3 ? insts.map((i) => esc(i.detalle)).join(' · ') : ''],
      ['Material', esc(p.material), p.fuente_material === 'hoja de datos' ? 'Según la hoja de datos de la bomba' : 'Dato de ejemplo'],
      ['Página del manual', paginas(p), p.procedimiento ? `Desmontaje y montaje: pp. ${p.procedimiento.join(' a ')}` : ''],
    ]);
    if (p.funcion) h += `<p class="nota">${esc(p.funcion)}</p>`;
    if (p.nota) h += `<p class="nota">${esc(p.nota)}</p>`;
    h += `<div class="sec">Repuesto en SAP<i>${esc(sap.rotulo)}</i></div>`;
    if (nm) h += `<p class="nota">No está en la lista de materiales de este equipo, porque no se monta. No tiene código de material ni stock asociados a ${TAG}.</p>`;
    else if (p.conexion) h += `<p class="nota">Es una conexión roscada del cuerpo de la bomba, no un repuesto.${p.numero === '8B' ? '' : ' El tapón que la cierra es la pieza ' + pz('903.1') + '.'}</p>`;
    else {
      const st = m.stock, disp = st.LABST - st.reservado, ev4 = est.evento === 4 && p.numero === '321';
      h += `<div${ev4 ? ' class="tarjeta destaca"' : ''}>` + kv([
        ['Código de material', `<span class="mono">${m.MATNR}</span>`, esc(m.MAKTX)],
        ['Stock', `${st.LABST} ${m.MEINS}`, st.reservado ? `${st.reservado} reservadas para la orden ${ordenesDe(p.numero)[0]?.AUFNR || ''} · quedan ${disp} disponibles` : st.LABST ? 'Libre utilización' : ''],
        ['Bodega', st.LABST ? `${esc(st.LGOBE)}` : 'Sin existencias', st.LABST ? `Centro ${st.WERKS} · almacén ${st.LGORT}${st.LGPBE ? ' · ubicación ' + st.LGPBE : ''}` : `Compra bajo pedido: ${st.PLIFZ} días de plazo`],
        st.MINBE ? ['Punto de pedido', `${st.MINBE} ${m.MEINS}`, `Reposición en ${st.PLIFZ} días`] : null,
        ['Último cambio', uc ? fecha(uc.IDAT2) : 'Sin cambios', uc ? `Orden ${uc.AUFNR} · ${esc(uc.KTEXT)}` : `Original de la puesta en servicio (${fecha(eq.INBDT)})`],
      ]) + '</div>';
      if (st.LABST && st.MINBE && disp < st.MINBE) h += `<p class="nota alerta">Con la reserva, el disponible queda bajo el punto de pedido.</p>`;
    }
    const av = avisosDe(p.numero), or = ordenesDe(p.numero);
    if (av.length || or.length) h += `<div class="sec">Avisos y órdenes abiertos</div>` + av.map(tarjetaAviso).join('') + or.map((o) => tarjetaOrden(o)).join('');
    if (en && en.puntos_pi.length) {
      const pts = en.puntos_pi.map((t) => pi.puntos.find((x) => x.tag === t)).filter((x) => x && (!s.inst || !x.instancia || s.inst.endsWith(x.instancia)));
      h += `<div class="sec">Señales de operación ligadas<i>${esc(pi.rotulo)}</i></div>` + pts.map((x) => tarjetaSenal(x)).join('');
    }
    h += bloqueLlaves(p.numero);
    h += `<div class="fila-botones">${est.vista === 'despiece' ? '<button class="boton chico" data-vista="modelo">Ver dentro del modelo</button>' : '<button class="boton chico" data-vista="despiece">Ver en el despiece</button>'}<button class="boton chico" data-panel="sap">Lista de materiales</button></div>`;
    return h;
  }
  function fichaEquipo() {
    const claves = ['FIT-101', 'PIT-102', 'IT-101', 'VT-101A'];
    let h = '';
    const ev = pi.evento, a = sap.avisos.find((x) => x.QMNUM === ev.aviso);
    if (A.enAlarma.length) h += `<p class="nota alerta mt0">Alarma alta de vibración en el rodamiento del lado acoplamiento desde el ${fechaHora(Date.parse(ev.cruce_H))}. En SAP ya están el aviso ${a.QMNUM} y la orden ${a.AUFNR}.</p>
      <div class="fila-botones mt8"><button class="boton chico primario" data-accion="evento">Ver el evento paso a paso</button><button class="boton chico" data-pieza="321-LA">Ir a la pieza 321</button></div>`;
    h += `<div class="sec">Operación ahora<i>${esc(pi.rotulo)}</i></div>` + claves.map((c) => tarjetaSenal(PUNTO.get(c))).join('');
    h += `<div class="sec">Datos de placa</div>` + kv(eq.caracteristicas.map((c) => [c.ATBEZ, `${esc(c.ATWRT)} ${esc(c.unidad)}`]));
    h += `<div class="sec">Mantenimiento<i>${esc(sap.rotulo)}</i></div>` + kv([
      ['Avisos abiertos', `${sap.avisos.filter((x) => x.abierto).length}`], ['Órdenes programadas', `${sap.ordenes.filter((o) => o.estado !== 'CTEC').length}`],
      ['Próxima intervención', fecha(sap.ordenes.filter((o) => o.estado !== 'CTEC').sort((x, y) => (x.GSTRP > y.GSTRP ? 1 : -1))[0].GSTRP)],
    ]) + `<div class="fila-botones"><button class="boton chico" data-vista="despiece">Abrir el despiece</button><button class="boton chico" data-panel="sap">Mantenimiento</button><button class="boton chico" data-panel="pi">Operación</button></div>`;
    return h + bloqueLlaves(null);
  }
  function fichaOtros(s) {
    if (s.tipo === 'tag') return `<p class="nota mt0">PP-102 es la bomba de respaldo de la sala. En esta muestra solo se modeló por fuera y no tiene datos enlazados. Seleccione ${TAG} para ver el ejemplo completo.</p><div class="fila-botones"><button class="boton chico" data-tag="${TAG}">Ir a ${TAG}</button></div>`;
    if (s.tipo === 'conjunto') {
      const c = manual.conjuntos.find((x) => x.id === s.id), se = sap.subequipos.find((x) => x.conjunto === s.id);
      let h = `<div class="sec">Conjunto</div>` + kv([['Descripción', esc(c.detalle)], ['Equipo SAP', `<span class="mono">${se.EQUNR}</span>`, esc(se.EQKTX)], ['Equipo superior', `<span class="mono">${se.HEQUI}</span>`, `${TAG} · ${esc(enlaces.descripcion)}`], ['Tipo', esc(se.TYPBZ)], ['Criticidad', se.ABCKZ]]);
      h += `<p class="nota">Este conjunto no pertenece a la numeración del manual de la bomba. En SAP es un equipo propio, colgado de ${TAG}, con su propio manual y su propia lista de materiales.</p>`;
      if (s.id === 'motor') h += `<div class="sec">Señales de operación ligadas<i>${esc(pi.rotulo)}</i></div>` + tarjetaSenal(PUNTO.get('IT-101'));
      return h;
    }
    if (s.tipo === 'instrumento') {
      const p = PUNTO.get(s.id), L = p.limites;
      return `<div class="sec">Punto de PI<i>${esc(pi.rotulo)}</i></div>` + kv([['Punto', `<span class="mono">${esc(p.tag)}</span>`], ['Descripción', esc(p.descripcion)], ['Valor actual', `${num(ultimo(p), p.decimales)} ${esc(p.unidad)}`, A.estadoPunto(p).texto],
        ['Umbrales', Object.keys(L).map((k) => `${k} ${num(L[k], p.decimales > 1 ? 1 : p.decimales)}`).join(' · ') || 'Sin umbrales'], p.pieza_manual ? ['Pieza vigilada', pz(p.pieza_manual, p.pieza_manual + '-' + p.instancia), esc(INST.get(p.pieza_manual + '-' + p.instancia)?.detalle || '')] : null])
        + tarjetaSenal(p).replace('class="senal', 'class="mt12 senal') + `<div class="fila-botones"><button class="boton chico" data-panel="pi">Ver la tendencia</button></div>`;
    }
    return `<div class="sec">Válvula</div>` + kv([['TAG', `<span class="mono">${esc(s.id)}</span>`], ['Descripción', esc(nombreDe(s))], ['Línea', s.id === 'HV-101' ? 'Succión de ' + TAG : 'Descarga de ' + TAG]])
      + `<p class="nota">En una plataforma completa, cada válvula lleva su propio equipo de SAP y su hoja de datos. En esta muestra solo se modeló como contexto.</p>`;
  }

  // ---------- SAP ----------
  function panelSap() {
    const ut = sap.ubicacion_tecnica, abiertos = sap.avisos.filter((a) => a.abierto), prog = sap.ordenes.filter((o) => o.estado !== 'CTEC'), hist = sap.ordenes.filter((o) => o.estado === 'CTEC').sort((a, b) => (a.IDAT2 < b.IDAT2 ? 1 : -1));
    const ref = Date.parse(sap.fecha_referencia), selNum = est.sel.tipo === 'pieza' ? est.sel.numero : null;
    let h = `<div class="sec">Equipo y ubicación técnica<i>${esc(sap.rotulo)}</i></div>` + kv([
      ['Equipo', `<span class="mono">${eq.EQUNR}</span>`, esc(eq.EQKTX)],
      ['Ubicación técnica', `<span class="mono">${eq.TPLNR}</span>`, ut.jerarquia.map((j) => esc(j.PLTXT)).join(' › ')],
      ['Clase y tipo', `${esc(eq.EQART)} · ${esc(eq.TYPBZ)}`], ['Centro y planificación', `${eq.IWERK} · grupo ${eq.INGRP} · puesto ${eq.GEWRK}`],
      ['Criticidad', eq.ABCKZ], ['Puesta en servicio', fecha(eq.INBDT)],
    ]);
    h += `<div class="sec" id="sec-avisos">Avisos abiertos<i>${abiertos.length}</i></div>` + abiertos.map(tarjetaAviso).join('');
    h += `<div class="sec" id="sec-ordenes">Órdenes de mantenimiento</div><div class="sub-pest"><button data-ordenes="programadas" class="${est.ordenes === 'programadas' ? 'activo' : ''}">Programadas (${prog.length})</button><button data-ordenes="historial" class="${est.ordenes === 'historial' ? 'activo' : ''}">Historial (${hist.length})</button></div>`;
    h += (est.ordenes === 'programadas' ? prog.map((o) => tarjetaOrden(o, true)) : hist.map((o) => tarjetaOrden(o))).join('');
    const pm = sap.plan_mantenimiento;
    h += `<div class="sec">Plan de mantenimiento<i>${pm.WARPL} · ${esc(pm.STRAT)}</i></div>` + pm.posiciones.map((x) => {
      const u = Date.parse(x.ultima + 'T12:00:00-03:00'), p = Date.parse(x.proxima + 'T12:00:00-03:00'), k = Math.max(0, Math.min(1, (ref - u) / (p - u))), dias = Math.round((p - ref) / 86400e3);
      return `<div class="tarjeta"><div class="t1"><b>${x.WAPOS}</b><span>${esc(x.ciclo)}</span><span class="fecha">Próxima ${fecha(x.proxima)}</span></div><div class="t2">${esc(x.PSTXT)}</div>
        <div class="t3"><span>Última ${fecha(x.ultima)}</span><span>· faltan ${dias} días</span>${x.AUFNR ? `<span>· orden <b class="mono">${x.AUFNR}</b></span>` : ''}</div><div class="barra-ciclo"><i class="${dias <= 14 ? 'vence' : ''}" data-ancho="${Math.round(k * 100)}"></i></div></div>`;
    }).join('');
    const lm = sap.lista_materiales;
    h += `<div class="sec" id="sec-lista">Lista de materiales<i>${lm.STLNR} · ${lm.posiciones.length} posiciones</i></div>
      <table class="tabla"><thead><tr><th>Pos.</th><th>Pieza</th><th>Material</th><th class="d">Cant.</th><th class="d">Stock</th></tr></thead><tbody>` +
      lm.posiciones.map((x) => { const m = MAT.get(x.pieza_manual); return `<tr class="clic${selNum === x.pieza_manual ? ' sel' : ''}" data-pieza="${esc(x.pieza_manual)}"><td class="mono">${x.POSNR}</td><td>${pz(x.pieza_manual)}</td><td><span class="mono">${x.IDNRK}</span><small>${esc(x.MAKTX)}</small></td><td class="d">${x.MENGE}</td><td class="d">${m.stock.LABST || '<span class="tenue">0</span>'}</td></tr>`; }).join('') + '</tbody></table>';
    return h;
  }

  // ---------- PI ----------
  let graf = null, cursor = null;
  function panelPi() {
    const p = PUNTO.get(est.senal), e = A.estadoPunto(p);
    const rangos = [[1, '24 horas'], [7, '7 días'], [14, '14 días']];
    let h = `<div class="sub-pest">${rangos.map(([d, t]) => `<button data-dias="${d}" class="${est.dias === d ? 'activo' : ''}">${t}</button>`).join('')}</div>
      <div class="grafico"><div class="gt"><b class="mono">${p.instrumento}</b><span>${esc(p.descripcion)}</span><span class="val" id="g-val">${num(ultimo(p), p.decimales)}<small>${esc(p.unidad)}</small></span></div>
      <canvas id="g-lienzo"></canvas><div class="ley"><span id="g-hora">${fechaHora(A.inicioMs + (n - 1) * A.pasoMs)} · ${e.texto.toLowerCase()}</span>${p.limites.H != null ? '<span><i></i>alarma alta</span>' : ''}${p.limites.HH != null ? '<span><i class="hh"></i>alarma muy alta</span>' : ''}${p.instrumento === 'VT-101A' ? '<span><i class="ev"></i>cruce del umbral</span>' : ''}</div></div>`;
    if (p.pieza_manual) h += `<p class="nota m0010">Esta señal vigila la pieza ${pz(p.pieza_manual, p.pieza_manual + '-' + p.instancia)} ${esc(PZ.get(p.pieza_manual).nombre.toLowerCase())}, ${esc(INST.get(p.pieza_manual + '-' + p.instancia).detalle)}.</p>`;
    h += `<div class="sec">Señales de ${TAG}<i>${esc(pi.rotulo)}</i></div>` + pi.puntos.map((x) => tarjetaSenal(x, { sel: x.instrumento === est.senal })).join('');
    h += `<p class="nota">Un valor cada 10 minutos por punto, como una consulta de valores interpolados de PI. La caída del ${fecha(pi.detenciones[0].inicio)} es una detención programada para probar la bomba de respaldo.</p>`;
    return h;
  }
  function dibujarGrafico() {
    const c = document.getElementById('g-lienzo'); if (!c) return;
    const p = PUNTO.get(est.senal), desde = Math.max(0, n - 1 - Math.round((est.dias * 86400e3) / A.pasoMs));
    graf = tendencia(c, { valores: p.valores, inicioMs: A.inicioMs, pasoMs: A.pasoMs, desde, hasta: n - 1, limites: p.limites, dec: p.decimales, cursor,
      hastaDibujo: est.cursorEvento ?? undefined, marca: p.instrumento === 'VT-101A' ? { i: pi.evento.indice_cruce, texto: 'Cruza el umbral' } : null });
    const i = cursor ?? est.cursorEvento ?? n - 1, v = document.getElementById('g-val'), t = document.getElementById('g-hora');
    if (v) v.innerHTML = `${num(p.valores[i], p.decimales)}<small>${esc(p.unidad)}</small>`;
    if (t) t.textContent = `${fechaHora(A.inicioMs + i * A.pasoMs)} · ${A.estadoPunto(p, i).texto.toLowerCase()}`;
  }
  function dibujarChispas() {
    const desde = Math.max(0, n - 1 - Math.round((7 * 86400e3) / A.pasoMs));
    for (const c of cuerpo.querySelectorAll('canvas[data-chispa]')) { const p = PUNTO.get(c.dataset.chispa); chispa(c, p.valores, desde, A.estadoPunto(p).clase !== 'ok'); }
  }
  cuerpo.addEventListener('pointermove', (ev) => {
    if (ev.target.id !== 'g-lienzo' || !graf || est.cursorEvento != null) return;
    const r = ev.target.getBoundingClientRect(); cursor = Math.max(graf.i0, Math.min(graf.i1, graf.indiceEn(ev.clientX - r.left))); dibujarGrafico();
  });
  cuerpo.addEventListener('pointerleave', () => { if (cursor != null) { cursor = null; dibujarGrafico(); } }, true);

  // ---------- clics dentro del panel derecho ----------
  cuerpo.addEventListener('click', (ev) => {
    const e = ev.target.closest('[data-pieza],[data-panel],[data-vista],[data-senal],[data-accion],[data-ordenes],[data-dias],[data-tag]'); if (!e) return;
    const d = e.dataset;
    if (d.accion === 'evento') return A.guia.evento(1);
    A.guia.pausar();
    if (d.ordenes) { est.ordenes = d.ordenes; return A.refrescar(); }
    if (d.dias) { est.dias = Number(d.dias); return A.refrescar(); }
    if (d.senal) { est.senal = d.senal; est.panel = 'pi'; cuerpo.scrollTop = 0; return A.refrescar(); }
    if (d.tag) return A.seleccionar({ tipo: 'tag', id: d.tag }, { origen: 'panel' });
    if (d.vista) return A.setVista(d.vista, { enfocar: true });
    if (d.panel) return A.setPanel(d.panel);
    if (d.pieza) { const s = A.resolver(d.pieza); if (s) A.seleccionar(s, { volar: est.vista !== 'nube', panel: est.panel === 'sap' && e.tagName === 'TR' ? 'sap' : 'ficha' }); }
  });
  for (const b of document.querySelectorAll('#pestanas button')) b.onclick = () => { A.guia.pausar(); A.setPanel(b.dataset.panel); };

  let firma = '';
  function dibujar() {
    dibujarArbol(); marcarLista(); cabecera();
    const s = est.sel, nueva = [est.panel, s.tipo, s.id, s.numero, s.inst, est.vista, est.ordenes, est.dias, est.senal, est.evento].join('|');
    const guardar = nueva === firma ? cuerpo.scrollTop : 0;
    cuerpo.innerHTML = est.panel === 'sap' ? panelSap() : est.panel === 'pi' ? panelPi() : s.tipo === 'pieza' ? fichaPieza(s) : s.tipo === 'tag' && s.id === TAG ? fichaEquipo() : fichaOtros(s);
    for (const e of cuerpo.querySelectorAll('[data-ancho]')) e.style.width = e.dataset.ancho + '%'; // por CSSOM: sin estilos en línea
    cuerpo.scrollTop = guardar; firma = nueva;
    dibujarGrafico(); dibujarChispas();
  }
  function mostrar(selector) { // lleva un bloque del panel a la vista
    const e = cuerpo.querySelector(selector); if (e) cuerpo.scrollTo({ top: Math.max(0, e.offsetTop - cuerpo.offsetTop - 8), behavior: 'smooth' });
  }
  construirLista();
  return { dibujar, dibujarGrafico, sobre, nombreDe, mostrar };
}
