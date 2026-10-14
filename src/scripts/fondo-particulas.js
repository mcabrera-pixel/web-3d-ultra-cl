// Fondo «antigravity» (estándar visual MCCO): la nube de puntos del mismo equipo queda fija detrás del contenido,
// flota, gira y se abre o se arma a medida que se baja por la página. Se dibuja solo con el visor fuera de pantalla.
import * as THREE from 'three';
import { avanceScroll, aperturaNube, giroNube, distanciaEncuadre } from './visor3d-logica.js';

export function iniciarFondo({ modelo, radio, altura, escenario, angosto, reducir }) {
  const lienzo = document.createElement('canvas');
  lienzo.className = 'bib-fondo';
  lienzo.setAttribute('aria-hidden', 'true');
  document.body.prepend(lienzo);

  const total = angosto ? 9000 : 24000;
  const vertices = [];
  const v = new THREE.Vector3();
  modelo.updateMatrixWorld(true);
  modelo.traverse((o) => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 3) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      vertices.push(v.x, v.y - altura * 0.45, v.z);
    }
  });
  const n = Math.min(total, vertices.length / 3);
  const paso = vertices.length / 3 / Math.max(1, n);
  const posiciones = new Float32Array(n * 3);
  const semillas = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const k = Math.floor(i * paso) * 3;
    posiciones.set([vertices[k], vertices[k + 1], vertices[k + 2]], i * 3);
    semillas[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  geo.setAttribute('semilla', new THREE.BufferAttribute(semillas, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTiempo: { value: 0 }, uDispersion: { value: 0 }, uRadio: { value: radio }, uTam: { value: angosto ? 1.6 : 2.2 } },
    vertexShader: `
      attribute float semilla;
      uniform float uTiempo, uDispersion, uRadio, uTam;
      varying float vSemilla;
      void main() {
        vec3 p = position;
        vec3 dir = normalize(p + vec3(0.0001, 0.0002, 0.0003));
        p += dir * uDispersion * uRadio * (0.35 + semilla);
        p.y += sin(uTiempo * 0.7 + semilla * 6.2831) * uRadio * 0.012;
        gl_PointSize = uTam * (0.6 + semilla * 0.8);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        vSemilla = semilla;
      }`,
    fragmentShader: `
      varying float vSemilla;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        if (dot(c, c) > 0.25) discard;
        vec3 col = mix(vec3(0.92, 0.92, 0.94), vec3(0.83, 0.18, 0.18), step(0.72, vSemilla));
        gl_FragColor = vec4(col, 0.55);
      }`,
  });
  const escena = new THREE.Scene();
  escena.add(new THREE.Points(geo, material));
  const camara = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, radio / 100, radio * 50);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: false, alpha: true, powerPreference: 'low-power' });
  } catch {
    lienzo.remove();
    return { dibujar() {} };
  }
  let estrecho = angosto; // la cantidad de puntos queda la del inicio; el resto sigue al ancho actual
  const ajustar = () => {
    estrecho = escenario.clientWidth < 900;
    renderer.setPixelRatio(Math.min(devicePixelRatio, estrecho ? 1 : 1.5));
    material.uniforms.uTam.value = estrecho ? 1.6 : 2.2;
    renderer.setSize(innerWidth, innerHeight, false);
    camara.aspect = innerWidth / innerHeight;
    camara.updateProjectionMatrix();
  };
  ajustar();
  addEventListener('resize', ajustar);

  return {
    dibujar(t) {
      const borde = escenario.getBoundingClientRect().bottom;
      const visible = borde < innerHeight * 0.35;
      lienzo.style.opacity = visible ? (estrecho ? '0.4' : '0.6') : '0';
      if (!visible) return;
      const inicio = scrollY + borde - innerHeight * 0.35;
      const avance = avanceScroll(scrollY, inicio, document.documentElement.scrollHeight - innerHeight);
      const giro = giroNube(t, avance, reducir);
      const d = distanciaEncuadre(radio, 35, camara.aspect) * (estrecho ? 1.2 : 1.05);
      camara.position.set(Math.sin(giro) * d, d * 0.28, Math.cos(giro) * d);
      camara.lookAt(0, 0, 0);
      if (estrecho) camara.clearViewOffset();
      else camara.setViewOffset(innerWidth, innerHeight, -innerWidth * 0.2, 0, innerWidth, innerHeight);
      material.uniforms.uTiempo.value = reducir ? 0 : t / 1000;
      material.uniforms.uDispersion.value = aperturaNube(avance, reducir);
      renderer.render(escena, camara);
    },
  };
}
