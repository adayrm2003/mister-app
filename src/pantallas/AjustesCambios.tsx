// Ajustes de los cambios: se eligen una vez y valen para todos los partidos del equipo.
// Activado o desactivado; cambios ilimitados o máximo 5 (en 3 ventanas durante el juego, más el descanso).
// Las ventanas no tienen minutos fijos: se cuentan en el partido según se hacen los cambios.
import { useEffect, useRef } from "react";
import { useEquipo } from "../ContextoEquipo";
import { CAMBIOS_BASE, tiempoDePartido, type AjustesCambios } from "../datos/modelo";
import { MAX_CAMBIOS, MAX_VENTANAS } from "../datos/rotacion";
import "./plan-minutos.css";

export default function AjustesDeCambios() {
  const { equipo, ajustes, cambiarAjustesEquipo } = useEquipo();
  const c: AjustesCambios = { ...CAMBIOS_BASE, ...ajustes.cambios };
  const { minutos } = tiempoDePartido(ajustes);
  const set = (p: Partial<AjustesCambios>) => cambiarAjustesEquipo({ cambios: { ...c, ...p } });
  const opcionesTramo = [1, 2, 3].filter((t) => minutos / t >= 5);

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
            <div className="tarjeta ventanas-info">
              <p><b>{MAX_VENTANAS} ventanas de cambio durante el juego</b> y, aparte, <b>el descanso</b>, que no gasta ninguna.</p>
              <p className="suave">No hace falta fijar minutos: haces los cambios cuando lo necesites (una lesión, el marcador…). En el partido, al hacer un cambio eliges si es durante el juego o en el descanso, y la app lleva la cuenta de cambios y ventanas. Varios cambios en el mismo minuto van en la misma ventana.</p>
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
