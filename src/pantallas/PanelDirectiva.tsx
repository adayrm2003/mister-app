import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "../datos/api";
import { correoValido, type Club, type EntrenadorClub, type EquipoClub } from "../datos/tipos";
import { IcoCheck, IcoCorreo, IcoLapiz, IcoMas, IcoMover, IcoPapelera, IcoPlantilla, IcoSilbato, LogoMister } from "../componentes/Iconos";
import MenuCuenta from "../componentes/MenuCuenta";
import { useNavigate } from "react-router-dom";
import { useSesion } from "../Sesion";
import { Escudo, Hoja, abrirImagen, iniciales, mensajeDe, prepararEscudo, useUi, type FondoEscudo } from "../componentes/ui";
import { esModalidad, nombreModalidad } from "../datos/modelo";
import "./directiva.css";

type Pestana = "entrenadores" | "equipos";
type Formulario =
  | { tipo: "anadir" }
  | { tipo: "pasar"; equipo: EquipoClub }
  | { tipo: "club" }
  | null;

const modalidadDe = (eq: EquipoClub) => (esModalidad(eq.modalidad) ? nombreModalidad(eq.modalidad) : null);

/**
 * Panel de la directiva: añade entrenadores a su club y ve sus equipos.
 * Los equipos los crea cada entrenador; la directiva solo puede pasarlos a otro entrenador o borrarlos.
 * No ve lo de dentro de los equipos (jugadores, partidos...).
 */
export default function PanelDirectiva() {
  const [club, setClub] = useState<Club | null>(null);
  const [entrenadores, setEntrenadores] = useState<EntrenadorClub[]>([]);
  const [equipos, setEquipos] = useState<EquipoClub[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pestana, setPestana] = useState<Pestana>("entrenadores");
  const [formulario, setFormulario] = useState<Formulario>(null);
  const [error, setError] = useState("");
  const { confirmar, avisar } = useUi();
  const { perfil } = useSesion();
  const ir = useNavigate();
  const miCorreo = perfil?.email.toLowerCase() ?? "";
  const yoEntreno = entrenadores.some((e) => e.email === miCorreo);
  const [apuntandome, setApuntandome] = useState(false);

  async function entrenarYo() {
    setApuntandome(true);
    try { await api.anadirEntrenador(miCorreo); avisar("Ya eres entrenador de tu club"); ir("/inicio"); }
    catch (err) { avisar(mensajeDe(err)); setApuntandome(false); }
  }

  const cargar = useCallback(async () => {
    try {
      const [c, en, eq] = await Promise.all([api.miClub(), api.entrenadoresDelClub(), api.equiposDelClub()]);
      setClub(c); setEntrenadores(en); setEquipos(eq); setError("");
    } catch (err) { setError(mensajeDe(err)); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const equiposDe = (email: string) => equipos.filter((e) => e.entrenador === email);
  const sinEntrenador = useMemo(() => equipos.filter((e) => !e.entrenador), [equipos]);

  async function quitarEntrenador(en: EntrenadorClub) {
    const n = equiposDe(en.email).length;
    const ok = await confirmar({
      titulo: en.email === miCorreo ? "¿Dejar de entrenar?" : "¿Quitar a este entrenador del club?",
      texto: (en.email === miCorreo ? "Dejarás de ver la parte de entrenador. Tu panel del club sigue igual." : `${en.email} ya no verá el escudo ni el nombre del club.`) + (n ? ` ${n === 1 ? "Su equipo se queda" : `Sus ${n} equipos se quedan`} en el club sin entrenador, con todos sus datos, para que se ${n === 1 ? "lo" : "los"} pases a otro.` : ""),
      boton: "Quitar"
    });
    if (!ok) return;
    try { await api.quitarEntrenador(en.email); avisar("Entrenador quitado del club"); await cargar(); } catch (err) { avisar(mensajeDe(err)); }
  }

  async function borrarEquipo(eq: EquipoClub) {
    const ok = await confirmar({
      titulo: `¿Borrar ${eq.nombre}?`,
      texto: "Se borrarán también sus jugadores, partidos, alineaciones y calendario. Esto no se puede deshacer."
    });
    if (!ok) return;
    try { await api.borrarEquipo(eq.id); avisar("Equipo borrado"); await cargar(); } catch (err) { avisar(mensajeDe(err)); }
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

        {!cargando && club && (yoEntreno ? (
          <button className="btn btn-peto btn-grande btn-ancho" type="button" onClick={() => ir("/inicio")}>
            <IcoSilbato /> Ir a mis equipos
          </button>
        ) : (
          <div className="tarjeta entrenar-yo">
            <div><b>¿También entrenas?</b><p className="suave">Usa la app como entrenador con esta misma cuenta: crea tu equipo, tu plantilla y tus sesiones.</p></div>
            <button className="btn btn-borde btn-ancho" type="button" onClick={entrenarYo} disabled={apuntandome}>
              <IcoSilbato /> {apuntandome ? "Un momento…" : "Entrenar yo también"}
            </button>
          </div>
        ))}

        <div className="segmentos-dir" role="tablist" aria-label="Secciones del club">
          <button role="tab" type="button" aria-selected={pestana === "entrenadores"} onClick={() => setPestana("entrenadores")}>
            Entrenadores <span className="contador">{entrenadores.length}</span>
          </button>
          <button role="tab" type="button" aria-selected={pestana === "equipos"} onClick={() => setPestana("equipos")}>
            Equipos <span className={"contador" + (sinEntrenador.length ? " contador-aviso" : "")}>{equipos.length}</span>
          </button>
        </div>

        {error && <p className="mensaje mensaje-error">{error}</p>}

        {!cargando && pestana === "entrenadores" && (
          <>
            <button className="btn btn-principal btn-grande btn-ancho" type="button" onClick={() => setFormulario({ tipo: "anadir" })}>
              <IcoMas /> Añadir entrenador
            </button>
            {entrenadores.length === 0 ? (
              <div className="vacio tarjeta">
                <IcoSilbato />
                <h3>Aún no hay entrenadores</h3>
                <p>Añade a cada entrenador con su correo. Cuando entre en Míster con ese correo, verá el escudo del club y creará su equipo.</p>
              </div>
            ) : (
              <div className="entrenadores">
                {entrenadores.map((en) => {
                  const suyos = equiposDe(en.email);
                  return (
                    <article key={en.id} className="ficha-entrenador tarjeta">
                      <div className="entrenador-cabeza">
                        <span className="avatar-correo">{en.email[0].toUpperCase()}</span>
                        <div className="fila-texto"><b>{en.email}</b></div>
                        {en.email === miCorreo
                          ? <span className="pastilla pastilla-ok">Tú</span>
                          : en.registrado
                            ? <span className="pastilla pastilla-ok"><IcoCheck style={{ width: 14, height: 14 }} />Con cuenta</span>
                            : <span className="pastilla pastilla-aviso">Sin cuenta</span>}
                      </div>
                      {suyos.length === 0 ? (
                        <p className="suave sin-entrenador">{en.registrado ? "Aún no ha creado su equipo." : "Cuando entre, creará su equipo."}</p>
                      ) : suyos.map((eq) => (
                        <div key={eq.id} className="entrenador-equipo">
                          <span className="escudo">{iniciales(eq.nombre)}</span>
                          <b>{eq.nombre}</b>
                          {modalidadDe(eq) && <span className="pastilla">{modalidadDe(eq)}</span>}
                        </div>
                      ))}
                      {!en.registrado && (
                        <p className="nota-registro"><IcoCorreo /> Dile que se registre en Míster con este correo como «Entrenador».</p>
                      )}
                      <button className="btn btn-texto btn-quitar" type="button" onClick={() => quitarEntrenador(en)}><IcoPapelera /> {en.email === miCorreo ? "Dejar de entrenar" : "Quitar del club"}</button>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {!cargando && pestana === "equipos" && (
          <>
            {sinEntrenador.length > 0 && (
              <p className="mensaje mensaje-aviso">
                {sinEntrenador.length === 1 ? "Hay 1 equipo sin entrenador." : `Hay ${sinEntrenador.length} equipos sin entrenador.`} {sinEntrenador.length === 1 ? "Pásalo a un entrenador del club para que se pueda seguir usando." : "Pásalos a un entrenador del club para que se puedan seguir usando."}
              </p>
            )}
            {equipos.length === 0 ? (
              <div className="vacio tarjeta">
                <IcoPlantilla />
                <h3>Aún no hay equipos</h3>
                <p>Los equipos los crea cada entrenador al entrar en Míster: les pone nombre y elige fútbol 7, 8 u 11. Aquí los verás todos.</p>
              </div>
            ) : (
              <div className="equipos">
                {equipos.map((eq) => (
                  <article key={eq.id} className="equipo tarjeta">
                    <div className="equipo-cabeza">
                      <span className="escudo escudo-grande">{iniciales(eq.nombre)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3>{eq.nombre}</h3>
                        {modalidadDe(eq) && <span className="pastilla pastilla-ok">{modalidadDe(eq)}</span>}
                      </div>
                      <button className="btn btn-icono" type="button" aria-label={`Borrar ${eq.nombre}`} onClick={() => borrarEquipo(eq)}><IcoPapelera /></button>
                    </div>
                    {eq.entrenador ? (
                      <p className="equipo-entrenador"><IcoSilbato /><span className="correo">{eq.entrenador}</span></p>
                    ) : (
                      <p className="equipo-entrenador"><span className="pastilla pastilla-aviso">Sin entrenador</span></p>
                    )}
                    <button className={"btn btn-ancho " + (eq.entrenador ? "btn-gris" : "btn-principal")} type="button" onClick={() => setFormulario({ tipo: "pasar", equipo: eq })}>
                      <IcoMover /> {eq.entrenador ? "Pasar a otro entrenador" : "Dar a un entrenador"}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {formulario?.tipo === "anadir" && (
        <HojaAnadir alCerrar={() => setFormulario(null)}
          alGuardar={async () => { setFormulario(null); avisar("Entrenador añadido al club"); await cargar(); }} />
      )}
      {formulario?.tipo === "pasar" && (
        <HojaPasar equipo={formulario.equipo} entrenadores={entrenadores} alCerrar={() => setFormulario(null)}
          alGuardar={async (email) => { setFormulario(null); avisar(`${formulario.equipo.nombre} ahora es de ${email}`); await cargar(); }} />
      )}
      {formulario?.tipo === "club" && club && (
        <HojaClub club={club} alCerrar={() => setFormulario(null)}
          alGuardar={async () => { setFormulario(null); avisar("Club guardado"); await cargar(); }} />
      )}
    </div>
  );
}

function HojaAnadir({ alCerrar, alGuardar }: { alCerrar: () => void; alGuardar: () => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!correoValido(email)) return setError("Escribe un correo válido, por ejemplo nombre@gmail.com.");
    setEnviando(true);
    try { await api.anadirEntrenador(email); alGuardar(); }
    catch (err) { setError(mensajeDe(err)); setEnviando(false); }
  }
  return (
    <Hoja titulo="Añadir entrenador" alCerrar={alCerrar}>
      <form onSubmit={enviar} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label className="campo">
          <span>Correo del entrenador</span>
          <input id="correo-entrenador" className="entrada" type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="entrenador@correo.com" />
        </label>
        <p className="suave">Cuando entre en Míster con este correo verá el escudo y el nombre del club, y él mismo creará su equipo.</p>
        {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
        <div className="hoja-acciones">
          <button className="btn btn-gris cerrar-hoja" type="button" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-principal" type="submit" disabled={enviando}>{enviando ? "Un momento…" : "Añadir"}</button>
        </div>
      </form>
    </Hoja>
  );
}

function HojaPasar({ equipo, entrenadores, alCerrar, alGuardar }: { equipo: EquipoClub; entrenadores: EntrenadorClub[]; alCerrar: () => void; alGuardar: (email: string) => void }) {
  const otros = entrenadores.filter((e) => e.email !== equipo.entrenador);
  const [email, setEmail] = useState(otros[0]?.email ?? "");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  async function guardar() {
    if (!email) return;
    setEnviando(true);
    try { await api.pasarEquipo(equipo.id, email); alGuardar(email); }
    catch (err) { setError(mensajeDe(err)); setEnviando(false); }
  }
  return (
    <Hoja titulo={equipo.entrenador ? "Pasar a otro entrenador" : "Dar a un entrenador"} alCerrar={alCerrar}>
      <p className="suave"><b style={{ color: "var(--tinta)" }}>{equipo.nombre}</b> pasará al entrenador que elijas, con todos sus datos.{equipo.entrenador ? ` ${equipo.entrenador} dejará de verlo.` : ""}</p>
      {otros.length === 0 ? (
        <p className="mensaje mensaje-aviso">No hay otro entrenador en el club. Añádelo primero en la pestaña Entrenadores.</p>
      ) : (
        <fieldset className="lista-equipos">
          <legend className="etiqueta">Entrenador</legend>
          {otros.map((en) => (
            <label key={en.id} className={email === en.email ? "activo" : ""}>
              <input type="radio" name="entrenador" checked={email === en.email} onChange={() => setEmail(en.email)} />
              <span className="avatar-correo">{en.email[0].toUpperCase()}</span>
              <b className="correo">{en.email}</b>
              {email === en.email && <IcoCheck />}
            </label>
          ))}
        </fieldset>
      )}
      {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
      <div className="hoja-acciones">
        <button className="btn btn-gris cerrar-hoja" type="button" onClick={alCerrar}>Cancelar</button>
        <button className="btn btn-principal" type="button" onClick={guardar} disabled={!email || enviando}>{enviando ? "Un momento…" : "Pasar equipo"}</button>
      </div>
    </Hoja>
  );
}

function HojaClub({ club, alCerrar, alGuardar }: { club: Club; alCerrar: () => void; alGuardar: () => void }) {
  const [nombre, setNombre] = useState(club.nombre);
  const [escudo, setEscudo] = useState<string | null>(club.escudo ?? null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const { confirmar } = useUi();

  // La imagen original se guarda mientras la hoja está abierta, para poder quitar o devolver el fondo
  const [original, setOriginal] = useState<HTMLImageElement | null>(null);
  const [quitarFondo, setQuitarFondo] = useState(true);
  const [fondo, setFondo] = useState<FondoEscudo>("sin-tocar");
  // El escudo que ya estaba guardado también se puede limpiar sin volver a subirlo
  useEffect(() => {
    if (!club.escudo) return;
    const img = new Image();
    img.onload = () => { setOriginal(img); setQuitarFondo(false); };
    img.src = club.escudo;
  }, [club.escudo]);
  function preparar(img: HTMLImageElement, quitar: boolean) {
    const r = prepararEscudo(img, quitar);
    setEscudo(r.imagen); setFondo(r.fondo);
  }
  async function elegir(archivo: File | undefined) {
    if (!archivo) return;
    setProcesando(true); setError("");
    try { const img = await abrirImagen(archivo); setOriginal(img); setQuitarFondo(true); preparar(img, true); }
    catch (err) { setError(mensajeDe(err)); }
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
          {original && (
            <label className="interruptor">
              <input id="quitar-fondo" type="checkbox" checked={quitarFondo} onChange={(e) => { setQuitarFondo(e.target.checked); preparar(original, e.target.checked); }} />
              <span><b>Quitar el fondo</b><small className="suave">{({ "sin-tocar": "Se usa la imagen tal cual.", "quitado": "Se ha quitado el fondo que rodeaba al escudo.", "ya-transparente": "La imagen ya tenía el fondo transparente.", "no-liso": "El fondo de esta imagen no es de un solo color, así que se deja tal cual." } as const)[fondo]}</small></span>
            </label>
          )}
          <small className="suave">Si el escudo tiene un fondo blanco o de un solo color, la app lo quita sola y recorta lo que sobra. Tus entrenadores lo verán en su app.</small>
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

