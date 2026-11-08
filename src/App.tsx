import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useSesion } from "./Sesion";
import { LogoMister } from "./componentes/Iconos";
import Acceso from "./pantallas/Acceso";
import NuevaContrasena from "./pantallas/NuevaContrasena";
import PanelDirectiva from "./pantallas/PanelDirectiva";
import AppEntrenador from "./pantallas/AppEntrenador";
import Legal from "./pantallas/Legal";

export default function App() {
  const { cargando, perfil, recuperando } = useSesion();
  const ubicacion = useLocation();

  // La información legal se puede leer siempre, con o sin sesión
  if (ubicacion.pathname.startsWith("/legal")) {
    return (
      <Routes>
        <Route path="/legal" element={<Legal />} />
        <Route path="/legal/:doc" element={<Legal />} />
      </Routes>
    );
  }

  if (cargando) {
    return <div className="cargando" aria-label="Cargando"><LogoMister size={88} /></div>;
  }
  if (recuperando) return <NuevaContrasena />;
  if (!perfil) {
    return (
      <Routes>
        <Route path="/acceso" element={<Acceso />} />
        <Route path="*" element={<Navigate to="/acceso" replace />} />
      </Routes>
    );
  }
  if (perfil.rol === "directiva") {
    return (
      <Routes>
        <Route path="/club" element={<PanelDirectiva />} />
        <Route path="*" element={<Navigate to="/club" replace />} />
      </Routes>
    );
  }
  return <AppEntrenador />;
}
