// MODO PRUEBA: imita las cuentas y la base de datos guardándolo todo en este navegador.
// Sirve para probar la app sin Supabase. Las mismas reglas de acceso que en la nube:
// la directiva solo ve su club y el entrenador solo los equipos asignados a su correo.
import { type Api, type Asignacion, type Club, type DatosRegistro, type Equipo, type EventoSesion, type Perfil, ErrorApp, normalizarCorreo } from "./tipos";

interface Usuario extends Perfil { hash: string }
interface ClubGuardado extends Club { duenoId: string }
interface Bd {
  usuarios: Usuario[];
  clubes: ClubGuardado[];
  equipos: Equipo[];
  asignaciones: Omit<Asignacion, "registrado">[];
  sesion: string | null;
}

const CLAVE = "mister-modo-prueba";
const vacia = (): Bd => ({ usuarios: [], clubes: [], equipos: [], asignaciones: [], sesion: null });

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
    return c ? { id: c.id, nombre: c.nombre } : null;
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
      .map((e) => ({ ...e, club: bd.clubes.find((c) => c.id === e.clubId)?.nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }
};
