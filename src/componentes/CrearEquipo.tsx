// Formulario con el que el entrenador crea su equipo dentro de un club que le ha añadido.
import { useState, type FormEvent } from "react";
import { api } from "../datos/api";
import type { Club, Equipo } from "../datos/tipos";
import { AJUSTES_EQUIPO_BASE, MODALIDADES, type Modalidad } from "../datos/modelo";
import { Opciones } from "./Controles";
import { IcoMas } from "./Iconos";
import { Escudo, mensajeDe } from "./ui";

export default function CrearEquipo({ clubes, alCrear, alCancelar }: { clubes: Club[]; alCrear: (e: Equipo) => void; alCancelar?: () => void }) {
  const [clubId, setClubId] = useState(clubes[0]?.id ?? "");
  const [nombre, setNombre] = useState("");
  const [modalidad, setModalidad] = useState<Modalidad>("F11");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return setError("Escribe el nombre de tu equipo.");
    setEnviando(true); setError("");
    try {
      const eq = await api.crearMiEquipo(clubId, nombre);
      await api.guardarAjustesEquipo(eq.id, { ...AJUSTES_EQUIPO_BASE, modalidad });
      alCrear(eq);
    } catch (err) { setError(mensajeDe(err)); setEnviando(false); }
  }

  return (
    <form className="crear-mi-equipo" onSubmit={enviar} noValidate>
      {clubes.length > 1 && (
        <fieldset className="lista-clubes">
          <legend className="etiqueta">Club</legend>
          {clubes.map((c) => (
            <label key={c.id} className={clubId === c.id ? "activo" : ""}>
              <input type="radio" name="club" checked={clubId === c.id} onChange={() => setClubId(c.id)} />
              <Escudo imagen={c.escudo} nombre={c.nombre} />
              <b>{c.nombre}</b>
            </label>
          ))}
        </fieldset>
      )}
      <label className="campo">
        <span>Nombre del equipo</span>
        <input id="nombre-equipo" className="entrada" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} placeholder="Por ejemplo: Equipo A" autoComplete="off" />
      </label>
      <div className="campo">
        <span>¿A qué jugáis?</span>
        <Opciones<Modalidad> etiqueta="Modalidad" valor={modalidad} cambiar={setModalidad} columnas={3}
          opciones={MODALIDADES.map((m) => ({ valor: m.valor, texto: m.texto }))} />
      </div>
      {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
      <div className={alCancelar ? "hoja-acciones" : ""}>
        {alCancelar && <button className="btn btn-gris cerrar-hoja" type="button" onClick={alCancelar}>Cancelar</button>}
        <button className={"btn btn-principal" + (alCancelar ? "" : " btn-grande btn-ancho")} type="submit" disabled={enviando}>
          {!alCancelar && <IcoMas />} {enviando ? "Creando…" : "Crear equipo"}
        </button>
      </div>
    </form>
  );
}
