// Biblioteca Míster: los ejercicios que trae la app, con buscador, filtros y ficha.
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate, useParams } from "react-router-dom";
import { useEquipo, useMios } from "../ContextoEquipo";
import { Opciones } from "../componentes/Controles";
import { IcoAtras, IcoCheck, IcoEjercicios, IcoMas } from "../componentes/Iconos";
import { Hoja, mensajeDe, useUi } from "../componentes/ui";
import { api } from "../datos/api";
import {
  DURACIONES_FILTRO, FASES_JUEGO, FILTROS_VACIOS, INTENSIDADES, NIVELES, aEjercicioPropio, fasePara, filtrar, filtrosActivos,
  nombreFase, nombreIntensidad, nombreNivel, textoJugadores, tiposDe, type Duracion, type EjercicioCatalogo, type Filtros, type Intensidad, type Nivel
} from "../datos/catalogo";
import type { Ejercicio } from "../datos/pizarra";
import { sesionVacia, type Sesion } from "../datos/sesion";
import { SelectorBiblioteca } from "./Sesiones";
import "./ejercicios.css";

/* ---------- Datos: se leen una vez y se guardan mientras la app está abierta ---------- */
let enMemoria: Promise<EjercicioCatalogo[]> | null = null;
function useCatalogo() {
  const [lista, setLista] = useState<EjercicioCatalogo[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let vivo = true;
    enMemoria ??= api.catalogoEjercicios();
    enMemoria.then((l) => vivo && setLista(l)).catch((e) => { enMemoria = null; if (vivo) { setError(mensajeDe(e)); setLista([]); } });
    return () => { vivo = false; };
  }, []);
  return { lista, error };
}

/** Pestañas "Mis ejercicios" / "Biblioteca Míster" dentro de Ejercicios. */
export function SelectorEjercicios({ total }: { total?: number }) {
  return (
    <nav className="sub-selector" aria-label="Qué ejercicios ver">
      <NavLink to="/ejercicios" end className={({ isActive }) => (isActive ? "activo" : "")}>Mis ejercicios</NavLink>
      <NavLink to="/ejercicios/biblioteca" end className={({ isActive }) => (isActive ? "activo" : "")}>Biblioteca Míster{total ? ` · ${total}` : ""}</NavLink>
    </nav>
  );
}

const CLAVE_FILTROS = "mister-filtros-biblioteca";
const leerFiltros = (): Filtros => { try { return { ...FILTROS_VACIOS, ...JSON.parse(sessionStorage.getItem(CLAVE_FILTROS) ?? "{}") }; } catch { return FILTROS_VACIOS; } };

/* ---------- Lista ---------- */
export default function Biblioteca() {
  const { lista, error } = useCatalogo();
  const [f, setF] = useState<Filtros>(leerFiltros);
  const [abierto, setAbierto] = useState(false);
  useEffect(() => { try { sessionStorage.setItem(CLAVE_FILTROS, JSON.stringify(f)); } catch { /* nada */ } }, [f]);
  const set = (c: Partial<Filtros>) => setF((x) => ({ ...x, ...c }));

  const tipos = useMemo(() => tiposDe(lista ?? []), [lista]);
  const visibles = useMemo(() => filtrar(lista ?? [], f), [lista, f]);
  const n = filtrosActivos({ ...f, tipo: null });

  return (
    <main className="pagina pagina-ancha biblioteca">
      <SelectorBiblioteca />
      <SelectorEjercicios total={lista?.length} />
      <div className="titulo-con-accion">
        <h1>Biblioteca</h1>
        {lista && <span className="pastilla">{visibles.length === lista.length ? `${lista.length} ejercicios` : `${visibles.length} de ${lista.length}`}</span>}
      </div>
      <p className="suave">Ejercicios listos para usar. Cópialos a tus ejercicios para cambiarlos o añádelos directamente a una sesión.</p>

      <div className="buscador-con-filtros">
        <input id="buscar-biblioteca" className="entrada" type="search" value={f.texto} onChange={(e) => set({ texto: e.target.value })} placeholder="Buscar por nombre u objetivo" aria-label="Buscar en la biblioteca" />
        <button className={"btn " + (n ? "btn-principal" : "btn-gris")} type="button" onClick={() => setAbierto(true)} aria-label={n ? `Filtros (${n} activos)` : "Filtros"}>
          Filtros{n ? ` · ${n}` : ""}
        </button>
      </div>
      <div className="filtro-tipos" role="radiogroup" aria-label="Filtrar por tipo">
        {[null, ...tipos].map((t) => (
          <button key={t ?? "todos"} type="button" role="radio" aria-checked={f.tipo === t} onClick={() => set({ tipo: t })}>{t ?? "Todos"}</button>
        ))}
      </div>

      {error && <p className="mensaje mensaje-error">{error}</p>}
      {lista && visibles.length === 0 && (
        <div className="vacio tarjeta">
          <IcoEjercicios />
          <h3>Ningún ejercicio coincide</h3>
          <p>Prueba con otra palabra o quita algún filtro.</p>
          <button className="btn btn-borde" type="button" onClick={() => setF(FILTROS_VACIOS)}>Quitar filtros</button>
        </div>
      )}

      <div className="tarjetas-ejercicio">
        {visibles.map((e) => (
          <Link key={e.id} to={`/ejercicios/biblioteca/${e.id}`} className="tarjeta-ejercicio tarjeta">
            <div className="tarjeta-ejercicio-texto">
              <div className="tarjeta-ejercicio-cabeza">
                <span className="pastilla">{e.tipo}</span>
                <small>{[e.duracion && `${e.duracion} min`, textoJugadores(e) && `${textoJugadores(e)} jug.`, nombreIntensidad(e.intensidad)].filter(Boolean).join(" · ")}</small>
              </div>
              <b>{e.nombre}</b>
              {e.objetivo && <p>{e.objetivo}</p>}
            </div>
          </Link>
        ))}
      </div>

      {abierto && <HojaFiltros filtros={f} cambiar={set} limpiar={() => setF((x) => ({ ...FILTROS_VACIOS, texto: x.texto, tipo: x.tipo }))} resultados={visibles.length} alCerrar={() => setAbierto(false)} />}
    </main>
  );
}

function HojaFiltros({ filtros: f, cambiar, limpiar, resultados, alCerrar }: { filtros: Filtros; cambiar: (c: Partial<Filtros>) => void; limpiar: () => void; resultados: number; alCerrar: () => void }) {
  const TODOS = "todos";
  const conTodos = <T extends string>(ops: { valor: T; texto: string }[], todos = "Todos") => [{ valor: TODOS, texto: todos }, ...ops];
  return (
    <Hoja titulo="Filtros" alCerrar={alCerrar}>
      <div className="campo"><span>Nivel</span>
        <Opciones etiqueta="Nivel" valor={f.nivel ?? TODOS} columnas={2} cambiar={(v) => cambiar({ nivel: v === TODOS ? null : (v as Nivel) })} opciones={conTodos(NIVELES)} />
      </div>
      <div className="campo"><span>Fase de juego</span>
        <Opciones etiqueta="Fase de juego" valor={f.fase ?? TODOS} columnas={2} cambiar={(v) => cambiar({ fase: v === TODOS ? null : (v as Filtros["fase"]) })}
          opciones={conTodos([...FASES_JUEGO.filter((x) => !x.valor.startsWith("transicion")), { valor: "transicion", texto: "Transiciones" }], "Todas")} />
      </div>
      <div className="campo"><span>Intensidad</span>
        <Opciones etiqueta="Intensidad" valor={f.intensidad ?? TODOS} columnas={4} cambiar={(v) => cambiar({ intensidad: v === TODOS ? null : (v as Intensidad) })} opciones={conTodos(INTENSIDADES, "Todas")} />
      </div>
      <div className="campo"><span>Duración</span>
        <Opciones etiqueta="Duración" valor={f.duracion ?? TODOS} columnas={2} cambiar={(v) => cambiar({ duracion: v === TODOS ? null : (v as Duracion) })} opciones={conTodos(DURACIONES_FILTRO.map(({ valor, texto }) => ({ valor, texto })), "Cualquiera")} />
      </div>
      <label className="campo"><span>¿Cuántos jugadores tienes?</span>
        <input id="filtro-jugadores" className="entrada" inputMode="numeric" value={f.jugadores ?? ""} placeholder="Cualquier número"
          onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); cambiar({ jugadores: v ? Math.min(40, Number(v)) || null : null }); }} />
        <small className="suave">Salen los ejercicios en los que caben esos jugadores.</small>
      </label>
      <div className="hoja-acciones">
        <button className="btn btn-gris" type="button" onClick={limpiar}>Quitar filtros</button>
        <button className="btn btn-principal cerrar-hoja" type="button" onClick={alCerrar}>Ver {resultados}</button>
      </div>
    </Hoja>
  );
}

/* ---------- Ficha ---------- */
export function FichaBiblioteca() {
  const { id } = useParams();
  const { lista } = useCatalogo();
  const { ajustes } = useEquipo();
  const mios = useMios<Ejercicio>("ejercicios");
  const [anadiendo, setAnadiendo] = useState(false);
  const { avisar } = useUi();
  const ir = useNavigate();
  const e = lista?.find((x) => x.id === id);

  if (!lista) return <main className="pagina" />;
  if (!e) return <main className="pagina"><div className="vacio tarjeta"><h3>No se encuentra este ejercicio</h3><Link className="btn btn-principal" to="/ejercicios/biblioteca">Ver la biblioteca</Link></div></main>;
  const copia = mios.filas.find((x) => x.origen === e.id);

  async function copiar() {
    const nuevo = aEjercicioPropio(e!, ajustes.tiposEjercicio, copia ? `${e!.nombre} (copia)` : e!.nombre);
    try { await mios.guardar(nuevo); avisar("Copiado a tus ejercicios: cámbialo a tu gusto"); ir(`/ejercicios/${nuevo.id}/editar`); } catch { /* ya avisado */ }
  }

  const datos: [string, string][] = [
    ["Duración", e.duracion ? `${e.duracion} minutos` : ""], ["Jugadores", textoJugadores(e)], ["Espacio", e.espacio],
    ["Material", e.material], ["Intensidad", nombreIntensidad(e.intensidad)], ["Fase de juego", nombreFase(e.fase)],
    ["Nivel", e.niveles.map(nombreNivel).join(", ")]
  ];
  const listas: [string, string[]][] = [["Reglas", e.reglas], ["Puntos clave", e.puntosClave], ["Variantes", e.variantes]];

  return (
    <main className="pagina pagina-ancha ejercicio-detalle">
      <div className="partido-cabeza">
        <Link to="/ejercicios/biblioteca" className="btn btn-icono" aria-label="Volver a la biblioteca"><IcoAtras /></Link>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span className="etiqueta">{e.tipo} · Biblioteca Míster</span>
          <h1 className="titulo-ejercicio">{e.nombre}</h1>
        </div>
      </div>
      <div className="ejercicio-cuerpo">
        <div className="ficha-biblioteca">
          {e.objetivo && <section className="tarjeta bloque-ficha"><h2>Objetivo</h2><p>{e.objetivo}</p></section>}
          <section className="tarjeta bloque-ficha"><h2>Cómo se hace</h2><p>{e.descripcion}</p></section>
          {listas.filter(([, l]) => l.length).map(([t, l]) => (
            <section key={t} className="tarjeta bloque-ficha"><h2>{t}</h2><ul>{l.map((x, i) => <li key={i}>{x}</li>)}</ul></section>
          ))}
        </div>
        <div className="ejercicio-lateral">
          <dl className="ficha-ejercicio tarjeta">
            {datos.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
          <div className="acciones-ejercicio">
            <button className="btn btn-peto btn-grande" type="button" onClick={() => setAnadiendo(true)}><IcoMas /> Añadir a una sesión</button>
            <button className="btn btn-borde btn-grande" type="button" onClick={copiar}>Copiar a mis ejercicios</button>
          </div>
          {copia && <p className="suave"><IcoCheck style={{ width: 16, height: 16, verticalAlign: "-3px" }} /> Ya está en tus ejercicios: <Link to={`/ejercicios/${copia.id}`}>{copia.nombre}</Link></p>}
        </div>
      </div>
      {anadiendo && <HojaAnadirASesion ejercicio={e} copia={copia} guardarEjercicio={mios.guardar} alCerrar={() => setAnadiendo(false)} />}
    </main>
  );
}

/** Añade un ejercicio de la biblioteca a una sesión. Antes lo copia a los ejercicios del entrenador (una sola vez). */
function HojaAnadirASesion({ ejercicio, copia, guardarEjercicio, alCerrar }: { ejercicio: EjercicioCatalogo; copia?: Ejercicio; guardarEjercicio: (e: Ejercicio) => Promise<void>; alCerrar: () => void }) {
  const { ajustes } = useEquipo();
  const sesiones = useMios<Sesion>("sesiones");
  const [destino, setDestino] = useState<string>("nueva");
  const [fase, setFase] = useState(() => fasePara(ejercicio, ajustes.fases));
  const [enviando, setEnviando] = useState(false);
  const { avisar } = useUi();
  const ir = useNavigate();
  const ordenadas = [...sesiones.filas].sort((a, b) => b.actualizado.localeCompare(a.actualizado));
  useEffect(() => { if (!sesiones.cargando && ordenadas[0] && destino === "nueva") setDestino(ordenadas[0].id); }, [sesiones.cargando]); // eslint-disable-line react-hooks/exhaustive-deps

  async function anadir() {
    setEnviando(true);
    try {
      let propio = copia;
      if (!propio) { propio = aEjercicioPropio(ejercicio, ajustes.tiposEjercicio); await guardarEjercicio(propio); }
      const bloque = { id: crypto.randomUUID(), faseId: fase, ejercicioId: propio.id, minutos: null, notas: "" };
      const base = destino === "nueva" ? { ...sesionVacia(), nombre: `Sesión con ${ejercicio.nombre}`.slice(0, 60) } : sesiones.filas.find((s) => s.id === destino)!;
      const sesion: Sesion = { ...base, bloques: [...base.bloques, bloque], actualizado: new Date().toISOString() };
      await sesiones.guardar(sesion);
      avisar(destino === "nueva" ? "Sesión creada con este ejercicio" : `Añadido a «${sesion.nombre}»`);
      ir(`/sesiones/${sesion.id}`);
    } catch { setEnviando(false); }
  }

  return (
    <Hoja titulo="Añadir a una sesión" alCerrar={alCerrar}>
      <fieldset className="lista-equipos">
        <legend className="etiqueta">Sesión</legend>
        {ordenadas.map((s) => (
          <label key={s.id} className={destino === s.id ? "activo" : ""}>
            <input type="radio" name="sesion" checked={destino === s.id} onChange={() => setDestino(s.id)} />
            <b>{s.nombre || "Sesión sin nombre"}</b>
            <small className="suave">{s.bloques.length} ej.</small>
            {destino === s.id && <IcoCheck />}
          </label>
        ))}
        <label className={destino === "nueva" ? "activo" : ""}>
          <input type="radio" name="sesion" checked={destino === "nueva"} onChange={() => setDestino("nueva")} />
          <b>Nueva sesión</b>
          {destino === "nueva" && <IcoCheck />}
        </label>
      </fieldset>
      {ajustes.fases.length > 1 && (
        <div className="campo"><span>Fase de la sesión</span>
          <Opciones etiqueta="Fase de la sesión" valor={fase} cambiar={setFase} columnas={Math.min(3, ajustes.fases.length)} opciones={ajustes.fases.map((x) => ({ valor: x.id, texto: x.nombre }))} />
        </div>
      )}
      <div className="hoja-acciones">
        <button className="btn btn-gris cerrar-hoja" type="button" onClick={alCerrar}>Cancelar</button>
        <button className="btn btn-principal" type="button" onClick={anadir} disabled={enviando}>{enviando ? "Añadiendo…" : "Añadir"}</button>
      </div>
    </Hoja>
  );
}
