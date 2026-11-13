import { useState, type FormEvent } from "react";
import { useColeccion, useEquipo } from "../ContextoEquipo";
import { Opciones } from "../componentes/Controles";
import { IcoMas, IcoPapelera, IcoPlantilla } from "../componentes/Iconos";
import { Escudo, Hoja, useUi } from "../componentes/ui";
import { colorTexto } from "../componentes/Campo";
import { PIERNAS, PUESTOS, nuevoId, type Jugador, type Pierna, type Puesto } from "../datos/modelo";
import { SelectorPlantilla } from "./Estadisticas";
import { Link } from "react-router-dom";
import "./plantilla.css";

export default function Plantilla() {
  const { equipo, ajustes } = useEquipo();
  const { filas: jugadores, cargando, guardar, borrar } = useColeccion<Jugador>("jugadores");
  const [editando, setEditando] = useState<Jugador | null>(null);
  const fijos = ajustes.dorsales === "fijos";

  const nuevo = (): Jugador => ({ id: nuevoId(), equipoId: equipo.id, nombre: "", pierna: "derecha", posicion: "medio", dorsal: null, notas: "" });
  const ordenar = (a: Jugador, b: Jugador) => (fijos ? (a.dorsal ?? 999) - (b.dorsal ?? 999) : 0) || a.nombre.localeCompare(b.nombre, "es");

  return (
    <main className="pagina plantilla">
      <SelectorPlantilla />
      {equipo.club && (
        <div className="club-tarjeta tarjeta">
          <Escudo imagen={equipo.escudo} nombre={equipo.club} tam="enorme" />
          <span className="fila-texto"><b>{equipo.club}</b><span>{equipo.nombre}</span></span>
        </div>
      )}

      <div className="titulo-con-accion">
        <h1>Plantilla</h1>
        <span className="pastilla">{jugadores.length} {jugadores.length === 1 ? "jugador" : "jugadores"}</span>
      </div>

      <button className="btn btn-peto btn-grande btn-ancho" type="button" onClick={() => setEditando(nuevo())}><IcoMas /> Añadir jugador</button>

      {!cargando && jugadores.length === 0 && (
        <div className="vacio tarjeta">
          <IcoPlantilla />
          <h3>Tu plantilla está vacía</h3>
          <p>Añade a tus jugadores con su nombre o mote. Solo eso es obligatorio.</p>
        </div>
      )}

      {PUESTOS.map((p) => {
        const lista = jugadores.filter((j) => j.posicion === p.valor).sort(ordenar);
        if (lista.length === 0) return null;
        return (
          <section key={p.valor} className="grupo-puesto">
            <h2 className="etiqueta">{p.plural} · {lista.length}</h2>
            <div className="lista">
              {lista.map((j) => (
                <button key={j.id} type="button" className="fila fila-boton jugador" onClick={() => setEditando(j)}>
                  <span className="dorsal-circulo" style={{ background: ajustes.colorEquipo, color: colorTexto(ajustes.colorEquipo) }}>{fijos && j.dorsal != null ? j.dorsal : j.nombre.slice(0, 1).toUpperCase()}</span>
                  <span className="fila-texto">
                    <b>{j.nombre}</b>
                    <span>Pierna {PIERNAS.find((x) => x.valor === j.pierna)?.texto.toLowerCase()}{j.notas ? " · " + j.notas : ""}</span>
                  </span>
                  <span className="pastilla">{p.corto}</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {editando && (
        <FichaJugador
          key={editando.id}
          jugador={editando}
          esNuevo={!jugadores.some((j) => j.id === editando.id)}
          fijos={fijos}
          dorsalesUsados={jugadores.filter((j) => j.id !== editando.id && j.dorsal != null).map((j) => [j.dorsal!, j.nombre] as const)}
          alCerrar={() => setEditando(null)}
          alGuardar={async (j, otro) => { await guardar(j); setEditando(otro ? { ...nuevo(), posicion: j.posicion } : null); }}
          alBorrar={async (j) => { await borrar(j.id); setEditando(null); }}
        />
      )}
    </main>
  );
}

function FichaJugador({ jugador, esNuevo, fijos, dorsalesUsados, alCerrar, alGuardar, alBorrar }: {
  jugador: Jugador; esNuevo: boolean; fijos: boolean; dorsalesUsados: (readonly [number, string])[];
  alCerrar: () => void; alGuardar: (j: Jugador, otro: boolean) => Promise<void>; alBorrar: (j: Jugador) => Promise<void>;
}) {
  const [j, setJ] = useState(jugador);
  const [dorsalTexto, setDorsalTexto] = useState(jugador.dorsal?.toString() ?? "");
  const [error, setError] = useState("");
  const { confirmar, avisar } = useUi();
  const set = (p: Partial<Jugador>) => setJ((x) => ({ ...x, ...p }));
  const dorsal = dorsalTexto.trim() === "" ? null : Number(dorsalTexto);
  const repetido = fijos && dorsal != null ? dorsalesUsados.find(([d]) => d === dorsal) : undefined;

  async function enviar(e: FormEvent, otro = false) {
    e.preventDefault();
    if (!j.nombre.trim()) return setError("Escribe el nombre o el mote.");
    if (dorsal != null && (!Number.isInteger(dorsal) || dorsal < 0 || dorsal > 99)) return setError("El dorsal tiene que ser un número entre 0 y 99.");
    await alGuardar({ ...j, nombre: j.nombre.trim(), notas: j.notas.trim(), dorsal: fijos ? dorsal : j.dorsal }, otro);
    avisar(esNuevo ? `${j.nombre.trim()} añadido` : "Cambios guardados");
  }

  return (
    <Hoja titulo={esNuevo ? "Nuevo jugador" : j.nombre || "Jugador"} alCerrar={alCerrar}>
      <form className="formulario" onSubmit={(e) => enviar(e)} noValidate>
        <div className={fijos ? "nombre-dorsal" : ""}>
          <label className="campo" style={{ flex: 1, minWidth: 0 }}>
            <span>Nombre o mote</span>
            <input className="entrada" value={j.nombre} onChange={(e) => set({ nombre: e.target.value })} maxLength={24} autoComplete="off" autoCapitalize="words" />
          </label>
          {fijos && (
            <label className="campo campo-dorsal">
              <span>Dorsal</span>
              <input className="entrada entrada-dorsal" inputMode="numeric" pattern="[0-9]*" maxLength={2} value={dorsalTexto} onChange={(e) => setDorsalTexto(e.target.value.replace(/\D/g, ""))} placeholder="—" />
            </label>
          )}
        </div>
        {repetido && <p className="mensaje mensaje-aviso">{repetido[1]} ya lleva el {repetido[0]}.</p>}
        <div className="campo"><span>Posición</span>
          <Opciones<Puesto> etiqueta="Posición" valor={j.posicion} cambiar={(v) => set({ posicion: v })} columnas={2} opciones={PUESTOS.map((p) => ({ valor: p.valor, texto: p.texto }))} />
        </div>
        <div className="campo"><span>Pierna buena</span>
          <Opciones<Pierna> etiqueta="Pierna buena" valor={j.pierna} cambiar={(v) => set({ pierna: v })} columnas={3} opciones={PIERNAS} />
        </div>
        <label className="campo"><span>Notas <small className="suave">(opcional)</small></span>
          <textarea className="entrada area" value={j.notas} onChange={(e) => set({ notas: e.target.value })} rows={2} maxLength={300} />
        </label>
        {!esNuevo && <Link className="btn btn-borde btn-ancho" to={`/plantilla/jugador/${jugador.id}`} onClick={alCerrar}>Ver sus estadísticas</Link>}
        {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
        <div className="hoja-acciones">
          {esNuevo
            ? <button className="btn btn-gris" type="button" onClick={(e) => enviar(e, true)}>Guardar y otro</button>
            : <button className="btn btn-gris" type="button" onClick={async () => {
                if (await confirmar({ titulo: `¿Borrar a ${jugador.nombre}?`, texto: "Se quitará de la plantilla y de las alineaciones. Esto no se puede deshacer." })) { await alBorrar(jugador); avisar("Jugador borrado"); }
              }}><IcoPapelera /> Borrar</button>}
          <button className="btn btn-principal" type="submit">Guardar</button>
        </div>
      </form>
    </Hoja>
  );
}
