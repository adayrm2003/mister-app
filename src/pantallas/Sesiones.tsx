import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, NavLink, useNavigate, useParams } from "react-router-dom";
import { useEquipo, useMios } from "../ContextoEquipo";
import { Opciones } from "../componentes/Controles";
import { IcoAtras, IcoCheck, IcoDescargar, IcoFlechaAbajo, IcoLapiz, IcoMas, IcoPapelera, IcoSilbato } from "../componentes/Iconos";
import { Hoja, mensajeDe, useUi } from "../componentes/ui";
import type { Ejercicio } from "../datos/pizarra";
import { copiarSesion, duracionTotal, minutosDe, porFases, sesionVacia, textoMinutos, type Bloque, type Sesion } from "../datos/sesion";
import { PonerEnCalendario } from "./Calendario";
import "./sesiones.css";

const sinAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Interruptor de la pestaña Ejercicios: biblioteca de ejercicios o sesiones. */
export function SelectorBiblioteca() {
  return (
    <nav className="segmentos-dir selector-biblioteca" aria-label="Biblioteca">
      <NavLink to="/ejercicios" end className={({ isActive }) => (isActive ? "activo" : "")}>Ejercicios</NavLink>
      <NavLink to="/sesiones" end className={({ isActive }) => (isActive ? "activo" : "")}>Sesiones</NavLink>
    </nav>
  );
}

function useEjerciciosPorId() {
  const { filas, cargando } = useMios<Ejercicio>("ejercicios");
  const mapa = useMemo(() => new Map(filas.map((e) => [e.id, e])), [filas]);
  return { mapa, lista: filas, cargando };
}

/* ---------------- Lista de sesiones ---------------- */
export default function Sesiones() {
  const { filas, cargando } = useMios<Sesion>("sesiones");
  const { mapa } = useEjerciciosPorId();
  const [busqueda, setBusqueda] = useState("");
  const ir = useNavigate();
  const visibles = filas
    .filter((s) => !busqueda.trim() || sinAcentos(s.nombre + " " + s.objetivo).includes(sinAcentos(busqueda.trim())))
    .sort((a, b) => b.actualizado.localeCompare(a.actualizado));

  return (
    <main className="pagina pagina-ancha">
      <SelectorBiblioteca />
      <div className="titulo-con-accion">
        <h1>Sesiones</h1>
        <span className="pastilla">{filas.length} guardadas</span>
      </div>
      <button className="btn btn-peto btn-grande btn-ancho" type="button" onClick={() => ir("/sesiones/nueva")}><IcoMas /> Nueva sesión</button>
      {filas.length > 3 && (
        <input className="entrada" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar sesión" aria-label="Buscar sesión" />
      )}
      {!cargando && visibles.length === 0 && (
        <div className="vacio tarjeta">
          <IcoSilbato />
          <h3>{filas.length ? "Ninguna sesión coincide" : "Aún no tienes sesiones"}</h3>
          <p>{filas.length ? "Prueba con otra palabra." : "Crea una sesión eligiendo ejercicios de tu biblioteca y ordenándolos por fases. Luego podrás usarla de nuevo cuando quieras."}</p>
        </div>
      )}
      <div className="tarjetas-ejercicio">
        {visibles.map((s) => (
          <Link key={s.id} to={`/sesiones/${s.id}`} className="tarjeta-ejercicio tarjeta">
            <div className="tarjeta-ejercicio-texto">
              <div className="tarjeta-ejercicio-cabeza">
                <span className="pastilla pastilla-ok">{textoMinutos(duracionTotal(s, mapa))}</span>
                <small>{s.bloques.length} {s.bloques.length === 1 ? "ejercicio" : "ejercicios"}</small>
              </div>
              <b>{s.nombre}</b>
              {s.objetivo && <p>{s.objetivo}</p>}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

/* ---------------- Ficha de una sesión ---------------- */
export function SesionDetalle() {
  const { id } = useParams();
  const { equipo, ajustes } = useEquipo();
  const { filas, cargando, guardar, borrar } = useMios<Sesion>("sesiones");
  const { mapa, cargando: cargandoEj } = useEjerciciosPorId();
  const { confirmar, avisar } = useUi();
  const [pdf, setPdf] = useState(false);
  const ir = useNavigate();
  const s = filas.find((x) => x.id === id);

  if (cargando || cargandoEj) return <main className="pagina" />;
  if (!s) return <main className="pagina"><div className="vacio tarjeta"><h3>No se encuentra esta sesión</h3><Link className="btn btn-principal" to="/sesiones">Ver sesiones</Link></div></main>;

  const grupos = porFases(s, ajustes.fases, mapa).filter((g) => g.bloques.length);
  const total = duracionTotal(s, mapa);

  async function duplicar() {
    const copia = copiarSesion(s!, `${s!.nombre} (copia)`);
    await guardar(copia);
    avisar("Sesión duplicada: cámbiale lo que quieras");
    ir(`/sesiones/${copia.id}/editar`);
  }
  async function eliminar() {
    if (!(await confirmar({ titulo: `¿Borrar «${s!.nombre}»?`, texto: "Los ejercicios no se borran, solo esta sesión. Esto no se puede deshacer." }))) return;
    await borrar(s!.id);
    avisar("Sesión borrada");
    ir("/sesiones", { replace: true });
  }
  async function descargar() {
    setPdf(true);
    try {
      const { descargarPdfSesion } = await import("../pdf/sesionPdf");
      await descargarPdfSesion(s!, grupos, mapa, equipo.nombre, ajustes);
      avisar("PDF descargado");
    } catch (e) { avisar(mensajeDe(e)); }
    finally { setPdf(false); }
  }

  return (
    <main className="pagina pagina-ancha sesion-detalle">
      <div className="partido-cabeza">
        <Link to="/sesiones" className="btn btn-icono" aria-label="Volver a sesiones"><IcoAtras /></Link>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span className="etiqueta">Sesión · {textoMinutos(total)} · {s.bloques.length} ejercicios</span>
          <h1 className="titulo-ejercicio">{s.nombre}</h1>
        </div>
      </div>
      {s.objetivo && <p className="objetivo-sesion"><b>Objetivo:</b> {s.objetivo}</p>}

      <button className="btn btn-peto btn-grande btn-ancho" type="button" onClick={() => ir(`/sesiones/${s.id}/campo`)} disabled={!s.bloques.length}>
        <IcoSilbato /> Modo campo
      </button>

      <div className="fases-sesion">
        {grupos.map((g, gi) => (
          <section key={g.fase.id} className="fase-sesion">
            <header><h2>{gi + 1}. {g.fase.nombre}</h2><span className="pastilla">{textoMinutos(g.minutos)}</span></header>
            <div className="lista">
              {g.bloques.map((b) => {
                const e = mapa.get(b.ejercicioId);
                return (
                  <Link key={b.id} to={e ? `/ejercicios/${e.id}` : "#"} className="fila fila-partido">
                    <span className="fila-texto">
                      <b>{e?.nombre ?? "Ejercicio borrado"}</b>
                      <span>{[e?.objetivo, b.notas].filter(Boolean).join(" · ") || ajustes.tiposEjercicio.find((t) => t.id === e?.tipo)?.nombre}</span>
                    </span>
                    <span className="minutos-bloque">{minutosDe(b, e)}'</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
        {grupos.length === 0 && <div className="vacio tarjeta"><p>Esta sesión no tiene ejercicios todavía.</p></div>}
      </div>
      {s.notas && <div className="ficha-ejercicio tarjeta"><dt>Notas</dt><dd>{s.notas}</dd></div>}

      <div className="acciones-ejercicio">
        <button className="btn btn-principal btn-grande" type="button" onClick={() => ir(`/sesiones/${s.id}/editar`)}><IcoLapiz /> Editar</button>
        <button className="btn btn-borde btn-grande" type="button" onClick={duplicar}>Usar de nuevo</button>
        <button className="btn btn-borde btn-grande ancho-completo" type="button" onClick={descargar} disabled={pdf}><IcoDescargar /> {pdf ? "Creando PDF…" : "Descargar PDF"}</button>
        <PonerEnCalendario sesion={s} />
        <button className="btn btn-texto peligro" type="button" onClick={eliminar}><IcoPapelera /> Borrar sesión</button>
      </div>
      <p className="suave nota-fase">«Usar de nuevo» hace una copia para cambiarla sin tocar esta.</p>
    </main>
  );
}

/* ---------------- Crear y editar ---------------- */
export function EditorSesion() {
  const { id } = useParams();
  const { ajustes } = useEquipo();
  const { filas, cargando, guardar } = useMios<Sesion>("sesiones");
  const { mapa, lista, cargando: cargandoEj } = useEjerciciosPorId();
  const { confirmar, avisar } = useUi();
  const ir = useNavigate();
  const [s, setS] = useState<Sesion | null>(null);
  const [original, setOriginal] = useState("");
  const [error, setError] = useState("");
  const [eligiendo, setEligiendo] = useState<string | null>(null);
  const [bloqueAbierto, setBloqueAbierto] = useState<Bloque | null>(null);

  useEffect(() => {
    if (s || cargando) return;
    const base = id ? filas.find((x) => x.id === id) : sesionVacia();
    if (base) { setS(structuredClone(base)); setOriginal(JSON.stringify(base)); }
  }, [cargando, filas, id, s]);

  if (cargando || cargandoEj || !s) return <main className="pagina" />;
  const set = (c: Partial<Sesion>) => setS((x) => ({ ...x!, ...c }));
  const grupos = porFases(s, ajustes.fases, mapa);
  const total = duracionTotal(s, mapa);

  function mover(b: Bloque, d: -1 | 1) {
    const mismos = s!.bloques.filter((x) => x.faseId === b.faseId);
    const i = mismos.findIndex((x) => x.id === b.id), j = i + d;
    if (j < 0 || j >= mismos.length) return;
    const otro = mismos[j];
    const l = [...s!.bloques];
    const a = l.findIndex((x) => x.id === b.id), c = l.findIndex((x) => x.id === otro.id);
    [l[a], l[c]] = [l[c], l[a]];
    set({ bloques: l });
  }
  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    if (!s!.nombre.trim()) { setError("Ponle un nombre a la sesión."); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const final = { ...s!, nombre: s!.nombre.trim(), actualizado: new Date().toISOString() };
    await guardar(final);
    avisar("Sesión guardada");
    ir(`/sesiones/${final.id}`, { replace: true });
  }
  async function salir() {
    if (JSON.stringify(s) !== original && !(await confirmar({ titulo: "¿Salir sin guardar?", texto: "Perderás los cambios de esta sesión.", boton: "Salir sin guardar" }))) return;
    ir(id ? `/sesiones/${id}` : "/sesiones");
  }

  return (
    <form className="pagina pagina-ancha editor-ejercicio" onSubmit={enviar} noValidate>
      <div className="partido-cabeza">
        <button className="btn btn-icono" type="button" onClick={salir} aria-label="Salir"><IcoAtras /></button>
        <h1 style={{ flex: 1 }}>{id ? "Editar sesión" : "Nueva sesión"}</h1>
      </div>
      <label className="campo"><span>Nombre</span>
        <input className="entrada" value={s.nombre} onChange={(e) => { set({ nombre: e.target.value }); setError(""); }} maxLength={60} placeholder="Por ejemplo: Martes · posesión y finalización" />
      </label>
      {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
      <label className="campo"><span>Objetivo</span>
        <input className="entrada" value={s.objetivo} onChange={(e) => set({ objetivo: e.target.value })} maxLength={160} placeholder="Qué quieres trabajar hoy" />
      </label>

      <div className="fases-sesion">
        {grupos.map((g, gi) => (
          <section key={g.fase.id} className="fase-sesion tarjeta fase-editable">
            <header><h2>{gi + 1}. {g.fase.nombre}</h2><span className="pastilla">{textoMinutos(g.minutos)}</span></header>
            {g.bloques.length > 0 && (
              <div className="lista">
                {g.bloques.map((b, i) => {
                  const e = mapa.get(b.ejercicioId);
                  return (
                    <div key={b.id} className="fila">
                      <button type="button" className="fila-texto boton-plano" onClick={() => setBloqueAbierto(b)}>
                        <b>{e?.nombre ?? "Ejercicio borrado"}</b>
                        <span>{minutosDe(b, e)} min{b.notas ? " · " + b.notas : ""}</span>
                      </button>
                      <button className="btn btn-icono btn-mini" type="button" disabled={i === 0} onClick={() => mover(b, -1)} aria-label={`Subir ${e?.nombre ?? ""}`}><IcoFlechaAbajo style={{ transform: "rotate(180deg)" }} /></button>
                      <button className="btn btn-icono btn-mini" type="button" disabled={i === g.bloques.length - 1} onClick={() => mover(b, 1)} aria-label={`Bajar ${e?.nombre ?? ""}`}><IcoFlechaAbajo /></button>
                    </div>
                  );
                })}
              </div>
            )}
            {g.fase.id !== "__otros" && (
              <button className="btn btn-texto" type="button" onClick={() => setEligiendo(g.fase.id)}><IcoMas /> Añadir ejercicio</button>
            )}
          </section>
        ))}
      </div>

      <label className="campo"><span>Notas <small className="suave">(opcional)</small></span>
        <textarea className="entrada area" rows={3} value={s.notas} onChange={(e) => set({ notas: e.target.value })} maxLength={1000} />
      </label>

      <div className="barra-guardar">
        <span className="total-sesion"><small>Total</small>{textoMinutos(total)}</span>
        <button className="btn btn-principal" type="submit">Guardar sesión</button>
      </div>

      {eligiendo && (
        <ElegirEjercicios fase={ajustes.fases.find((f) => f.id === eligiendo)?.nombre ?? ""} lista={lista} tipos={ajustes.tiposEjercicio}
          yaEnFase={new Set(s.bloques.filter((b) => b.faseId === eligiendo).map((b) => b.ejercicioId))}
          alElegir={(e) => { set({ bloques: [...s.bloques, { id: crypto.randomUUID(), faseId: eligiendo, ejercicioId: e.id, minutos: null, notas: "" }] }); avisar(`«${e.nombre}» añadido`); }}
          alCerrar={() => setEligiendo(null)} irNuevo={() => ir("/ejercicios/nuevo")} />
      )}
      {bloqueAbierto && (
        <HojaBloque bloque={bloqueAbierto} ejercicio={mapa.get(bloqueAbierto.ejercicioId)} fases={ajustes.fases} alCerrar={() => setBloqueAbierto(null)}
          alGuardar={(b) => { set({ bloques: s.bloques.map((x) => (x.id === b.id ? b : x)) }); setBloqueAbierto(null); }}
          alQuitar={() => { set({ bloques: s.bloques.filter((x) => x.id !== bloqueAbierto.id) }); setBloqueAbierto(null); }} />
      )}
    </form>
  );
}

function ElegirEjercicios({ fase, lista, tipos, yaEnFase, alElegir, alCerrar, irNuevo }: {
  fase: string; lista: Ejercicio[]; tipos: { id: string; nombre: string }[]; yaEnFase: Set<string>;
  alElegir: (e: Ejercicio) => void; alCerrar: () => void; irNuevo: () => void;
}) {
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("todos");
  const visibles = lista
    .filter((e) => tipo === "todos" || e.tipo === tipo)
    .filter((e) => !q.trim() || sinAcentos(e.nombre + " " + e.objetivo).includes(sinAcentos(q.trim())))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return (
    <Hoja titulo={`Añadir a ${fase}`} alCerrar={alCerrar}>
      <input className="entrada" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ejercicio" aria-label="Buscar ejercicio" />
      <div className="filtro-tipos" role="radiogroup" aria-label="Filtrar por tipo">
        {[{ id: "todos", nombre: "Todos" }, ...tipos].map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={tipo === t.id} onClick={() => setTipo(t.id)}>{t.nombre}</button>
        ))}
      </div>
      <div className="lista lista-elegir">
        {visibles.map((e) => (
          <button key={e.id} type="button" className="fila fila-boton" onClick={() => alElegir(e)}>
            <span className="fila-texto"><b>{e.nombre}</b><span>{tipos.find((t) => t.id === e.tipo)?.nombre ?? "Sin tipo"}{e.duracion ? ` · ${e.duracion} min` : ""}</span></span>
            {yaEnFase.has(e.id) ? <IcoCheck className="marca" /> : <IcoMas className="marca" />}
          </button>
        ))}
        {visibles.length === 0 && <p className="suave" style={{ padding: 14 }}>No hay ejercicios con ese filtro.</p>}
      </div>
      <div className="hoja-acciones">
        <button className="btn btn-gris" type="button" onClick={irNuevo}>Crear ejercicio</button>
        <button className="btn btn-principal" type="button" onClick={alCerrar}>Listo</button>
      </div>
    </Hoja>
  );
}

function HojaBloque({ bloque, ejercicio, fases, alCerrar, alGuardar, alQuitar }: {
  bloque: Bloque; ejercicio?: Ejercicio; fases: { id: string; nombre: string }[];
  alCerrar: () => void; alGuardar: (b: Bloque) => void; alQuitar: () => void;
}) {
  const [b, setB] = useState(bloque);
  const minutos = b.minutos ?? ejercicio?.duracion ?? 0;
  return (
    <Hoja titulo={ejercicio?.nombre ?? "Ejercicio"} alCerrar={alCerrar}>
      <div className="campo"><span>Minutos en esta sesión</span>
        <div className="contador-num" role="group" aria-label="Minutos">
          <button type="button" onClick={() => setB((x) => ({ ...x, minutos: Math.max(1, (x.minutos ?? ejercicio?.duracion ?? 0) - 5) }))} aria-label="5 minutos menos">−</button>
          <output>{minutos}</output>
          <button type="button" onClick={() => setB((x) => ({ ...x, minutos: Math.min(180, (x.minutos ?? ejercicio?.duracion ?? 0) + 5) }))} aria-label="5 minutos más">+</button>
        </div>
        {ejercicio?.duracion != null && b.minutos != null && b.minutos !== ejercicio.duracion && (
          <button className="btn btn-texto" type="button" onClick={() => setB({ ...b, minutos: null })}>Volver a los {ejercicio.duracion} min del ejercicio</button>
        )}
      </div>
      <div className="campo"><span>Fase</span>
        <Opciones etiqueta="Fase" valor={b.faseId} cambiar={(v) => setB({ ...b, faseId: v })} opciones={fases.map((f) => ({ valor: f.id, texto: f.nombre }))} />
      </div>
      <label className="campo"><span>Nota para esta sesión <small className="suave">(opcional)</small></span>
        <input className="entrada" value={b.notas} onChange={(e) => setB({ ...b, notas: e.target.value })} maxLength={120} placeholder="Por ejemplo: a dos toques" />
      </label>
      <div className="hoja-acciones">
        <button className="btn btn-gris" type="button" onClick={alQuitar}><IcoPapelera /> Quitar</button>
        <button className="btn btn-principal" type="button" onClick={() => alGuardar(b)}>Listo</button>
      </div>
    </Hoja>
  );
}
