// Propuesta de sesión a partir del objetivo de la semana: busca en tus ejercicios y en la Biblioteca
// Míster los que mejor encajan con las palabras del objetivo (sin inteligencia artificial: por palabras).
import type { EjercicioCatalogo } from "./catalogo";
import type { Ejercicio } from "./pizarra";

const VACIAS = new Set("a al algo ante con contra de del desde el en entre es hacia hasta la las lo los mas más mejorar mejora para por que se sin sobre su sus trabajar trabajo un una uno unos y o e ni del juego equipo".split(" "));

/** Palabras parecidas: si el objetivo dice una, también vale la otra. */
const PARECIDAS: string[][] = [
  ["presion", "presionar", "pressing", "recuperar", "recuperacion", "robo", "tras perdida"],
  ["salida", "salir", "construccion", "inicio", "portero"],
  ["posesion", "rondo", "conservar", "mantener", "juego de posicion"],
  ["finalizacion", "finalizar", "tiro", "remate", "rematar", "gol", "definicion"],
  ["transicion", "contraataque", "contragolpe", "repliegue"],
  ["defensa", "defender", "defensivo", "marcaje", "cobertura", "basculacion"],
  ["pase", "pases", "control", "recepcion", "circulacion"],
  ["conduccion", "regate", "1x1", "uno contra uno", "desborde"],
  ["centro", "centros", "banda", "amplitud", "carril"],
  ["corner", "corners", "falta", "balon parado", "abp", "saque"],
  ["coordinacion", "motor", "agilidad", "velocidad"],
  ["desmarque", "apoyo", "movilidad", "espacio", "profundidad"],
  ["pierna", "izquierda", "derecha", "golpeo", "tecnica"]
];

export const normalizar = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
const raiz = (p: string) => (p.length > 5 ? p.replace(/(es|s)$/, "") : p);

/** Palabras que se buscan para un objetivo (con sus parecidas). */
export function palabrasDe(objetivo: string): string[] {
  const t = normalizar(objetivo);
  const base = t.split(" ").filter((p) => p.length > 2 && !VACIAS.has(p)).map(raiz);
  const extra = PARECIDAS.filter((g) => g.some((x) => (x.includes(" ") ? t.includes(x) : base.includes(raiz(x))))).flat().map(raiz);
  return [...new Set([...base, ...extra])];
}

function puntos(campos: [string, number][], palabras: string[]) {
  let total = 0;
  for (const [texto, peso] of campos) {
    const t = normalizar(texto);
    for (const p of palabras) if (p && t.includes(p)) total += peso;
  }
  return total;
}

export interface Candidato {
  clave: string;
  nombre: string;
  objetivo: string;
  duracion: number | null;
  origen: "mio" | "biblioteca";
  /** "inicial" (calentamiento), "principal" o "final". */
  momento: "inicial" | "principal" | "final";
  puntos: number;
  mio?: Ejercicio;
  catalogo?: EjercicioCatalogo;
}

const momentoDe = (tipo: string, nombre: string, objetivo: string): Candidato["momento"] =>
  /calentamiento|activaci/i.test(tipo + " " + nombre) ? "inicial"
    : /vuelta a la calma|recuperaci[oó]n activa|partido condicionado|partido final|partidillo/i.test(nombre + " " + objetivo + " " + tipo) ? "final" : "principal";

export function candidatos(objetivo: string, mios: Ejercicio[], catalogo: EjercicioCatalogo[]): Candidato[] {
  const palabras = palabrasDe(objetivo);
  const copiados = new Set(mios.map((e) => e.origen).filter(Boolean));
  const r: Candidato[] = [];
  for (const e of mios) {
    const p = puntos([[e.nombre, 4], [e.objetivo, 4], [e.tipo, 2], [e.explicacion, 1], [e.notas, 1]], palabras);
    r.push({ clave: "m:" + e.id, nombre: e.nombre, objetivo: e.objetivo, duracion: e.duracion, origen: "mio", momento: momentoDe(e.tipo, e.nombre, e.objetivo), puntos: p + (p ? 1 : 0), mio: e });
  }
  for (const c of catalogo) {
    if (copiados.has(c.id)) continue; // ya lo tiene copiado en sus ejercicios
    const p = puntos([[c.nombre, 4], [c.objetivo, 4], [c.tipo, 3], [c.puntosClave.join(" "), 2], [c.descripcion, 1]], palabras);
    r.push({ clave: "c:" + c.id, nombre: c.nombre, objetivo: c.objetivo, duracion: c.duracion, origen: "biblioteca", momento: momentoDe(c.tipo, c.nombre, c.objetivo), puntos: p, catalogo: c });
  }
  return r.sort((a, b) => b.puntos - a.puntos || (a.origen === "mio" ? -1 : 1) - (b.origen === "mio" ? -1 : 1) || a.nombre.localeCompare(b.nombre, "es"));
}

/** Selección inicial: 1 calentamiento, 3 de la parte principal y 1 para acabar (los que más encajan). */
export function seleccionInicial(lista: Candidato[]): Set<string> {
  const de = (m: Candidato["momento"], n: number) => lista.filter((c) => c.momento === m && (c.puntos > 0 || m !== "principal")).slice(0, n).map((c) => c.clave);
  return new Set([...de("inicial", 1), ...de("principal", 3), ...de("final", 1)]);
}
