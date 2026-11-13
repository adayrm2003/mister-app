// Pizarra animada: elementos sobre el campo y una lista de pasos con sus posiciones y flechas.
// Las posiciones van en % del campo visible: x de izquierda a derecha, y de arriba (portería rival) a abajo.
import type { Punto } from "./modelo";

export type TipoPieza =
  | "jugador" | "rival" | "balon" | "cono" | "porteria"
  | "chino" | "pica" | "valla" | "aro" | "escalera" | "miniporteria" | "maniqui" | "barrera" | "peto";
export type TipoFlecha = "pase" | "conduccion" | "movimiento";

export interface Pieza {
  id: string; tipo: TipoPieza; etiqueta?: string; giro?: number;
  /** Nombre o mote que se ve debajo de la ficha (fichas de la plantilla). */
  nombre?: string;
  /** Si la ficha es un jugador real de la plantilla, su id. */
  jugadorId?: string;
  /** Tamaño de los accesorios (1 = normal). */
  escala?: number;
  /** Color de los accesorios que lo tienen (chinos, aros, petos…). */
  color?: string;
}

/** Accesorios de entrenamiento que se pueden poner en la pizarra. */
export const ACCESORIOS: { tipo: TipoPieza; texto: string; color?: string; gira: boolean }[] = [
  { tipo: "cono", texto: "Cono", gira: false },
  { tipo: "chino", texto: "Chino", color: "#FF6B1A", gira: false },
  { tipo: "pica", texto: "Pica", color: "#F5C518", gira: false },
  { tipo: "valla", texto: "Valla", color: "#D7263D", gira: true },
  { tipo: "aro", texto: "Aro", color: "#3A63C9", gira: false },
  { tipo: "escalera", texto: "Escalera", color: "#F5C518", gira: true },
  { tipo: "miniporteria", texto: "Miniportería", gira: true },
  { tipo: "porteria", texto: "Portería", gira: true },
  { tipo: "maniqui", texto: "Maniquí", color: "#3A63C9", gira: true },
  { tipo: "barrera", texto: "Barrera", color: "#3A63C9", gira: true },
  { tipo: "peto", texto: "Peto", color: "#B5E61D", gira: true }
];
export const COLORES_ACCESORIO = ["#FF6B1A", "#F5C518", "#D7263D", "#3A63C9", "#B5E61D", "#FFFFFF"];
export const esAccesorio = (t: TipoPieza) => ACCESORIOS.some((a) => a.tipo === t);
export interface Flecha { id: string; tipo: TipoFlecha; desde: Punto; hasta: Punto }

/** Dibujo libre encima del campo: lápiz, líneas, flechas, círculos, zonas y texto. */
export type TipoDibujo = "lapiz" | "linea" | "flecha" | "circulo" | "zona" | "texto";
export type EstiloFlecha = "pase" | "conduccion" | "desmarque";
export interface Dibujo {
  id: string;
  tipo: TipoDibujo;
  /** Lápiz: todos los puntos. Línea y flecha: inicio y final. Círculo y zona: dos esquinas. Texto: su posición. */
  puntos: Punto[];
  /** Punto que dobla líneas y flechas (si no hay, van rectas). */
  curva?: Punto;
  color: string;
  grosor: number;
  estilo?: EstiloFlecha;
  discontinua?: boolean;
  texto?: string;
}

export interface Paso { posiciones: Record<string, Punto>; flechas: Flecha[]; dibujos?: Dibujo[] }
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
  /** Si es una copia de un ejercicio de la biblioteca Míster, su código (por ejemplo "RON-03"). */
  origen?: string;
}

export const FLECHAS: { valor: TipoFlecha; texto: string }[] = [
  { valor: "pase", texto: "Pase" },
  { valor: "conduccion", texto: "Conducción" },
  { valor: "movimiento", texto: "Sin balón" }
];

export const COLORES_DIBUJO = [
  { valor: "#FFFFFF", texto: "Blanco" }, { valor: "#F5C518", texto: "Amarillo" }, { valor: "#FF6B1A", texto: "Naranja" },
  { valor: "#D7263D", texto: "Rojo" }, { valor: "#3A63C9", texto: "Azul" }, { valor: "#111111", texto: "Negro" }
];
export const GROSORES = [{ valor: 4, texto: "Fino" }, { valor: 7, texto: "Medio" }, { valor: 11, texto: "Grueso" }];
export const ESTILOS_FLECHA: { valor: EstiloFlecha; texto: string }[] = [
  { valor: "pase", texto: "Pase" }, { valor: "conduccion", texto: "Conducción" }, { valor: "desmarque", texto: "Desmarque" }
];

/** Pizarra guardada de un equipo (de partido o, más adelante, de balón parado). */
export interface PizarraGuardada {
  id: string;
  equipoId: string;
  tipo: "partido" | "abp";
  nombre: string;
  /** Partido del calendario al que va unida (opcional). */
  partidoId: string | null;
  pizarra: Pizarra;
  editado: string;
}

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
/** Copia profunda de una pizarra guardada (para duplicarla). */
export const copiarPizarra = (p: PizarraGuardada, nombre: string): PizarraGuardada =>
  ({ ...structuredClone(p), id: crypto.randomUUID(), nombre, editado: new Date().toISOString() });

export function copiarEjercicio(e: Ejercicio, nombre: string): Ejercicio {
  return { ...structuredClone(e), id: crypto.randomUUID(), nombre, actualizado: new Date().toISOString() };
}

export const siguienteEtiqueta = (p: Pizarra, tipo: TipoPieza) => {
  const usados = new Set(p.piezas.filter((x) => x.tipo === tipo).map((x) => x.etiqueta));
  for (let n = 1; n < 100; n++) if (!usados.has(String(n))) return String(n);
  return "";
};
