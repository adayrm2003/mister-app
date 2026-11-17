// Propuesta de sesión según el objetivo de la semana: la app elige ejercicios que encajan
// (tuyos y de la Biblioteca Míster) y con un toque se crea la sesión, que luego puedes retocar.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEquipo, useMios } from "../ContextoEquipo";
import { IcoAtras, IcoCheck } from "../componentes/Iconos";
import { mensajeDe, useUi } from "../componentes/ui";
import BotonDictado from "../componentes/Dictado";
import { aEjercicioPropio, fasePara } from "../datos/catalogo";
import type { Ejercicio } from "../datos/pizarra";
import { candidatos, seleccionInicial, type Candidato } from "../datos/propuesta";
import { sesionVacia, textoMinutos, type Sesion } from "../datos/sesion";
import { hoyLunes } from "../datos/temporada";
import { useCatalogo } from "./Biblioteca";
import { usePlanTemporada } from "./Temporada";
import "./ejercicios.css";
import "./propuesta.css";

const MOMENTOS: { valor: Candidato["momento"]; texto: string }[] = [
  { valor: "inicial", texto: "Para empezar" }, { valor: "principal", texto: "Parte principal" }, { valor: "final", texto: "Para acabar" }
];

export default function PropuestaSesion() {
  const [params] = useSearchParams();
  const { plan } = usePlanTemporada();
  const { ajustes } = useEquipo();
  const { avisar } = useUi();
  const ir = useNavigate();
  const { filas: mios, cargando, guardar: guardarEjercicio } = useMios<Ejercicio>("ejercicios");
  const { guardar: guardarSesion } = useMios<Sesion>("sesiones");
  const { lista: catalogo } = useCatalogo();
  const objetivoSemana = plan?.semanas[hoyLunes()]?.objetivo ?? "";
  const [objetivo, setObjetivo] = useState(params.get("objetivo") ?? objetivoSemana);
  const [buscado, setBuscado] = useState(objetivo);
  const [elegidos, setElegidos] = useState<Set<string> | null>(null);
  const [verMas, setVerMas] = useState<Set<string>>(new Set());
  const [creando, setCreando] = useState(false);
  useEffect(() => { if (!params.get("objetivo") && objetivoSemana && !objetivo) { setObjetivo(objetivoSemana); setBuscado(objetivoSemana); } }, [objetivoSemana]); // eslint-disable-line react-hooks/exhaustive-deps

  const lista = useMemo(() => (buscado.trim() && catalogo ? candidatos(buscado, mios, catalogo) : []), [buscado, mios, catalogo]);
  useEffect(() => { if (lista.length) setElegidos(seleccionInicial(lista)); else setElegidos(new Set()); }, [lista]);
  const sel = elegidos ?? new Set<string>();
  const total = lista.filter((c) => sel.has(c.clave)).reduce((t, c) => t + (c.duracion ?? 0), 0);
  const alternar = (k: string) => setElegidos((s) => { const n = new Set(s ?? []); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  async function crear() {
    const escogidos = lista.filter((c) => sel.has(c.clave));
    if (!escogidos.length) return avisar("Elige al menos un ejercicio");
    setCreando(true);
    try {
      const fases = ajustes.fases;
      const faseDe = (c: Candidato) => (c.catalogo ? fasePara(c.catalogo, fases)
        : c.momento === "inicial" ? fases[0]?.id : c.momento === "final" ? fases[fases.length - 1]?.id : fases[Math.min(1, fases.length - 1)]?.id) ?? "";
      const orden = { inicial: 0, principal: 1, final: 2 };
      const bloques = [];
      for (const c of [...escogidos].sort((a, b) => orden[a.momento] - orden[b.momento])) {
        let ej = c.mio;
        if (!ej && c.catalogo) { ej = aEjercicioPropio(c.catalogo, ajustes.tiposEjercicio); await guardarEjercicio(ej); }
        if (ej) bloques.push({ id: crypto.randomUUID(), faseId: faseDe(c), ejercicioId: ej.id, minutos: null, notas: "" });
      }
      const s: Sesion = { ...sesionVacia(), nombre: buscado.trim().slice(0, 60), objetivo: buscado.trim(), bloques };
      await guardarSesion(s);
      avisar("Sesión creada: retócala si quieres");
      ir(`/sesiones/${s.id}/editar`);
    } catch (e) { avisar(mensajeDe(e)); }
    finally { setCreando(false); }
  }

  return (
    <main className="pagina propuesta-sesion">
      <div className="partido-cabeza">
        <Link to="/sesiones" className="btn btn-icono" aria-label="Volver a las sesiones"><IcoAtras /></Link>
        <h1 style={{ flex: 1 }}>Sesión según objetivo</h1>
      </div>
      <form className="buscar-objetivo" onSubmit={(e) => { e.preventDefault(); setBuscado(objetivo); setVerMas(new Set()); }}>
        <label className="campo"><span>¿Qué quieres trabajar?</span>
          <input className="entrada" value={objetivo} maxLength={80} onChange={(e) => setObjetivo(e.target.value)} placeholder="Ej.: Presión tras pérdida" />
        </label>
        <div className="acciones-texto">
          <BotonDictado alTexto={(t) => { setObjetivo(t); setBuscado(t); }} etiqueta="Decir el objetivo" />
          <button className="btn btn-principal" type="submit" disabled={!objetivo.trim()}>Buscar ejercicios</button>
        </div>
        {objetivoSemana && buscado !== objetivoSemana && (
          <button type="button" className="enlace" onClick={() => { setObjetivo(objetivoSemana); setBuscado(objetivoSemana); }}>Usar el objetivo de esta semana: «{objetivoSemana}»</button>
        )}
      </form>

      {!buscado.trim() ? (
        <p className="suave">Escribe lo que quieres trabajar (o ponle un objetivo a la semana en Calendario → Temporada) y te propongo una sesión con ejercicios que encajan.</p>
      ) : cargando || !catalogo ? (
        <p className="suave">Buscando ejercicios…</p>
      ) : (
        <>
          <p className="suave">Te propongo estos ejercicios. Marca o desmarca los que quieras; luego podrás cambiar el orden, los minutos y las fases.</p>
          {MOMENTOS.map((m) => {
            const deEste = lista.filter((c) => c.momento === m.valor && (c.puntos > 0 || sel.has(c.clave) || m.valor !== "principal"));
            const mostrar = verMas.has(m.valor) ? deEste.slice(0, 12) : deEste.slice(0, 4);
            if (!deEste.length) return null;
            return (
              <section key={m.valor} className="grupo-propuesta">
                <h2 className="etiqueta">{m.texto}</h2>
                <ul className="lista-propuesta">
                  {mostrar.map((c) => (
                    <li key={c.clave}>
                      <button type="button" className={"fila-convocar" + (sel.has(c.clave) ? " si" : "")} aria-pressed={sel.has(c.clave)} onClick={() => alternar(c.clave)}>
                        <span className="marca-convocar" aria-hidden="true">{sel.has(c.clave) && <IcoCheck />}</span>
                        <span className="fila-texto"><b>{c.nombre}</b><span>{c.objetivo || "Sin objetivo"}{c.duracion ? ` · ${c.duracion} min` : ""}</span></span>
                        <span className={"pastilla" + (c.origen === "mio" ? " pastilla-ok" : "")}>{c.origen === "mio" ? "Tuyo" : "Míster"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {deEste.length > 4 && !verMas.has(m.valor) && <button type="button" className="btn btn-texto" onClick={() => setVerMas((s) => new Set(s).add(m.valor))}>Ver más</button>}
              </section>
            );
          })}
          {lista.every((c) => c.puntos === 0) && <p className="mensaje mensaje-aviso">No he encontrado ejercicios que hablen de «{buscado}». Prueba con otras palabras (presión, salida de balón, finalización…).</p>}
          <div className="barra-crear-sesion">
            <span><b>{sel.size}</b> ejercicios{total ? ` · ${textoMinutos(total)}` : ""}</span>
            <button className="btn btn-peto btn-grande" type="button" disabled={creando || sel.size === 0} onClick={crear}>{creando ? "Creando…" : "Crear sesión"}</button>
          </div>
        </>
      )}
    </main>
  );
}
