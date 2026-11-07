// Calendario del equipo: entrenamientos, torneos y los tipos que cree el entrenador.
// Los partidos se guardan aparte (pestaña Partidos) y el calendario los muestra también.
import type { Elemento, Partido } from "./modelo";

export type Asistencia = "presente" | "ausente";

export interface Evento {
  id: string;
  equipoId: string;
  tipo: string; // id del tipo de evento (Ajustes)
  titulo: string;
  fecha: string; // AAAA-MM-DD
  hora: string;
  horaFin: string;
  lugar: string;
  notas: string;
  sesionId: string | null;
  asistencia: Record<string, Asistencia>;
}

/** Un elemento que se pinta en el calendario (evento propio o partido). */
export interface Cita {
  id: string;
  fecha: string;
  hora: string;
  titulo: string;
  detalle: string;
  color: string;
  tipoNombre: string;
  enlace: string;
  esPartido: boolean;
}

const dos = (n: number) => String(n).padStart(2, "0");
export const aISO = (d: Date) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
export const deISO = (s: string) => new Date(s + "T12:00");
export const sumarDias = (s: string, n: number) => { const d = deISO(s); d.setDate(d.getDate() + n); return aISO(d); };

/** Lunes de la semana de una fecha. */
export function lunesDe(s: string) {
  const d = deISO(s);
  const dia = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - dia);
  return aISO(d);
}

/** Las 6 semanas (42 días) que se ven en la cuadrícula de un mes, empezando en lunes. */
export function diasDelMes(anio: number, mes: number) {
  const primero = aISO(new Date(anio, mes, 1, 12));
  const inicio = lunesDe(primero);
  return Array.from({ length: 42 }, (_, i) => sumarDias(inicio, i));
}

export const DIAS_CORTOS = ["L", "M", "X", "J", "V", "S", "D"];

export function citasDe(eventos: Evento[], partidos: Partido[], tipos: Elemento[]): Cita[] {
  const tipo = (id: string) => tipos.find((t) => t.id === id);
  const colorPartido = tipo("partido")?.color ?? "#FF6B1A";
  return [
    ...eventos.map((e): Cita => ({
      id: e.id, fecha: e.fecha, hora: e.hora, titulo: e.titulo || tipo(e.tipo)?.nombre || "Evento",
      detalle: [e.hora && e.horaFin ? `${e.hora}–${e.horaFin}` : e.hora, e.lugar].filter(Boolean).join(" · "),
      color: tipo(e.tipo)?.color ?? "#7D8B93", tipoNombre: tipo(e.tipo)?.nombre ?? "Evento", enlace: `/calendario/${e.id}`, esPartido: false
    })),
    ...partidos.map((p): Cita => ({
      id: p.id, fecha: p.fecha, hora: p.hora, titulo: `vs ${p.rival}`,
      detalle: [p.hora, p.casa ? "En casa" : "Fuera", p.competicion].filter(Boolean).join(" · "),
      color: colorPartido, tipoNombre: "Partido", enlace: `/partidos/${p.id}`, esPartido: true
    }))
  ].sort((a, b) => (a.fecha + (a.hora || "99")).localeCompare(b.fecha + (b.hora || "99")));
}

export const resumenAsistencia = (e: Evento, jugadores: { id: string }[]) => {
  const presentes = jugadores.filter((j) => e.asistencia[j.id] === "presente").length;
  const ausentes = jugadores.filter((j) => e.asistencia[j.id] === "ausente").length;
  return { presentes, ausentes, sinMarcar: jugadores.length - presentes - ausentes };
};
