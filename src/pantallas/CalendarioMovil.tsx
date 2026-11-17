// Ver los partidos y entrenamientos en el calendario del móvil (iPhone, Google Calendar…).
// Se suscribe a un enlace privado del equipo: el móvil lo consulta solo y se actualiza sin hacer nada.
import { useState } from "react";
import { useEquipo } from "../ContextoEquipo";
import { api } from "../datos/api";
import { Hoja, mensajeDe, useUi } from "../componentes/ui";

export default function BotonCalendarioMovil() {
  const { equipo } = useEquipo();
  const { avisar, confirmar } = useUi();
  const [abierta, setAbierta] = useState(false);
  const [enlace, setEnlace] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function abrir() {
    setAbierta(true);
    if (enlace) return;
    try { setEnlace(await api.enlaceCalendario(equipo.id)); } catch (e) { avisar(mensajeDe(e)); setAbierta(false); }
  }
  async function cambiar() {
    if (!(await confirmar({ titulo: "¿Cambiar el enlace del calendario?", texto: "El enlace de ahora dejará de funcionar en todos los móviles donde se añadió. Tendréis que volver a añadirlo.", boton: "Cambiar", peligro: false }))) return;
    setOcupado(true);
    try { setEnlace(await api.enlaceCalendario(equipo.id, true)); avisar("Enlace cambiado"); } catch (e) { avisar(mensajeDe(e)); }
    finally { setOcupado(false); }
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(enlace); avisar("Enlace copiado"); } catch { avisar("No se ha podido copiar"); }
  }
  const webcal = enlace.replace(/^https?:/, "webcal:");

  return (
    <>
      <button className="btn btn-borde btn-ancho" type="button" onClick={abrir}>📲 Ver en el calendario del móvil</button>
      {abierta && (
        <Hoja titulo="Calendario del móvil" alCerrar={() => setAbierta(false)}>
          <div className="calendario-movil">
            <p>Los partidos y entrenamientos de <b>{equipo.nombre}</b> saldrán en el calendario de tu móvil y se actualizarán solos cuando cambies algo aquí (el móvil lo revisa cada cierto tiempo).</p>
            {!enlace ? <p className="suave">Preparando el enlace…</p> : (
              <>
                <a className="btn btn-peto btn-grande btn-ancho" href={webcal}>iPhone o Mac (Calendario)</a>
                <a className="btn btn-principal btn-ancho" href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noopener noreferrer">Google Calendar (Android)</a>
                <button className="btn btn-gris btn-ancho" type="button" onClick={copiar}>Copiar el enlace</button>
                <p className="suave">Solo lleva fechas, horas, rivales y lugares; nada de los jugadores. Es privado: compártelo solo con quien quieras (por ejemplo, tu segundo entrenador).</p>
                <button className="btn btn-texto" type="button" disabled={ocupado} onClick={cambiar}>Cambiar el enlace (anula el anterior)</button>
              </>
            )}
          </div>
        </Hoja>
      )}
    </>
  );
}
