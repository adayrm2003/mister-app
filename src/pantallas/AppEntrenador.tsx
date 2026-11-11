import { useCallback, useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "../datos/api";
import type { Equipo } from "../datos/tipos";
import { useSesion } from "../Sesion";
import { IcoAjustes, IcoCalendario, IcoCheck, IcoEjercicios, IcoFlechaAbajo, IcoInicio, IcoPartidos, IcoPlantilla, IcoRecargar, IcoSalir, LogoMister } from "../componentes/Iconos";
import { ProveedorEquipo } from "../ContextoEquipo";
import Ajustes from "./Ajustes";
import Plantilla from "./Plantilla";
import Partidos, { PartidoDetalle } from "./Partidos";
import Ejercicios, { EditorEjercicio, EjercicioDetalle } from "./Ejercicios";
import Sesiones, { EditorSesion, SesionDetalle } from "./Sesiones";
import ModoCampo from "./ModoCampo";
import Calendario, { EventoDetalle } from "./Calendario";
import Estadisticas from "./Estadisticas";
import MenuCuenta from "../componentes/MenuCuenta";
import { Escudo, Hoja, iniciales, mensajeDe, useUi } from "../componentes/ui";
import Inicio from "./Inicio";
import "./entrenador.css";


const CLAVE_EQUIPO = "mister-equipo-activo";

const PESTANAS = [
  { a: "/inicio", texto: "Inicio", Icono: IcoInicio },
  { a: "/plantilla", texto: "Plantilla", Icono: IcoPlantilla },
  { a: "/ejercicios", texto: "Ejercicios", Icono: IcoEjercicios },
  { a: "/calendario", texto: "Calendario", Icono: IcoCalendario },
  { a: "/partidos", texto: "Partidos", Icono: IcoPartidos }
];

export default function AppEntrenador() {
  const ubicacion = useLocation();
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
  const ruta = ubicacion.pathname;

  return (
    <ProveedorEquipo key={equipo.id} equipo={equipo} equipos={equipos}>
      <div className="entrenador">
        <nav className="pestanas" aria-label="Secciones">
          <div className="pestanas-logo"><LogoMister size={40} /></div>
          {PESTANAS.map(({ a, texto, Icono }) => (
            <NavLink key={a} to={a} className={({ isActive }) => "pestana" + (isActive || (a === "/ejercicios" && ruta.startsWith("/sesiones")) || (a === "/partidos" && ruta.startsWith("/estadisticas")) ? " active" : "")}>
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
            <BotonAjustes />
            <MenuCuenta />
          </header>
          <Routes>
            <Route path="/inicio" element={<Inicio />} />
            <Route path="/plantilla" element={<Plantilla />} />
            <Route path="/ajustes" element={<Ajustes />} />
            <Route path="/ejercicios" element={<Ejercicios />} />
            <Route path="/ejercicios/nuevo" element={<EditorEjercicio />} />
            <Route path="/ejercicios/:id" element={<EjercicioDetalle />} />
            <Route path="/ejercicios/:id/editar" element={<EditorEjercicio />} />
            <Route path="/sesiones" element={<Sesiones />} />
            <Route path="/sesiones/nueva" element={<EditorSesion />} />
            <Route path="/sesiones/:id" element={<SesionDetalle />} />
            <Route path="/sesiones/:id/editar" element={<EditorSesion />} />
            <Route path="/sesiones/:id/campo" element={<ModoCampo />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/calendario/:id" element={<EventoDetalle />} />
            <Route path="/partidos" element={<Partidos />} />
            <Route path="/estadisticas" element={<Estadisticas />} />
            <Route path="/partidos/:id" element={<PartidoDetalle />} />
            <Route path="/partidos/:id/:seccion" element={<PartidoDetalle />} />
            <Route path="*" element={<Navigate to="/inicio" replace />} />
          </Routes>
        </div>
      </div>
    </ProveedorEquipo>
  );
}

function SelectorEquipo({ equipo, equipos, elegir }: { equipo: Equipo; equipos: Equipo[]; elegir: (id: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const { avisar } = useUi();
  const varios = equipos.length > 1;
  return (
    <>
      <button className="selector-equipo" type="button" onClick={() => varios && setAbierto(true)} aria-haspopup={varios ? "dialog" : undefined} disabled={!varios}>
        {equipo.escudo ? <Escudo imagen={equipo.escudo} nombre={equipo.club ?? equipo.nombre} /> : <span className="escudo">{iniciales(equipo.nombre)}</span>}
        <span className="selector-nombre">{equipo.nombre}</span>
        {varios && <IcoFlechaAbajo />}
      </button>
      {abierto && (
        <Hoja titulo="Elige equipo" alCerrar={() => setAbierto(false)}>
          <div className="lista">
            {equipos.map((e) => (
              <button key={e.id} type="button" className="fila fila-boton" onClick={() => { elegir(e.id); setAbierto(false); avisar(`Trabajando con ${e.nombre}`); }}>
                {e.escudo ? <Escudo imagen={e.escudo} nombre={e.club ?? e.nombre} tam="grande" /> : <span className="escudo escudo-grande">{iniciales(e.nombre)}</span>}
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

function BotonAjustes() {
  const ir = useNavigate();
  return <button className="btn btn-icono" type="button" aria-label="Ajustes" onClick={() => ir("/ajustes")}><IcoAjustes /></button>;
}
