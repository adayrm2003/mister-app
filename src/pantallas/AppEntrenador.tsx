import { useCallback, useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "../datos/api";
import type { Club, Equipo } from "../datos/tipos";
import { useSesion } from "../Sesion";
import { IcoAjustes, IcoAtras, IcoCalendario, IcoCheck, IcoEjercicios, IcoFlechaAbajo, IcoInicio, IcoMas, IcoPizarra, IcoPartidos, IcoPlantilla, IcoRecargar, IcoSalir, LogoMister } from "../componentes/Iconos";
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
import Biblioteca, { FichaBiblioteca } from "./Biblioteca";
import PizarraInicio, { EditorPizarraPartido, PizarrasPartido } from "./PizarraEntrenador";
import CrearEquipo from "../componentes/CrearEquipo";
import "./entrenador.css";


const CLAVE_EQUIPO = "mister-equipo-activo";

const PESTANAS = [
  { a: "/inicio", texto: "Inicio", Icono: IcoInicio },
  { a: "/plantilla", texto: "Plantilla", Icono: IcoPlantilla },
  { a: "/ejercicios", texto: "Ejercicios", Icono: IcoEjercicios },
  { a: "/pizarra", texto: "Pizarra", Icono: IcoPizarra },
  { a: "/calendario", texto: "Calendario", Icono: IcoCalendario },
  { a: "/partidos", texto: "Partidos", Icono: IcoPartidos }
];

export default function AppEntrenador({ esDirectiva = false }: { esDirectiva?: boolean }) {
  const ubicacion = useLocation();
  const [equipos, setEquipos] = useState<Equipo[] | null>(null);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [activoId, setActivoId] = useState<string | null>(() => { try { return localStorage.getItem(CLAVE_EQUIPO); } catch { return null; } });
  const [error, setError] = useState("");

  const elegir = useCallback((id: string) => {
    setActivoId(id);
    try { localStorage.setItem(CLAVE_EQUIPO, id); } catch { /* nada */ }
  }, []);

  const cargar = useCallback(async (activo?: string) => {
    try {
      const [eq, cl] = await Promise.all([api.misEquipos(), api.misClubes()]);
      if (activo) elegir(activo);
      setEquipos(eq); setClubes(cl); setError("");
    } catch (e) { setError(mensajeDe(e)); setEquipos([]); }
  }, [elegir]);
  useEffect(() => { cargar(); }, [cargar]);

  if (equipos === null) return <div className="cargando" aria-label="Cargando"><LogoMister size={88} /></div>;
  if (equipos.length === 0) {
    if (esDirectiva && clubes.length === 0) return <Navigate to="/club" replace />;
    return clubes.length === 0
      ? <SinClub alComprobar={() => cargar()} error={error} />
      : <PrimerEquipo clubes={clubes} alCrear={(e) => cargar(e.id)} volverAlPanel={esDirectiva} />;
  }

  const equipo = equipos.find((e) => e.id === activoId) ?? equipos[0];
  const ruta = ubicacion.pathname;

  return (
    <ProveedorEquipo key={equipo.id} equipo={equipo} equipos={equipos} recargarEquipos={cargar}>
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
              <SelectorEquipo equipo={equipo} equipos={equipos} clubes={clubes} elegir={elegir} alCrear={(e) => cargar(e.id)} />
            </div>
            <BotonAjustes />
            <MenuCuenta extra={esDirectiva && <IrAlPanel />} />
          </header>
          <Routes>
            <Route path="/inicio" element={<Inicio />} />
            <Route path="/plantilla" element={<Plantilla />} />
            <Route path="/ajustes" element={<Ajustes />} />
            <Route path="/ejercicios" element={<Ejercicios />} />
            <Route path="/ejercicios/nuevo" element={<EditorEjercicio />} />
            <Route path="/pizarra" element={<PizarraInicio />} />
            <Route path="/pizarra/partido" element={<PizarrasPartido />} />
            <Route path="/pizarra/partido/nueva" element={<EditorPizarraPartido />} />
            <Route path="/pizarra/partido/:id" element={<EditorPizarraPartido key="editar" />} />
            <Route path="/ejercicios/biblioteca" element={<Biblioteca />} />
            <Route path="/ejercicios/biblioteca/:id" element={<FichaBiblioteca />} />
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

function SelectorEquipo({ equipo, equipos, clubes, elegir, alCrear }: { equipo: Equipo; equipos: Equipo[]; clubes: Club[]; elegir: (id: string) => void; alCrear: (e: Equipo) => void }) {
  const [abierto, setAbierto] = useState<"lista" | "crear" | null>(null);
  const { avisar } = useUi();
  return (
    <>
      <button className="selector-equipo" type="button" onClick={() => setAbierto("lista")} aria-haspopup="dialog">
        {equipo.escudo ? <Escudo imagen={equipo.escudo} nombre={equipo.club ?? equipo.nombre} /> : <span className="escudo">{iniciales(equipo.nombre)}</span>}
        <span className="selector-nombre">{equipo.nombre}</span>
        <IcoFlechaAbajo />
      </button>
      {abierto === "lista" && (
        <Hoja titulo={equipos.length > 1 ? "Elige equipo" : "Tu equipo"} alCerrar={() => setAbierto(null)}>
          <div className="lista">
            {equipos.map((e) => (
              <button key={e.id} type="button" className="fila fila-boton" onClick={() => { elegir(e.id); setAbierto(null); if (e.id !== equipo.id) avisar(`Trabajando con ${e.nombre}`); }}>
                {e.escudo ? <Escudo imagen={e.escudo} nombre={e.club ?? e.nombre} tam="grande" /> : <span className="escudo escudo-grande">{iniciales(e.nombre)}</span>}
                <span className="fila-texto"><b>{e.nombre}</b>{e.club && <span>{e.club}</span>}</span>
                {e.id === equipo.id && <IcoCheck className="marca" />}
              </button>
            ))}
          </div>
          {clubes.length > 0 && (
            <button className="btn btn-borde btn-ancho" type="button" onClick={() => setAbierto("crear")}><IcoMas /> Crear otro equipo</button>
          )}
        </Hoja>
      )}
      {abierto === "crear" && (
        <Hoja titulo="Nuevo equipo" alCerrar={() => setAbierto(null)}>
          <CrearEquipo clubes={clubes} alCancelar={() => setAbierto(null)}
            alCrear={(e) => { setAbierto(null); avisar(`Equipo «${e.nombre}» creado`); alCrear(e); }} />
        </Hoja>
      )}
    </>
  );
}

function PrimerEquipo({ clubes, alCrear, volverAlPanel }: { clubes: Club[]; alCrear: (e: Equipo) => void; volverAlPanel?: boolean }) {
  const club = clubes[0];
  return (
    <div className="sin-equipo">
      <Escudo imagen={club.escudo} nombre={club.nombre} tam="enorme" />
      <h1>Crea tu equipo</h1>
      <p>{clubes.length === 1 ? <>Ya estás en <b style={{ color: "var(--tinta)" }}>{club.nombre}</b>.</> : "Ya estás en varios clubes."} Ponle nombre a tu equipo y elige a qué jugáis.</p>
      <CrearEquipo clubes={clubes} alCrear={alCrear} />
      {volverAlPanel && <IrAlPanel texto />}
    </div>
  );
}

function SinClub({ alComprobar, error }: { alComprobar: () => Promise<void>; error: string }) {
  const { perfil } = useSesion();
  const [comprobando, setComprobando] = useState(false);
  const { confirmar } = useUi();
  return (
    <div className="sin-equipo">
      <LogoMister size={72} />
      <h1>Tu club aún no te ha añadido</h1>
      <p>Pide a la directiva de tu club que te añada como entrenador con este correo:</p>
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

/** Para la directiva que también entrena: vuelve a su panel del club. */
function IrAlPanel({ texto = false }: { texto?: boolean }) {
  const ir = useNavigate();
  return (
    <button className={"btn btn-ancho " + (texto ? "btn-texto" : "btn-borde")} type="button" onClick={() => ir("/club")}>
      <IcoAtras /> Ir al panel del club
    </button>
  );
}

function BotonAjustes() {
  const ir = useNavigate();
  return <button className="btn btn-icono" type="button" aria-label="Ajustes" onClick={() => ir("/ajustes")}><IcoAjustes /></button>;
}
