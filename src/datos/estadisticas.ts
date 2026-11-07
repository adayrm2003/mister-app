// Estadísticas de la temporada. Todo se cuenta por jugador (su id), nunca por dorsal.
import type { Evento } from "./calendario";
import type { Jugador, Partido } from "./modelo";
import { expulsiones, minutosFinales, resultado } from "./partido";

export interface FilaJugador {
  jugador: Jugador;
  jugados: number;
  titular: number;
  minutos: number;
  goles: number;
  asistencias: number;
  amarillas: number;
  rojas: number;
  entrenos: number; // entrenamientos con lista pasada
  presente: number;
  asistencia: number | null; // % de 0 a 100
}

export interface ResumenEquipo { jugados: number; victorias: number; empates: number; derrotas: number; gf: number; gc: number }

/** Un partido cuenta como jugado si ya llegó su día y tiene alineación, algo apuntado o está terminado. */
export const partidoJugado = (p: Partido, hoy: string) =>
  p.fecha <= hoy && (!!p.alineacion || (p.acciones ?? []).length > 0 || !!p.reloj?.terminado);

export function estadisticas(jugadores: Jugador[], partidos: Partido[], eventos: Evento[], duracion: number, hoy: string) {
  const jugados = partidos.filter((p) => partidoJugado(p, hoy));
  const filas = new Map<string, FilaJugador>(jugadores.map((j) => [j.id, {
    jugador: j, jugados: 0, titular: 0, minutos: 0, goles: 0, asistencias: 0, amarillas: 0, rojas: 0, entrenos: 0, presente: 0, asistencia: null
  }]));

  const equipo: ResumenEquipo = { jugados: 0, victorias: 0, empates: 0, derrotas: 0, gf: 0, gc: 0 };
  for (const p of jugados) {
    const r = resultado(p);
    equipo.jugados++; equipo.gf += r.nuestros; equipo.gc += r.suyos;
    if (r.signo === "victoria") equipo.victorias++; else if (r.signo === "derrota") equipo.derrotas++; else equipo.empates++;

    const min = minutosFinales(p, duracion);
    const acciones = p.acciones ?? [];
    const titulares = new Set((p.alineacion?.titulares ?? []).filter((x): x is string => !!x));
    const ids = new Set([...Object.keys(min), ...titulares]);
    for (const id of ids) {
      const f = filas.get(id);
      if (!f) continue;
      const m = min[id] ?? 0;
      f.minutos += m;
      if (titulares.has(id)) f.titular++;
      if (m > 0 || titulares.has(id)) f.jugados++;
    }
    const sumar = (id: string | undefined, campo: "goles" | "asistencias" | "amarillas") => { const f = id ? filas.get(id) : undefined; if (f) f[campo]++; };
    for (const a of acciones) {
      if (a.tipo === "gol") { sumar(a.jugadorId, "goles"); sumar(a.asistenteId, "asistencias"); }
      if (a.tipo === "amarilla") sumar(a.jugadorId, "amarillas");
    }
    // Rojas: roja directa o expulsión por doble amarilla
    for (const id of expulsiones(acciones).keys()) { const f = filas.get(id); if (f) f.rojas++; }
  }

  // Asistencia: entrenamientos ya pasados en los que se pasó lista
  const entrenos = eventos.filter((e) => e.tipo === "entrenamiento" && e.fecha <= hoy && Object.keys(e.asistencia ?? {}).length > 0);
  for (const e of entrenos) {
    for (const [id, estado] of Object.entries(e.asistencia)) {
      const f = filas.get(id);
      if (!f) continue;
      f.entrenos++;
      if (estado === "presente") f.presente++;
    }
  }
  for (const f of filas.values()) f.asistencia = f.entrenos ? Math.round((f.presente / f.entrenos) * 100) : null;

  return { filas: [...filas.values()], equipo, partidosJugados: jugados, entrenosConLista: entrenos.length };
}
