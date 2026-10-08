// Visor 3D en tiempo real de la biblioteca (Three.js 0.160). Recibe el contenedor [data-visor] de Visor3D.astro.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { distanciaEncuadre, pasoExplosion, ladoVisible, alternarSeleccion, nombrePieza, ruedaAcerca } from './visor3d-logica.js';
import { iniciarFondo } from './fondo-particulas.js';

const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function iniciarVisor(raiz) {
  const $ = (s) => raiz.querySelector(s);
  const datos = JSON.parse($('.bib-datos').textContent);
  const lienzo = $('.bib-lienzo');
  const poster = $('.bib-poster');
  const capa = $('.bib-etiquetas');
  const panel = $('.bib-panel');
  const pestana = $('.bib-pestana');
  const grupos = $('.bib-grupos');
  const controlesEl = $('.bib-controles');
  const carga = $('.bib-carga');
  const barra = $('.bib-barra i');
  const cargaTexto = $('.bib-carga-texto');
  const avisoZoom = $('.bib-aviso-zoom');
  const nombreEl = $('.bib-nombre-pieza');
  const girar = $('.bib-girar');
  const titulo = $('.bib-titulo');
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const angosto = () => raiz.clientWidth < 900;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
  } catch {
    return; // sin WebGL queda el póster
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const escena = new THREE.Scene();
  escena.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const luz = new THREE.DirectionalLight(0xffffff, 1.4);
  luz.position.set(3, 5, 2);
  luz.layers.enable(1); // three filtra las luces por capa: la pieza elegida (capa 1) también la recibe
  escena.add(luz);
  const camara = new THREE.PerspectiveCamera(35, 16 / 9, 0.01, 1000);
  const controles = new OrbitControls(camara, lienzo);
  Object.assign(controles, { enableDamping: true, dampingFactor: 0.08, autoRotate: !reducir, autoRotateSpeed: 0.7, enablePan: false });
  girar.setAttribute('aria-pressed', String(controles.autoRotate)); // con movimiento reducido el botón parte sin marcar
  lienzo.style.touchAction = 'pan-y'; // OrbitControls pone 'none': así un dedo vertical baja la página

  const fantasma = new THREE.MeshStandardMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.12, depthWrite: false });
  const e = { modelo: null, radio: 1, altura: 1, partes: [], piezas: [], elegida: null, vuelo: null, tocado: false, resaltada: null, vistaInicial: null, fondo: null, visible: true };

  // --- encuadre y cámara ---
  function desplazar() {
    const w = raiz.clientWidth, h = raiz.clientHeight;
    if (!angosto() && !panel.hidden && !panel.classList.contains('bib-cerrado')) camara.setViewOffset(w, h, -135, 0, w, h);
    else camara.clearViewOffset();
    camara.updateProjectionMatrix();
  }
  function vistaGeneral() {
    const d = distanciaEncuadre(e.radio, camara.fov, camara.aspect);
    const y = e.altura * 0.42;
    return { obj: new THREE.Vector3(0, y, 0), pos: new THREE.Vector3(d * 0.55, y + d * 0.3, d * 0.78) };
  }
  function volar(destino, ms = 850) {
    e.vuelo = { t0: performance.now(), ms, desdePos: camara.position.clone(), desdeObj: controles.target.clone(), aPos: destino.pos, aObj: destino.obj };
  }
  function ajustar() {
    const w = raiz.clientWidth, h = raiz.clientHeight;
    renderer.setSize(w, h, false);
    // El panel parte 8 px bajo la tarjeta del título, que crece si la bajada ocupa dos líneas
    panel.style.setProperty('--bib-panel-top', `${titulo.offsetTop + titulo.offsetHeight + 8}px`);
    camara.aspect = w / h;
    desplazar();
    if (e.modelo && !e.tocado) {
      const v = vistaGeneral();
      camara.position.copy(v.pos); controles.target.copy(v.obj); controles.update();
      e.vistaInicial = v;
    }
  }
  const observador = new ResizeObserver(ajustar);
  observador.observe(raiz);
  observador.observe(titulo); // también cambia de alto cuando llega la fuente
  new IntersectionObserver(([x]) => { e.visible = x.isIntersecting; }).observe(raiz);

  // --- selección ---
  function detenerGiro() {
    e.tocado = true; controles.autoRotate = false; girar.setAttribute('aria-pressed', 'false');
  }
  function quitarResalte() {
    if (e.resaltada) e.resaltada.traverse((o) => { if (o.isMesh && o.material !== fantasma && o.material.emissive) o.material.emissive.setHex(0x000000); });
    e.resaltada = null; nombreEl.hidden = true; lienzo.classList.remove('bib-sobre-pieza');
  }
  function enfocar(obj) {
    detenerGiro(); quitarResalte();
    e.elegida = obj;
    const propios = new Set(); obj.traverse((o) => propios.add(o));
    e.modelo.traverse((o) => {
      if (!o.isMesh) return;
      const propia = propios.has(o);
      o.material = propia ? o.userData.material : fantasma;
      o.layers.set(propia ? 1 : 0); // la capa 1 se dibuja en una segunda pasada, encima del fantasma
    });
    e.piezas.forEach((p) => p.boton.setAttribute('aria-pressed', String(p.obj === obj)));
    const caja = new THREE.Box3().setFromObject(obj);
    const c = caja.getCenter(new THREE.Vector3());
    const r = Math.max(caja.getSize(new THREE.Vector3()).length() / 2, e.radio * 0.12);
    const dir = camara.position.clone().sub(controles.target).normalize();
    volar({ obj: c, pos: c.clone().add(dir.multiplyScalar(distanciaEncuadre(r, camara.fov, camara.aspect) * 1.25)) });
  }
  function verTodo() {
    e.elegida = null;
    if (e.modelo) e.modelo.traverse((o) => { if (o.isMesh) { o.material = o.userData.material; o.layers.set(0); } });
    e.piezas.forEach((p) => p.boton.setAttribute('aria-pressed', 'false'));
    volar(vistaGeneral());
  }
  function elegir(obj) {
    const siguiente = alternarSeleccion(e.elegida, obj);
    if (siguiente === null) verTodo(); else enfocar(siguiente);
  }
  // Sube desde la malla tocada hasta el nodo con nombre en español (o hasta el hijo directo del modelo)
  function piezaDe(malla) {
    for (let x = malla; x && x !== e.modelo; x = x.parent) if (Object.hasOwn(datos.nombres, x.name)) return x;
    let x = malla;
    while (x.parent && x.parent !== e.modelo) x = x.parent;
    return x;
  }
  const rayo = new THREE.Raycaster();
  rayo.layers.enableAll(); // la pieza elegida queda en la capa 1
  const puntero = new THREE.Vector2();
  function tocar(ev) {
    if (!e.modelo) return null;
    const r = lienzo.getBoundingClientRect();
    puntero.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(puntero, camara);
    // Con una pieza elegida, lo demás es fantasma: basta con buscar dentro de ella
    const hit = rayo.intersectObject(e.elegida ?? e.modelo, true).find((h) => h.object.material !== fantasma);
    return hit ? piezaDe(hit.object) : null;
  }

  // --- carga del modelo ---
  carga.hidden = false;
  const cargador = new GLTFLoader();
  cargador.setMeshoptDecoder(MeshoptDecoder);
  cargador.load(datos.modelo, (gltf) => {
    const modelo = gltf.scene;
    const caja = new THREE.Box3().setFromObject(modelo);
    const tam = caja.getSize(new THREE.Vector3());
    const centro = caja.getCenter(new THREE.Vector3());
    e.radio = tam.length() / 2;
    e.altura = tam.y;
    modelo.position.sub(new THREE.Vector3(centro.x, caja.min.y, centro.z));
    escena.add(modelo);
    e.modelo = modelo;
    modelo.updateMatrixWorld(true);
    const centroMundo = new THREE.Box3().setFromObject(modelo).getCenter(new THREE.Vector3());
    modelo.traverse((o) => {
      if (!o.isMesh) return;
      o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
      o.userData.material = o.material;
      const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
      const [dx, dy, dz] = pasoExplosion(c.toArray(), centroMundo.toArray(), e.radio);
      const destino = c.clone().add(new THREE.Vector3(dx, dy, dz));
      const paso = o.parent.worldToLocal(destino.clone()).sub(o.parent.worldToLocal(c.clone()));
      e.partes.push({ o, inicio: o.position.clone(), paso });
    });
    // Panel: todos los grupos y piezas; las marcadas además llevan etiqueta sobre el modelo
    const buscar = (nodo) => { let r = null; modelo.traverse((o) => { if (!r && o.name === nodo) r = o; }); return r; };
    const marcadas = new Map(datos.marcadas.map((m) => [m.nodo, m.etiqueta]));
    for (const g of datos.grupos) {
      const h3 = document.createElement('h3'); h3.textContent = g.titulo; grupos.append(h3);
      const ul = document.createElement('ul'); grupos.append(ul);
      for (const nodo of g.nodos) {
        const obj = buscar(nodo);
        if (!obj) continue;
        const li = document.createElement('li');
        const boton = document.createElement('button');
        boton.type = 'button'; boton.textContent = nombrePieza(datos.nombres, nodo); boton.setAttribute('aria-pressed', 'false');
        boton.addEventListener('click', () => elegir(obj));
        li.append(boton); ul.append(li);
        let el = null;
        if (marcadas.has(nodo)) {
          el = document.createElement('div'); el.className = 'bib-pieza bib-oculta';
          el.innerHTML = '<i></i><span></span>'; el.querySelector('span').textContent = marcadas.get(nodo);
          capa.append(el);
        }
        e.piezas.push({ nodo, obj, boton, el });
      }
    }
    panel.hidden = false;
    if (angosto()) panel.classList.add('bib-cerrado');
    ajustar();
    controles.minDistance = e.radio * 0.25; controles.maxDistance = e.radio * 6; controles.maxPolarAngle = Math.PI * 0.49;
    camara.near = e.radio / 300; camara.far = e.radio * 40; camara.updateProjectionMatrix();
    carga.hidden = true; controlesEl.hidden = false; poster.classList.add('bib-oculto');
    e.fondo = iniciarFondo({ modelo, radio: e.radio, altura: e.altura, escenario: raiz, angosto: angosto(), reducir });
  }, (p) => {
    if (p.total) barra.style.width = `${Math.round((p.loaded / p.total) * 100)}%`;
  }, () => {
    cargaTexto.textContent = 'No se pudo cargar el modelo';
    barra.parentElement.hidden = true;
  });

  // --- controles ---
  $('.bib-ver-todo').addEventListener('click', verTodo);
  pestana.addEventListener('click', () => {
    const cerrar = !panel.classList.contains('bib-cerrado');
    panel.classList.toggle('bib-cerrado', cerrar);
    pestana.setAttribute('aria-expanded', String(!cerrar));
    desplazar();
  });
  const separar = $('.bib-separar');
  const valor = $('.bib-separar-valor');
  separar.addEventListener('input', () => {
    const f = separar.value / 100;
    valor.textContent = `${separar.value} %`;
    e.partes.forEach((p) => p.o.position.copy(p.inicio).addScaledVector(p.paso, f * 0.32));
  });
  girar.addEventListener('click', () => {
    controles.autoRotate = !controles.autoRotate;
    girar.setAttribute('aria-pressed', String(controles.autoRotate));
  });
  controles.addEventListener('start', () => { e.vuelo = null; detenerGiro(); });
  $('.bib-inicial').addEventListener('click', verTodo);
  $('.bib-completa').addEventListener('click', () => {
    const p = raiz.requestFullscreen ? raiz.requestFullscreen() : null;
    if (p && p.catch) p.catch(() => {});
  });
  const lupa = (factor) => {
    detenerGiro(); e.vuelo = null;
    const dir = camara.position.clone().sub(controles.target);
    const d = THREE.MathUtils.clamp(dir.length() * factor, controles.minDistance, controles.maxDistance);
    volar({ obj: controles.target.clone(), pos: controles.target.clone().add(dir.setLength(d)) }, 350);
  };
  $('.bib-acercar').addEventListener('click', () => lupa(0.75));
  $('.bib-alejar').addEventListener('click', () => lupa(1.33));
  let avisoTimer = null;
  raiz.addEventListener('wheel', (ev) => {
    if (ruedaAcerca(ev)) return; // con Ctrl o Cmd, OrbitControls acerca
    ev.stopPropagation(); // sin Ctrl, la página baja como siempre
    if (ev.target !== lienzo) return; // sobre el panel (que tiene su propio scroll) no se muestra el aviso
    avisoZoom.classList.add('bib-visible');
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(() => avisoZoom.classList.remove('bib-visible'), 1400);
  }, { capture: true });
  // Hover: el raycast cuesta decenas de ms con 450 mil triángulos, así que se hace uno solo cuando el mouse se detiene
  // (90 ms quieto). Mientras se mueve, el nombre de la pieza resaltada solo sigue al cursor.
  let hoverTimer = 0;
  function moverNombre(ev) {
    const r = raiz.getBoundingClientRect();
    nombreEl.style.left = `${ev.clientX - r.left}px`; nombreEl.style.top = `${ev.clientY - r.top}px`;
  }
  function resaltar(ev) {
    const pieza = tocar(ev);
    if (pieza !== e.resaltada) {
      quitarResalte();
      if (pieza) {
        e.resaltada = pieza;
        pieza.traverse((o) => { if (o.isMesh && o.material !== fantasma && o.material.emissive) o.material.emissive.setHex(0x7a1f1f); });
        lienzo.classList.add('bib-sobre-pieza');
        const nombre = nombrePieza(datos.nombres, pieza.name);
        nombreEl.textContent = e.elegida === pieza ? `${nombre} · clic para ver el equipo completo` : nombre;
        nombreEl.hidden = false;
      }
    }
    if (e.resaltada) moverNombre(ev);
  }
  lienzo.addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'mouse' || ev.buttons) return;
    if (e.resaltada) moverNombre(ev);
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => resaltar(ev), 90);
  });
  lienzo.addEventListener('pointerleave', () => { clearTimeout(hoverTimer); quitarResalte(); });
  let abajo = null;
  lienzo.addEventListener('pointerdown', (ev) => {
    clearTimeout(hoverTimer);
    abajo = { x: ev.clientX, y: ev.clientY, t: performance.now() };
  });
  lienzo.addEventListener('pointerup', (ev) => {
    if (!abajo) return;
    const movido = Math.hypot(ev.clientX - abajo.x, ev.clientY - abajo.y);
    const rapido = performance.now() - abajo.t < 500;
    abajo = null;
    if (movido > 6 || !rapido) return;
    const pieza = tocar(ev);
    if (pieza) elegir(e.piezas.find((p) => p.obj === pieza || pieza.parent === p.obj)?.obj ?? pieza);
  });
  addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && e.elegida) verTodo(); });

  // --- etiquetas y bucle ---
  const tmp = new THREE.Vector3();
  function etiquetas() {
    const w = raiz.clientWidth, h = raiz.clientHeight;
    for (const p of e.piezas) {
      if (!p.el) continue;
      new THREE.Box3().setFromObject(p.obj).getCenter(tmp);
      const pr = tmp.clone().project(camara);
      p.el.style.transform = `translate(${(pr.x * 0.5 + 0.5) * w - 6}px, ${(-pr.y * 0.5 + 0.5) * h - 6}px)`;
      const visible = e.elegida ? e.elegida === p.obj : ladoVisible(tmp.toArray(), controles.target.toArray(), camara.position.toArray());
      p.el.classList.toggle('bib-oculta', !visible || pr.z > 1);
    }
  }
  renderer.setAnimationLoop((t) => {
    if (e.vuelo) {
      const k = Math.min(1, (performance.now() - e.vuelo.t0) / e.vuelo.ms);
      camara.position.lerpVectors(e.vuelo.desdePos, e.vuelo.aPos, suave(k));
      controles.target.lerpVectors(e.vuelo.desdeObj, e.vuelo.aObj, suave(k));
      if (k >= 1) e.vuelo = null;
    }
    if (e.visible) {
      controles.update();
      renderer.render(escena, camara);
      if (e.elegida) {
        // Segunda pasada: la pieza elegida encima, con la profundidad limpia. Si no, cada capa del fantasma que queda
        // delante de una pieza interior le suma un velo gris (con 8 capas le queda un tercio de su color).
        renderer.autoClear = false;
        renderer.clearDepth();
        camara.layers.set(1);
        renderer.render(escena, camara);
        camara.layers.set(0);
        renderer.autoClear = true;
      }
      if (e.modelo) etiquetas();
    }
    e.fondo?.dibujar(t);
  });
}
