import { useNavigate } from "react-router-dom";
import { IcoCalendario, IcoMas, IcoPartidos } from "../componentes/Iconos";
import { useColeccion, useEquipo } from "../ContextoEquipo";
import type { Partido } from "../datos/modelo";
import { citasDe, type Evento } from "../datos/calendario";
import { colorTexto } from "../componentes/Campo";
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
  const { equipo, ajustes } = useEquipo();
  const ir = useNavigate();
  const { filas: partidos } = useColeccion<Partido>("partidos");
  const { filas: eventos } = useColeccion<Evento>("eventos");
  const ahora = new Date().toTimeString().slice(0, 5);
  // Lo siguiente que toca: hoy cuenta hasta una hora después de empezar
  const haceUnaHora = `${String(Math.max(0, new Date().getHours() - 1)).padStart(2, "0")}:${ahora.slice(3)}`;
  const citas = citasDe(eventos, partidos, ajustes.tiposEvento).filter((c) => c.fecha > hoyISO() || (c.fecha === hoyISO() && (!c.hora || c.hora >= haceUnaHora)));
  const cita = citas[0];
  const partido = cita?.esPartido ? partidos.find((p) => p.id === cita.id) : undefined;
  const evento = cita && !cita.esPartido ? eventos.find((e) => e.id === cita.id) : undefined;
  const siguientes = citas.slice(1, 4);
  const hoy = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  return (
    <main className="pagina inicio">
      <div className="saludo">
        <span className="saludo-fecha">{hoy[0].toUpperCase() + hoy.slice(1)}</span>
        <h1>{saludo()}, míster</h1>
      </div>

      {cita ? (
        <section className="proximo" aria-label="Próximo evento">
          <span className="proximo-tipo" style={{ background: cita.color, color: colorTexto(cita.color) }}>{cita.tipoNombre} · {cuando(cita.fecha)}</span>
          <p className="proximo-vacio">{cita.titulo}</p>
          <p className="proximo-datos">{partido
            ? `${partido.hora} · ${partido.campo || "Campo sin indicar"} · ${partido.casa ? "En casa" : "Fuera"} · ${partido.competicion}`
            : cita.detalle || "Sin hora"}</p>
          {partido && <button className="btn proximo-boton" type="button" onClick={() => ir(`/partidos/${partido.id}/alineacion`)}><IcoPartidos /> {partido.alineacion ? "Ver alineación" : "Hacer alineación"}</button>}
          {evento && (
            <div className="proximo-botones">
              {evento.sesionId && <button className="btn proximo-boton" type="button" onClick={() => ir(`/sesiones/${evento.sesionId}/campo`)}>Modo campo</button>}
              <button className="btn proximo-boton" type="button" onClick={() => ir(`/calendario/${evento.id}`)}><IcoCalendario /> Pasar lista</button>
            </div>
          )}
        </section>
      ) : (
        <section className="proximo" aria-label="Próximo evento">
          <span className="proximo-tipo">Próximo evento</span>
          <p className="proximo-vacio">Sin eventos a la vista</p>
          <p className="proximo-datos">Añade entrenamientos de {equipo.nombre} en el calendario o apunta un partido y aquí verás el siguiente.</p>
          <button className="btn proximo-boton" type="button" onClick={() => ir("/calendario")}><IcoCalendario /> Abrir calendario</button>
        </section>
      )}

      <div className="acciones-inicio">
        <button className="btn btn-peto accion-grande" type="button" onClick={() => ir("/sesiones/nueva")}>
          <IcoMas /> Crear sesión
        </button>
        <button className="btn btn-borde accion-grande" type="button" onClick={() => ir("/partidos?nuevo=1")}>
          <IcoPartidos /> Apuntar partido
        </button>
      </div>
      {siguientes.length > 0 && (
        <section className="despues">
          <h2 className="etiqueta">Después</h2>
          <div className="lista">
            {siguientes.map((c) => (
              <button key={c.id} type="button" className="fila fila-boton" onClick={() => ir(c.enlace)}>
                <span className="punto-color" style={{ background: c.color }} />
                <span className="fila-texto"><b>{c.titulo}</b><span>{cuando(c.fecha)}{c.hora ? ` · ${c.hora}` : ""}</span></span>
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
