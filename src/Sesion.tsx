// Recuerda quién ha entrado y avisa a toda la app cuando cambia.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./datos/api";
import type { Perfil } from "./datos/tipos";

interface EstadoSesion {
  cargando: boolean;
  perfil: Perfil | null;
  /** true cuando se ha abierto el enlace de "recuperar contraseña" del correo. */
  recuperando: boolean;
  terminarRecuperacion: () => void;
  recargar: () => Promise<void>;
}
const Contexto = createContext<EstadoSesion | null>(null);
export const useSesion = () => useContext(Contexto)!;

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [recuperando, setRecuperando] = useState(() => location.pathname === "/nueva-contrasena" && location.hash.includes("type=recovery"));

  const recargar = useCallback(async () => {
    try { setPerfil(await api.perfilActual()); } finally { setCargando(false); }
  }, []);

  useEffect(() => {
    recargar();
    return api.alCambiarSesion((e) => {
      if (e === "recuperacion") setRecuperando(true);
      if (e === "salida") { setPerfil(null); setRecuperando(false); }
      else recargar();
    });
  }, [recargar]);

  return (
    <Contexto.Provider value={{ cargando, perfil, recuperando, terminarRecuperacion: () => setRecuperando(false), recargar }}>
      {children}
    </Contexto.Provider>
  );
}
