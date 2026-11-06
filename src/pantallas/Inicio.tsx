import { useNavigate } from "react-router-dom";
import { IcoCalendario, IcoMas, IcoPartidos } from "../componentes/Iconos";
import { useUi } from "../componentes/ui";
import { useEquipo } from "./AppEntrenador";

const saludo = () => {
  const h = new Date().getHours();
  return h < 14 ? "Buenos días" : h < 21 ? "Buenas tardes" : "Buenas noches";
};

export default function Inicio() {
  const { equipo } = useEquipo();
  const ir = useNavigate();
  const { avisar } = useUi();
  const hoy = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  return (
    <main className="pagina inicio">
      <div className="saludo">
        <span className="saludo-fecha">{hoy[0].toUpperCase() + hoy.slice(1)}</span>
        <h1>{saludo()}, míster</h1>
      </div>

      <section className="proximo" aria-label="Próximo evento">
        <span className="proximo-tipo">Próximo evento</span>
        <p className="proximo-vacio">Sin eventos a la vista</p>
        <p className="proximo-datos">Cuando añadas entrenamientos y partidos de {equipo.nombre} en el calendario, aquí verás el siguiente.</p>
        <button className="btn proximo-boton" type="button" onClick={() => ir("/calendario")}><IcoCalendario /> Abrir calendario</button>
      </section>

      <div className="acciones-inicio">
        <button className="btn btn-peto accion-grande" type="button" onClick={() => { avisar("Las sesiones llegan en la fase 6"); ir("/ejercicios"); }}>
          <IcoMas /> Crear sesión
        </button>
        <button className="btn btn-borde accion-grande" type="button" onClick={() => { avisar("Los partidos llegan en la fase 8"); ir("/partidos"); }}>
          <IcoPartidos /> Apuntar partido
        </button>
      </div>
    </main>
  );
}
