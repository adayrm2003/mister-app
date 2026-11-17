// Plan de la temporada: lo decide el entrenador a su manera. Puede crear sus etapas (con el nombre,
// las fechas y el color que quiera) y ponerle a cada semana un objetivo y unas notas.
import { aISO, deISO, lunesDe, sumarDias } from "./calendario";
import { periodoTemporada } from "./estadisticas";

export interface Etapa {
  id: string;
  nombre: string;
  desde: string;
  hasta: string;
  color: string;
  objetivos: string;
}
export interface SemanaPlan { objetivo: string; notas: string }

export interface PlanTemporada {
  id: string;
  equipoId: string;
  /** «2026-27» */
  temporada: string;
  objetivos: string;
  etapas: Etapa[];
  /** Por el lunes de cada semana (AAAA-MM-DD). */
  semanas: Record<string, SemanaPlan>;
}

export const COLORES_ETAPA = ["#1A7F53", "#FF6B1A", "#3A63C9", "#8E5BD6", "#D7263D", "#F5C518", "#0EA5E9", "#7D8B93"];

/** Lunes de todas las semanas de la temporada (de la que contiene el 1 de agosto a la del 31 de julio). */
export function semanasDe(temporada: string): string[] {
  const p = periodoTemporada(temporada);
  const r: string[] = [];
  for (let l = lunesDe(p.desde!); l <= p.hasta!; l = sumarDias(l, 7)) r.push(l);
  return r;
}

export const etapaDe = (plan: PlanTemporada | undefined, fecha: string) =>
  plan?.etapas.find((e) => e.desde <= fecha && fecha <= e.hasta);

/** Etapa que toca una semana (la que tenga más días de esa semana). */
export function etapaDeSemana(plan: PlanTemporada | undefined, lunes: string) {
  if (!plan) return undefined;
  let mejor: Etapa | undefined, max = 0;
  for (const e of plan.etapas) {
    let n = 0;
    for (let i = 0; i < 7; i++) { const d = sumarDias(lunes, i); if (e.desde <= d && d <= e.hasta) n++; }
    if (n > max) { max = n; mejor = e; }
  }
  return mejor;
}

/** Etapas típicas para empezar (el entrenador las cambia o las borra como quiera). */
export function etapasTipicas(temporada: string): Omit<Etapa, "id">[] {
  const a = Number(temporada.slice(0, 4)), b = a + 1;
  return [
    { nombre: "Pretemporada", desde: `${a}-08-25`, hasta: `${a}-09-21`, color: COLORES_ETAPA[3], objetivos: "" },
    { nombre: "Primera vuelta", desde: `${a}-09-22`, hasta: `${a}-12-21`, color: COLORES_ETAPA[0], objetivos: "" },
    { nombre: "Navidad", desde: `${a}-12-22`, hasta: `${b}-01-06`, color: COLORES_ETAPA[7], objetivos: "" },
    { nombre: "Segunda vuelta", desde: `${b}-01-07`, hasta: `${b}-04-30`, color: COLORES_ETAPA[2], objetivos: "" },
    { nombre: "Final de temporada", desde: `${b}-05-01`, hasta: `${b}-06-30`, color: COLORES_ETAPA[1], objetivos: "" }
  ];
}

export const textoSemana = (lunes: string) => {
  const d = deISO(lunes), f = deISO(sumarDias(lunes, 6));
  const mes = (x: Date) => x.toLocaleDateString("es-ES", { month: "short" }).replace(".", "");
  return d.getMonth() === f.getMonth() ? `${d.getDate()}–${f.getDate()} ${mes(f)}` : `${d.getDate()} ${mes(d)} – ${f.getDate()} ${mes(f)}`;
};
export const hoyLunes = () => lunesDe(aISO(new Date()));
