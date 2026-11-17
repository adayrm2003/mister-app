// Convocatoria: la lista de la plantilla de arriba abajo; el entrenador toca a los convocados
// y se prepara el mensaje para mandarlo por WhatsApp tal cual.
import { useMemo, useState } from "react";
import { useEquipo } from "../ContextoEquipo";
import { Hoja, useUi } from "../componentes/ui";
import { IcoCheck } from "../componentes/Iconos";
import { PUESTOS, type Jugador, type Partido } from "../datos/modelo";
import "./convocatoria.css";

const ordenPuesto = (j: Jugador) => PUESTOS.findIndex((p) => p.valor === j.posicion);
export const ordenarPlantilla = (js: Jugador[], fijos: boolean) =>
  [...js].sort((a, b) => ordenPuesto(a) - ordenPuesto(b) || (fijos ? (a.dorsal ?? 999) - (b.dorsal ?? 999) : 0) || a.nombre.localeCompare(b.nombre, "es"));

/** Convocados de partida: los guardados o, si no hay, los de la alineación. */
export function convocadosIniciales(p: Partido): string[] {
  if (p.convocados) return p.convocados;
  const al = p.alineacion;
  return al ? [...al.titulares.filter((x): x is string => !!x), ...al.suplentes] : [];
}

const fechaMensaje = (f: string) => {
  const t = new Date(f + "T12:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  return t[0].toUpperCase() + t.slice(1);
};

export function textoConvocatoria(p: Partido, equipo: string, lista: Jugador[], fijos: boolean) {
  const lineas = [
    `*CONVOCATORIA · ${equipo.toUpperCase()}*`,
    `⚽ vs ${p.rival}${p.competicion ? ` · ${p.competicion}` : ""}`,
    `📅 ${fechaMensaje(p.fecha)}${p.hora ? ` · ${p.hora}` : ""}`,
    `${p.casa ? "🏠 En casa" : "✈️ Fuera"}${p.campo ? ` · ${p.campo}` : ""}`
  ];
  if (p.quedada?.trim()) lineas.push(`🕘 Quedamos: ${p.quedada.trim()}`);
  lineas.push("", `*Convocados (${lista.length}):*`);
  lista.forEach((j, i) => lineas.push(`${i + 1}. ${j.nombre}${fijos && j.dorsal != null ? ` (${j.dorsal})` : ""}`));
  return lineas.join("\n");
}

export function HojaConvocatoria({ partido, jugadores, guardarPartido, alCerrar }: {
  partido: Partido; jugadores: Jugador[]; guardarPartido: (p: Partido) => Promise<void>; alCerrar: () => void;
}) {
  const { equipo, ajustes } = useEquipo();
  const { avisar } = useUi();
  const fijos = ajustes.dorsales === "fijos";
  const [elegidos, setElegidos] = useState<Set<string>>(() => new Set(convocadosIniciales(partido)));
  const [quedada, setQuedada] = useState(partido.quedada ?? "");
  const [paso, setPaso] = useState<"lista" | "mensaje">("lista");
  const plantilla = useMemo(() => ordenarPlantilla(jugadores, fijos), [jugadores, fijos]);
  const lista = plantilla.filter((j) => elegidos.has(j.id));
  const texto = textoConvocatoria({ ...partido, quedada }, equipo.nombre, lista, fijos);

  const guardar = (s: Set<string>, q = quedada) => guardarPartido({ ...partido, convocados: plantilla.filter((j) => s.has(j.id)).map((j) => j.id), quedada: q });
  const alternar = (id: string) => {
    const s = new Set(elegidos);
    if (s.has(id)) s.delete(id); else s.add(id);
    setElegidos(s);
    guardar(s);
  };
  const todos = (si: boolean) => { const s = new Set(si ? plantilla.map((j) => j.id) : []); setElegidos(s); guardar(s); };

  async function copiar() {
    try { await navigator.clipboard.writeText(texto); avisar("Mensaje copiado"); }
    catch { avisar("No se ha podido copiar. Mantén pulsado el texto para copiarlo."); }
  }

  return (
    <Hoja titulo={paso === "lista" ? "Convocatoria" : "Mensaje para WhatsApp"} alCerrar={alCerrar}>
      {paso === "lista" ? (
        <div className="convocatoria">
          <div className="convocatoria-cabeza">
            <span className="pastilla pastilla-ok">{elegidos.size} convocados</span>
            <span className="convocatoria-rapido">
              <button className="btn btn-texto" type="button" onClick={() => todos(true)}>Todos</button>
              <button className="btn btn-texto" type="button" onClick={() => todos(false)}>Ninguno</button>
            </span>
          </div>
          <p className="suave">Toca a cada jugador para convocarlo o quitarlo.</p>
          {plantilla.length === 0 && <p className="mensaje mensaje-aviso">Aún no hay jugadores en la plantilla.</p>}
          <ul className="lista-convocatoria">
            {plantilla.map((j) => {
              const si = elegidos.has(j.id);
              return (
                <li key={j.id}>
                  <button type="button" className={"fila-convocar" + (si ? " si" : "")} aria-pressed={si} onClick={() => alternar(j.id)}>
                    <span className="marca-convocar" aria-hidden="true">{si && <IcoCheck />}</span>
                    <span className="nombre">{j.nombre}</span>
                    <span className="pastilla">{fijos && j.dorsal != null ? `${j.dorsal} · ` : ""}{PUESTOS.find((p) => p.valor === j.posicion)?.corto}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <label className="campo"><span>Quedada <small className="suave">(opcional)</small></span>
            <input className="entrada" value={quedada} maxLength={80} placeholder="Ej.: 9:15 en la puerta del campo"
              onChange={(e) => setQuedada(e.target.value)} onBlur={() => guardar(elegidos)} />
          </label>
          <div className="hoja-acciones">
            <button className="btn btn-gris" type="button" onClick={alCerrar}>Cerrar</button>
            <button className="btn btn-principal" type="button" disabled={elegidos.size === 0} onClick={() => { guardar(elegidos); setPaso("mensaje"); }}>Ver mensaje</button>
          </div>
        </div>
      ) : (
        <div className="convocatoria">
          <pre className="mensaje-whatsapp">{texto.replace(/\*/g, "")}</pre>
          <a className="btn btn-peto btn-grande btn-ancho boton-whatsapp" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z" /></svg>
            Enviar por WhatsApp
          </a>
          <div className="hoja-acciones">
            <button className="btn btn-gris" type="button" onClick={() => setPaso("lista")}>Volver a la lista</button>
            <button className="btn btn-borde" type="button" onClick={copiar}>Copiar texto</button>
          </div>
        </div>
      )}
    </Hoja>
  );
}
