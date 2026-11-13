// Tendencias de PI en canvas 2D: una serie por gráfico, un eje, umbrales como líneas de referencia.
const fmt = (v, d) => v.toLocaleString('es-CL', { minimumFractionDigits: d, maximumFractionDigits: d });
export { fmt };

const COL = { serie: '#2f6db5', grid: '#ece7df', eje: '#8a8178', texto: '#5e5650', H: '#c98a00', HH: '#c8382c', L: '#c98a00', LL: '#c8382c', evento: '#c8382c' };

function prep(cv) {
  const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(10, r.width), h = Math.max(10, r.height);
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h); return { g, w, h };
}

export function sparkline(cv, valores, { umbral = null, color = COL.serie } = {}) {
  const { g, w, h } = prep(cv);
  let mn = Math.min(...valores), mx = Math.max(...valores);
  if (umbral != null) { mn = Math.min(mn, umbral); mx = Math.max(mx, umbral); }
  if (mx - mn < 1e-6) { mx += 1; mn -= 1; }
  const X = i => 1 + i / (valores.length - 1) * (w - 2), Y = v => h - 2 - (v - mn) / (mx - mn) * (h - 4);
  if (umbral != null) { g.strokeStyle = COL.H; g.setLineDash([3, 3]); g.lineWidth = 1; g.beginPath(); g.moveTo(0, Y(umbral)); g.lineTo(w, Y(umbral)); g.stroke(); g.setLineDash([]); }
  g.strokeStyle = color; g.lineWidth = 1.5; g.lineJoin = 'round'; g.beginPath();
  valores.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))); g.stroke();
}

// Dibuja la tendencia y devuelve una función de consulta para el tooltip.
export function tendencia(cv, { valores, t0, pasoMin, unidad, dec, umbrales, desdeEvento = null }) {
  const { g, w, h } = prep(cv);
  const m = { l: 44, r: 82, t: 10, b: 24 };
  const pw = w - m.l - m.r, ph = h - m.t - m.b;
  const lims = Object.values(umbrales || {});
  let mn = Math.min(...valores, ...lims), mx = Math.max(...valores, ...lims);
  const pad = (mx - mn) * 0.08 || 1; mn -= pad; mx += pad;
  if (mn > 0 && mn < (mx - mn) * 0.5) mn = 0;
  const n = valores.length;
  const X = i => m.l + i / (n - 1) * pw, Y = v => m.t + ph - (v - mn) / (mx - mn) * ph;
  // grilla y eje Y
  g.font = '10.5px Segoe UI, Arial'; g.fillStyle = COL.texto; g.textAlign = 'right'; g.textBaseline = 'middle';
  const paso = niceStep((mx - mn) / 4);
  for (let v = Math.ceil(mn / paso) * paso; v <= mx; v += paso) {
    g.strokeStyle = COL.grid; g.lineWidth = 1; g.beginPath(); g.moveTo(m.l, Y(v)); g.lineTo(m.l + pw, Y(v)); g.stroke();
    g.fillText(fmt(Math.abs(v) < paso / 1e3 ? 0 : v, paso < 0.1 ? 2 : paso < 1 ? 1 : 0), m.l - 6, Y(v));
  }
  g.save(); g.translate(10, m.t + ph / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText(unidad, 0, 0); g.restore();
  // eje X por día u hora
  g.textAlign = 'center'; g.textBaseline = 'top';
  const horas = (n - 1) * pasoMin / 60;
  const cada = horas > 48 ? 24 : horas > 12 ? 6 : 2;
  for (let i = 0; i < n; i++) {
    const t = new Date(t0 + i * pasoMin * 60000 - 3 * 3600000);
    if (t.getUTCMinutes() === 0 && t.getUTCHours() % cada === 0) {
      g.strokeStyle = COL.grid; g.beginPath(); g.moveTo(X(i), m.t); g.lineTo(X(i), m.t + ph); g.stroke();
      const lab = cada === 24 ? `${t.getUTCDate()}/${t.getUTCMonth() + 1}` : `${String(t.getUTCHours()).padStart(2, '0')}:00`;
      g.fillStyle = COL.texto; g.fillText(lab, X(i), m.t + ph + 6);
    }
  }
  // tramo del evento
  if (desdeEvento != null && desdeEvento < n) {
    g.fillStyle = 'rgba(200,56,44,.06)'; g.fillRect(X(desdeEvento), m.t, m.l + pw - X(desdeEvento), ph);
  }
  // umbrales
  const nombres = { HH: 'Muy alta', H: 'Alta', L: 'Baja', LL: 'Muy baja' };
  for (const [k, v] of Object.entries(umbrales || {})) {
    if (v < mn || v > mx) continue;
    g.strokeStyle = COL[k]; g.lineWidth = 1; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(m.l, Y(v)); g.lineTo(m.l + pw, Y(v)); g.stroke(); g.setLineDash([]);
    g.fillStyle = COL[k]; g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = '700 10px Segoe UI, Arial';
    g.fillText(`${nombres[k]} ${fmt(v, dec)}`, m.l + pw + 4, Y(v));
  }
  // serie
  g.strokeStyle = COL.serie; g.lineWidth = 2; g.lineJoin = 'round'; g.beginPath();
  valores.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))); g.stroke();
  // último valor
  const ul = valores[n - 1]; g.fillStyle = COL.serie; g.beginPath(); g.arc(X(n - 1), Y(ul), 4, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
  return {
    consultar(px) {
      if (px < m.l || px > m.l + pw) return null;
      const i = Math.round((px - m.l) / pw * (n - 1));
      return { i, x: X(i), y: Y(valores[i]), v: valores[i], t: t0 + i * pasoMin * 60000 };
    },
    redibujarCruz(i) {
      tendencia(cv, { valores, t0, pasoMin, unidad, dec, umbrales, desdeEvento });
      const g2 = cv.getContext('2d');
      g2.strokeStyle = '#1b1714'; g2.lineWidth = 1; g2.setLineDash([2, 3]); g2.beginPath(); g2.moveTo(X(i), m.t); g2.lineTo(X(i), m.t + ph); g2.stroke(); g2.setLineDash([]);
      g2.fillStyle = COL.serie; g2.beginPath(); g2.arc(X(i), Y(valores[i]), 4.5, 0, Math.PI * 2); g2.fill(); g2.strokeStyle = '#fff'; g2.lineWidth = 2; g2.stroke();
    },
  };
}
function niceStep(x) { const p = Math.pow(10, Math.floor(Math.log10(x))); const f = x / p; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p; }
