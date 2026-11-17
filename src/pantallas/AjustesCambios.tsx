// Ajustes de los cambios: se eligen una vez y valen para todos los partidos del equipo.
// Activado o desactivado; cambios ilimitados o máximo 5 (en 3 ventanas durante el juego, más el descanso).
import { useEffect, useRef } from "react";
import { useEquipo } from "../ContextoEquipo";
import { Contador } from "../componentes/Controles";
import { IcoMas, IcoPapelera } from "../componentes/Iconos";
import { CAMBIOS_BASE, tiempoDePartido, type AjustesCambios } from "../datos/modelo";
import { MAX_CAMBIOS, MAX_VENTANAS, momentosDeCambio, repartoCambios, ventanasPorDefecto } from "../datos/rotacion";
import "./plan-minutos.css";

export default function AjustesDeCambios() {
  const { equipo, ajustes, cambiarAjustesEquipo } = useEquipo();
  const c: AjustesCambios = { ...CAMBIOS_BASE, ...ajustes.cambios };
  const { partes, minutos } = tiempoDePartido(ajustes);
  const dur = partes * minutos;
  const set = (p: Partial<AjustesCambios>) => cambiarAjustesEquipo({ cambios: { ...c, ...p } });
  const ventanas = (c.ventanas ?? ventanasPorDefecto(partes, minutos)).filter((m) => m > 0 && m < dur).slice(0, MAX_VENTANAS);
  const ponerVentanas = (v: number[]) => set({ ventanas: v });
  const momentos = momentosDeCambio(partes, minutos, ventanas, c.descanso);
  const reparto = repartoCambios(momentos, c.limite ?? MAX_CAMBIOS, dur);
  const opcionesTramo = [1, 2, 3].filter((t) => minutos / t >= 5);
  const parteDe = (m: number) => (partes >= 2 ? (m <= minutos ? "1ª parte" : "2ª parte") : "");

  // Si se llega con #cambios (desde el partido), se baja hasta aquí
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { if (location.hash === "#cambios") ref.current?.scrollIntoView({ block: "start" }); }, []);

  return (
    <section className="apartado ajustes-cambios" id="cambios" ref={ref}>
      <header><h2>Cambios y minutos</h2><p className="suave">Para todos los partidos de {equipo.nombre}. La app te propone los cambios para que todos jueguen parecido.</p></header>
      <div className="campo"><span>Plan de cambios</span>
        <div className="barra-opciones" role="radiogroup" aria-label="Plan de cambios">
          <button type="button" role="radio" aria-checked={c.activo} onClick={() => set({ activo: true })}>Activado</button>
          <button type="button" role="radio" aria-checked={!c.activo} onClick={() => set({ activo: false })}>Desactivado</button>
        </div>
        {!c.activo && <small className="suave">Sin plan: no te proponemos cambios ni te avisamos de quién no ha jugado. Haces los cambios tú cuando quieras.</small>}
      </div>

      {c.activo && (
        <>
          <div className="campo"><span>Número de cambios</span>
            <div className="barra-opciones" role="radiogroup" aria-label="Número de cambios">
              <button type="button" role="radio" aria-checked={c.limite == null} onClick={() => set({ limite: null })}>Ilimitados</button>
              <button type="button" role="radio" aria-checked={c.limite != null} onClick={() => set({ limite: MAX_CAMBIOS })}>Máximo {MAX_CAMBIOS}</button>
            </div>
            <small className="suave">{c.limite == null
              ? "Se puede cambiar las veces que haga falta y volver a entrar."
              : `Como mucho ${MAX_CAMBIOS} cambios en ${MAX_VENTANAS} ventanas durante el juego. El descanso no cuenta como ventana. Quien sale ya no vuelve.`}</small>
          </div>

          {c.limite == null ? (
            <div className="campo"><span>¿Cada cuánto quieres hacer cambios?</span>
              <div className="barra-opciones" role="radiogroup" aria-label="Cada cuánto cambiar">
                {opcionesTramo.map((t) => (
                  <button key={t} type="button" role="radio" aria-checked={c.tramos === t} onClick={() => set({ tramos: t })}>
                    {t === 1 ? "En el descanso" : `Cada ${Math.round(minutos / t)} min`}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="campo"><span>¿Cuándo haces los cambios?</span>
              <ul className="ventanas-cambio">
                {ventanas.map((m, i) => (
                  <li key={i}>
                    <span className="ventana-nombre"><b>Ventana {i + 1}</b><small className="suave">{parteDe(m)}</small></span>
                    <Contador valor={m} min={1} max={dur - 1} etiqueta={`Minuto de la ventana ${i + 1}`} cambiar={(v) => ponerVentanas(ventanas.map((x, k) => (k === i ? v : x)))} />
                    <button type="button" className="btn btn-icono" aria-label={`Quitar la ventana ${i + 1}`} onClick={() => ponerVentanas(ventanas.filter((_, k) => k !== i))}><IcoPapelera /></button>
                  </li>
                ))}
              </ul>
              {ventanas.length < MAX_VENTANAS && (
                <button type="button" className="btn btn-borde" onClick={() => ponerVentanas([...ventanas, Math.min(dur - 1, (ventanas[ventanas.length - 1] ?? Math.round(dur / 3)) + 5)])}>
                  <IcoMas /> Añadir ventana ({ventanas.length} de {MAX_VENTANAS})
                </button>
              )}
              {partes >= 2 && (
                <label className="interruptor">
                  <input type="checkbox" checked={c.descanso} onChange={(e) => set({ descanso: e.target.checked })} />
                  <span><b>Cambiar también en el descanso</b><small className="suave">No gasta ninguna de las {MAX_VENTANAS} ventanas.</small></span>
                </label>
              )}
              {momentos.length > 0 && (
                <p className="suave reparto-ventanas">
                  Así se repartirían los {MAX_CAMBIOS} cambios: {momentos.map((m, i) => `${m.descanso ? "descanso" : `min ${m.minuto}`} (${reparto[i]})`).join(" · ")}.
                  {" "}Si tienes menos suplentes, se usan los momentos más cercanos a la mitad del partido.
                </p>
              )}
              {momentos.length === 0 && <p className="mensaje mensaje-aviso">Añade al menos una ventana o activa el descanso.</p>}
            </div>
          )}

          <label className="interruptor">
            <input type="checkbox" checked={c.porteroFijo} onChange={(e) => set({ porteroFijo: e.target.checked })} />
            <span><b>El portero juega todo el partido</b><small className="suave">No entra en el reparto de minutos.</small></span>
          </label>
        </>
      )}
    </section>
  );
}
