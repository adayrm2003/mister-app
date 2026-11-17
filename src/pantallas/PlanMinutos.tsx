// Reparto justo de minutos. Cómo se hacen los cambios se elige una vez en Ajustes (vale para todos
// los partidos del equipo); aquí se ve el plan de cada partido y, durante el partido, el próximo cambio.
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useEquipo } from "../ContextoEquipo";
import { Hoja } from "../componentes/ui";
import { jugadoresEnCampo, nuevoId, tiempoDePartido, type Ajustes, type Jugador, type Partido } from "../datos/modelo";
import { minutosCalculados, type Accion } from "../datos/partido";
import { MAX_VENTANAS, momentosDeCambio, pendientes, planificar, ventanasPorDefecto, type CambioPrevisto, type PlanCambios } from "../datos/rotacion";
import "./plan-minutos.css";

/** Convocados del partido: los de la alineación y, si no hay, los de la convocatoria. */
export function convocadosDe(p: Partido): string[] {
  const al = p.alineacion;
  const deAlineacion = al ? [...al.titulares.filter((x): x is string => !!x), ...al.suplentes] : [];
  return deAlineacion.length ? deAlineacion : (p.convocados ?? []);
}

/** Plan de cambios de un partido según los Ajustes del equipo (null si está desactivado o no hay convocados). */
export function planDePartido(p: Partido, ajustes: Ajustes, porId: Map<string, Jugador>): PlanCambios | null {
  const c = ajustes.cambios;
  if (!c.activo) return null;
  const convocados = convocadosDe(p).filter((id) => porId.has(id));
  if (!convocados.length) return null;
  const titulares = (p.alineacion?.titulares ?? []).filter((x): x is string => !!x);
  const primero = p.alineacion?.titulares[0];
  const portero = !c.porteroFijo ? null
    : (primero && porId.get(primero)?.posicion === "portero" ? primero : null) ?? convocados.find((id) => porId.get(id)?.posicion === "portero") ?? null;
  const { partes, minutos } = tiempoDePartido(ajustes);
  return planificar({
    convocados, titulares, porteroId: portero, enCampo: jugadoresEnCampo(ajustes), partes, minutosParte: minutos,
    tramos: c.tramos, limite: c.limite, ventanas: c.ventanas ?? undefined, descanso: c.descanso, puesto: (id) => porId.get(id)?.posicion
  });
}

/** Resumen de cómo están configurados los cambios (para enseñarlo en el partido y en Ajustes). */
export function textoCambios(ajustes: Ajustes) {
  const c = ajustes.cambios;
  if (!c.activo) return "Plan de cambios desactivado";
  const { partes, minutos } = tiempoDePartido(ajustes);
  if (c.limite == null) return `Cambios ilimitados · ${c.tramos === 1 ? "en el descanso" : `cada ${Math.round(minutos / c.tramos)} min`}`;
  const m = momentosDeCambio(partes, minutos, c.ventanas ?? ventanasPorDefecto(partes, minutos), c.descanso);
  return `Máximo ${c.limite} cambios · ${m.map((x) => (x.descanso ? "descanso" : `${x.minuto}′`)).join(", ")}`;
}

/** Ventanas de cambio ya usadas: minutos distintos con cambios hechos durante el juego (el descanso no cuenta). */
export const ventanasUsadas = (acciones: Accion[]) => new Set(acciones.filter((a) => a.tipo === "cambio" && !a.descanso).map((a) => a.minuto));

export function HojaPlanMinutos({ partido, jugadores, alCerrar }: { partido: Partido; jugadores: Jugador[]; alCerrar: () => void }) {
  const { ajustes } = useEquipo();
  const { partes, minutos: minutosParte } = tiempoDePartido(ajustes);
  const porId = useMemo(() => new Map(jugadores.map((j) => [j.id, j])), [jugadores]);
  const plan = planDePartido(partido, ajustes, porId);
  const convocados = convocadosDe(partido).filter((id) => porId.has(id));
  const nombre = (id: string) => porId.get(id)?.nombre ?? "—";
  const max = partes * minutosParte;

  return (
    <Hoja titulo="Reparto de minutos" alCerrar={alCerrar}>
      <div className="plan-minutos">
        <div className="resumen-cambios tarjeta">
          <span className="fila-texto"><span className="etiqueta">Cómo cambias</span><b>{textoCambios(ajustes)}</b></span>
          <Link className="btn btn-borde" to="/ajustes#cambios" onClick={alCerrar}>Cambiar</Link>
        </div>
        {!ajustes.cambios.activo ? (
          <p className="suave">Con el plan desactivado no te proponemos cambios: los haces tú cuando quieras. Puedes activarlo en Ajustes y valdrá para todos los partidos.</p>
        ) : convocados.length === 0 || !plan ? (
          <p className="suave">Primero haz la convocatoria o la alineación: el reparto se hace entre los convocados.</p>
        ) : (
          <PlanVista plan={plan} convocados={convocados} nombre={nombre} max={max} minutosParte={minutosParte} colorEquipo={ajustes.colorEquipo} />
        )}
        <div className="hoja-acciones"><button className="btn btn-principal" type="button" onClick={alCerrar}>Listo</button></div>
      </div>
    </Hoja>
  );
}

function PlanVista({ plan, convocados, nombre, max, minutosParte, colorEquipo }: {
  plan: PlanCambios; convocados: string[]; nombre: (id: string) => string; max: number; minutosParte: number; colorEquipo: string;
}) {
  const lista = [...convocados].sort((a, b) => (plan.minutos[b] ?? 0) - (plan.minutos[a] ?? 0) || nombre(a).localeCompare(nombre(b), "es"));
  const porMinuto = agrupar(plan.cambios);
  const sinJugar = plan.limite != null ? convocados.filter((id) => (plan.minutos[id] ?? 0) === 0) : [];
  return (
    <>
      <h3 className="etiqueta">Minutos previstos · {convocados.length} convocados</h3>
      <ul className="barras-minutos">
        {lista.map((id) => {
          const m = plan.minutos[id] ?? 0;
          return (
            <li key={id}>
              <span className="nombre">{nombre(id)}{id === plan.porteroId ? " (POR)" : ""}</span>
              <span className="barra"><span style={{ width: `${(m / max) * 100}%`, background: colorEquipo }} /></span>
              <b>{m}′</b>
            </li>
          );
        })}
      </ul>
      <h3 className="etiqueta">Cambios previstos{plan.limite != null ? ` · ${plan.cambios.length} de ${plan.limite}` : ""}</h3>
      {porMinuto.length === 0 ? <p className="suave">Con estos convocados todos juegan el partido entero: no hace falta cambiar.</p> : (
        <ol className="cambios-previstos">
          {porMinuto.map(([min, cs]) => (
            <li key={min + (cs[0].descanso ? "d" : "")}>
              <span className="pastilla">{cs[0].descanso || (plan.limite == null && min === minutosParte) ? "Descanso" : `Min ${min}`}</span>
              <div>{cs.map((c, i) => <p key={i}><span className="sale">↓ {nombre(c.sale)}</span> <span className="entra">↑ {nombre(c.entra)}</span></p>)}</div>
            </li>
          ))}
        </ol>
      )}
      {sinJugar.length > 0 && (
        <p className="mensaje mensaje-aviso">Con {plan.limite} cambios no les da tiempo a jugar a todos: {sinJugar.map(nombre).join(", ")} no entrarían. Puedes convocar a menos jugadores o elegir cambios ilimitados en Ajustes.</p>
      )}
      <p className="suave">Es una propuesta: durante el partido verás el próximo cambio y podrás hacerlo con un toque, o cambiar a quien quieras.</p>
    </>
  );
}

const agrupar = (cs: CambioPrevisto[]) => {
  const m = new Map<string, CambioPrevisto[]>();
  for (const c of cs) { const k = `${c.minuto}${c.descanso ? "d" : ""}`; m.set(k, [...(m.get(k) ?? []), c]); }
  return [...m.values()].map((l) => [l[0].minuto, l] as const).sort((a, b) => a[0] - b[0] || Number(!!b[1][0].descanso) - Number(!!a[1][0].descanso));
};

/** Durante el partido: el próximo cambio del plan (con botón de un toque), los cambios y ventanas que quedan, y quién aún no ha jugado. */
export function AvisoMinutos({ partido, jugadores, minuto, duracion, enDescanso, guardarAcciones, abrirPlan }: {
  partido: Partido; jugadores: Jugador[]; minuto: number | null; duracion: number; enDescanso: boolean;
  /** Añade cambios al partido (varios a la vez sin pisarse). */
  guardarAcciones: (as: Accion[]) => Promise<void>; abrirPlan: () => void;
}) {
  const { ajustes } = useEquipo();
  const porId = new Map(jugadores.map((j) => [j.id, j]));
  const nombre = (id: string) => porId.get(id)?.nombre ?? "—";
  const acciones = partido.acciones ?? [];
  const hechos = acciones.filter((a) => a.tipo === "cambio");
  const plan = planDePartido(partido, ajustes, porId);
  const terminado = !!partido.reloj?.terminado;
  if (!ajustes.cambios.activo) return null;

  const quedan = pendientes(plan, hechos);
  const siguiente = quedan[0];
  const siguientes = siguiente ? quedan.filter((c) => c.minuto === siguiente.minuto && !!c.descanso === !!siguiente.descanso) : [];
  const ahora = minuto ?? 0;
  const jugados = minutosCalculados(partido.alineacion, acciones, Math.max(0, Math.min(ahora, duracion)));
  const sinJugar = convocadosDe(partido).filter((id) => porId.has(id) && !(jugados[id] > 0));
  const limite = plan?.limite ?? ajustes.cambios.limite;
  const agotados = limite != null && hechos.length >= limite;
  const usadas = ventanasUsadas(acciones);
  const visibles = limite != null ? siguientes.slice(0, Math.max(0, limite - hechos.length)) : siguientes;
  const avisarSinJugar = !agotados && minuto != null && ahora >= duracion / 2 && sinJugar.length > 0 && !terminado;
  if (!plan && !avisarSinJugar) return null;
  const hacer = (cs: CambioPrevisto[]) => guardarAcciones(cs.map((c) => ({ id: nuevoId(), tipo: "cambio" as const, minuto: minuto ?? c.minuto, jugadorId: c.sale, entraId: c.entra })));
  const tocaYa = siguiente && (siguiente.descanso ? enDescanso : minuto != null && minuto >= siguiente.minuto);

  return (
    <section className="aviso-minutos tarjeta" aria-live="polite">
      {avisarSinJugar && <p className="mensaje mensaje-aviso"><b>Aún no han jugado:</b> {sinJugar.map(nombre).join(", ")}</p>}
      {limite != null && (
        <span className={"etiqueta contador-cambios" + (agotados ? " agotados" : "")}>
          Cambios {Math.min(hechos.length, limite)} de {limite} · Ventanas {Math.min(usadas.size, MAX_VENTANAS)} de {MAX_VENTANAS}{agotados ? " · ya no quedan" : ""}
        </span>
      )}
      {plan && !agotados && visibles.length > 0 && !terminado && (
        <>
          <span className="etiqueta">Próximo cambio previsto · {siguiente!.descanso ? "en el descanso" : `min ${siguiente!.minuto}`}{tocaYa ? " · ¡ya toca!" : ""}</span>
          {visibles.length > 1 && <button className="btn btn-peto btn-ancho" type="button" onClick={() => hacer(visibles)}>Hacer los {visibles.length} cambios</button>}
          {visibles.map((c, i) => (
            <div key={i} className="cambio-previsto">
              <span><span className="sale">↓ {nombre(c.sale)}</span> <span className="entra">↑ {nombre(c.entra)}</span></span>
              <button className="btn btn-principal" type="button" onClick={() => hacer([c])}>Hacer cambio</button>
            </div>
          ))}
        </>
      )}
      {plan && <button className="btn btn-texto" type="button" onClick={abrirPlan}>Ver el plan de minutos</button>}
    </section>
  );
}
