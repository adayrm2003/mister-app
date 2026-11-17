// Función "avisos": se ejecuta cada 10 minutos (pg_cron) y manda avisos al móvil de cada entrenador
// que los haya activado: la víspera de un partido, 2 horas antes del partido, 1 hora y media antes
// del entrenamiento y, si no se pasó lista, después del entrenamiento.
// No recibe datos de nadie: si alguien la llama de más, como cada aviso solo se manda una vez, no pasa nada.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const APP = "https://misterapp-avanzar.netlify.app";

interface Suscripcion { id: string; usuario_id: string; endpoint: string; p256dh: string; auth: string; zona: string; preferencias: Record<string, boolean> }
interface Aviso { clave: string; title: string; body: string; url: string }

async function claves() {
  const { data: privada } = await sb.rpc("clave_avisos");
  if (privada) {
    const { data } = await sb.from("avisos_config").select("clave_publica").eq("id", 1).single();
    return { publica: data!.clave_publica as string, privada: privada as string };
  }
  // Primera vez: se crean y se guardan (la privada, cifrada en el Vault)
  const k = webpush.generateVAPIDKeys();
  await sb.rpc("guardar_claves_avisos", { p_privada: k.privateKey, p_publica: k.publicKey });
  return { publica: k.publicKey, privada: k.privateKey };
}

/** Fecha y hora locales de la zona del móvil, como texto y en minutos para comparar. */
function ahoraEn(zona: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  const fecha = `${p.year}-${p.month}-${p.day}`, hora = `${p.hour}:${p.minute}`;
  return { fecha, hora, min: minutos(fecha, hora) };
}
const minutos = (fecha: string, hora: string) => {
  const [a, m, d] = fecha.split("-").map(Number), [h, mi] = (hora || "00:00").split(":").map(Number);
  return Date.UTC(a, m - 1, d, h || 0, mi || 0) / 60000;
};
const sumarDia = (f: string, n: number) => { const d = new Date(f + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

Deno.serve(async () => {
  try {
    // Las claves se crean en la primera ejecución, antes de que nadie active los avisos
    const k = await claves();
    webpush.setVapidDetails(APP, k.publica, k.privada);
    const { data: subs } = await sb.from("avisos_suscripciones").select("*");
    if (!subs?.length) return new Response(JSON.stringify({ enviados: 0 }), { headers: { "Content-Type": "application/json" } });

    // Equipos de cada usuario (por su correo)
    const usuarios = [...new Set((subs as Suscripcion[]).map((s) => s.usuario_id))];
    const { data: perfiles } = await sb.from("perfiles").select("id,email").in("id", usuarios);
    const correos = [...new Set((perfiles ?? []).map((p) => (p.email as string).trim().toLowerCase()))];
    const { data: asign } = await sb.from("entrenadores_equipo").select("equipo_id,email").in("email", correos);
    const equiposIds = [...new Set((asign ?? []).map((a) => a.equipo_id as string))];
    if (!equiposIds.length) return new Response(JSON.stringify({ enviados: 0 }), { headers: { "Content-Type": "application/json" } });
    const hoyUtc = new Date().toISOString().slice(0, 10);
    const desde = sumarDia(hoyUtc, -1), hasta = sumarDia(hoyUtc, 2);
    const [{ data: equipos }, { data: partidos }, { data: eventos }] = await Promise.all([
      sb.from("equipos").select("id,nombre").in("id", equiposIds),
      sb.from("partidos").select("id,equipo_id,rival,fecha,hora,campo,casa,convocados").in("equipo_id", equiposIds).gte("fecha", desde).lte("fecha", hasta),
      sb.from("eventos").select("id,equipo_id,tipo,titulo,fecha,hora,hora_fin,lugar,asistencia").in("equipo_id", equiposIds).eq("tipo", "entrenamiento").gte("fecha", desde).lte("fecha", hasta)
    ]);
    const nombreEquipo = new Map((equipos ?? []).map((e) => [e.id, e.nombre as string]));
    const varios = (ids: string[]) => ids.length > 1;

    let enviados = 0;
    for (const s of subs as Suscripcion[]) {
      const correo = (perfiles?.find((p) => p.id === s.usuario_id)?.email as string | undefined)?.trim().toLowerCase();
      const mios = (asign ?? []).filter((a) => a.email === correo).map((a) => a.equipo_id as string);
      if (!mios.length) continue;
      const pref = { partidos: true, entrenamientos: true, lista: true, ...(s.preferencias ?? {}) };
      const ya = ahoraEn(s.zona || "Europe/Madrid");
      const prefijo = (eq: string) => (varios(mios) ? `${nombreEquipo.get(eq)} · ` : "");
      const avisos: Aviso[] = [];

      if (pref.partidos) for (const p of (partidos ?? []).filter((x) => mios.includes(x.equipo_id))) {
        const lugar = `${p.casa ? "🏠 En casa" : "✈️ Fuera"}${p.campo ? ` · ${p.campo}` : ""}`;
        if (p.fecha === sumarDia(ya.fecha, 1) && ya.hora >= "19:00") {
          const conv = p.convocados ? `Convocatoria hecha (${p.convocados.length})` : "Aún no has hecho la convocatoria";
          avisos.push({ clave: `p:${p.id}:vispera:${p.fecha}`, title: `${prefijo(p.equipo_id)}Mañana partido vs ${p.rival}`, body: `${p.hora ? p.hora + " · " : ""}${lugar}. ${conv}.`, url: `/partidos/${p.id}` });
        }
        if (p.hora) {
          const falta = minutos(p.fecha, p.hora) - ya.min;
          if (falta > 0 && falta <= 120) avisos.push({ clave: `p:${p.id}:pronto:${p.fecha}${p.hora}`, title: `${prefijo(p.equipo_id)}Partido a las ${p.hora}`, body: `vs ${p.rival} · ${lugar}`, url: `/partidos/${p.id}/alineacion` });
        }
      }
      for (const e of (eventos ?? []).filter((x) => mios.includes(x.equipo_id))) {
        if (pref.entrenamientos && e.hora) {
          const falta = minutos(e.fecha, e.hora) - ya.min;
          if (falta > 0 && falta <= 90) avisos.push({ clave: `e:${e.id}:pronto:${e.fecha}${e.hora}`, title: `${prefijo(e.equipo_id)}Entrenamiento a las ${e.hora}`, body: e.lugar || e.titulo || "Toca para ver la sesión", url: `/calendario/${e.id}` });
        }
        const sinLista = !e.asistencia || Object.keys(e.asistencia).length === 0;
        if (pref.lista && sinLista && e.fecha === ya.fecha) {
          const fin = e.hora_fin || (e.hora ? `${String(Math.min(23, Number(e.hora.slice(0, 2)) + 1)).padStart(2, "0")}${e.hora.slice(2)}` : "20:00");
          const pasado = ya.min - minutos(e.fecha, fin);
          if (pasado >= 15 && ya.hora <= "23:30") avisos.push({ clave: `e:${e.id}:lista`, title: `${prefijo(e.equipo_id)}¿Pasaste lista?`, body: "El entrenamiento de hoy aún no tiene la asistencia apuntada. Son dos toques.", url: `/calendario/${e.id}` });
        }
      }

      for (const a of avisos) {
        // Se apunta antes de mandarlo: si ya estaba, no se repite
        const { data: nuevo, error } = await sb.from("avisos_enviados").insert({ suscripcion_id: s.id, clave: a.clave }).select("clave").maybeSingle();
        if (error || !nuevo) continue;
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title: a.title, body: a.body, url: a.url, tag: a.clave }), { TTL: 3600, urgency: "high" });
          enviados++;
        } catch (err) {
          const codigo = (err as { statusCode?: number }).statusCode;
          if (codigo === 404 || codigo === 410) { await sb.from("avisos_suscripciones").delete().eq("id", s.id); break; }
        }
      }
    }
    // Limpieza: lo enviado hace más de 10 días ya no hace falta
    await sb.from("avisos_enviados").delete().lt("enviado", new Date(Date.now() - 10 * 864e5).toISOString());
    return new Response(JSON.stringify({ enviados }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
