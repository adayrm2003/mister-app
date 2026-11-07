// Crear o editar un sistema de juego moviendo los huecos sobre el campo.
import { useRef, useState, type PointerEvent as PE } from "react";
import { Campo, Ficha } from "../componentes/Campo";
import { Contador } from "../componentes/Controles";
import { Hoja } from "../componentes/ui";
import { porLineas, type Punto, type Sistema } from "../datos/modelo";

/** Reparto inicial razonable para n jugadores (portero + líneas). */
export function repartoInicial(n: number): Punto[] {
  const campo = n - 1;
  if (campo <= 0) return [{ x: 50, y: 91 }];
  if (campo <= 3) return porLineas([campo]);
  const def = Math.round(campo * 0.4);
  const del = Math.max(1, Math.round(campo * 0.2));
  return porLineas([def, campo - def - del, del]);
}

export default function EditorSistema({ inicial, jugadoresPorDefecto, alCerrar, alGuardar }: {
  inicial: Sistema | null; jugadoresPorDefecto: number; alCerrar: () => void; alGuardar: (s: Sistema) => void;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [posiciones, setPosiciones] = useState<Punto[]>(inicial?.posiciones ?? repartoInicial(jugadoresPorDefecto));
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const campo = useRef<HTMLDivElement>(null);

  function cambiarCantidad(n: number) {
    setPosiciones((p) => (n < p.length ? p.slice(0, n) : [...p, ...repartoInicial(n).slice(p.length)]));
  }
  function mover(e: PE<HTMLButtonElement>, i: number) {
    if (arrastrando !== i || !campo.current) return;
    const r = campo.current.getBoundingClientRect();
    const x = Math.min(96, Math.max(4, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.min(97, Math.max(3, ((e.clientY - r.top) / r.height) * 100));
    setPosiciones((p) => p.map((q, j) => (j === i ? { x: Math.round(x), y: Math.round(y) } : q)));
  }

  const valido = nombre.trim().length > 0;
  return (
    <Hoja titulo={inicial ? "Editar sistema" : "Nuevo sistema"} alCerrar={alCerrar}>
      <label className="campo"><span>Nombre</span><input className="entrada" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Por ejemplo: 4-2-3-1" maxLength={20} /></label>
      <div className="campo" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <span>Jugadores en el campo</span>
        <Contador valor={posiciones.length} cambiar={cambiarCantidad} min={3} max={11} etiqueta="Jugadores en el campo" />
      </div>
      <p className="suave" style={{ fontSize: 15 }}>Arrastra cada hueco a su sitio. El 1 es el portero.</p>
      <div className="editor-sistema">
        <Campo ref={campo}>
          {posiciones.map((p, i) => (
            <button key={i} type="button" className="campo-pieza pieza-arrastrable" style={{ left: `${p.x}%`, top: `${p.y}%` }}
              aria-label={`Hueco ${i + 1}`}
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setArrastrando(i); }}
              onPointerMove={(e) => mover(e, i)}
              onPointerUp={() => setArrastrando(null)}
              onPointerCancel={() => setArrastrando(null)}>
              <Ficha dorsal={i + 1} pequena seleccionada={arrastrando === i} />
            </button>
          ))}
        </Campo>
      </div>
      <div className="hoja-acciones">
        <button className="btn btn-gris cerrar-hoja" type="button" onClick={alCerrar}>Cancelar</button>
        <button className="btn btn-principal" type="button" disabled={!valido}
          onClick={() => alGuardar({ id: inicial?.id ?? crypto.randomUUID(), nombre: nombre.trim(), jugadores: posiciones.length, posiciones })}>Guardar</button>
      </div>
    </Hoja>
  );
}
