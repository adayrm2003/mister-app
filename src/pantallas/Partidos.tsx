import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useColeccion, useEquipo } from "../ContextoEquipo";
import { Opciones } from "../componentes/Controles";
import { IcoAtras, IcoMas, IcoPapelera, IcoPartidos } from "../componentes/Iconos";
import { Hoja, useUi } from "../componentes/ui";
import { COMPETICIONES, nuevoId, type Partido } from "../datos/modelo";
import Alineacion from "./Alineacion";
import PartidoEnJuego from "./PartidoEnJuego";
import { resultado } from "../datos/partido";
import "./partidos.css";

const dos = (n: number) => String(n).padStart(2, "0");
export const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`; };
export const fechaLarga = (f: string) => new Date(f + "T12:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
const diaMes = (f: string) => { const d = new Date(f + "T12:00"); return { dia: d.getDate(), mes: d.toLocaleDateString("es-ES", { month: "short" }).replace(".", "").toUpperCase() }; };

export default function Partidos() {
  const { equipo } = useEquipo();
  const { filas: partidos, cargando, guardar } = useColeccion<Partido>("partidos");
  const [params, setParams] = useSearchParams();
  const [nuevo, setNuevo] = useState<Partido | null>(null);
  const ir = useNavigate();

  const crear = (fecha = hoyISO()) => setNuevo({ id: nuevoId(), equipoId: equipo.id, rival: "", fecha, hora: "10:00", campo: "", casa: true, competicion: "Liga", notas: "", alineacion: null });
  // Desde Inicio: "Apuntar partido" abre directamente el formulario
  useEffect(() => { if (params.get("nuevo")) { crear(params.get("fecha") || undefined); setParams({}, { replace: true }); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hoy = hoyISO();
  const proximos = partidos.filter((p) => p.fecha >= hoy).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const pasados = partidos.filter((p) => p.fecha < hoy).sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));

  return (
    <main className="pagina">
      <h1>Partidos</h1>
      <button className="btn btn-peto btn-grande btn-ancho" type="button" onClick={() => crear()}><IcoMas /> Apuntar partido</button>

      {!cargando && partidos.length === 0 && (
        <div className="vacio tarjeta">
          <IcoPartidos />
          <h3>Aún no hay partidos</h3>
          <p>Apunta el próximo partido con el rival, la fecha y el campo. Luego podrás hacer la alineación.</p>
        </div>
      )}
      {proximos.length > 0 && <ListaPartidos titulo="Próximos" partidos={proximos} />}
      {pasados.length > 0 && <ListaPartidos titulo="Jugados" partidos={pasados} />}

      {nuevo && (
        <FormPartido partido={nuevo} titulo="Nuevo partido" alCerrar={() => setNuevo(null)}
          alGuardar={async (p) => { await guardar(p); setNuevo(null); ir(`/partidos/${p.id}`); }} />
      )}
    </main>
  );
}

function ListaPartidos({ titulo, partidos }: { titulo: string; partidos: Partido[] }) {
  return (
    <section className="grupo-partidos">
      <h2 className="etiqueta">{titulo}</h2>
      <div className="lista">
        {partidos.map((p) => {
          const { dia, mes } = diaMes(p.fecha);
          return (
            <Link key={p.id} to={`/partidos/${p.id}`} className="fila fila-partido">
              <span className="fecha-bloque"><b>{dia}</b><small>{mes}</small></span>
              <span className="fila-texto">
                <b>vs {p.rival}</b>
                <span>{p.hora} · {p.competicion}{p.campo ? " · " + p.campo : ""}</span>
              </span>
              {(p.acciones ?? []).length || p.reloj?.terminado ? (() => { const r = resultado(p); return <span className={"marcador-mini " + r.signo}>{r.nuestros}–{r.suyos}</span>; })()
                : <span className={"pastilla " + (p.casa ? "pastilla-ok" : "")}>{p.casa ? "Casa" : "Fuera"}</span>}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function FormPartido({ partido, titulo, alCerrar, alGuardar, alBorrar }: {
  partido: Partido; titulo: string; alCerrar: () => void; alGuardar: (p: Partido) => Promise<void>; alBorrar?: () => void;
}) {
  const [p, setP] = useState(partido);
  const [otraComp, setOtraComp] = useState(COMPETICIONES.includes(partido.competicion) ? "" : partido.competicion);
  const [error, setError] = useState("");
  const set = (c: Partial<Partido>) => setP((x) => ({ ...x, ...c }));
  const esOtra = !COMPETICIONES.includes(p.competicion);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!p.rival.trim()) return setError("Escribe el nombre del rival.");
    if (!p.fecha) return setError("Elige la fecha.");
    const competicion = esOtra ? otraComp.trim() || "Otra" : p.competicion;
    await alGuardar({ ...p, rival: p.rival.trim(), campo: p.campo.trim(), notas: p.notas.trim(), competicion });
  }

  return (
    <Hoja titulo={titulo} alCerrar={alCerrar}>
      <form className="formulario" onSubmit={enviar} noValidate>
        <label className="campo"><span>Rival</span>
          <input className="entrada" value={p.rival} onChange={(e) => set({ rival: e.target.value })} placeholder="Nombre del equipo rival" maxLength={40} autoCapitalize="words" />
        </label>
        <div className="dos-columnas">
          <label className="campo"><span>Fecha</span><input className="entrada" type="date" value={p.fecha} onChange={(e) => set({ fecha: e.target.value })} /></label>
          <label className="campo"><span>Hora</span><input className="entrada" type="time" value={p.hora} onChange={(e) => set({ hora: e.target.value })} /></label>
        </div>
        <div className="campo"><span>¿Dónde jugamos?</span>
          <Opciones etiqueta="Casa o fuera" valor={p.casa ? "casa" : "fuera"} cambiar={(v) => set({ casa: v === "casa" })} columnas={2}
            opciones={[{ valor: "casa", texto: "En casa" }, { valor: "fuera", texto: "Fuera" }]} />
        </div>
        <label className="campo"><span>Campo</span><input className="entrada" value={p.campo} onChange={(e) => set({ campo: e.target.value })} placeholder="Por ejemplo: Campo Municipal" maxLength={60} /></label>
        <div className="campo"><span>Competición</span>
          <Opciones etiqueta="Competición" valor={esOtra ? "otra" : p.competicion} cambiar={(v) => set({ competicion: v === "otra" ? otraComp || "Otra" : v })} columnas={3}
            opciones={[...COMPETICIONES.map((c) => ({ valor: c, texto: c })), { valor: "otra", texto: "Otra" }]} />
          {esOtra && <input className="entrada" value={otraComp} onChange={(e) => setOtraComp(e.target.value)} placeholder="Nombre de la competición" maxLength={30} aria-label="Nombre de la competición" />}
        </div>
        <label className="campo"><span>Notas <small className="suave">(opcional)</small></span>
          <textarea className="entrada area" rows={2} value={p.notas} onChange={(e) => set({ notas: e.target.value })} maxLength={500} />
        </label>
        {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
        <div className="hoja-acciones">
          {alBorrar
            ? <button className="btn btn-gris" type="button" onClick={alBorrar}><IcoPapelera /> Borrar</button>
            : <button className="btn btn-gris cerrar-hoja" type="button" onClick={alCerrar}>Cancelar</button>}
          <button className="btn btn-principal" type="submit">Guardar</button>
        </div>
      </form>
    </Hoja>
  );
}

/** Ficha de un partido: datos y alineación (los goles, cambios y tarjetas llegan en la fase 8). */
export function PartidoDetalle() {
  const { id, seccion } = useParams();
  const { filas: partidos, cargando, guardar, borrar } = useColeccion<Partido>("partidos");
  const [editando, setEditando] = useState(false);
  const { confirmar, avisar } = useUi();
  const ir = useNavigate();
  const partido = partidos.find((p) => p.id === id);

  if (cargando) return <main className="pagina" />;
  if (!partido) return (
    <main className="pagina"><div className="vacio tarjeta"><h3>No se encuentra este partido</h3><Link className="btn btn-principal" to="/partidos">Ver partidos</Link></div></main>
  );

  const enAlineacion = seccion === "alineacion";
  const enJuego = seccion === "partido";
  const enDatos = !enAlineacion && !enJuego;
  return (
    <main className="pagina partido">
      <div className="partido-cabeza">
        <Link to="/partidos" className="btn btn-icono" aria-label="Volver a partidos"><IcoAtras /></Link>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span className="etiqueta">{partido.competicion} · {partido.casa ? "En casa" : "Fuera"}</span>
          <h1 className="partido-rival">vs {partido.rival}</h1>
        </div>
      </div>
      <div className="segmentos-dir" role="tablist" aria-label="Secciones del partido">
        <button role="tab" type="button" aria-selected={enDatos} onClick={() => ir(`/partidos/${partido.id}`, { replace: true })}>Datos</button>
        <button role="tab" type="button" aria-selected={enAlineacion} onClick={() => ir(`/partidos/${partido.id}/alineacion`, { replace: true })}>Alineación</button>
        <button role="tab" type="button" aria-selected={enJuego} onClick={() => ir(`/partidos/${partido.id}/partido`, { replace: true })}>Partido</button>
      </div>

      {enAlineacion ? (
        <Alineacion partido={partido} guardarPartido={guardar} />
      ) : enJuego ? (
        <PartidoEnJuego partido={partido} guardarPartido={guardar} />
      ) : (
        <section className="datos-partido tarjeta">
          <dl>
            <div><dt>Fecha</dt><dd>{fechaLarga(partido.fecha)}</dd></div>
            <div><dt>Hora</dt><dd>{partido.hora}</dd></div>
            <div><dt>Campo</dt><dd>{partido.campo || "—"}</dd></div>
            <div><dt>Juega</dt><dd>{partido.casa ? "En casa" : "Fuera"}</dd></div>
            {partido.notas && <div className="ancho"><dt>Notas</dt><dd>{partido.notas}</dd></div>}
          </dl>
          <div className="datos-acciones">
            <button className="btn btn-borde" type="button" onClick={() => setEditando(true)}>Editar datos</button>
            <button className="btn btn-principal" type="button" onClick={() => ir(`/partidos/${partido.id}/alineacion`, { replace: true })}>
              {partido.alineacion ? "Ver alineación" : "Hacer alineación"}
            </button>
          </div>
          <button className="btn btn-peto btn-grande" type="button" onClick={() => ir(`/partidos/${partido.id}/partido`, { replace: true })}>
            {(partido.acciones ?? []).length || partido.reloj ? `Resultado ${resultado(partido).nuestros} – ${resultado(partido).suyos} · ver partido` : "Apuntar goles, cambios y tarjetas"}
          </button>
        </section>
      )}

      {editando && (
        <FormPartido partido={partido} titulo="Editar partido" alCerrar={() => setEditando(false)}
          alGuardar={async (p) => { await guardar(p); setEditando(false); avisar("Partido guardado"); }}
          alBorrar={async () => {
            if (await confirmar({ titulo: `¿Borrar el partido contra ${partido.rival}?`, texto: "Se borrará también su alineación. Esto no se puede deshacer." })) {
              await borrar(partido.id); setEditando(false); avisar("Partido borrado"); ir("/partidos", { replace: true });
            }
          }} />
      )}
    </main>
  );
}
