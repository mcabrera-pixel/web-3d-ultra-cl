// Escena base: render, cámara, luces, materiales y animaciones.
import * as THREE from '../vendor/three.module.min.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from '../vendor/CSS2DRenderer.js';

export const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const muySuave = (t) => t * t * t * (t * (t * 6 - 15) + 10); // parte y termina sin velocidad ni aceleración

export function crearEscena(cont) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  cont.appendChild(renderer.domElement);
  const rotulos = new CSS2DRenderer();
  rotulos.domElement.className = 'capa-rotulos';
  cont.appendChild(rotulos.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 250);
  camera.position.set(-3.2, 2.6, 4.6);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.09;
  controls.minDistance = 0.35; controls.maxDistance = 95;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.target.set(0.6, 0.7, 0);

  // Entorno para los reflejos del metal: una sala de paneles claros, generada en memoria.
  {
    const s = new THREE.Scene();
    const sala = new THREE.Mesh(new THREE.BoxGeometry(24, 12, 24), new THREE.MeshBasicMaterial({ color: 0x3c4046, side: THREE.BackSide }));
    sala.position.y = 5; s.add(sala);
    const panel = (w, h, d, x, y, z, k) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial()); m.material.color.setScalar(k); m.position.set(x, y, z); s.add(m); };
    panel(10, 0.2, 10, 0, 10.8, 0, 7); panel(0.2, 5, 9, -11.8, 5.5, 0, 3.2); panel(0.2, 5, 9, 11.8, 5.5, 0, 2.0); panel(9, 5, 0.2, 0, 5.5, 11.8, 2.6); panel(9, 4, 0.2, 0, 5, -11.8, 1.2);
    const piso = new THREE.Mesh(new THREE.BoxGeometry(24, 0.2, 24), new THREE.MeshBasicMaterial({ color: 0x23262a })); piso.position.y = -0.9; s.add(piso);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(s, 0.035).texture;
    pm.dispose();
  }
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f96, 0.5));
  const sol = new THREE.DirectionalLight(0xffffff, 1.9);
  sol.position.set(5.5, 9, 6.5); sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
  sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.012;
  sol.target.position.set(0.8, 0.4, -1.2);
  scene.add(sol, sol.target);
  const relleno = new THREE.DirectionalLight(0xdfe8ff, 0.45); relleno.position.set(-6, 4, -3); scene.add(relleno);

  // ---------- materiales ----------
  const m = (color, rugosidad, metal, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rugosidad, metalness: metal, ...extra });
  const pz = (color, rugosidad, metal) => m(color, rugosidad, metal, { vertexColors: true }); // piezas de la bomba: admiten tinte por vértice
  const mat = {
    pintura: pz(0x2f6e74, 0.46, 0.3), pintura2: pz(0x3a8087, 0.46, 0.3), rodete: pz(0xb9b2a4, 0.5, 0.75), fundicion: pz(0x8c9094, 0.55, 0.7),
    acero: pz(0xc9ced3, 0.26, 0.92), inox: pz(0xdde1e4, 0.2, 0.95), zinc: pz(0xaab1b6, 0.38, 0.85), goma: pz(0x17181a, 0.9, 0),
    junta: pz(0x9a5637, 0.92, 0), carbon: pz(0x2b2d31, 0.32, 0.35), ceramica: pz(0xe9e6df, 0.25, 0.1), laton: pz(0xb8924c, 0.35, 0.85), galv: pz(0xb4bcc1, 0.5, 0.7),
    // sala y conjuntos
    hormigon: m(0x63676b, 0.95, 0), hormigon2: m(0x7b7f83, 0.95, 0), muro: m(0x84898e, 0.92, 0), base: m(0x2c3138, 0.55, 0.5),
    motor: m(0x46546a, 0.45, 0.4), motor2: m(0x39455a, 0.5, 0.4), oscuro: m(0x202327, 0.6, 0.4), caneria: m(0xaab2b8, 0.42, 0.45),
    valvula: m(0x56616b, 0.45, 0.55), volante: m(0xc0392b, 0.5, 0.2), amarillo: m(0xe0b01c, 0.55, 0.15), inst: m(0x2d5fa6, 0.4, 0.35),
    aceroS: m(0xb9c0c6, 0.3, 0.9), elastico: m(0x1c1d1f, 0.85, 0), banda: m(0x2a7a55, 0.55, 0.1), estructura: m(0x6d747b, 0.55, 0.45),
    defensa: m(0xe0b01c, 0.6, 0.2, { transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }),
    mesa: m(0x15171a, 0.9, 0.1), blanco: m(0xeceeef, 0.6, 0),
  };

  // ---------- bucle de dibujo: solo se dibuja cuando algo cambió ----------
  let sucio = true; const tareas = new Set(); const vivos = new Set(); const despues = new Set();
  const invalidar = () => { sucio = true; };
  function animar({ dur = 800, paso, fin, ease = suave }) {
    const t0 = performance.now();
    const tarea = { cancelar() { tareas.delete(tarea); } };
    tarea.tick = (ahora) => {
      const t = Math.min(1, (ahora - t0) / dur);
      paso(ease(t), t);
      if (t >= 1) { tareas.delete(tarea); if (fin) fin(); }
    };
    tareas.add(tarea); return tarea;
  }
  const alFrame = (fn) => { vivos.add(fn); return () => vivos.delete(fn); };
  const alDibujar = (fn) => { despues.add(fn); return () => despues.delete(fn); }; // se llama después de cada cuadro dibujado
  let vuelo = null;
  function volar(pos, objetivo, dur = 1100) {
    if (vuelo) vuelo.cancelar();
    const p0 = camera.position.clone(), o0 = controls.target.clone();
    if (dur <= 0) { camera.position.copy(pos); controls.target.copy(objetivo); controls.update(); invalidar(); return; }
    vuelo = animar({ dur, paso: (k) => { camera.position.lerpVectors(p0, pos, k); controls.target.lerpVectors(o0, objetivo, k); } });
  }
  // Deja libre el ancho que tapan los paneles: corre el centro óptico al medio del área visible.
  const margen = { izq: 0, der: 0, abajo: 0, arriba: 0 };
  function ajustar() {
    const w = cont.clientWidth, h = cont.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h); rotulos.setSize(w, h);
    camera.aspect = w / h;
    const dx = (margen.der - margen.izq) / 2, dy = (margen.abajo - margen.arriba) / 2;
    if (dx || dy) camera.setViewOffset(w, h, dx, dy, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix(); invalidar();
  }
  function margenes(o) { Object.assign(margen, o); ajustar(); }
  // Distancia para que una esfera de radio r entre en el área libre de la vista.
  function distanciaPara(r) {
    const w = cont.clientWidth - margen.izq - margen.der, h = cont.clientHeight - margen.abajo - margen.arriba;
    const fv = THREE.MathUtils.degToRad(camera.fov) / 2;
    const fh = Math.atan(Math.tan(fv) * (cont.clientWidth / cont.clientHeight));
    const kv = Math.max(0.2, h / cont.clientHeight), kh = Math.max(0.2, w / cont.clientWidth);
    return Math.max(r / Math.sin(Math.atan(Math.tan(fv) * kv)), r / Math.sin(Math.atan(Math.tan(fh) * kh)));
  }
  new ResizeObserver(ajustar).observe(cont);
  ajustar();

  function ciclo(ahora) {
    requestAnimationFrame(ciclo);
    for (const t of [...tareas]) t.tick(ahora);
    for (const f of vivos) f(ahora);
    const movio = controls.update();
    if (sucio || movio || tareas.size || vivos.size) { sucio = false; renderer.render(scene, camera); rotulos.render(scene, camera); for (const f of despues) f(); }
  }
  requestAnimationFrame(ciclo);
  controls.addEventListener('change', invalidar);

  function rotulo(html, clase, pos, padre) {
    const d = document.createElement('div'); d.className = clase; d.innerHTML = html;
    const o = new CSS2DObject(d); o.position.copy(pos); (padre || scene).add(o); return o;
  }
  return { THREE, renderer, scene, camera, controls, mat, invalidar, animar, alFrame, alDibujar, volar, cancelarVuelo: () => { if (vuelo) { vuelo.cancelar(); vuelo = null; } }, margenes, distanciaPara, rotulo, cont, sol };
}
