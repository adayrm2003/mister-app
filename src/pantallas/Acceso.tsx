import { useState, type FormEvent } from "react";
import { api } from "../datos/api";
import { correoValido, type Rol } from "../datos/tipos";
import { IcoAtras, IcoCorreo, IcoOjo, IcoOjoTachado, IcoPersona, IcoSilbato, LogoMister } from "../componentes/Iconos";
import { mensajeDe } from "../componentes/ui";
import { Link } from "react-router-dom";
import { PieLegal } from "./Legal";
import { ACTUALIZADO } from "../legal/textos";
import "./acceso.css";

type Vista = "entrar" | "registro" | "recuperar";

export function CampoContrasena({ id, valor, cambiar, autoComplete }: { id: string; valor: string; cambiar: (v: string) => void; autoComplete: string }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="entrada-con-boton">
      <input id={id} className="entrada" type={ver ? "text" : "password"} value={valor} onChange={(e) => cambiar(e.target.value)} autoComplete={autoComplete} required minLength={8} />
      <button type="button" onClick={() => setVer(!ver)} aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}>
        {ver ? <IcoOjoTachado /> : <IcoOjo />}
      </button>
    </div>
  );
}

export default function Acceso() {
  const [vista, setVista] = useState<Vista>("entrar");
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [rol, setRol] = useState<Rol>("entrenador");
  const [nombreClub, setNombreClub] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [acepto, setAcepto] = useState(false);

  const irA = (v: Vista) => { setVista(v); setError(""); setOk(""); };

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(""); setOk("");
    if (!correoValido(email)) return setError("Escribe un correo válido, por ejemplo nombre@gmail.com.");
    if (vista !== "recuperar" && contrasena.length < 8) return setError("La contraseña tiene que tener al menos 8 caracteres.");
    if (vista === "registro" && rol === "directiva" && !nombreClub.trim()) return setError("Escribe el nombre del club.");
    if (vista === "registro" && !acepto) return setError("Para crear la cuenta tienes que aceptar los términos de uso y la política de privacidad.");
    setEnviando(true);
    try {
      if (vista === "entrar") await api.entrar(email, contrasena);
      else if (vista === "registro") {
        const r = await api.registrar({ email, contrasena, rol, nombreClub, aceptaLegal: ACTUALIZADO });
        if (r.hayQueConfirmarCorreo) { setOk(`Te hemos enviado un correo a ${email.trim()}. Ábrelo y pulsa el enlace para activar tu cuenta.`); irAEntrarSinBorrar(); }
      } else {
        await api.recuperarContrasena(email);
        setOk(`Si existe una cuenta con ${email.trim()}, te llegará un correo con un enlace para crear una contraseña nueva.`);
      }
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setEnviando(false);
    }
  }
  function irAEntrarSinBorrar() { setVista("entrar"); setContrasena(""); }

  const titulo = vista === "entrar" ? "Entrar" : vista === "registro" ? "Crear cuenta" : "Recuperar contraseña";

  return (
    <div className="acceso">
      <header className="acceso-portada">
        <LogoMister size={64} />
        <h1>Míster</h1>
        <p>La libreta del entrenador de fútbol</p>
      </header>

      <main className="acceso-tarjeta">
        {vista === "recuperar" ? (
          <button className="btn btn-texto acceso-volver" type="button" onClick={() => irA("entrar")}><IcoAtras /> Volver</button>
        ) : (
          <div className="segmentos" role="tablist" aria-label="Entrar o crear cuenta">
            <button role="tab" type="button" aria-selected={vista === "entrar"} onClick={() => irA("entrar")}>Entrar</button>
            <button role="tab" type="button" aria-selected={vista === "registro"} onClick={() => irA("registro")}>Crear cuenta</button>
          </div>
        )}

        <form onSubmit={enviar} noValidate className="acceso-form">
          <h2 className="oculto-accesible">{titulo}</h2>
          {vista === "recuperar" && <p className="suave">Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.</p>}

          {vista === "registro" && (
            <fieldset className="roles">
              <legend className="etiqueta">¿Quién eres?</legend>
              <label className={"rol" + (rol === "entrenador" ? " activo" : "")}>
                <input type="radio" name="rol" checked={rol === "entrenador"} onChange={() => setRol("entrenador")} />
                <IcoSilbato /><b>Entrenador</b><span>Llevo uno o varios equipos</span>
              </label>
              <label className={"rol" + (rol === "directiva" ? " activo" : "")}>
                <input type="radio" name="rol" checked={rol === "directiva"} onChange={() => setRol("directiva")} />
                <IcoPersona /><b>Directiva</b><span>Organizo los equipos del club</span>
              </label>
            </fieldset>
          )}

          {vista === "registro" && rol === "directiva" && (
            <label className="campo">
              <span>Nombre del club</span>
              <input className="entrada" value={nombreClub} onChange={(e) => setNombreClub(e.target.value)} placeholder="Por ejemplo: CD San Roque" autoComplete="organization" />
            </label>
          )}

          <label className="campo">
            <span>Correo electrónico</span>
            <input className="entrada" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com" required />
          </label>

          {vista !== "recuperar" && (
            <div className="campo">
              <label htmlFor="contrasena"><span style={{ fontWeight: 600, fontSize: 15 }}>Contraseña</span></label>
              <CampoContrasena id="contrasena" valor={contrasena} cambiar={setContrasena} autoComplete={vista === "entrar" ? "current-password" : "new-password"} />
              {vista === "registro" && <small className="suave">Mínimo 8 caracteres.</small>}
            </div>
          )}

          {vista === "registro" && (
            <label className="acepto">
              <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} />
              <span>He leído y acepto los <Link to="/legal/terminos">términos de uso</Link> y la <Link to="/legal/privacidad">política de privacidad</Link>.</span>
            </label>
          )}
          {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
          {ok && <p className="mensaje mensaje-ok" role="status"><IcoCorreo style={{ width: 18, height: 18, verticalAlign: "-3px", marginRight: 6 }} />{ok}</p>}

          <button className="btn btn-principal btn-grande btn-ancho" type="submit" disabled={enviando}>
            {enviando ? "Un momento…" : vista === "entrar" ? "Entrar" : vista === "registro" ? "Crear cuenta" : "Enviar enlace"}
          </button>

          {vista === "entrar" && (
            <button className="btn btn-texto" type="button" onClick={() => irA("recuperar")}>¿Has olvidado la contraseña?</button>
          )}
        </form>

        {api.modo === "local" && (
          <p className="mensaje mensaje-aviso acceso-prueba">
            <b>Modo prueba.</b> La app aún no está conectada a Supabase: las cuentas y los datos se guardan solo en este navegador.
          </p>
        )}
        <PieLegal />
      </main>
    </div>
  );
}
