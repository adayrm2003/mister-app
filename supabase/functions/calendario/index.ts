// Función "calendario": devuelve los partidos y entrenamientos de un equipo en formato de calendario (.ics)
// para suscribirse desde el móvil (iPhone, Google Calendar…). Se entra con el enlace privado del equipo (?t=token).
// Solo lleva fechas, horas, rivales y lugares: nada de jugadores.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
/** Las líneas de un .ics no deben pasar de 75 bytes: se parten. */
function plegar(linea: string) {
  const enc = new TextEncoder();
  if (enc.encode(linea).length <= 74) return linea;
  const partes: string[] = []; let actual = "";
  for (const ch of linea) {
    if (enc.encode(actual + ch).length > 73) { partes.push(actual); actual = ""; }
    actual += ch;
  }
  partes.push(actual);
  return partes.join("\r\n ");
}
const fechaHora = (f: string, h: string) => `${f.replace(/-/g, "")}T${(h || "00:00").replace(":", "")}00`;
const sumarMin = (f: string, h: string, min: number) => {
  const [a, m, d] = f.split("-").map(Number), [hh, mm] = (h || "00:00").split(":").map(Number);
  const x = new Date(Date.UTC(a, m - 1, d, hh, mm + min));
  return x.toISOString().slice(0, 16).replace(/[-:]/g, "") + "00";
};
const diaSiguiente = (f: string) => { const d = new Date(f + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10).replace(/-/g, ""); };

Deno.serve(async (req) => {
  const t = new URL(req.url).searchParams.get("t") ?? "";
  if (!UUID.test(t)) return new Response("Enlace no válido", { status: 404 });
  const { data: enlace } = await sb.from("calendario_enlaces").select("equipo_id").eq("token", t).maybeSingle();
  if (!enlace) return new Response("Enlace no válido o cambiado", { status: 404 });
  const eq = enlace.equipo_id as string;
  const desde = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  const [{ data: equipo }, { data: ajustes }, { data: partidos }, { data: eventos }] = await Promise.all([
    sb.from("equipos").select("nombre").eq("id", eq).maybeSingle(),
    sb.from("ajustes_equipo").select("datos").eq("equipo_id", eq).maybeSingle(),
    sb.from("partidos").select("id,rival,fecha,hora,campo,casa,competicion,torneo").eq("equipo_id", eq).gte("fecha", desde),
    sb.from("eventos").select("id,tipo,titulo,fecha,hora,hora_fin,lugar").eq("equipo_id", eq).gte("fecha", desde)
  ]);
  const nombre = (equipo?.nombre as string) ?? "Equipo";
  const a = (ajustes?.datos ?? {}) as Record<string, unknown>;
  const dur: Record<string, [number, number]> = { "2x45": [2, 45], "2x40": [2, 40], "2x30": [2, 30], "2x25": [2, 25] };
  const [partes, mins] = dur[String(a.duracion)] ?? [Number(a.partesOtra) || 2, Number(a.minutosParteOtra) || 35];
  const duracionPartido = partes * mins + 15;
  const ahora = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

  const l: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mister//Calendario//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(`Míster · ${nombre}`)}`, "X-WR-TIMEZONE:Europe/Madrid", "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H"];
  const evento = (uid: string, resumen: string, f: string, h: string, finMin: number | null, fin: string | null, lugar: string, desc: string) => {
    l.push("BEGIN:VEVENT", `UID:${uid}@mister`, `DTSTAMP:${ahora}`);
    if (h) {
      l.push(`DTSTART:${fechaHora(f, h)}`);
      l.push(`DTEND:${fin ? fechaHora(f, fin) : sumarMin(f, h, finMin ?? 90)}`);
    } else {
      l.push(`DTSTART;VALUE=DATE:${f.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${diaSiguiente(f)}`);
    }
    l.push(`SUMMARY:${esc(resumen)}`);
    if (lugar) l.push(`LOCATION:${esc(lugar)}`);
    if (desc) l.push(`DESCRIPTION:${esc(desc)}`);
    l.push("END:VEVENT");
  };
  for (const p of partidos ?? []) {
    const torneo = (p.torneo as { nombre?: string } | null)?.nombre;
    evento(`p-${p.id}`, `${torneo ? `🏆 ${torneo}: ` : "⚽ "}vs ${p.rival}`, p.fecha, p.hora, duracionPartido, null, p.campo ?? "",
      `${nombre} · ${p.casa ? "En casa" : "Fuera"} · ${p.competicion}`);
  }
  for (const e of eventos ?? []) {
    const tipo = e.tipo === "entrenamiento" ? "Entrenamiento" : e.tipo === "partido" ? "Partido" : e.tipo === "torneo" ? "Torneo" : "";
    const titulo = e.titulo || tipo || "Evento";
    evento(`e-${e.id}`, `${e.tipo === "entrenamiento" ? "🏃 " : ""}${titulo}`, e.fecha, e.hora, 90, e.hora_fin || null, e.lugar ?? "", nombre);
  }
  l.push("END:VCALENDAR");
  return new Response(l.map(plegar).join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `inline; filename="mister.ics"`, "Cache-Control": "max-age=900" }
  });
});
