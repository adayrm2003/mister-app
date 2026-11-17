// Reparto justo de minutos: la hoja para preparar el plan de cambios antes del partido
// y el aviso durante el partido (próximo cambio y quién aún no ha jugado).
import { useMemo, useState } from "react";
import { useEquipo } from "../ContextoEquipo";
import { Hoja, useUi } from "../componentes/ui";
import { jugadoresEnCampo, nuevoId, tiempoDePartido, type Jugador, type Partido } from "../datos/modelo";
import { minutosCalculados, type Accion } from "../datos/partido";
import { pendientes, planificar, type CambioPrevisto, type PlanCambios } from "../datos/rotacion";
import "./plan-minutos.css";

/** Convocados del partido: los de la alineación y, si no hay, los de la convocatoria. */
export function convocadosDe(p: Partido): string[] {
  const al = p.alineacion;
  const deAlineacion = al ? [...al.titulares.filter((x): x is string => !!x), ...al.suplentes] : [];
  return deAlineacion.length ? deAlineacion : (p.convocados ?? []);
}

export function HojaPlanMinutos({ partido, jugadores, guardarPartido, alCerrar }: {
  partido: Partido; jugadores: Jugador[]; guardarPartido: (p: Partido) => Promise<void>; alCerrar: () => void;
}) {
  const { ajustes } = useEquipo();
  const { avisar } = useUi();
  const { partes, minutos: minutosParte } = tiempoDePartido(ajustes);
  const porId = useMemo(() => new Map(jugadores.map((j) => [j.id, j])), [jugadores]);
  const convocados = convocadosDe(partido).filter((id) => porId.has(id));
  const titulares = (partido.alineacion?.titulares ?? []).filter((x): x is string => !!x);
  const porteroInicial = partido.planCambios?.porteroId
    ?? (partido.alineacion?.titulares[0] && porId.get(partido.alineacion.titulares[0])?.posicion === "portero" ? partido.alineacion.titulares[0] : null)
    ?? convocados.find((id) => porId.get(id)?.posicion === "portero") ?? null;
  const [tramos, setTramos] = useState(partido.planCambios?.tramos ?? 2);
  const [portero, setPortero] = useState<string | null>(porteroInicial);
  const n = jugadoresEnCampo(ajustes);

  const plan = useMemo(() => planificar({
    convocados, titulares, porteroId: portero, enCampo: n, partes, minutosParte, tramos, puesto: (id) => porId.get(id)?.posicion
  }), [convocados.join(), titulares.join(), portero, n, partes, minutosParte, tramos, porId]); // eslint-disable-line react-hooks/exhaustive-deps
  const nombre = (id: string) => porId.get(id)?.nombre ?? "—";
  const porMinuto = agrupar(plan.cambios);
  const max = partes * minutosParte;
  const lista = [...convocados].sort((a, b) => (plan.minutos[b] ?? 0) - (plan.minutos[a] ?? 0) || nombre(a).localeCompare(nombre(b), "es"));
  const opcionesTramo = [1, 2, 3].filter((t) => minutosParte / t >= 5);
  const porteros = convocados.filter((id) => porId.get(id)?.posicion === "portero");
  const otrosPorteros = portero && !porteros.includes(portero) ? [portero] : [];

  async function guardar() {
    await guardarPartido({ ...partido, planCambios: plan });
    avisar("Plan de cambios guardado");
    alCerrar();
  }

  return (
    <Hoja titulo="Reparto de minutos" alCerrar={alCerrar}>
      {convocados.length === 0 ? (
        <p className="suave">Primero haz la convocatoria o la alineación: el reparto se hace entre los convocados.</p>
      ) : (
        <div className="plan-minutos">
          <div className="campo"><span>¿Cada cuánto quieres hacer cambios?</span>
            <div className="barra-opciones" role="radiogroup" aria-label="Cada cuánto cambiar">
              {opcionesTramo.map((t) => (
                <button key={t} type="button" role="radio" aria-checked={tramos === t} onClick={() => setTramos(t)}>
                  {t === 1 ? "En el descanso" : `Cada ${Math.round(minutosParte / t)} min`}
                </button>
              ))}
            </div>
          </div>
          <div className="campo"><span>Portero (juega todo el partido)</span>
            <div className="chips-eleccion" role="radiogroup" aria-label="Portero">
              {[...porteros, ...otrosPorteros].map((id) => (
                <button key={id} type="button" role="radio" aria-checked={portero === id} onClick={() => setPortero(id)}>{nombre(id)}</button>
              ))}
              <button type="button" role="radio" aria-checked={portero === null} onClick={() => setPortero(null)}>Sin portero fijo</button>
            </div>
          </div>

          <h3 className="etiqueta">Minutos previstos · {convocados.length} convocados</h3>
          <ul className="barras-minutos">
            {lista.map((id) => {
              const m = plan.minutos[id] ?? 0;
              return (
                <li key={id}>
                  <span className="nombre">{nombre(id)}{id === plan.porteroId ? " (POR)" : ""}</span>
                  <span className="barra"><span style={{ width: `${(m / max) * 100}%`, background: ajustes.colorEquipo }} /></span>
                  <b>{m}′</b>
                </li>
              );
            })}
          </ul>

          <h3 className="etiqueta">Cambios previstos</h3>
          {porMinuto.length === 0 ? <p className="suave">Con estos convocados todos juegan el partido entero: no hace falta cambiar.</p> : (
            <ol className="cambios-previstos">
              {porMinuto.map(([min, cs]) => (
                <li key={min}>
                  <span className="pastilla">Min {min}{min === minutosParte ? " · descanso" : ""}</span>
                  <div>{cs.map((c, i) => <p key={i}><span className="sale">↓ {nombre(c.sale)}</span> <span className="entra">↑ {nombre(c.entra)}</span></p>)}</div>
                </li>
              ))}
            </ol>
          )}
          <p className="suave">Es una propuesta: durante el partido verás el próximo cambio y podrás hacerlo con un toque, o cambiar a quien quieras.</p>
          <div className="hoja-acciones">
            {partido.planCambios
              ? <button className="btn btn-gris" type="button" onClick={async () => { await guardarPartido({ ...partido, planCambios: null }); avisar("Plan quitado"); alCerrar(); }}>Quitar plan</button>
              : <button className="btn btn-gris" type="button" onClick={alCerrar}>Cancelar</button>}
            <button className="btn btn-principal" type="button" onClick={guardar}>Guardar plan</button>
          </div>
        </div>
      )}
    </Hoja>
  );
}

const agrupar = (cs: CambioPrevisto[]) => {
  const m = new Map<number, CambioPrevisto[]>();
  for (const c of cs) m.set(c.minuto, [...(m.get(c.minuto) ?? []), c]);
  return [...m.entries()].sort((a, b) => a[0] - b[0]);
};

/** Durante el partido: el próximo cambio del plan (con botón de un toque) y quién aún no ha jugado. */
export function AvisoMinutos({ partido, jugadores, minuto, duracion, guardarAcciones, abrirPlan }: {
  partido: Partido; jugadores: Jugador[]; minuto: number | null; duracion: number;
  /** Añade cambios al partido (varios a la vez sin pisarse). */
  guardarAcciones: (as: Accion[]) => Promise<void>; abrirPlan: () => void;
}) {
  const porId = new Map(jugadores.map((j) => [j.id, j]));
  const nombre = (id: string) => porId.get(id)?.nombre ?? "—";
  const hechos = (partido.acciones ?? []).filter((a) => a.tipo === "cambio");
  const plan: PlanCambios | null | undefined = partido.planCambios;
  const quedan = pendientes(plan, hechos);
  const siguienteMin = quedan[0]?.minuto;
  const siguientes = quedan.filter((c) => c.minuto === siguienteMin);
  const ahora = minuto ?? 0;
  const jugados = minutosCalculados(partido.alineacion, partido.acciones ?? [], Math.max(0, Math.min(ahora, duracion)));
  const sinJugar = convocadosDe(partido).filter((id) => porId.has(id) && !(jugados[id] > 0));
  const avisarSinJugar = minuto != null && ahora >= duracion / 2 && sinJugar.length > 0 && !partido.reloj?.terminado;
  if (!plan && !avisarSinJugar) {
    return convocadosDe(partido).length > 0 && !partido.reloj?.terminado
      ? <button className="btn btn-borde btn-ancho" type="button" onClick={abrirPlan}>⏱ Repartir minutos (plan de cambios)</button>
      : null;
  }
  return (
    <section className="aviso-minutos tarjeta" aria-live="polite">
      {avisarSinJugar && (
        <p className="mensaje mensaje-aviso"><b>Aún no han jugado:</b> {sinJugar.map(nombre).join(", ")}</p>
      )}
      {plan && siguientes.length > 0 && !partido.reloj?.terminado && (
        <>
          <span className="etiqueta">Próximo cambio previsto · min {siguienteMin}{minuto != null && minuto >= siguienteMin! ? " · ¡ya toca!" : ""}</span>
          {siguientes.length > 1 && (
            <button className="btn btn-peto btn-ancho" type="button" onClick={async () => {
              await guardarAcciones(siguientes.map((c) => ({ id: nuevoId(), tipo: "cambio" as const, minuto: minuto ?? c.minuto, jugadorId: c.sale, entraId: c.entra })));
            }}>Hacer los {siguientes.length} cambios</button>
          )}
          {siguientes.map((c, i) => (
            <div key={i} className="cambio-previsto">
              <span><span className="sale">↓ {nombre(c.sale)}</span> <span className="entra">↑ {nombre(c.entra)}</span></span>
              <button className="btn btn-principal" type="button"
                onClick={() => guardarAcciones([{ id: nuevoId(), tipo: "cambio", minuto: minuto ?? c.minuto, jugadorId: c.sale, entraId: c.entra }])}>Hacer cambio</button>
            </div>
          ))}
        </>
      )}
      {plan && <button className="btn btn-texto" type="button" onClick={abrirPlan}>Ver o cambiar el plan</button>}
    </section>
  );
}
