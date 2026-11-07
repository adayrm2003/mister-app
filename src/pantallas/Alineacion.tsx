// Alineación de un partido: sistema, titulares en el campo, suplentes y dorsales de ese partido.
// Se puede arrastrar a los jugadores o hacerlo todo con toques.
import { useEffect, useMemo, useRef, useState, type PointerEvent as PE } from "react";
import { useNavigate } from "react-router-dom";
import { useColeccion, useEquipo } from "../ContextoEquipo";
import { Campo, Ficha, recorteParaPuntos, yEnCampo } from "../componentes/Campo";
import { IcoCheck, IcoHoja, IcoMas, IcoPapelera } from "../componentes/Iconos";
import HojaVestuario from "./HojaVestuario";

/** "Sábado 7/11" para la hoja del vestuario. */
const fechaCorta = (f: string) => {
  const d = new Date(f + "T12:00");
  const dia = d.toLocaleDateString("es-ES", { weekday: "long" });
  return `${dia[0].toUpperCase()}${dia.slice(1)} ${d.getDate()}/${d.getMonth() + 1}`;
};
import { Hoja, useUi } from "../componentes/ui";
import {
  MAX_SUPLENTES, PUESTOS, nombreModalidad, alineacionVacia, cambiarSistema, dorsalEnPartido, dorsalesRepetidos, jugadoresEnCampo, moverJugador, nuevoId,
  type Alineacion as TAlineacion, type Destino, type Jugador, type Partido, type PlantillaAlineacion, type Sistema
} from "../datos/modelo";
import "./alineacion.css";

type Hojas =
  | { tipo: "sistema" }
  | { tipo: "elegir"; indice: number }
  | { tipo: "jugador"; id: string }
  | { tipo: "guardarPlantilla" }
  | { tipo: "usarPlantilla" }
  | { tipo: "vestuario" }
  | null;

interface Arrastre { id: string; x: number; y: number; sx: number; sy: number; activo: boolean }

export default function Alineacion({ partido, guardarPartido }: { partido: Partido; guardarPartido: (p: Partido) => Promise<void> }) {
  const { equipo, ajustes } = useEquipo();
  const { filas: jugadores, cargando } = useColeccion<Jugador>("jugadores");
  const plantillas = useColeccion<PlantillaAlineacion>("plantillas_alineacion");
  const { avisar, confirmar } = useUi();
  const ir = useNavigate();
  const n = jugadoresEnCampo(ajustes);
  const sistemaInicial = ajustes.sistemas.find((s) => s.jugadores === n) ?? ajustes.sistemas[0];

  const [al, setAl] = useState<TAlineacion>(() => partido.alineacion ?? alineacionVacia(sistemaInicial));
  const [hoja, setHoja] = useState<Hojas>(null);
  const [estado, setEstado] = useState<"guardado" | "guardando" | null>(null);
  const [arrastre, setArrastre] = useState<Arrastre | null>(null);
  const ultimoGuardado = useRef(JSON.stringify(partido.alineacion ?? al));

  // Guardado automático medio segundo después del último cambio
  useEffect(() => {
    const texto = JSON.stringify(al);
    if (texto === ultimoGuardado.current) return;
    setEstado("guardando");
    const t = setTimeout(() => {
      ultimoGuardado.current = texto;
      guardarPartido({ ...partido, alineacion: al }).then(() => setEstado("guardado")).catch(() => setEstado(null));
    }, 500);
    return () => clearTimeout(t);
  }, [al]); // eslint-disable-line react-hooks/exhaustive-deps

  const porId = useMemo(() => new Map(jugadores.map((j) => [j.id, j])), [jugadores]);
  const titulares = al.titulares.map((id) => (id && porId.has(id) ? id : null));
  const suplentes = al.suplentes.filter((id) => porId.has(id));
  const convocados = new Set([...titulares.filter(Boolean), ...suplentes] as string[]);
  const resto = jugadores.filter((j) => !convocados.has(j.id)).sort((a, b) => PUESTOS.findIndex((p) => p.valor === a.posicion) - PUESTOS.findIndex((p) => p.valor === b.posicion) || a.nombre.localeCompare(b.nombre, "es"));
  const repetidos = dorsalesRepetidos({ ...al, titulares, suplentes }, jugadores, ajustes.dorsales);
  const dorsal = (j: Jugador) => dorsalEnPartido(j, al, ajustes.dorsales);
  const enCampo = titulares.filter(Boolean).length;
  const recorte = recorteParaPuntos(al.posiciones.map((p) => p.y));

  function mover(id: string, destino: Destino) {
    const r = moverJugador({ ...al, titulares, suplentes }, id, destino);
    if (r.error) return avisar(r.error);
    // Al convocarlo por primera vez, se apunta su dorsal fijo para este partido
    const j = porId.get(id);
    if (destino.tipo !== "fuera" && j && !(id in r.al.dorsales) && ajustes.dorsales === "fijos" && j.dorsal != null) r.al.dorsales = { ...r.al.dorsales, [id]: j.dorsal };
    setAl(r.al);
  }

  /* ---------- Arrastrar ---------- */
  const asas = (id: string) => ({
    onPointerDown: (e: PE<HTMLElement>) => {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setArrastre({ id, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, activo: false });
    },
    onPointerMove: (e: PE<HTMLElement>) => {
      setArrastre((a) => (a && a.id === id ? { ...a, x: e.clientX, y: e.clientY, activo: a.activo || Math.hypot(e.clientX - a.sx, e.clientY - a.sy) > 8 } : a));
    },
    onPointerUp: (e: PE<HTMLElement>) => {
      const a = arrastre;
      setArrastre(null);
      if (!a || a.id !== id) return;
      if (!a.activo) return tocar(id);
      const destinoEl = document.elementsFromPoint(e.clientX, e.clientY).map((el) => (el as HTMLElement).closest<HTMLElement>("[data-destino]")).find(Boolean);
      const d = destinoEl?.dataset.destino;
      if (!d) return;
      if (d.startsWith("hueco:")) mover(id, { tipo: "hueco", indice: Number(d.slice(6)) });
      else if (d === "suplentes") { if (!suplentes.includes(id)) mover(id, { tipo: "suplentes" }); }
      else if (d === "fuera") mover(id, { tipo: "fuera" });
    },
    onPointerCancel: () => setArrastre(null),
    // Con teclado (Intro o espacio) también se puede tocar
    onClick: (e: React.MouseEvent) => { if (e.detail === 0) tocar(id); }
  });
  const destinoBajo = (() => {
    if (!arrastre?.activo) return null;
    const el = document.elementsFromPoint(arrastre.x, arrastre.y).map((x) => (x as HTMLElement).closest<HTMLElement>("[data-destino]")).find(Boolean);
    return el?.dataset.destino ?? null;
  })();

  /** Jugadores libres para un hueco: primero los de la posición que toca (por altura en el campo), luego los suplentes. */
  function libresPara(indice: number) {
    const y = al.posiciones[indice]?.y ?? 50;
    const puesto = y >= 85 ? "portero" : y >= 62 ? "defensa" : y >= 42 ? "medio" : "delantero";
    const libres = [...suplentes.map((id) => porId.get(id)!), ...resto];
    const nota = (j: Jugador) => (j.posicion === puesto ? 0 : 2) + (suplentes.includes(j.id) ? 0 : 1);
    return libres.sort((a, b) => nota(a) - nota(b));
  }

  function tocar(id: string) {
    if (convocados.has(id)) setHoja({ tipo: "jugador", id });
    else mover(id, { tipo: "suplentes" });
  }

  const arrastrado = arrastre?.activo ? porId.get(arrastre.id) : undefined;

  return (
    <div className={"alineacion" + (arrastre?.activo ? " arrastrando" : "")}>
      <div className="alineacion-barra">
        <button className="btn btn-gris sistema-boton" type="button" onClick={() => setHoja({ tipo: "sistema" })}>
          Sistema <b>{al.sistemaNombre}</b>
        </button>
        <span className="pastilla">{enCampo}/{al.posiciones.length} en el campo</span>
        <span className="estado-guardado" aria-live="polite">{estado === "guardando" ? "Guardando…" : estado === "guardado" ? "Guardado" : ""}</span>
      </div>

      {repetidos.map((r) => (
        <p key={r.dorsal} className="mensaje mensaje-aviso" role="alert">⚠ {r.nombres.join(" y ")} llevan el mismo dorsal ({r.dorsal}).</p>
      ))}

      {!cargando && jugadores.length === 0 && (
        <div className="mensaje mensaje-aviso">Aún no tienes jugadores. <button className="btn btn-texto" type="button" onClick={() => ir("/plantilla")}>Añadirlos en Plantilla</button></div>
      )}

      <div className="alineacion-cuerpo">
        <div className="alineacion-campo">
          <Campo recorte={recorte}>
            {al.posiciones.map((p, i) => {
              const id = titulares[i];
              const j = id ? porId.get(id) : undefined;
              const marcado = destinoBajo === `hueco:${i}`;
              return (
                <div key={i} className={"campo-pieza hueco" + (marcado ? " hueco-marcado" : "")} style={{ left: `${p.x}%`, top: `${yEnCampo(p.y, recorte)}%` }} data-destino={`hueco:${i}`}>
                  {j ? (
                    <button type="button" className="token" aria-label={`${j.nombre}, dorsal ${dorsal(j) ?? "sin dorsal"}`} {...asas(j.id)}
                      style={{ opacity: arrastre?.activo && arrastre.id === j.id ? 0.3 : 1 }}>
                      <Ficha dorsal={dorsal(j)} nombre={j.nombre} color={ajustes.colorEquipo} />
                    </button>
                  ) : (
                    <button type="button" className="token" aria-label={`Hueco ${i + 1} vacío: elegir jugador`} onClick={() => setHoja({ tipo: "elegir", indice: i })}>
                      <Ficha vacia />
                    </button>
                  )}
                </div>
              );
            })}
          </Campo>
        </div>

        <div className="alineacion-listas">
          <section className={"zona" + (destinoBajo === "suplentes" ? " zona-marcada" : "")} data-destino="suplentes">
            <h3 className="etiqueta">Suplentes · {suplentes.length} de {MAX_SUPLENTES}</h3>
            {suplentes.length === 0 ? (
              <p className="suave zona-vacia">Toca a un jugador de abajo para ponerlo de suplente, o arrástralo aquí.</p>
            ) : (
              <div className="chips">
                {suplentes.map((id) => {
                  const j = porId.get(id)!;
                  return (
                    <button key={id} type="button" className="chip-jugador" {...asas(id)} style={{ opacity: arrastre?.activo && arrastre.id === id ? 0.3 : 1 }}>
                      <span className="chip-dorsal" style={{ background: ajustes.colorEquipo }}>{dorsal(j) ?? "–"}</span>{j.nombre}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className={"zona zona-resto" + (destinoBajo === "fuera" ? " zona-marcada" : "")} data-destino="fuera">
            <h3 className="etiqueta">Sin convocar · {resto.length}</h3>
            {resto.length === 0 ? (
              <p className="suave zona-vacia">{jugadores.length ? "Todos los jugadores están convocados." : "Sin jugadores."}</p>
            ) : (
              <div className="chips">
                {resto.map((j) => (
                  <button key={j.id} type="button" className="chip-jugador chip-fuera" {...asas(j.id)} style={{ opacity: arrastre?.activo && arrastre.id === j.id ? 0.3 : 1 }}>
                    <span className="chip-puesto">{PUESTOS.find((p) => p.valor === j.posicion)?.corto}</span>{j.nombre}
                  </button>
                ))}
              </div>
            )}
          </section>

          <button className="btn btn-principal btn-grande btn-ancho" type="button" onClick={() => setHoja({ tipo: "vestuario" })}>
            <IcoHoja /> Hoja para el vestuario (PDF)
          </button>
          <div className="alineacion-acciones">
            <button className="btn btn-borde" type="button" onClick={() => setHoja({ tipo: "guardarPlantilla" })} disabled={convocados.size === 0}>Guardar como plantilla</button>
            <button className="btn btn-borde" type="button" onClick={() => setHoja({ tipo: "usarPlantilla" })}>Usar una plantilla</button>
            <button className="btn btn-texto" type="button" disabled={convocados.size === 0} onClick={async () => {
              if (await confirmar({ titulo: "¿Vaciar la alineación?", texto: "Todos los jugadores volverán a «Sin convocar».", boton: "Vaciar" })) setAl({ ...alineacionVacia({ id: al.sistemaId, nombre: al.sistemaNombre, jugadores: al.posiciones.length, posiciones: al.posiciones }) });
            }}>Vaciar alineación</button>
          </div>
          <p className="suave consejo">Consejo: arrastra a un jugador encima de otro para cambiarlos de sitio. Tócalo para cambiar su dorsal en este partido.</p>
        </div>
      </div>

      {arrastrado && arrastre && (
        <div className="fantasma" style={{ left: arrastre.x, top: arrastre.y }} aria-hidden="true">
          <Ficha dorsal={dorsal(arrastrado)} nombre={arrastrado.nombre} color={ajustes.colorEquipo} />
        </div>
      )}

      {hoja?.tipo === "sistema" && (
        <HojaSistemas sistemas={ajustes.sistemas} n={n} actual={al.sistemaId} alCerrar={() => setHoja(null)}
          elegir={(s) => { setAl(cambiarSistema({ ...al, titulares, suplentes }, s)); setHoja(null); }} irAjustes={() => ir("/ajustes")} />
      )}
      {hoja?.tipo === "elegir" && (
        <Hoja titulo="¿Quién juega aquí?" alCerrar={() => setHoja(null)}>
          {libresPara(hoja.indice).length === 0 ? (
            <p className="suave">No quedan jugadores libres. Pasa a alguien a suplentes o añade jugadores en la Plantilla.</p>
          ) : (
            <div className="lista">
              {libresPara(hoja.indice).map((j) => (
                <button key={j.id} type="button" className="fila fila-boton" onClick={() => { mover(j.id, { tipo: "hueco", indice: hoja.indice }); setHoja(null); }}>
                  <span className="chip-dorsal grande" style={{ background: ajustes.colorEquipo }}>{dorsal(j) ?? "–"}</span>
                  <span className="fila-texto"><b>{j.nombre}</b><span>{PUESTOS.find((p) => p.valor === j.posicion)?.texto}{suplentes.includes(j.id) ? " · suplente" : ""}</span></span>
                </button>
              ))}
            </div>
          )}
        </Hoja>
      )}
      {hoja?.tipo === "jugador" && porId.get(hoja.id) && (
        <HojaJugador jugador={porId.get(hoja.id)!} dorsalActual={dorsal(porId.get(hoja.id)!)} modo={ajustes.dorsales}
          titular={titulares.includes(hoja.id)} alCerrar={() => setHoja(null)}
          cambiarDorsal={(d) => setAl((x) => ({ ...x, dorsales: { ...x.dorsales, [hoja.id]: d } }))}
          aSuplentes={() => { mover(hoja.id, { tipo: "suplentes" }); setHoja(null); }}
          quitar={() => { mover(hoja.id, { tipo: "fuera" }); setHoja(null); }} />
      )}
      {hoja?.tipo === "vestuario" && (
        <HojaVestuario
          alCerrar={() => setHoja(null)}
          notas={al.notasHoja ?? ""}
          cambiarNotas={(t) => setAl((x) => ({ ...x, notasHoja: t }))}
          datos={{
            equipo: equipo.nombre, rival: partido.rival, modalidad: nombreModalidad(ajustes.modalidad),
            fecha: fechaCorta(partido.fecha), hora: partido.hora, campo: partido.campo, casa: partido.casa,
            sistema: al.sistemaNombre, posiciones: al.posiciones,
            titulares: titulares.map((id) => { const j = id ? porId.get(id) : undefined; return j ? { dorsal: dorsal(j), nombre: j.nombre } : null; }),
            suplentes: suplentes.map((id) => { const j = porId.get(id)!; return { dorsal: dorsal(j), nombre: j.nombre }; })
          }}
        />
      )}
      {hoja?.tipo === "guardarPlantilla" && (
        <HojaGuardarPlantilla alCerrar={() => setHoja(null)} alGuardar={async (nombre) => {
          await plantillas.guardar({ id: nuevoId(), equipoId: equipo.id, nombre, alineacion: { ...al, titulares, suplentes } });
          setHoja(null); avisar(`Plantilla «${nombre}» guardada`);
        }} />
      )}
      {hoja?.tipo === "usarPlantilla" && (
        <Hoja titulo="Usar una plantilla" alCerrar={() => setHoja(null)}>
          {plantillas.filas.length === 0 ? (
            <p className="suave">Aún no tienes plantillas. Haz una alineación y pulsa «Guardar como plantilla» para reutilizarla en otros partidos.</p>
          ) : (
            <div className="lista">
              {plantillas.filas.map((pl) => (
                <div key={pl.id} className="fila">
                  <button type="button" className="fila-texto boton-plano" onClick={async () => {
                    if (convocados.size > 0 && !(await confirmar({ titulo: `¿Usar «${pl.nombre}»?`, texto: "Se sustituirá la alineación actual de este partido.", boton: "Usar", peligro: false }))) return;
                    const existe = (id: string | null) => (id && porId.has(id) ? id : null);
                    setAl({ ...pl.alineacion, titulares: pl.alineacion.titulares.map(existe), suplentes: pl.alineacion.suplentes.filter((id) => porId.has(id)) });
                    setHoja(null); avisar(`Plantilla «${pl.nombre}» aplicada`);
                  }}>
                    <b>{pl.nombre}</b><span>{pl.alineacion.sistemaNombre} · {pl.alineacion.titulares.filter(Boolean).length} titulares · {pl.alineacion.suplentes.length} suplentes</span>
                  </button>
                  <button className="btn btn-icono btn-mini" type="button" aria-label={`Borrar plantilla ${pl.nombre}`} onClick={async () => {
                    if (await confirmar({ titulo: `¿Borrar la plantilla «${pl.nombre}»?`, texto: "Los partidos que ya la usaron no cambian." })) plantillas.borrar(pl.id);
                  }}><IcoPapelera /></button>
                </div>
              ))}
            </div>
          )}
        </Hoja>
      )}
    </div>
  );
}

function HojaSistemas({ sistemas, n, actual, elegir, alCerrar, irAjustes }: { sistemas: Sistema[]; n: number; actual: string; elegir: (s: Sistema) => void; alCerrar: () => void; irAjustes: () => void }) {
  const mios = sistemas.filter((s) => s.jugadores === n);
  const otros = sistemas.filter((s) => s.jugadores !== n);
  const fila = (s: Sistema) => (
    <button key={s.id} type="button" className="fila fila-boton" onClick={() => elegir(s)}>
      <span className="fila-texto"><b className="nombre-sistema">{s.nombre}</b><span>{s.jugadores} jugadores</span></span>
      {s.id === actual && <IcoCheck className="marca" />}
    </button>
  );
  return (
    <Hoja titulo="Sistema de juego" alCerrar={alCerrar}>
      {mios.length > 0 && <div className="lista">{mios.map(fila)}</div>}
      {otros.length > 0 && <><span className="etiqueta">Otras modalidades</span><div className="lista">{otros.map(fila)}</div></>}
      <button className="btn btn-borde btn-ancho" type="button" onClick={irAjustes}><IcoMas /> Crear un sistema en Ajustes</button>
    </Hoja>
  );
}

function HojaJugador({ jugador, dorsalActual, modo, titular, cambiarDorsal, aSuplentes, quitar, alCerrar }: {
  jugador: Jugador; dorsalActual: number | null; modo: "fijos" | "partido"; titular: boolean;
  cambiarDorsal: (d: number | null) => void; aSuplentes: () => void; quitar: () => void; alCerrar: () => void;
}) {
  const [texto, setTexto] = useState(dorsalActual?.toString() ?? "");
  const aplicar = (t: string) => {
    const limpio = t.replace(/\D/g, "").slice(0, 2);
    setTexto(limpio);
    cambiarDorsal(limpio === "" ? null : Number(limpio));
  };
  return (
    <Hoja titulo={jugador.nombre} alCerrar={alCerrar}>
      <label className="campo dorsal-partido">
        <span>Dorsal en este partido</span>
        <input className="entrada entrada-dorsal grande" inputMode="numeric" pattern="[0-9]*" value={texto} onChange={(e) => aplicar(e.target.value)} placeholder="—" aria-describedby="nota-dorsal" />
        <small id="nota-dorsal" className="suave">
          {modo === "fijos" && jugador.dorsal != null ? `Su dorsal fijo es el ${jugador.dorsal}. Cambiarlo aquí no toca el fijo.` : "Solo para este partido."}
        </small>
      </label>
      {modo === "fijos" && jugador.dorsal != null && texto !== String(jugador.dorsal) && (
        <button className="btn btn-texto" type="button" onClick={() => aplicar(String(jugador.dorsal))}>Volver a su dorsal fijo ({jugador.dorsal})</button>
      )}
      <div className="hoja-acciones">
        {titular
          ? <button className="btn btn-gris" type="button" onClick={aSuplentes}>Pasar a suplentes</button>
          : <button className="btn btn-gris" type="button" onClick={quitar}>Quitar de la convocatoria</button>}
        <button className="btn btn-principal" type="button" onClick={alCerrar}>Listo</button>
      </div>
      {titular && <button className="btn btn-texto" type="button" onClick={quitar}>Quitar de la convocatoria</button>}
    </Hoja>
  );
}

function HojaGuardarPlantilla({ alCerrar, alGuardar }: { alCerrar: () => void; alGuardar: (nombre: string) => Promise<void> }) {
  const [nombre, setNombre] = useState("");
  return (
    <Hoja titulo="Guardar como plantilla" alCerrar={alCerrar}>
      <form className="formulario" onSubmit={(e) => { e.preventDefault(); if (nombre.trim()) alGuardar(nombre.trim()); }}>
        <p className="suave">Guarda el sistema, los titulares, los suplentes y los dorsales para usarlos en otros partidos.</p>
        <label className="campo"><span>Nombre</span><input className="entrada" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Por ejemplo: Once de gala" maxLength={30} /></label>
        <div className="hoja-acciones">
          <button className="btn btn-gris cerrar-hoja" type="button" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-principal" type="submit" disabled={!nombre.trim()}>Guardar</button>
        </div>
      </form>
    </Hoja>
  );
}
