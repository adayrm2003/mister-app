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
  /** Partidos en los que estaba convocado (titular o en el banquillo de la alineación). */
  convocado: number;
  /** % de convocatorias sobre los partidos jugados que tienen alineación. */
  asistenciaPartidos: number | null;
}

export interface ResumenEquipo { jugados: number; victorias: number; empates: number; derrotas: number; gf: number; gc: number }

/** Un partido cuenta como jugado si ya llegó su día y tiene alineación, algo apuntado o está terminado. */
export const partidoJugado = (p: Partido, hoy: string) =>
  p.fecha <= hoy && (!!p.alineacion || (p.acciones ?? []).length > 0 || !!p.reloj?.terminado);

export function estadisticas(jugadores: Jugador[], partidos: Partido[], eventos: Evento[], duracion: number, hoy: string) {
  const jugados = partidos.filter((p) => partidoJugado(p, hoy));
  const filas = new Map<string, FilaJugador>(jugadores.map((j) => [j.id, {
    jugador: j, jugados: 0, titular: 0, minutos: 0, goles: 0, asistencias: 0, amarillas: 0, rojas: 0, entrenos: 0, presente: 0, asistencia: null,
    convocado: 0, asistenciaPartidos: null
  }]));
  const conAlineacion = jugados.filter((p) => !!p.alineacion).length;

  const equipo: ResumenEquipo = { jugados: 0, victorias: 0, empates: 0, derrotas: 0, gf: 0, gc: 0 };
  for (const p of jugados) {
    const r = resultado(p);
    equipo.jugados++; equipo.gf += r.nuestros; equipo.gc += r.suyos;
    if (r.signo === "victoria") equipo.victorias++; else if (r.signo === "derrota") equipo.derrotas++; else equipo.empates++;

    const min = minutosFinales(p, duracion);
    const acciones = p.acciones ?? [];
    const titulares = new Set((p.alineacion?.titulares ?? []).filter((x): x is string => !!x));
    // Convocados: titulares y banquillo de la alineación
    for (const id of new Set([...titulares, ...(p.alineacion?.suplentes ?? [])])) { const f = filas.get(id); if (f) f.convocado++; }
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
  for (const f of filas.values()) {
    f.asistencia = f.entrenos ? Math.round((f.presente / f.entrenos) * 100) : null;
    f.asistenciaPartidos = conAlineacion ? Math.round((f.convocado / conAlineacion) * 100) : null;
  }

  const entrenosSinLista = eventos.filter((e) => e.tipo === "entrenamiento" && e.fecha <= hoy && Object.keys(e.asistencia ?? {}).length === 0)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  return { filas: [...filas.values()], equipo, partidosJugados: jugados, entrenosConLista: entrenos.length, conAlineacion, entrenosSinLista };
}

/* ---------- Periodo: temporada (de agosto a julio) o fechas a mano ---------- */
export interface Periodo { desde: string | null; hasta: string | null }
/** Temporada a la que pertenece una fecha: empieza el 1 de agosto. «2026-27». */
export function temporadaDe(fecha: string) {
  const a = Number(fecha.slice(0, 4)), m = Number(fecha.slice(5, 7));
  const ini = m >= 8 ? a : a - 1;
  return `${ini}-${String((ini + 1) % 100).padStart(2, "0")}`;
}
export const periodoTemporada = (t: string): Periodo => { const ini = Number(t.slice(0, 4)); return { desde: `${ini}-08-01`, hasta: `${ini + 1}-07-31` }; };
const enPeriodo = (f: string, p: Periodo) => (!p.desde || f >= p.desde) && (!p.hasta || f <= p.hasta);
export function filtrarPeriodo(partidos: Partido[], eventos: Evento[], p: Periodo) {
  return { partidos: partidos.filter((x) => enPeriodo(x.fecha, p)), eventos: eventos.filter((x) => enPeriodo(x.fecha, p)) };
}
/** Temporadas que tienen algo (y siempre la actual), de la más reciente a la más antigua. */
export function temporadasCon(partidos: Partido[], eventos: Evento[], hoy: string) {
  return [...new Set([temporadaDe(hoy), ...partidos.map((p) => temporadaDe(p.fecha)), ...eventos.map((e) => temporadaDe(e.fecha))])].sort().reverse();
}

/* ---------- Ficha de un jugador: partido a partido y entrenamientos ---------- */
export interface PartidoJugador {
  partido: Partido; nuestros: number; suyos: number; signo: "victoria" | "empate" | "derrota";
  convocado: boolean; titular: boolean; minutos: number; goles: number; asistencias: number; amarillas: number; roja: boolean;
}
export function partidosDeJugador(jugadorId: string, partidos: Partido[], duracion: number, hoy: string): PartidoJugador[] {
  return partidos.filter((p) => partidoJugado(p, hoy)).sort((a, b) => b.fecha.localeCompare(a.fecha)).map((p) => {
    const r = resultado(p), a = p.acciones ?? [];
    const titulares = (p.alineacion?.titulares ?? []).filter(Boolean) as string[];
    return {
      partido: p, nuestros: r.nuestros, suyos: r.suyos, signo: r.signo,
      convocado: titulares.includes(jugadorId) || (p.alineacion?.suplentes ?? []).includes(jugadorId),
      titular: titulares.includes(jugadorId), minutos: minutosFinales(p, duracion)[jugadorId] ?? 0,
      goles: a.filter((x) => x.tipo === "gol" && x.jugadorId === jugadorId).length,
      asistencias: a.filter((x) => x.tipo === "gol" && x.asistenteId === jugadorId).length,
      amarillas: a.filter((x) => x.tipo === "amarilla" && x.jugadorId === jugadorId).length,
      roja: expulsiones(a).has(jugadorId)
    };
  });
}
