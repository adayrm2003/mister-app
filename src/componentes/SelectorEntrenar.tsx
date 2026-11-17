// Pestañas de la sección «Entrenar»: ejercicios, sesiones y pizarra.
import "./selector.css";
import { NavLink, useLocation } from "react-router-dom";

export default function SelectorEntrenar() {
  const ruta = useLocation().pathname;
  return (
    <nav className="segmentos-dir selector-biblioteca selector-entrenar" aria-label="Entrenar">
      <NavLink to="/ejercicios" className={({ isActive }) => (isActive ? "activo" : "")}>Ejercicios</NavLink>
      <NavLink to="/sesiones" end className={({ isActive }) => (isActive ? "activo" : "")}>Sesiones</NavLink>
      <NavLink to="/pizarra" className={() => (ruta.startsWith("/pizarra") ? "activo" : "")}>Pizarra</NavLink>
    </nav>
  );
}
