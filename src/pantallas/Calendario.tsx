import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useColeccion, useEquipo, useMios } from "../ContextoEquipo";
import { Opciones } from "../componentes/Controles";
import { colorTexto } from "../componentes/Campo";
import { IcoAtras, IcoCalendario, IcoCheck, IcoLapiz, IcoMas, IcoPapelera, IcoSilbato } from "../componentes/Iconos";
import { Hoja, useUi } from "../componentes/ui";
import { DIAS_CORTOS, aISO, citasDe, emojiCasa, deISO, diasDelMes, lunesDe, resumenAsistencia, sumarDias, type Cita, type Evento } from "../datos/calendario";
import { COLOR_COMPETICION, PUESTOS, type Jugador, type Partido } from "../datos/modelo";
import type { Sesion } from "../datos/sesion";
import "./calendario.css";

const hoy = () => aISO(new Date());
const nombreDia = (f: string, opciones: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) => {
  const t = deISO(f).toLocaleDateString("es-ES", opciones);
  return t[0].toUpperCase() + t.slice(1);
};
const leerVista = (): "mes" | "semana" => { try { return localStorage.getItem("mister-vista-calendario") === "semana" ? "semana" : "mes"; } catch { return "mes"; } };

export function eventoNuevo(equipoId: string, fecha: string, tipo = "entrenamiento"): Evento {
  return { id: crypto.randomUUID(), equipoId, tipo, titulo: "", fecha, hora: "18:00", horaFin: "19:30", lugar: "", notas: "", sesionId: null, asistencia: {} };
}

/** Fecha de hoy según el reloj del dispositivo. Se actualiza sola al cambiar de día o al volver a la app. */
export function useHoy() {
  const [h, setH] = useState(hoy());
  useEffect(() => {
    const comprobar = () => setH(hoy());
    const t = setInterval(comprobar, 60_000);
    document.addEventListener("visibilitychange", comprobar);
    window.addEventListener("focus", comprobar);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", comprobar); window.removeEventListener("focus", comprobar); };
  }, []);
  return h;
}

/* ---------------- Calendario ---------------- */
export default function Calendario() {
  const { equipo, ajustes } = useEquipo();
  const eventos = useColeccion<Evento>("eventos");
  const { filas: partidos } = useColeccion<Partido>("partidos");
  const { filas: sesiones } = useMios<Sesion>("sesiones");
  const [vista, setVista] = useState<"mes" | "semana">(leerVista);
  const hoyDia = useHoy();
  const [dia, setDia] = useState(hoyDia);
  const [nuevo, setNuevo] = useState<Evento | null>(null);
  const { avisar } = useUi();

  const citas = useMemo(() => citasDe(eventos.filas, partidos, ajustes.tiposEvento), [eventos.filas, partidos, ajustes.tiposEvento]);
  const porDia = useMemo(() => {
    const m = new Map<string, Cita[]>();
    citas.forEach((c) => m.set(c.fecha, [...(m.get(c.fecha) ?? []), c]));
    return m;
  }, [citas]);

  const cambiarVista = (v: "mes" | "semana") => { setVista(v); try { localStorage.setItem("mister-vista-calendario", v); } catch { /* nada */ } };
  const d = deISO(dia);
  const mover = (n: number) => {
    if (vista === "semana") return setDia(sumarDias(dia, 7 * n));
    const x = new Date(d.getFullYear(), d.getMonth() + n, 1, 12);
    setDia(aISO(x));
  };
  const titulo = vista === "mes"
    ? nombreDia(dia, { month: "long", year: "numeric" })
    : (() => { const l = lunesDe(dia); return `${deISO(l).getDate()} – ${nombreDia(sumarDias(l, 6), { day: "numeric", month: "long" })}`; })();

  return (
    <main className="pagina pagina-ancha calendario">
      <div className="titulo-con-accion">
        <h1>Calendario</h1>
        <div className="segmentos-dir vista-calendario" role="radiogroup" aria-label="Vista">
          <button type="button" role="radio" aria-selected={vista === "semana"} aria-checked={vista === "semana"} onClick={() => cambiarVista("semana")}>Semana</button>
          <button type="button" role="radio" aria-selected={vista === "mes"} aria-checked={vista === "mes"} onClick={() => cambiarVista("mes")}>Mes</button>
        </div>
      </div>

      <div className="cal-navegacion">
        <button className="btn btn-icono" type="button" onClick={() => mover(-1)} aria-label={vista === "mes" ? "Mes anterior" : "Semana anterior"}><IcoAtras /></button>
        <h2>{titulo}</h2>
        <button className="btn btn-icono" type="button" onClick={() => mover(1)} aria-label={vista === "mes" ? "Mes siguiente" : "Semana siguiente"}><IcoAtras style={{ transform: "rotate(180deg)" }} /></button>
        {dia !== hoyDia && <button className="btn btn-gris cal-hoy" type="button" onClick={() => setDia(hoyDia)}>Hoy</button>}
      </div>

      {vista === "mes" ? (
        <>
          <div className="cal-mes" role="grid" aria-label={titulo}>
            {DIAS_CORTOS.map((n) => <span key={n} className="cal-cabecera" role="columnheader">{n}</span>)}
            {diasDelMes(d.getFullYear(), d.getMonth()).map((f) => {
              const delMes = deISO(f).getMonth() === d.getMonth();
              const lista = porDia.get(f) ?? [];
              return (
                <button key={f} type="button" role="gridcell" aria-selected={f === dia}
                  className={"cal-dia" + (delMes ? "" : " fuera") + (f === hoyDia ? " hoy" : "") + (f === dia ? " elegido" : "")}
                  aria-current={f === hoyDia ? "date" : undefined}
                  onClick={() => setDia(f)} aria-label={`${nombreDia(f)}${lista.length ? `, ${lista.length} ${lista.length === 1 ? "evento" : "eventos"}` : ""}`}>
                  {f === hoyDia && <span className="cal-hoy-marca">Hoy</span>}
                  <span className="cal-numero">{deISO(f).getDate()}</span>
                  {lista.length > 0 && (
                    <span className="cal-citas">
                      {lista.slice(0, 2).map((c) => <MiniCita key={c.id} c={c} />)}
                      {lista.length > 2 && <span className="cal-mas">+{lista.length - 2}</span>}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <DiaElegido dia={dia} citas={porDia.get(dia) ?? []} alAnadir={() => setNuevo(eventoNuevo(equipo.id, dia))} />
        </>
      ) : (
        <div className="cal-semana">
          {Array.from({ length: 7 }, (_, i) => sumarDias(lunesDe(dia), i)).map((f) => {
            const lista = porDia.get(f) ?? [];
            return (
              <section key={f} className={"cal-semana-dia" + (f === hoyDia ? " hoy" : "") + (f === dia ? " elegido" : "")}>
                <button type="button" className="cal-semana-cabeza" onClick={() => setDia(f)}>
                  <span>{f === hoyDia ? "Hoy" : nombreDia(f, { weekday: "short" }).replace(".", "")}</span><b>{deISO(f).getDate()}</b>
                </button>
                <div className="cal-semana-citas">
                  {lista.map((c) => <TarjetaCita key={c.id} c={c} />)}
                  {lista.length === 0 && <button type="button" className="cal-anadir-dia" onClick={() => setNuevo(eventoNuevo(equipo.id, f))} aria-label={`Añadir evento el ${nombreDia(f)}`}>Libre · añadir</button>}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="cal-leyenda" aria-label="Colores del calendario">
        {leyenda(ajustes.tiposEvento).map(([nombre, color]) => <span key={nombre}><i style={{ background: color }} />{nombre}</span>)}
      </div>

      <button className="btn btn-peto btn-grande btn-ancho" type="button" onClick={() => setNuevo(eventoNuevo(equipo.id, dia))}><IcoMas /> Añadir evento</button>

      {nuevo && (
        <FormEvento inicial={nuevo} esNuevo sesiones={sesiones} alCerrar={() => setNuevo(null)}
          alGuardar={async (lista) => {
            for (const e of lista) await eventos.guardar(e);
            setNuevo(null);
            setDia(lista[0].fecha);
            avisar(lista.length > 1 ? `${lista.length} eventos añadidos` : "Evento añadido");
          }} />
      )}
    </main>
  );
}

/** Colores del calendario: los tipos de evento (sin «Partido») y cada competición. */
function leyenda(tipos: { id: string; nombre: string; color?: string }[]): [string, string][] {
  const color = (id: string, def: string) => tipos.find((t) => t.id === id)?.color ?? def;
  const competiciones: [string, string][] = [
    ["Liga", color("partido", "#FF6B1A")], ["Copa", COLOR_COMPETICION.Copa], ["Amistoso", COLOR_COMPETICION.Amistoso], ["Torneo", color("torneo", "#8E5BD6")]
  ];
  const otros = tipos.filter((t) => t.id !== "partido" && t.id !== "torneo").map((t): [string, string] => [t.nombre, t.color ?? "#7D8B93"]);
  return [...otros, ...competiciones];
}

/** Evento dentro de la cuadrícula del mes: «🏠 vs Rival, 21:00» o «Entrenamiento, 20:00». */
function MiniCita({ c }: { c: Cita }) {
  return (
    <span className="mini-cita" style={{ "--c": c.color } as React.CSSProperties}>
      {c.etiqueta && <span className="mini-etiqueta">{c.etiqueta}</span>}
      <span className="mini-linea">
        <span className="mini-texto">
          {c.esPartido ? <>{emojiCasa(c.casa)} <span className="mini-vs">vs </span>{c.texto.replace(/^vs /, "")}</> : c.texto}
        </span>
        {c.hora && <span className="mini-hora">{c.hora}</span>}
      </span>
    </span>
  );
}

function TarjetaCita({ c }: { c: Cita }) {
  return (
    <Link to={c.enlace} className="cita" style={{ borderLeftColor: c.color }}>
      <span className="cita-hora">{c.hora || "—"}</span>
      <span className="cita-texto"><b>{c.titulo}</b><span>{c.esPartido ? c.detalle.replace(/^\d\d:\d\d · /, "") : c.detalle.replace(/^\d\d:\d\d(–\d\d:\d\d)? ?·? ?/, "") || c.tipoNombre}</span></span>
      <span className="cita-tipo" style={{ background: c.color, color: colorTexto(c.color) }}>{c.tipoNombre}</span>
    </Link>
  );
}

function DiaElegido({ dia, citas, alAnadir }: { dia: string; citas: Cita[]; alAnadir: () => void }) {
  return (
    <section className="cal-dia-elegido">
      <header><h2>{nombreDia(dia)}</h2></header>
      {citas.length ? citas.map((c) => <TarjetaCita key={c.id} c={c} />) : (
        <button type="button" className="cal-vacio" onClick={alAnadir}><IcoCalendario /> Nada este día. Toca para añadir un evento.</button>
      )}
    </section>
  );
}

/* ---------------- Formulario de evento ---------------- */
export function FormEvento({ inicial, esNuevo, sesiones, alCerrar, alGuardar, alBorrar, fijarSesion }: {
  inicial: Evento; esNuevo: boolean; sesiones: Sesion[]; alCerrar: () => void;
  alGuardar: (eventos: Evento[]) => Promise<void>; alBorrar?: () => void; fijarSesion?: boolean;
}) {
  const { ajustes } = useEquipo();
  const [e, setE] = useState(inicial);
  const [semanas, setSemanas] = useState(0);
  const ir = useNavigate();
  const set = (c: Partial<Evento>) => setE((x) => ({ ...x, ...c }));
  const tipoNombre = ajustes.tiposEvento.find((t) => t.id === e.tipo)?.nombre ?? "Evento";

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    const base = { ...e, titulo: e.titulo.trim(), lugar: e.lugar.trim(), notas: e.notas.trim() };
    const lista = [base, ...Array.from({ length: esNuevo ? semanas : 0 }, (_, i) => ({ ...base, id: crypto.randomUUID(), fecha: sumarDias(base.fecha, 7 * (i + 1)), asistencia: {} }))];
    await alGuardar(lista);
  }

  return (
    <Hoja titulo={esNuevo ? "Nuevo evento" : "Editar evento"} alCerrar={alCerrar}>
      <form className="formulario" onSubmit={enviar} noValidate>
        {!fijarSesion && (
          <div className="campo"><span>Tipo</span>
            <Opciones etiqueta="Tipo de evento" valor={e.tipo} cambiar={(v) => set({ tipo: v })}
              opciones={ajustes.tiposEvento.map((t) => ({ valor: t.id, texto: <><i className="punto-tipo" style={{ background: t.color }} />{t.nombre}</> }))} />
          </div>
        )}
        {e.tipo === "partido" && esNuevo ? (
          <>
            <p className="mensaje mensaje-aviso">Los partidos se apuntan en la pestaña Partidos (rival, campo, competición y alineación) y aparecen solos en el calendario.</p>
            <button className="btn btn-principal btn-grande" type="button" onClick={() => ir(`/partidos?nuevo=1&fecha=${e.fecha}`)}>Apuntar partido el {nombreDia(e.fecha, { day: "numeric", month: "long" })}</button>
          </>
        ) : (
          <>
            <label className="campo"><span>Nombre <small className="suave">(opcional)</small></span>
              <input className="entrada" value={e.titulo} onChange={(x) => set({ titulo: x.target.value })} placeholder={tipoNombre} maxLength={50} />
            </label>
            <label className="campo"><span>Fecha</span><input className="entrada" type="date" value={e.fecha} onChange={(x) => x.target.value && set({ fecha: x.target.value })} /></label>
            <div className="dos-columnas">
              <label className="campo"><span>Empieza</span><input className="entrada" type="time" value={e.hora} onChange={(x) => set({ hora: x.target.value })} /></label>
              <label className="campo"><span>Acaba</span><input className="entrada" type="time" value={e.horaFin} onChange={(x) => set({ horaFin: x.target.value })} /></label>
            </div>
            <label className="campo"><span>Lugar <small className="suave">(opcional)</small></span>
              <input className="entrada" value={e.lugar} onChange={(x) => set({ lugar: x.target.value })} placeholder="Por ejemplo: Campo Municipal" maxLength={60} />
            </label>
            {!fijarSesion && (
              <label className="campo"><span>Sesión de entrenamiento <small className="suave">(opcional)</small></span>
                <select className="entrada" value={e.sesionId ?? ""} onChange={(x) => {
                  const elegida = sesiones.find((s) => s.id === x.target.value);
                  set({ sesionId: elegida?.id ?? null, titulo: e.titulo || elegida?.nombre || "" });
                }}>
                  <option value="">Sin sesión</option>
                  {sesiones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </label>
            )}
            {esNuevo && (
              <div className="campo"><span>Repetir</span>
                <Opciones etiqueta="Repetir" valor={String(semanas)} cambiar={(v) => setSemanas(Number(v))} columnas={4}
                  opciones={[{ valor: "0", texto: "No" }, { valor: "3", texto: "4 semanas" }, { valor: "7", texto: "8 semanas" }, { valor: "15", texto: "16 semanas" }]} />
                {semanas > 0 && <small className="suave">Se creará cada {nombreDia(e.fecha, { weekday: "long" }).toLowerCase()} hasta el {nombreDia(sumarDias(e.fecha, 7 * semanas), { day: "numeric", month: "long" })}.</small>}
              </div>
            )}
            <label className="campo"><span>Notas <small className="suave">(opcional)</small></span>
              <textarea className="entrada area" rows={2} value={e.notas} onChange={(x) => set({ notas: x.target.value })} maxLength={500} />
            </label>
            <div className="hoja-acciones">
              {alBorrar
                ? <button className="btn btn-gris" type="button" onClick={alBorrar}><IcoPapelera /> Borrar</button>
                : <button className="btn btn-gris cerrar-hoja" type="button" onClick={alCerrar}>Cancelar</button>}
              <button className="btn btn-principal" type="submit">Guardar</button>
            </div>
          </>
        )}
      </form>
    </Hoja>
  );
}

/* ---------------- Ficha del evento y lista de asistencia ---------------- */
export function EventoDetalle() {
  const { id } = useParams();
  const { ajustes } = useEquipo();
  const eventos = useColeccion<Evento>("eventos");
  const { filas: jugadores } = useColeccion<Jugador>("jugadores");
  const { filas: sesiones } = useMios<Sesion>("sesiones");
  const [editando, setEditando] = useState(false);
  const { confirmar, avisar } = useUi();
  const ir = useNavigate();
  const e = eventos.filas.find((x) => x.id === id);

  const ordenados = useMemo(() => [...jugadores].sort((a, b) =>
    PUESTOS.findIndex((p) => p.valor === a.posicion) - PUESTOS.findIndex((p) => p.valor === b.posicion) || (a.dorsal ?? 99) - (b.dorsal ?? 99) || a.nombre.localeCompare(b.nombre, "es")), [jugadores]);

  if (eventos.cargando) return <main className="pagina" />;
  if (!e) return <main className="pagina"><div className="vacio tarjeta"><h3>No se encuentra este evento</h3><Link className="btn btn-principal" to="/calendario">Ver calendario</Link></div></main>;

  const tipo = ajustes.tiposEvento.find((t) => t.id === e.tipo);
  const sesion = sesiones.find((s) => s.id === e.sesionId);
  const r = resumenAsistencia(e, jugadores);
  const guardarAsistencia = (asistencia: Evento["asistencia"]) => eventos.guardar({ ...e, asistencia });
  const tocar = (j: Jugador) => guardarAsistencia({ ...e.asistencia, [j.id]: e.asistencia[j.id] === "presente" ? "ausente" : "presente" });

  return (
    <main className="pagina pagina-ancha evento-detalle">
      <div className="partido-cabeza">
        <Link to="/calendario" className="btn btn-icono" aria-label="Volver al calendario"><IcoAtras /></Link>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span className="cita-tipo" style={{ background: tipo?.color ?? "#777", color: colorTexto(tipo?.color ?? "#777") }}>{tipo?.nombre ?? "Evento"}</span>
          <h1 className="titulo-ejercicio">{e.titulo || tipo?.nombre || "Evento"}</h1>
        </div>
        <button className="btn btn-icono" type="button" onClick={() => setEditando(true)} aria-label="Editar evento"><IcoLapiz /></button>
      </div>
      <p className="evento-datos">{[nombreDia(e.fecha), e.hora && e.horaFin ? `${e.hora} a ${e.horaFin}` : e.hora, e.lugar].filter(Boolean).join(" · ")}</p>
      {e.notas && <p className="suave">{e.notas}</p>}

      <section className="evento-sesion tarjeta">
        {sesion ? (
          <>
            <div><span className="etiqueta">Sesión</span><b>{sesion.nombre}</b><small className="suave">{sesion.bloques.length} ejercicios</small></div>
            <div className="evento-sesion-botones">
              <button className="btn btn-peto" type="button" onClick={() => ir(`/sesiones/${sesion.id}/campo`)}><IcoSilbato /> Modo campo</button>
              <button className="btn btn-borde" type="button" onClick={() => ir(`/sesiones/${sesion.id}`)}>Ver sesión</button>
            </div>
          </>
        ) : (
          <>
            <p className="suave">Este evento no tiene sesión de entrenamiento.</p>
            <button className="btn btn-borde" type="button" onClick={() => setEditando(true)}><IcoMas /> Elegir una sesión</button>
          </>
        )}
      </section>

      <section className="lista-asistencia">
        <header>
          <h2>Pasar lista</h2>
          <span className="pastilla pastilla-ok">{r.presentes} de {jugadores.length} presentes</span>
        </header>
        {jugadores.length === 0 ? (
          <div className="vacio tarjeta"><p>Añade jugadores en la Plantilla para poder pasar lista.</p></div>
        ) : (
          <>
            <p className="suave consejo">Un toque: presente. Otro toque: ausente.</p>
            <div className="asistencia-acciones">
              <button className="btn btn-gris" type="button" onClick={() => guardarAsistencia(Object.fromEntries(jugadores.map((j) => [j.id, "presente"])))}><IcoCheck /> Todos presentes</button>
              {r.presentes + r.ausentes > 0 && <button className="btn btn-texto" type="button" onClick={async () => {
                if (await confirmar({ titulo: "¿Borrar la lista?", texto: "Todos los jugadores quedarán sin marcar.", boton: "Borrar lista" })) guardarAsistencia({});
              }}>Empezar de cero</button>}
            </div>
            <div className="asistencia">
              {ordenados.map((j) => {
                const estado = e.asistencia[j.id];
                return (
                  <button key={j.id} type="button" className={"asistente " + (estado ?? "sin-marcar")} onClick={() => tocar(j)} aria-pressed={estado === "presente"}
                    aria-label={`${j.nombre}: ${estado === "presente" ? "presente" : estado === "ausente" ? "ausente" : "sin marcar"}`}>
                    <span className="asistente-dorsal">{j.dorsal ?? j.nombre[0]}</span>
                    <span className="asistente-nombre">{j.nombre}</span>
                    <span className="asistente-estado">{estado === "presente" ? "Presente" : estado === "ausente" ? "Ausente" : "—"}</span>
                  </button>
                );
              })}
            </div>
            {r.sinMarcar > 0 && r.presentes + r.ausentes > 0 && <p className="suave">{r.sinMarcar} sin marcar.</p>}
          </>
        )}
      </section>

      {editando && (
        <FormEvento inicial={e} esNuevo={false} sesiones={sesiones} alCerrar={() => setEditando(false)}
          alGuardar={async ([x]) => { await eventos.guardar(x); setEditando(false); avisar("Evento guardado"); }}
          alBorrar={async () => {
            if (!(await confirmar({ titulo: "¿Borrar este evento?", texto: "Se borrará también su lista de asistencia. Esto no se puede deshacer." }))) return;
            await eventos.borrar(e.id); setEditando(false); avisar("Evento borrado"); ir("/calendario", { replace: true });
          }} />
      )}
    </main>
  );
}

/** Botón y hoja para poner una sesión en un día del calendario (desde la ficha de la sesión). */
export function PonerEnCalendario({ sesion }: { sesion: Sesion }) {
  const { equipo } = useEquipo();
  const eventos = useColeccion<Evento>("eventos");
  const [abierto, setAbierto] = useState(false);
  const { avisar } = useUi();
  const ir = useNavigate();
  const usos = eventos.filas.filter((e) => e.sesionId === sesion.id && e.fecha >= hoy()).sort((a, b) => a.fecha.localeCompare(b.fecha));
  return (
    <>
      <button className="btn btn-borde btn-grande ancho-completo" type="button" onClick={() => setAbierto(true)}><IcoCalendario /> Poner en el calendario</button>
      {usos.length > 0 && <p className="suave nota-fase">En el calendario: {usos.slice(0, 3).map((u) => nombreDia(u.fecha, { weekday: "short", day: "numeric", month: "short" })).join(", ")}{usos.length > 3 ? "…" : ""}</p>}
      {abierto && (
        <FormEvento inicial={{ ...eventoNuevo(equipo.id, hoy()), sesionId: sesion.id, titulo: sesion.nombre }} esNuevo fijarSesion sesiones={[sesion]}
          alCerrar={() => setAbierto(false)}
          alGuardar={async (lista) => {
            for (const e of lista) await eventos.guardar(e);
            setAbierto(false);
            avisar(`Sesión puesta en el calendario el ${nombreDia(lista[0].fecha, { day: "numeric", month: "long" })}`);
            ir(`/calendario/${lista[0].id}`);
          }} />
      )}
    </>
  );
}
