// Modo torneo: varios partidos (normalmente el mismo día) con una sola convocatoria.
// Los minutos se suman en todo el torneo y el reparto de cada partido tiene en cuenta los anteriores.
import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useColeccion, useEquipo } from "../ContextoEquipo";
import { Opciones } from "../componentes/Controles";
import { IcoAtras, IcoMas, IcoPapelera } from "../componentes/Iconos";
import { Hoja, useUi } from "../componentes/ui";
import { nuevoId, tiempoDePartido, type Jugador, type Partido } from "../datos/modelo";
import { minutosFinales, resultado } from "../datos/partido";
import { HojaConvocatoria, convocadosIniciales } from "./Convocatoria";
import { FormPartido, fechaLarga, hoyISO } from "./Partidos";
import "./partidos.css";
import "./plan-minutos.css";

const orden = (a: Partido, b: Partido) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora);

/** Crear un torneo con sus partidos de una vez. */
export function HojaNuevoTorneo({ alCerrar }: { alCerrar: () => void }) {
  const { equipo } = useEquipo();
  const { guardar } = useColeccion<Partido>("partidos");
  const ir = useNavigate();
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [campo, setCampo] = useState("");
  const [casa, setCasa] = useState(true);
  const [partidos, setPartidos] = useState([{ rival: "", hora: "10:00" }, { rival: "", hora: "11:00" }]);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const cambiar = (i: number, c: Partial<{ rival: string; hora: string }>) => setPartidos((l) => l.map((x, k) => (k === i ? { ...x, ...c } : x)));

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return setError("Ponle un nombre al torneo.");
    const validos = partidos.filter((p) => p.rival.trim());
    if (!validos.length) return setError("Escribe al menos un rival.");
    setOcupado(true);
    const torneo = { id: nuevoId(), nombre: nombre.trim().slice(0, 40) };
    for (const p of validos) {
      await guardar({ id: nuevoId(), equipoId: equipo.id, rival: p.rival.trim(), fecha, hora: p.hora, campo: campo.trim(), casa, competicion: "Torneo", notas: "", alineacion: null, torneo });
    }
    setOcupado(false);
    alCerrar();
    ir(`/torneos/${torneo.id}`);
  }

  return (
    <Hoja titulo="Nuevo torneo" alCerrar={alCerrar}>
      <form className="formulario" onSubmit={enviar} noValidate>
        <label className="campo"><span>Nombre del torneo</span>
          <input className="entrada" value={nombre} maxLength={40} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Torneo de Navidad" autoCapitalize="words" />
        </label>
        <div className="dos-columnas">
          <label className="campo"><span>Fecha</span><input className="entrada" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
          <label className="campo"><span>Campo</span><input className="entrada" value={campo} maxLength={60} onChange={(e) => setCampo(e.target.value)} placeholder="Dónde se juega" /></label>
        </div>
        <div className="campo"><span>¿Dónde jugamos?</span>
          <Opciones etiqueta="Casa o fuera" valor={casa ? "casa" : "fuera"} cambiar={(v) => setCasa(v === "casa")} columnas={2}
            opciones={[{ valor: "casa", texto: "En casa" }, { valor: "fuera", texto: "Fuera" }]} />
        </div>
        <div className="campo"><span>Partidos</span>
          <ul className="partidos-torneo-nuevo">
            {partidos.map((p, i) => (
              <li key={i}>
                <input className="entrada hora-torneo" type="time" value={p.hora} onChange={(e) => cambiar(i, { hora: e.target.value })} aria-label={`Hora del partido ${i + 1}`} />
                <input className="entrada" value={p.rival} maxLength={40} onChange={(e) => cambiar(i, { rival: e.target.value })} placeholder={`Rival ${i + 1}`} aria-label={`Rival del partido ${i + 1}`} />
                {partidos.length > 1 && <button type="button" className="btn btn-icono" aria-label={`Quitar el partido ${i + 1}`} onClick={() => setPartidos((l) => l.filter((_, k) => k !== i))}><IcoPapelera /></button>}
              </li>
            ))}
          </ul>
          {partidos.length < 8 && (
            <button type="button" className="btn btn-borde" onClick={() => setPartidos((l) => [...l, { rival: "", hora: siguienteHora(l[l.length - 1]?.hora) }])}><IcoMas /> Añadir partido</button>
          )}
        </div>
        {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
        <div className="hoja-acciones">
          <button className="btn btn-gris" type="button" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-principal" type="submit" disabled={ocupado}>Crear torneo</button>
        </div>
      </form>
    </Hoja>
  );
}

const siguienteHora = (h?: string) => {
  if (!h) return "10:00";
  const [a, b] = h.split(":").map(Number);
  const t = a * 60 + b + 60;
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

/** Página del torneo: sus partidos, la convocatoria única y los minutos sumados. */
export default function PaginaTorneo() {
  const { id } = useParams();
  const { equipo, ajustes } = useEquipo();
  const { confirmar, avisar } = useUi();
  const ir = useNavigate();
  const { filas, cargando, guardar, borrar } = useColeccion<Partido>("partidos");
  const { filas: jugadores } = useColeccion<Jugador>("jugadores");
  const [hoja, setHoja] = useState<null | "convocatoria" | "nuevo" | "nombre">(null);
  const [nombre, setNombre] = useState("");
  const partidos = useMemo(() => filas.filter((p) => p.torneo?.id === id).sort(orden), [filas, id]);
  const { partes, minutos } = tiempoDePartido(ajustes);
  const porId = new Map(jugadores.map((j) => [j.id, j]));

  if (cargando) return <main className="pagina" />;
  if (!partidos.length) return (
    <main className="pagina"><div className="vacio tarjeta"><h3>No se encuentra este torneo</h3><Link className="btn btn-principal" to="/partidos">Ver partidos</Link></div></main>
  );
  const t = partidos[0].torneo!;
  const convocados = convocadosIniciales(partidos[0]);
  const conDatos = partidos.filter((p) => p.alineacion || (p.acciones ?? []).length);
  const total: Record<string, number> = {};
  for (const p of partidos) for (const [j, m] of Object.entries(minutosFinales(p, partes * minutos))) total[j] = (total[j] ?? 0) + m;
  const ids = [...new Set([...convocados, ...Object.keys(total)])].filter((x) => porId.has(x)).sort((a, b) => (total[b] ?? 0) - (total[a] ?? 0));
  const max = Math.max(1, partidos.length * partes * minutos);
  const goles = partidos.reduce((s, p) => s + resultado(p).nuestros, 0), golesC = partidos.reduce((s, p) => s + resultado(p).suyos, 0);

  async function borrarTorneo() {
    if (!(await confirmar({ titulo: `¿Borrar el torneo «${t.nombre}»?`, texto: `Se borrarán sus ${partidos.length} partidos con sus alineaciones y todo lo apuntado. Esto no se puede deshacer.` }))) return;
    for (const p of partidos) await borrar(p.id);
    avisar("Torneo borrado");
    ir("/partidos", { replace: true });
  }

  return (
    <main className="pagina torneo">
      <div className="partido-cabeza">
        <Link to="/partidos" className="btn btn-icono" aria-label="Volver a partidos"><IcoAtras /></Link>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span className="etiqueta">🏆 Torneo · {fechaLarga(partidos[0].fecha)}</span>
          <h1 className="partido-rival">{t.nombre}</h1>
        </div>
      </div>

      <section className="tarjeta convocatoria-resumen">
        <span className="fila-texto"><b>Convocatoria del torneo</b><span>{partidos[0].convocados ? `${partidos[0].convocados.length} convocados · vale para los ${partidos.length} partidos` : "Una sola para todos los partidos"}</span></span>
        <button className="btn btn-peto" type="button" onClick={() => setHoja("convocatoria")}>{partidos[0].convocados ? "Ver y enviar" : "Convocar"}</button>
      </section>

      <section className="grupo-partidos">
        <h2 className="etiqueta">Partidos · {partidos.length}{conDatos.length ? ` · goles ${goles}–${golesC}` : ""}</h2>
        <div className="lista">
          {partidos.map((p) => {
            const r = resultado(p);
            const jugado = (p.acciones ?? []).length > 0 || p.reloj?.terminado;
            return (
              <Link key={p.id} to={`/partidos/${p.id}/alineacion`} className="fila fila-partido">
                <span className="fecha-bloque"><b>{p.hora || "—"}</b><small>{p.fecha !== partidos[0].fecha ? new Date(p.fecha + "T12:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "hora"}</small></span>
                <span className="fila-texto"><b>vs {p.rival}</b><span>{p.alineacion ? "Alineación hecha" : "Sin alineación"}</span></span>
                {jugado ? <span className={"marcador-mini " + r.signo}>{r.nuestros}–{r.suyos}</span> : <span className="pastilla">Por jugar</span>}
              </Link>
            );
          })}
        </div>
        <button className="btn btn-borde" type="button" onClick={() => setHoja("nuevo")}><IcoMas /> Añadir partido al torneo</button>
      </section>

      <section className="tarjeta minutos-torneo">
        <h2>Minutos en el torneo</h2>
        <p className="suave">Se suman todos los partidos. Al repartir los minutos de cada partido, juega más quien lleva menos.</p>
        {ids.length === 0 ? <p className="suave">Haz la convocatoria y las alineaciones para ver aquí los minutos.</p> : (
          <ul className="barras-minutos">
            {ids.map((j) => (
              <li key={j}>
                <span className="nombre">{porId.get(j)?.nombre}</span>
                <span className="barra"><span style={{ width: `${((total[j] ?? 0) / max) * 100}%`, background: ajustes.colorEquipo }} /></span>
                <b>{total[j] ?? 0}′</b>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="datos-acciones">
        <button className="btn btn-borde" type="button" onClick={() => { setNombre(t.nombre); setHoja("nombre"); }}>Cambiar nombre</button>
        <button className="btn btn-gris" type="button" onClick={borrarTorneo}><IcoPapelera /> Borrar torneo</button>
      </div>

      {hoja === "convocatoria" && <HojaConvocatoria partido={partidos[0]} torneo={partidos} jugadores={jugadores} guardarPartido={guardar} alCerrar={() => setHoja(null)} />}
      {hoja === "nuevo" && (
        <FormPartido titulo={`Nuevo partido · ${t.nombre}`} alCerrar={() => setHoja(null)}
          partido={{ id: nuevoId(), equipoId: equipo.id, rival: "", fecha: partidos[0].fecha, hora: siguienteHora(partidos[partidos.length - 1].hora), campo: partidos[0].campo, casa: partidos[0].casa,
            competicion: partidos[0].competicion, notas: "", alineacion: null, torneo: t, convocados: partidos[0].convocados ?? null, quedada: partidos[0].quedada ?? "" }}
          alGuardar={async (p) => { await guardar(p); setHoja(null); avisar("Partido añadido al torneo"); }} />
      )}
      {hoja === "nombre" && (
        <Hoja titulo="Nombre del torneo" alCerrar={() => setHoja(null)}>
          <form className="formulario" onSubmit={async (e) => {
            e.preventDefault();
            const n = nombre.trim().slice(0, 40);
            if (!n) return;
            for (const p of partidos) await guardar({ ...p, torneo: { ...t, nombre: n } });
            setHoja(null); avisar("Nombre guardado");
          }}>
            <label className="campo"><span>Nombre</span><input className="entrada" autoFocus value={nombre} maxLength={40} onChange={(e) => setNombre(e.target.value)} /></label>
            <div className="hoja-acciones">
              <button className="btn btn-gris" type="button" onClick={() => setHoja(null)}>Cancelar</button>
              <button className="btn btn-principal" type="submit" disabled={!nombre.trim()}>Guardar</button>
            </div>
          </form>
        </Hoja>
      )}
    </main>
  );
}
