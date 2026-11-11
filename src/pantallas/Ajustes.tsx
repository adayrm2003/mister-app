import { useMemo, useState } from "react";
import { useEquipo } from "../ContextoEquipo";
import { Campo, Ficha } from "../componentes/Campo";
import { Contador, ListaEditable, Opciones, SelectorColor } from "../componentes/Controles";
import { IcoLapiz, IcoMas, IcoPapelera, IcoRecargar } from "../componentes/Iconos";
import { mensajeDe, useUi } from "../componentes/ui";
import { api } from "../datos/api";
import { DURACIONES, MODALIDADES, jugadoresEnCampo, type Duracion, type Modalidad, type Sistema } from "../datos/modelo";
import EditorSistema from "./EditorSistema";
import "./ajustes.css";

export default function Ajustes() {
  const { equipo, ajustes: a, cambiarAjustesEquipo: equipoSet, cambiarAjustesUsuario: usuarioSet, restaurarAjustes, recargarEquipos } = useEquipo();
  const [nombreEquipo, setNombreEquipo] = useState(equipo.nombre);
  const { confirmar, avisar } = useUi();
  const [sistemaEditando, setSistemaEditando] = useState<Sistema | "nuevo" | null>(null);
  const n = jugadoresEnCampo(a);

  // Solo las modalidades que entrena (y siempre la de este equipo)
  const mias = MODALIDADES.filter((m) => a.modalidades.includes(m.valor) || m.valor === a.modalidad);
  const sistemasPorTamano = useMemo(() => {
    const tamanos = mias.map((m) => m.jugadores);
    const m = new Map<number, Sistema[]>();
    a.sistemas.filter((s) => tamanos.includes(s.jugadores)).forEach((s) => m.set(s.jugadores, [...(m.get(s.jugadores) ?? []), s]));
    return [...m.entries()].sort(([x], [y]) => (x === n ? -1 : y === n ? 1 : y - x));
  }, [a.sistemas, n, mias.map((x) => x.valor).join()]); // eslint-disable-line react-hooks/exhaustive-deps

  function alternarModalidad(v: Modalidad) {
    const nuevas = a.modalidades.includes(v) ? a.modalidades.filter((x) => x !== v) : [...a.modalidades, v];
    if (nuevas.length === 0) return avisar("Elige al menos una modalidad");
    usuarioSet({ modalidades: MODALIDADES.map((m) => m.valor).filter((x) => nuevas.includes(x)) });
  }

  async function borrarSistema(s: Sistema) {
    if (await confirmar({ titulo: `¿Borrar el sistema ${s.nombre}?`, texto: "Las alineaciones ya hechas con él no cambian." })) {
      usuarioSet({ sistemas: a.sistemas.filter((x) => x.id !== s.id) });
    }
  }
  async function restaurar() {
    const ok = await confirmar({
      titulo: "¿Restaurar valores por defecto?",
      texto: "Vuelven la modalidad, la duración, los dorsales, los colores, los sistemas, los tipos de ejercicio, las fases y los tipos de evento de fábrica. Tus jugadores y partidos no se tocan.",
      boton: "Restaurar"
    });
    if (!ok) return;
    try { await restaurarAjustes(); avisar("Ajustes restaurados"); } catch (e) { avisar(mensajeDe(e)); }
  }

  return (
    <main className="pagina ajustes">
      <h1>Ajustes</h1>

      <section className="apartado">
        <header><h2>Tu equipo</h2>{equipo.club && <p className="suave">De {equipo.club}</p>}</header>
        <form className="renombrar-equipo" onSubmit={async (e) => {
          e.preventDefault();
          const limpio = nombreEquipo.trim();
          if (!limpio) return avisar("Escribe el nombre del equipo");
          if (limpio === equipo.nombre) return;
          try { await api.renombrarEquipo(equipo.id, limpio); await recargarEquipos(); avisar("Nombre guardado"); } catch (err) { avisar(mensajeDe(err)); }
        }}>
          <label className="campo"><span>Nombre del equipo</span>
            <input id="ajustes-nombre-equipo" className="entrada" value={nombreEquipo} onChange={(e) => setNombreEquipo(e.target.value)} maxLength={40} />
          </label>
          <button className="btn btn-principal" type="submit" disabled={!nombreEquipo.trim() || nombreEquipo.trim() === equipo.nombre}>Guardar nombre</button>
        </form>
        <button className="btn btn-texto btn-borrar-equipo" type="button" onClick={async () => {
          const ok = await confirmar({ titulo: `¿Borrar ${equipo.nombre}?`, texto: "Se borrarán sus jugadores, partidos, alineaciones y calendario. Tus ejercicios y sesiones no se tocan. Esto no se puede deshacer." });
          if (!ok) return;
          try { await api.borrarEquipo(equipo.id); avisar("Equipo borrado"); await recargarEquipos(); } catch (err) { avisar(mensajeDe(err)); }
        }}><IcoPapelera /> Borrar este equipo</button>
      </section>

      <section className="apartado">
        <header><h2>Qué entreno</h2><p className="suave">Solo verás los sistemas de juego de estas modalidades. Puedes elegir varias.</p></header>
        <div className="opciones" role="group" aria-label="Modalidades que entreno" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {MODALIDADES.map((m) => (
            <button key={m.valor} type="button" role="checkbox" aria-checked={a.modalidades.includes(m.valor)} onClick={() => alternarModalidad(m.valor)}>
              {a.modalidades.includes(m.valor) ? "✓ " : ""}{m.texto}
            </button>
          ))}
        </div>
      </section>

      <section className="apartado">
        <header><h2>Partidos</h2><p className="suave">Para {equipo.nombre}</p></header>
        <div className="campo">
          <span>Modalidad</span>
          <Opciones<Modalidad> etiqueta="Modalidad" valor={a.modalidad} cambiar={(v) => equipoSet({ modalidad: v })} columnas={mias.length}
            opciones={mias.map((m) => ({ valor: m.valor, texto: m.texto }))} />
        </div>
        <div className="campo">
          <span>Duración del partido</span>
          <Opciones<Duracion> etiqueta="Duración" valor={a.duracion} cambiar={(v) => equipoSet({ duracion: v })} columnas={5}
            opciones={[...DURACIONES.map((d) => ({ valor: d.valor, texto: <>{d.partes}×{d.minutos}<small>minutos</small></> })), { valor: "otra" as Duracion, texto: <>Otra<small>a mano</small></> }]} />
          {a.duracion === "otra" && (
            <div className="duracion-mano">
              <div className="fila-ajuste"><span>Partes</span><Contador valor={a.partesOtra} cambiar={(v) => equipoSet({ partesOtra: v })} min={1} max={6} etiqueta="Partes" /></div>
              <div className="fila-ajuste"><span>Minutos por parte</span><Contador valor={a.minutosParteOtra} cambiar={(v) => equipoSet({ minutosParteOtra: v })} min={5} max={60} etiqueta="Minutos por parte" /></div>
            </div>
          )}
        </div>
        <div className="campo">
          <span>Dorsales</span>
          <Opciones etiqueta="Dorsales" valor={a.dorsales} cambiar={(v) => equipoSet({ dorsales: v })} columnas={2}
            opciones={[
              { valor: "fijos", texto: <>Fijos<small>Cada jugador tiene su número</small></> },
              { valor: "partido", texto: <>Por partido<small>Se ponen en cada partido</small></> }
            ]} />
        </div>
      </section>

      <section className="apartado">
        <header><h2>Colores</h2><p className="suave">En la pizarra y en las alineaciones</p></header>
        <div className="colores-par">
          <div className="campo"><span>Mi equipo</span><SelectorColor valor={a.colorEquipo} cambiar={(c) => equipoSet({ colorEquipo: c })} /></div>
          <div className="campo"><span>Rival</span><SelectorColor valor={a.colorRival} cambiar={(c) => equipoSet({ colorRival: c })} /></div>
        </div>
        <div className="vista-colores" aria-hidden="true">
          <Ficha dorsal={10} nombre="Mi equipo" color={a.colorEquipo} />
          <Ficha dorsal={4} nombre="Rival" color={a.colorRival} />
        </div>
      </section>

      <section className="apartado">
        <header><h2>Sistemas de juego</h2><p className="suave">{mias.length > 1 ? `Los de ${equipo.nombre} (${n} jugadores) salen primero` : `De ${mias[0].texto.toLowerCase()}`}</p></header>
        {sistemasPorTamano.map(([tam, lista]) => (
          <div key={tam} className="campo">
            <span className="etiqueta">{tam} jugadores</span>
            <div className="sistemas">
              {lista.map((s) => (
                <div key={s.id} className="sistema tarjeta">
                  <Campo className="campo-mini">
                    {s.posiciones.map((p, i) => <span key={i} className="punto-mini" style={{ left: `${p.x}%`, top: `${p.y}%`, background: a.colorEquipo }} />)}
                  </Campo>
                  <b>{s.nombre}</b>
                  <div className="sistema-acciones">
                    <button className="btn btn-icono btn-mini" type="button" onClick={() => setSistemaEditando(s)} aria-label={`Editar ${s.nombre}`}><IcoLapiz /></button>
                    <button className="btn btn-icono btn-mini" type="button" onClick={() => borrarSistema(s)} aria-label={`Borrar ${s.nombre}`}><IcoPapelera /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <button className="btn btn-borde btn-ancho" type="button" onClick={() => setSistemaEditando("nuevo")}><IcoMas /> Crear sistema</button>
      </section>

      <section className="apartado">
        <header><h2>Tipos de ejercicio</h2></header>
        <ListaEditable elementos={a.tiposEjercicio} cambiar={(l) => usuarioSet({ tiposEjercicio: l })} nombreElemento="tipo" />
      </section>

      <section className="apartado">
        <header><h2>Fases de la sesión</h2><p className="suave">En este orden aparecerán en tus sesiones</p></header>
        <ListaEditable elementos={a.fases} cambiar={(l) => usuarioSet({ fases: l })} ordenable nombreElemento="fase" />
      </section>

      <section className="apartado">
        <header><h2>Tipos de evento</h2><p className="suave">Los colores del calendario</p></header>
        <ListaEditable elementos={a.tiposEvento} cambiar={(l) => usuarioSet({ tiposEvento: l })} conColor nombreElemento="tipo de evento" />
      </section>

      <button className="btn btn-gris btn-ancho" type="button" onClick={restaurar}><IcoRecargar /> Restaurar valores por defecto</button>

      {sistemaEditando && (
        <EditorSistema
          inicial={sistemaEditando === "nuevo" ? null : sistemaEditando}
          jugadoresPorDefecto={n}
          modalidades={mias}
          alCerrar={() => setSistemaEditando(null)}
          alGuardar={(s) => {
            usuarioSet({ sistemas: sistemaEditando === "nuevo" ? [...a.sistemas, s] : a.sistemas.map((x) => (x.id === s.id ? s : x)) });
            setSistemaEditando(null);
            avisar(`Sistema ${s.nombre} guardado`);
          }}
        />
      )}
    </main>
  );
}
