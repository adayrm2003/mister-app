import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "../datos/api";
import { correoValido, type Asignacion, type Club, type Equipo } from "../datos/tipos";
import { IcoCheck, IcoCorreo, IcoLapiz, IcoMas, IcoMover, IcoPapelera, IcoPlantilla, IcoSilbato, LogoMister } from "../componentes/Iconos";
import MenuCuenta from "../componentes/MenuCuenta";
import { Hoja, iniciales, mensajeDe, useUi } from "../componentes/ui";
import "./directiva.css";

type Pestana = "equipos" | "entrenadores";
type Formulario =
  | { tipo: "asignar"; equipoId?: string }
  | { tipo: "renombrar"; equipo: Equipo }
  | { tipo: "mover"; asignacion: Asignacion }
  | null;

export default function PanelDirectiva() {
  const [club, setClub] = useState<Club | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pestana, setPestana] = useState<Pestana>("equipos");
  const [formulario, setFormulario] = useState<Formulario>(null);
  const [nuevoEquipo, setNuevoEquipo] = useState("");
  const [error, setError] = useState("");
  const { confirmar, avisar } = useUi();

  const cargar = useCallback(async () => {
    try {
      const [c, e, a] = await Promise.all([api.miClub(), api.equiposDelClub(), api.asignacionesDelClub()]);
      setClub(c); setEquipos(e); setAsignaciones(a); setError("");
    } catch (err) { setError(mensajeDe(err)); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const nombreEquipo = (id: string) => equipos.find((e) => e.id === id)?.nombre ?? "—";
  const entrenadoresDe = (equipoId: string) => asignaciones.filter((a) => a.equipoId === equipoId);
  const porCorreo = useMemo(() => {
    const m = new Map<string, Asignacion[]>();
    asignaciones.forEach((a) => m.set(a.email, [...(m.get(a.email) ?? []), a]));
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [asignaciones]);

  async function crearEquipo(e: FormEvent) {
    e.preventDefault();
    if (!nuevoEquipo.trim()) return;
    try {
      await api.crearEquipo(nuevoEquipo);
      avisar(`Equipo «${nuevoEquipo.trim()}» creado`);
      setNuevoEquipo("");
      await cargar();
    } catch (err) { avisar(mensajeDe(err)); }
  }

  async function borrarEquipo(eq: Equipo) {
    const n = entrenadoresDe(eq.id).length;
    const ok = await confirmar({
      titulo: `¿Borrar ${eq.nombre}?`,
      texto: n ? `Se quitarán también sus ${n === 1 ? "entrenador asignado" : n + " entrenadores asignados"}. Esto no se puede deshacer.` : "Esto no se puede deshacer."
    });
    if (!ok) return;
    try { await api.borrarEquipo(eq.id); avisar("Equipo borrado"); await cargar(); } catch (err) { avisar(mensajeDe(err)); }
  }

  async function quitar(a: Asignacion) {
    const ok = await confirmar({ titulo: "¿Quitar a este entrenador?", texto: `${a.email} dejará de ver el equipo ${nombreEquipo(a.equipoId)}.`, boton: "Quitar" });
    if (!ok) return;
    try { await api.quitarAsignacion(a.id); avisar("Entrenador quitado del equipo"); await cargar(); } catch (err) { avisar(mensajeDe(err)); }
  }

  return (
    <div className="directiva">
      <header className="cabecera">
        <div className="cabecera-titulo">
          <LogoMister size={36} />
          <div style={{ minWidth: 0 }}>
            <span className="etiqueta" style={{ fontSize: 11 }}>Panel de directiva</span>
            <b style={{ display: "block" }}>{club?.nombre ?? "Mi club"}</b>
          </div>
        </div>
        <MenuCuenta />
      </header>

      <main className="pagina">
        <div className="segmentos-dir" role="tablist" aria-label="Secciones del club">
          <button role="tab" type="button" aria-selected={pestana === "equipos"} onClick={() => setPestana("equipos")}>
            Equipos <span className="contador">{equipos.length}</span>
          </button>
          <button role="tab" type="button" aria-selected={pestana === "entrenadores"} onClick={() => setPestana("entrenadores")}>
            Entrenadores <span className="contador">{porCorreo.length}</span>
          </button>
        </div>

        {error && <p className="mensaje mensaje-error">{error}</p>}

        {!cargando && pestana === "equipos" && (
          <>
            <form className="crear-equipo" onSubmit={crearEquipo}>
              <label className="campo" style={{ flex: 1, minWidth: 0 }}>
                <span>Nuevo equipo</span>
                <input id="nuevo-equipo" className="entrada" value={nuevoEquipo} onChange={(e) => setNuevoEquipo(e.target.value)} placeholder="Ej.: Benjamín A, Juvenil…" maxLength={40} />
              </label>
              <button className="btn btn-principal" type="submit" disabled={!nuevoEquipo.trim()}><IcoMas /> Crear</button>
            </form>

            {equipos.length === 0 ? (
              <div className="vacio tarjeta">
                <IcoPlantilla />
                <h3>Aún no hay equipos</h3>
                <p>Escribe arriba el nombre del primer equipo. Es solo una etiqueta: puedes llamarlo como quieras.</p>
              </div>
            ) : (
              <div className="equipos">
                {equipos.map((eq) => {
                  const ents = entrenadoresDe(eq.id);
                  return (
                    <article key={eq.id} className="equipo tarjeta">
                      <div className="equipo-cabeza">
                        <span className="escudo escudo-grande">{iniciales(eq.nombre)}</span>
                        <h3>{eq.nombre}</h3>
                        <button className="btn btn-icono" type="button" aria-label={`Cambiar nombre de ${eq.nombre}`} onClick={() => setFormulario({ tipo: "renombrar", equipo: eq })}><IcoLapiz /></button>
                        <button className="btn btn-icono" type="button" aria-label={`Borrar ${eq.nombre}`} onClick={() => borrarEquipo(eq)}><IcoPapelera /></button>
                      </div>
                      {ents.length === 0 ? (
                        <p className="suave sin-entrenador">Sin entrenador asignado</p>
                      ) : (
                        <ul className="entrenadores-equipo">
                          {ents.map((a) => (
                            <li key={a.id}>
                              <IcoSilbato />
                              <span className="correo">{a.email}</span>
                              {!a.registrado && <span className="pastilla pastilla-aviso">Sin cuenta</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                      <button className="btn btn-borde btn-ancho" type="button" onClick={() => setFormulario({ tipo: "asignar", equipoId: eq.id })}>
                        <IcoMas /> Asignar entrenador
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {!cargando && pestana === "entrenadores" && (
          <>
            <button className="btn btn-principal btn-grande btn-ancho" type="button" disabled={equipos.length === 0} onClick={() => setFormulario({ tipo: "asignar" })}>
              <IcoMas /> Asignar entrenador
            </button>
            {equipos.length === 0 && <p className="suave">Primero crea un equipo en la pestaña Equipos.</p>}
            {porCorreo.length === 0 ? (
              equipos.length > 0 && (
                <div className="vacio tarjeta">
                  <IcoSilbato />
                  <h3>Aún no hay entrenadores</h3>
                  <p>Asigna a cada entrenador a su equipo con su correo. Cuando se registre en Míster con ese correo, verá su equipo al entrar.</p>
                </div>
              )
            ) : (
              <div className="entrenadores">
                {porCorreo.map(([email, lista]) => (
                  <article key={email} className="ficha-entrenador tarjeta">
                    <div className="entrenador-cabeza">
                      <span className="avatar-correo">{email[0].toUpperCase()}</span>
                      <div className="fila-texto"><b>{email}</b></div>
                      {lista[0].registrado
                        ? <span className="pastilla pastilla-ok"><IcoCheck style={{ width: 14, height: 14 }} />Con cuenta</span>
                        : <span className="pastilla pastilla-aviso">Sin cuenta</span>}
                    </div>
                    {lista.map((a) => (
                      <div key={a.id} className="entrenador-equipo">
                        <span className="escudo">{iniciales(nombreEquipo(a.equipoId))}</span>
                        <b>{nombreEquipo(a.equipoId)}</b>
                        <button className="btn btn-gris" type="button" onClick={() => setFormulario({ tipo: "mover", asignacion: a })} aria-label={`Cambiar a ${email} de equipo`}><IcoMover /> Cambiar</button>
                        <button className="btn btn-icono" type="button" onClick={() => quitar(a)} aria-label={`Quitar a ${email} de ${nombreEquipo(a.equipoId)}`}><IcoPapelera /></button>
                      </div>
                    ))}
                    {!lista[0].registrado && (
                      <p className="nota-registro"><IcoCorreo /> Dile que se registre en Míster con este correo como «Entrenador».</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {formulario?.tipo === "asignar" && (
        <HojaAsignar equipos={equipos} equipoInicial={formulario.equipoId} alCerrar={() => setFormulario(null)}
          alGuardar={async () => { setFormulario(null); avisar("Entrenador asignado"); await cargar(); }} />
      )}
      {formulario?.tipo === "renombrar" && (
        <HojaRenombrar equipo={formulario.equipo} alCerrar={() => setFormulario(null)}
          alGuardar={async () => { setFormulario(null); avisar("Nombre cambiado"); await cargar(); }} />
      )}
      {formulario?.tipo === "mover" && (
        <HojaMover asignacion={formulario.asignacion} equipos={equipos} alCerrar={() => setFormulario(null)}
          alGuardar={async (nombre) => { setFormulario(null); avisar(`Ahora entrena a ${nombre}`); await cargar(); }} />
      )}
    </div>
  );
}

function HojaAsignar({ equipos, equipoInicial, alCerrar, alGuardar }: { equipos: Equipo[]; equipoInicial?: string; alCerrar: () => void; alGuardar: () => void }) {
  const [email, setEmail] = useState("");
  const [equipoId, setEquipoId] = useState(equipoInicial ?? equipos[0]?.id ?? "");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!correoValido(email)) return setError("Escribe un correo válido, por ejemplo nombre@gmail.com.");
    setEnviando(true);
    try { await api.asignarEntrenador(equipoId, email); alGuardar(); }
    catch (err) { setError(mensajeDe(err)); setEnviando(false); }
  }
  return (
    <Hoja titulo="Asignar entrenador" alCerrar={alCerrar}>
      <form onSubmit={enviar} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label className="campo">
          <span>Correo del entrenador</span>
          <input className="entrada" type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="entrenador@correo.com" />
        </label>
        {equipoInicial ? (
          <p className="suave">Equipo: <b style={{ color: "var(--tinta)" }}>{equipos.find((e) => e.id === equipoInicial)?.nombre}</b></p>
        ) : (
          <ListaEquipos equipos={equipos} valor={equipoId} cambiar={setEquipoId} />
        )}
        {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
        <div className="hoja-acciones">
          <button className="btn btn-gris cerrar-hoja" type="button" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-principal" type="submit" disabled={enviando || !equipoId}>Asignar</button>
        </div>
      </form>
    </Hoja>
  );
}

function HojaRenombrar({ equipo, alCerrar, alGuardar }: { equipo: Equipo; alCerrar: () => void; alGuardar: () => void }) {
  const [nombre, setNombre] = useState(equipo.nombre);
  const [error, setError] = useState("");
  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return setError("El nombre no puede quedar vacío.");
    try { await api.renombrarEquipo(equipo.id, nombre); alGuardar(); } catch (err) { setError(mensajeDe(err)); }
  }
  return (
    <Hoja titulo="Cambiar nombre" alCerrar={alCerrar}>
      <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label className="campo"><span>Nombre del equipo</span><input className="entrada" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} /></label>
        {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
        <div className="hoja-acciones">
          <button className="btn btn-gris cerrar-hoja" type="button" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-principal" type="submit">Guardar</button>
        </div>
      </form>
    </Hoja>
  );
}

function HojaMover({ asignacion, equipos, alCerrar, alGuardar }: { asignacion: Asignacion; equipos: Equipo[]; alCerrar: () => void; alGuardar: (nombre: string) => void }) {
  const [equipoId, setEquipoId] = useState(asignacion.equipoId);
  const [error, setError] = useState("");
  async function guardar() {
    if (equipoId === asignacion.equipoId) return alCerrar();
    try { await api.moverAsignacion(asignacion.id, equipoId); alGuardar(equipos.find((e) => e.id === equipoId)?.nombre ?? ""); }
    catch (err) { setError(mensajeDe(err)); }
  }
  return (
    <Hoja titulo="Cambiar de equipo" alCerrar={alCerrar}>
      <p className="suave">{asignacion.email} pasará a entrenar al equipo que elijas.</p>
      <ListaEquipos equipos={equipos} valor={equipoId} cambiar={setEquipoId} />
      {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
      <div className="hoja-acciones">
        <button className="btn btn-gris cerrar-hoja" type="button" onClick={alCerrar}>Cancelar</button>
        <button className="btn btn-principal" type="button" onClick={guardar}>Guardar</button>
      </div>
    </Hoja>
  );
}

function ListaEquipos({ equipos, valor, cambiar }: { equipos: Equipo[]; valor: string; cambiar: (id: string) => void }) {
  return (
    <fieldset className="lista-equipos">
      <legend className="etiqueta">Equipo</legend>
      {equipos.map((e) => (
        <label key={e.id} className={valor === e.id ? "activo" : ""}>
          <input type="radio" name="equipo" checked={valor === e.id} onChange={() => cambiar(e.id)} />
          <span className="escudo">{iniciales(e.nombre)}</span>
          <b>{e.nombre}</b>
          {valor === e.id && <IcoCheck />}
        </label>
      ))}
    </fieldset>
  );
}
