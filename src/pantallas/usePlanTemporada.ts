// Plan de la temporada del equipo (aparte para que Inicio no cargue toda la pantalla de Temporada).
import { useColeccion } from "../ContextoEquipo";
import { aISO } from "../datos/calendario";
import { temporadaDe } from "../datos/estadisticas";
import type { PlanTemporada } from "../datos/temporada";

export function usePlanTemporada(temporada = temporadaDe(aISO(new Date()))) {
  const { filas, cargando, guardar } = useColeccion<PlanTemporada>("temporadas");
  return { plan: filas.find((p) => p.temporada === temporada), cargando, guardar };
}
