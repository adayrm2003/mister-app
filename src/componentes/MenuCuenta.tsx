import { useState } from "react";
import { api } from "../datos/api";
import { useSesion } from "../Sesion";
import { IcoAuto, IcoLuna, IcoPersona, IcoSalir, IcoSol } from "./Iconos";
import { Hoja, useTema, useUi, type Tema } from "./ui";
import { PieLegal } from "../pantallas/Legal";

/** Botón redondo de la cabecera que abre: tema de color y cerrar sesión. */
export default function MenuCuenta({ extra }: { extra?: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const [tema, setTema] = useTema();
  const { perfil } = useSesion();
  const { confirmar } = useUi();

  const opciones: [Tema, string, JSX.Element][] = [["auto", "Automático", <IcoAuto />], ["light", "Claro", <IcoSol />], ["dark", "Oscuro", <IcoLuna />]];

  async function salir() {
    setAbierto(false);
    if (await confirmar({ titulo: "¿Cerrar sesión?", texto: "Tendrás que volver a escribir tu correo y contraseña para entrar.", boton: "Cerrar sesión", peligro: false })) {
      await api.salir();
    }
  }

  return (
    <>
      <button className="btn-icono btn" type="button" aria-label="Mi cuenta" onClick={() => setAbierto(true)}><IcoPersona /></button>
      {abierto && (
        <Hoja titulo="Mi cuenta" alCerrar={() => setAbierto(false)}>
          <div className="fila tarjeta" style={{ borderRadius: 14 }}>
            <div className="fila-texto"><b>{perfil?.email}</b><span>{perfil?.rol === "directiva" ? "Cuenta de la directiva" : "Cuenta de entrenador"}</span></div>
          </div>
          <div className="campo">
            <span className="etiqueta">Aspecto</span>
            <div className="selector-tema">
              {opciones.map(([v, t, ico]) => (
                <button key={v} type="button" aria-pressed={tema === v} onClick={() => setTema(v)}>{ico}{t}</button>
              ))}
            </div>
          </div>
          {extra}
          <div className="campo"><span className="etiqueta">Información legal</span><PieLegal /></div>
          <button className="btn btn-gris btn-ancho" type="button" onClick={salir}><IcoSalir /> Cerrar sesión</button>
        </Hoja>
      )}
    </>
  );
}
