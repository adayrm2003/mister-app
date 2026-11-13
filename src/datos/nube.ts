// MODO NUBE: cuentas y datos en Supabase. La seguridad por filas (supabase/esquema.sql)
// garantiza en el servidor que cada usuario solo ve lo que le toca.
import { createClient, type AuthError, type PostgrestError } from "@supabase/supabase-js";
import { type Api, type Club, type EntrenadorClub, type Equipo, type EquipoClub, type EventoSesion, type Fila, type Rol, ErrorApp, normalizarCorreo } from "./tipos";
import { cargarCatalogoLocal, type EjercicioCatalogo } from "./catalogo";

// Solo se convierten los nombres de primer nivel (equipoId <-> equipo_id); lo de dentro (jsonb) se guarda tal cual.
const aSnake = (o: object) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase()), v]));
const aCamel = <T,>(o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== "creado" && k !== "actualizado").map(([k, v]) => [k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()), v])) as T;

export function crearApiNube(url: string, clave: string): Api {
  const sb = createClient(url, clave, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

  function traducir(e: AuthError | PostgrestError | null): never | void {
    if (!e) return;
    if ("code" in e && e.code === "P0001") throw new ErrorApp(e.message);
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
  const aEquipo = (f: { id: string; club_id: string; nombre: string; clubes?: { nombre: string; escudo?: string | null } | null }): Equipo =>
    ({ id: f.id, clubId: f.club_id, nombre: f.nombre, club: f.clubes?.nombre, escudo: f.clubes?.escudo ?? null });

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
        options: { data: { rol: d.rol, nombre_club: d.nombreClub?.trim() || null, acepta_legal: d.aceptaLegal ?? null, acepta_legal_en: new Date().toISOString() }, emailRedirectTo: location.origin }
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
      const { data, error } = await sb.from("clubes").select("id,nombre,escudo").eq("dueno_id", u.id).maybeSingle();
      traducir(error);
      return data ? { id: data.id, nombre: data.nombre, escudo: data.escudo ?? null } : null;
    },

    async guardarClub({ nombre, escudo }) {
      const id = await clubId();
      const { error } = await sb.from("clubes").update({ nombre: nombre.trim(), escudo }).eq("id", id);
      traducir(error);
    },

    async entrenadoresDelClub() {
      const { data, error } = await sb.rpc("entrenadores_del_club");
      traducir(error);
      return (data ?? []) as EntrenadorClub[];
    },

    async anadirEntrenador(email) {
      const club = await clubId();
      const { error } = await sb.from("entrenadores_club").insert({ club_id: club, email: normalizarCorreo(email) });
      if (error?.message.includes("duplicate key")) throw new ErrorApp("Ese entrenador ya está en tu club.");
      traducir(error);
    },

    async quitarEntrenador(email) {
      const { error } = await sb.rpc("quitar_entrenador", { p_email: normalizarCorreo(email) });
      traducir(error);
    },

    async equiposDelClub() {
      const { data, error } = await sb.rpc("equipos_del_club");
      traducir(error);
      return (data ?? []) as EquipoClub[];
    },

    async pasarEquipo(equipoId, email) {
      const { error } = await sb.rpc("pasar_equipo", { p_equipo: equipoId, p_email: normalizarCorreo(email) });
      traducir(error);
    },

    async misClubes() {
      const u = await usuario();
      const { data, error } = await sb.from("entrenadores_club").select("clubes(id,nombre,escudo)").eq("email", normalizarCorreo(u.email ?? ""));
      traducir(error);
      return ((data ?? []) as unknown as { clubes: Club | null }[])
        .map((f) => f.clubes).filter((c): c is Club => !!c)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    },

    async misEquipos() {
      const u = await usuario();
      const { data, error } = await sb
        .from("equipos")
        .select("id,club_id,nombre,clubes(nombre,escudo),entrenadores_equipo!inner(email)")
        .eq("entrenadores_equipo.email", normalizarCorreo(u.email ?? ""))
        .order("nombre");
      traducir(error);
      return ((data ?? []) as unknown as Parameters<typeof aEquipo>[0][]).map(aEquipo);
    },

    async crearMiEquipo(club, nombre) {
      const { data, error } = await sb.rpc("crear_mi_equipo", { p_club: club, p_nombre: nombre.trim() });
      traducir(error);
      const f = (data as { id: string; club_id: string; nombre: string }[])[0];
      return aEquipo(f);
    },

    async renombrarEquipo(id, nombre) {
      const { error } = await sb.from("equipos").update({ nombre: nombre.trim() }).eq("id", id);
      traducir(error);
    },

    async borrarEquipo(id) {
      const { error } = await sb.from("equipos").delete().eq("id", id);
      traducir(error);
    },

    async catalogoEjercicios() {
      const { data, error } = await sb.from("ejercicios_catalogo").select("datos").order("id");
      // Sin conexión o si algo falla, se usa la copia que viene dentro de la app
      if (error || !data?.length) return cargarCatalogoLocal();
      return data.map((f) => f.datos as EjercicioCatalogo);
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
    },

    // Cada fila guarda el objeto entero en "datos" (jsonb) y la seguridad la limita a su dueño
    async listarMios<T extends { id: string }>(tabla: Parameters<Api["listarMios"]>[0]) {
      const { data, error } = await sb.from(tabla).select("datos").order("actualizado", { ascending: false });
      traducir(error);
      return (data ?? []).map((f) => f.datos as T);
    },

    async guardarMio<T extends { id: string }>(tabla: Parameters<Api["guardarMio"]>[0], fila: T) {
      const u = await usuario();
      const { error } = await sb.from(tabla).upsert({ id: fila.id, usuario_id: u.id, datos: fila, actualizado: new Date().toISOString() });
      traducir(error);
      return fila;
    },

    async subirVideo(ruta, archivo) {
      const { error } = await sb.storage.from("videos").upload(ruta, archivo, { contentType: archivo.type || "video/mp4", upsert: false });
      if (error) {
        const m = error.message.toLowerCase();
        if (m.includes("exceeded") || m.includes("too large") || m.includes("size")) throw new ErrorApp("El vídeo es demasiado grande para subirlo.");
        if (m.includes("row-level") || m.includes("unauthorized") || m.includes("not found")) throw new ErrorApp("No tienes permiso para subir vídeos a este equipo (o falta preparar los vídeos en Supabase).");
        throw new ErrorApp("No se ha podido subir el vídeo: " + error.message);
      }
    },

    async urlVideo(ruta) {
      const { data, error } = await sb.storage.from("videos").createSignedUrl(ruta, 3 * 3600);
      if (error || !data) throw new ErrorApp("No se puede abrir este vídeo. Puede que ya se haya borrado.");
      return data.signedUrl;
    },

    async borrarArchivoVideo(ruta) {
      const { error } = await sb.storage.from("videos").remove([ruta]);
      if (error) throw new ErrorApp("No se ha podido borrar el vídeo: " + error.message);
    },

    async borrarMio(tabla, id) {
      const { error } = await sb.from(tabla).delete().eq("id", id);
      traducir(error);
    }
  };
}
