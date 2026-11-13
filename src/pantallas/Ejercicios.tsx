import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEquipo, useMios } from "../ContextoEquipo";
import Pizarra, { PizarraMini } from "../componentes/Pizarra";
import { Opciones } from "../componentes/Controles";
import { IcoAtras, IcoEjercicios, IcoLapiz, IcoMas, IcoPapelera } from "../componentes/Iconos";
import { useUi } from "../componentes/ui";
import { ejerciciosDeEjemplo } from "../datos/ejemplos";
import { copiarEjercicio, ejercicioVacio, type Ejercicio } from "../datos/pizarra";
import { SelectorBiblioteca } from "./Sesiones";
import { SelectorEjercicios } from "./Biblioteca";
import "./ejercicios.css";

const tieneDibujo = (e: Ejercicio) => e.pizarra.piezas.length > 0;
const sinAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function useNombreTipo() {
  const { ajustes } = useEquipo();
  return (id: string) => ajustes.tiposEjercicio.find((t) => t.id === id)?.nombre ?? "Sin tipo";
}

/* ---------------- Biblioteca ---------------- */
export default function Ejercicios() {
  const { ajustes, ajustesListos, cambiarAjustesUsuario } = useEquipo();
  const { filas, cargando, guardar } = useMios<Ejercicio>("ejercicios");
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("todos");
  const nombreTipo = useNombreTipo();
  const ir = useNavigate();
  const sembrando = useRef(false);

  // La primera vez, la biblioteca se llena con los ejercicios de ejemplo
  useEffect(() => {
    if (cargando || !ajustesListos || ajustes.ejemplosCargados || sembrando.current) return;
    sembrando.current = true;
    (async () => {
      if (filas.length === 0) for (const e of ejerciciosDeEjemplo()) await guardar(e);
      cambiarAjustesUsuario({ ejemplosCargados: true });
    })();
  }, [cargando, ajustesListos, ajustes.ejemplosCargados, filas.length, guardar, cambiarAjustesUsuario]);

  const visibles = useMemo(() => {
    const q = sinAcentos(busqueda.trim());
    return filas
      .filter((e) => tipo === "todos" || e.tipo === tipo)
      .filter((e) => !q || sinAcentos([e.nombre, e.objetivo, e.explicacion, e.material].join(" ")).includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [filas, busqueda, tipo]);

  return (
    <main className="pagina pagina-ancha">
      <SelectorBiblioteca />
      <SelectorEjercicios />
      <div className="titulo-con-accion">
        <h1>Ejercicios</h1>
        <span className="pastilla">{filas.length} en tu biblioteca</span>
      </div>
      <button className="btn btn-peto btn-grande btn-ancho" type="button" onClick={() => ir("/ejercicios/nuevo")}><IcoMas /> Nuevo ejercicio</button>

      <div className="buscador">
        <input className="entrada" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, objetivo o material" aria-label="Buscar ejercicios" />
      </div>
      <div className="filtro-tipos" role="radiogroup" aria-label="Filtrar por tipo">
        {[{ id: "todos", nombre: "Todos" }, ...ajustes.tiposEjercicio].map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={tipo === t.id} onClick={() => setTipo(t.id)}>{t.nombre}</button>
        ))}
      </div>

      {!cargando && visibles.length === 0 && (
        <div className="vacio tarjeta">
          <IcoEjercicios />
          <h3>{filas.length ? "Ningún ejercicio coincide" : "Tu biblioteca está vacía"}</h3>
          <p>{filas.length ? "Prueba con otra palabra o quita el filtro de tipo." : "Crea tu primer ejercicio con la pizarra."}</p>
        </div>
      )}

      <div className="tarjetas-ejercicio">
        {visibles.map((e) => (
          <Link key={e.id} to={`/ejercicios/${e.id}`} className="tarjeta-ejercicio tarjeta">
            <div className="tarjeta-ejercicio-texto">
              <div className="tarjeta-ejercicio-cabeza">
                <span className="pastilla">{nombreTipo(e.tipo)}</span>
                <small>{[e.duracion && `${e.duracion} min`, e.jugadores && `${e.jugadores} jug.`].filter(Boolean).join(" · ")}</small>
              </div>
              <b>{e.nombre}</b>
              {e.objetivo && <p>{e.objetivo}</p>}
            </div>
            {tieneDibujo(e) && <div className="tarjeta-ejercicio-mini"><PizarraMini pizarra={e.pizarra} colorEquipo={ajustes.colorEquipo} colorRival={ajustes.colorRival} /></div>}
          </Link>
        ))}
      </div>
    </main>
  );
}

/* ---------------- Ficha de un ejercicio ---------------- */
export function EjercicioDetalle() {
  const { id } = useParams();
  const { ajustes } = useEquipo();
  const { filas, cargando, guardar, borrar } = useMios<Ejercicio>("ejercicios");
  const { confirmar, avisar } = useUi();
  const nombreTipo = useNombreTipo();
  const ir = useNavigate();
  const e = filas.find((x) => x.id === id);

  if (cargando) return <main className="pagina" />;
  if (!e) return <main className="pagina"><div className="vacio tarjeta"><h3>No se encuentra este ejercicio</h3><Link className="btn btn-principal" to="/ejercicios">Ver ejercicios</Link></div></main>;

  async function duplicar() {
    const copia = copiarEjercicio(e!, `${e!.nombre} (copia)`);
    await guardar(copia);
    avisar("Ejercicio duplicado");
    ir(`/ejercicios/${copia.id}/editar`);
  }
  async function eliminar() {
    if (!(await confirmar({ titulo: `¿Borrar «${e!.nombre}»?`, texto: "Se quitará de tu biblioteca. Esto no se puede deshacer." }))) return;
    await borrar(e!.id);
    avisar("Ejercicio borrado");
    ir("/ejercicios", { replace: true });
  }

  const datos: [string, string][] = [
    ["Objetivo", e.objetivo], ["Duración", e.duracion ? `${e.duracion} minutos` : ""], ["Jugadores", e.jugadores ? String(e.jugadores) : ""],
    ["Material", e.material], ["Explicación", e.explicacion], ["Notas", e.notas]
  ];
  return (
    <main className="pagina pagina-ancha ejercicio-detalle">
      <div className="partido-cabeza">
        <Link to="/ejercicios" className="btn btn-icono" aria-label="Volver a ejercicios"><IcoAtras /></Link>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span className="etiqueta">{nombreTipo(e.tipo)}</span>
          <h1 className="titulo-ejercicio">{e.nombre}</h1>
        </div>
      </div>
      <div className="ejercicio-cuerpo">
        {tieneDibujo(e) ? (
          <Pizarra pizarra={e.pizarra} titulo={e.nombre} colorEquipo={ajustes.colorEquipo} colorRival={ajustes.colorRival} />
        ) : (
          <div className="sin-dibujo tarjeta">
            <p>Este ejercicio no tiene dibujo.</p>
            <button className="btn btn-borde" type="button" onClick={() => ir(`/ejercicios/${e.id}/editar`)}>Dibujarlo en la pizarra</button>
          </div>
        )}
        <div className="ejercicio-lateral">
          <dl className="ficha-ejercicio tarjeta">
            {datos.filter(([, v]) => v).map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{k === "Explicación" ? <Apartados texto={v} /> : v}</dd></div>
            ))}
            {datos.every(([, v]) => !v) && <p className="suave">Sin más datos. Puedes añadirlos con «Editar».</p>}
          </dl>
          <div className="acciones-ejercicio">
            <button className="btn btn-principal btn-grande" type="button" onClick={() => ir(`/ejercicios/${e.id}/editar`)}><IcoLapiz /> Editar</button>
            <button className="btn btn-borde btn-grande" type="button" onClick={duplicar}>Duplicar</button>
            <button className="btn btn-texto peligro" type="button" onClick={eliminar}><IcoPapelera /> Borrar ejercicio</button>
          </div>
        </div>
      </div>
    </main>
  );
}

/** Muestra "Organización: ..." en líneas separadas con el apartado en negrita. */
export function Apartados({ texto }: { texto: string }) {
  return (
    <span className="apartados">
      {texto.split(/\r?\n/).filter((l) => l.trim()).map((l, i) => {
        const m = l.match(/^([^:]{2,24}):\s*(.*)$/);
        return <span key={i} className="apartado-linea">{m ? <><b>{m[1]}:</b> {m[2]}</> : l}</span>;
      })}
    </span>
  );
}

/* ---------------- Crear y editar ---------------- */
export function EditorEjercicio() {
  const { id } = useParams();
  const { ajustes } = useEquipo();
  const { filas, cargando, guardar } = useMios<Ejercicio>("ejercicios");
  const { confirmar, avisar } = useUi();
  const ir = useNavigate();
  const [e, setE] = useState<Ejercicio | null>(null);
  const [original, setOriginal] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (e || cargando) return;
    const base = id ? filas.find((x) => x.id === id) : ejercicioVacio(ajustes.tiposEjercicio[0]?.id ?? "");
    if (base) { setE(structuredClone(base)); setOriginal(JSON.stringify(base)); }
  }, [cargando, filas, id, e, ajustes.tiposEjercicio]);

  if (cargando || !e) return <main className="pagina" />;
  const set = (c: Partial<Ejercicio>) => setE((x) => ({ ...x!, ...c }));
  const numero = (t: string) => (t.trim() === "" ? null : Math.max(0, Math.min(999, Number(t.replace(/\D/g, "")))));

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    if (!e!.nombre.trim()) { setError("Ponle un nombre al ejercicio."); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const final = { ...e!, nombre: e!.nombre.trim(), actualizado: new Date().toISOString() };
    await guardar(final);
    avisar("Ejercicio guardado");
    ir(`/ejercicios/${final.id}`, { replace: true });
  }
  async function salir() {
    if (JSON.stringify(e) !== original && !(await confirmar({ titulo: "¿Salir sin guardar?", texto: "Perderás los cambios de este ejercicio.", boton: "Salir sin guardar" }))) return;
    ir(id ? `/ejercicios/${id}` : "/ejercicios");
  }

  return (
    <form className="pagina pagina-ancha editor-ejercicio" onSubmit={enviar} noValidate>
      <div className="partido-cabeza">
        <button className="btn btn-icono" type="button" onClick={salir} aria-label="Salir del editor"><IcoAtras /></button>
        <h1 style={{ flex: 1 }}>{id ? "Editar ejercicio" : "Nuevo ejercicio"}</h1>
      </div>

      <label className="campo"><span>Nombre</span>
        <input className="entrada" value={e.nombre} onChange={(x) => { set({ nombre: x.target.value }); setError(""); }} maxLength={60} placeholder="Por ejemplo: Rondo 5 contra 2" />
      </label>
      {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}

      <div className="ejercicio-cuerpo">
        <div className="editor-pizarra">
          <Pizarra pizarra={e.pizarra} cambiar={(p) => set({ pizarra: p })} titulo={e.nombre} colorEquipo={ajustes.colorEquipo} colorRival={ajustes.colorRival} />
        </div>
        <div className="ejercicio-lateral formulario">
          <div className="campo"><span>Tipo</span>
            <Opciones etiqueta="Tipo de ejercicio" valor={e.tipo} cambiar={(v) => set({ tipo: v })} opciones={ajustes.tiposEjercicio.map((t) => ({ valor: t.id, texto: t.nombre }))} />
          </div>
          <label className="campo"><span>Objetivo</span>
            <input className="entrada" value={e.objetivo} onChange={(x) => set({ objetivo: x.target.value })} maxLength={140} />
          </label>
          <div className="dos-columnas">
            <label className="campo"><span>Duración (min)</span>
              <input className="entrada" inputMode="numeric" value={e.duracion ?? ""} onChange={(x) => set({ duracion: numero(x.target.value) })} placeholder="—" />
            </label>
            <label className="campo"><span>Nº de jugadores</span>
              <input className="entrada" inputMode="numeric" value={e.jugadores ?? ""} onChange={(x) => set({ jugadores: numero(x.target.value) })} placeholder="—" />
            </label>
          </div>
          <label className="campo"><span>Material</span>
            <input className="entrada" value={e.material} onChange={(x) => set({ material: x.target.value })} maxLength={140} placeholder="Conos, petos, balones…" />
          </label>
          <label className="campo"><span>Explicación</span>
            <textarea className="entrada area" rows={6} value={e.explicacion} onChange={(x) => set({ explicacion: x.target.value })} maxLength={2500}
              placeholder={["Organización: …", "Desarrollo: …", "Reglas: …", "Variantes: …", "Consignas: …"].join("\n")} />
          </label>
          <label className="campo"><span>Notas <small className="suave">(opcional)</small></span>
            <textarea className="entrada area" rows={2} value={e.notas} onChange={(x) => set({ notas: x.target.value })} maxLength={600} />
          </label>
        </div>
      </div>

      <div className="barra-guardar">
        <button className="btn btn-gris" type="button" onClick={salir}>Cancelar</button>
        <button className="btn btn-principal" type="submit">Guardar ejercicio</button>
      </div>
    </form>
  );
}
