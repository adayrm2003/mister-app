// Avisos al móvil: el entrenador los activa en este móvil y elige cuáles quiere.
// Los manda el servidor (función "avisos" de Supabase) aunque la app esté cerrada.
import { useEffect, useState } from "react";
import { api } from "../datos/api";
import type { PreferenciasAvisos } from "../datos/tipos";
import { mensajeDe, useUi } from "./ui";

const BASE: PreferenciasAvisos = { partidos: true, entrenamientos: true, lista: true };
const OPCIONES: { clave: keyof PreferenciasAvisos; titulo: string; texto: string }[] = [
  { clave: "partidos", titulo: "Partidos", texto: "La víspera a partir de las 19:00 y 2 horas antes" },
  { clave: "entrenamientos", titulo: "Entrenamientos", texto: "Hora y media antes" },
  { clave: "lista", titulo: "Pasar lista", texto: "Si al acabar el entrenamiento aún no has pasado lista" }
];

const deBase64 = (b: string) => {
  const s = atob((b + "=".repeat((4 - (b.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};
const hayPush = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const esIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalada = () => window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

async function registro(): Promise<ServiceWorkerRegistration | null> {
  if (!hayPush()) return null;
  const listo = navigator.serviceWorker.ready;
  const espera = new Promise<null>((r) => setTimeout(() => r(null), 4000));
  return Promise.race([listo, espera]);
}

export default function AvisosMovil() {
  const { avisar } = useUi();
  const [estado, setEstado] = useState<"cargando" | "no-disponible" | "iphone" | "prueba" | "bloqueados" | "apagados" | "activos">("cargando");
  const [prefs, setPrefs] = useState<PreferenciasAvisos>(BASE);
  const [ocupado, setOcupado] = useState(false);
  const [sub, setSub] = useState<PushSubscription | null>(null);

  useEffect(() => {
    (async () => {
      if (api.modo === "local") return setEstado("prueba");
      if (esIphone() && !instalada()) return setEstado("iphone");
      if (!hayPush()) return setEstado("no-disponible");
      if (Notification.permission === "denied") return setEstado("bloqueados");
      const reg = await registro();
      const s = await reg?.pushManager.getSubscription();
      if (!s) return setEstado("apagados");
      try {
        const p = await api.avisosDe(s.endpoint);
        setSub(s);
        if (p) { setPrefs({ ...BASE, ...p }); setEstado("activos"); } else setEstado("apagados");
      } catch { setEstado("apagados"); }
    })();
  }, []);

  const datos = (s: PushSubscription) => {
    const j = s.toJSON();
    return { endpoint: s.endpoint, p256dh: j.keys?.p256dh ?? "", auth: j.keys?.auth ?? "" };
  };
  const zona = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid";

  async function activar() {
    setOcupado(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") { setEstado(permiso === "denied" ? "bloqueados" : "apagados"); return; }
      const reg = await registro();
      if (!reg) throw new Error("Abre la app publicada (no la vista previa) para activar los avisos.");
      const clave = await api.clavePublicaAvisos();
      if (!clave) throw new Error("Los avisos se están preparando en el servidor. Vuelve a probar en unos minutos.");
      const s = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: deBase64(clave) }));
      await api.registrarAvisos(datos(s), zona(), prefs);
      setSub(s); setEstado("activos");
      avisar("Avisos activados en este móvil");
    } catch (e) { avisar(mensajeDe(e)); }
    finally { setOcupado(false); }
  }
  async function desactivar() {
    setOcupado(true);
    try {
      if (sub) { await api.quitarAvisos(sub.endpoint); await sub.unsubscribe().catch(() => false); }
      setSub(null); setEstado("apagados");
      avisar("Avisos desactivados en este móvil");
    } catch (e) { avisar(mensajeDe(e)); }
    finally { setOcupado(false); }
  }
  async function cambiar(clave: keyof PreferenciasAvisos, valor: boolean) {
    const nuevas = { ...prefs, [clave]: valor };
    setPrefs(nuevas);
    if (sub) { try { await api.registrarAvisos(datos(sub), zona(), nuevas); } catch (e) { avisar(mensajeDe(e)); } }
  }
  async function probar() {
    const reg = await registro();
    if (!reg) return;
    await reg.showNotification("Míster", { body: "Así te llegarán los avisos de partidos y entrenamientos.", icon: "/icons/icono-192.png", tag: "prueba" });
  }

  return (
    <section className="apartado avisos-movil">
      <header><h2>Avisos en este móvil</h2><p className="suave">Te avisamos de partidos y entrenamientos de todos tus equipos, aunque tengas la app cerrada.</p></header>
      {estado === "cargando" && <p className="suave">Comprobando…</p>}
      {estado === "prueba" && <p className="mensaje mensaje-aviso">Los avisos solo funcionan en la app publicada, no en el modo prueba.</p>}
      {estado === "no-disponible" && <p className="mensaje mensaje-aviso">Este navegador no puede recibir avisos. Prueba con Chrome en Android o instalando la app en el iPhone.</p>}
      {estado === "iphone" && (
        <p className="mensaje mensaje-aviso">En el iPhone, primero instala Míster: en Safari toca <b>Compartir</b> y luego <b>Añadir a pantalla de inicio</b>. Abre la app desde ese icono y vuelve aquí.</p>
      )}
      {estado === "bloqueados" && (
        <p className="mensaje mensaje-aviso">Los avisos están bloqueados para Míster. Actívalos en los ajustes del móvil (Notificaciones) o del navegador y vuelve a abrir la app.</p>
      )}
      {estado === "apagados" && (
        <button className="btn btn-peto btn-grande btn-ancho" type="button" disabled={ocupado} onClick={activar}>🔔 Activar avisos</button>
      )}
      {estado === "activos" && (
        <>
          {OPCIONES.map((o) => (
            <label key={o.clave} className="interruptor">
              <input type="checkbox" checked={prefs[o.clave]} onChange={(e) => cambiar(o.clave, e.target.checked)} />
              <span><b>{o.titulo}</b><small className="suave">{o.texto}</small></span>
            </label>
          ))}
          <div className="hoja-acciones">
            <button className="btn btn-gris" type="button" disabled={ocupado} onClick={desactivar}>Desactivar</button>
            <button className="btn btn-borde" type="button" onClick={probar}>Probar un aviso</button>
          </div>
        </>
      )}
    </section>
  );
}
