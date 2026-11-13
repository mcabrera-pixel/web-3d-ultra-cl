// Índice de piezas de la bomba: Tabla 28 del manual de instrucciones (pág. 63-64),
// ilustración 24 «Cierre mecánico normativo con cubierta de presión encajada».
// Número y denominación se transcriben tal como vienen en el manual.
// material: lo que dice la hoja de datos de la bomba (fuente "hoja de datos") o un supuesto marcado.
// paginas: páginas del manual (de 74) donde la pieza aparece o se trata.
// aplica: false cuando una nota del manual dice que la pieza no va en esta ejecución
//         (material G, soporte de cojinete WE55); igual se modela para que la tabla quede completa.

export const GRUPOS = [
  { id: 'carcasa', nombre: 'Carcasa y cubierta' },
  { id: 'rotor', nombre: 'Rotor' },
  { id: 'cierre', nombre: 'Cierre del eje' },
  { id: 'cojinetes', nombre: 'Soporte de cojinetes' },
  { id: 'conexiones', nombre: 'Conexiones' },
];

const HD = 'hoja de datos';
const SUP = 'supuesto';

export const PIEZAS = [
  // ---- carcasa y cubierta
  { numero: '102', nombre: 'Carcasa espiral', grupo: 'carcasa', material: 'Fundición gris JL 1040', fuenteMaterial: HD, cantidad: 1, paginas: [63, 16] },
  { numero: '163.2', nombre: 'Cubierta de presión', grupo: 'carcasa', material: 'Fundición gris JL 1040', fuenteMaterial: HD, cantidad: 1, paginas: [63, 47, 53] },
  { numero: '400.1/.3', nombre: 'Junta plana', grupo: 'carcasa', material: 'Fibra aramida sin amianto', fuenteMaterial: SUP, cantidad: 2, paginas: [63, 64, 56], detalle: '400.1 entre carcasa y cubierta de presión; 400.3 bajo el casquillo protector del eje.' },
  { numero: '502.1/.2', nombre: 'Anillo partido', grupo: 'carcasa', material: 'Fundición gris', fuenteMaterial: HD, cantidad: 2, paginas: [63, 56], detalle: '502.1 en la carcasa, lado aspiración; 502.2 en la cubierta de presión, lado impulsión.' },
  { numero: '902.1-3', nombre: 'Perno roscado', grupo: 'carcasa', material: 'Acero 8.8', fuenteMaterial: HD, cantidad: 8, paginas: [63, 64, 54], detalle: 'Pernos que unen carcasa espiral y soporte de cojinetes (902.3 en el dibujo).' },
  { numero: '920.1/.5', nombre: 'Tuerca', grupo: 'carcasa', material: 'Acero 8', fuenteMaterial: HD, cantidad: 9, paginas: [63, 64, 47, 54], detalle: '920.1 es la tuerca del rodete; 920.5 son las tuercas de los pernos de la carcasa.' },
  { numero: '903.1', nombre: 'Tornillo de cierre', grupo: 'carcasa', material: 'Acero', fuenteMaterial: HD, cantidad: 2, paginas: [63, 64, 25], detalle: 'Tapones de las conexiones 6D y 6B. Nota 23 del manual: en ejecuciones C y S lleva junta anular adicional 411.5, que aquí no aplica.' },
  // ---- rotor
  { numero: '210', nombre: 'Eje', grupo: 'rotor', material: 'Acero bonificado C45', fuenteMaterial: HD, cantidad: 1, paginas: [63, 48, 56] },
  { numero: '230', nombre: 'Rodete', grupo: 'rotor', material: 'Fundición gris JL 1040', fuenteMaterial: HD, cantidad: 1, paginas: [63, 47, 53, 56], detalle: 'Rodete cerrado de 314 mm de diámetro (hoja de datos).' },
  { numero: '550', nombre: 'Arandela', grupo: 'rotor', material: 'Acero', fuenteMaterial: SUP, cantidad: 1, paginas: [63], aplica: false, detalle: 'Nota 22 del manual: solo en unidad de eje 25. Esta bomba tiene soporte WE55, así que no se monta; se muestra para completar la tabla.' },
  { numero: '930.3', nombre: 'Seguro', grupo: 'rotor', material: 'Acero', fuenteMaterial: SUP, cantidad: 2, paginas: [63, 64], detalle: 'Seguro de la tuerca del rodete y seguro del tornillo de la chapa de cubierta.' },
  { numero: '940.2', nombre: 'Chaveta', grupo: 'rotor', material: 'Acero C45K', fuenteMaterial: SUP, cantidad: 2, paginas: [63], detalle: 'Chavetas del rodete. Nota 21 del manual: con unidad de eje 55 van 2 chavetas.' },
  { numero: '940.3', nombre: 'Chaveta', grupo: 'rotor', material: 'Acero C45K', fuenteMaterial: SUP, cantidad: 1, paginas: [63], detalle: 'Chaveta del extremo de acoplamiento.' },
  // ---- cierre del eje
  { numero: '433', nombre: 'Cierre mecánico', grupo: 'cierre', material: 'Carbón / carburo de silicio / EPDM', fuenteMaterial: SUP, cantidad: 1, paginas: [63, 35, 47, 50, 56], detalle: 'Cierre mecánico normativo de efecto simple con circulación interior (hoja de datos).' },
  { numero: '476', nombre: 'Soporte del anillo estacionario', grupo: 'cierre', material: 'Acero inoxidable', fuenteMaterial: SUP, cantidad: 1, paginas: [63], aplica: false, detalle: 'Nota 24 del manual: solo en ejecuciones B y S. Esta bomba es de material G; se muestra para completar la tabla.' },
  { numero: '412', nombre: 'Junta tórica', grupo: 'cierre', material: 'EPDM', fuenteMaterial: SUP, cantidad: 1, paginas: [63, 64], aplica: false, detalle: 'Nota 24 del manual: solo en ejecuciones B y S. Esta bomba es de material G; se muestra para completar la tabla.' },
  { numero: '523', nombre: 'Casquillo protector del eje', grupo: 'cierre', material: 'Acero CrNiMo 1.4571', fuenteMaterial: HD, cantidad: 1, paginas: [63, 47, 50, 56] },
  // ---- soporte de cojinetes
  { numero: '330', nombre: 'Soporte de cojinetes', grupo: 'cojinetes', material: 'Fundición gris JL 1040', fuenteMaterial: HD, cantidad: 1, paginas: [63, 48, 56], detalle: 'Tamaño de soporte WE55, rodamientos lubricados con grasa (hoja de datos).' },
  { numero: '321', nombre: 'Rodamiento de bolas', grupo: 'cojinetes', material: 'Acero de rodamientos 100Cr6', fuenteMaterial: SUP, cantidad: 2, paginas: [63, 43, 48, 49, 56], detalle: 'Dos rodamientos rígidos de bolas: lado acoplamiento y lado bomba. Lubricación con grasa.' },
  { numero: '360.1', nombre: 'Tapa de cojinetes', grupo: 'cojinetes', material: 'Fundición gris', fuenteMaterial: SUP, cantidad: 2, paginas: [63, 64, 48, 49] },
  { numero: '411', nombre: 'Junta anular', grupo: 'cojinetes', material: 'Junta sin amianto', fuenteMaterial: HD, cantidad: 2, paginas: [63, 64, 43], detalle: 'Sellos de los cojinetes; la hoja de datos indica junta de cojinete tipo anillo V.' },
  { numero: '932', nombre: 'Anillo de seguridad', grupo: 'cojinetes', material: 'Acero para resortes', fuenteMaterial: SUP, cantidad: 2, paginas: [63, 48] },
  { numero: '183', nombre: 'Pie de apoyo', grupo: 'cojinetes', material: 'Acero', fuenteMaterial: SUP, cantidad: 1, paginas: [63, 20] },
  { numero: '81-92', nombre: 'Chapa de cubierta', grupo: 'cojinetes', material: 'Chapa de acero', fuenteMaterial: SUP, cantidad: 1, paginas: [63], detalle: 'Cubre la ventana del soporte de cojinetes.' },
  { numero: '901.1-3', nombre: 'Tornillo hexagonal', grupo: 'cojinetes', material: 'Acero 8.8', fuenteMaterial: SUP, cantidad: 3, paginas: [63, 54], detalle: '901.1 en el soporte, 901.2 en el pie de apoyo y 901.3 en la chapa de cubierta.' },
  // ---- conexiones (puntos de la carcasa y del soporte)
  { numero: '1M', nombre: 'Conexión de manómetro', grupo: 'conexiones', material: 'Rosca Rc 1/2, taladrada y cerrada', fuenteMaterial: HD, cantidad: 1, paginas: [63, 25] },
  { numero: '6B', nombre: 'Vaciado de líquido de bombeo', grupo: 'conexiones', material: 'Rosca G 1/2, taladrada y cerrada', fuenteMaterial: HD, cantidad: 1, paginas: [63, 25, 45] },
  { numero: '6D', nombre: 'Llenado de líquido de bombeo', grupo: 'conexiones', material: 'Rosca Rc 1/2, taladrada y cerrada', fuenteMaterial: HD, cantidad: 1, paginas: [63, 25, 33] },
  { numero: '8B', nombre: 'Evacuación de líquido de fuga', grupo: 'conexiones', material: 'Rosca G 1/2, taladrada y cerrada', fuenteMaterial: HD, cantidad: 1, paginas: [63, 25] },
];

// Conjuntos fuera de la numeración del manual.
export const CONJUNTOS = [
  { numero: 'MOT', nombre: 'Motor eléctrico', grupo: 'conjunto', detalle: 'Motor de inducción 4 polos, carcasa 280M, forma B3, 600 V, 50 Hz, 100 HP (hoja de datos).' },
  { numero: 'ACO', nombre: 'Acoplamiento con espaciador', grupo: 'conjunto', detalle: 'Acoplamiento elástico tamaño 200 con espaciador de 140 mm y protector (hoja de datos).' },
  { numero: 'BAS', nombre: 'Placa de base', grupo: 'conjunto', detalle: 'Perfil en U con placa rebordeada, acero, pernos de anclaje M20x250 (plano de instalación).' },
];

// Expande "502.1/.2" -> ["502.1","502.2"], "901.1-3" -> ["901.1","901.2","901.3"].
export function subnumeros(numero) {
  const m = numero.match(/^(\d+)\.(\d+)([\/-])\.?(\d+)$/);
  if (!m) return [numero];
  const base = m[1], a = +m[2], b = +m[4];
  if (m[3] === '/') return [`${base}.${a}`, `${base}.${b}`];
  const out = []; for (let i = a; i <= b; i++) out.push(`${base}.${i}`); return out;
}

// Busca la entrada de la tabla que corresponde a un número escrito por el usuario ("230", "502.2", "81-92", "mot").
export function buscarPieza(q) {
  if (q == null) return null;
  const s = String(q).trim().toUpperCase().replace(',', '.');
  const todas = [...PIEZAS, ...CONJUNTOS];
  return todas.find(p => p.numero.toUpperCase() === s)
    || todas.find(p => subnumeros(p.numero).some(n => n.toUpperCase() === s))
    || todas.find(p => p.numero.toUpperCase().split(/[./-]/)[0] === s.split(/[./-]/)[0] && /^\d/.test(s))
    || null;
}
