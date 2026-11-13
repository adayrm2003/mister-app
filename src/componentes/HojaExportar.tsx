// Ventana para exportar una pizarra: vídeo de la jugada animada o imagen de la pizarra.
// Al terminar se puede compartir (en el móvil abre WhatsApp, etc.) o descargar.
import { useEffect, useRef, useState } from "react";
import type { Pizarra } from "../datos/pizarra";
import { Hoja, mensajeDe } from "./ui";

export default function HojaExportar({ pizarra, titulo, colorEquipo, colorRival, video, alCerrar }: {
  pizarra: Pizarra; titulo: string; colorEquipo: string; colorRival: string; video: boolean; alCerrar: () => void;
}) {
  const [sinNombres, setSinNombres] = useState(false);
  const [estelas, setEstelas] = useState(false);
  const [velocidad, setVelocidad] = useState(1);
  const [estado, setEstado] = useState<"opciones" | "creando" | "listo">("opciones");
  const [progreso, setProgreso] = useState(0);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const cancelado = useRef(false);
  const tieneNombres = pizarra.piezas.some((p) => p.tipo === "jugador" || p.tipo === "rival");

  useEffect(() => () => { cancelado.current = true; if (url) URL.revokeObjectURL(url); }, [url]);

  async function crear() {
    setError(""); setEstado("creando"); setProgreso(0); cancelado.current = false;
    try {
      const m = await import("./exportarVideo");
      const o = { titulo, colorEquipo, colorRival, sinNombres, estelas, velocidad };
      let blob: Blob, ext: string;
      if (video) ({ blob, ext } = await m.crearVideo(pizarra, o, setProgreso, () => cancelado.current));
      else { blob = await m.crearImagen(pizarra, o); ext = "png"; }
      const f = new File([blob], m.nombreArchivo(titulo, ext), { type: blob.type });
      setArchivo(f); setUrl(URL.createObjectURL(f)); setEstado("listo");
    } catch (e) {
      if (mensajeDe(e) === "cancelado") return;
      setError(mensajeDe(e)); setEstado("opciones");
    }
  }
  const puedeCompartir = !!archivo && typeof navigator.canShare === "function" && navigator.canShare({ files: [archivo] });
  async function compartir() {
    if (!archivo) return;
    try { await navigator.share({ files: [archivo], title: titulo }); }
    catch (e) { if ((e as Error)?.name !== "AbortError") setError("No se ha podido compartir. Prueba a descargarlo."); }
  }
  const duracion = video ? pizarra.pasos.reduce((s, ps, i) => (i ? s + (ps.duracion ?? 1.3) : s), 0) / velocidad + 2 : 0;

  return (
    <Hoja titulo={video ? "Exportar vídeo" : "Compartir imagen"} alCerrar={() => { cancelado.current = true; alCerrar(); }}>
      {estado === "opciones" && (
        <>
          {tieneNombres && (
            <label className="interruptor">
              <input id="exportar-nombres" type="checkbox" checked={!sinNombres} onChange={(e) => setSinNombres(!e.target.checked)} />
              <span><b>Mostrar nombres y dorsales</b><small className="suave">Si lo quitas, las fichas salen solo con su color.</small></span>
            </label>
          )}
          {video && pizarra.pasos.length > 1 && (
            <>
              <label className="interruptor">
                <input id="exportar-estelas" type="checkbox" checked={estelas} onChange={(e) => setEstelas(e.target.checked)} />
                <span><b>Mostrar estelas</b><small className="suave">El recorrido de cada jugador y del balón.</small></span>
              </label>
              <div className="campo"><span>Velocidad</span>
                <div className="barra-opciones" role="radiogroup" aria-label="Velocidad del vídeo">
                  {[0.5, 1, 2].map((v) => <button key={v} type="button" role="radio" aria-checked={velocidad === v} onClick={() => setVelocidad(v)}>{String(v).replace(".", ",")}x</button>)}
                </div>
              </div>
              <p className="suave">Tardará unos {Math.ceil(duracion)} segundos en crearse: se graba mientras se reproduce. Deja esta pantalla abierta.</p>
            </>
          )}
          {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
          <div className="hoja-acciones">
            <button className="btn btn-gris cerrar-hoja" type="button" onClick={alCerrar}>Cancelar</button>
            <button className="btn btn-principal" type="button" onClick={crear}>{video ? "Crear vídeo" : "Crear imagen"}</button>
          </div>
        </>
      )}

      {estado === "creando" && (
        <div className="exportar-progreso" aria-live="polite">
          <p><b>{video ? "Grabando la jugada…" : "Creando la imagen…"}</b></p>
          {video && <div className="barra-progreso"><span style={{ width: `${progreso}%` }} /></div>}
          <p className="suave">{video ? `${progreso} %` : "Un momento"}</p>
          <button className="btn btn-gris" type="button" onClick={() => { cancelado.current = true; setEstado("opciones"); }}>Cancelar</button>
        </div>
      )}

      {estado === "listo" && archivo && (
        <>
          {video
            ? <video className="exportar-vista" src={url} controls playsInline muted autoPlay loop />
            : <img className="exportar-vista" src={url} alt={`Pizarra «${titulo}»`} />}
          <p className="suave">{archivo.name} · {(archivo.size / 1024 / 1024).toFixed(1).replace(".", ",")} MB{archivo.name.endsWith(".webm") ? " · Formato WebM: si WhatsApp no lo acepta, ábrelo en el iPhone o en Chrome actualizado y vuelve a crearlo." : ""}</p>
          {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
          <div className="hoja-acciones">
            <a className="btn btn-gris" href={url} download={archivo.name}>Descargar</a>
            {puedeCompartir
              ? <button className="btn btn-principal" type="button" onClick={compartir}>Compartir</button>
              : <button className="btn btn-principal cerrar-hoja" type="button" onClick={alCerrar}>Listo</button>}
          </div>
        </>
      )}
    </Hoja>
  );
}
