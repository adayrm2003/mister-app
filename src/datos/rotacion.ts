// Reparto justo de minutos: propone cuándo hacer los cambios para que todos los convocados
// jueguen parecido. El portero (si se elige) juega todo el partido y no entra en el reparto.
import type { Puesto } from "./modelo";

export interface CambioPrevisto { minuto: number; sale: string; entra: string }
/** Máximo de cambios por partido que permite la ley (sin volver a entrar). */
export const MAX_CAMBIOS = 5;

export interface PlanCambios {
  /** Tramos en que se divide cada parte (1 = solo cambios en el descanso). */
  tramos: number;
  /** null = cambios ilimitados (se puede volver a entrar); 5 = máximo 5 cambios y quien sale no vuelve. */
  limite?: number | null;
  porteroId: string | null;
  cambios: CambioPrevisto[];
  /** Minutos previstos para cada jugador. */
  minutos: Record<string, number>;
}

interface Entrada {
  convocados: string[];
  titulares: string[];
  porteroId: string | null;
  enCampo: number;
  partes: number;
  minutosParte: number;
  tramos: number;
  limite?: number | null;
  puesto: (id: string) => Puesto | undefined;
}

export function planificar(e: Entrada): PlanCambios {
  const dur = e.partes * e.minutosParte;
  const portero = e.porteroId && e.convocados.includes(e.porteroId) ? e.porteroId : null;
  const resto = e.convocados.filter((id) => id !== portero);
  const huecos = Math.max(0, e.enCampo - (portero ? 1 : 0));
  const minutos: Record<string, number> = {};
  if (portero) minutos[portero] = dur;
  const tramosTotal = Math.max(1, e.partes * Math.max(1, e.tramos));
  const largo = e.minutosParte / Math.max(1, e.tramos);
  const limite = e.limite ?? null;
  if (resto.length <= huecos) {
    resto.forEach((id) => (minutos[id] = dur));
    return { tramos: e.tramos, limite, porteroId: portero, cambios: [], minutos };
  }
  if (limite != null) return conLimite(e, resto, huecos, portero, minutos, dur, limite);
  const veces = new Map(resto.map((id) => [id, 0]));
  const orden = new Map(resto.map((id, i) => [id, i]));
  let anterior: string[] = [];
  const grupos: string[][] = [];
  for (let t = 0; t < tramosTotal; t++) {
    let elegidos: string[];
    if (t === 0) {
      // Empiezan los titulares de la alineación (si los hay) y se completa con los demás
      const tit = e.titulares.filter((id) => veces.has(id)).slice(0, huecos);
      elegidos = [...tit, ...resto.filter((id) => !tit.includes(id))].slice(0, huecos);
    } else {
      // Juegan los que menos tramos llevan; a igualdad, siguen los que ya estaban (menos cambios)
      elegidos = [...resto].sort((a, b) =>
        veces.get(a)! - veces.get(b)! || Number(anterior.includes(b)) - Number(anterior.includes(a)) || orden.get(a)! - orden.get(b)!
      ).slice(0, huecos);
    }
    elegidos.forEach((id) => veces.set(id, veces.get(id)! + 1));
    grupos.push(elegidos);
    anterior = elegidos;
  }
  const cambios: CambioPrevisto[] = [];
  for (let t = 1; t < grupos.length; t++) {
    const salen = grupos[t - 1].filter((id) => !grupos[t].includes(id));
    const entran = grupos[t].filter((id) => !grupos[t - 1].includes(id));
    const minuto = Math.round(t * largo);
    // Se empareja a cada uno que sale con uno que entra de su misma posición si se puede
    const libres = [...entran];
    for (const s of salen) {
      const i = Math.max(0, libres.findIndex((x) => e.puesto(x) === e.puesto(s)));
      const en = libres.splice(i, 1)[0];
      if (en) cambios.push({ minuto, sale: s, entra: en });
    }
  }
  for (const [id, n] of veces) minutos[id] = Math.round(n * largo);
  return { tramos: e.tramos, limite, porteroId: portero, cambios, minutos };
}

/**
 * Con un máximo de cambios (y sin volver a entrar), lo más justo es hacerlos todos a mitad de partido:
 * el que sale y el que entra juegan lo mismo. Si hay más suplentes que cambios, alguno se queda sin jugar.
 */
function conLimite(e: Entrada, resto: string[], huecos: number, portero: string | null, minutos: Record<string, number>, dur: number, limite: number): PlanCambios {
  const tit = e.titulares.filter((id) => resto.includes(id)).slice(0, huecos);
  const inicio = [...tit, ...resto.filter((id) => !tit.includes(id))].slice(0, huecos);
  const banquillo = resto.filter((id) => !inicio.includes(id));
  const entran = banquillo.slice(0, Math.min(limite, banquillo.length));
  const mitad = Math.round(dur / 2);
  const libres = [...inicio].reverse(); // salen primero los últimos de la alineación
  const cambios: CambioPrevisto[] = [];
  for (const en of entran) {
    const i = Math.max(0, libres.findIndex((x) => e.puesto(x) === e.puesto(en)));
    const sale = libres.splice(i, 1)[0];
    if (sale) cambios.push({ minuto: mitad, sale, entra: en });
  }
  for (const id of resto) minutos[id] = 0;
  for (const id of inicio) minutos[id] = dur;
  for (const c of cambios) { minutos[c.sale] = mitad; minutos[c.entra] = dur - mitad; }
  return { tramos: e.tramos, limite, porteroId: portero, cambios, minutos };
}

/** Cambios previstos que aún no se han hecho, a partir del minuto que se le pase. */
export function pendientes(plan: PlanCambios | undefined | null, hechos: { minuto: number; jugadorId?: string; entraId?: string }[]) {
  if (!plan) return [];
  const usados = new Set<number>();
  return plan.cambios.filter((c) => {
    const i = hechos.findIndex((h, k) => !usados.has(k) && h.jugadorId === c.sale && h.entraId === c.entra);
    if (i >= 0) { usados.add(i); return false; }
    return true;
  });
}
