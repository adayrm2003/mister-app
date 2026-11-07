// Controles pequeños reutilizables: botones de opciones, contador y lista editable.
import { useState, type FormEvent, type ReactNode } from "react";
import { IcoFlechaAbajo, IcoLapiz, IcoMas, IcoPapelera } from "./Iconos";
import { COLORES, nuevoId, type Elemento } from "../datos/modelo";
import { Hoja, useUi } from "./ui";

/** Grupo de botones donde se elige una opción con un toque. */
export function Opciones<T extends string>({ valor, opciones, cambiar, etiqueta, columnas }: {
  valor: T; opciones: { valor: T; texto: ReactNode }[]; cambiar: (v: T) => void; etiqueta: string; columnas?: number;
}) {
  return (
    <div className="opciones" role="radiogroup" aria-label={etiqueta} style={columnas ? { gridTemplateColumns: `repeat(${columnas}, 1fr)` } : undefined}>
      {opciones.map((o) => (
        <button key={o.valor} type="button" role="radio" aria-checked={valor === o.valor} onClick={() => cambiar(o.valor)}>{o.texto}</button>
      ))}
    </div>
  );
}

/** Número con botones − y + grandes. */
export function Contador({ valor, cambiar, min, max, etiqueta }: { valor: number; cambiar: (n: number) => void; min: number; max: number; etiqueta: string }) {
  return (
    <div className="contador-num" role="group" aria-label={etiqueta}>
      <button type="button" onClick={() => cambiar(Math.max(min, valor - 1))} disabled={valor <= min} aria-label="Menos">−</button>
      <output>{valor}</output>
      <button type="button" onClick={() => cambiar(Math.min(max, valor + 1))} disabled={valor >= max} aria-label="Más">+</button>
    </div>
  );
}

export function SelectorColor({ valor, cambiar }: { valor: string; cambiar: (c: string) => void }) {
  return (
    <div className="colores">
      {COLORES.map((c) => (
        <button key={c} type="button" className="muestra-color" style={{ background: c }} aria-label={`Color ${c}`} aria-pressed={valor.toLowerCase() === c.toLowerCase()} onClick={() => cambiar(c)} />
      ))}
      <label className="muestra-color muestra-otro" title="Otro color">
        <input type="color" value={valor} onChange={(e) => cambiar(e.target.value)} aria-label="Elegir otro color" />
        <span style={{ background: valor }} />
      </label>
    </div>
  );
}

/** Lista de nombres que se pueden crear, renombrar, ordenar y borrar. */
export function ListaEditable({ elementos, cambiar, conColor, ordenable, nombreElemento }: {
  elementos: Elemento[]; cambiar: (l: Elemento[]) => void; conColor?: boolean; ordenable?: boolean; nombreElemento: string;
}) {
  const [editando, setEditando] = useState<Elemento | "nuevo" | null>(null);
  const { confirmar } = useUi();

  async function borrar(e: Elemento) {
    if (elementos.length <= 1) return;
    if (await confirmar({ titulo: `¿Borrar «${e.nombre}»?`, texto: "Lo que ya tenga este nombre se conservará." })) cambiar(elementos.filter((x) => x.id !== e.id));
  }
  function mover(i: number, d: -1 | 1) {
    const l = [...elementos];
    [l[i], l[i + d]] = [l[i + d], l[i]];
    cambiar(l);
  }

  return (
    <>
      <div className="lista">
        {elementos.map((e, i) => (
          <div className="fila" key={e.id}>
            {conColor && <span className="punto-color" style={{ background: e.color }} />}
            {ordenable && <span className="numero-orden">{i + 1}</span>}
            <div className="fila-texto"><b>{e.nombre}</b></div>
            {ordenable && (
              <>
                <button className="btn btn-icono btn-mini" type="button" disabled={i === 0} onClick={() => mover(i, -1)} aria-label={`Subir ${e.nombre}`}><IcoFlechaAbajo style={{ transform: "rotate(180deg)" }} /></button>
                <button className="btn btn-icono btn-mini" type="button" disabled={i === elementos.length - 1} onClick={() => mover(i, 1)} aria-label={`Bajar ${e.nombre}`}><IcoFlechaAbajo /></button>
              </>
            )}
            <button className="btn btn-icono btn-mini" type="button" onClick={() => setEditando(e)} aria-label={`Editar ${e.nombre}`}><IcoLapiz /></button>
            {!e.fijo && <button className="btn btn-icono btn-mini" type="button" disabled={elementos.length <= 1} onClick={() => borrar(e)} aria-label={`Borrar ${e.nombre}`}><IcoPapelera /></button>}
          </div>
        ))}
      </div>
      <button className="btn btn-borde btn-ancho" type="button" onClick={() => setEditando("nuevo")}><IcoMas /> Añadir {nombreElemento}</button>
      {editando && (
        <HojaElemento
          inicial={editando === "nuevo" ? { id: nuevoId(), nombre: "", color: conColor ? COLORES[2] : undefined } : editando}
          titulo={editando === "nuevo" ? `Nuevo ${nombreElemento}` : `Editar ${nombreElemento}`}
          conColor={conColor}
          alCerrar={() => setEditando(null)}
          alGuardar={(el) => {
            cambiar(editando === "nuevo" ? [...elementos, el] : elementos.map((x) => (x.id === el.id ? el : x)));
            setEditando(null);
          }}
        />
      )}
    </>
  );
}

function HojaElemento({ inicial, titulo, conColor, alCerrar, alGuardar }: { inicial: Elemento; titulo: string; conColor?: boolean; alCerrar: () => void; alGuardar: (e: Elemento) => void }) {
  const [nombre, setNombre] = useState(inicial.nombre);
  const [color, setColor] = useState(inicial.color ?? COLORES[0]);
  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    alGuardar({ ...inicial, nombre: nombre.trim(), ...(conColor ? { color } : {}) });
  }
  return (
    <Hoja titulo={titulo} alCerrar={alCerrar}>
      <form onSubmit={enviar} className="formulario">
        <label className="campo"><span>Nombre</span><input className="entrada" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={30} /></label>
        {conColor && <div className="campo"><span>Color</span><SelectorColor valor={color} cambiar={setColor} /></div>}
        <div className="hoja-acciones">
          <button className="btn btn-gris cerrar-hoja" type="button" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-principal" type="submit" disabled={!nombre.trim()}>Guardar</button>
        </div>
      </form>
    </Hoja>
  );
}
