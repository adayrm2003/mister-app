import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { api } from "../datos/api";
import type { Equipo } from "../datos/tipos";
import { useSesion } from "../Sesion";
import { IcoCalendario, IcoCheck, IcoEjercicios, IcoFlechaAbajo, IcoInicio, IcoPartidos, IcoPlantilla, IcoRecargar, IcoSalir, LogoMister } from "../componentes/Iconos";
import MenuCuenta from "../componentes/MenuCuenta";
import { Hoja, iniciales, mensajeDe, useUi } from "../componentes/ui";
import Inicio from "./Inicio";
import Proximamente from "./Proximamente";
import "./entrenador.css";

/* El equipo con el que se está trabajando, disponible en todas las pantallas */
interface EstadoEquipo { equipo: Equipo; equipos: Equipo[] }
const ContextoEquipo = createContext<EstadoEquipo | null>(null);
export const useEquipo = () => useContext(ContextoEquipo)!;

const CLAVE_EQUIPO = "mister-equipo-activo";

const PESTANAS = [
  { a: "/inicio", texto: "Inicio", Icono: IcoInicio },
  { a: "/plantilla", texto: "Plantilla", Icono: IcoPlantilla },
  { a: "/ejercicios", texto: "Ejercicios", Icono: IcoEjercicios },
  { a: "/calendario", texto: "Calendario", Icono: IcoCalendario },
  { a: "/partidos", texto: "Partidos", Icono: IcoPartidos }
];

export default function AppEntrenador() {
  const [equipos, setEquipos] = useState<Equipo[] | null>(null);
  const [activoId, setActivoId] = useState<string | null>(() => { try { return localStorage.getItem(CLAVE_EQUIPO); } catch { return null; } });
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try { setEquipos(await api.misEquipos()); setError(""); } catch (e) { setError(mensajeDe(e)); setEquipos([]); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const elegir = (id: string) => {
    setActivoId(id);
    try { localStorage.setItem(CLAVE_EQUIPO, id); } catch { /* nada */ }
  };

  if (equipos === null) return <div className="cargando" aria-label="Cargando"><LogoMister size={88} /></div>;
  if (equipos.length === 0) return <SinEquipo alComprobar={cargar} error={error} />;

  const equipo = equipos.find((e) => e.id === activoId) ?? equipos[0];

  return (
    <ContextoEquipo.Provider value={{ equipo, equipos }}>
      <div className="entrenador">
        <nav className="pestanas" aria-label="Secciones">
          <div className="pestanas-logo"><LogoMister size={40} /></div>
          {PESTANAS.map(({ a, texto, Icono }) => (
            <NavLink key={a} to={a} className="pestana">
              <span className="pestana-icono"><Icono /></span>
              {texto}
            </NavLink>
          ))}
        </nav>

        <div className="entrenador-cuerpo">
          <header className="cabecera">
            <div className="cabecera-titulo">
              <SelectorEquipo equipo={equipo} equipos={equipos} elegir={elegir} />
            </div>
            <MenuCuenta />
          </header>
          <Routes>
            <Route path="/inicio" element={<Inicio />} />
            <Route path="/plantilla" element={<Proximamente titulo="Plantilla" fase={3} texto="Aquí añadirás a tus jugadores con su nombre, pierna buena, posición y dorsal." Icono={IcoPlantilla} />} />
            <Route path="/ejercicios" element={<Proximamente titulo="Ejercicios" fase={5} texto="Aquí tendrás tu biblioteca de ejercicios con pizarra animada y, en la fase 6, tus sesiones." Icono={IcoEjercicios} />} />
            <Route path="/calendario" element={<Proximamente titulo="Calendario" fase={7} texto="Aquí verás la semana y el mes con tus entrenamientos, partidos y torneos, y podrás pasar lista." Icono={IcoCalendario} />} />
            <Route path="/partidos" element={<Proximamente titulo="Partidos" fase={8} texto="Aquí apuntarás los partidos, la convocatoria, la alineación, los goles, los cambios y las tarjetas." Icono={IcoPartidos} />} />
            <Route path="*" element={<Navigate to="/inicio" replace />} />
          </Routes>
        </div>
      </div>
    </ContextoEquipo.Provider>
  );
}

function SelectorEquipo({ equipo, equipos, elegir }: { equipo: Equipo; equipos: Equipo[]; elegir: (id: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const { avisar } = useUi();
  const varios = equipos.length > 1;
  return (
    <>
      <button className="selector-equipo" type="button" onClick={() => varios && setAbierto(true)} aria-haspopup={varios ? "dialog" : undefined} disabled={!varios}>
        <span className="escudo">{iniciales(equipo.nombre)}</span>
        <span className="selector-nombre">{equipo.nombre}</span>
        {varios && <IcoFlechaAbajo />}
      </button>
      {abierto && (
        <Hoja titulo="Elige equipo" alCerrar={() => setAbierto(false)}>
          <div className="lista">
            {equipos.map((e) => (
              <button key={e.id} type="button" className="fila fila-boton" onClick={() => { elegir(e.id); setAbierto(false); avisar(`Trabajando con ${e.nombre}`); }}>
                <span className="escudo escudo-grande">{iniciales(e.nombre)}</span>
                <span className="fila-texto"><b>{e.nombre}</b>{e.club && <span>{e.club}</span>}</span>
                {e.id === equipo.id && <IcoCheck className="marca" />}
              </button>
            ))}
          </div>
        </Hoja>
      )}
    </>
  );
}

function SinEquipo({ alComprobar, error }: { alComprobar: () => Promise<void>; error: string }) {
  const { perfil } = useSesion();
  const [comprobando, setComprobando] = useState(false);
  const { confirmar } = useUi();
  return (
    <div className="sin-equipo">
      <LogoMister size={72} />
      <h1>Tu club aún no te ha asignado un equipo</h1>
      <p>Pide a la directiva de tu club que te asigne a tu equipo con este correo:</p>
      <p className="correo-grande">{perfil?.email}</p>
      {error && <p className="mensaje mensaje-error">{error}</p>}
      <button className="btn btn-principal btn-grande btn-ancho" type="button" disabled={comprobando}
        onClick={async () => { setComprobando(true); await alComprobar(); setComprobando(false); }}>
        <IcoRecargar /> {comprobando ? "Comprobando…" : "Comprobar de nuevo"}
      </button>
      <button className="btn btn-texto" type="button" onClick={async () => {
        if (await confirmar({ titulo: "¿Cerrar sesión?", boton: "Cerrar sesión", peligro: false })) await api.salir();
      }}><IcoSalir /> Cerrar sesión</button>
    </div>
  );
}

export function Seccion({ children }: { children: ReactNode }) {
  return <main className="pagina">{children}</main>;
}
