// Sesiones de entrenamiento: ejercicios de la biblioteca ordenados por fases.
import type { Elemento } from "./modelo";
import type { Ejercicio } from "./pizarra";

export interface Bloque {
  id: string;
  faseId: string;
  ejercicioId: string;
  /** Minutos en esta sesión. Si es null se usan los del ejercicio. */
  minutos: number | null;
  notas: string;
}

export interface Sesion {
  id: string;
  nombre: string;
  objetivo: string;
  notas: string;
  bloques: Bloque[];
  actualizado: string;
}

export const sesionVacia = (): Sesion => ({ id: crypto.randomUUID(), nombre: "", objetivo: "", notas: "", bloques: [], actualizado: new Date().toISOString() });

export const minutosDe = (b: Bloque, e?: Ejercicio) => b.minutos ?? e?.duracion ?? 0;

export function duracionTotal(s: Sesion, ejercicios: Map<string, Ejercicio>) {
  return s.bloques.reduce((t, b) => t + minutosDe(b, ejercicios.get(b.ejercicioId)), 0);
}

export interface GrupoFase { fase: Elemento; bloques: Bloque[]; minutos: number }

/** Bloques agrupados en el orden de las fases. Los de fases que ya no existen van al final en "Otros". */
export function porFases(s: Sesion, fases: Elemento[], ejercicios: Map<string, Ejercicio>): GrupoFase[] {
  const ids = new Set(fases.map((f) => f.id));
  const grupos = fases.map((fase) => ({ fase, bloques: s.bloques.filter((b) => b.faseId === fase.id) }));
  const sueltos = s.bloques.filter((b) => !ids.has(b.faseId));
  if (sueltos.length) grupos.push({ fase: { id: "__otros", nombre: "Otros" }, bloques: sueltos });
  return grupos.map((g) => ({ ...g, minutos: g.bloques.reduce((t, b) => t + minutosDe(b, ejercicios.get(b.ejercicioId)), 0) }));
}

/** Bloques en el orden en que se hacen (fase por fase): para el modo campo y el PDF. */
export const bloquesEnOrden = (s: Sesion, fases: Elemento[], ejercicios: Map<string, Ejercicio>) =>
  porFases(s, fases, ejercicios).flatMap((g) => g.bloques.map((b) => ({ bloque: b, fase: g.fase })));

export const copiarSesion = (s: Sesion, nombre: string): Sesion => ({
  ...structuredClone(s), id: crypto.randomUUID(), nombre, actualizado: new Date().toISOString(),
  bloques: s.bloques.map((b) => ({ ...b, id: crypto.randomUUID() }))
});

export const textoMinutos = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ""}`.trim() : `${m} min`);
