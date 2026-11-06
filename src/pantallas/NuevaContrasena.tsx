import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../datos/api";
import { useSesion } from "../Sesion";
import { LogoMister } from "../componentes/Iconos";
import { mensajeDe, useUi } from "../componentes/ui";
import { CampoContrasena } from "./Acceso";
import "./acceso.css";

/** Se abre desde el enlace del correo de "recuperar contraseña". */
export default function NuevaContrasena() {
  const [contrasena, setContrasena] = useState("");
  const [repetir, setRepetir] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { terminarRecuperacion, recargar } = useSesion();
  const { avisar } = useUi();
  const ir = useNavigate();

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (contrasena.length < 8) return setError("La contraseña tiene que tener al menos 8 caracteres.");
    if (contrasena !== repetir) return setError("Las dos contraseñas no coinciden.");
    setEnviando(true);
    try {
      await api.cambiarContrasena(contrasena);
      avisar("Contraseña cambiada");
      terminarRecuperacion();
      await recargar();
      ir("/", { replace: true });
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="acceso">
      <header className="acceso-portada">
        <LogoMister size={64} />
        <h1>Míster</h1>
        <p>Crea tu contraseña nueva</p>
      </header>
      <main className="acceso-tarjeta">
        <form className="acceso-form" onSubmit={enviar} noValidate>
          <h2>Contraseña nueva</h2>
          <div className="campo">
            <label htmlFor="nueva"><span style={{ fontWeight: 600, fontSize: 15 }}>Contraseña nueva</span></label>
            <CampoContrasena id="nueva" valor={contrasena} cambiar={setContrasena} autoComplete="new-password" />
          </div>
          <div className="campo">
            <label htmlFor="repetir"><span style={{ fontWeight: 600, fontSize: 15 }}>Repite la contraseña</span></label>
            <CampoContrasena id="repetir" valor={repetir} cambiar={setRepetir} autoComplete="new-password" />
          </div>
          {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
          <button className="btn btn-principal btn-grande btn-ancho" disabled={enviando}>{enviando ? "Guardando…" : "Guardar contraseña"}</button>
        </form>
      </main>
    </div>
  );
}
