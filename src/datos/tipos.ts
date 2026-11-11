export type Rol = "directiva" | "entrenador";

export interface Perfil {
  id: string;
  email: string;
  rol: Rol;
}

export interface Club {
  id: string;
  nombre: string;
  /** Imagen del escudo (data URL, ya reducida). */
  escudo?: string | null;
}

export interface Equipo {
  id: string;
  clubId: string;
  nombre: string;
  /** Nombre del club (solo se rellena al leer los equipos de un entrenador). */
  club?: string;
  /** Escudo del club (solo se rellena al leer los equipos de un entrenador). */
  escudo?: string | null;
}

/** Un entrenador que la directiva ha añadido a su club, identificado por su correo. */
export interface EntrenadorClub {
  id: string;
  email: string;
  /** true si ese correo ya tiene cuenta creada en la app. */
  registrado: boolean;
}

/** Lo que la directiva ve de cada equipo de su club (nada de lo de dentro). */
export interface EquipoClub {
  id: string;
  nombre: string;
  /** "F7", "F8" o "F11" (la elige el entrenador). */
  modalidad: string | null;
  /** Correo del entrenador, o null si el equipo se ha quedado sin entrenador. */
  entrenador: string | null;
}

export interface DatosRegistro {
  email: string;
  contrasena: string;
  rol: Rol;
  nombreClub?: string;
  /** Fecha de la versión de los textos legales que aceptó al registrarse. */
  aceptaLegal?: string;
}

export type EventoSesion = "entrada" | "salida" | "recuperacion";

export interface Api {
  /** "local" = modo prueba (datos solo en este dispositivo); "nube" = Supabase. */
  modo: "local" | "nube";
  perfilActual(): Promise<Perfil | null>;
  alCambiarSesion(cb: (evento: EventoSesion) => void): () => void;
  entrar(email: string, contrasena: string): Promise<void>;
  registrar(datos: DatosRegistro): Promise<{ hayQueConfirmarCorreo: boolean }>;
  recuperarContrasena(email: string): Promise<void>;
  cambiarContrasena(nueva: string): Promise<void>;
  salir(): Promise<void>;

  // Directiva
  miClub(): Promise<Club | null>;
  /** Cambia el nombre y el escudo del club de la directiva. */
  guardarClub(datos: { nombre: string; escudo: string | null }): Promise<void>;
  entrenadoresDelClub(): Promise<EntrenadorClub[]>;
  anadirEntrenador(email: string): Promise<void>;
  /** Quita al entrenador del club; sus equipos se quedan en el club sin entrenador. */
  quitarEntrenador(email: string): Promise<void>;
  equiposDelClub(): Promise<EquipoClub[]>;
  /** Pasa un equipo del club a otro entrenador del club. */
  pasarEquipo(equipoId: string, email: string): Promise<void>;

  // Entrenador
  /** Clubes que han añadido a este entrenador. */
  misClubes(): Promise<Club[]>;
  misEquipos(): Promise<Equipo[]>;
  crearMiEquipo(clubId: string, nombre: string): Promise<Equipo>;
  renombrarEquipo(id: string, nombre: string): Promise<void>;

  // Entrenador de ese equipo o directiva de su club
  borrarEquipo(id: string): Promise<void>;

  // Datos de un equipo (solo si puedes ver ese equipo)
  listar<T extends Fila>(tabla: Tabla, equipoId: string): Promise<T[]>;
  guardar<T extends Fila>(tabla: Tabla, fila: T): Promise<T>;
  borrar(tabla: Tabla, id: string): Promise<void>;
  leerAjustesEquipo(equipoId: string): Promise<Record<string, unknown> | null>;
  guardarAjustesEquipo(equipoId: string, datos: Record<string, unknown>): Promise<void>;
  leerAjustesUsuario(): Promise<Record<string, unknown> | null>;
  guardarAjustesUsuario(datos: Record<string, unknown>): Promise<void>;

  // Datos propios de cada entrenador (su biblioteca de ejercicios y sesiones)
  listarMios<T extends { id: string }>(tabla: TablaUsuario): Promise<T[]>;
  guardarMio<T extends { id: string }>(tabla: TablaUsuario, fila: T): Promise<T>;
  borrarMio(tabla: TablaUsuario, id: string): Promise<void>;
}

export type TablaUsuario = "ejercicios" | "sesiones";

/** Tablas con datos de un equipo. */
export type Tabla = "jugadores" | "partidos" | "plantillas_alineacion" | "eventos";
export interface Fila { id: string; equipoId: string }

/** Error con un mensaje ya preparado para enseñarlo al usuario. */
export class ErrorApp extends Error {}

export const normalizarCorreo = (e: string) => e.trim().toLowerCase();
export const correoValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
