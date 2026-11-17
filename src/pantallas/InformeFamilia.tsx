// Informe para la familia de un jugador: el entrenador escribe el comentario en el momento,
// se crea el PDF y se comparte o se descarga. No se guarda el comentario ni lleva las valoraciones.
import { useState } from "react";
import { useEquipo } from "../ContextoEquipo";
import { Hoja, mensajeDe, useUi } from "../componentes/ui";
import BotonDictado, { juntar } from "../componentes/Dictado";
import type { PartidoJugador } from "../datos/estadisticas";
import { crearInformePdf } from "../pdf/informeJugador";

const CLAVE_FIRMA = "mister-firma-informe";

export default function HojaInformeFamilia({ jugador, dorsal, posicion, periodo, cifras, partidos, alCerrar }: {
  jugador: string; dorsal: number | null; posicion: string; periodo: string; cifras: [string, string][]; partidos: PartidoJugador[]; alCerrar: () => void;
}) {
  const { equipo } = useEquipo();
  const { avisar } = useUi();
  const [comentario, setComentario] = useState("");
  const [firma, setFirma] = useState(() => { try { return localStorage.getItem(CLAVE_FIRMA) ?? ""; } catch { return ""; } });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function crear() {
    setOcupado(true);
    try {
      try { localStorage.setItem(CLAVE_FIRMA, firma.trim()); } catch { /* nada */ }
      const blob = await crearInformePdf({ jugador, dorsal, posicion, equipo: equipo.nombre, club: equipo.club, escudo: equipo.escudo, periodo, cifras, partidos, comentario, entrenador: firma.trim() });
      const nombre = `informe-${jugador.normalize("NFD").replace(/[^\w]+/g, "-").toLowerCase()}.pdf`;
      const f = new File([blob], nombre, { type: "application/pdf" });
      if (url) URL.revokeObjectURL(url);
      setArchivo(f); setUrl(URL.createObjectURL(f));
    } catch (e) { avisar(mensajeDe(e)); }
    finally { setOcupado(false); }
  }
  const puedeCompartir = !!archivo && typeof navigator.canShare === "function" && navigator.canShare({ files: [archivo] });
  async function compartir() {
    if (!archivo) return;
    try { await navigator.share({ files: [archivo], title: `Informe de ${jugador}` }); }
    catch (e) { if ((e as Error).name !== "AbortError") avisar("No se ha podido compartir. Descárgalo y envíalo."); }
  }

  return (
    <Hoja titulo={`Informe de ${jugador}`} alCerrar={() => { if (url) URL.revokeObjectURL(url); alCerrar(); }}>
      <div className="informe-familia">
        <p className="suave">Para la familia: {periodo}. Lleva sus partidos, minutos, goles, asistencias y su asistencia a partidos y entrenamientos. <b>No lleva tus valoraciones.</b></p>
        <ul className="informe-cifras">
          {cifras.map(([k, v]) => <li key={k}><b>{v}</b><span>{k}</span></li>)}
        </ul>
        <label className="campo"><span>Tu comentario</span>
          <textarea className="entrada area" rows={5} maxLength={1500} value={comentario} onChange={(e) => { setComentario(e.target.value); setArchivo(null); }}
            placeholder="Cómo ha ido, en qué ha mejorado y qué puede seguir trabajando…" />
        </label>
        <BotonDictado alTexto={(t) => { setComentario((x) => juntar(x, t)); setArchivo(null); }} etiqueta="Dictar el comentario" />
        <label className="campo"><span>Firma <small className="suave">(opcional)</small></span>
          <input className="entrada" value={firma} maxLength={40} onChange={(e) => { setFirma(e.target.value); setArchivo(null); }} placeholder="Ej.: Míster Dani" />
        </label>
        <p className="suave">El comentario no se guarda en la app: se pone en el informe al crearlo.</p>
        {!archivo ? (
          <button className="btn btn-peto btn-grande btn-ancho" type="button" disabled={ocupado} onClick={crear}>{ocupado ? "Creando…" : "Crear informe (PDF)"}</button>
        ) : (
          <div className="hoja-acciones">
            <a className="btn btn-gris" href={url} download={archivo.name}>Descargar</a>
            {puedeCompartir
              ? <button className="btn btn-peto" type="button" onClick={compartir}>Compartir</button>
              : <a className="btn btn-principal" href={url} target="_blank" rel="noopener noreferrer">Abrir</a>}
          </div>
        )}
      </div>
    </Hoja>
  );
}
