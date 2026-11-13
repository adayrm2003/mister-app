// Vídeos de análisis: el entrenador sube un trozo de vídeo de su equipo, para en los momentos
// clave y dibuja encima para explicarlo. Cada vídeo se borra solo a los 30 días de subirlo.
import type { Dibujo } from "./pizarra";

export const DIAS_VIDEO = 30;
/** Tamaño máximo de cada vídeo en el servidor (el plan gratuito de Supabase no deja más de 50 MB por archivo). */
export const LIMITE_BYTES = 50 * 1024 * 1024;
/** Si hay que reducirlo, como mucho estos minutos (a la calidad reducida caben en el límite). */
export const MINUTOS_MAX = 4;

/** Un momento del vídeo donde el entrenador para y dibuja. */
export interface MomentoVideo {
  id: string;
  /** Segundo del vídeo. */
  t: number;
  nombre: string;
  dibujos: Dibujo[];
}

export interface VideoAnalisis {
  id: string;
  equipoId: string;
  nombre: string;
  /** Segundos. */
  duracion: number;
  ancho: number;
  alto: number;
  /** Dónde está el archivo: «equipo/id.ext». */
  ruta: string;
  tipoArchivo: string;
  tamano: number;
  /** Cuándo se subió (lo pone el servidor). A los 30 días se borra. */
  subido: string;
  momentos: MomentoVideo[];
}

const DIA = 24 * 3600 * 1000;
export const caducaEl = (v: Pick<VideoAnalisis, "subido">) => new Date(new Date(v.subido).getTime() + DIAS_VIDEO * DIA);
export const caducado = (v: Pick<VideoAnalisis, "subido">, ahora = Date.now()) => caducaEl(v).getTime() <= ahora;
/** Días que le quedan (redondeando hacia arriba; 0 si ya ha caducado). */
export const diasQuedan = (v: Pick<VideoAnalisis, "subido">, ahora = Date.now()) => Math.max(0, Math.ceil((caducaEl(v).getTime() - ahora) / DIA));

export const textoCaduca = (v: Pick<VideoAnalisis, "subido">) => {
  const d = diasQuedan(v);
  const fecha = caducaEl(v).toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  return d <= 1 ? `Se borra hoy o mañana (${fecha})` : `Se borra el ${fecha} · quedan ${d} días`;
};

/** 75,4 → «1:15». */
export function tiempo(seg: number, decimas = false) {
  const s = Math.max(0, seg);
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  const entero = Math.floor(r).toString().padStart(2, "0");
  return decimas ? `${m}:${entero},${Math.floor((r % 1) * 10)}` : `${m}:${entero}`;
}

export const extensionDe = (tipo: string) => (tipo.includes("mp4") ? "mp4" : tipo.includes("webm") ? "webm" : tipo.includes("quicktime") ? "mov" : "mp4");

/** Momentos ordenados por tiempo. */
export const ordenarMomentos = (m: MomentoVideo[]) => [...m].sort((a, b) => a.t - b.t);
