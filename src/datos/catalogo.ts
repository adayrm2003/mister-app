// Biblioteca de ejercicios de Míster: la misma para todos los entrenadores y de solo lectura.
// Se carga con scripts/importar-ejercicios.mjs. Cada entrenador puede copiar un ejercicio a sus
// ejercicios (para editarlo) o añadirlo a una sesión (se copia también, una sola vez).
import type { Elemento } from "./modelo";
import { pizarraVacia, type Ejercicio } from "./pizarra";

export type Nivel = "iniciacion" | "intermedio" | "avanzado";
export type FaseJuego = "ataque" | "defensa" | "transicion-ad" | "transicion-da" | "global" | "analitico";
export type Intensidad = "baja" | "media" | "alta";

export interface EjercicioCatalogo {
  id: string;
  nombre: string;
  tipo: string;
  objetivo: string;
  fase: FaseJuego;
  niveles: Nivel[];
  jugadoresMin: number | null;
  jugadoresMax: number | null;
  espacio: string;
  duracion: number | null;
  intensidad: Intensidad;
  material: string;
  descripcion: string;
  reglas: string[];
  puntosClave: string[];
  variantes: string[];
}

export const NIVELES: { valor: Nivel; texto: string }[] = [
  { valor: "iniciacion", texto: "Iniciación" }, { valor: "intermedio", texto: "Intermedio" }, { valor: "avanzado", texto: "Avanzado" }
];
export const FASES_JUEGO: { valor: FaseJuego; texto: string }[] = [
  { valor: "ataque", texto: "Ataque" }, { valor: "defensa", texto: "Defensa" },
  { valor: "transicion-ad", texto: "Transición ataque-defensa" }, { valor: "transicion-da", texto: "Transición defensa-ataque" },
  { valor: "global", texto: "Global" }, { valor: "analitico", texto: "Analítico" }
];
export const INTENSIDADES: { valor: Intensidad; texto: string }[] = [
  { valor: "baja", texto: "Baja" }, { valor: "media", texto: "Media" }, { valor: "alta", texto: "Alta" }
];
export const nombreNivel = (n: Nivel) => NIVELES.find((x) => x.valor === n)?.texto ?? n;
export const nombreFase = (f: FaseJuego) => FASES_JUEGO.find((x) => x.valor === f)?.texto ?? f;
export const nombreIntensidad = (i: Intensidad) => INTENSIDADES.find((x) => x.valor === i)?.texto ?? i;

export const textoJugadores = (e: EjercicioCatalogo) =>
  e.jugadoresMin && e.jugadoresMax ? (e.jugadoresMin === e.jugadoresMax ? `${e.jugadoresMin}` : `${e.jugadoresMin} a ${e.jugadoresMax}`) : "";

/** Copia que viene dentro de la app (modo prueba o sin conexión). */
let copiaLocal: Promise<EjercicioCatalogo[]> | null = null;
export function cargarCatalogoLocal() {
  copiaLocal ??= import("./catalogo.json").then((m) => m.default as EjercicioCatalogo[]);
  return copiaLocal;
}

/* ---------- Filtros ---------- */
export type Duracion = "corta" | "media" | "larga";
export const DURACIONES_FILTRO: { valor: Duracion; texto: string; cabe: (m: number) => boolean }[] = [
  { valor: "corta", texto: "Hasta 8 min", cabe: (m) => m <= 8 },
  { valor: "media", texto: "9 a 12 min", cabe: (m) => m > 8 && m <= 12 },
  { valor: "larga", texto: "Más de 12 min", cabe: (m) => m > 12 }
];

export interface Filtros {
  texto: string;
  tipo: string | null;
  nivel: Nivel | null;
  fase: FaseJuego | "transicion" | null;
  intensidad: Intensidad | null;
  duracion: Duracion | null;
  /** Jugadores que tiene el entrenador: salen los ejercicios en los que caben. */
  jugadores: number | null;
}
export const FILTROS_VACIOS: Filtros = { texto: "", tipo: null, nivel: null, fase: null, intensidad: null, duracion: null, jugadores: null };

const sinAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function filtrar(lista: EjercicioCatalogo[], f: Filtros) {
  const q = sinAcentos(f.texto.trim());
  const dur = DURACIONES_FILTRO.find((d) => d.valor === f.duracion);
  return lista.filter((e) =>
    (!q || sinAcentos(e.nombre).includes(q) || sinAcentos(e.objetivo).includes(q)) &&
    (!f.tipo || e.tipo === f.tipo) &&
    (!f.nivel || e.niveles.includes(f.nivel)) &&
    (!f.fase || (f.fase === "transicion" ? e.fase.startsWith("transicion") : e.fase === f.fase)) &&
    (!f.intensidad || e.intensidad === f.intensidad) &&
    (!dur || (e.duracion != null && dur.cabe(e.duracion))) &&
    (!f.jugadores || ((e.jugadoresMin ?? 0) <= f.jugadores && f.jugadores <= (e.jugadoresMax ?? 99)))
  );
}
export const filtrosActivos = (f: Filtros) =>
  [f.tipo, f.nivel, f.fase, f.intensidad, f.duracion, f.jugadores].filter((x) => x !== null).length;

/** Tipos de la biblioteca, en el orden en que se trabajan en una sesión. */
export const ORDEN_TIPOS = [
  "Calentamiento", "Coordinación y juegos motores", "Conducción y regate", "Pase y control", "Rondos",
  "Posesión y juego de posición", "Finalización", "Duelos 1x1 y 2x1", "Defensa", "Transiciones",
  "Juegos reducidos y partidos condicionados", "Táctica colectiva", "Balón parado (ABP)", "Porteros", "Físico y prevención"
];
export const tiposDe = (lista: EjercicioCatalogo[]) =>
  [...new Set(lista.map((e) => e.tipo))].sort((a, b) => (ORDEN_TIPOS.indexOf(a) + 1 || 99) - (ORDEN_TIPOS.indexOf(b) + 1 || 99));

/* ---------- Pasarlo a los ejercicios del entrenador ---------- */
const TIPO_PROPIO: Record<string, string> = {
  "Calentamiento": "calentamiento", "Físico y prevención": "fisico", "Juegos reducidos y partidos condicionados": "partido",
  "Táctica colectiva": "tactica", "Defensa": "tactica", "Transiciones": "tactica", "Posesión y juego de posición": "tactica", "Balón parado (ABP)": "tactica"
};
function tipoPropio(tipo: string, tipos: Elemento[]) {
  const id = TIPO_PROPIO[tipo] ?? "tecnica";
  if (tipos.some((t) => t.id === id)) return id;
  return tipos.find((t) => t.nombre.toLowerCase() === tipo.toLowerCase())?.id ?? tipos[0]?.id ?? "";
}

/** Convierte un ejercicio de la biblioteca en uno del entrenador, sin perder información. */
export function aEjercicioPropio(c: EjercicioCatalogo, tipos: Elemento[], nombre = c.nombre): Ejercicio {
  const jug = textoJugadores(c);
  const lineas = [
    ["Organización", jug ? `${jug} jugadores` : ""],
    ["Desarrollo", c.descripcion],
    ["Reglas", c.reglas.join(" · ")],
    ["Consignas", c.puntosClave.join(" · ")],
    ["Variantes", c.variantes.join(" · ")]
  ].filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
  const notas = [`Biblioteca Míster (${c.id})`, `Fase: ${nombreFase(c.fase)}`, `Intensidad: ${nombreIntensidad(c.intensidad)}`,
    c.niveles.length ? `Nivel: ${c.niveles.map(nombreNivel).join(", ")}` : ""].filter(Boolean).join(" · ");
  return {
    id: crypto.randomUUID(), nombre, tipo: tipoPropio(c.tipo, tipos), objetivo: c.objetivo, duracion: c.duracion,
    jugadores: c.jugadoresMax ?? c.jugadoresMin, material: c.material, espacio: c.espacio, explicacion: lineas.join("\n"), notas,
    pizarra: pizarraVacia(), actualizado: new Date().toISOString(), origen: c.id
  };
}

/** Fase de la sesión en la que encaja mejor: calentamiento al principio, vuelta a la calma al final. */
export function fasePara(c: EjercicioCatalogo, fases: Elemento[]) {
  if (!fases.length) return "";
  if (c.tipo === "Calentamiento") return fases[0].id;
  if (/vuelta a la calma|recuperaci/i.test(c.nombre + " " + c.objetivo)) return fases[fases.length - 1].id;
  return fases[Math.min(1, fases.length - 1)].id;
}
