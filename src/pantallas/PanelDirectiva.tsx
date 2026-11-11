import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "../datos/api";
import { correoValido, type Asignacion, type Club, type Equipo } from "../datos/tipos";
import { IcoCheck, IcoCorreo, IcoLapiz, IcoMas, IcoMover, IcoPapelera, IcoPlantilla, IcoSilbato, LogoMister } from "../componentes/Iconos";
import MenuCuenta from "../componentes/MenuCuenta";
import { Escudo, Hoja, iniciales, mensajeDe, reducirImagen, useUi } from "../componentes/ui";
import { Opciones } from "../componentes/Controles";
import { AJUSTES_EQUIPO_BASE, MODALIDADES, esModalidad, nombreModalidad, type Modalidad } from "../datos/modelo";
import "./directiva.css";

type Pestana = "equipos" | "entrenadores";
type Formulario =
  | { tipo: "asignar"; equipoId?: string }
  | { tipo: "renombrar"; equipo: Equipo }
  | { tipo: "mover"; asignacion: Asignacion }
  | { tipo: "club" }
  | null;

export default function PanelDirectiva() {
  const [club, setClub] = useState<Club | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pestana, setPestana] = useState<Pestana>("equipos");
  const [formulario, setFormulario] = useState<Formulario>(null);
  const [nuevoEquipo, setNuevoEquipo] = useState("");
  const [nuevaModalidad, setNuevaModalidad] = useState<Modalidad>("F11");
  const [modalidades, setModalidades] = useState<Record<string, Modalidad>>({});
  const [error, setError] = useState("");
  const { confirmar, avisar } = useUi();

  const cargar = useCallback(async () => {
    try {
      const [c, e, a] = await Promise.all([api.miClub(), api.equiposDelClub(), api.asignacionesDelClub()]);
      setClub(c); setEquipos(e); setAsignaciones(a); setError("");
      const ajustes = await Promise.all(e.map((eq) => api.leerAjustesEquipo(eq.id).catch(() => null)));
      setModalidades(Object.fromEntries(e.map((eq, i) => [eq.id, esModalidad(ajustes[i]?.modalidad) ? (ajustes[i]!.modalidad as Modalidad) : AJUSTES_EQUIPO_BASE.modalidad])));
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
      const eq = await api.crearEquipo(nuevoEquipo);
      await api.guardarAjustesEquipo(eq.id, { ...AJUSTES_EQUIPO_BASE, modalidad: nuevaModalidad });
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
          {club?.escudo ? <Escudo imagen={club.escudo} nombre={club.nombre} /> : <LogoMister size={36} />}
          <div style={{ minWidth: 0 }}>
            <span className="etiqueta" style={{ fontSize: 11 }}>Panel de directiva</span>
            <b style={{ display: "block" }}>{club?.nombre ?? "Mi club"}</b>
          </div>
        </div>
        <MenuCuenta />
      </header>

      <main className="pagina">
        {club && (
          <button type="button" className="club-tarjeta tarjeta" onClick={() => setFormulario({ tipo: "club" })} aria-label="Editar nombre y escudo del club">
            <Escudo imagen={club.escudo} nombre={club.nombre} tam="enorme" />
            <span className="fila-texto">
              <b>{club.nombre}</b>
              <span>{club.escudo ? "Toca para cambiar el nombre o el escudo" : "Añade el escudo del club"}</span>
            </span>
            <IcoLapiz className="club-editar" />
          </button>
        )}

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
            <form className="crear-equipo tarjeta" onSubmit={crearEquipo}>
              <label className="campo">
                <span>Nombre del nuevo equipo</span>
                <input id="nuevo-equipo" className="entrada" value={nuevoEquipo} onChange={(e) => setNuevoEquipo(e.target.value)} placeholder="El nombre que uséis en el club" maxLength={40} />
              </label>
              <div className="campo">
                <span>Modalidad</span>
                <Opciones<Modalidad> etiqueta="Modalidad del nuevo equipo" valor={nuevaModalidad} cambiar={setNuevaModalidad} columnas={3}
                  opciones={MODALIDADES.map((m) => ({ valor: m.valor, texto: m.texto }))} />
              </div>
              <button className="btn btn-principal" type="submit" disabled={!nuevoEquipo.trim()}><IcoMas /> Crear equipo</button>
            </form>

            {equipos.length === 0 ? (
              <div className="vacio tarjeta">
                <IcoPlantilla />
                <h3>Aún no hay equipos</h3>
                <p>Escribe arriba el nombre del primer equipo y elige si juega a fútbol 7, 8 u 11. El nombre es solo una etiqueta.</p>
              </div>
            ) : (
              <div className="equipos">
                {equipos.map((eq) => {
                  const ents = entrenadoresDe(eq.id);
                  return (
                    <article key={eq.id} className="equipo tarjeta">
                      <div className="equipo-cabeza">
                        <span className="escudo escudo-grande">{iniciales(eq.nombre)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3>{eq.nombre}</h3>
                          <span className="pastilla pastilla-ok">{nombreModalidad(modalidades[eq.id] ?? "F11")}</span>
                        </div>
                        <button className="btn btn-icono" type="button" aria-label={`Editar ${eq.nombre}`} onClick={() => setFormulario({ tipo: "renombrar", equipo: eq })}><IcoLapiz /></button>
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
        <HojaRenombrar equipo={formulario.equipo} modalidad={modalidades[formulario.equipo.id] ?? "F11"} alCerrar={() => setFormulario(null)}
          alGuardar={async () => { setFormulario(null); avisar("Equipo guardado"); await cargar(); }} />
      )}
      {formulario?.tipo === "club" && club && (
        <HojaClub club={club} alCerrar={() => setFormulario(null)}
          alGuardar={async () => { setFormulario(null); avisar("Club guardado"); await cargar(); }} />
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

function HojaRenombrar({ equipo, modalidad: inicial, alCerrar, alGuardar }: { equipo: Equipo; modalidad: Modalidad; alCerrar: () => void; alGuardar: () => void }) {
  const [nombre, setNombre] = useState(equipo.nombre);
  const [modalidad, setModalidad] = useState<Modalidad>(inicial);
  const [error, setError] = useState("");
  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return setError("El nombre no puede quedar vacío.");
    try {
      await api.renombrarEquipo(equipo.id, nombre);
      if (modalidad !== inicial) {
        const actuales = (await api.leerAjustesEquipo(equipo.id)) ?? AJUSTES_EQUIPO_BASE;
        await api.guardarAjustesEquipo(equipo.id, { ...AJUSTES_EQUIPO_BASE, ...actuales, modalidad });
      }
      alGuardar();
    } catch (err) { setError(mensajeDe(err)); }
  }
  return (
    <Hoja titulo="Editar equipo" alCerrar={alCerrar}>
      <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label className="campo"><span>Nombre del equipo</span><input className="entrada" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} /></label>
        <div className="campo"><span>Modalidad</span>
          <Opciones<Modalidad> etiqueta="Modalidad" valor={modalidad} cambiar={setModalidad} columnas={3} opciones={MODALIDADES.map((m) => ({ valor: m.valor, texto: m.texto }))} />
        </div>
        {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
        <div className="hoja-acciones">
          <button className="btn btn-gris cerrar-hoja" type="button" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-principal" type="submit">Guardar</button>
        </div>
      </form>
    </Hoja>
  );
}

function HojaClub({ club, alCerrar, alGuardar }: { club: Club; alCerrar: () => void; alGuardar: () => void }) {
  const [nombre, setNombre] = useState(club.nombre);
  const [escudo, setEscudo] = useState<string | null>(club.escudo ?? null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const { confirmar } = useUi();

  async function elegir(archivo: File | undefined) {
    if (!archivo) return;
    setProcesando(true); setError("");
    try { setEscudo(await reducirImagen(archivo)); } catch (err) { setError(mensajeDe(err)); }
    finally { setProcesando(false); }
  }
  async function quitar() {
    if (await confirmar({ titulo: "¿Quitar el escudo?", texto: "Tus entrenadores verán las iniciales del club en su lugar.", boton: "Quitar" })) setEscudo(null);
  }
  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return setError("El nombre del club no puede quedar vacío.");
    setProcesando(true);
    try { await api.guardarClub({ nombre, escudo }); alGuardar(); }
    catch (err) { setError(mensajeDe(err)); setProcesando(false); }
  }
  return (
    <Hoja titulo="Tu club" alCerrar={alCerrar}>
      <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label className="campo"><span>Nombre del club</span>
          <input id="club-nombre" className="entrada" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} autoComplete="organization" />
        </label>
        <div className="campo"><span>Escudo</span>
          <div className="elegir-escudo">
            {escudo ? <Escudo imagen={escudo} nombre={nombre || "tu club"} tam="enorme" /> : <span className="escudo-hueco"><IcoMas /></span>}
            <div className="elegir-escudo-botones">
              <label className="btn btn-borde">
                <input id="club-escudo" type="file" accept="image/*" onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = ""; }} />
                {escudo ? "Cambiar imagen" : "Subir imagen"}
              </label>
              {escudo && <button className="btn btn-texto" type="button" onClick={quitar}><IcoPapelera /> Quitar escudo</button>}
            </div>
          </div>
          <small className="suave">Mejor una imagen cuadrada con el fondo transparente. Tus entrenadores lo verán en su app.</small>
        </div>
        {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
        <div className="hoja-acciones">
          <button className="btn btn-gris cerrar-hoja" type="button" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-principal" type="submit" disabled={procesando}>{procesando ? "Un momento…" : "Guardar"}</button>
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
