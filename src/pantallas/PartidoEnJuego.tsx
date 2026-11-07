// Durante o después del partido: reloj, goles, cambios, tarjetas, línea de tiempo y minutos jugados.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useColeccion, useEquipo } from "../ContextoEquipo";
import { IcoPapelera } from "../componentes/Iconos";
import { Hoja, useUi } from "../componentes/ui";
import { dorsalEnPartido, etiquetaJugador, tiempoDePartido, type Jugador, type Partido } from "../datos/modelo";
import { TEXTO_ACCION, accionesDe, enCampo, expulsiones, expulsionesRival, minutoActual, minutosCalculados, minutosFinales, mmss, resultado, segundosActuales, type Accion, type Reloj, type TipoAccion } from "../datos/partido";
import "./partido-en-juego.css";

/* ---------- Iconos pequeños de la línea de tiempo ---------- */
export function IconoAccion({ tipo }: { tipo: TipoAccion }) {
  if (tipo === "amarilla" || tipo === "roja") return <span className={"tarjeta-ico " + tipo} aria-hidden="true" />;
  if (tipo === "amarillaRival" || tipo === "rojaRival") return <span className={"tarjeta-ico rival " + (tipo === "amarillaRival" ? "amarilla" : "roja")} aria-hidden="true" />;
  if (tipo === "cambio") return (
    <svg className="accion-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v14M3.5 7.5 7 4l3.5 3.5" stroke="var(--victoria)" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /><path d="M17 20V6M13.5 16.5 17 20l3.5-3.5" stroke="var(--derrota)" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
  return (
    <svg className="accion-ico" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill={tipo === "gol" ? "#fff" : "var(--superficie-2)"} stroke="currentColor" strokeWidth="2" />
      <path d="m12 8.2 3.4 2.5-1.3 4h-4.2l-1.3-4L12 8.2Z" fill="currentColor" />
    </svg>
  );
}

export default function PartidoEnJuego({ partido, guardarPartido }: { partido: Partido; guardarPartido: (p: Partido) => Promise<void> }) {
  const { equipo, ajustes } = useEquipo();
  const { filas: jugadores } = useColeccion<Jugador>("jugadores");
  const { confirmar, avisar } = useUi();
  const ir = useNavigate();
  const [hoja, setHoja] = useState<{ tipo: TipoAccion; editar?: Accion } | null>(null);
  const [minutosJugador, setMinutosJugador] = useState<Jugador | null>(null);
  const [, tic] = useState(0);

  const { partes, minutos: minutosParte } = tiempoDePartido(ajustes);
  const duracion = partes * minutosParte;
  const al = partido.alineacion;
  const acciones = accionesDe(partido);
  const porId = useMemo(() => new Map(jugadores.map((j) => [j.id, j])), [jugadores]);
  const convocados = useMemo(() => {
    const ids = al ? [...al.titulares.filter((x): x is string => !!x), ...al.suplentes] : jugadores.map((j) => j.id);
    return ids.map((id) => porId.get(id)).filter((j): j is Jugador => !!j);
  }, [al, jugadores, porId]);
  const etiqueta = (id?: string) => { const j = id ? porId.get(id) : undefined; return j ? etiquetaJugador(j, dorsalEnPartido(j, al, ajustes.dorsales)) : "Jugador borrado"; };
  const r = resultado(partido);
  const reloj = partido.reloj ?? { parte: 1, inicio: null, terminado: false };
  const minAhora = minutoActual(reloj, minutosParte);
  const segAhora = segundosActuales(reloj, minutosParte);
  // Lo que pasa del final teórico de la parte (45:00, 90:00...) es tiempo añadido
  const finParte = reloj.parte * minutosParte * 60;
  const anadido = segAhora != null && segAhora > finParte ? segAhora - finParte : 0;

  // El reloj se refresca cada segundo mientras corre
  useEffect(() => { if (reloj.inicio == null) return; const t = setInterval(() => tic((n) => n + 1), 1000); return () => clearInterval(t); }, [reloj.inicio]);

  const guardar = (c: Partial<Partido>) => guardarPartido({ ...partido, ...c });
  const guardarAccion = async (a: Accion) => {
    const lista = (partido.acciones ?? []).some((x) => x.id === a.id) ? (partido.acciones ?? []).map((x) => (x.id === a.id ? a : x)) : [...(partido.acciones ?? []), a];
    await guardar({ acciones: lista });
  };
  const ponerReloj = (rl: Reloj) => guardar({ reloj: rl });

  const nosotros = equipo.nombre, ellos = partido.rival;
  const [izq, der] = partido.casa ? [[nosotros, r.nuestros], [ellos, r.suyos]] as const : [[ellos, r.suyos], [nosotros, r.nuestros]] as const;
  const minutos = minutosFinales(partido, duracion);
  const calculados = minutosCalculados(al, partido.acciones ?? [], duracion);
  const exp = expulsiones(acciones);
  const expRival = expulsionesRival(acciones);

  return (
    <div className="en-juego">
      <section className={"marcador " + (acciones.length || reloj.terminado ? r.signo : "")} aria-label="Marcador">
        <div className="marcador-equipo"><span>{izq[0]}</span><b>{izq[1]}</b></div>
        <span className="marcador-guion">–</span>
        <div className="marcador-equipo"><b>{der[1]}</b><span>{der[0]}</span></div>
      </section>

      <section className="reloj tarjeta" aria-live="polite">
        {reloj.terminado ? (
          <>
            <span className="reloj-estado">Partido terminado</span>
            <button className="btn btn-texto" type="button" onClick={() => ponerReloj({ ...reloj, terminado: false })}>Reabrir</button>
          </>
        ) : reloj.inicio != null ? (
          <>
            <span className="reloj-minuto" aria-label={`Minuto ${minAhora}`}>{mmss(Math.min(segAhora ?? 0, finParte))}</span>
            <span className="reloj-estado">
              {reloj.parte}ª parte en juego
              {anadido > 0 && <b className="reloj-anadido">+{mmss(anadido)} de añadido</b>}
            </span>
            <button className="btn btn-gris" type="button" onClick={async () => {
              if (reloj.parte >= partes && !(await confirmar({ titulo: "¿Terminar el partido?", texto: "El reloj se para. Podrás seguir apuntando o corrigiendo goles, cambios y tarjetas.", boton: "Terminar", peligro: false }))) return;
              ponerReloj(reloj.parte >= partes ? { ...reloj, inicio: null, terminado: true } : { ...reloj, inicio: null });
            }}>
              {reloj.parte >= partes ? "Terminar partido" : `Fin de la ${reloj.parte}ª parte`}
            </button>
          </>
        ) : partido.reloj && reloj.parte >= partes ? (
          <>
            <span className="reloj-estado">{reloj.parte}ª parte terminada</span>
            <button className="btn btn-gris" type="button" onClick={() => ponerReloj({ ...reloj, inicio: Date.now() - minutosParte * 60000 })}>Seguir jugando</button>
            <button className="btn btn-principal" type="button" onClick={() => ponerReloj({ ...reloj, inicio: null, terminado: true })}>Terminar partido</button>
          </>
        ) : (
          <>
            <span className="reloj-estado">{!partido.reloj ? `${partes} partes de ${minutosParte} min` : `Descanso · ${reloj.parte}ª parte terminada`}</span>
            <button className="btn btn-peto" type="button" onClick={() => ponerReloj({ parte: partido.reloj ? reloj.parte + 1 : 1, inicio: Date.now(), terminado: false })}>
              {!partido.reloj ? "Empezar el partido" : `Empezar la ${reloj.parte + 1}ª parte`}
            </button>
          </>
        )}
      </section>
      {!al && <p className="mensaje mensaje-aviso">Sin alineación hecha: se puede apuntar todo, pero los minutos jugados se calculan con los titulares de la alineación. <button className="btn btn-texto" type="button" onClick={() => ir(`/partidos/${partido.id}/alineacion`)}>Hacer alineación</button></p>}

      <section className="botones-accion" aria-label="Apuntar">
        <span className="etiqueta grupo-accion">{equipo.nombre}</span>
        <button className="btn btn-peto accion-gol" type="button" onClick={() => setHoja({ tipo: "gol" })}><IconoAccion tipo="gol" /> Gol nuestro</button>
        <button className="btn btn-gris" type="button" onClick={() => setHoja({ tipo: "cambio" })}><IconoAccion tipo="cambio" /> Cambio</button>
        <button className="btn btn-gris" type="button" onClick={() => setHoja({ tipo: "amarilla" })}><IconoAccion tipo="amarilla" /> Amarilla</button>
        <button className="btn btn-gris" type="button" onClick={() => setHoja({ tipo: "roja" })}><IconoAccion tipo="roja" /> Roja</button>
        <span className="etiqueta grupo-accion">{ellos}</span>
        <button className="btn btn-gris" type="button" onClick={() => setHoja({ tipo: "golRival" })}><IconoAccion tipo="golRival" /> Gol</button>
        <button className="btn btn-gris" type="button" onClick={() => setHoja({ tipo: "amarillaRival" })}><IconoAccion tipo="amarillaRival" /> Amarilla</button>
        <button className="btn btn-gris" type="button" onClick={() => setHoja({ tipo: "rojaRival" })}><IconoAccion tipo="rojaRival" /> Roja</button>
      </section>

      <section className="linea-tiempo">
        <h2>Resumen</h2>
        {acciones.length === 0 ? <p className="suave">Aún no hay goles, cambios ni tarjetas.</p> : (
          <ol>
            {acciones.map((a) => (
              <li key={a.id}>
                <button type="button" className={"suceso " + (a.tipo.endsWith("Rival") ? "suyo" : "")} onClick={() => setHoja({ tipo: a.tipo, editar: a })}>
                  <span className="suceso-minuto">{a.minuto}'</span>
                  <IconoAccion tipo={a.tipo} />
                  <span className="suceso-texto">
                    {a.tipo === "gol" && <><b>Gol de {etiqueta(a.jugadorId)}</b>{a.asistenteId && <small>Asistencia: {etiqueta(a.asistenteId)}</small>}</>}
                    {a.tipo === "golRival" && <b>Gol de {ellos}</b>}
                    {a.tipo === "cambio" && <><b>Entra {etiqueta(a.entraId)}</b><small>Sale {etiqueta(a.jugadorId)}</small></>}
                    {(a.tipo === "amarilla" || a.tipo === "roja") && <><b>{TEXTO_ACCION[a.tipo]} a {etiqueta(a.jugadorId)}</b>{a.tipo === "amarilla" && exp.get(a.jugadorId!) === a.minuto && <small>Segunda amarilla: expulsado</small>}</>}
                    {(a.tipo === "amarillaRival" || a.tipo === "rojaRival") && <><b>{a.tipo === "amarillaRival" ? "Amarilla" : "Roja"} al {a.dorsalRival ?? "?"} de {ellos}</b>{a.tipo === "amarillaRival" && a.dorsalRival != null && expRival.get(a.dorsalRival) === a.minuto && <small>Segunda amarilla: expulsado</small>}</>}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="minutos-jugados">
        <header><h2>Minutos jugados</h2><span className="pastilla">de {duracion}'</span></header>
        {convocados.length === 0 ? <p className="suave">No hay jugadores convocados.</p> : (
          <div className="lista">
            {[...convocados].sort((a, b) => (minutos[b.id] ?? 0) - (minutos[a.id] ?? 0)).map((j) => {
              const titular = al?.titulares.includes(j.id);
              const goles = acciones.filter((a) => a.tipo === "gol" && a.jugadorId === j.id).length;
              const asist = acciones.filter((a) => a.tipo === "gol" && a.asistenteId === j.id).length;
              const amar = acciones.filter((a) => a.tipo === "amarilla" && a.jugadorId === j.id).length;
              const roja = exp.has(j.id);
              const manual = partido.minutosManuales?.[j.id] != null;
              return (
                <button key={j.id} type="button" className="fila fila-boton" onClick={() => setMinutosJugador(j)}>
                  <span className="fila-texto">
                    <b>{etiqueta(j.id)}</b>
                    <span>{titular ? "Titular" : "Suplente"}{goles ? ` · ${goles} ${goles === 1 ? "gol" : "goles"}` : ""}{asist ? ` · ${asist} asist.` : ""}{amar && !roja ? " · amarilla" : ""}{roja ? " · expulsado" : ""}</span>
                  </span>
                  <span className={"minutos-cifra" + (manual ? " manual" : "")}>{minutos[j.id] ?? 0}'</span>
                </button>
              );
            })}
          </div>
        )}
        <p className="suave consejo">Se calculan solos con la duración, los titulares, los cambios y las expulsiones. Toca a un jugador para corregirlos a mano.</p>
      </section>

      {hoja && (
        <HojaAccion tipo={hoja.tipo} editar={hoja.editar} minutoInicial={hoja.editar?.minuto ?? (minAhora != null ? Math.min(minAhora, reloj.parte * minutosParte) : null) ?? acciones[acciones.length - 1]?.minuto ?? 1} rival={ellos}
          etiqueta={etiqueta} convocados={convocados} al={al} acciones={partido.acciones ?? []}
          alCerrar={() => setHoja(null)}
          alGuardar={async (a) => { await guardarAccion(a); setHoja(null); avisar(a.tipo === "gol" ? "¡Gol apuntado!" : `${TEXTO_ACCION[a.tipo]} apuntado`); }}
          alBorrar={hoja.editar ? async () => {
            if (!(await confirmar({ titulo: "¿Borrar esta acción?", texto: "Se quitará del resumen y se recalcularán el resultado y los minutos." }))) return;
            await guardar({ acciones: (partido.acciones ?? []).filter((x) => x.id !== hoja.editar!.id) }); setHoja(null); avisar("Acción borrada");
          } : undefined} />
      )}
      {minutosJugador && (
        <HojaMinutos jugador={etiqueta(minutosJugador.id)} calculado={calculados[minutosJugador.id] ?? 0} actual={partido.minutosManuales?.[minutosJugador.id]} maximo={Math.max(duracion, ...acciones.map((a) => a.minuto))}
          alCerrar={() => setMinutosJugador(null)}
          alGuardar={async (m) => {
            const manuales = { ...(partido.minutosManuales ?? {}) };
            if (m == null) delete manuales[minutosJugador.id]; else manuales[minutosJugador.id] = m;
            await guardar({ minutosManuales: manuales }); setMinutosJugador(null);
          }} />
      )}
    </div>
  );
}

/* ---------- Apuntar o corregir una acción ---------- */
function HojaAccion({ tipo, editar, minutoInicial, rival, etiqueta, convocados, al, acciones, alCerrar, alGuardar, alBorrar }: {
  tipo: TipoAccion; editar?: Accion; minutoInicial: number; rival: string; etiqueta: (id?: string) => string;
  convocados: Jugador[]; al: Partido["alineacion"]; acciones: Accion[];
  alCerrar: () => void; alGuardar: (a: Accion) => Promise<void>; alBorrar?: () => void;
}) {
  const [minuto, setMinuto] = useState(minutoInicial);
  const [jugadorId, setJugadorId] = useState(editar?.jugadorId);
  const [paso, setPaso] = useState<"principal" | "segundo">(editar ? "segundo" : "principal");
  const [dorsal, setDorsal] = useState(editar?.dorsalRival != null ? String(editar.dorsalRival) : "");
  const otras = acciones.filter((a) => a.id !== editar?.id);
  const dentro = al ? enCampo(al, otras, minuto) : new Set(convocados.map((j) => j.id));
  const expulsados = expulsiones(otras);
  const enElCampo = convocados.filter((j) => dentro.has(j.id));
  const fuera = convocados.filter((j) => !dentro.has(j.id) && !(expulsados.has(j.id) && expulsados.get(j.id)! <= minuto));
  const id = editar?.id ?? crypto.randomUUID();
  const guardar = (c: Partial<Accion>) => alGuardar({ id, tipo, minuto, ...c });

  const titulo = editar ? `Corregir: ${TEXTO_ACCION[tipo].toLowerCase()}`
    : tipo === "gol" ? "Gol nuestro" : tipo === "golRival" ? `Gol de ${rival}`
    : tipo === "amarillaRival" ? `Amarilla a ${rival}` : tipo === "rojaRival" ? `Roja a ${rival}` : TEXTO_ACCION[tipo];
  const Lista = ({ jugadores, elegir, marcado }: { jugadores: Jugador[]; elegir: (j: Jugador) => void; marcado?: string }) => (
    <div className="elegir-jugador">
      {jugadores.map((j) => (
        <button key={j.id} type="button" className={j.id === marcado ? "marcado" : ""} onClick={() => elegir(j)}>{etiqueta(j.id)}</button>
      ))}
      {jugadores.length === 0 && <p className="suave">No hay jugadores para elegir.</p>}
    </div>
  );

  return (
    <Hoja titulo={titulo} alCerrar={alCerrar}>
      <div className="campo"><span>Minuto</span>
        <div className="contador-num" role="group" aria-label="Minuto">
          <button type="button" onClick={() => setMinuto((x) => Math.max(1, x - 1))} aria-label="Un minuto menos">−</button>
          <input className="minuto-entrada" inputMode="numeric" value={minuto} aria-label="Minuto"
            onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, "")); setMinuto(Math.min(150, Math.max(0, n))); }} />
          <button type="button" onClick={() => setMinuto((x) => Math.min(150, x + 1))} aria-label="Un minuto más">+</button>
        </div>
      </div>

      {tipo === "golRival" && (
        <button className="btn btn-principal btn-grande" type="button" onClick={() => guardar({})}>Apuntar gol de {rival} en el {minuto}'</button>
      )}

      {tipo === "gol" && (paso === "principal" || !jugadorId) && (
        <><span className="etiqueta">¿Quién marcó?</span>
          <Lista jugadores={enElCampo.length ? enElCampo : convocados} marcado={jugadorId} elegir={(j) => { setJugadorId(j.id); setPaso("segundo"); }} /></>
      )}
      {tipo === "gol" && paso === "segundo" && jugadorId && (
        <><p className="elegido-texto">Gol de <b>{etiqueta(jugadorId)}</b> <button className="btn btn-texto" type="button" onClick={() => setPaso("principal")}>Cambiar</button></p>
          <span className="etiqueta">¿Quién dio la asistencia?</span>
          <button className="btn btn-gris btn-ancho" type="button" onClick={() => guardar({ jugadorId })}>Sin asistencia</button>
          <Lista jugadores={(enElCampo.length ? enElCampo : convocados).filter((j) => j.id !== jugadorId)} marcado={editar?.asistenteId} elegir={(j) => guardar({ jugadorId, asistenteId: j.id })} /></>
      )}

      {tipo === "cambio" && (paso === "principal" || !jugadorId) && (
        <><span className="etiqueta">¿Quién sale?</span>
          <Lista jugadores={enElCampo} marcado={jugadorId} elegir={(j) => { setJugadorId(j.id); setPaso("segundo"); }} /></>
      )}
      {tipo === "cambio" && paso === "segundo" && jugadorId && (
        <><p className="elegido-texto">Sale <b>{etiqueta(jugadorId)}</b> <button className="btn btn-texto" type="button" onClick={() => setPaso("principal")}>Cambiar</button></p>
          <span className="etiqueta">¿Quién entra?</span>
          <Lista jugadores={fuera.filter((j) => j.id !== jugadorId)} marcado={editar?.entraId} elegir={(j) => guardar({ jugadorId, entraId: j.id })} /></>
      )}

      {(tipo === "amarilla" || tipo === "roja") && (paso === "principal" || !jugadorId) && (
        <><span className="etiqueta">¿A quién?</span>
          <Lista jugadores={convocados} marcado={jugadorId} elegir={(j) => { setJugadorId(j.id); setPaso("segundo"); }} /></>
      )}
      {(tipo === "amarilla" || tipo === "roja") && paso === "segundo" && jugadorId && (
        <><p className="elegido-texto">{tipo === "amarilla" ? "Amarilla" : "Roja"} a <b>{etiqueta(jugadorId)}</b> <button className="btn btn-texto" type="button" onClick={() => setPaso("principal")}>Cambiar</button></p>
          <p className="suave">Ajusta arriba el minuto en que se la sacaron.</p>
          <button className="btn btn-principal btn-grande" type="button" onClick={() => guardar({ jugadorId })}>Apuntar en el minuto {minuto}</button></>
      )}

      {(tipo === "amarillaRival" || tipo === "rojaRival") && (
        <><label className="campo campo-dorsal-rival"><span>Dorsal del jugador de {rival}</span>
            <input className="entrada entrada-dorsal grande" inputMode="numeric" pattern="[0-9]*" value={dorsal} placeholder="—" autoFocus
              onChange={(e) => setDorsal(e.target.value.replace(/\D/g, "").slice(0, 2))} />
          </label>
          <button className="btn btn-principal btn-grande" type="button" disabled={dorsal === ""}
            onClick={() => guardar({ dorsalRival: Number(dorsal) })}>
            Apuntar {tipo === "amarillaRival" ? "amarilla" : "roja"} al {dorsal || "…"} en el minuto {minuto}
          </button></>
      )}

      {alBorrar && <button className="btn btn-gris" type="button" onClick={alBorrar}><IcoPapelera /> Borrar esta acción</button>}
    </Hoja>
  );
}

/* ---------- Corregir minutos a mano ---------- */
function HojaMinutos({ jugador, calculado, actual, maximo, alCerrar, alGuardar }: {
  jugador: string; calculado: number; actual?: number; maximo: number; alCerrar: () => void; alGuardar: (m: number | null) => void;
}) {
  const [m, setM] = useState(actual ?? calculado);
  return (
    <Hoja titulo={jugador} alCerrar={alCerrar}>
      <div className="campo"><span>Minutos jugados</span>
        <div className="contador-num" role="group" aria-label="Minutos jugados">
          <button type="button" onClick={() => setM((x) => Math.max(0, x - 5))} aria-label="5 minutos menos">−5</button>
          <input className="minuto-entrada" inputMode="numeric" value={m} aria-label="Minutos" onChange={(e) => setM(Math.min(maximo, Number(e.target.value.replace(/\D/g, "")) || 0))} />
          <button type="button" onClick={() => setM((x) => Math.min(maximo, x + 5))} aria-label="5 minutos más">+5</button>
        </div>
        <small className="suave">Calculado automáticamente: {calculado}'.</small>
      </div>
      <div className="hoja-acciones">
        <button className="btn btn-gris" type="button" onClick={() => alGuardar(null)} disabled={actual == null}>Usar el cálculo</button>
        <button className="btn btn-principal" type="button" onClick={() => alGuardar(m === calculado ? null : m)}>Guardar</button>
      </div>
    </Hoja>
  );
}
