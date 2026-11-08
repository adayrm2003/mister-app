// Información legal: se puede leer con o sin sesión iniciada.
import { Link, useNavigate, useParams } from "react-router-dom";
import { IcoAtras, LogoMister } from "../componentes/Iconos";
import { ACTUALIZADO, DOCUMENTOS, faltanDatosTitular } from "../legal/textos";
import "./legal.css";

export const ENLACES_LEGALES = DOCUMENTOS.map((d) => ({ a: `/legal/${d.id}`, texto: d.titulo }));

export default function Legal() {
  const { doc } = useParams();
  const ir = useNavigate();
  const documento = DOCUMENTOS.find((d) => d.id === doc);
  const volver = () => (window.history.length > 1 ? ir(-1) : ir("/"));

  return (
    <div className="legal">
      <header className="cabecera legal-cabecera">
        <button className="btn btn-icono" type="button" onClick={volver} aria-label="Volver"><IcoAtras /></button>
        <div className="cabecera-titulo"><LogoMister size={32} /><b>Información legal</b></div>
      </header>

      <main className="pagina legal-pagina">
        {!documento ? (
          <>
            <h1>Información legal</h1>
            <div className="lista">
              {DOCUMENTOS.map((d) => (
                <Link key={d.id} to={`/legal/${d.id}`} className="fila fila-partido">
                  <span className="fila-texto"><b>{d.titulo}</b><span className="legal-resumen">{d.resumen}</span></span>
                  <IcoAtras style={{ transform: "rotate(180deg)", width: 20, height: 20, flex: "none" }} />
                </Link>
              ))}
            </div>
          </>
        ) : (
          <article className="legal-documento">
            <h1>{documento.titulo}</h1>
            <p className="suave">Última actualización: {ACTUALIZADO}</p>
            {faltanDatosTitular() && (
              <p className="mensaje mensaje-aviso">Borrador: faltan por completar los datos del titular (nombre, NIF, domicilio y correo de contacto).</p>
            )}
            {documento.secciones.map((s) => (
              <section key={s.titulo}>
                <h2>{s.titulo}</h2>
                {s.parrafos.map((p, i) => <p key={i}>{p}</p>)}
              </section>
            ))}
            <nav className="legal-otros" aria-label="Otros documentos">
              <span className="etiqueta">Otros documentos</span>
              {DOCUMENTOS.filter((d) => d.id !== documento.id).map((d) => <Link key={d.id} to={`/legal/${d.id}`} replace>{d.titulo}</Link>)}
            </nav>
          </article>
        )}
      </main>
    </div>
  );
}

/** Enlaces pequeños a los documentos legales (pie de la pantalla de acceso y menú de la cuenta). */
export function PieLegal() {
  return (
    <nav className="pie-legal" aria-label="Información legal">
      {ENLACES_LEGALES.map((e) => <Link key={e.a} to={e.a}>{e.texto}</Link>)}
    </nav>
  );
}
