// Después del partido: las conclusiones del entrenador y una valoración del 1 al 5 (con circulitos)
// de cada jugador que ha jugado, con un comentario opcional. Se guarda solo.
import { useEffect, useMemo, useRef, useState } from "react";
import { useEquipo } from "../ContextoEquipo";
import { tiempoDePartido, type Jugador, type Partido, type Valoracion as TValoracion } from "../datos/modelo";
import { minutosFinales } from "../datos/partido";
import { convocadosDe } from "./PlanMinutos";
import "./valoracion.css";

/** Cinco circulitos: se rellenan hasta la nota. Tocar la misma nota la quita. */
export function Circulos({ valor, cambiar, etiqueta, pequenos = false }: { valor: number | null; cambiar?: (n: number | null) => void; etiqueta: string; pequenos?: boolean }) {
  if (!cambiar) {
    return (
      <span className={"circulos" + (pequenos ? " pequenos" : "")} role="img" aria-label={`${etiqueta}: ${valor ?? "sin nota"} de 5`}>
        {[1, 2, 3, 4, 5].map((n) => <span key={n} className={"circulo" + (valor != null && n <= Math.round(valor) ? " lleno" : "")} />)}
      </span>
    );
  }
  return (
    <span className="circulos" role="radiogroup" aria-label={etiqueta}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={valor === n} aria-label={`${n} de 5`}
          className={"circulo" + (valor != null && n <= valor ? " lleno" : "")} onClick={() => cambiar(valor === n ? null : n)} />
      ))}
    </span>
  );
}

export default function ValoracionPartido({ partido, jugadores, guardarPartido }: { partido: Partido; jugadores: Jugador[]; guardarPartido: (p: Partido) => Promise<void> }) {
  const { ajustes } = useEquipo();
  const { partes, minutos: mp } = tiempoDePartido(ajustes);
  const [conclusiones, setConclusiones] = useState(partido.conclusiones ?? "");
  const [vals, setVals] = useState<Record<string, TValoracion>>(partido.valoraciones ?? {});
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set(Object.entries(partido.valoraciones ?? {}).filter(([, v]) => v.comentario).map(([k]) => k)));
  const [estado, setEstado] = useState<"guardando" | "guardado" | null>(null);
  const porId = useMemo(() => new Map(jugadores.map((j) => [j.id, j])), [jugadores]);
  const minutos = minutosFinales(partido, partes * mp);
  const hayMinutos = partido.alineacion != null;
  // Jugaron: con minutos (o titulares); si no hay alineación, los convocados
  const ids = (hayMinutos ? Object.keys(minutos).filter((id) => minutos[id] > 0 || partido.alineacion!.titulares.includes(id)) : convocadosDe(partido))
    .filter((id) => porId.has(id))
    .sort((a, b) => (minutos[b] ?? 0) - (minutos[a] ?? 0) || porId.get(a)!.nombre.localeCompare(porId.get(b)!.nombre, "es"));
  const noJugaron = hayMinutos ? convocadosDe(partido).filter((id) => porId.has(id) && !ids.includes(id)) : [];

  // Guardado automático
  const ultimo = useRef(JSON.stringify({ c: partido.conclusiones ?? "", v: partido.valoraciones ?? {} }));
  const actual = useRef(partido);
  actual.current = partido;
  useEffect(() => {
    const texto = JSON.stringify({ c: conclusiones, v: vals });
    if (texto === ultimo.current) return;
    setEstado("guardando");
    const t = setTimeout(() => {
      ultimo.current = texto;
      guardarPartido({ ...actual.current, conclusiones, valoraciones: vals }).then(() => setEstado("guardado")).catch(() => setEstado(null));
    }, 600);
    return () => clearTimeout(t);
  }, [conclusiones, vals]); // eslint-disable-line react-hooks/exhaustive-deps

  const poner = (id: string, c: Partial<TValoracion>) => setVals((v) => {
    const nuevo = { nota: v[id]?.nota ?? null, comentario: v[id]?.comentario ?? "", ...c };
    const r = { ...v };
    if (nuevo.nota == null && !nuevo.comentario) delete r[id]; else r[id] = nuevo;
    return r;
  });
  const notas = Object.values(vals).map((v) => v.nota).filter((n): n is number => n != null);
  const media = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null;

  return (
    <div className="valoracion">
      <p className="estado-guardado suave" aria-live="polite">{estado === "guardando" ? "Guardando…" : estado === "guardado" ? "Guardado ✓" : " "}</p>
      <label className="campo"><span>Conclusiones del partido</span>
        <textarea className="entrada area" rows={5} maxLength={3000} value={conclusiones} onChange={(e) => setConclusiones(e.target.value)}
          placeholder="Qué ha salido bien, qué hay que mejorar, qué trabajar esta semana…" />
      </label>

      <section className="valorar-jugadores">
        <div className="valorar-cabeza">
          <h2 className="etiqueta">Jugadores · {ids.length}</h2>
          {media != null && <span className="media-equipo"><Circulos valor={media} etiqueta="Media del equipo" pequenos /> {media.toFixed(1).replace(".", ",")}</span>}
        </div>
        {ids.length === 0 ? (
          <p className="suave">Haz la alineación (o la convocatoria) del partido para poder valorar a los jugadores.</p>
        ) : (
          <ul className="lista-valorar">
            {ids.map((id) => {
              const j = porId.get(id)!;
              const v = vals[id];
              return (
                <li key={id}>
                  <div className="valorar-fila">
                    <span className="fila-texto"><b>{j.nombre}</b>{hayMinutos && <span>{minutos[id] ?? 0}′ jugados</span>}</span>
                    <Circulos valor={v?.nota ?? null} cambiar={(n) => poner(id, { nota: n })} etiqueta={`Valoración de ${j.nombre}`} />
                  </div>
                  {abiertos.has(id) ? (
                    <input className="entrada entrada-comentario" value={v?.comentario ?? ""} maxLength={200} placeholder={`Comentario sobre ${j.nombre} (deportivo)`}
                      onChange={(e) => poner(id, { comentario: e.target.value })} />
                  ) : (
                    <button type="button" className="btn btn-texto anadir-comentario" onClick={() => setAbiertos((s) => new Set(s).add(id))}>+ Comentario</button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {noJugaron.length > 0 && <p className="suave">No jugaron: {noJugaron.map((id) => porId.get(id)!.nombre).join(", ")}.</p>}
      </section>
    </div>
  );
}
