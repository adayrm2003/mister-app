import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { ProveedorSesion } from "./Sesion";
import { ProveedorUi } from "./componentes/ui";
import "./estilos.css";

registerSW({ immediate: true });

createRoot(document.getElementById("raiz")!).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorUi>
        <ProveedorSesion>
          <App />
        </ProveedorSesion>
      </ProveedorUi>
    </BrowserRouter>
  </StrictMode>
);
