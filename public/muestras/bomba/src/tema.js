// Fija el tema antes del primer pintado, para que la página no parta en oscuro y salte a claro.
// Orden: parámetro de URL ?tema=claro|oscuro, después lo recordado en este navegador, y si no hay nada, oscuro.
// Es un script clásico en un archivo aparte, no en línea, para que funcione con una CSP estricta.
(function () {
  var tema = null;
  try {
    var p = new URLSearchParams(location.search).get('tema');
    if (p === 'claro' || p === 'oscuro') tema = p;
  } catch (e) { /* sin URLSearchParams: queda el tema por omisión */ }
  if (!tema) {
    try {
      var g = localStorage.getItem('muestra-tema');
      if (g === 'claro' || g === 'oscuro') tema = g;
    } catch (e) { /* localStorage bloqueado: queda el tema por omisión */ }
  }
  document.documentElement.dataset.tema = tema || 'oscuro';
})();
