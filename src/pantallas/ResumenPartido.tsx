// Resumen del partido para compartir: un texto (para cualquier app: WhatsApp, Telegram, correo…)
// o una imagen con el escudo y el resultado. Solo resultado, goles y asistencias: nada privado.
import { useEffect, useMemo, useRef, useState } from "react";
import { useEquipo } from "../ContextoEquipo";
import { Hoja, mensajeDe, useUi } from "../componentes/ui";
import BotonDictado, { juntar } from "../componentes/Dictado";
import type { Jugador, Partido } from "../datos/modelo";
import { accionesDe, resultado } from "../datos/partido";
import { cargarFuentes, compartirImagen } from "../pdf/hojaAlineacion";
import "./convocatoria.css";
import "./resumen-partido.css";

const DISPLAY = '"Big Shoulders Display", "Arial Narrow", sans-serif';
const TEXTO = 'Barlow, "Segoe UI", Arial, sans-serif';

const fechaTexto = (f: string) => {
  const t = new Date(f + "T12:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  return t[0].toUpperCase() + t.slice(1);
};

interface Linea { minuto: number; texto: string; nuestro: boolean }

function lineasGoles(p: Partido, nombre: (id?: string) => string, conMinutos: boolean): Linea[] {
  return accionesDe(p).filter((a) => a.tipo === "gol" || a.tipo === "golRival").map((a) => ({
    minuto: a.minuto,
    nuestro: a.tipo === "gol",
    texto: a.tipo === "gol"
      ? `${conMinutos ? `${a.minuto}′ ` : ""}${nombre(a.jugadorId)}${a.asistenteId ? ` (asist. ${nombre(a.asistenteId)})` : ""}`
      : `${conMinutos ? `${a.minuto}′ ` : ""}Gol de ${p.rival}`
  }));
}

export function textoResumen(p: Partido, equipo: string, nombre: (id?: string) => string, comentario: string, conMinutos: boolean) {
  const r = resultado(p);
  const [l, v] = p.casa ? [[equipo, r.nuestros], [p.rival, r.suyos]] : [[p.rival, r.suyos], [equipo, r.nuestros]];
  const lineas = [
    `*${l[0]} ${l[1]} – ${v[1]} ${v[0]}*`,
    `${p.casa ? "🏠" : "✈️"} ${p.competicion} · ${fechaTexto(p.fecha)}${p.campo ? ` · ${p.campo}` : ""}`
  ];
  const goles = lineasGoles(p, nombre, conMinutos);
  if (goles.length) { lineas.push("", "⚽ *Goles*"); goles.forEach((g) => lineas.push(`${g.nuestro ? "•" : "◦"} ${g.texto}`)); }
  if (comentario.trim()) lineas.push("", comentario.trim());
  return lineas.join("\n");
}

async function cargarImagen(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

/** Imagen 1080 × 1350 (vertical, como una historia) con el escudo, el marcador y los goles. */
async function dibujarImagen(lienzo: HTMLCanvasElement, p: Partido, equipo: string, club: string | undefined, escudo: string | null | undefined,
  nombre: (id?: string) => string, comentario: string, conMinutos: boolean, colorEquipo: string) {
  await cargarFuentes();
  const W = 1080, H = 1350, M = 72;
  // Se dibuja en un lienzo alto y al final se recorta a lo que ocupe (cuadrada si hay poco)
  const borrador = document.createElement("canvas");
  borrador.width = W; borrador.height = H;
  const ctx = borrador.getContext("2d")!;
  const r = resultado(p);
  // Fondo verde césped con franjas
  ctx.fillStyle = "#0F4D33"; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? "rgba(255,255,255,.035)" : "rgba(0,0,0,.05)"; ctx.fillRect(0, (H / 10) * i, W, H / 10); }
  ctx.fillStyle = colorEquipo; ctx.fillRect(0, 0, W, 14);
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#fff";
  let y = M + 10;
  if (escudo) {
    try { const img = await cargarImagen(escudo); const t = 170, k = Math.min(t / img.width, t / img.height); ctx.drawImage(img, W / 2 - (img.width * k) / 2, y, img.width * k, img.height * k); y += t + 40; }
    catch { /* sin escudo */ }
  }
  ctx.font = `700 34px ${TEXTO}`; ctx.fillStyle = "rgba(255,255,255,.8)";
  ctx.fillText(`${p.competicion.toUpperCase()} · ${fechaTexto(p.fecha).toUpperCase()}`, W / 2, y + 10); y += 70;
  const [izq, der] = p.casa ? [[equipo, r.nuestros], [p.rival, r.suyos]] as const : [[p.rival, r.suyos], [equipo, r.nuestros]] as const;
  const nombreEq = (t: string, x: number) => {
    let tam = 54; ctx.font = `800 ${tam}px ${DISPLAY}`;
    while (ctx.measureText(t.toUpperCase()).width > 400 && tam > 30) { tam -= 2; ctx.font = `800 ${tam}px ${DISPLAY}`; }
    ctx.fillStyle = "#fff"; ctx.fillText(t.toUpperCase(), x, y);
  };
  nombreEq(izq[0], W * 0.27); nombreEq(der[0], W * 0.73); y += 230;
  ctx.font = `900 250px ${DISPLAY}`; ctx.fillStyle = "#fff";
  ctx.fillText(String(izq[1]), W * 0.27, y); ctx.fillText(String(der[1]), W * 0.73, y);
  ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.font = `800 120px ${DISPLAY}`; ctx.fillText("–", W / 2, y - 70);
  y += 50;
  const etiqueta = r.signo === "victoria" ? "VICTORIA" : r.signo === "derrota" ? "DERROTA" : "EMPATE";
  ctx.font = `800 40px ${DISPLAY}`;
  const anchoEt = ctx.measureText(etiqueta).width + 56;
  ctx.fillStyle = r.signo === "victoria" ? "#FF6B1A" : "rgba(255,255,255,.18)";
  ctx.beginPath(); ctx.roundRect(W / 2 - anchoEt / 2, y, anchoEt, 64, 32); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.fillText(etiqueta, W / 2, y + 46); y += 120;
  // Goles
  ctx.textAlign = "left";
  const goles = lineasGoles(p, nombre, conMinutos).filter((g) => g.nuestro);
  if (goles.length) {
    ctx.font = `800 40px ${DISPLAY}`; ctx.fillStyle = "#4CC88E"; ctx.fillText("GOLES", M, y); y += 56;
    ctx.font = `600 38px ${TEXTO}`; ctx.fillStyle = "#fff";
    for (const g of goles.slice(0, 7)) { ctx.fillText(`⚽  ${g.texto}`, M, y); y += 54; }
    if (goles.length > 7) { ctx.fillText(`y ${goles.length - 7} más`, M, y); y += 54; }
    y += 10;
  }
  // Comentario (las líneas que quepan)
  if (comentario.trim() && y < H - 160) {
    ctx.font = `500 34px ${TEXTO}`; ctx.fillStyle = "rgba(255,255,255,.9)";
    const palabras = comentario.trim().split(/\s+/); let linea = "";
    for (const w of palabras) {
      const prueba = linea ? `${linea} ${w}` : w;
      if (ctx.measureText(prueba).width > W - M * 2) { ctx.fillText(linea, M, y); y += 46; linea = w; if (y > H - 130) { linea = "…"; break; } }
      else linea = prueba;
    }
    if (linea) ctx.fillText(linea, M, y);
  }
  const alto = Math.round(Math.max(1080, Math.min(H, y + 150)));
  lienzo.width = W; lienzo.height = alto;
  const final = lienzo.getContext("2d")!;
  final.drawImage(borrador, 0, 0);
  final.textAlign = "center"; final.font = `700 28px ${TEXTO}`; final.fillStyle = "rgba(255,255,255,.55)";
  final.fillText(`${club ? club + " · " : ""}${equipo}`, W / 2, alto - 56);
}

export default function HojaResumen({ partido, jugadores, alCerrar }: { partido: Partido; jugadores: Jugador[]; alCerrar: () => void }) {
  const { equipo, ajustes } = useEquipo();
  const { avisar } = useUi();
  const clave = `mister-resumen-${partido.id}`;
  const [comentario, setComentario] = useState(() => { try { return sessionStorage.getItem(clave) ?? ""; } catch { return ""; } });
  const [conMinutos, setConMinutos] = useState(true);
  const [imagen, setImagen] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const lienzo = useRef(document.createElement("canvas"));
  const porId = useMemo(() => new Map(jugadores.map((j) => [j.id, j])), [jugadores]);
  const nombre = (id?: string) => (id ? porId.get(id)?.nombre ?? "—" : "—");
  const texto = textoResumen(partido, equipo.nombre, nombre, comentario, conMinutos);
  useEffect(() => { try { sessionStorage.setItem(clave, comentario); } catch { /* nada */ } }, [comentario, clave]);

  async function compartirTexto() {
    if (navigator.share) {
      try { await navigator.share({ text: texto }); return; } catch (e) { if ((e as Error).name === "AbortError") return; }
    }
    await copiar();
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(texto); avisar("Resumen copiado: pégalo donde quieras"); }
    catch { avisar("No se ha podido copiar. Mantén pulsado el texto para copiarlo."); }
  }
  async function crearImagen() {
    setOcupado(true);
    try {
      await dibujarImagen(lienzo.current, partido, equipo.nombre, equipo.club, equipo.escudo, nombre, comentario, conMinutos, ajustes.colorEquipo);
      setImagen(lienzo.current.toDataURL("image/png"));
    } catch (e) { avisar(mensajeDe(e)); }
    finally { setOcupado(false); }
  }
  async function compartirLaImagen() {
    const nombreArchivo = `resumen-${partido.rival.normalize("NFD").replace(/[^\w]+/g, "-").toLowerCase()}-${partido.fecha}.png`;
    const r = await compartirImagen(lienzo.current, nombreArchivo, `vs ${partido.rival}`);
    if (r === "descargada") avisar("Imagen descargada");
  }

  return (
    <Hoja titulo="Resumen del partido" alCerrar={alCerrar}>
      <div className="resumen-partido">
        <label className="campo"><span>Comentario <small className="suave">(opcional)</small></span>
          <textarea className="entrada area" rows={3} maxLength={600} value={comentario} onChange={(e) => { setComentario(e.target.value); setImagen(""); }}
            placeholder="Ej.: Gran partido de todo el equipo. El sábado, a seguir así." />
        </label>
        <BotonDictado alTexto={(t) => { setComentario((x) => juntar(x, t)); setImagen(""); }} etiqueta="Dictar el comentario" />
        <label className="interruptor">
          <input type="checkbox" checked={conMinutos} onChange={(e) => { setConMinutos(e.target.checked); setImagen(""); }} />
          <span><b>Poner el minuto de cada gol</b></span>
        </label>

        {imagen ? <img className="resumen-imagen" src={imagen} alt="Imagen del resumen del partido" /> : <pre className="mensaje-whatsapp">{texto.replace(/\*/g, "")}</pre>}

        {!imagen ? (
          <>
            <button className="btn btn-peto btn-grande btn-ancho" type="button" onClick={compartirTexto}>Compartir texto</button>
            <div className="hoja-acciones">
              <button className="btn btn-gris" type="button" onClick={copiar}>Copiar</button>
              <button className="btn btn-borde" type="button" disabled={ocupado} onClick={crearImagen}>{ocupado ? "Creando…" : "Crear imagen"}</button>
            </div>
          </>
        ) : (
          <>
            <button className="btn btn-peto btn-grande btn-ancho" type="button" onClick={compartirLaImagen}>Compartir imagen</button>
            <div className="hoja-acciones">
              <button className="btn btn-gris" type="button" onClick={() => setImagen("")}>Volver al texto</button>
              <button className="btn btn-borde" type="button" onClick={alCerrar}>Listo</button>
            </div>
          </>
        )}
        <p className="suave">Solo lleva el resultado, los goles y tu comentario. Lo puedes mandar por WhatsApp, Telegram, correo o donde quieras.</p>
      </div>
    </Hoja>
  );
}
