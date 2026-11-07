// Vista previa de la hoja de alineación antes de descargarla en PDF o compartirla como imagen.
import { useEffect, useRef, useState } from "react";
import { Hoja, mensajeDe, useUi } from "../componentes/ui";
import { IcoCompartir, IcoDescargar } from "../componentes/Iconos";
import { cargarFuentes, compartirImagen, descargarPdf, dibujarHoja, nombreArchivo, type DatosHoja } from "../pdf/hojaAlineacion";

export default function HojaVestuario({ datos, notas, cambiarNotas, alCerrar }: {
  datos: Omit<DatosHoja, "notas">; notas: string; cambiarNotas: (t: string) => void; alCerrar: () => void;
}) {
  const lienzo = useRef<HTMLCanvasElement>(document.createElement("canvas"));
  const [imagen, setImagen] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<"pdf" | "imagen" | null>(null);
  const { avisar } = useUi();
  const completos = { ...datos, notas };

  // Se vuelve a dibujar al cambiar las notas (con un pequeño respiro mientras se escribe)
  useEffect(() => {
    let vivo = true;
    const t = setTimeout(async () => {
      await cargarFuentes();
      if (!vivo) return;
      dibujarHoja(lienzo.current, completos);
      setImagen(lienzo.current.toDataURL("image/png"));
    }, imagen ? 300 : 0);
    return () => { vivo = false; clearTimeout(t); };
  }, [notas, JSON.stringify(datos)]); // eslint-disable-line react-hooks/exhaustive-deps

  async function pdf() {
    setOcupado("pdf");
    try { await descargarPdf(lienzo.current, nombreArchivo(completos, "pdf")); avisar("PDF descargado"); }
    catch (e) { avisar(mensajeDe(e)); }
    finally { setOcupado(null); }
  }
  async function compartir() {
    setOcupado("imagen");
    try {
      const r = await compartirImagen(lienzo.current, nombreArchivo(completos, "png"), `Alineación contra ${datos.rival}`);
      if (r === "descargada") avisar("Imagen descargada");
    } catch (e) { avisar(mensajeDe(e)); }
    finally { setOcupado(null); }
  }

  return (
    <Hoja titulo="Hoja para el vestuario" alCerrar={alCerrar}>
      <label className="campo">
        <span>Nota en la hoja <small className="suave">(opcional)</small></span>
        <input className="entrada" value={notas} onChange={(e) => cambiarNotas(e.target.value)} maxLength={140}
          placeholder="Por ejemplo: Hora de llegada 10:00 · Equipación blanca" />
      </label>
      <div className="vista-hoja">
        {imagen ? <img src={imagen} alt={`Vista previa de la hoja de alineación contra ${datos.rival}`} /> : <div className="vista-hoja-cargando">Preparando la hoja…</div>}
      </div>
      {datos.titulares.every((t) => !t) && <p className="mensaje mensaje-aviso">Aún no hay titulares en el campo.</p>}
      <div className="hoja-acciones">
        <button className="btn btn-borde" type="button" onClick={compartir} disabled={!imagen || !!ocupado}><IcoCompartir /> {ocupado === "imagen" ? "Un momento…" : "Compartir imagen"}</button>
        <button className="btn btn-principal" type="button" onClick={pdf} disabled={!imagen || !!ocupado}><IcoDescargar /> {ocupado === "pdf" ? "Creando…" : "Descargar PDF"}</button>
      </div>
    </Hoja>
  );
}
