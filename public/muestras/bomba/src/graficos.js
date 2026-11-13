// Gráficos de tendencia en canvas 2D, sin librerías.
// Los colores salen de las variables CSS del tema vigente (--graf-*), así los gráficos cambian con el tema.
let cache = null, cacheTema = null;
export function paleta() {
  const t = document.documentElement.dataset.tema || 'oscuro';
  if (cache && cacheTema === t) return cache;
  const cs = getComputedStyle(document.documentElement), v = (n) => cs.getPropertyValue(n).trim();
  cache = { tema: t, texto: v('--graf-texto'), linea: v('--graf-linea'), serie: v('--graf-serie'), alerta: v('--graf-alerta'), alertaTexto: v('--graf-alerta-texto'),
    rojo: v('--graf-rojo'), rojoTexto: v('--graf-rojo-texto'), marca: v('--graf-marca'), zona: v('--graf-zona'), chispa: v('--graf-chispa'), fondo: v('--panel2'), fondoToma: v('--panel') };
  cacheTema = t; return cache;
}

export const num = (v, dec = 1) => (v == null || Number.isNaN(v) ? 's/d' : Number(v).toLocaleString('es-CL', { minimumFractionDigits: dec, maximumFractionDigits: dec }));
// Fechas en hora de Chile continental (UTC-3 en la fecha de la muestra), sin depender de la zona del navegador.
const partes = (ms) => { const d = new Date(ms - 3 * 3600e3); return { d: d.getUTCDate(), m: d.getUTCMonth() + 1, a: d.getUTCFullYear(), h: d.getUTCHours(), mi: d.getUTCMinutes() }; };
const dos = (n) => String(n).padStart(2, '0');
export const fechaHora = (ms) => { const p = partes(ms); return `${dos(p.d)}-${dos(p.m)} ${dos(p.h)}:${dos(p.mi)}`; };
export const fecha = (texto) => { if (!texto) return ''; const [a, m, d] = texto.slice(0, 10).split('-'); return `${d}-${m}-${a}`; };

function preparar(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2), w = canvas.clientWidth || 300, h = canvas.clientHeight || 120;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

// Tendencia con umbrales. o: { valores, inicioMs, pasoMs, desde, hasta, limites, dec, hastaDibujo, marca: { i, texto } }
export function tendencia(canvas, o) {
  const { ctx, w, h } = preparar(canvas), C = paleta();
  const kf = (o.fuente || 10.5) / 10.5, mi = Math.round(38 * kf), md = 10, ms = 8, mb = Math.round(20 * kf), pw = w - mi - md, ph = h - ms - mb;
  const i0 = Math.max(0, o.desde | 0), i1 = Math.min(o.valores.length - 1, o.hasta | 0), fin = Math.min(i1, o.hastaDibujo ?? i1);
  let lo = Infinity, hi = -Infinity;
  for (let i = i0; i <= i1; i++) { const v = o.valores[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
  const lim = o.limites || {}, amp = Math.max(hi - lo, 1e-6);
  for (const k of ['H', 'L', 'HH', 'LL']) if (lim[k] != null && lim[k] > lo - amp * 0.9 && lim[k] < hi + amp * 0.9) { lo = Math.min(lo, lim[k]); hi = Math.max(hi, lim[k]); }
  const pad = (hi - lo) * 0.1 || 1; lo -= pad; hi += pad; if (lo < 0 && Math.min(...o.valores.slice(i0, i1 + 1)) >= 0) lo = 0;
  const X = (i) => mi + ((i - i0) / Math.max(1, i1 - i0)) * pw, Y = (v) => ms + (1 - (v - lo) / (hi - lo)) * ph;
  const fu = o.fuente || 10.5; // tamaño de letra: las tomas de grabación usan uno mayor
  ctx.font = `${fu}px ui-monospace, Consolas, monospace`; ctx.textBaseline = 'middle';
  // grilla y eje Y
  ctx.strokeStyle = C.linea; ctx.lineWidth = 1; ctx.fillStyle = C.texto; ctx.textAlign = 'right';
  const bruto = (hi - lo) / 4, pot = Math.pow(10, Math.floor(Math.log10(bruto))), paso = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((s) => s >= bruto);
  for (let v = Math.ceil(lo / paso) * paso; v <= hi + 1e-9; v += paso) {
    const y = Math.round(Y(v)) + 0.5;
    ctx.beginPath(); ctx.moveTo(mi, y); ctx.lineTo(w - md, y); ctx.stroke();
    ctx.fillText(num(v, paso < 1 ? (paso < 0.1 ? 2 : 1) : 0), mi - 5, y);
  }
  // eje X: días o horas según la ventana
  const horas = ((i1 - i0) * o.pasoMs) / 3600e3, cada = horas <= 30 ? 6 : horas <= 200 ? 24 : 48;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let i = i0; i <= i1; i++) {
    const t = o.inicioMs + i * o.pasoMs, p = partes(t);
    if (p.mi === 0 && p.h % cada === 0 && (cada < 24 || p.h === 0) && (cada <= 24 || p.d % 2 === 0)) {
      const x = Math.round(X(i)) + 0.5;
      ctx.strokeStyle = C.linea; ctx.beginPath(); ctx.moveTo(x, ms); ctx.lineTo(x, ms + ph); ctx.stroke();
      ctx.fillText(cada < 24 ? `${dos(p.h)}:00` : `${dos(p.d)}-${dos(p.m)}`, x, ms + ph + 5);
    }
  }
  // umbrales
  ctx.setLineDash([5, 4]); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  for (const [k, col, colTexto] of [['H', C.alerta, C.alertaTexto], ['L', C.alerta, C.alertaTexto], ['HH', C.rojo, C.rojoTexto], ['LL', C.rojo, C.rojoTexto]]) {
    if (lim[k] == null || lim[k] < lo || lim[k] > hi) continue;
    const y = Math.round(Y(lim[k])) + 0.5;
    ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(mi, y); ctx.lineTo(w - md, y); ctx.stroke();
    ctx.fillStyle = colTexto; ctx.fillText(`${k} ${num(lim[k], o.dec > 1 ? 1 : o.dec)}`, mi + 4, y - 2);
  }
  ctx.setLineDash([]);
  // serie
  const trazar = () => { ctx.beginPath(); for (let i = i0; i <= fin; i++) { const x = X(i), y = Y(o.valores[i]); if (i === i0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } };
  ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.strokeStyle = C.serie; trazar(); ctx.stroke();
  if (lim.H != null && lim.H < hi) {
    ctx.save(); ctx.beginPath(); ctx.rect(mi, ms, pw, Math.max(0, Y(lim.H) - ms)); ctx.clip();
    ctx.fillStyle = C.zona; ctx.fillRect(mi, ms, pw, ph);
    ctx.strokeStyle = C.alerta; ctx.lineWidth = 2; trazar(); ctx.stroke(); ctx.restore();
  }
  // marca del evento y último valor
  if (o.marca && o.marca.i >= i0 && o.marca.i <= fin) {
    const x = Math.round(X(o.marca.i)) + 0.5;
    ctx.strokeStyle = C.marca; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, ms); ctx.lineTo(x, ms + ph); ctx.stroke();
    ctx.fillStyle = C.marca; ctx.textAlign = x > w - 120 ? 'right' : 'left'; ctx.textBaseline = 'top'; ctx.font = `600 ${o.fuente || 10.5}px "Segoe UI", system-ui, sans-serif`;
    ctx.fillText(o.marca.texto, x + (x > w - 120 ? -5 : 5), ms + 2);
  }
  const xf = X(fin), yf = Y(o.valores[fin]), alta = lim.H != null && o.valores[fin] > lim.H;
  ctx.fillStyle = alta ? C.alerta : C.marca; ctx.beginPath(); ctx.arc(xf, yf, 3.4, 0, Math.PI * 2); ctx.fill();
  if (o.cursor != null && o.cursor >= i0 && o.cursor <= i1) {
    const x = Math.round(X(o.cursor)) + 0.5;
    ctx.globalAlpha = 0.5; ctx.strokeStyle = C.marca; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, ms); ctx.lineTo(x, ms + ph); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = C.marca; ctx.beginPath(); ctx.arc(x, Y(o.valores[o.cursor]), 3, 0, Math.PI * 2); ctx.fill();
  }
  return { indiceEn: (px) => Math.round(i0 + ((px - mi) / pw) * (i1 - i0)), i0, i1 };
}

export function chispa(canvas, valores, desde, alerta) {
  const { ctx, w, h } = preparar(canvas), C = paleta();
  let lo = Infinity, hi = -Infinity; const n = valores.length - 1, paso = Math.max(1, Math.floor((n - desde) / 160));
  for (let i = desde; i <= n; i += paso) { const v = valores[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
  const amp = hi - lo || 1;
  ctx.strokeStyle = alerta ? C.alerta : C.chispa; ctx.lineWidth = 1.3; ctx.lineJoin = 'round'; ctx.beginPath();
  let x = 0, y = 0;
  for (let i = desde; i <= n; i += paso) { x = 2 + ((i - desde) / (n - desde)) * (w - 8); y = 3 + (1 - (valores[i] - lo) / amp) * (h - 6); if (i === desde) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  ctx.stroke(); ctx.fillStyle = alerta ? C.alerta : C.marca; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
}
