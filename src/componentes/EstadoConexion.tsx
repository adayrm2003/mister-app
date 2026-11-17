// Franja que avisa cuando no hay cobertura y cuántos cambios quedan por subir.
// Lo apuntado sin conexión se guarda en el móvil y se sube solo al volver la señal.
import { useEffect, useState } from "react";
import { conexion } from "../datos/api";
import type { EstadoConexion as Estado } from "../datos/sinConexion";
import { useUi } from "./ui";

export default function EstadoConexion() {
  const { avisar } = useUi();
  const [e, setE] = useState<Estado | null>(() => conexion?.estadoConexion() ?? null);
  useEffect(() => conexion?.alCambiarConexion(setE), []);
  useEffect(() => {
    const f = (ev: Event) => avisar(`No se pudo subir un cambio: ${(ev as CustomEvent<string>).detail}`);
    window.addEventListener("mister-error-subida", f);
    return () => window.removeEventListener("mister-error-subida", f);
  }, [avisar]);
  if (!e || (e.enLinea && e.pendientes === 0)) return null;
  const n = e.pendientes;
  return (
    <div className={"estado-conexion" + (e.enLinea ? " subiendo" : "")} role="status" aria-live="polite">
      {!e.enLinea
        ? <><b>Sin cobertura.</b> {n ? `${n} ${n === 1 ? "cambio guardado" : "cambios guardados"} en el móvil: se subirán solos.` : "Puedes seguir apuntando: se guarda en el móvil."}</>
        : <><b>Subiendo {n} {n === 1 ? "cambio" : "cambios"}…</b> <button type="button" className="btn btn-texto" onClick={() => conexion?.subirPendientes()}>Reintentar</button></>}
    </div>
  );
}
