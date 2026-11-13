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
/** Colores de peto para separar grupos de jugadores en los ejercicios. */
export const COLORES_PETO = [
  { valor: "#FF6B1A", texto: "Naranja" }, { valor: "#F5C518", texto: "Amarillo" }, { valor: "#B5E61D", texto: "Verde flúor" },
  { valor: "#D7263D", texto: "Rojo" }, { valor: "#3A63C9", texto: "Azul" }, { valor: "#FFFFFF", texto: "Blanco" }, { valor: "#111111", texto: "Negro" }
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

export interface Paso {
  posiciones: Record<string, Punto>; flechas: Flecha[]; dibujos?: Dibujo[];
  /** Segundos que tardan las fichas en llegar a este paso desde el anterior (si no hay, DURACION_PASO). */
  duracion?: number;
}
export const DURACION_PASO = 1.3;
export const duracionPaso = (p: Pizarra, i: number) => p.pasos[i]?.duracion ?? DURACION_PASO;

/* ---------- Balón parado ---------- */
export type TipoABP = "corner" | "falta-directa" | "falta-indirecta" | "banda" | "penalti" | "puerta";
export type LadoABP = "ataque" | "defensa";
export const JUGADAS_ABP: { valor: TipoABP; texto: string }[] = [
  { valor: "corner", texto: "Córner" }, { valor: "falta-directa", texto: "Falta directa" }, { valor: "falta-indirecta", texto: "Falta indirecta" },
  { valor: "banda", texto: "Saque de banda" }, { valor: "penalti", texto: "Penalti" }, { valor: "puerta", texto: "Saque de puerta" }
];
export const nombreJugada = (t: TipoABP) => JUGADAS_ABP.find((j) => j.valor === t)?.texto ?? "Balón parado";
export interface Pizarra {
  campo: "completo" | "medio"; piezas: Pieza[]; pasos: Paso[];
  /** Solo en las jugadas de balón parado: qué jugada es y si la sacamos nosotros (ataque) o el rival (defensa). */
  jugada?: { tipo: TipoABP; lado: LadoABP };
}

export interface Ejercicio {
  id: string;
  nombre: string;
  tipo: string;
  objetivo: string;
  duracion: number | null;
  jugadores: number | null;
  material: string;
  /** Tamaño del espacio de trabajo, por ejemplo «20x20 m». */
  espacio?: string;
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

/**
 * Colocación inicial de cada jugada a balón parado (en % del campo visible; la portería atacada está arriba).
 * «a» = equipo que saca, «d» = equipo que defiende (el último «d» es el portero), «b» = balón.
 */
const COLOCACION: Record<TipoABP, { campo: "medio" | "completo"; fichas: [rol: "a" | "d" | "b", x: number, y: number][] }> = {
  corner: { campo: "medio", fichas: [["b", 5, 7], ["a", 9, 12], ["a", 44, 23], ["a", 57, 23], ["a", 70, 19], ["a", 40, 34], ["a", 58, 35], ["a", 24, 20],
    ["d", 38, 15.5], ["d", 50, 15.5], ["d", 62, 15.5], ["d", 30, 28], ["d", 51, 28], ["d", 64, 30], ["d", 50, 6]] },
  "falta-directa": { campo: "medio", fichas: [["b", 50, 41], ["a", 45, 46], ["a", 56, 46], ["a", 36, 30], ["a", 70, 33],
    ["d", 42, 24], ["d", 49.5, 24], ["d", 57, 24], ["d", 64.5, 24], ["d", 32, 20], ["d", 50, 6]] },
  "falta-indirecta": { campo: "medio", fichas: [["b", 28, 37], ["a", 24, 42], ["a", 40, 24], ["a", 52, 21], ["a", 64, 24], ["a", 46, 32], ["a", 60, 32],
    ["d", 46, 15], ["d", 58, 14], ["d", 70, 17], ["d", 34, 31], ["d", 70, 30], ["d", 50, 6]] },
  banda: { campo: "medio", fichas: [["b", 6, 55.5], ["a", 4, 61], ["a", 16, 46], ["a", 20, 64], ["a", 30, 54], ["d", 24, 47], ["d", 28, 65], ["d", 38, 47], ["d", 50, 6]] },
  penalti: { campo: "medio", fichas: [["b", 50, 25.7], ["a", 50, 33], ["a", 36, 36], ["a", 64, 36], ["d", 43, 38], ["d", 57, 38], ["d", 50, 6]] },
  puerta: { campo: "completo", fichas: [["b", 50, 93.5], ["a", 50, 97], ["a", 33, 88], ["a", 67, 88], ["a", 12, 78], ["a", 88, 78], ["a", 50, 76],
    ["d", 38, 67], ["d", 62, 67], ["d", 50, 60]] }
};

/** Pizarra de partida para una jugada: si defendemos, las fichas de «mi equipo» son las que defienden. */
export function pizarraABP(tipo: TipoABP, lado: LadoABP): Pizarra {
  const c = COLOCACION[tipo];
  const piezas: Pieza[] = [];
  const posiciones: Record<string, Punto> = {};
  const n = { jugador: 0, rival: 0 };
  for (const [rol, x, y] of c.fichas) {
    const id = crypto.randomUUID();
    const t: TipoPieza = rol === "b" ? "balon" : (rol === "a") === (lado === "ataque") ? "jugador" : "rival";
    piezas.push({ id, tipo: t, ...(t !== "balon" ? { etiqueta: String(++n[t as "jugador" | "rival"]) } : {}) });
    posiciones[id] = { x, y };
  }
  return { campo: c.campo, piezas, pasos: [{ posiciones, flechas: [], dibujos: [] }], jugada: { tipo, lado } };
}

/** Cada paso con la posición de todas las fichas que ya existen (para poder reordenar pasos sin perder nada). */
export function completarPasos(p: Pizarra): Pizarra {
  return {
    ...p,
    pasos: p.pasos.map((ps, i) => {
      const posiciones: Record<string, Punto> = {};
      for (const pieza of p.piezas) { const q = posicionEn(p, pieza.id, i); if (q) posiciones[pieza.id] = q; }
      return { ...ps, posiciones };
    })
  };
}
