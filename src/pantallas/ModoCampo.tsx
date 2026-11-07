// Modo campo: la sesión a pantalla completa, ejercicio por ejercicio, con cronómetro.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEquipo, useMios } from "../ContextoEquipo";
import Pizarra from "../componentes/Pizarra";
import type { Ejercicio } from "../datos/pizarra";
import { bloquesEnOrden, minutosDe, type Sesion } from "../datos/sesion";
import { Apartados } from "./Ejercicios";
import "./modo-campo.css";

const formato = (s: number) => {
  const a = Math.abs(Math.round(s));
  return `${s < 0 ? "+" : ""}${Math.floor(a / 60)}:${String(a % 60).padStart(2, "0")}`;
};

/** Pitido corto con el altavoz del móvil (solo suena después de que el usuario haya tocado la pantalla). */
function pitar() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.type = "square";
      g.gain.setValueAtTime(0.25, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.26);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch { /* sin sonido */ }
  try { navigator.vibrate?.([300, 120, 300, 120, 500]); } catch { /* sin vibración */ }
}

export default function ModoCampo() {
  const { id } = useParams();
  const { ajustes } = useEquipo();
  const sesiones = useMios<Sesion>("sesiones");
  const ejercicios = useMios<Ejercicio>("ejercicios");
  const ir = useNavigate();
  const mapa = useMemo(() => new Map(ejercicios.filas.map((e) => [e.id, e])), [ejercicios.filas]);
  const s = sesiones.filas.find((x) => x.id === id);
  const orden = useMemo(() => (s ? bloquesEnOrden(s, ajustes.fases, mapa) : []), [s, ajustes.fases, mapa]);

  const [i, setI] = useState(0);
  const [restante, setRestante] = useState(0);
  const [corriendo, setCorriendo] = useState(false);
  const avisado = useRef(false);
  const restanteRef = useRef(0);
  restanteRef.current = restante;
  // Cambia cada vez que se toca el tiempo a mano (+1 min, reiniciar) para que la cuenta siga desde ahí
  const [ajusteManual, setAjusteManual] = useState(0);
  const actual = orden[i];
  const e = actual ? mapa.get(actual.bloque.ejercicioId) : undefined;
  const minutos = actual ? minutosDe(actual.bloque, e) : 0;

  // Al cambiar de ejercicio, el cronómetro vuelve a sus minutos
  useEffect(() => { setRestante(minutos * 60); setCorriendo(false); avisado.current = false; }, [i, minutos]);

  // Cuenta atrás: si se pasa de tiempo, sigue contando en positivo (+0:15)
  useEffect(() => {
    if (!corriendo) return;
    // Se cuenta desde la hora de inicio, así no se pierde tiempo aunque el móvil vaya lento
    const inicio = Date.now();
    const desde = restanteRef.current;
    const t = setInterval(() => setRestante(desde - (Date.now() - inicio) / 1000), 250);
    return () => clearInterval(t);
  }, [corriendo, ajusteManual]);
  useEffect(() => {
    if (minutos > 0 && restante <= 0 && corriendo && !avisado.current) { avisado.current = true; pitar(); }
  }, [restante, corriendo, minutos]);

  // Que la pantalla no se apague mientras se usa
  useEffect(() => {
    let candado: { release: () => Promise<void> } | null = null;
    const pedir = async () => {
      try { candado = await (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen") ?? null; } catch { /* no disponible */ }
    };
    pedir();
    const alVolver = () => { if (document.visibilityState === "visible") pedir(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => { document.removeEventListener("visibilitychange", alVolver); candado?.release().catch(() => {}); };
  }, []);

  if (sesiones.cargando || ejercicios.cargando) return <div className="modo-campo" />;
  if (!s || orden.length === 0) {
    return (
      <div className="modo-campo modo-campo-vacio">
        <p>Esta sesión no tiene ejercicios.</p>
        <button className="btn btn-principal btn-grande" type="button" onClick={() => ir(-1)}>Volver</button>
      </div>
    );
  }

  const pasado = minutos > 0 && restante <= 0;
  const tieneDibujo = !!e && e.pizarra.piezas.length > 0;

  return (
    <div className="modo-campo" role="dialog" aria-label={`Modo campo: ${s.nombre}`}>
      <header className="mc-cabecera">
        <button className="btn mc-salir" type="button" onClick={() => ir(`/sesiones/${s.id}`)} aria-label="Salir del modo campo">✕ Salir</button>
        <div className="mc-progreso">
          <span>{actual.fase.nombre}</span>
          <b>{i + 1} / {orden.length}</b>
        </div>
      </header>
      <div className="mc-barra" aria-hidden="true">{orden.map((_, k) => <span key={k} className={k < i ? "hecho" : k === i ? "actual" : ""} />)}</div>

      <main className="mc-cuerpo">
        <h1 className="mc-titulo">{e?.nombre ?? "Ejercicio borrado"}</h1>
        {actual.bloque.notas && <p className="mc-nota">{actual.bloque.notas}</p>}

        <section className={"mc-crono" + (pasado ? " pasado" : "")} aria-live="polite">
          <span className="mc-tiempo">{minutos > 0 ? formato(restante) : formato(-restante)}</span>
          <span className="mc-tiempo-texto">{pasado ? "¡Tiempo!" : minutos > 0 ? `de ${minutos} min` : "cronómetro"}</span>
          <div className="mc-crono-botones">
            <button className="btn btn-peto mc-grande" type="button" onClick={() => setCorriendo(!corriendo)}>{corriendo ? "Pausa" : restante === minutos * 60 ? "Empezar" : "Seguir"}</button>
            <button className="btn btn-gris mc-medio" type="button" onClick={() => { setRestante(minutos * 60); setCorriendo(false); avisado.current = false; setAjusteManual((n) => n + 1); }}>Reiniciar</button>
            <button className="btn btn-gris mc-medio" type="button" onClick={() => { restanteRef.current += 60; setRestante(restanteRef.current); avisado.current = false; setAjusteManual((n) => n + 1); }}>+1 min</button>
          </div>
        </section>

        {tieneDibujo && <Pizarra pizarra={e!.pizarra} colorEquipo={ajustes.colorEquipo} colorRival={ajustes.colorRival} />}
        {e && (
          <div className="mc-texto">
            {e.objetivo && <p><b>Objetivo:</b> {e.objetivo}</p>}
            {e.material && <p><b>Material:</b> {e.material}</p>}
            {e.explicacion && <Apartados texto={e.explicacion} />}
          </div>
        )}
      </main>

      <nav className="mc-navegacion">
        <button className="btn btn-gris mc-grande" type="button" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>‹ Anterior</button>
        {i < orden.length - 1
          ? <button className="btn btn-principal mc-grande" type="button" onClick={() => setI(i + 1)}>Siguiente ›</button>
          : <button className="btn btn-principal mc-grande" type="button" onClick={() => ir(`/sesiones/${s.id}`)}>Terminar</button>}
      </nav>
    </div>
  );
}
