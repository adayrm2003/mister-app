// Reparto justo de minutos: propone cuándo hacer los cambios para que todos los convocados
// jueguen parecido. El portero (si se elige) juega todo el partido y no entra en el reparto.
import type { Puesto } from "./modelo";

export interface CambioPrevisto { minuto: number; sale: string; entra: string; descanso?: boolean }
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
  /** Con límite: minutos de las ventanas de cambio durante el juego. */
  ventanas?: number[];
  /** Con límite: también se cambia en el descanso. */
  descanso?: boolean;
  puesto: (id: string) => Puesto | undefined;
}

export const MAX_VENTANAS = 3;
/** Ventanas automáticas: una en la primera parte y dos en la segunda (2×30 → 20′, 40′ y 50′). */
export function ventanasPorDefecto(partes: number, minutosParte: number): number[] {
  const dur = partes * minutosParte;
  if (partes < 2) return [Math.round(dur / 3), Math.round(dur / 2), Math.round((dur * 2) / 3)];
  return [Math.round((minutosParte * 2) / 3), minutosParte + Math.round(minutosParte / 3), minutosParte + Math.round((minutosParte * 2) / 3)];
}
/** Momentos en que se puede cambiar con límite: las ventanas y (si se quiere) el descanso. */
export function momentosDeCambio(partes: number, minutosParte: number, ventanas: number[], descanso: boolean) {
  const dur = partes * minutosParte;
  const m = ventanas.filter((x) => x > 0 && x < dur).slice(0, MAX_VENTANAS).map((minuto) => ({ minuto, descanso: false }));
  if (descanso && partes >= 2) m.push({ minuto: minutosParte, descanso: true });
  return m.sort((a, b) => a.minuto - b.minuto || Number(b.descanso) - Number(a.descanso));
}
/** Cuántos cambios se hacen en cada momento: se reparten y sobran hacia los del centro del partido (más justo). */
export function repartoCambios(momentos: { minuto: number }[], total: number, dur: number): number[] {
  const n = momentos.length;
  if (!n || total <= 0) return momentos.map(() => 0);
  const r = momentos.map(() => Math.floor(total / n));
  const porCentro = momentos.map((m, i) => [Math.abs(m.minuto - dur / 2), i] as const).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
  for (let k = 0; k < total % n; k++) r[porCentro[k]]++;
  return r;
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
 * Con un máximo de cambios (y sin volver a entrar): los cambios se reparten entre las ventanas elegidas
 * y el descanso. El que sale en el minuto m juega m minutos y el que entra, el resto.
 * Si hay más suplentes que cambios, alguno se queda sin jugar.
 */
function conLimite(e: Entrada, resto: string[], huecos: number, portero: string | null, minutos: Record<string, number>, dur: number, limite: number): PlanCambios {
  const tit = e.titulares.filter((id) => resto.includes(id)).slice(0, huecos);
  const inicio = [...tit, ...resto.filter((id) => !tit.includes(id))].slice(0, huecos);
  const banquillo = resto.filter((id) => !inicio.includes(id));
  const total = Math.min(limite, banquillo.length);
  let momentos = momentosDeCambio(e.partes, e.minutosParte, e.ventanas ?? ventanasPorDefecto(e.partes, e.minutosParte), e.descanso ?? true);
  if (!momentos.length) momentos = [{ minuto: Math.round(dur / 2), descanso: e.partes >= 2 }];
  // Si hay menos cambios que momentos, se usan los más cercanos a la mitad del partido
  if (total < momentos.length) {
    const cerca = [...momentos].sort((a, b) => Math.abs(a.minuto - dur / 2) - Math.abs(b.minuto - dur / 2)).slice(0, total);
    momentos = momentos.filter((m) => cerca.includes(m));
  }
  const cuantos = repartoCambios(momentos, total, dur);
  const libres = [...inicio].reverse(); // salen primero los últimos de la alineación
  const entran = banquillo.slice(0, total);
  const cambios: CambioPrevisto[] = [];
  momentos.forEach((m, i) => {
    for (let k = 0; k < cuantos[i]; k++) {
      const en = entran.shift();
      if (!en) return;
      const j = Math.max(0, libres.findIndex((x) => e.puesto(x) === e.puesto(en)));
      const sale = libres.splice(j, 1)[0];
      if (sale) cambios.push({ minuto: m.minuto, sale, entra: en, descanso: m.descanso });
    }
  });
  for (const id of resto) minutos[id] = 0;
  for (const id of inicio) minutos[id] = dur;
  for (const c of cambios) { minutos[c.sale] = c.minuto; minutos[c.entra] = dur - c.minuto; }
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
