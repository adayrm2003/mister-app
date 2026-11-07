// Datos del día a día del equipo: ajustes, jugadores, partidos y alineaciones.
// Todo tiene valores por defecto: nada es obligatorio configurarlo para empezar.

/* ---------------- Ajustes ---------------- */
export type Modalidad = "F7" | "F8" | "F11";
export type Duracion = "2x45" | "2x40" | "2x30" | "2x25" | "otra";
export type ModoDorsales = "fijos" | "partido";

/** Posición en el campo en %: x de izquierda a derecha, y de la portería rival (0) a la propia (100). */
export interface Punto { x: number; y: number }

export interface Sistema { id: string; nombre: string; jugadores: number; posiciones: Punto[] }
export interface Elemento { id: string; nombre: string; color?: string; fijo?: boolean }

/** Ajustes de cada equipo (los comparten todos sus entrenadores). */
export interface AjustesEquipo {
  modalidad: Modalidad;
  duracion: Duracion;
  partesOtra: number;
  minutosParteOtra: number;
  dorsales: ModoDorsales;
  colorEquipo: string;
  colorRival: string;
}

/** Preferencias de cada entrenador (valen para todos sus equipos). */
export interface AjustesUsuario {
  tiposEjercicio: Elemento[];
  fases: Elemento[];
  sistemas: Sistema[];
  tiposEvento: Elemento[];
  /** true cuando ya se pusieron los ejercicios de ejemplo en su biblioteca. */
  ejemplosCargados: boolean;
  /** Modalidades que entrena: solo se ven sus sistemas de juego. */
  modalidades: Modalidad[];
}

export type Ajustes = AjustesEquipo & AjustesUsuario;

export const MODALIDADES: { valor: Modalidad; texto: string; jugadores: number }[] = [
  { valor: "F7", texto: "Fútbol 7", jugadores: 7 },
  { valor: "F8", texto: "Fútbol 8", jugadores: 8 },
  { valor: "F11", texto: "Fútbol 11", jugadores: 11 }
];
export const esModalidad = (v: unknown): v is Modalidad => MODALIDADES.some((m) => m.valor === v);
export const DURACIONES: { valor: Duracion; partes: number; minutos: number }[] = [
  { valor: "2x45", partes: 2, minutos: 45 },
  { valor: "2x40", partes: 2, minutos: 40 },
  { valor: "2x30", partes: 2, minutos: 30 },
  { valor: "2x25", partes: 2, minutos: 25 }
];

export const jugadoresEnCampo = (a: AjustesEquipo) => (MODALIDADES.find((m) => m.valor === a.modalidad) ?? MODALIDADES[2]).jugadores;

export const tiempoDePartido = (a: AjustesEquipo) => {
  const d = DURACIONES.find((x) => x.valor === a.duracion);
  return d ? { partes: d.partes, minutos: d.minutos } : { partes: a.partesOtra, minutos: a.minutosParteOtra };
};

export const nombreModalidad = (m: Modalidad) => (MODALIDADES.find((x) => x.valor === m) ?? MODALIDADES[2]).texto;

/** Coloca a los jugadores por líneas: [4,4,2] = 4 defensas, 4 medios, 2 delanteros (+ portero). */
export function porLineas(lineas: number[]): Punto[] {
  const puntos: Punto[] = [{ x: 50, y: 92 }];
  const k = lineas.length;
  lineas.forEach((n, j) => {
    const y = k === 1 ? 60 : 76 - (j * 42) / (k - 1);
    const sep = n <= 1 ? 0 : Math.min(26, 76 / (n - 1));
    for (let i = 0; i < n; i++) puntos.push({ x: Math.round(50 + (i - (n - 1) / 2) * sep), y: Math.round(y) });
  });
  return puntos;
}
const sis = (id: string, lineas: number[]): Sistema => ({ id, nombre: lineas.join("-"), jugadores: lineas.reduce((a, b) => a + b, 1), posiciones: porLineas(lineas) });

export const SISTEMAS_BASE: Sistema[] = [
  sis("f11-442", [4, 4, 2]), sis("f11-433", [4, 3, 3]), sis("f11-352", [3, 5, 2]),
  sis("f8-331", [3, 3, 1]), sis("f8-232", [2, 3, 2]), sis("f8-322", [3, 2, 2]),
  sis("f7-231", [2, 3, 1]), sis("f7-321", [3, 2, 1]), sis("f7-312", [3, 1, 2])
];

export const COLORES = ["#FF6B1A", "#0F6B45", "#1F3F8F", "#D7263D", "#F5C518", "#111111", "#FFFFFF", "#6C2BD9", "#0EA5E9", "#8B4513"];

export const AJUSTES_EQUIPO_BASE: AjustesEquipo = {
  modalidad: "F11", duracion: "2x45", partesOtra: 2, minutosParteOtra: 35,
  dorsales: "fijos", colorEquipo: "#FF6B1A", colorRival: "#1F3F8F"
};

export const AJUSTES_USUARIO_BASE: AjustesUsuario = {
  tiposEjercicio: [
    { id: "calentamiento", nombre: "Calentamiento" }, { id: "tecnica", nombre: "Técnica" }, { id: "tactica", nombre: "Táctica" },
    { id: "fisico", nombre: "Físico" }, { id: "partido", nombre: "Partido" }
  ],
  fases: [{ id: "inicial", nombre: "Calentamiento" }, { id: "principal", nombre: "Parte principal" }, { id: "final", nombre: "Vuelta a la calma" }],
  sistemas: SISTEMAS_BASE,
  tiposEvento: [
    { id: "entrenamiento", nombre: "Entrenamiento", color: "#0F6B45", fijo: true },
    { id: "partido", nombre: "Partido", color: "#FF6B1A", fijo: true },
    { id: "torneo", nombre: "Torneo", color: "#8E5BD6", fijo: true }
  ],
  ejemplosCargados: false,
  modalidades: ["F7", "F8", "F11"]
};

/* ---------------- Jugadores ---------------- */
export type Pierna = "derecha" | "izquierda" | "ambas";
export type Puesto = "portero" | "defensa" | "medio" | "delantero";
export const PIERNAS: { valor: Pierna; texto: string }[] = [{ valor: "derecha", texto: "Derecha" }, { valor: "izquierda", texto: "Izquierda" }, { valor: "ambas", texto: "Ambas" }];
export const PUESTOS: { valor: Puesto; texto: string; plural: string; corto: string }[] = [
  { valor: "portero", texto: "Portero", plural: "Porteros", corto: "POR" },
  { valor: "defensa", texto: "Defensa", plural: "Defensas", corto: "DEF" },
  { valor: "medio", texto: "Mediocampista", plural: "Mediocampistas", corto: "MED" },
  { valor: "delantero", texto: "Delantero", plural: "Delanteros", corto: "DEL" }
];

export interface Jugador {
  id: string;
  equipoId: string;
  nombre: string;
  pierna: Pierna;
  posicion: Puesto;
  dorsal: number | null;
  notas: string;
}

/* ---------------- Partidos y alineaciones ---------------- */
export const MAX_SUPLENTES = 8;
export const COMPETICIONES = ["Liga", "Copa", "Amistoso", "Torneo"];

export interface Alineacion {
  sistemaId: string;
  sistemaNombre: string;
  posiciones: Punto[];
  /** Un hueco por posición: id del jugador o null si está vacío. */
  titulares: (string | null)[];
  suplentes: string[];
  /** Dorsal de cada jugador solo para este partido (si no está, se usa el fijo). */
  dorsales: Record<string, number | null>;
  /** Línea opcional para la hoja del vestuario (hora de llegada, equipación...). */
  notasHoja?: string;
}

export interface Partido {
  id: string;
  equipoId: string;
  rival: string;
  fecha: string; // AAAA-MM-DD
  hora: string; // HH:MM
  campo: string;
  casa: boolean;
  competicion: string;
  notas: string;
  alineacion: Alineacion | null;
  /** Goles, cambios y tarjetas (fase 8). */
  acciones?: import("./partido").Accion[];
  /** Minutos corregidos a mano por el entrenador, por jugador. */
  minutosManuales?: Record<string, number>;
  reloj?: import("./partido").Reloj;
  /** Notas del entrenador durante el partido. */
  anotaciones?: import("./partido").Anotacion[];
}

export interface PlantillaAlineacion {
  id: string;
  equipoId: string;
  nombre: string;
  alineacion: Alineacion;
}

/** Dorsal que lleva un jugador en un partido. */
export function dorsalEnPartido(j: Jugador, al: Alineacion | null, modo: ModoDorsales): number | null {
  if (al && j.id in al.dorsales) return al.dorsales[j.id];
  return modo === "fijos" ? j.dorsal : null;
}

/** "7 - Dani" (o solo "Dani" si no tiene dorsal). Se usará en cambios, tarjetas y goles. */
export const etiquetaJugador = (j: Jugador, dorsal: number | null) => (dorsal != null ? `${dorsal} - ${j.nombre}` : j.nombre);

export function alineacionVacia(s: Sistema): Alineacion {
  return { sistemaId: s.id, sistemaNombre: s.nombre, posiciones: s.posiciones.map((p) => ({ ...p })), titulares: s.posiciones.map(() => null), suplentes: [], dorsales: {} };
}

/** Cambia el sistema manteniendo a los jugadores en el mismo orden de huecos. */
export function cambiarSistema(al: Alineacion, s: Sistema): Alineacion {
  const titulares = s.posiciones.map((_, i) => al.titulares[i] ?? null);
  const sobran = al.titulares.slice(s.posiciones.length).filter((x): x is string => !!x);
  const suplentes = [...al.suplentes, ...sobran].slice(0, MAX_SUPLENTES);
  return { ...al, sistemaId: s.id, sistemaNombre: s.nombre, posiciones: s.posiciones.map((p) => ({ ...p })), titulares, suplentes };
}

export type Destino = { tipo: "hueco"; indice: number } | { tipo: "suplentes" } | { tipo: "fuera" };

/** Mueve a un jugador a un hueco, al banquillo o fuera de la convocatoria. Devuelve null si no se puede. */
export function moverJugador(al: Alineacion, jugadorId: string, destino: Destino): { al: Alineacion; error?: string } {
  const titulares = [...al.titulares];
  let suplentes = [...al.suplentes];
  const huecoOrigen = titulares.indexOf(jugadorId);
  const enBanquillo = suplentes.indexOf(jugadorId);
  if (huecoOrigen >= 0) titulares[huecoOrigen] = null;
  if (enBanquillo >= 0) suplentes.splice(enBanquillo, 1);

  if (destino.tipo === "hueco") {
    const ocupante = titulares[destino.indice];
    titulares[destino.indice] = jugadorId;
    if (ocupante && ocupante !== jugadorId) {
      if (huecoOrigen >= 0) titulares[huecoOrigen] = ocupante;
      else if (enBanquillo >= 0) suplentes.splice(enBanquillo, 0, ocupante);
      else if (suplentes.length < MAX_SUPLENTES) suplentes.push(ocupante);
    }
  } else if (destino.tipo === "suplentes") {
    if (suplentes.length >= MAX_SUPLENTES) return { al, error: `Solo puede haber ${MAX_SUPLENTES} suplentes.` };
    suplentes = [...suplentes, jugadorId];
  }
  const dorsales = { ...al.dorsales };
  if (destino.tipo === "fuera") delete dorsales[jugadorId];
  return { al: { ...al, titulares, suplentes, dorsales } };
}

/** Dorsales que se repiten entre los convocados de un partido. */
export function dorsalesRepetidos(al: Alineacion, jugadores: Jugador[], modo: ModoDorsales): { dorsal: number; nombres: string[] }[] {
  const convocados = [...al.titulares.filter((x): x is string => !!x), ...al.suplentes];
  const mapa = new Map<number, string[]>();
  convocados.forEach((id) => {
    const j = jugadores.find((x) => x.id === id);
    if (!j) return;
    const d = dorsalEnPartido(j, al, modo);
    if (d == null) return;
    mapa.set(d, [...(mapa.get(d) ?? []), j.nombre]);
  });
  return [...mapa.entries()].filter(([, n]) => n.length > 1).map(([dorsal, nombres]) => ({ dorsal, nombres }));
}

export const nuevoId = () => crypto.randomUUID();
