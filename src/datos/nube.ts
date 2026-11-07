// MODO NUBE: cuentas y datos en Supabase. La seguridad por filas (supabase/esquema.sql)
// garantiza en el servidor que cada usuario solo ve lo que le toca.
import { createClient, type AuthError, type PostgrestError } from "@supabase/supabase-js";
import { type Api, type Asignacion, type Equipo, type EventoSesion, type Fila, type Rol, ErrorApp, normalizarCorreo } from "./tipos";

// Solo se convierten los nombres de primer nivel (equipoId <-> equipo_id); lo de dentro (jsonb) se guarda tal cual.
const aSnake = (o: object) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase()), v]));
const aCamel = <T,>(o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== "creado" && k !== "actualizado").map(([k, v]) => [k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()), v])) as T;

export function crearApiNube(url: string, clave: string): Api {
  const sb = createClient(url, clave, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

  function traducir(e: AuthError | PostgrestError | null): never | void {
    if (!e) return;
    const m = (e.message || "").toLowerCase();
    if (m.includes("invalid login")) throw new ErrorApp("El correo o la contraseña no son correctos.");
    if (m.includes("already registered") || m.includes("already been registered")) throw new ErrorApp("Ya hay una cuenta con ese correo. Prueba a entrar.");
    if (m.includes("email not confirmed")) throw new ErrorApp("Aún no has confirmado tu correo. Abre el enlace que te enviamos al registrarte.");
    if (m.includes("password should be")) throw new ErrorApp("La contraseña tiene que tener al menos 8 caracteres.");
    if (m.includes("rate limit") || m.includes("security purposes")) throw new ErrorApp("Demasiados intentos seguidos. Espera un minuto y vuelve a probar.");
    if (m.includes("duplicate key")) throw new ErrorApp("Eso ya existe.");
    if (m.includes("failed to fetch") || m.includes("network")) throw new ErrorApp("No hay conexión con el servidor. Revisa tu internet.");
    throw new ErrorApp("Algo ha fallado: " + e.message);
  }

  async function usuario() {
    const { data } = await sb.auth.getUser();
    if (!data.user) throw new ErrorApp("Tu sesión ha caducado. Vuelve a entrar.");
    return data.user;
  }
  async function clubId() {
    const u = await usuario();
    const { data, error } = await sb.from("clubes").select("id").eq("dueno_id", u.id).maybeSingle();
    traducir(error);
    if (!data) throw new ErrorApp("Solo la cuenta de la directiva puede hacer esto.");
    return data.id as string;
  }
  const aEquipo = (f: { id: string; club_id: string; nombre: string; clubes?: { nombre: string } | null }): Equipo =>
    ({ id: f.id, clubId: f.club_id, nombre: f.nombre, club: f.clubes?.nombre });

  return {
    modo: "nube",

    async perfilActual() {
      const { data: s } = await sb.auth.getSession();
      if (!s.session) return null;
      const { data, error } = await sb.from("perfiles").select("id,email,rol").eq("id", s.session.user.id).maybeSingle();
      if (error || !data) return null;
      return { id: data.id, email: data.email, rol: data.rol as Rol };
    },

    alCambiarSesion(cb) {
      const { data } = sb.auth.onAuthStateChange((evento) => {
        const mapa: Record<string, EventoSesion | undefined> = { SIGNED_IN: "entrada", SIGNED_OUT: "salida", PASSWORD_RECOVERY: "recuperacion" };
        const e = mapa[evento];
        if (e) setTimeout(() => cb(e), 0);
      });
      return () => data.subscription.unsubscribe();
    },

    async entrar(email, contrasena) {
      const { error } = await sb.auth.signInWithPassword({ email: normalizarCorreo(email), password: contrasena });
      traducir(error);
    },

    async registrar(d) {
      const { data, error } = await sb.auth.signUp({
        email: normalizarCorreo(d.email),
        password: d.contrasena,
        options: { data: { rol: d.rol, nombre_club: d.nombreClub?.trim() || null }, emailRedirectTo: location.origin }
      });
      traducir(error);
      return { hayQueConfirmarCorreo: !data.session };
    },

    async recuperarContrasena(email) {
      const { error } = await sb.auth.resetPasswordForEmail(normalizarCorreo(email), { redirectTo: location.origin + "/nueva-contrasena" });
      traducir(error);
    },

    async cambiarContrasena(nueva) {
      const { error } = await sb.auth.updateUser({ password: nueva });
      traducir(error);
    },

    async salir() {
      await sb.auth.signOut();
    },

    async miClub() {
      const u = await usuario();
      const { data, error } = await sb.from("clubes").select("id,nombre").eq("dueno_id", u.id).maybeSingle();
      traducir(error);
      return data ? { id: data.id, nombre: data.nombre } : null;
    },

    async equiposDelClub() {
      const club = await clubId();
      const { data, error } = await sb.from("equipos").select("id,club_id,nombre").eq("club_id", club).order("nombre");
      traducir(error);
      return (data ?? []).map(aEquipo);
    },

    async crearEquipo(nombre) {
      const club = await clubId();
      const { data, error } = await sb.from("equipos").insert({ club_id: club, nombre: nombre.trim() }).select("id,club_id,nombre").single();
      traducir(error);
      return aEquipo(data!);
    },

    async renombrarEquipo(id, nombre) {
      const { error } = await sb.from("equipos").update({ nombre: nombre.trim() }).eq("id", id);
      traducir(error);
    },

    async borrarEquipo(id) {
      const { error } = await sb.from("equipos").delete().eq("id", id);
      traducir(error);
    },

    async asignacionesDelClub() {
      const { data, error } = await sb.rpc("asignaciones_del_club");
      traducir(error);
      return ((data ?? []) as { id: string; equipo_id: string; email: string; registrado: boolean }[])
        .map((f): Asignacion => ({ id: f.id, equipoId: f.equipo_id, email: f.email, registrado: f.registrado }));
    },

    async asignarEntrenador(equipoId, email) {
      const { error } = await sb.from("entrenadores_equipo").insert({ equipo_id: equipoId, email: normalizarCorreo(email) });
      if (error?.message.includes("duplicate key")) throw new ErrorApp("Ese entrenador ya está en este equipo.");
      traducir(error);
    },

    async moverAsignacion(id, equipoId) {
      const { error } = await sb.from("entrenadores_equipo").update({ equipo_id: equipoId }).eq("id", id);
      if (error?.message.includes("duplicate key")) throw new ErrorApp("Ese entrenador ya está en el otro equipo.");
      traducir(error);
    },

    async quitarAsignacion(id) {
      const { error } = await sb.from("entrenadores_equipo").delete().eq("id", id);
      traducir(error);
    },

    async misEquipos() {
      const u = await usuario();
      const { data, error } = await sb
        .from("equipos")
        .select("id,club_id,nombre,clubes(nombre),entrenadores_equipo!inner(email)")
        .eq("entrenadores_equipo.email", normalizarCorreo(u.email ?? ""))
        .order("nombre");
      traducir(error);
      return ((data ?? []) as unknown as Parameters<typeof aEquipo>[0][]).map(aEquipo);
    },

    async listar<T extends Fila>(tabla: Parameters<Api["listar"]>[0], equipoId: string) {
      const { data, error } = await sb.from(tabla).select("*").eq("equipo_id", equipoId);
      traducir(error);
      return (data ?? []).map((f) => aCamel<T>(f));
    },

    async guardar<T extends Fila>(tabla: Parameters<Api["guardar"]>[0], fila: T) {
      const { error } = await sb.from(tabla).upsert(aSnake(fila));
      traducir(error);
      return fila;
    },

    async borrar(tabla, id) {
      const { error } = await sb.from(tabla).delete().eq("id", id);
      traducir(error);
    },

    async leerAjustesEquipo(equipoId) {
      const { data, error } = await sb.from("ajustes_equipo").select("datos").eq("equipo_id", equipoId).maybeSingle();
      traducir(error);
      return (data?.datos as Record<string, unknown>) ?? null;
    },

    async guardarAjustesEquipo(equipoId, datos) {
      const { error } = await sb.from("ajustes_equipo").upsert({ equipo_id: equipoId, datos, actualizado: new Date().toISOString() });
      traducir(error);
    },

    async leerAjustesUsuario() {
      const u = await usuario();
      const { data, error } = await sb.from("ajustes_usuario").select("datos").eq("usuario_id", u.id).maybeSingle();
      traducir(error);
      return (data?.datos as Record<string, unknown>) ?? null;
    },

    async guardarAjustesUsuario(datos) {
      const u = await usuario();
      const { error } = await sb.from("ajustes_usuario").upsert({ usuario_id: u.id, datos, actualizado: new Date().toISOString() });
      traducir(error);
    }
  };
}
