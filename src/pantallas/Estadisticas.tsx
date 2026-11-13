// Estadísticas del equipo y de cada jugador. Todo sale solo de lo que ya se apunta en la app:
// alineaciones, goles, cambios y tarjetas de los partidos, y las listas de los entrenamientos.
// Se ven desde Partidos y desde Plantilla (es la misma pantalla).
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate, useParams } from "react-router-dom";
import { useColeccion, useEquipo } from "../ContextoEquipo";
import { IcoAtras, IcoCalendario, IcoPartidos } from "../componentes/Iconos";
import type { Evento } from "../datos/calendario";
import {
  estadisticas, filtrarPeriodo, partidoJugado, partidosDeJugador, periodoTemporada, temporadaDe, temporadasCon,
  type FilaJugador, type Periodo
} from "../datos/estadisticas";
import { PUESTOS, PIERNAS, tiempoDePartido, type Jugador, type Partido } from "../datos/modelo";
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
/** Interruptor de la pestaña Plantilla: jugadores o estadísticas. */
export function SelectorPlantilla() {
  return (
    <nav className="segmentos-dir selector-biblioteca" aria-label="Plantilla">
      <NavLink to="/plantilla" end className={({ isActive }) => (isActive ? "activo" : "")}>Jugadores</NavLink>
      <NavLink to="/plantilla/estadisticas" end className={({ isActive }) => (isActive ? "activo" : "")}>Estadísticas</NavLink>
    </nav>
  );
}

type Columna = { clave: keyof FilaJugador; corto: string; largo: string };
const COLUMNAS: Columna[] = [
  { clave: "jugados", corto: "PJ", largo: "Partidos jugados" },
  { clave: "titular", corto: "Tit", largo: "Titularidades" },
  { clave: "minutos", corto: "Min", largo: "Minutos totales" },
  { clave: "goles", corto: "Gol", largo: "Goles" },
  { clave: "asistencias", corto: "Asis", largo: "Asistencias de gol" },
  { clave: "amarillas", corto: "TA", largo: "Tarjetas amarillas" },
  { clave: "rojas", corto: "TR", largo: "Tarjetas rojas" },
  { clave: "convocado", corto: "Conv", largo: "Convocatorias a partidos" },
  { clave: "asistencia", corto: "Entr.", largo: "Asistencia a entrenamientos (%)" }
];

/* ---------- Periodo (temporada, todo o fechas a mano), recordado mientras la app está abierta ---------- */
type Eleccion = { tipo: "temporada"; t: string } | { tipo: "todo" } | { tipo: "fechas"; desde: string; hasta: string };
const CLAVE_PERIODO = "mister-periodo-estadisticas";
function usePeriodo(partidos: Partido[], eventos: Evento[]) {
  const hoy = hoyISO();
  const [e, setE] = useState<Eleccion>(() => {
    try { const g = JSON.parse(sessionStorage.getItem(CLAVE_PERIODO) ?? "null"); if (g?.tipo) return g; } catch { /* nada */ }
    return { tipo: "temporada", t: temporadaDe(hoy) };
  });
  useEffect(() => { try { sessionStorage.setItem(CLAVE_PERIODO, JSON.stringify(e)); } catch { /* nada */ } }, [e]);
  const temporadas = useMemo(() => temporadasCon(partidos, eventos, hoy).slice(0, 4), [partidos, eventos, hoy]);
  const periodo: Periodo = e.tipo === "temporada" ? periodoTemporada(e.t) : e.tipo === "todo" ? { desde: null, hasta: null } : { desde: e.desde || null, hasta: e.hasta || null };
  return { eleccion: e, setEleccion: setE, temporadas, periodo };
}

function SelectorPeriodo({ eleccion, setEleccion, temporadas }: ReturnType<typeof usePeriodo>) {
  const hoy = hoyISO();
  return (
    <div className="selector-periodo">
      <div className="filtro-tipos" role="radiogroup" aria-label="Periodo">
        {temporadas.map((t) => (
          <button key={t} type="button" role="radio" aria-checked={eleccion.tipo === "temporada" && eleccion.t === t} onClick={() => setEleccion({ tipo: "temporada", t })}>
            Temporada {t}
          </button>
        ))}
        <button type="button" role="radio" aria-checked={eleccion.tipo === "todo"} onClick={() => setEleccion({ tipo: "todo" })}>Todo</button>
        <button type="button" role="radio" aria-checked={eleccion.tipo === "fechas"} onClick={() => setEleccion({ tipo: "fechas", desde: `${hoy.slice(0, 7)}-01`, hasta: hoy })}>Fechas…</button>
      </div>
      {eleccion.tipo === "fechas" && (
        <div className="dos-columnas fechas-periodo">
          <label className="campo"><span>Desde</span><input id="periodo-desde" className="entrada" type="date" value={eleccion.desde} max={eleccion.hasta || undefined} onChange={(x) => setEleccion({ ...eleccion, desde: x.target.value })} /></label>
          <label className="campo"><span>Hasta</span><input id="periodo-hasta" className="entrada" type="date" value={eleccion.hasta} min={eleccion.desde || undefined} onChange={(x) => setEleccion({ ...eleccion, hasta: x.target.value })} /></label>
        </div>
      )}
    </div>
  );
}

const Porcentaje = ({ n }: { n: number | null }) =>
  n == null ? <>—</> : <span className={"porcentaje " + (n >= 80 ? "alto" : n >= 60 ? "medio" : "bajo")}>{n}%</span>;

/** Lista con barra: el más alto ocupa toda la barra. */
function Ranking({ titulo, filas, valor, texto, vacio, ir, todos = false }: {
  titulo: string; filas: FilaJugador[]; valor: (f: FilaJugador) => number; texto: (f: FilaJugador) => string; vacio: string; ir: (id: string) => void;
  /** Asistencia: salen todos, también los que menos vienen. Goles y tarjetas: los 8 primeros. */
  todos?: boolean;
}) {
  const lista = filas.filter((f) => todos || valor(f) > 0).sort((a, b) => valor(b) - valor(a) || a.jugador.nombre.localeCompare(b.jugador.nombre, "es")).slice(0, todos ? undefined : 8);
  const max = Math.max(1, ...lista.map(valor));
  return (
    <section className="ranking tarjeta">
      <h2>{titulo}</h2>
      {lista.length === 0 ? <p className="suave">{vacio}</p> : (
        <ol>
          {lista.map((f, i) => (
            <li key={f.jugador.id}>
              <button type="button" onClick={() => ir(f.jugador.id)}>
                <span className="ranking-pos">{i + 1}</span>
                <span className="ranking-nombre">{f.jugador.nombre}</span>
                <span className="ranking-barra"><span style={{ width: `${(valor(f) / max) * 100}%` }} /></span>
                <b className="ranking-valor">{texto(f)}</b>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/* ---------------- Estadísticas del equipo ---------------- */
export default function Estadisticas({ desde = "partidos" }: { desde?: "partidos" | "plantilla" }) {
  const { equipo, ajustes } = useEquipo();
  const { filas: jugadores, cargando } = useColeccion<Jugador>("jugadores");
  const { filas: partidos } = useColeccion<Partido>("partidos");
  const { filas: eventos } = useColeccion<Evento>("eventos");
  const periodo = usePeriodo(partidos, eventos);
  const [competicion, setCompeticion] = useState("todas");
  const [orden, setOrden] = useState<keyof FilaJugador>("minutos");
  const ir = useNavigate();
  const hoy = hoyISO();
  const { partes, minutos } = tiempoDePartido(ajustes);

  const enPeriodo = useMemo(() => filtrarPeriodo(partidos, eventos, periodo.periodo), [partidos, eventos, periodo.periodo]);
  const competiciones = useMemo(() => [...new Set(enPeriodo.partidos.filter((p) => partidoJugado(p, hoy)).map((p) => p.competicion))].sort(), [enPeriodo.partidos, hoy]);
  const filtrados = competicion === "todas" ? enPeriodo.partidos : enPeriodo.partidos.filter((p) => p.competicion === competicion);
  const datos = useMemo(() => estadisticas(jugadores, filtrados, enPeriodo.eventos, partes * minutos, hoy), [jugadores, filtrados, enPeriodo.eventos, partes, minutos, hoy]);
  const { equipo: e } = datos;
  const verJugador = (id: string) => ir(`/plantilla/jugador/${id}`);

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
  const sinLista = datos.entrenosSinLista;

  return (
    <main className="pagina pagina-ancha estadisticas">
      {desde === "plantilla" ? <SelectorPlantilla /> : <SelectorPartidos />}
      <div className="titulo-con-accion">
        <h1>Estadísticas</h1>
        <span className="pastilla">{equipo.nombre}</span>
      </div>

      <SelectorPeriodo {...periodo} />
      {competiciones.length > 1 && (
        <div className="filtro-tipos" role="radiogroup" aria-label="Competición">
          {["todas", ...competiciones].map((c) => (
            <button key={c} type="button" role="radio" aria-checked={competicion === c} onClick={() => setCompeticion(c)}>{c === "todas" ? "Todas las competiciones" : c}</button>
          ))}
        </div>
      )}

      {sinLista.length > 0 && (
        <div className="aviso-lista mensaje mensaje-aviso">
          <span>{sinLista.length === 1 ? "Hay 1 entrenamiento sin pasar lista." : `Hay ${sinLista.length} entrenamientos sin pasar lista.`} La asistencia sale de ahí.</span>
          <Link className="btn btn-principal" to={`/calendario/${sinLista[0].id}`}><IcoCalendario /> Pasar lista</Link>
        </div>
      )}

      <section className="resumen-equipo tarjeta" aria-label="Resumen del equipo">
        <div className="resumen-cifras">
          <div><b>{e.jugados}</b><span>Jugados</span></div>
          <div className="v"><b>{e.victorias}</b><span>Ganados</span></div>
          <div className="e"><b>{e.empates}</b><span>Empatados</span></div>
          <div className="d"><b>{e.derrotas}</b><span>Perdidos</span></div>
        </div>
        {e.jugados > 0 && (
          <div className="barra-resultados" role="img" aria-label={`${pct(e.victorias)}% ganados, ${pct(e.empates)}% empatados, ${pct(e.derrotas)}% perdidos`}>
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
          <h3>No hay partidos jugados en este periodo</h3>
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

      <div className="rankings">
        <Ranking titulo="Goleadores" filas={datos.filas} valor={(f) => f.goles} texto={(f) => String(f.goles)} vacio="Aún no hay goles apuntados." ir={verJugador} />
        <Ranking titulo="Tarjetas" filas={datos.filas} valor={(f) => f.amarillas + f.rojas * 2}
          texto={(f) => [f.amarillas && `${f.amarillas} TA`, f.rojas && `${f.rojas} TR`].filter(Boolean).join(" · ")} vacio="Ninguna tarjeta. ¡Bien!" ir={verJugador} />
        <Ranking titulo="Asistencia a entrenamientos" filas={datos.filas.filter((f) => f.asistencia != null)} valor={(f) => f.asistencia ?? 0}
          texto={(f) => `${f.asistencia}% · ${f.presente}/${f.entrenos}`} vacio="Pasa lista en los entrenamientos y aquí verás quién viene más." ir={verJugador} todos />
        <Ranking titulo="Convocatorias a partidos" filas={datos.filas} valor={(f) => f.convocado}
          texto={(f) => `${f.convocado}/${datos.conAlineacion} · ${f.asistenciaPartidos ?? 0}%`} vacio="Haz la alineación de los partidos y aquí verás las convocatorias." ir={verJugador} todos={datos.conAlineacion > 0} />
      </div>

      <section className="tabla-jugadores">
        <header>
          <h2>Por jugador</h2>
          <span className="suave">{datos.partidosJugados.length} partidos · {datos.entrenosConLista} entrenos con lista</span>
        </header>
        <p className="suave consejo">Toca el título de una columna para ordenar, o un jugador para ver su ficha.</p>
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
                    <Link to={`/plantilla/jugador/${f.jugador.id}`} className="enlace-jugador"><span className="tabla-dorsal">{f.jugador.dorsal ?? ""}</span>{f.jugador.nombre}</Link>
                  </th>
                  <td>{f.jugados}</td>
                  <td>{f.titular}</td>
                  <td>{f.minutos}</td>
                  <td className={f.goles ? "destaca" : ""}>{f.goles}</td>
                  <td>{f.asistencias}</td>
                  <td>{f.amarillas ? <span className="celda-tarjeta amarilla">{f.amarillas}</span> : 0}</td>
                  <td>{f.rojas ? <span className="celda-tarjeta roja">{f.rojas}</span> : 0}</td>
                  <td>{f.convocado}</td>
                  <td><Porcentaje n={f.asistencia} /></td>
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

/* ---------------- Ficha de un jugador ---------------- */
export function FichaJugador() {
  const { id } = useParams();
  const { ajustes } = useEquipo();
  const { filas: jugadores, cargando } = useColeccion<Jugador>("jugadores");
  const { filas: partidos } = useColeccion<Partido>("partidos");
  const { filas: eventos } = useColeccion<Evento>("eventos");
  const periodo = usePeriodo(partidos, eventos);
  const hoy = hoyISO();
  const { partes, minutos } = tiempoDePartido(ajustes);
  const j = jugadores.find((x) => x.id === id);
  const enPeriodo = useMemo(() => filtrarPeriodo(partidos, eventos, periodo.periodo), [partidos, eventos, periodo.periodo]);
  const f = useMemo(() => (j ? estadisticas([j], enPeriodo.partidos, enPeriodo.eventos, partes * minutos, hoy) : null), [j, enPeriodo, partes, minutos, hoy]);
  const historial = useMemo(() => (j ? partidosDeJugador(j.id, enPeriodo.partidos, partes * minutos, hoy) : []), [j, enPeriodo.partidos, partes, minutos, hoy]);
  const entrenos = enPeriodo.eventos.filter((e) => e.tipo === "entrenamiento" && e.fecha <= hoy && j && e.asistencia?.[j.id]).sort((a, b) => b.fecha.localeCompare(a.fecha));

  if (cargando) return <main className="pagina" />;
  if (!j || !f) return <main className="pagina"><div className="vacio tarjeta"><h3>No se encuentra este jugador</h3><Link className="btn btn-principal" to="/plantilla">Ver la plantilla</Link></div></main>;
  const d = f.filas[0];
  const fecha = (x: string) => new Date(x + "T12:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  const cifras: [string, string | number, string?][] = [
    ["Partidos jugados", d.jugados], ["Titular", d.titular], ["Minutos", d.minutos], ["Goles", d.goles, "gol"], ["Asistencias", d.asistencias],
    ["Amarillas", d.amarillas], ["Rojas", d.rojas], ["Convocatorias", `${d.convocado}/${f.conAlineacion}`],
    ["Asistencia a partidos", d.asistenciaPartidos == null ? "—" : `${d.asistenciaPartidos}%`], ["Asistencia a entrenos", d.asistencia == null ? "—" : `${d.asistencia}%`]
  ];

  return (
    <main className="pagina pagina-ancha ficha-jugador">
      <div className="partido-cabeza">
        <Link to="/plantilla/estadisticas" className="btn btn-icono" aria-label="Volver a las estadísticas"><IcoAtras /></Link>
        <span className="ficha-dorsal">{j.dorsal ?? "–"}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span className="etiqueta">{PUESTOS.find((p) => p.valor === j.posicion)?.texto} · Pierna {PIERNAS.find((p) => p.valor === j.pierna)?.texto.toLowerCase()}</span>
          <h1 className="titulo-ejercicio">{j.nombre}</h1>
        </div>
      </div>
      <SelectorPeriodo {...periodo} />

      <div className="cifras-jugador">
        {cifras.map(([k, v, cl]) => <div key={k} className={"tarjeta" + (cl ? " " + cl : "")}><b>{v}</b><span>{k}</span></div>)}
      </div>

      <section className="tabla-jugadores">
        <header><h2>Partido a partido</h2><span className="suave">{historial.length} partidos jugados por el equipo</span></header>
        {historial.length === 0 ? <p className="suave">Ningún partido jugado en este periodo.</p> : (
          <div className="tabla-scroll">
            <table>
              <thead><tr><th scope="col" className="col-jugador">Partido</th><th scope="col">Res.</th><th scope="col">Conv</th><th scope="col">Min</th><th scope="col">Gol</th><th scope="col">Asis</th><th scope="col">Tarj.</th></tr></thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={h.partido.id} className={h.convocado ? "" : "no-convocado"}>
                    <th scope="row" className="col-jugador"><Link to={`/partidos/${h.partido.id}`} className="enlace-jugador">{fecha(h.partido.fecha)} · {h.partido.casa ? "🏠" : "✈️"} {h.partido.rival}</Link></th>
                    <td><span className={"resultado-mini " + h.signo}>{h.nuestros}-{h.suyos}</span></td>
                    <td>{h.convocado ? (h.titular ? "Titular" : "Banquillo") : "No"}</td>
                    <td>{h.minutos}</td>
                    <td className={h.goles ? "destaca" : ""}>{h.goles}</td>
                    <td>{h.asistencias}</td>
                    <td>{h.amarillas ? <span className="celda-tarjeta amarilla">{h.amarillas}</span> : null}{h.roja ? <span className="celda-tarjeta roja">R</span> : null}{!h.amarillas && !h.roja ? "–" : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="tabla-jugadores">
        <header><h2>Entrenamientos</h2><span className="suave">{d.presente} de {d.entrenos} con lista</span></header>
        {entrenos.length === 0 ? <p className="suave">Sin listas de entrenamiento en este periodo.</p> : (
          <div className="puntos-asistencia" role="list" aria-label="Asistencia a cada entrenamiento">
            {entrenos.slice(0, 40).map((e) => (
              <Link key={e.id} to={`/calendario/${e.id}`} role="listitem" className={"punto-asistencia " + e.asistencia[j.id]} title={`${fecha(e.fecha)}: ${e.asistencia[j.id] === "presente" ? "vino" : "no vino"}`}>
                <span>{fecha(e.fecha)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
