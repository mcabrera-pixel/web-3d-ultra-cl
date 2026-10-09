// Lógica pura del hub y las fichas de la biblioteca (sin Astro ni DOM): se prueba con node --test.

/** Etapas del proceso minero con su nombre visible. Única fuente: el esquema de la colección toma de aquí sus valores. */
export const ETAPAS = {
  carguio: 'Carguío',
  transporte: 'Transporte',
  subterranea: 'Subterránea',
  chancado: 'Chancado',
  clasificacion: 'Clasificación',
  molienda: 'Molienda',
};

/**
 * Equipos para «Otros equipos» de la ficha de `actual`: primero los de su misma etapa y después por `orden`, hasta `max`.
 * @param {{ id: string, data: { etapa: string, orden: number } }[]} equipos
 * @param {{ id: string, data: { etapa: string } }} actual
 */
export function otrosEquipos(equipos, actual, max = 3) {
  const otraEtapa = (e) => (e.data.etapa === actual.data.etapa ? 0 : 1);
  return equipos
    .filter((e) => e.id !== actual.id)
    .sort((a, b) => otraEtapa(a) - otraEtapa(b) || a.data.orden - b.data.orden)
    .slice(0, max);
}
