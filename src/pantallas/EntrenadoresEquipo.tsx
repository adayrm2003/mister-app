// Entrenadores del equipo: el principal añade o quita al segundo entrenador (ayudante).
// El ayudante tiene que ser un entrenador que la directiva haya añadido al club.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useEquipo } from "../ContextoEquipo";
import { useSesion } from "../Sesion";
import { api } from "../datos/api";
import { correoValido, type EntrenadorEquipo } from "../datos/tipos";
import { IcoPapelera } from "../componentes/Iconos";
import { mensajeDe, useUi } from "../componentes/ui";

export default function EntrenadoresEquipo() {
  const { equipo } = useEquipo();
  const miCorreo = useSesion().perfil?.email.toLowerCase() ?? "";
  const { avisar, confirmar } = useUi();
  const [lista, setLista] = useState<EntrenadorEquipo[]>([]);
  const [correo, setCorreo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const soyPrincipal = (equipo.rol ?? "principal") === "principal";

  const cargar = useCallback(async () => {
    try { setLista(await api.entrenadoresDeMiEquipo(equipo.id)); } catch (e) { avisar(mensajeDe(e)); }
  }, [equipo.id, avisar]);
  useEffect(() => { cargar(); }, [cargar]);

  async function anadir(e: FormEvent) {
    e.preventDefault();
    if (!correoValido(correo)) return avisar("Escribe un correo válido");
    setOcupado(true);
    try { await api.anadirAyudante(equipo.id, correo); setCorreo(""); avisar("Segundo entrenador añadido"); await cargar(); }
    catch (err) { avisar(mensajeDe(err)); }
    finally { setOcupado(false); }
  }
  async function quitar(email: string) {
    if (!(await confirmar({ titulo: `¿Quitar a ${email} del equipo?`, texto: "Dejará de ver el equipo. Lo que apuntó se queda.", boton: "Quitar" }))) return;
    try { await api.quitarAyudante(equipo.id, email); avisar("Quitado del equipo"); await cargar(); } catch (err) { avisar(mensajeDe(err)); }
  }

  return (
    <div className="entrenadores-equipo">
      <span className="etiqueta">Entrenadores del equipo</span>
      <div className="lista">
        {lista.map((x) => (
          <div key={x.email} className="fila">
            <span className="fila-texto">
              <b>{x.email}{x.email === miCorreo ? " (tú)" : ""}</b>
              <span>{x.rol === "principal" ? "Entrenador principal" : "Segundo entrenador"}{!x.registrado ? " · aún no tiene cuenta" : ""}</span>
            </span>
            {soyPrincipal && x.rol === "ayudante" && (
              <button type="button" className="btn btn-icono" aria-label={`Quitar a ${x.email}`} onClick={() => quitar(x.email)}><IcoPapelera /></button>
            )}
          </div>
        ))}
      </div>
      {soyPrincipal ? (
        <form className="anadir-ayudante" onSubmit={anadir}>
          <label className="campo"><span>Añadir segundo entrenador</span>
            <input className="entrada" type="email" inputMode="email" autoComplete="off" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="correo@ejemplo.com" />
          </label>
          <button className="btn btn-principal" type="submit" disabled={ocupado || !correo.trim()}>Añadir</button>
          <p className="suave">Tiene que ser un entrenador que la directiva haya añadido al club. Verá y apuntará lo mismo que tú, pero no podrá cambiar el nombre del equipo ni gestionar a los entrenadores.</p>
        </form>
      ) : (
        <p className="suave">Eres segundo entrenador de este equipo. El entrenador principal es quien añade o quita ayudantes.</p>
      )}
    </div>
  );
}
