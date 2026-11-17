// Ficha del rival: el sistema con el que creemos que juega y las anotaciones del entrenador
// (lo que ha visto o le han contado). Se guarda por nombre del rival y sirve para la próxima vez.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useColeccion, useEquipo } from "../ContextoEquipo";
import { Campo, Ficha, yEnCampo } from "../componentes/Campo";
import { Hoja, useUi } from "../componentes/ui";
import { IcoAtras } from "../componentes/Iconos";
import { jugadoresEnCampo, nuevoId, type Partido } from "../datos/modelo";
import { resultado } from "../datos/partido";
import { SelectorPartidos } from "./Estadisticas";
import "./rivales.css";

export interface Rival {
  id: string;
  equipoId: string;
  nombre: string;
  sistemaId: string | null;
  sistemaNombre: string;
  notas: string;
  editado: string;
}

export const claveRival = (n: string) => n.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
export const rivalDe = (rivales: Rival[], nombre: string) => rivales.find((r) => claveRival(r.nombre) === claveRival(nombre));

const fechaCorta = (f: string) => new Date(f + "T12:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "2-digit" });

/** Tarjeta con el resumen del rival, para la pantalla del partido. */
export function TarjetaRival({ nombre }: { nombre: string }) {
  const { filas, guardar } = useColeccion<Rival>("rivales");
  const [abierta, setAbierta] = useState(false);
  const r = rivalDe(filas, nombre);
  return (
    <>
      <button type="button" className="tarjeta tarjeta-rival" onClick={() => setAbierta(true)}>
        <span className="etiqueta">Ficha del rival</span>
        {r && (r.sistemaNombre || r.notas) ? (
          <>
            <b>{r.sistemaNombre ? `Juegan ${r.sistemaNombre}` : "Sistema sin apuntar"}</b>
            {r.notas && <span className="notas-rival">{r.notas}</span>}
          </>
        ) : <span className="suave">Apunta su sistema y cómo crees que juegan.</span>}
      </button>
      {abierta && <HojaRival nombre={nombre} rival={r} guardar={guardar} alCerrar={() => setAbierta(false)} />}
    </>
  );
}

export function HojaRival({ nombre, rival, guardar, alCerrar }: { nombre: string; rival?: Rival; guardar: (r: Rival) => Promise<void>; alCerrar: () => void }) {
  const { equipo, ajustes } = useEquipo();
  const { avisar } = useUi();
  const { filas: partidos } = useColeccion<Partido>("partidos");
  const n = jugadoresEnCampo(ajustes);
  const sistemas = ajustes.sistemas.filter((s) => s.jugadores === n);
  const [sistemaId, setSistemaId] = useState<string | null>(rival?.sistemaId ?? null);
  const [notas, setNotas] = useState(rival?.notas ?? "");
  const sistema = sistemas.find((s) => s.id === sistemaId) ?? ajustes.sistemas.find((s) => s.id === sistemaId);
  const historial = partidos.filter((p) => claveRival(p.rival) === claveRival(nombre)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  // Visto desde nuestro lado: el rival ataca hacia abajo (su portero arriba)
  const puntos = sistema ? sistema.posiciones.map((p) => ({ x: 100 - p.x, y: 100 - p.y })) : [];

  async function enviar() {
    await guardar({
      id: rival?.id ?? nuevoId(), equipoId: equipo.id, nombre: rival?.nombre ?? nombre.trim(), sistemaId: sistema?.id ?? null,
      sistemaNombre: sistema?.nombre ?? "", notas: notas.trim(), editado: new Date().toISOString()
    });
    avisar("Ficha del rival guardada");
    alCerrar();
  }

  return (
    <Hoja titulo={nombre} alCerrar={alCerrar}>
      <div className="ficha-rival">
        <div className="campo"><span>¿Con qué sistema juegan?</span>
          <div className="chips-eleccion" role="radiogroup" aria-label="Sistema del rival">
            {sistemas.map((s) => <button key={s.id} type="button" role="radio" aria-checked={sistemaId === s.id} onClick={() => setSistemaId(s.id)}>{s.nombre}</button>)}
            <button type="button" role="radio" aria-checked={sistemaId === null} onClick={() => setSistemaId(null)}>No lo sé</button>
          </div>
        </div>
        {sistema && (
          <div className="rival-campo">
            <Campo>
              {puntos.map((p, i) => (
                <div key={i} className="campo-pieza" style={{ left: `${p.x}%`, top: `${yEnCampo(p.y)}%` }}>
                  <Ficha pequena color={ajustes.colorRival} />
                </div>
              ))}
            </Campo>
          </div>
        )}
        <label className="campo"><span>¿Cómo juegan?</span>
          <textarea className="entrada area" rows={6} maxLength={1500} value={notas} onChange={(e) => setNotas(e.target.value)}
            placeholder="Lo que has visto o te han contado: si presionan arriba, si salen en largo, su jugador más peligroso (por dorsal), cómo sacan los córners…" />
        </label>
        {historial.length > 0 && (
          <section className="historial-rival">
            <h3 className="etiqueta">Partidos contra ellos</h3>
            <ul>
              {historial.map((p) => {
                const r = resultado(p);
                const jugado = (p.acciones ?? []).length > 0 || p.reloj?.terminado;
                return (
                  <li key={p.id}>
                    <Link to={`/partidos/${p.id}`} onClick={alCerrar}>
                      <span>{fechaCorta(p.fecha)} · {p.casa ? "🏠" : "✈️"} {p.competicion}</span>
                      <b className={jugado ? r.signo : ""}>{jugado ? `${r.nuestros} – ${r.suyos}` : "Sin jugar"}</b>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        <div className="hoja-acciones">
          <button className="btn btn-gris" type="button" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-principal" type="button" onClick={enviar}>Guardar</button>
        </div>
      </div>
    </Hoja>
  );
}

/** Lista de rivales: los que tienen ficha y los de los partidos apuntados. */
export default function Rivales() {
  const { filas: rivales, guardar } = useColeccion<Rival>("rivales");
  const { filas: partidos } = useColeccion<Partido>("partidos");
  const [abierto, setAbierto] = useState<string | null>(null);
  const nombres = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rivales) m.set(claveRival(r.nombre), r.nombre);
    for (const p of partidos) if (!m.has(claveRival(p.rival))) m.set(claveRival(p.rival), p.rival.trim());
    return [...m.values()].sort((a, b) => a.localeCompare(b, "es"));
  }, [rivales, partidos]);
  const jugadosContra = (n: string) => partidos.filter((p) => claveRival(p.rival) === claveRival(n)).length;

  return (
    <main className="pagina">
      <SelectorPartidos />
      <h1>Rivales</h1>
      {nombres.length === 0 ? (
        <div className="vacio tarjeta"><h3>Aún no hay rivales</h3><p>Cuando apuntes un partido, su rival aparecerá aquí para que le hagas su ficha.</p>
          <Link className="btn btn-principal" to="/partidos"><IcoAtras style={{ width: 18, height: 18 }} /> Ir a partidos</Link></div>
      ) : (
        <div className="lista">
          {nombres.map((n) => {
            const r = rivalDe(rivales, n);
            return (
              <button key={n} type="button" className="fila fila-boton" onClick={() => setAbierto(n)}>
                <span className="fila-texto">
                  <b>{n}</b>
                  <span>{r?.sistemaNombre ? `Juegan ${r.sistemaNombre}` : "Sin sistema apuntado"} · {jugadosContra(n)} {jugadosContra(n) === 1 ? "partido" : "partidos"}</span>
                </span>
                <span className={"pastilla" + (r && (r.notas || r.sistemaNombre) ? " pastilla-ok" : "")}>{r && (r.notas || r.sistemaNombre) ? "Con ficha" : "Sin ficha"}</span>
              </button>
            );
          })}
        </div>
      )}
      {abierto && <HojaRival nombre={abierto} rival={rivalDe(rivales, abierto)} guardar={guardar} alCerrar={() => setAbierto(null)} />}
    </main>
  );
}
