// Pizarra animada: elementos sobre el campo y una lista de pasos con sus posiciones y flechas.
// Las posiciones van en % del campo visible: x de izquierda a derecha, y de arriba (portería rival) a abajo.
import type { Punto } from "./modelo";

export type TipoPieza = "jugador" | "rival" | "balon" | "cono" | "porteria";
export type TipoFlecha = "pase" | "conduccion" | "movimiento";

export interface Pieza { id: string; tipo: TipoPieza; etiqueta?: string; giro?: number }
export interface Flecha { id: string; tipo: TipoFlecha; desde: Punto; hasta: Punto }
export interface Paso { posiciones: Record<string, Punto>; flechas: Flecha[] }
export interface Pizarra { campo: "completo" | "medio"; piezas: Pieza[]; pasos: Paso[] }

export interface Ejercicio {
  id: string;
  nombre: string;
  tipo: string;
  objetivo: string;
  duracion: number | null;
  jugadores: number | null;
  material: string;
  explicacion: string;
  notas: string;
  pizarra: Pizarra;
  actualizado: string;
}

export const FLECHAS: { valor: TipoFlecha; texto: string }[] = [
  { valor: "pase", texto: "Pase" },
  { valor: "conduccion", texto: "Conducción" },
  { valor: "movimiento", texto: "Sin balón" }
];

export const pizarraVacia = (): Pizarra => ({ campo: "medio", piezas: [], pasos: [{ posiciones: {}, flechas: [] }] });

export function ejercicioVacio(tipo: string): Ejercicio {
  return { id: crypto.randomUUID(), nombre: "", tipo, objetivo: "", duracion: null, jugadores: null, material: "", explicacion: "", notas: "", pizarra: pizarraVacia(), actualizado: new Date().toISOString() };
}

/** Posición de una pieza en un paso (si no se movió en ese paso, la del anterior). */
export function posicionEn(p: Pizarra, piezaId: string, paso: number): Punto | undefined {
  for (let i = Math.min(paso, p.pasos.length - 1); i >= 0; i--) {
    const q = p.pasos[i].posiciones[piezaId];
    if (q) return q;
  }
  return undefined;
}

const suave = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Posiciones entre el paso i y el siguiente, con t de 0 a 1. */
export function posicionesAnimadas(p: Pizarra, i: number, t: number): Record<string, Punto> {
  const r: Record<string, Punto> = {};
  const k = suave(Math.max(0, Math.min(1, t)));
  for (const pieza of p.piezas) {
    const a = posicionEn(p, pieza.id, i);
    if (!a) continue;
    const b = i + 1 < p.pasos.length ? posicionEn(p, pieza.id, i + 1) ?? a : a;
    r[pieza.id] = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  }
  return r;
}

/** Copia profunda con ids nuevos (para duplicar ejercicios). */
export function copiarEjercicio(e: Ejercicio, nombre: string): Ejercicio {
  return { ...structuredClone(e), id: crypto.randomUUID(), nombre, actualizado: new Date().toISOString() };
}

export const siguienteEtiqueta = (p: Pizarra, tipo: TipoPieza) => {
  const usados = new Set(p.piezas.filter((x) => x.tipo === tipo).map((x) => x.etiqueta));
  for (let n = 1; n < 100; n++) if (!usados.has(String(n))) return String(n);
  return "";
};
