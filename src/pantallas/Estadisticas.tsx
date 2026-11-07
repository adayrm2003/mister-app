import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { useColeccion, useEquipo } from "../ContextoEquipo";
import { IcoPartidos } from "../componentes/Iconos";
import type { Evento } from "../datos/calendario";
import { estadisticas, partidoJugado, type FilaJugador } from "../datos/estadisticas";
import { tiempoDePartido, type Jugador, type Partido } from "../datos/modelo";
import { hoyISO } from "./Partidos";
import "./estadisticas.css";

/** Interruptor de la pestaña Partidos: lista de partidos o estadísticas. */
export function SelectorPartidos() {
  return (
    <nav className="segmentos-dir selector-biblioteca" aria-label="Partidos">
      <NavLink to="/partidos" end className={({ isActive }) => (isActive ? "activo" : "")}>Partidos</NavLink>
      <NavLink to="/estadisticas" end className={({ isActive }) => (isActive ? "activo" : "")}>Estadísticas</NavLink>
    </nav>
  );
}

type Columna = { clave: keyof FilaJugador; corto: string; largo: string };
const COLUMNAS: Columna[] = [
  { clave: "jugados", corto: "PJ", largo: "Partidos jugados" },
  { clave: "titular", corto: "Tit", largo: "Titularidades" },
  { clave: "minutos", corto: "Min", largo: "Minutos totales" },
  { clave: "goles", corto: "Gol", largo: "Goles" },
  { clave: "asistencias", corto: "Asis", largo: "Asistencias" },
  { clave: "amarillas", corto: "TA", largo: "Tarjetas amarillas" },
  { clave: "rojas", corto: "TR", largo: "Tarjetas rojas" },
  { clave: "asistencia", corto: "Entr.", largo: "Asistencia a entrenamientos (%)" }
];

export default function Estadisticas() {
  const { equipo, ajustes } = useEquipo();
  const { filas: jugadores, cargando } = useColeccion<Jugador>("jugadores");
  const { filas: partidos } = useColeccion<Partido>("partidos");
  const { filas: eventos } = useColeccion<Evento>("eventos");
  const [competicion, setCompeticion] = useState("todas");
  const [orden, setOrden] = useState<keyof FilaJugador>("minutos");
  const hoy = hoyISO();
  const { partes, minutos } = tiempoDePartido(ajustes);

  const competiciones = useMemo(() => [...new Set(partidos.filter((p) => partidoJugado(p, hoy)).map((p) => p.competicion))].sort(), [partidos, hoy]);
  const filtrados = competicion === "todas" ? partidos : partidos.filter((p) => p.competicion === competicion);
  const datos = useMemo(() => estadisticas(jugadores, filtrados, eventos, partes * minutos, hoy), [jugadores, filtrados, eventos, partes, minutos, hoy]);
  const { equipo: e } = datos;

  const ordenadas = [...datos.filas].sort((a, b) => {
    const va = a[orden], vb = b[orden];
    const na = typeof va === "number" ? va : va == null ? -1 : 0, nb = typeof vb === "number" ? vb : vb == null ? -1 : 0;
    return nb - na || b.minutos - a.minutos || a.jugador.nombre.localeCompare(b.jugador.nombre, "es");
  });
  const lider = (campo: "goles" | "asistencias" | "minutos") => {
    const top = [...datos.filas].sort((a, b) => b[campo] - a[campo])[0];
    return top && top[campo] > 0 ? top : null;
  };
  const goleador = lider("goles"), asistente = lider("asistencias"), minutero = lider("minutos");
  const constante = [...datos.filas].filter((f) => f.asistencia != null).sort((a, b) => b.asistencia! - a.asistencia! || b.presente - a.presente)[0];
  const pct = (n: number) => (e.jugados ? Math.round((n / e.jugados) * 100) : 0);

  return (
    <main className="pagina pagina-ancha estadisticas">
      <SelectorPartidos />
      <div className="titulo-con-accion">
        <h1>Estadísticas</h1>
        <span className="pastilla">{equipo.nombre}</span>
      </div>

      {competiciones.length > 1 && (
        <div className="filtro-tipos" role="radiogroup" aria-label="Competición">
          {["todas", ...competiciones].map((c) => (
            <button key={c} type="button" role="radio" aria-checked={competicion === c} onClick={() => setCompeticion(c)}>{c === "todas" ? "Todas" : c}</button>
          ))}
        </div>
      )}

      <section className="resumen-equipo tarjeta" aria-label="Resumen del equipo">
        <div className="resumen-cifras">
          <div><b>{e.jugados}</b><span>Jugados</span></div>
          <div className="v"><b>{e.victorias}</b><span>Victorias</span></div>
          <div className="e"><b>{e.empates}</b><span>Empates</span></div>
          <div className="d"><b>{e.derrotas}</b><span>Derrotas</span></div>
        </div>
        {e.jugados > 0 && (
          <div className="barra-resultados" role="img" aria-label={`${pct(e.victorias)}% victorias, ${pct(e.empates)}% empates, ${pct(e.derrotas)}% derrotas`}>
            <span className="v" style={{ width: `${pct(e.victorias)}%` }} />
            <span className="e" style={{ width: `${pct(e.empates)}%` }} />
            <span className="d" style={{ width: `${pct(e.derrotas)}%` }} />
          </div>
        )}
        <div className="resumen-goles">
          <div><b>{e.gf}</b><span>Goles a favor</span></div>
          <div><b>{e.gc}</b><span>Goles en contra</span></div>
          <div><b className={e.gf - e.gc > 0 ? "positivo" : e.gf - e.gc < 0 ? "negativo" : ""}>{e.gf - e.gc > 0 ? "+" : ""}{e.gf - e.gc}</b><span>Diferencia</span></div>
        </div>
      </section>

      {e.jugados === 0 && !cargando ? (
        <div className="vacio tarjeta">
          <IcoPartidos />
          <h3>Todavía no hay partidos jugados</h3>
          <p>Las estadísticas salen solas de la alineación, los goles, los cambios y las tarjetas de cada partido, y de las listas de los entrenamientos.</p>
        </div>
      ) : (
        <div className="destacados">
          {goleador && <div className="destacado tarjeta"><span className="etiqueta">Máximo goleador</span><b>{goleador.jugador.nombre}</b><span>{goleador.goles} {goleador.goles === 1 ? "gol" : "goles"}</span></div>}
          {asistente && <div className="destacado tarjeta"><span className="etiqueta">Más asistencias</span><b>{asistente.jugador.nombre}</b><span>{asistente.asistencias}</span></div>}
          {minutero && <div className="destacado tarjeta"><span className="etiqueta">Más minutos</span><b>{minutero.jugador.nombre}</b><span>{minutero.minutos}'</span></div>}
          {constante && <div className="destacado tarjeta"><span className="etiqueta">Más constante</span><b>{constante.jugador.nombre}</b><span>{constante.asistencia}% de entrenos</span></div>}
        </div>
      )}

      <section className="tabla-jugadores">
        <header>
          <h2>Por jugador</h2>
          <span className="suave">{datos.partidosJugados.length} partidos · {datos.entrenosConLista} entrenos con lista</span>
        </header>
        <p className="suave consejo">Toca el título de una columna para ordenar.</p>
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col" className="col-jugador">Jugador</th>
                {COLUMNAS.map((c) => (
                  <th key={c.clave} scope="col" aria-sort={orden === c.clave ? "descending" : "none"}>
                    <button type="button" title={c.largo} aria-label={`Ordenar por ${c.largo}`} className={orden === c.clave ? "activa" : ""} onClick={() => setOrden(c.clave)}>{c.corto}</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((f) => (
                <tr key={f.jugador.id}>
                  <th scope="row" className="col-jugador">
                    <span className="tabla-dorsal">{f.jugador.dorsal ?? ""}</span>{f.jugador.nombre}
                  </th>
                  <td>{f.jugados}</td>
                  <td>{f.titular}</td>
                  <td>{f.minutos}</td>
                  <td className={f.goles ? "destaca" : ""}>{f.goles}</td>
                  <td>{f.asistencias}</td>
                  <td>{f.amarillas ? <span className="celda-tarjeta amarilla">{f.amarillas}</span> : 0}</td>
                  <td>{f.rojas ? <span className="celda-tarjeta roja">{f.rojas}</span> : 0}</td>
                  <td>{f.asistencia == null ? "—" : <span className={"porcentaje " + (f.asistencia >= 80 ? "alto" : f.asistencia >= 60 ? "medio" : "bajo")}>{f.asistencia}%</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="leyenda-tabla">
          {COLUMNAS.map((c) => <div key={c.clave}><dt>{c.corto}</dt><dd>{c.largo}</dd></div>)}
        </dl>
      </section>
    </main>
  );
}
