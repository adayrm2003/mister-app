// MODO PRUEBA: imita las cuentas y la base de datos guardándolo todo en este navegador.
// Sirve para probar la app sin Supabase. Las mismas reglas de acceso que en la nube:
// la directiva solo ve su club y el entrenador solo los equipos asignados a su correo.
import { type Api, type Asignacion, type Club, type DatosRegistro, type Equipo, type EventoSesion, type Fila, type Perfil, type Tabla, type TablaUsuario, ErrorApp, normalizarCorreo } from "./tipos";

interface Usuario extends Perfil { hash: string }
interface ClubGuardado extends Club { duenoId: string }
interface Bd {
  usuarios: Usuario[];
  clubes: ClubGuardado[];
  equipos: Equipo[];
  asignaciones: Omit<Asignacion, "registrado">[];
  sesion: string | null;
  filas: Partial<Record<Tabla, Fila[]>>;
  ajustesEquipo: Record<string, Record<string, unknown>>;
  ajustesUsuario: Record<string, Record<string, unknown>>;
  /** Por usuario y tabla: su biblioteca. */
  mios: Record<string, Partial<Record<TablaUsuario, { id: string }[]>>>;
}

const CLAVE = "mister-modo-prueba";
const vacia = (): Bd => ({ usuarios: [], clubes: [], equipos: [], asignaciones: [], sesion: null, filas: {}, ajustesEquipo: {}, ajustesUsuario: {}, mios: {} });

function leer(): Bd {
  try {
    const t = localStorage.getItem(CLAVE);
    return t ? { ...vacia(), ...JSON.parse(t) } : vacia();
  } catch { return vacia(); }
}
function guardar(bd: Bd) {
  try { localStorage.setItem(CLAVE, JSON.stringify(bd)); } catch { /* sin almacenamiento */ }
}
const id = () => crypto.randomUUID();
const espera = () => new Promise((r) => setTimeout(r, 150));

async function resumen(texto: string) {
  const datos = new TextEncoder().encode("mister:" + texto);
  const h = await crypto.subtle.digest("SHA-256", datos);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const oyentes = new Set<(e: EventoSesion) => void>();
const avisar = (e: EventoSesion) => oyentes.forEach((cb) => cb(e));

function usuarioActual(bd: Bd): Usuario {
  const u = bd.usuarios.find((x) => x.id === bd.sesion);
  if (!u) throw new ErrorApp("Tu sesión ha caducado. Vuelve a entrar.");
  return u;
}
function clubDe(bd: Bd, u: Usuario): ClubGuardado {
  const c = bd.clubes.find((x) => x.duenoId === u.id);
  if (u.rol !== "directiva" || !c) throw new ErrorApp("Solo la cuenta de la directiva puede hacer esto.");
  return c;
}
function equipoDelClub(bd: Bd, c: Club, equipoId: string) {
  const e = bd.equipos.find((x) => x.id === equipoId && x.clubId === c.id);
  if (!e) throw new ErrorApp("Ese equipo no existe o no es de tu club.");
  return e;
}

/** Misma regla que en la nube: directiva del club o entrenador asignado. */
function comprobarEquipo(bd: Bd, equipoId: string) {
  const u = usuarioActual(bd);
  const e = bd.equipos.find((x) => x.id === equipoId);
  const dueno = e && bd.clubes.some((c) => c.id === e.clubId && c.duenoId === u.id);
  const asignado = e && bd.asignaciones.some((a) => a.equipoId === e.id && a.email === u.email);
  if (!dueno && !asignado) throw new ErrorApp("No tienes acceso a ese equipo.");
}

export const apiLocal: Api = {
  modo: "local",

  async perfilActual() {
    const bd = leer();
    const u = bd.usuarios.find((x) => x.id === bd.sesion);
    return u ? { id: u.id, email: u.email, rol: u.rol } : null;
  },

  alCambiarSesion(cb) {
    oyentes.add(cb);
    return () => { oyentes.delete(cb); };
  },

  async entrar(email, contrasena) {
    await espera();
    const bd = leer();
    const u = bd.usuarios.find((x) => x.email === normalizarCorreo(email));
    if (!u || u.hash !== (await resumen(contrasena))) throw new ErrorApp("El correo o la contraseña no son correctos.");
    bd.sesion = u.id;
    guardar(bd);
    avisar("entrada");
  },

  async registrar(d: DatosRegistro) {
    await espera();
    const bd = leer();
    const email = normalizarCorreo(d.email);
    if (bd.usuarios.some((x) => x.email === email)) throw new ErrorApp("Ya hay una cuenta con ese correo. Prueba a entrar.");
    const u: Usuario = { id: id(), email, rol: d.rol, hash: await resumen(d.contrasena) };
    bd.usuarios.push(u);
    if (d.rol === "directiva") bd.clubes.push({ id: id(), nombre: (d.nombreClub || "Mi club").trim(), duenoId: u.id });
    bd.sesion = u.id;
    guardar(bd);
    avisar("entrada");
    return { hayQueConfirmarCorreo: false };
  },

  async recuperarContrasena() {
    await espera();
    throw new ErrorApp("En modo prueba no se envían correos. Cuando la app esté conectada a Supabase, aquí te llegará un enlace para crear una contraseña nueva.");
  },

  async cambiarContrasena(nueva) {
    const bd = leer();
    const u = usuarioActual(bd);
    u.hash = await resumen(nueva);
    guardar(bd);
  },

  async salir() {
    const bd = leer();
    bd.sesion = null;
    guardar(bd);
    avisar("salida");
  },

  async miClub() {
    const bd = leer();
    const u = usuarioActual(bd);
    const c = bd.clubes.find((x) => x.duenoId === u.id);
    return c ? { id: c.id, nombre: c.nombre, escudo: c.escudo ?? null } : null;
  },

  async guardarClub({ nombre, escudo }) {
    await espera();
    const bd = leer();
    const c = clubDe(bd, usuarioActual(bd));
    c.nombre = nombre.trim();
    c.escudo = escudo;
    guardar(bd);
  },

  async equiposDelClub() {
    const bd = leer();
    const c = clubDe(bd, usuarioActual(bd));
    return bd.equipos.filter((e) => e.clubId === c.id).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  },

  async crearEquipo(nombre) {
    await espera();
    const bd = leer();
    const c = clubDe(bd, usuarioActual(bd));
    const e: Equipo = { id: id(), clubId: c.id, nombre: nombre.trim() };
    bd.equipos.push(e);
    guardar(bd);
    return e;
  },

  async renombrarEquipo(equipoId, nombre) {
    const bd = leer();
    const c = clubDe(bd, usuarioActual(bd));
    equipoDelClub(bd, c, equipoId).nombre = nombre.trim();
    guardar(bd);
  },

  async borrarEquipo(equipoId) {
    const bd = leer();
    const c = clubDe(bd, usuarioActual(bd));
    equipoDelClub(bd, c, equipoId);
    bd.equipos = bd.equipos.filter((e) => e.id !== equipoId);
    bd.asignaciones = bd.asignaciones.filter((a) => a.equipoId !== equipoId);
    for (const t of Object.keys(bd.filas) as Tabla[]) bd.filas[t] = bd.filas[t]!.filter((f) => f.equipoId !== equipoId);
    delete bd.ajustesEquipo[equipoId];
    guardar(bd);
  },

  async asignacionesDelClub() {
    const bd = leer();
    const c = clubDe(bd, usuarioActual(bd));
    const misEquipos = new Set(bd.equipos.filter((e) => e.clubId === c.id).map((e) => e.id));
    return bd.asignaciones
      .filter((a) => misEquipos.has(a.equipoId))
      .map((a) => ({ ...a, registrado: bd.usuarios.some((u) => u.email === a.email) }));
  },

  async asignarEntrenador(equipoId, email) {
    await espera();
    const bd = leer();
    const c = clubDe(bd, usuarioActual(bd));
    equipoDelClub(bd, c, equipoId);
    const correo = normalizarCorreo(email);
    if (bd.asignaciones.some((a) => a.equipoId === equipoId && a.email === correo)) throw new ErrorApp("Ese entrenador ya está en este equipo.");
    bd.asignaciones.push({ id: id(), equipoId, email: correo });
    guardar(bd);
  },

  async moverAsignacion(asigId, equipoId) {
    const bd = leer();
    const c = clubDe(bd, usuarioActual(bd));
    equipoDelClub(bd, c, equipoId);
    const a = bd.asignaciones.find((x) => x.id === asigId);
    if (!a) throw new ErrorApp("No se ha encontrado esa asignación.");
    equipoDelClub(bd, c, a.equipoId);
    if (bd.asignaciones.some((x) => x.equipoId === equipoId && x.email === a.email)) throw new ErrorApp("Ese entrenador ya está en el otro equipo.");
    a.equipoId = equipoId;
    guardar(bd);
  },

  async quitarAsignacion(asigId) {
    const bd = leer();
    const c = clubDe(bd, usuarioActual(bd));
    const a = bd.asignaciones.find((x) => x.id === asigId);
    if (a) equipoDelClub(bd, c, a.equipoId);
    bd.asignaciones = bd.asignaciones.filter((x) => x.id !== asigId);
    guardar(bd);
  },

  async misEquipos() {
    const bd = leer();
    const u = usuarioActual(bd);
    const ids = new Set(bd.asignaciones.filter((a) => a.email === u.email).map((a) => a.equipoId));
    return bd.equipos
      .filter((e) => ids.has(e.id))
      .map((e) => { const c = bd.clubes.find((x) => x.id === e.clubId); return { ...e, club: c?.nombre, escudo: c?.escudo ?? null }; })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  },

  async listar<T extends Fila>(tabla: Tabla, equipoId: string) {
    const bd = leer();
    comprobarEquipo(bd, equipoId);
    return (bd.filas[tabla] ?? []).filter((f) => f.equipoId === equipoId) as T[];
  },

  async guardar<T extends Fila>(tabla: Tabla, fila: T) {
    const bd = leer();
    comprobarEquipo(bd, fila.equipoId);
    const lista = bd.filas[tabla] ?? [];
    const i = lista.findIndex((f) => f.id === fila.id);
    if (i >= 0) {
      if (lista[i].equipoId !== fila.equipoId) throw new ErrorApp("No se puede mover a otro equipo.");
      lista[i] = fila;
    } else lista.push(fila);
    bd.filas[tabla] = lista;
    guardar(bd);
    return fila;
  },

  async borrar(tabla, filaId) {
    const bd = leer();
    const lista = bd.filas[tabla] ?? [];
    const f = lista.find((x) => x.id === filaId);
    if (!f) return;
    comprobarEquipo(bd, f.equipoId);
    bd.filas[tabla] = lista.filter((x) => x.id !== filaId);
    guardar(bd);
  },

  async leerAjustesEquipo(equipoId) {
    const bd = leer();
    comprobarEquipo(bd, equipoId);
    return bd.ajustesEquipo[equipoId] ?? null;
  },

  async guardarAjustesEquipo(equipoId, datos) {
    const bd = leer();
    comprobarEquipo(bd, equipoId);
    bd.ajustesEquipo[equipoId] = datos;
    guardar(bd);
  },

  async leerAjustesUsuario() {
    const bd = leer();
    return bd.ajustesUsuario[usuarioActual(bd).id] ?? null;
  },

  async guardarAjustesUsuario(datos) {
    const bd = leer();
    bd.ajustesUsuario[usuarioActual(bd).id] = datos;
    guardar(bd);
  },

  async listarMios<T extends { id: string }>(tabla: TablaUsuario) {
    const bd = leer();
    return ((bd.mios[usuarioActual(bd).id] ?? {})[tabla] ?? []) as T[];
  },

  async guardarMio<T extends { id: string }>(tabla: TablaUsuario, fila: T) {
    const bd = leer();
    const uid = usuarioActual(bd).id;
    const mias = (bd.mios[uid] ??= {});
    const lista = (mias[tabla] ??= []);
    const i = lista.findIndex((f) => f.id === fila.id);
    if (i >= 0) lista[i] = fila; else lista.push(fila);
    guardar(bd);
    return fila;
  },

  async borrarMio(tabla, id) {
    const bd = leer();
    const mias = bd.mios[usuarioActual(bd).id];
    if (mias?.[tabla]) mias[tabla] = mias[tabla]!.filter((f) => f.id !== id);
    guardar(bd);
  }
};
