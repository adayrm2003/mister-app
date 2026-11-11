// El equipo con el que se trabaja y sus ajustes, disponibles en todas las pantallas del entrenador.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "./datos/api";
import { AJUSTES_EQUIPO_BASE, AJUSTES_USUARIO_BASE, esModalidad, type Ajustes, type AjustesEquipo, type AjustesUsuario } from "./datos/modelo";
import type { Equipo, Fila, Tabla, TablaUsuario } from "./datos/tipos";
import { mensajeDe, useUi } from "./componentes/ui";

interface EstadoEquipo {
  equipo: Equipo;
  equipos: Equipo[];
  ajustes: Ajustes;
  ajustesListos: boolean;
  cambiarAjustesEquipo: (p: Partial<AjustesEquipo>) => void;
  cambiarAjustesUsuario: (p: Partial<AjustesUsuario>) => void;
  restaurarAjustes: () => Promise<void>;
  /** Vuelve a leer los equipos del entrenador (tras crear, renombrar o borrar uno). */
  recargarEquipos: (activo?: string) => Promise<void>;
}
const Contexto = createContext<EstadoEquipo | null>(null);
export const useEquipo = () => useContext(Contexto)!;

const soloClaves = <T extends object>(base: T, datos: Record<string, unknown> | null): Partial<T> =>
  datos ? (Object.fromEntries(Object.entries(datos).filter(([k]) => k in base)) as Partial<T>) : {};

export function ProveedorEquipo({ equipo, equipos, recargarEquipos, children }: { equipo: Equipo; equipos: Equipo[]; recargarEquipos: (activo?: string) => Promise<void>; children: ReactNode }) {
  const [deEquipo, setDeEquipo] = useState<AjustesEquipo>(AJUSTES_EQUIPO_BASE);
  const [deUsuario, setDeUsuario] = useState<AjustesUsuario>(AJUSTES_USUARIO_BASE);
  const [listos, setListos] = useState(false);
  const { avisar } = useUi();
  const refEquipo = useRef(deEquipo);
  const refUsuario = useRef(deUsuario);
  refEquipo.current = deEquipo;
  refUsuario.current = deUsuario;

  useEffect(() => {
    let vivo = true;
    setListos(false);
    Promise.all([api.leerAjustesEquipo(equipo.id), api.leerAjustesUsuario()])
      .then(([e, u]) => {
        if (!vivo) return;
        const eq = { ...AJUSTES_EQUIPO_BASE, ...soloClaves(AJUSTES_EQUIPO_BASE, e) };
        if (!esModalidad(eq.modalidad)) eq.modalidad = AJUSTES_EQUIPO_BASE.modalidad;
        const us = { ...AJUSTES_USUARIO_BASE, ...soloClaves(AJUSTES_USUARIO_BASE, u) };
        us.sistemas = us.sistemas.filter((s) => [7, 8, 11].includes(s.jugadores));
        us.modalidades = (us.modalidades ?? []).filter(esModalidad);
        if (!us.modalidades.length) us.modalidades = AJUSTES_USUARIO_BASE.modalidades;
        setDeEquipo(eq);
        setDeUsuario(us);
      })
      .catch((err) => avisar(mensajeDe(err)))
      .finally(() => vivo && setListos(true));
    return () => { vivo = false; };
  }, [equipo.id, avisar]);

  const cambiarAjustesEquipo = useCallback((p: Partial<AjustesEquipo>) => {
    const n = { ...refEquipo.current, ...p };
    refEquipo.current = n;
    setDeEquipo(n);
    api.guardarAjustesEquipo(equipo.id, n as unknown as Record<string, unknown>).catch((err) => avisar(mensajeDe(err)));
  }, [equipo.id, avisar]);

  const cambiarAjustesUsuario = useCallback((p: Partial<AjustesUsuario>) => {
    const n = { ...refUsuario.current, ...p };
    refUsuario.current = n;
    setDeUsuario(n);
    api.guardarAjustesUsuario(n as unknown as Record<string, unknown>).catch((err) => avisar(mensajeDe(err)));
  }, [avisar]);

  const restaurarAjustes = useCallback(async () => {
    await Promise.all([
      api.guardarAjustesEquipo(equipo.id, AJUSTES_EQUIPO_BASE as unknown as Record<string, unknown>),
      api.guardarAjustesUsuario(AJUSTES_USUARIO_BASE as unknown as Record<string, unknown>)
    ]);
    setDeEquipo(AJUSTES_EQUIPO_BASE);
    setDeUsuario(AJUSTES_USUARIO_BASE);
  }, [equipo.id]);

  return (
    <Contexto.Provider value={{ equipo, equipos, ajustes: { ...deEquipo, ...deUsuario }, ajustesListos: listos, cambiarAjustesEquipo, cambiarAjustesUsuario, restaurarAjustes, recargarEquipos }}>
      {children}
    </Contexto.Provider>
  );
}

/** Lista de filas de una tabla del equipo activo, con guardar y borrar. */
export function useColeccion<T extends Fila>(tabla: Tabla) {
  const { equipo } = useEquipo();
  const [filas, setFilas] = useState<T[]>([]);
  const [cargando, setCargando] = useState(true);
  const { avisar } = useUi();
  const equipoRef = useRef(equipo.id);

  const recargar = useCallback(async () => {
    equipoRef.current = equipo.id;
    try {
      const f = await api.listar<T>(tabla, equipo.id);
      if (equipoRef.current === equipo.id) setFilas(f);
    } catch (err) { avisar(mensajeDe(err)); }
    finally { setCargando(false); }
  }, [tabla, equipo.id, avisar]);
  useEffect(() => { setCargando(true); recargar(); }, [recargar]);

  const guardar = useCallback(async (fila: T) => {
    setFilas((l) => (l.some((x) => x.id === fila.id) ? l.map((x) => (x.id === fila.id ? fila : x)) : [...l, fila]));
    try { await api.guardar(tabla, fila); } catch (err) { avisar(mensajeDe(err)); recargar(); throw err; }
  }, [tabla, avisar, recargar]);

  const borrar = useCallback(async (id: string) => {
    setFilas((l) => l.filter((x) => x.id !== id));
    try { await api.borrar(tabla, id); } catch (err) { avisar(mensajeDe(err)); recargar(); }
  }, [tabla, avisar, recargar]);

  return { filas, cargando, guardar, borrar, recargar };
}

/** Biblioteca propia del entrenador (vale para todos sus equipos). */
export function useMios<T extends { id: string }>(tabla: TablaUsuario) {
  const [filas, setFilas] = useState<T[]>([]);
  const [cargando, setCargando] = useState(true);
  const { avisar } = useUi();

  const recargar = useCallback(async () => {
    try { setFilas(await api.listarMios<T>(tabla)); } catch (err) { avisar(mensajeDe(err)); }
    finally { setCargando(false); }
  }, [tabla, avisar]);
  useEffect(() => { recargar(); }, [recargar]);

  const guardar = useCallback(async (fila: T) => {
    setFilas((l) => (l.some((x) => x.id === fila.id) ? l.map((x) => (x.id === fila.id ? fila : x)) : [fila, ...l]));
    try { await api.guardarMio(tabla, fila); } catch (err) { avisar(mensajeDe(err)); recargar(); throw err; }
  }, [tabla, avisar, recargar]);

  const borrar = useCallback(async (id: string) => {
    setFilas((l) => l.filter((x) => x.id !== id));
    try { await api.borrarMio(tabla, id); } catch (err) { avisar(mensajeDe(err)); recargar(); }
  }, [tabla, avisar, recargar]);

  return { filas, cargando, guardar, borrar, recargar, setFilas };
}
