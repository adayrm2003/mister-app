import { useMemo, useState } from "react";
import { useEquipo } from "../ContextoEquipo";
import { Campo, Ficha } from "../componentes/Campo";
import { Contador, ListaEditable, Opciones, SelectorColor } from "../componentes/Controles";
import { IcoLapiz, IcoMas, IcoPapelera, IcoRecargar } from "../componentes/Iconos";
import { mensajeDe, useUi } from "../componentes/ui";
import { DURACIONES, MODALIDADES, jugadoresEnCampo, type Duracion, type Modalidad, type Sistema } from "../datos/modelo";
import EditorSistema from "./EditorSistema";
import "./ajustes.css";

export default function Ajustes() {
  const { equipo, ajustes: a, cambiarAjustesEquipo: equipoSet, cambiarAjustesUsuario: usuarioSet, restaurarAjustes } = useEquipo();
  const { confirmar, avisar } = useUi();
  const [sistemaEditando, setSistemaEditando] = useState<Sistema | "nuevo" | null>(null);
  const n = jugadoresEnCampo(a);

  const sistemasPorTamano = useMemo(() => {
    const m = new Map<number, Sistema[]>();
    a.sistemas.forEach((s) => m.set(s.jugadores, [...(m.get(s.jugadores) ?? []), s]));
    return [...m.entries()].sort(([x], [y]) => (x === n ? -1 : y === n ? 1 : y - x));
  }, [a.sistemas, n]);

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
        <header><h2>Partidos</h2><p className="suave">Para {equipo.nombre}</p></header>
        <div className="campo">
          <span>Modalidad</span>
          <Opciones<Modalidad> etiqueta="Modalidad" valor={a.modalidad} cambiar={(v) => equipoSet({ modalidad: v })} columnas={5}
            opciones={[...MODALIDADES.map((m) => ({ valor: m.valor, texto: <>{m.jugadores}<small>F{m.jugadores}</small></> })), { valor: "otra" as Modalidad, texto: <>Otra<small>a mano</small></> }]} />
          {a.modalidad === "otra" && (
            <div className="fila-ajuste"><span>Jugadores por equipo</span><Contador valor={a.jugadoresOtra} cambiar={(v) => equipoSet({ jugadoresOtra: v })} min={3} max={11} etiqueta="Jugadores por equipo" /></div>
          )}
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
        <header><h2>Sistemas de juego</h2><p className="suave">Los de {n} jugadores salen primero</p></header>
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
