import { useNavigate } from "react-router-dom";
import { IcoCalendario, IcoMas, IcoPartidos } from "../componentes/Iconos";
import { useUi } from "../componentes/ui";
import { useColeccion, useEquipo } from "../ContextoEquipo";
import type { Partido } from "../datos/modelo";
import { fechaLarga, hoyISO } from "./Partidos";

const saludo = () => {
  const h = new Date().getHours();
  return h < 14 ? "Buenos días" : h < 21 ? "Buenas tardes" : "Buenas noches";
};

function cuando(fecha: string) {
  const dias = Math.round((new Date(fecha + "T12:00").getTime() - new Date(hoyISO() + "T12:00").getTime()) / 86400000);
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  if (dias < 7) return `En ${dias} días`;
  return fechaLarga(fecha);
}

export default function Inicio() {
  const { equipo } = useEquipo();
  const ir = useNavigate();
  const { avisar } = useUi();
  const { filas: partidos } = useColeccion<Partido>("partidos");
  const proximo = partidos.filter((p) => p.fecha >= hoyISO()).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))[0];
  const hoy = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  return (
    <main className="pagina inicio">
      <div className="saludo">
        <span className="saludo-fecha">{hoy[0].toUpperCase() + hoy.slice(1)}</span>
        <h1>{saludo()}, míster</h1>
      </div>

      {proximo ? (
        <section className="proximo" aria-label="Próximo evento">
          <span className="proximo-tipo">Partido · {cuando(proximo.fecha)}</span>
          <p className="proximo-vacio">vs {proximo.rival}</p>
          <p className="proximo-datos">{proximo.hora} · {proximo.campo || "Campo sin indicar"} · {proximo.casa ? "En casa" : "Fuera"} · {proximo.competicion}</p>
          <button className="btn proximo-boton" type="button" onClick={() => ir(`/partidos/${proximo.id}/alineacion`)}><IcoPartidos /> {proximo.alineacion ? "Ver alineación" : "Hacer alineación"}</button>
        </section>
      ) : (
        <section className="proximo" aria-label="Próximo evento">
          <span className="proximo-tipo">Próximo evento</span>
          <p className="proximo-vacio">Sin eventos a la vista</p>
          <p className="proximo-datos">Cuando apuntes partidos de {equipo.nombre} (y en la fase 7, entrenamientos en el calendario), aquí verás el siguiente.</p>
          <button className="btn proximo-boton" type="button" onClick={() => ir("/calendario")}><IcoCalendario /> Abrir calendario</button>
        </section>
      )}

      <div className="acciones-inicio">
        <button className="btn btn-peto accion-grande" type="button" onClick={() => { avisar("Las sesiones llegan en la fase 6"); ir("/ejercicios"); }}>
          <IcoMas /> Crear sesión
        </button>
        <button className="btn btn-borde accion-grande" type="button" onClick={() => ir("/partidos?nuevo=1")}>
          <IcoPartidos /> Apuntar partido
        </button>
      </div>
    </main>
  );
}
