// Pizarra del entrenador: pizarras de partido (y, en las próximas fases, balón parado y vídeos).
// Todo es de cada equipo: un entrenador con varios equipos ve las pizarras de cada uno por separado.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useColeccion, useEquipo } from "../ContextoEquipo";
import Pizarra, { PizarraMini } from "../componentes/Pizarra";
import { IcoAtras, IcoMas, IcoPapelera } from "../componentes/Iconos";
import { useUi } from "../componentes/ui";
import { jugadoresEnCampo, type Jugador, type Partido } from "../datos/modelo";
import { copiarPizarra, pizarraVacia, type PizarraGuardada } from "../datos/pizarra";
import "./ejercicios.css";
import "./partidos.css";
import "./pizarra-entrenador.css";

const fechaCorta = (f: string) => new Date(f + "T12:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" });
const textoPartido = (p: Partido) => `${p.casa ? "🏠" : "✈️"} vs ${p.rival} · ${fechaCorta(p.fecha)}`;
const tienePizarra = (p: PizarraGuardada) => p.pizarra.piezas.length > 0 || (p.pizarra.pasos[0]?.dibujos?.length ?? 0) > 0;

/* ---------------- Portada de la pestaña ---------------- */
export default function PizarraInicio() {
  const { filas } = useColeccion<PizarraGuardada>("pizarras");
  const deTipo = (t: PizarraGuardada["tipo"]) => filas.filter((p) => p.tipo === t).length;
  return (
    <main className="pagina pagina-ancha pizarra-inicio">
      <h1>Pizarra</h1>
      <p className="suave">Prepara los partidos y explica las jugadas a tus jugadores. Todo queda guardado en este equipo.</p>
      <div className="secciones-pizarra">
        <Link to="/pizarra/partido" className="seccion-pizarra tarjeta">
          <span className="seccion-icono" aria-hidden="true"><MiniCampo /></span>
          <span className="fila-texto"><b>Pizarras de partido</b><span>Formación, fichas de tu plantilla y dibujos encima</span></span>
          <span className="pastilla">{deTipo("partido")}</span>
        </Link>
        <div className="seccion-pizarra tarjeta pronto" aria-disabled="true">
          <span className="seccion-icono" aria-hidden="true">⚑</span>
          <span className="fila-texto"><b>Balón parado</b><span>Córners, faltas y saques animados paso a paso</span></span>
          <span className="pastilla">Pronto</span>
        </div>
        <div className="seccion-pizarra tarjeta pronto" aria-disabled="true">
          <span className="seccion-icono" aria-hidden="true">▶</span>
          <span className="fila-texto"><b>Vídeos</b><span>Dibuja encima de tus vídeos y marca los momentos clave</span></span>
          <span className="pastilla">Pronto</span>
        </div>
        <Link to="/ejercicios" className="seccion-pizarra tarjeta">
          <span className="seccion-icono" aria-hidden="true">△</span>
          <span className="fila-texto"><b>Ejercicios</b><span>Tus ejercicios con pizarra animada y la Biblioteca Míster</span></span>
          <IcoAtras style={{ transform: "rotate(180deg)", width: 20, height: 20, color: "var(--tinta-2)" }} />
        </Link>
      </div>
    </main>
  );
}

const MiniCampo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 12h18" /><circle cx="12" cy="12" r="3" /><path d="M8 3v3h8V3" />
  </svg>
);

/* ---------------- Lista de pizarras de partido ---------------- */
export function PizarrasPartido() {
  const { ajustes } = useEquipo();
  const { filas, cargando } = useColeccion<PizarraGuardada>("pizarras");
  const { filas: partidos } = useColeccion<Partido>("partidos");
  const ir = useNavigate();
  const lista = filas.filter((p) => p.tipo === "partido").sort((a, b) => b.editado.localeCompare(a.editado));
  const partido = (id: string | null) => partidos.find((x) => x.id === id);

  return (
    <main className="pagina pagina-ancha">
      <div className="partido-cabeza">
        <Link to="/pizarra" className="btn btn-icono" aria-label="Volver a la pizarra"><IcoAtras /></Link>
        <h1 style={{ flex: 1 }}>Pizarras de partido</h1>
      </div>
      <button className="btn btn-peto btn-grande btn-ancho" type="button" onClick={() => ir("/pizarra/partido/nueva")}><IcoMas /> Nueva pizarra</button>

      {!cargando && lista.length === 0 && (
        <div className="vacio tarjeta">
          <MiniCampo />
          <h3>Aún no tienes pizarras</h3>
          <p>Coloca tu formación, mueve las fichas y dibuja encima para preparar el próximo partido.</p>
        </div>
      )}
      <div className="tarjetas-ejercicio">
        {lista.map((p) => {
          const pt = partido(p.partidoId);
          return (
            <Link key={p.id} to={`/pizarra/partido/${p.id}`} className="tarjeta-ejercicio tarjeta">
              <div className="tarjeta-ejercicio-texto">
                <div className="tarjeta-ejercicio-cabeza">
                  {pt ? <span className="pastilla pastilla-ok">{textoPartido(pt)}</span> : <span className="pastilla">Sin partido</span>}
                </div>
                <b>{p.nombre || "Pizarra sin nombre"}</b>
                <p>Editada el {fechaCorta(p.editado.slice(0, 10))}</p>
              </div>
              {tienePizarra(p) && <div className="tarjeta-ejercicio-mini"><PizarraMini pizarra={p.pizarra} colorEquipo={ajustes.colorEquipo} colorRival={ajustes.colorRival} /></div>}
            </Link>
          );
        })}
      </div>
    </main>
  );
}

/* ---------------- Crear y editar ---------------- */
export function EditorPizarraPartido() {
  const { id } = useParams();
  const { equipo, ajustes } = useEquipo();
  const coleccion = useColeccion<PizarraGuardada>("pizarras");
  const { filas: partidos } = useColeccion<Partido>("partidos");
  const { filas: jugadores } = useColeccion<Jugador>("jugadores");
  const { confirmar, avisar } = useUi();
  const ir = useNavigate();
  const [p, setP] = useState<PizarraGuardada | null>(null);
  const [original, setOriginal] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (p || coleccion.cargando) return;
    const base = id
      ? coleccion.filas.find((x) => x.id === id)
      : { id: crypto.randomUUID(), equipoId: equipo.id, tipo: "partido" as const, nombre: "", partidoId: null, pizarra: { ...pizarraVacia(), campo: "completo" as const }, editado: new Date().toISOString() };
    if (base) { setP(structuredClone(base)); setOriginal(JSON.stringify(base)); }
  }, [coleccion.cargando, coleccion.filas, id, p, equipo.id]);

  // Primero los sistemas de la modalidad de este equipo
  const sistemas = useMemo(() => {
    const n = jugadoresEnCampo(ajustes);
    return [...ajustes.sistemas].sort((a, b) => Number(b.jugadores === n) - Number(a.jugadores === n));
  }, [ajustes]);
  const ordenPartidos = useMemo(() => [...partidos].sort((a, b) => b.fecha.localeCompare(a.fecha)), [partidos]);

  if (coleccion.cargando || !p) {
    if (!coleccion.cargando && id && !coleccion.filas.some((x) => x.id === id)) {
      return <main className="pagina"><div className="vacio tarjeta"><h3>No se encuentra esta pizarra</h3><Link className="btn btn-principal" to="/pizarra/partido">Ver pizarras</Link></div></main>;
    }
    return <main className="pagina" />;
  }
  const sinGuardar = JSON.stringify(p) !== original;

  async function guardar() {
    setGuardando(true);
    const final = { ...p!, nombre: p!.nombre.trim(), editado: new Date().toISOString() };
    try {
      await coleccion.guardar(final);
      setP(final); setOriginal(JSON.stringify(final));
      avisar("Pizarra guardada");
      if (!id) ir(`/pizarra/partido/${final.id}`, { replace: true });
    } catch { /* ya avisado */ }
    finally { setGuardando(false); }
  }
  async function salir() {
    if (sinGuardar && !(await confirmar({ titulo: "¿Salir sin guardar?", texto: "Perderás los cambios de esta pizarra.", boton: "Salir sin guardar" }))) return;
    ir("/pizarra/partido");
  }
  async function duplicar() {
    const copia = copiarPizarra(p!, `${p!.nombre || "Pizarra"} (copia)`);
    try { await coleccion.guardar(copia); avisar("Pizarra duplicada"); setP(null); ir(`/pizarra/partido/${copia.id}`); } catch { /* ya avisado */ }
  }
  async function borrar() {
    if (!(await confirmar({ titulo: `¿Borrar «${p!.nombre || "esta pizarra"}»?`, texto: "Esto no se puede deshacer." }))) return;
    await coleccion.borrar(p!.id);
    avisar("Pizarra borrada");
    ir("/pizarra/partido", { replace: true });
  }

  return (
    <div className="pagina pagina-ancha editor-pizarra-partido">
      <div className="partido-cabeza">
        <button className="btn btn-icono" type="button" onClick={salir} aria-label="Volver a las pizarras"><IcoAtras /></button>
        <h1 style={{ flex: 1 }}>{id ? "Pizarra de partido" : "Nueva pizarra"}</h1>
      </div>

      <div className="dos-columnas datos-pizarra">
        <label className="campo"><span>Nombre</span>
          <input id="pizarra-nombre" className="entrada" value={p.nombre} maxLength={60} placeholder="Por ejemplo: Salida de balón" onChange={(e) => setP({ ...p, nombre: e.target.value })} />
        </label>
        <label className="campo"><span>Partido <small className="suave">(opcional)</small></span>
          <select id="pizarra-partido" className="entrada" value={p.partidoId ?? ""} onChange={(e) => setP({ ...p, partidoId: e.target.value || null })}>
            <option value="">Sin partido</option>
            {ordenPartidos.map((x) => <option key={x.id} value={x.id}>{textoPartido(x)}</option>)}
          </select>
        </label>
      </div>

      <Pizarra pizarra={p.pizarra} cambiar={(pz) => setP((x) => (x ? { ...x, pizarra: pz } : x))} animada={false} altoMax="max(420px, calc(100dvh - 330px))"
        jugadores={jugadores} sistemas={sistemas} colorEquipo={ajustes.colorEquipo} colorRival={ajustes.colorRival} />

      {id && (
        <div className="acciones-pizarra">
          <button className="btn btn-borde" type="button" onClick={duplicar}>Duplicar</button>
          <button className="btn btn-texto peligro" type="button" onClick={borrar}><IcoPapelera /> Borrar pizarra</button>
        </div>
      )}

      <div className="barra-guardar">
        <button className="btn btn-gris" type="button" onClick={salir}>{sinGuardar ? "Cancelar" : "Volver"}</button>
        <button className="btn btn-principal" type="button" onClick={guardar} disabled={guardando || (!sinGuardar && !!id)}>
          {guardando ? "Guardando…" : sinGuardar || !id ? "Guardar pizarra" : "Guardada"}
        </button>
      </div>
    </div>
  );
}
