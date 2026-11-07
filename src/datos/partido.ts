// Lo que pasa en un partido: goles, cambios y tarjetas, el reloj y los minutos de cada jugador.
// Todo va por jugador (su id), nunca por dorsal, para que las estadísticas cuadren aunque cambie de número.
import type { Alineacion, Partido } from "./modelo";

export type TipoAccion = "gol" | "golRival" | "cambio" | "amarilla" | "roja" | "amarillaRival" | "rojaRival";

export interface Accion {
  id: string;
  tipo: TipoAccion;
  minuto: number;
  jugadorId?: string; // goleador, jugador amonestado o jugador que sale
  asistenteId?: string; // solo en goles
  entraId?: string; // solo en cambios
  dorsalRival?: number | null; // tarjetas del otro equipo
}

/** Reloj del partido: parte en juego y cuándo empezó (hora del dispositivo). */
export interface Reloj { parte: number; inicio: number | null; terminado: boolean }

export const accionesDe = (p: Partido): Accion[] => [...(p.acciones ?? [])].sort((a, b) => a.minuto - b.minuto);

export function resultado(p: Partido) {
  const a = p.acciones ?? [];
  const nuestros = a.filter((x) => x.tipo === "gol").length;
  const suyos = a.filter((x) => x.tipo === "golRival").length;
  return { nuestros, suyos, signo: nuestros > suyos ? "victoria" : nuestros < suyos ? "derrota" : "empate" } as const;
}

/**
 * Segundos de partido que marca el reloj: cada parte empieza donde acaba la anterior en el papel
 * (la 2ª siempre en el 45:00 si las partes son de 45) y sigue contando si hay añadido.
 */
export function segundosActuales(r: Reloj | undefined, minutosParte: number): number | null {
  if (!r || r.inicio == null) return null;
  return (r.parte - 1) * minutosParte * 60 + Math.max(0, (Date.now() - r.inicio) / 1000);
}

/** Minuto para apuntar acciones: del 0:00 al 0:59 es el minuto 1. */
export function minutoActual(r: Reloj | undefined, minutosParte: number): number | null {
  const s = segundosActuales(r, minutosParte);
  return s == null ? null : Math.floor(s / 60) + 1;
}

export const mmss = (seg: number) => `${Math.floor(seg / 60)}:${String(Math.floor(seg % 60)).padStart(2, "0")}`;

/** Expulsiones del rival por dorsal (roja o segunda amarilla). */
export function expulsionesRival(acciones: Accion[]): Map<number, number> {
  const m = new Map<number, number>(), am = new Map<number, number>();
  for (const a of [...acciones].sort((x, y) => x.minuto - y.minuto)) {
    if (a.dorsalRival == null) continue;
    if (a.tipo === "rojaRival" && !m.has(a.dorsalRival)) m.set(a.dorsalRival, a.minuto);
    if (a.tipo === "amarillaRival") {
      const n = (am.get(a.dorsalRival) ?? 0) + 1;
      am.set(a.dorsalRival, n);
      if (n === 2 && !m.has(a.dorsalRival)) m.set(a.dorsalRival, a.minuto);
    }
  }
  return m;
}

/** Minuto en que un jugador queda expulsado (roja directa o segunda amarilla). */
export function expulsiones(acciones: Accion[]): Map<string, number> {
  const m = new Map<string, number>();
  const amarillas = new Map<string, number>();
  for (const a of [...acciones].sort((x, y) => x.minuto - y.minuto)) {
    if (!a.jugadorId) continue;
    if (a.tipo === "roja" && !m.has(a.jugadorId)) m.set(a.jugadorId, a.minuto);
    if (a.tipo === "amarilla") {
      const n = (amarillas.get(a.jugadorId) ?? 0) + 1;
      amarillas.set(a.jugadorId, n);
      if (n === 2 && !m.has(a.jugadorId)) m.set(a.jugadorId, a.minuto);
    }
  }
  return m;
}

/** Jugadores en el campo en un minuto dado (titulares, cambios y expulsiones hasta ese minuto). */
export function enCampo(al: Alineacion | null, acciones: Accion[], minuto: number): Set<string> {
  const dentro = new Set((al?.titulares ?? []).filter((x): x is string => !!x));
  for (const a of [...acciones].sort((x, y) => x.minuto - y.minuto)) {
    if (a.minuto > minuto) break;
    if (a.tipo === "cambio") { if (a.jugadorId) dentro.delete(a.jugadorId); if (a.entraId) dentro.add(a.entraId); }
  }
  for (const [id, m] of expulsiones(acciones)) if (m <= minuto) dentro.delete(id);
  return dentro;
}

/**
 * Minutos jugados por cada jugador calculados con: la duración, los titulares, los cambios y las expulsiones.
 * Si un jugador sale y vuelve a entrar (cambios libres), se suman sus ratos.
 */
export function minutosCalculados(al: Alineacion | null, acciones: Accion[], duracion: number): Record<string, number> {
  const fin = Math.max(duracion, ...acciones.map((a) => a.minuto));
  const entrada = new Map<string, number>();
  const total: Record<string, number> = {};
  const sumar = (id: string, hasta: number) => {
    const desde = entrada.get(id);
    if (desde == null) return;
    total[id] = (total[id] ?? 0) + Math.max(0, hasta - desde);
    entrada.delete(id);
  };
  (al?.titulares ?? []).forEach((id) => { if (id) { entrada.set(id, 0); total[id] = 0; } });
  const exp = expulsiones(acciones);
  const sucesos: { minuto: number; hacer: () => void }[] = [];
  for (const a of acciones) if (a.tipo === "cambio") sucesos.push({ minuto: a.minuto, hacer: () => {
    if (a.jugadorId) sumar(a.jugadorId, a.minuto);
    if (a.entraId && !entrada.has(a.entraId)) { entrada.set(a.entraId, a.minuto); total[a.entraId] ??= 0; }
  } });
  for (const [id, m] of exp) sucesos.push({ minuto: m, hacer: () => sumar(id, m) });
  sucesos.sort((x, y) => x.minuto - y.minuto).forEach((s) => s.hacer());
  for (const id of [...entrada.keys()]) sumar(id, fin);
  (al?.suplentes ?? []).forEach((id) => { total[id] ??= 0; });
  return total;
}

/** Minutos definitivos: los corregidos a mano mandan sobre los calculados. */
export function minutosFinales(p: Partido, duracion: number): Record<string, number> {
  return { ...minutosCalculados(p.alineacion, p.acciones ?? [], duracion), ...(p.minutosManuales ?? {}) };
}

export const TEXTO_ACCION: Record<TipoAccion, string> = {
  gol: "Gol", golRival: "Gol del rival", cambio: "Cambio", amarilla: "Amarilla", roja: "Roja",
  amarillaRival: "Amarilla al rival", rojaRival: "Roja al rival"
};
