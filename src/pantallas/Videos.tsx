// Vídeos de análisis: el entrenador sube un vídeo de su equipo, lo para en los momentos clave y
// dibuja encima para explicarlo. Solo lo ven los entrenadores del equipo y se borra solo a los 30 días.
import { useCallback, useEffect, useRef, useState, type PointerEvent as PE } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useColeccion, useEquipo } from "../ContextoEquipo";
import { api } from "../datos/api";
import { nuevoId, type Punto } from "../datos/modelo";
import { ESTILOS_FLECHA, type Dibujo, type EstiloFlecha, type TipoDibujo } from "../datos/pizarra";
import {
  DIAS_VIDEO, LIMITE_BYTES, MINUTOS_MAX, caducado, extensionDe, ordenarMomentos, textoCaduca, tiempo,
  type MomentoVideo, type VideoAnalisis
} from "../datos/video";
import { DibujoLibre, ICONOS, Icono, NOMBRES, SelectorColorGrosor } from "../componentes/Pizarra";
import { IcoAtras, IcoMas, IcoPapelera } from "../componentes/Iconos";
import { Hoja, mensajeDe, useUi } from "../componentes/ui";
import { leerVideo, necesitaReducir, puedeReducir, reducirVideo, type InfoVideo } from "../componentes/prepararVideo";
import { VW, altoCapa } from "../componentes/exportarAnalisis";
import "../componentes/pizarra.css";
import "./ejercicios.css";
import "./partidos.css";
import "./videos.css";

const MB = (b: number) => (b / 1024 / 1024).toFixed(b > 10 * 1024 * 1024 ? 0 : 1).replace(".", ",") + " MB";
const FOTOGRAMA = 1 / 30;
const CERCA = 0.06;

/** Borra los vídeos que ya han cumplido 30 días (archivo y datos). */
function useLimpiarCaducados(filas: VideoAnalisis[], borrar: (id: string) => Promise<void>) {
  const hecho = useRef(new Set<string>());
  useEffect(() => {
    for (const v of filas) {
      if (!caducado(v) || hecho.current.has(v.id)) continue;
      hecho.current.add(v.id);
      api.borrarArchivoVideo(v.ruta).catch(() => { /* si no se puede, el servidor ya no deja abrirlo */ }).finally(() => borrar(v.id));
    }
  }, [filas, borrar]);
}

/* ---------------- Lista de vídeos ---------------- */
export function VideosLista() {
  const { filas, cargando, guardar, borrar } = useColeccion<VideoAnalisis>("videos");
  const [subir, setSubir] = useState(false);
  const ir = useNavigate();
  useLimpiarCaducados(filas, borrar);
  const lista = filas.filter((v) => !caducado(v)).sort((a, b) => b.subido.localeCompare(a.subido));

  return (
    <main className="pagina pagina-ancha videos">
      <div className="partido-cabeza">
        <Link to="/pizarra" className="btn btn-icono" aria-label="Volver a la pizarra"><IcoAtras /></Link>
        <h1 style={{ flex: 1 }}>Vídeos</h1>
      </div>
      <button className="btn btn-peto btn-grande btn-ancho" type="button" onClick={() => setSubir(true)}><IcoMas /> Subir vídeo</button>
      <p className="aviso-videos tarjeta">
        <b>Se borran solos a los {DIAS_VIDEO} días.</b> Solo los ven los entrenadores de este equipo. Para guardar una jugada para siempre, expórtala con los dibujos.
      </p>

      {!cargando && lista.length === 0 && (
        <div className="vacio tarjeta">
          <IconoVideo />
          <h3>Aún no hay vídeos</h3>
          <p>Sube un trozo de un partido o de un entrenamiento, páralo donde quieras y dibuja encima para explicarlo.</p>
        </div>
      )}
      <div className="lista">
        {lista.map((v) => (
          <Link key={v.id} to={`/pizarra/videos/${v.id}`} className="fila fila-boton video-fila">
            <span className="video-icono" aria-hidden="true"><IconoVideo /></span>
            <span className="fila-texto">
              <b>{v.nombre || "Vídeo sin nombre"}</b>
              <span>{tiempo(v.duracion)} · {v.momentos.length} {v.momentos.length === 1 ? "momento" : "momentos"}</span>
              <small className="suave">{textoCaduca(v)}</small>
            </span>
          </Link>
        ))}
      </div>
      {subir && <HojaSubirVideo alCerrar={() => setSubir(false)} guardar={guardar} alSubir={(id) => { setSubir(false); ir(`/pizarra/videos/${id}`); }} />}
    </main>
  );
}

export const IconoVideo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" />
  </svg>
);

/* ---------------- Subir un vídeo ---------------- */
function HojaSubirVideo({ alCerrar, guardar, alSubir }: { alCerrar: () => void; guardar: (v: VideoAnalisis) => Promise<void>; alSubir: (id: string) => void }) {
  const { equipo } = useEquipo();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [info, setInfo] = useState<InfoVideo | null>(null);
  const [nombre, setNombre] = useState("");
  const [permiso, setPermiso] = useState(false);
  const [estado, setEstado] = useState<"elegir" | "leyendo" | "listo" | "reduciendo" | "subiendo">("elegir");
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState("");
  const cancelado = useRef(false);
  const entrada = useRef<HTMLInputElement>(null);
  useEffect(() => () => { cancelado.current = true; }, []);

  async function elegir(f: File | undefined) {
    if (!f) return;
    setError(""); setEstado("leyendo"); setArchivo(f);
    setNombre(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").slice(0, 60));
    try { setInfo(await leerVideo(f)); setEstado("listo"); }
    catch (e) { setError(mensajeDe(e)); setArchivo(null); setInfo(null); setEstado("elegir"); }
  }
  const reducir = !!archivo && necesitaReducir(archivo);
  const demasiadoLargo = !!info && reducir && !puedeReducir(info);
  const fecha = new Date(Date.now() + DIAS_VIDEO * 864e5).toLocaleDateString("es-ES", { day: "numeric", month: "long" });

  async function subir() {
    if (!archivo || !info) return;
    if (!nombre.trim()) return setError("Ponle un nombre al vídeo.");
    if (!permiso) return setError("Marca la casilla del permiso de las familias para poder subirlo.");
    setError(""); cancelado.current = false;
    try {
      let blob: Blob = archivo;
      if (reducir) {
        setEstado("reduciendo"); setProgreso(0);
        blob = await reducirVideo(archivo, info, setProgreso, () => cancelado.current);
      }
      if (blob.size > LIMITE_BYTES) throw new Error(`El vídeo ocupa ${MB(blob.size)} y el máximo son ${MB(LIMITE_BYTES)}. Recórtalo en el móvil y vuelve a probar.`);
      setEstado("subiendo");
      const id = nuevoId();
      const tipo = (blob.type || "video/mp4").split(";")[0];
      const ruta = `${equipo.id}/${id}.${extensionDe(tipo)}`;
      await api.subirVideo(ruta, blob);
      const v: VideoAnalisis = {
        id, equipoId: equipo.id, nombre: nombre.trim(), duracion: Math.round(info.duracion * 100) / 100, ancho: info.ancho, alto: info.alto,
        ruta, tipoArchivo: tipo, tamano: blob.size, subido: new Date().toISOString(), momentos: []
      };
      try { await guardar(v); }
      catch (e) { api.borrarArchivoVideo(ruta).catch(() => undefined); throw e; }
      alSubir(id);
    } catch (e) {
      if (mensajeDe(e) === "cancelado") return;
      setError(mensajeDe(e)); setEstado("listo");
    }
  }

  return (
    <Hoja titulo="Subir vídeo" alCerrar={() => { cancelado.current = true; alCerrar(); }}>
      <input ref={entrada} type="file" accept="video/*" hidden onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = ""; }} />
      {(estado === "elegir" || estado === "leyendo") && (
        <>
          <button className="btn btn-principal btn-grande btn-ancho" type="button" disabled={estado === "leyendo"} onClick={() => entrada.current?.click()}>
            {estado === "leyendo" ? "Abriendo el vídeo…" : "Elegir vídeo"}
          </button>
          <p className="suave">Mejor trozos cortos: como mucho {MB(LIMITE_BYTES)}. Si pesa más, la app lo reduce (hasta {MINUTOS_MAX} minutos de vídeo).</p>
        </>
      )}
      {estado === "listo" && archivo && info && (
        <>
          <label className="campo"><span>Nombre</span>
            <input className="entrada" value={nombre} maxLength={60} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Presión tras pérdida, 2.ª parte" />
          </label>
          <p className="suave">{tiempo(info.duracion)} · {MB(archivo.size)} · <button type="button" className="enlace" onClick={() => entrada.current?.click()}>Cambiar de vídeo</button></p>
          {reducir && !demasiadoLargo && (
            <p className="mensaje mensaje-aviso">Antes de subirlo, la app lo pasará a calidad media y sin sonido para que ocupe menos. Tarda lo mismo que dura el vídeo ({tiempo(info.duracion)}).</p>
          )}
          {demasiadoLargo && (
            <p className="mensaje mensaje-error">Este vídeo dura {tiempo(info.duracion)} y pesa demasiado. Recórtalo en el móvil (como mucho {MINUTOS_MAX} minutos) y vuelve a elegirlo.</p>
          )}
          <label className="interruptor">
            <input type="checkbox" checked={permiso} onChange={(e) => setPermiso(e.target.checked)} />
            <span><b>El club tiene permiso de las familias</b><small className="suave">para grabar a los jugadores y usar el vídeo dentro del equipo.</small></span>
          </label>
          <p className="suave">Solo lo verán los entrenadores de este equipo. <b>Se borrará solo el {fecha}.</b></p>
          {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
          <div className="hoja-acciones">
            <button className="btn btn-gris" type="button" onClick={alCerrar}>Cancelar</button>
            <button className="btn btn-principal" type="button" disabled={demasiadoLargo} onClick={subir}>Subir vídeo</button>
          </div>
        </>
      )}
      {(estado === "reduciendo" || estado === "subiendo") && (
        <div className="exportar-progreso" aria-live="polite">
          <p><b>{estado === "reduciendo" ? "Preparando el vídeo…" : "Subiendo el vídeo…"}</b></p>
          <div className={"barra-progreso" + (estado === "subiendo" ? " indefinida" : "")}><span style={{ width: estado === "reduciendo" ? `${progreso}%` : undefined }} /></div>
          <p className="suave">{estado === "reduciendo" ? `${progreso} % · deja esta pantalla abierta` : "Depende de tu conexión. Deja esta pantalla abierta."}</p>
          {estado === "reduciendo" && <button className="btn btn-gris" type="button" onClick={() => { cancelado.current = true; setEstado("listo"); }}>Cancelar</button>}
        </div>
      )}
      {estado === "elegir" && error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
    </Hoja>
  );
}

/* ---------------- Analizar un vídeo ---------------- */
export function AnalisisVideo() {
  const { id } = useParams();
  const { filas, cargando, guardar, borrar } = useColeccion<VideoAnalisis>("videos");
  const v = filas.find((x) => x.id === id);
  if (cargando) return <main className="pagina"><p className="suave">Cargando…</p></main>;
  if (!v || caducado(v)) {
    return (
      <main className="pagina">
        <div className="partido-cabeza"><Link to="/pizarra/videos" className="btn btn-icono" aria-label="Volver a los vídeos"><IcoAtras /></Link><h1>Vídeo</h1></div>
        <div className="vacio tarjeta"><IconoVideo /><h3>Este vídeo ya no está</h3><p>Se ha borrado, o ya han pasado los {DIAS_VIDEO} días.</p></div>
      </main>
    );
  }
  return <Analizador key={v.id} video={v} guardar={guardar} borrar={borrar} />;
}

type HerramientaVideo = TipoDibujo;
const HERRAMIENTAS: HerramientaVideo[] = ["flecha", "linea", "lapiz", "circulo", "zona", "texto"];

function Analizador({ video: v, guardar, borrar }: { video: VideoAnalisis; guardar: (v: VideoAnalisis) => Promise<void>; borrar: (id: string) => Promise<void> }) {
  const { confirmar, avisar } = useUi();
  const ir = useNavigate();
  const [url, setUrl] = useState("");
  const [errorVideo, setErrorVideo] = useState("");
  const [actual, setActual] = useState(0);
  const [duracion, setDuracion] = useState(v.duracion);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [velocidad, setVelocidad] = useState(1);
  const [parar, setParar] = useState(true);
  const [momentos, setMomentos] = useState<MomentoVideo[]>(() => ordenarMomentos(v.momentos));
  const [editando, setEditando] = useState<string | null>(null);
  const [herramienta, setHerramienta] = useState<HerramientaVideo>("flecha");
  const [estiloFlecha, setEstiloFlecha] = useState<EstiloFlecha>("pase");
  const [color, setColor] = useState("#F5C518");
  const [grosor, setGrosor] = useState(7);
  const [textoId, setTextoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState(v.nombre);
  const [hoja, setHoja] = useState<null | "exportar" | "imagen" | "nombre">(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const capaRef = useRef<SVGSVGElement>(null);
  const anterior = useRef(0);
  const dibujando = useRef<string | null>(null);
  const h = altoCapa(v);

  // Dirección del vídeo (temporal y privada)
  useEffect(() => {
    let vivo = true, creada = "";
    api.urlVideo(v.ruta).then((u) => { creada = u; if (vivo) setUrl(u); }).catch((e) => vivo && setErrorVideo(mensajeDe(e)));
    return () => { vivo = false; if (creada.startsWith("blob:")) URL.revokeObjectURL(creada); };
  }, [v.ruta]);

  // Guardado automático de los momentos y los dibujos
  const ultimo = useRef({ v, momentos, nombre });
  ultimo.current = { v, momentos, nombre };
  const pendiente = useRef(false);
  const guardarYa = useCallback(() => {
    if (!pendiente.current) return;
    pendiente.current = false;
    const u = ultimo.current;
    guardar({ ...u.v, nombre: u.nombre.trim() || u.v.nombre, momentos: u.momentos.filter((m) => m.dibujos.length || m.nombre) }).catch(() => undefined);
  }, [guardar]);
  useEffect(() => {
    const t = setTimeout(guardarYa, 700);
    return () => clearTimeout(t);
  }, [momentos, nombre, guardarYa]);
  useEffect(() => () => guardarYa(), [guardarYa]);
  const cambiarMomentos = (fn: (l: MomentoVideo[]) => MomentoVideo[]) => { pendiente.current = true; setMomentos((l) => ordenarMomentos(fn(l))); };

  // Mientras se reproduce: avanza la barra y se para en cada momento
  useEffect(() => {
    if (!reproduciendo) return;
    let raf = 0;
    const paso = () => {
      const el = videoRef.current;
      if (!el) return;
      const t = el.currentTime;
      if (parar) {
        const m = momentos.find((x) => x.t > anterior.current + 0.001 && x.t <= t + 0.001);
        if (m) {
          el.pause();
          el.currentTime = m.t;
          anterior.current = m.t;
          setActual(m.t);
          return;
        }
      }
      anterior.current = t;
      setActual(t);
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [reproduciendo, parar, momentos]);
  useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = velocidad; }, [velocidad, url]);

  const irA = (t: number) => {
    const el = videoRef.current;
    if (!el) return;
    const destino = Math.max(0, Math.min(duracion, t));
    el.currentTime = destino;
    anterior.current = destino;
    setActual(destino);
  };
  const pausar = () => videoRef.current?.pause();
  async function alternar() {
    const el = videoRef.current;
    if (!el) return;
    if (editando) terminar();
    if (!el.paused) { el.pause(); return; }
    if (el.ended || el.currentTime >= duracion - 0.05) irA(0);
    anterior.current = el.currentTime;
    try { await el.play(); } catch { /* el navegador no dejó reproducir */ }
  }
  const fotograma = (n: number) => { pausar(); irA((videoRef.current?.currentTime ?? actual) + n * FOTOGRAMA); };

  const aqui = !reproduciendo ? momentos.find((m) => Math.abs(m.t - actual) < CERCA) : undefined;
  const enEdicion = editando ? momentos.find((m) => m.id === editando) : undefined;
  const visibles = enEdicion?.dibujos ?? aqui?.dibujos ?? [];
  const momentoAnterior = [...momentos].reverse().find((m) => m.t < actual - CERCA);
  const momentoSiguiente = momentos.find((m) => m.t > actual + CERCA);

  function dibujarAqui() {
    pausar();
    const t = Math.round((videoRef.current?.currentTime ?? actual) * 1000) / 1000;
    const existe = momentos.find((m) => Math.abs(m.t - t) < CERCA);
    if (existe) { setEditando(existe.id); irA(existe.t); return; }
    const m: MomentoVideo = { id: crypto.randomUUID(), t, nombre: `Momento ${momentos.length + 1}`, dibujos: [] };
    cambiarMomentos((l) => [...l, m]);
    setEditando(m.id);
  }
  function terminar() {
    // Un momento sin dibujos que se acaba de crear no se queda
    cambiarMomentos((l) => l.filter((m) => m.id !== editando || m.dibujos.length > 0));
    setEditando(null); setTextoId(null);
  }
  const cambiarDibujos = (fn: (d: Dibujo[]) => Dibujo[]) => cambiarMomentos((l) => l.map((m) => (m.id === editando ? { ...m, dibujos: fn(m.dibujos) } : m)));

  // Dibujar con el dedo encima del vídeo
  const enPunto = (e: PE<SVGSVGElement>): Punto => {
    const r = capaRef.current!.getBoundingClientRect();
    const c = (n: number) => Math.round(Math.max(0, Math.min(100, n)) * 10) / 10;
    return { x: c(((e.clientX - r.left) / r.width) * 100), y: c(((e.clientY - r.top) / r.height) * 100) };
  };
  function abajo(e: PE<SVGSVGElement>) {
    if (!editando) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sin captura */ }
    const p = enPunto(e), id = crypto.randomUUID();
    if (herramienta === "texto") {
      cambiarDibujos((l) => [...l, { id, tipo: "texto", puntos: [p], color, grosor, texto: "Texto" }]);
      setTextoId(id);
      return;
    }
    cambiarDibujos((l) => [...l, { id, tipo: herramienta, puntos: herramienta === "lapiz" ? [p] : [p, p], color, grosor, ...(herramienta === "flecha" ? { estilo: estiloFlecha } : {}) }]);
    dibujando.current = id;
  }
  function mover(e: PE<SVGSVGElement>) {
    const id = dibujando.current;
    if (!id) return;
    const p = enPunto(e);
    cambiarDibujos((l) => l.map((d) => {
      if (d.id !== id) return d;
      if (d.tipo !== "lapiz") return { ...d, puntos: [d.puntos[0], p] };
      const u = d.puntos[d.puntos.length - 1];
      return Math.hypot(p.x - u.x, p.y - u.y) < 0.6 ? d : { ...d, puntos: [...d.puntos, p] };
    }));
  }
  function arriba() {
    const id = dibujando.current;
    dibujando.current = null;
    if (!id) return;
    // Un toque sin arrastrar no deja nada
    cambiarDibujos((l) => l.filter((d) => {
      if (d.id !== id) return true;
      if (d.tipo === "lapiz") return d.puntos.length > 1;
      const [a, b] = [d.puntos[0], d.puntos[1] ?? d.puntos[0]];
      return Math.hypot(b.x - a.x, b.y - a.y) > 2;
    }));
  }
  const texto = enEdicion?.dibujos.find((d) => d.id === textoId);

  async function borrarMomento(m: MomentoVideo) {
    if (!(await confirmar({ titulo: `¿Borrar «${m.nombre}»?`, texto: "Se quitarán sus dibujos. El vídeo no se toca." }))) return;
    if (editando === m.id) { setEditando(null); setTextoId(null); }
    cambiarMomentos((l) => l.filter((x) => x.id !== m.id));
  }
  async function limpiar() {
    if (!enEdicion?.dibujos.length) return;
    if (await confirmar({ titulo: "¿Borrar todos los dibujos de este momento?", texto: "Esto no se puede deshacer." })) { cambiarDibujos(() => []); setTextoId(null); }
  }
  async function borrarVideo() {
    if (!(await confirmar({ titulo: `¿Borrar el vídeo «${v.nombre}»?`, texto: "Se borrarán el vídeo y todos sus dibujos. Esto no se puede deshacer." }))) return;
    pendiente.current = false;
    try { await api.borrarArchivoVideo(v.ruta); } catch (e) { avisar(mensajeDe(e)); return; }
    await borrar(v.id);
    avisar("Vídeo borrado");
    ir("/pizarra/videos");
  }

  const proporcion = `${v.ancho || 16} / ${v.alto || 9}`;
  return (
    <main className="pagina pagina-ancha analisis-video">
      <div className="partido-cabeza">
        <Link to="/pizarra/videos" className="btn btn-icono" aria-label="Volver a los vídeos"><IcoAtras /></Link>
        <button type="button" className="titulo-video" onClick={() => setHoja("nombre")} aria-label="Cambiar el nombre del vídeo"><h1>{nombre || "Vídeo"}</h1></button>
      </div>
      <p className="suave caduca">{textoCaduca(v)}</p>

      <div className="escenario-video" style={{ aspectRatio: proporcion, width: `min(100%, calc(var(--alto-video) * ${(v.ancho || 16) / (v.alto || 9)}))` }}>
        {url && (
          <video ref={videoRef} src={url} playsInline muted crossOrigin="anonymous" preload="auto"
            onLoadedMetadata={(e) => { if (isFinite(e.currentTarget.duration)) setDuracion(e.currentTarget.duration); }}
            onPlay={() => setReproduciendo(true)} onPause={() => { setReproduciendo(false); setActual(videoRef.current?.currentTime ?? 0); }}
            onSeeked={() => { if (videoRef.current?.paused) setActual(videoRef.current.currentTime); }}
            onError={() => setErrorVideo("No se puede reproducir este vídeo en este navegador.")} />
        )}
        {!url && !errorVideo && <p className="video-cargando">Cargando el vídeo…</p>}
        {errorVideo && <p className="video-cargando mensaje-error">{errorVideo}</p>}
        <svg ref={capaRef} className={"capa-dibujo" + (editando ? " activa" : "")} viewBox={`0 0 ${VW} ${h}`} preserveAspectRatio="none"
          onPointerDown={abajo} onPointerMove={mover} onPointerUp={arriba} onPointerCancel={arriba} onClick={() => { if (!editando && url) alternar(); }}>
          {visibles.map((d) => <DibujoLibre key={d.id} d={d} h={h} />)}
        </svg>
      </div>
      {(aqui || editando) && (
        <p className={"rotulo-momento" + (editando ? " dibujando" : "")} aria-live="polite">
          {editando ? `Dibujando en «${enEdicion?.nombre ?? ""}» · toca «Listo» al terminar` : `${aqui!.nombre} · ${aqui!.dibujos.length} ${aqui!.dibujos.length === 1 ? "dibujo" : "dibujos"}`}
        </p>
      )}

      <div className="linea-video">
        <input className="barra-tiempo" type="range" min={0} max={duracion || 0.1} step={0.01} value={Math.min(actual, duracion)} aria-label="Momento del vídeo"
          onChange={(e) => { if (editando) terminar(); irA(Number(e.target.value)); }} disabled={!url} />
        <div className="marcas-momentos" aria-hidden="true">
          {momentos.map((m) => <span key={m.id} style={{ left: `${(m.t / (duracion || 1)) * 100}%` }} className={aqui?.id === m.id ? "activa" : ""} />)}
        </div>
        <span className="tiempo-texto">{tiempo(actual, true)} / {tiempo(duracion)}</span>
      </div>

      <div className="mandos-video">
        <button className="btn btn-icono" type="button" onClick={() => momentoAnterior ? irA(momentoAnterior.t) : irA(0)} disabled={!url} aria-label="Momento anterior">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L9 12z" /></svg>
        </button>
        <button className="btn btn-icono" type="button" onClick={() => fotograma(-1)} disabled={!url} aria-label="Fotograma anterior">−1</button>
        <button className="btn btn-peto boton-reproducir" type="button" onClick={alternar} disabled={!url} aria-label={reproduciendo ? "Pausar" : "Reproducir"}>
          {reproduciendo
            ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
            : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15L19.5 12z" /></svg>}
        </button>
        <button className="btn btn-icono" type="button" onClick={() => fotograma(1)} disabled={!url} aria-label="Fotograma siguiente">+1</button>
        <button className="btn btn-icono" type="button" onClick={() => momentoSiguiente && irA(momentoSiguiente.t)} disabled={!url || !momentoSiguiente} aria-label="Momento siguiente">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 5h2v14h-2zM4 5v14l11-7z" /></svg>
        </button>
      </div>

      {!editando && (
        <div className="opciones-video">
          <div className="barra-opciones velocidades" role="radiogroup" aria-label="Velocidad">
            {[0.25, 0.5, 1].map((x) => <button key={x} type="button" role="radio" aria-checked={velocidad === x} onClick={() => setVelocidad(x)}>{String(x).replace(".", ",")}x</button>)}
          </div>
          <label className="interruptor">
            <input type="checkbox" checked={parar} onChange={(e) => setParar(e.target.checked)} />
            <span><b>Parar en cada momento</b></span>
          </label>
        </div>
      )}

      {!editando
        ? <button className="btn btn-principal btn-grande btn-ancho" type="button" onClick={dibujarAqui} disabled={!url}>
            <Icono>{ICONOS.lapiz}</Icono> {aqui ? `Dibujar en «${aqui.nombre}»` : `Parar y dibujar aquí (${tiempo(actual)})`}
          </button>
        : (
          <div className="pizarra-barra" role="toolbar" aria-label="Herramientas de dibujo">
            <label className="campo campo-momento"><span>Nombre del momento</span>
              <input className="entrada" value={enEdicion?.nombre ?? ""} maxLength={40}
                onChange={(e) => cambiarMomentos((l) => l.map((m) => (m.id === editando ? { ...m, nombre: e.target.value } : m)))} />
            </label>
            <div className="barra-grupo barra-grupo-video">
              {HERRAMIENTAS.map((hm) => (
                <button key={hm} type="button" className="barra-boton" aria-pressed={herramienta === hm} onClick={() => { setHerramienta(hm); setTextoId(null); }} title={NOMBRES[hm]}>
                  <Icono>{ICONOS[hm]}</Icono><span>{NOMBRES[hm]}</span>
                </button>
              ))}
            </div>
            {texto && (
              <label className="campo"><span>Texto</span>
                <input className="entrada" autoFocus value={texto.texto ?? ""} maxLength={40}
                  onChange={(e) => cambiarDibujos((l) => l.map((d) => (d.id === texto.id ? { ...d, texto: e.target.value } : d)))} />
              </label>
            )}
            {herramienta === "flecha" && (
              <div className="barra-opciones" role="radiogroup" aria-label="Tipo de flecha">
                {ESTILOS_FLECHA.map((x) => <button key={x.valor} type="button" role="radio" aria-checked={estiloFlecha === x.valor} onClick={() => setEstiloFlecha(x.valor)}>{x.texto}</button>)}
              </div>
            )}
            <SelectorColorGrosor color={color} grosor={grosor} cambiarColor={setColor} cambiarGrosor={setGrosor} />
            <small className="suave">{herramienta === "texto" ? "Toca el vídeo donde quieras el texto." : "Dibuja arrastrando el dedo sobre el vídeo."}</small>
            <div className="hoja-acciones">
              <button className="btn btn-gris" type="button" onClick={() => { cambiarDibujos((l) => l.slice(0, -1)); setTextoId(null); }} disabled={!enEdicion?.dibujos.length}>Deshacer</button>
              <button className="btn btn-gris" type="button" onClick={limpiar} disabled={!enEdicion?.dibujos.length}>Borrar</button>
              <button className="btn btn-principal" type="button" onClick={terminar}>Listo</button>
            </div>
          </div>
        )}

      {!editando && (
        <section className="momentos-video">
          <h2 className="etiqueta">Momentos clave · {momentos.length}</h2>
          {momentos.length === 0
            ? <p className="suave">Para el vídeo donde quieras explicar algo y pulsa «Parar y dibujar aquí». Cada momento queda marcado en la barra.</p>
            : (
              <div className="lista">
                {momentos.map((m) => (
                  <div key={m.id} className={"fila momento-fila" + (aqui?.id === m.id ? " activa" : "")}>
                    <button type="button" className="momento-ir" onClick={() => { pausar(); irA(m.t); }}>
                      <span className="pastilla">{tiempo(m.t)}</span>
                      <span className="fila-texto"><b>{m.nombre}</b><span>{m.dibujos.length} {m.dibujos.length === 1 ? "dibujo" : "dibujos"}</span></span>
                    </button>
                    <button type="button" className="btn btn-icono" aria-label={`Borrar ${m.nombre}`} onClick={() => borrarMomento(m)}><IcoPapelera /></button>
                  </div>
                ))}
              </div>
            )}
          <div className="acciones-video">
            {aqui && <button className="btn btn-borde" type="button" onClick={() => setHoja("imagen")}>Compartir imagen de este momento</button>}
            <button className="btn btn-borde" type="button" onClick={() => { pausar(); setHoja("exportar"); }} disabled={!url}>Exportar vídeo con dibujos</button>
            <button className="btn btn-gris" type="button" onClick={borrarVideo}><IcoPapelera /> Borrar vídeo</button>
          </div>
        </section>
      )}

      {hoja === "nombre" && (
        <Hoja titulo="Nombre del vídeo" alCerrar={() => setHoja(null)}>
          <form className="formulario" onSubmit={(e) => { e.preventDefault(); if (nombre.trim()) { pendiente.current = true; guardarYa(); setHoja(null); } }}>
            <label className="campo"><span>Nombre</span><input className="entrada" autoFocus value={nombre} maxLength={60} onChange={(e) => setNombre(e.target.value)} /></label>
            <div className="hoja-acciones">
              <button className="btn btn-gris" type="button" onClick={() => { setNombre(v.nombre); setHoja(null); }}>Cancelar</button>
              <button className="btn btn-principal" type="submit" disabled={!nombre.trim()}>Guardar</button>
            </div>
          </form>
        </Hoja>
      )}
      {(hoja === "exportar" || hoja === "imagen") && url && (
        <HojaExportarAnalisis url={url} video={{ ...v, nombre: nombre || v.nombre, duracion, momentos }} momento={hoja === "imagen" ? aqui : undefined} alCerrar={() => setHoja(null)} />
      )}
    </main>
  );
}

/* ---------------- Exportar ---------------- */
function HojaExportarAnalisis({ url, video, momento, alCerrar }: { url: string; video: VideoAnalisis; momento?: MomentoVideo; alCerrar: () => void }) {
  const [solo, setSolo] = useState(video.momentos.length > 0);
  const [estado, setEstado] = useState<"opciones" | "creando" | "listo">("opciones");
  const [progreso, setProgreso] = useState(0);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vista, setVista] = useState("");
  const [error, setError] = useState("");
  const [duracion, setDuracion] = useState(0);
  const cancelado = useRef(false);
  useEffect(() => { import("../componentes/exportarAnalisis").then((m) => setDuracion(m.duracionExport(video, solo))); }, [video, solo]);
  useEffect(() => () => { cancelado.current = true; if (vista) URL.revokeObjectURL(vista); }, [vista]);

  async function crear() {
    setError(""); setEstado("creando"); setProgreso(0); cancelado.current = false;
    try {
      const m = await import("../componentes/exportarAnalisis");
      const { nombreArchivo } = await import("../componentes/exportarVideo");
      let blob: Blob, ext: string;
      if (momento) { blob = await m.imagenMomento(url, video, momento); ext = "png"; }
      else ({ blob, ext } = await m.videoAnalisis(url, video, solo, setProgreso, () => cancelado.current));
      const f = new File([blob], nombreArchivo(momento ? `${video.nombre} ${momento.nombre}` : video.nombre, ext), { type: blob.type });
      setArchivo(f); setVista(URL.createObjectURL(f)); setEstado("listo");
    } catch (e) {
      if (mensajeDe(e) === "cancelado") return;
      setError(mensajeDe(e)); setEstado("opciones");
    }
  }
  const puedeCompartir = !!archivo && typeof navigator.canShare === "function" && navigator.canShare({ files: [archivo] });
  async function compartir() {
    if (!archivo) return;
    try { await navigator.share({ files: [archivo], title: video.nombre }); }
    catch (e) { if ((e as Error)?.name !== "AbortError") setError("No se ha podido compartir. Prueba a descargarlo."); }
  }

  return (
    <Hoja titulo={momento ? "Imagen del momento" : "Exportar vídeo"} alCerrar={() => { cancelado.current = true; alCerrar(); }}>
      {estado === "opciones" && (
        <>
          {!momento && video.momentos.length > 0 && (
            <div className="campo"><span>¿Qué quieres exportar?</span>
              <div className="barra-opciones" role="radiogroup" aria-label="Qué exportar">
                <button type="button" role="radio" aria-checked={solo} onClick={() => setSolo(true)}>Solo los momentos</button>
                <button type="button" role="radio" aria-checked={!solo} onClick={() => setSolo(false)}>Todo el vídeo</button>
              </div>
            </div>
          )}
          {!momento && (
            <p className="suave">
              {solo ? "Unos segundos antes de cada momento y la pausa con los dibujos." : "El vídeo entero, parándose en cada momento con sus dibujos."}
              {" "}Tardará unos {Math.ceil(duracion)} segundos en crearse (se graba mientras se reproduce). Deja esta pantalla abierta.
            </p>
          )}
          {momento && <p className="suave">Una imagen de «{momento.nombre}» con sus dibujos, para mandarla por WhatsApp.</p>}
          {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
          <div className="hoja-acciones">
            <button className="btn btn-gris" type="button" onClick={alCerrar}>Cancelar</button>
            <button className="btn btn-principal" type="button" onClick={crear}>{momento ? "Crear imagen" : "Crear vídeo"}</button>
          </div>
        </>
      )}
      {estado === "creando" && (
        <div className="exportar-progreso" aria-live="polite">
          <p><b>{momento ? "Creando la imagen…" : "Grabando el vídeo…"}</b></p>
          {!momento && <div className="barra-progreso"><span style={{ width: `${progreso}%` }} /></div>}
          <p className="suave">{momento ? "Un momento" : `${progreso} %`}</p>
          <button className="btn btn-gris" type="button" onClick={() => { cancelado.current = true; setEstado("opciones"); }}>Cancelar</button>
        </div>
      )}
      {estado === "listo" && archivo && (
        <>
          {momento ? <img className="exportar-vista" src={vista} alt={`Imagen de ${momento.nombre}`} /> : <video className="exportar-vista" src={vista} controls playsInline muted autoPlay loop />}
          <p className="suave">{archivo.name} · {MB(archivo.size)}</p>
          {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
          <div className="hoja-acciones">
            <a className="btn btn-gris" href={vista} download={archivo.name}>Descargar</a>
            {puedeCompartir
              ? <button className="btn btn-principal" type="button" onClick={compartir}>Compartir</button>
              : <button className="btn btn-principal" type="button" onClick={alCerrar}>Listo</button>}
          </div>
        </>
      )}
    </Hoja>
  );
}
