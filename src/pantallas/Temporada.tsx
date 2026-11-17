// Plan de la temporada: objetivos generales, etapas (las que quiera el entrenador) y el objetivo
// de cada semana, con los entrenamientos y partidos que ya tiene en el calendario.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useColeccion, useEquipo } from "../ContextoEquipo";
import { Hoja, useUi } from "../componentes/ui";
import { IcoAtras, IcoMas, IcoPapelera } from "../componentes/Iconos";
import { nuevoId, type Partido } from "../datos/modelo";
import { aISO, sumarDias, type Evento } from "../datos/calendario";
import { periodoTemporada, temporadaDe } from "../datos/estadisticas";
import { COLORES_ETAPA, etapaDeSemana, etapasTipicas, hoyLunes, semanasDe, textoSemana, type Etapa, type PlanTemporada, type SemanaPlan } from "../datos/temporada";
import { usePlanTemporada } from "./usePlanTemporada";
import "./temporada.css";
export { usePlanTemporada };

export function SelectorCalendario() {
  return (
    <nav className="segmentos-dir selector-biblioteca" aria-label="Calendario">
      <NavLink to="/calendario" end className={({ isActive }) => (isActive ? "activo" : "")}>Calendario</NavLink>
      <NavLink to="/temporada" end className={({ isActive }) => (isActive ? "activo" : "")}>Temporada</NavLink>
    </nav>
  );
}

const fechaCorta = (f: string) => new Date(f + "T12:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" }).replace(".", "");


export default function Temporada() {
  const { equipo } = useEquipo();
  const { confirmar, avisar } = useUi();
  const [temporada, setTemporada] = useState(() => temporadaDe(aISO(new Date())));
  const { plan: guardado, cargando, guardar } = usePlanTemporada(temporada);
  const { filas: eventos } = useColeccion<Evento>("eventos");
  const { filas: partidos } = useColeccion<Partido>("partidos");
  const vacio = (): PlanTemporada => ({ id: nuevoId(), equipoId: equipo.id, temporada, objetivos: "", etapas: [], semanas: {} });
  const [plan, setPlan] = useState<PlanTemporada>(guardado ?? vacio());
  const [etapa, setEtapa] = useState<Etapa | null>(null);
  const [semana, setSemana] = useState<string | null>(null);
  const cargado = useRef<string | null>(null);

  // Al cargar (o cambiar de temporada) se toma lo guardado
  useEffect(() => {
    if (cargando) return;
    const clave = temporada + (guardado ? ":" + guardado.id : "");
    if (cargado.current === clave) return;
    cargado.current = clave;
    // Si lo que llega es lo que acabamos de guardar nosotros, no se toca (por si se sigue escribiendo)
    if (guardado && guardado.id === plan.id) return;
    setPlan(guardado ?? vacio());
  }, [cargando, guardado, temporada]); // eslint-disable-line react-hooks/exhaustive-deps

  // Guardado automático
  const ultimo = useRef("");
  useEffect(() => {
    if (cargando || cargado.current == null) return;
    const texto = JSON.stringify(plan);
    if (!ultimo.current) { ultimo.current = JSON.stringify(guardado ?? vacio()); }
    const vacioDeVerdad = !plan.objetivos && plan.etapas.length === 0 && Object.keys(plan.semanas).length === 0;
    if (texto === ultimo.current || (vacioDeVerdad && !guardado)) return;
    const t = setTimeout(() => { ultimo.current = texto; guardar(plan).catch(() => undefined); }, 700);
    return () => clearTimeout(t);
  }, [plan]); // eslint-disable-line react-hooks/exhaustive-deps

  const semanas = useMemo(() => semanasDe(temporada), [temporada]);
  const actual = hoyLunes();
  const p = periodoTemporada(temporada);
  const enSemana = (l: string) => {
    const fin = sumarDias(l, 6);
    return {
      entrenos: eventos.filter((e) => e.tipo === "entrenamiento" && e.fecha >= l && e.fecha <= fin),
      partidos: partidos.filter((x) => x.fecha >= l && x.fecha <= fin).sort((a, b) => a.fecha.localeCompare(b.fecha))
    };
  };
  const cambiar = (c: Partial<PlanTemporada>) => setPlan((x) => ({ ...x, ...c }));
  const etapas = [...plan.etapas].sort((a, b) => a.desde.localeCompare(b.desde));
  const total = (new Date(p.hasta! + "T12:00").getTime() - new Date(p.desde! + "T12:00").getTime()) || 1;
  const pos = (f: string) => Math.max(0, Math.min(100, ((new Date(f + "T12:00").getTime() - new Date(p.desde! + "T12:00").getTime()) / total) * 100));
  const ini = Number(temporada.slice(0, 4));
  const otra = (n: number) => { cargado.current = null; ultimo.current = ""; setTemporada(`${ini + n}-${String((ini + n + 1) % 100).padStart(2, "0")}`); };

  // Al abrir, la lista empieza en la semana actual
  const lista = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = lista.current?.querySelector<HTMLElement>(".semana-actual");
    if (el && lista.current) lista.current.scrollTop = el.offsetTop - lista.current.offsetTop - 8;
  }, [temporada, cargando]);

  return (
    <main className="pagina pagina-ancha temporada">
      <SelectorCalendario />
      <div className="cal-navegacion">
        <button className="btn btn-icono" type="button" onClick={() => otra(-1)} aria-label="Temporada anterior"><IcoAtras /></button>
        <h1>Temporada {temporada}</h1>
        <button className="btn btn-icono" type="button" onClick={() => otra(1)} aria-label="Temporada siguiente"><IcoAtras style={{ transform: "rotate(180deg)" }} /></button>
      </div>
      <p className="suave">Planifícala a tu manera: pon tus objetivos, crea las etapas que quieras y marca qué trabajar cada semana. Todo es opcional.</p>

      <label className="campo tarjeta objetivos-temporada"><span>Objetivos de la temporada</span>
        <textarea className="entrada area" rows={3} maxLength={2000} value={plan.objetivos} onChange={(e) => cambiar({ objetivos: e.target.value })}
          placeholder="Ej.: que todos jueguen con las dos piernas, salir jugando desde atrás, competir con buena actitud…" />
      </label>

      <section className="etapas">
        <div className="titulo-con-accion">
          <h2>Etapas</h2>
          <button className="btn btn-borde" type="button" onClick={() => setEtapa({ id: nuevoId(), nombre: "", desde: p.desde!, hasta: sumarDias(p.desde!, 30), color: COLORES_ETAPA[plan.etapas.length % COLORES_ETAPA.length], objetivos: "" })}>
            <IcoMas /> Añadir
          </button>
        </div>
        {etapas.length === 0 ? (
          <div className="tarjeta etapas-vacio">
            <p className="suave">Divide la temporada como prefieras (pretemporada, vueltas, torneos…). Puedes empezar con unas etapas típicas y cambiarlas.</p>
            <button className="btn btn-principal" type="button" onClick={() => cambiar({ etapas: etapasTipicas(temporada).map((e) => ({ ...e, id: nuevoId() })) })}>Usar etapas típicas</button>
          </div>
        ) : (
          <>
            <div className="linea-temporada" aria-hidden="true">
              {etapas.map((e) => <span key={e.id} style={{ left: `${pos(e.desde)}%`, width: `${Math.max(1, pos(e.hasta) - pos(e.desde))}%`, background: e.color }} />)}
              <i style={{ left: `${pos(aISO(new Date()))}%` }} />
            </div>
            <div className="lista">
              {etapas.map((e) => (
                <button key={e.id} type="button" className="fila fila-boton fila-etapa" onClick={() => setEtapa(e)}>
                  <span className="color-etapa" style={{ background: e.color }} />
                  <span className="fila-texto"><b>{e.nombre || "Etapa sin nombre"}</b><span>{fechaCorta(e.desde)} – {fechaCorta(e.hasta)}{e.objetivos ? ` · ${e.objetivos}` : ""}</span></span>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="semanas">
        <h2>Semana a semana</h2>
        <ol className="lista-semanas" ref={lista}>
          {semanas.map((l) => {
            const s = plan.semanas[l];
            const et = etapaDeSemana(plan, l);
            const { entrenos, partidos: ps } = enSemana(l);
            return (
              <li key={l} className={l === actual ? "semana-actual" : l < actual ? "semana-pasada" : ""}>
                <button type="button" onClick={() => setSemana(l)}>
                  <span className="franja" style={{ background: et?.color ?? "var(--linea)" }} />
                  <span className="semana-texto">
                    <span className="semana-fecha">{textoSemana(l)}{l === actual ? " · esta semana" : ""}{et ? ` · ${et.nombre}` : ""}</span>
                    <b className={s?.objetivo ? "" : "sin-objetivo"}>{s?.objetivo || "Sin objetivo"}</b>
                    {(entrenos.length > 0 || ps.length > 0) && (
                      <span className="semana-citas">
                        {entrenos.length > 0 && `${entrenos.length} ${entrenos.length === 1 ? "entreno" : "entrenos"}`}
                        {entrenos.length > 0 && ps.length > 0 && " · "}
                        {ps.map((x) => `vs ${x.rival}`).join(", ")}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      {etapa && (
        <HojaEtapa etapa={etapa} esNueva={!plan.etapas.some((e) => e.id === etapa.id)} alCerrar={() => setEtapa(null)}
          alGuardar={(e) => { cambiar({ etapas: plan.etapas.some((x) => x.id === e.id) ? plan.etapas.map((x) => (x.id === e.id ? e : x)) : [...plan.etapas, e] }); setEtapa(null); }}
          alBorrar={async (e) => {
            if (await confirmar({ titulo: `¿Borrar la etapa «${e.nombre || "sin nombre"}»?`, texto: "Las semanas y sus objetivos no se borran." })) {
              cambiar({ etapas: plan.etapas.filter((x) => x.id !== e.id) }); setEtapa(null); avisar("Etapa borrada");
            }
          }} />
      )}
      {semana && (
        <HojaSemana lunes={semana} valor={plan.semanas[semana]} citas={enSemana(semana)} etapa={etapaDeSemana(plan, semana)} alCerrar={() => setSemana(null)}
          alGuardar={(s) => {
            const semanasNuevas = { ...plan.semanas };
            if (!s.objetivo.trim() && !s.notas.trim()) delete semanasNuevas[semana]; else semanasNuevas[semana] = { objetivo: s.objetivo.trim(), notas: s.notas.trim() };
            cambiar({ semanas: semanasNuevas }); setSemana(null);
          }} />
      )}
    </main>
  );
}

function HojaEtapa({ etapa, esNueva, alCerrar, alGuardar, alBorrar }: { etapa: Etapa; esNueva: boolean; alCerrar: () => void; alGuardar: (e: Etapa) => void; alBorrar: (e: Etapa) => void }) {
  const [e, setE] = useState(etapa);
  const [error, setError] = useState("");
  const set = (c: Partial<Etapa>) => setE((x) => ({ ...x, ...c }));
  return (
    <Hoja titulo={esNueva ? "Nueva etapa" : e.nombre || "Etapa"} alCerrar={alCerrar}>
      <form className="formulario" onSubmit={(ev) => {
        ev.preventDefault();
        if (!e.nombre.trim()) return setError("Ponle un nombre a la etapa.");
        if (e.hasta < e.desde) return setError("La fecha de fin tiene que ser después de la de inicio.");
        alGuardar({ ...e, nombre: e.nombre.trim(), objetivos: e.objetivos.trim() });
      }}>
        <label className="campo"><span>Nombre</span>
          <input className="entrada" autoFocus={esNueva} value={e.nombre} maxLength={40} onChange={(x) => set({ nombre: x.target.value })} placeholder="Ej.: Pretemporada, Torneo de Navidad…" />
        </label>
        <div className="fechas-etapa">
          <label className="campo"><span>Desde</span><input className="entrada" type="date" value={e.desde} onChange={(x) => set({ desde: x.target.value })} /></label>
          <label className="campo"><span>Hasta</span><input className="entrada" type="date" value={e.hasta} onChange={(x) => set({ hasta: x.target.value })} /></label>
        </div>
        <div className="campo"><span>Color</span>
          <div className="fila-colores" role="radiogroup" aria-label="Color de la etapa">
            {COLORES_ETAPA.map((c) => <button key={c} type="button" role="radio" aria-checked={e.color === c} aria-label={c} className="color-dibujo" style={{ background: c }} onClick={() => set({ color: c })} />)}
          </div>
        </div>
        <label className="campo"><span>Objetivos de la etapa <small className="suave">(opcional)</small></span>
          <textarea className="entrada area" rows={3} maxLength={600} value={e.objetivos} onChange={(x) => set({ objetivos: x.target.value })} />
        </label>
        {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
        <div className="hoja-acciones">
          {esNueva ? <button className="btn btn-gris" type="button" onClick={alCerrar}>Cancelar</button>
            : <button className="btn btn-gris" type="button" onClick={() => alBorrar(e)}><IcoPapelera /> Borrar</button>}
          <button className="btn btn-principal" type="submit">Guardar</button>
        </div>
      </form>
    </Hoja>
  );
}

function HojaSemana({ lunes, valor, citas, etapa, alCerrar, alGuardar }: {
  lunes: string; valor?: SemanaPlan; citas: { entrenos: Evento[]; partidos: Partido[] }; etapa?: Etapa;
  alCerrar: () => void; alGuardar: (s: SemanaPlan) => void;
}) {
  const [objetivo, setObjetivo] = useState(valor?.objetivo ?? "");
  const [notas, setNotas] = useState(valor?.notas ?? "");
  const dia = (f: string) => new Date(f + "T12:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric" });
  return (
    <Hoja titulo={`Semana ${textoSemana(lunes)}`} alCerrar={alCerrar}>
      <form className="formulario" onSubmit={(e) => { e.preventDefault(); alGuardar({ objetivo, notas }); }}>
        {etapa && <p className="suave"><span className="color-etapa en-linea" style={{ background: etapa.color }} /> {etapa.nombre}{etapa.objetivos ? ` · ${etapa.objetivos}` : ""}</p>}
        <label className="campo"><span>Objetivo de la semana</span>
          <input className="entrada" autoFocus value={objetivo} maxLength={80} onChange={(e) => setObjetivo(e.target.value)} placeholder="Ej.: Presión tras pérdida" />
        </label>
        <label className="campo"><span>Notas <small className="suave">(opcional)</small></span>
          <textarea className="entrada area" rows={3} maxLength={1000} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Contenidos, ejercicios que quieres hacer, recordatorios…" />
        </label>
        {objetivo.trim() && (
          <Link className="btn btn-borde" to={`/sesiones/propuesta?objetivo=${encodeURIComponent(objetivo.trim())}`} onClick={() => alGuardar({ objetivo, notas })}>Proponer una sesión con este objetivo</Link>
        )}
        {(citas.entrenos.length > 0 || citas.partidos.length > 0) && (
          <div className="citas-semana">
            <span className="etiqueta">Esta semana en el calendario</span>
            {citas.entrenos.map((e) => <Link key={e.id} to={`/calendario/${e.id}`} onClick={alCerrar}>🏃 Entrenamiento · {dia(e.fecha)}{e.hora ? ` · ${e.hora}` : ""}</Link>)}
            {citas.partidos.map((x) => <Link key={x.id} to={`/partidos/${x.id}`} onClick={alCerrar}>{x.casa ? "🏠" : "✈️"} vs {x.rival} · {dia(x.fecha)}{x.hora ? ` · ${x.hora}` : ""}</Link>)}
          </div>
        )}
        <div className="hoja-acciones">
          <button className="btn btn-gris" type="button" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-principal" type="submit">Guardar</button>
        </div>
      </form>
    </Hoja>
  );
}
