export type Rol = "directiva" | "entrenador";

export interface Perfil {
  id: string;
  email: string;
  rol: Rol;
}

export interface Club {
  id: string;
  nombre: string;
}

export interface Equipo {
  id: string;
  clubId: string;
  nombre: string;
  /** Nombre del club (solo se rellena al leer los equipos de un entrenador). */
  club?: string;
}

/** Un entrenador asignado a un equipo, identificado por su correo. */
export interface Asignacion {
  id: string;
  equipoId: string;
  email: string;
  /** true si ese correo ya tiene cuenta creada en la app. */
  registrado: boolean;
}

export interface DatosRegistro {
  email: string;
  contrasena: string;
  rol: Rol;
  nombreClub?: string;
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
  equiposDelClub(): Promise<Equipo[]>;
  crearEquipo(nombre: string): Promise<Equipo>;
  renombrarEquipo(id: string, nombre: string): Promise<void>;
  borrarEquipo(id: string): Promise<void>;
  asignacionesDelClub(): Promise<Asignacion[]>;
  asignarEntrenador(equipoId: string, email: string): Promise<void>;
  moverAsignacion(id: string, equipoId: string): Promise<void>;
  quitarAsignacion(id: string): Promise<void>;

  // Entrenador
  misEquipos(): Promise<Equipo[]>;

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
export type Tabla = "jugadores" | "partidos" | "plantillas_alineacion";
export interface Fila { id: string; equipoId: string }

/** Error con un mensaje ya preparado para enseñarlo al usuario. */
export class ErrorApp extends Error {}

export const normalizarCorreo = (e: string) => e.trim().toLowerCase();
export const correoValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
