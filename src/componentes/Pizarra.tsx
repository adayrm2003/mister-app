// Pizarra animada 2D: se ve, se reproduce y (si se pasa "cambiar") se edita.
import { useEffect, useId, useMemo, useRef, useState, type PointerEvent as PE } from "react";
import { FLECHAS, posicionesAnimadas, siguienteEtiqueta, type Flecha, type Pieza, type Pizarra as TPizarra, type TipoFlecha, type TipoPieza } from "../datos/pizarra";
import type { Punto } from "../datos/modelo";
import { colorTexto } from "./Campo";
import { IcoPapelera } from "./Iconos";
import "./pizarra.css";

const VW = 680;
const alto = (p: TPizarra) => (p.campo === "completo" ? 1050 : 545);
const DURACION = 1300; // milisegundos entre un paso y el siguiente

/* ---------- Dibujos ---------- */
export function DibujoCampo({ campo }: { campo: "completo" | "medio" }) {
  const h = campo === "completo" ? 1050 : 545;
  const franjas = campo === "completo" ? 10 : 5;
  return (
    <g>
      {Array.from({ length: franjas }, (_, i) => (
        <rect key={i} x="0" y={(i * h) / franjas} width={VW} height={h / franjas} fill={i % 2 ? "var(--campo-b)" : "var(--campo-a)"} />
      ))}
      <g fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="4">
        {campo === "completo" ? (
          <>
            <rect x="30" y="30" width="620" height="990" />
            <path d="M30 525h620" />
            <circle cx="340" cy="525" r="80" />
            <rect x="140" y="870" width="400" height="150" /><rect x="240" y="965" width="200" height="55" />
            <path d="M270 870a80 80 0 0 1 140 0" />
            <rect x="290" y="1020" width="100" height="16" />
          </>
        ) : (
          <>
            <path d="M30 545V30h620v515" />
            <path d="M30 525h620" />
            <circle cx="340" cy="525" r="80" />
          </>
        )}
        <rect x="140" y="30" width="400" height="150" /><rect x="240" y="30" width="200" height="55" />
        <path d="M270 180a80 80 0 0 0 140 0" />
        <rect x="290" y="14" width="100" height="16" />
      </g>
      <circle cx="340" cy="525" r="6" fill="rgba(255,255,255,.9)" />
    </g>
  );
}

/** Línea ondulada para la conducción (termina recta para que se vea la punta). */
function caminoOndulado(a: Punto, b: Punto) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
  if (L < 30) return `M${a.x} ${a.y}L${b.x} ${b.y}`;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const ondas = Math.max(2, Math.round((L - 26) / 30));
  let d = `M${a.x} ${a.y}`;
  for (let s = 4; s <= L - 26; s += 4) {
    const o = Math.sin((s / (L - 26)) * ondas * Math.PI * 2) * 8;
    d += `L${(a.x + ux * s + nx * o).toFixed(1)} ${(a.y + uy * s + ny * o).toFixed(1)}`;
  }
  return d + `L${b.x} ${b.y}`;
}

function DibujoFlecha({ f, h, marca, seleccionada, opacidad = 1 }: { f: Flecha; h: number; marca: string; seleccionada?: boolean; opacidad?: number }) {
  const a = { x: (f.desde.x / 100) * VW, y: (f.desde.y / 100) * h };
  const b = { x: (f.hasta.x / 100) * VW, y: (f.hasta.y / 100) * h };
  const d = f.tipo === "conduccion" ? caminoOndulado(a, b) : `M${a.x} ${a.y}L${b.x} ${b.y}`;
  return (
    <g opacity={opacidad}>
      {seleccionada && <path d={`M${a.x} ${a.y}L${b.x} ${b.y}`} stroke="var(--amarilla)" strokeWidth="18" strokeLinecap="round" opacity=".55" fill="none" />}
      <path d={d} fill="none" stroke="#fff" strokeWidth={f.tipo === "pase" ? 5 : 4.5} strokeDasharray={f.tipo === "movimiento" ? "14 10" : undefined}
        strokeLinecap="round" strokeLinejoin="round" markerEnd={`url(#${marca})`} />
    </g>
  );
}

function DibujoPieza({ p, color }: { p: Pieza; color: string }) {
  if (p.tipo === "balon") return (
    <g><circle r="14" fill="#fff" stroke="#111" strokeWidth="2.5" /><path d="m0 -6 5.7 4.1-2.2 6.7h-7l-2.2-6.7z" fill="#111" /></g>
  );
  if (p.tipo === "cono") return (
    <g><path d="M0 -22 18 13H-18Z" fill="#FF9A3C" stroke="#7a3400" strokeWidth="2" strokeLinejoin="round" /><path d="M-9 -3H9" stroke="#fff" strokeWidth="4" /></g>
  );
  if (p.tipo === "porteria") return (
    <g transform={`rotate(${p.giro ?? 0})`}>
      <path d="M-44 -14H44" stroke="rgba(255,255,255,.35)" strokeWidth="10" />
      <path d="M-44 16V-14H44V16" fill="none" stroke="#fff" strokeWidth="6" strokeLinejoin="round" />
    </g>
  );
  const et = p.etiqueta ?? "";
  const corta = et.length <= 2;
  return (
    <g>
      <circle r="30" fill={color} stroke="#fff" strokeWidth="4" />
      <text y="12" textAnchor="middle" fontFamily="Big Shoulders Display, Arial Narrow, sans-serif" fontWeight="800" fontSize="34" fill={colorTexto(color)}>
        {corta ? et : et.slice(0, 1).toUpperCase()}
      </text>
      {!corta && (
        <g transform="translate(0 50)">
          <rect x={-Math.max(30, et.length * 7)} y="-14" width={Math.max(60, et.length * 14)} height="26" rx="13" fill="rgba(0,0,0,.6)" />
          <text y="6" textAnchor="middle" fontFamily="Barlow, sans-serif" fontWeight="700" fontSize="20" fill="#fff">{et}</text>
        </g>
      )}
    </g>
  );
}

/** Vista fija (sin controles) del primer paso: para las tarjetas de la biblioteca. */
export function PizarraMini({ pizarra, colorEquipo, colorRival }: { pizarra: TPizarra; colorEquipo: string; colorRival: string }) {
  const marca = "m" + useId().replace(/:/g, "");
  const h = alto(pizarra);
  const pos = posicionesAnimadas(pizarra, 0, 0);
  return (
    <svg className="pizarra-mini" viewBox={`0 0 ${VW} ${h}`} aria-hidden="true">
      <defs><marker id={marca} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" fill="#fff" /></marker></defs>
      <DibujoCampo campo={pizarra.campo} />
      {pizarra.pasos[0]?.flechas.map((f) => <DibujoFlecha key={f.id} f={f} h={h} marca={marca} />)}
      {pizarra.piezas.map((p) => pos[p.id] && (
        <g key={p.id} transform={`translate(${(pos[p.id].x / 100) * VW} ${(pos[p.id].y / 100) * h})`}>
          <DibujoPieza p={p} color={p.tipo === "rival" ? colorRival : colorEquipo} />
        </g>
      ))}
    </svg>
  );
}

/* ---------- Pizarra completa ---------- */
const capturar = (e: { currentTarget: EventTarget; pointerId: number }) => {
  try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch { /* algunos navegadores no lo permiten */ }
};
type Seleccion = { tipo: "pieza" | "flecha"; id: string } | null;
type Arrastre =
  | { tipo: "pieza"; id: string; dx: number; dy: number }
  | { tipo: "nueva-flecha"; desde: Punto; hasta: Punto }
  | { tipo: "extremo"; id: string; extremo: "desde" | "hasta" }
  | null;

export default function Pizarra({ pizarra, cambiar, colorEquipo, colorRival }: {
  pizarra: TPizarra; cambiar?: (p: TPizarra) => void; colorEquipo: string; colorRival: string;
}) {
  const editable = !!cambiar;
  const [paso, setPaso] = useState(0);
  const [t, setT] = useState(0);
  const [reproduciendo, setReproduciendo] = useState<"todo" | "uno" | null>(null);
  const [seleccion, setSeleccion] = useState<Seleccion>(null);
  const [herramienta, setHerramienta] = useState<TipoFlecha | null>(null);
  const [arrastre, setArrastre] = useState<Arrastre>(null);
  const svg = useRef<SVGSVGElement>(null);
  const marca = "m" + useId().replace(/:/g, "");
  const h = alto(pizarra);
  const total = pizarra.pasos.length;
  const pasoActual = Math.min(paso, total - 1);

  useEffect(() => { if (paso > total - 1) setPaso(total - 1); }, [paso, total]);

  /* Animación (con referencias para no depender del orden de los renderizados) */
  const tRef = useRef(0);
  const pasoRef = useRef(0);
  useEffect(() => { tRef.current = t; pasoRef.current = pasoActual; });
  useEffect(() => {
    if (!reproduciendo) return;
    let ultimo = performance.now();
    let id = 0;
    const tic = (ahora: number) => {
      const nt = tRef.current + (ahora - ultimo) / DURACION;
      ultimo = ahora;
      if (nt >= 1) {
        const sig = Math.min(pasoRef.current + 1, total - 1);
        pasoRef.current = sig; tRef.current = 0;
        setPaso(sig); setT(0);
        if (reproduciendo === "uno" || sig >= total - 1) { setReproduciendo(null); return; }
      } else { tRef.current = nt; setT(nt); }
      id = requestAnimationFrame(tic);
    };
    id = requestAnimationFrame(tic);
    return () => cancelAnimationFrame(id);
  }, [reproduciendo, total]);

  function reproducir() {
    if (reproduciendo) return setReproduciendo(null);
    if (total < 2) return;
    setSeleccion(null);
    if (pasoActual >= total - 1) { setPaso(0); setT(0); }
    setReproduciendo("todo");
  }
  function siguiente() {
    if (reproduciendo || pasoActual >= total - 1) return;
    if (t > 0) setT(0);
    setReproduciendo("uno");
  }
  function anterior() {
    setReproduciendo(null);
    setT(0);
    setPaso(Math.max(0, pasoActual - (t > 0 ? 0 : 1)));
  }

  const posiciones = useMemo(() => posicionesAnimadas(pizarra, pasoActual, reproduciendo || t > 0 ? t : 0), [pizarra, pasoActual, t, reproduciendo]);
  const flechas = pizarra.pasos[pasoActual]?.flechas ?? [];
  const opacidadFlechas = t < 0.65 ? 1 : Math.max(0, (1 - t) / 0.35);

  /* Edición */
  const enPunto = (e: { clientX: number; clientY: number }): Punto => {
    const s = svg.current!;
    const pt = s.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(s.getScreenCTM()!.inverse());
    return { x: Math.min(100, Math.max(0, (q.x / VW) * 100)), y: Math.min(100, Math.max(0, (q.y / h) * 100)) };
  };
  const quieto = editable && !reproduciendo && t === 0;

  function moverPieza(id: string, p: Punto) {
    const pasos = pizarra.pasos.map((ps, i) => (i === pasoActual ? { ...ps, posiciones: { ...ps.posiciones, [id]: p } } : ps));
    cambiar!({ ...pizarra, pasos });
  }
  function cambiarFlechas(fn: (l: Flecha[]) => Flecha[]) {
    const pasos = pizarra.pasos.map((ps, i) => (i === pasoActual ? { ...ps, flechas: fn(ps.flechas) } : ps));
    cambiar!({ ...pizarra, pasos });
  }

  function abajoPieza(e: PE<SVGGElement>, id: string) {
    if (!quieto || herramienta) return;
    e.stopPropagation();
    capturar(e);
    const p = enPunto(e), actual = posiciones[id];
    setSeleccion({ tipo: "pieza", id });
    setArrastre({ tipo: "pieza", id, dx: actual.x - p.x, dy: actual.y - p.y });
  }
  function abajoFondo(e: PE<SVGElement>) {
    if (!quieto) return;
    if (herramienta) {
      capturar(e);
      const p = enPunto(e);
      setArrastre({ tipo: "nueva-flecha", desde: p, hasta: p });
    } else setSeleccion(null);
  }
  function mover(e: PE<SVGSVGElement>) {
    if (!arrastre) return;
    const p = enPunto(e);
    if (arrastre.tipo === "pieza") moverPieza(arrastre.id, { x: Math.round((p.x + arrastre.dx) * 10) / 10, y: Math.round((p.y + arrastre.dy) * 10) / 10 });
    else if (arrastre.tipo === "nueva-flecha") setArrastre({ ...arrastre, hasta: p });
    else cambiarFlechas((l) => l.map((f) => (f.id === arrastre.id ? { ...f, [arrastre.extremo]: p } : f)));
  }
  function arriba() {
    if (arrastre?.tipo === "nueva-flecha" && herramienta) {
      const { desde, hasta } = arrastre;
      if (Math.hypot(((hasta.x - desde.x) / 100) * VW, ((hasta.y - desde.y) / 100) * h) > 28) {
        const nueva: Flecha = { id: crypto.randomUUID(), tipo: herramienta, desde, hasta };
        cambiarFlechas((l) => [...l, nueva]);
        setSeleccion({ tipo: "flecha", id: nueva.id });
      }
    }
    setArrastre(null);
  }

  function agregar(tipo: TipoPieza) {
    const id = crypto.randomUUID();
    const pieza: Pieza = { id, tipo, etiqueta: tipo === "jugador" || tipo === "rival" ? siguienteEtiqueta(pizarra, tipo) : undefined };
    const n = pizarra.piezas.filter((x) => x.tipo === tipo).length;
    const base = { jugador: { x: 30, y: 62 }, rival: { x: 70, y: 38 }, balon: { x: 50, y: 52 }, cono: { x: 20, y: 20 }, porteria: { x: 50, y: 12 } }[tipo];
    const pos = { x: Math.min(92, base.x + (n % 5) * 8), y: Math.min(92, base.y + Math.floor(n / 5) * 9) };
    const pasos = pizarra.pasos.map((ps, i) => (i === pasoActual ? { ...ps, posiciones: { ...ps.posiciones, [id]: pos } } : ps));
    cambiar!({ ...pizarra, piezas: [...pizarra.piezas, pieza], pasos });
    setSeleccion({ tipo: "pieza", id });
    setHerramienta(null);
  }
  function borrarSeleccion() {
    if (!seleccion) return;
    if (seleccion.tipo === "flecha") cambiarFlechas((l) => l.filter((f) => f.id !== seleccion.id));
    else {
      const pasos = pizarra.pasos.map((ps) => { const pos = { ...ps.posiciones }; delete pos[seleccion.id]; return { ...ps, posiciones: pos }; });
      cambiar!({ ...pizarra, piezas: pizarra.piezas.filter((p) => p.id !== seleccion.id), pasos });
    }
    setSeleccion(null);
  }
  function anadirPaso() {
    const copia = posicionesAnimadas(pizarra, pasoActual, 0);
    const pasos = [...pizarra.pasos];
    pasos.splice(pasoActual + 1, 0, { posiciones: copia, flechas: [] });
    cambiar!({ ...pizarra, pasos });
    setPaso(pasoActual + 1); setT(0); setSeleccion(null);
  }
  function borrarPaso() {
    if (total <= 1) return;
    // El paso siguiente hereda las posiciones completas para no perder nada
    const pasos = [...pizarra.pasos];
    if (pasoActual + 1 < total) pasos[pasoActual + 1] = { ...pasos[pasoActual + 1], posiciones: posicionesAnimadas(pizarra, pasoActual + 1, 0) };
    pasos.splice(pasoActual, 1);
    cambiar!({ ...pizarra, pasos });
    setPaso(Math.max(0, pasoActual - 1)); setT(0); setSeleccion(null);
  }
  function cambiarCampo(c: "completo" | "medio") {
    if (c === pizarra.campo) return;
    // Mantiene el mismo sitio real: medio campo = mitad de arriba del campo completo
    const f = c === "completo" ? (y: number) => y * (545 / 1050) : (y: number) => Math.min(100, y * (1050 / 545));
    const conv = (p: Punto) => ({ x: p.x, y: Math.round(f(p.y) * 10) / 10 });
    cambiar!({
      ...pizarra, campo: c,
      pasos: pizarra.pasos.map((ps) => ({
        posiciones: Object.fromEntries(Object.entries(ps.posiciones).map(([k, v]) => [k, conv(v)])),
        flechas: ps.flechas.map((fl) => ({ ...fl, desde: conv(fl.desde), hasta: conv(fl.hasta) }))
      }))
    });
  }

  const piezaSel = seleccion?.tipo === "pieza" ? pizarra.piezas.find((p) => p.id === seleccion.id) : undefined;
  const flechaSel = seleccion?.tipo === "flecha" ? flechas.find((f) => f.id === seleccion.id) : undefined;
  const cambiarPieza = (c: Partial<Pieza>) => piezaSel && cambiar!({ ...pizarra, piezas: pizarra.piezas.map((p) => (p.id === piezaSel.id ? { ...p, ...c } : p)) });

  return (
    <div className={"pizarra" + (editable ? " pizarra-editable" : "")}>
      {editable && (
        <div className="pizarra-campo-tipo" role="radiogroup" aria-label="Tamaño del campo">
          {(["medio", "completo"] as const).map((c) => (
            <button key={c} type="button" role="radio" aria-checked={pizarra.campo === c} onClick={() => cambiarCampo(c)}>{c === "medio" ? "Medio campo" : "Campo completo"}</button>
          ))}
        </div>
      )}

      <svg ref={svg} className={"pizarra-svg" + (herramienta ? " modo-flecha" : "")} viewBox={`0 0 ${VW} ${h}`} role="img"
        style={{ width: `min(100%, calc(60vh * ${(VW / h).toFixed(3)}))` }}
        aria-label={`Pizarra del ejercicio, paso ${pasoActual + 1} de ${total}`}
        onPointerMove={mover} onPointerUp={arriba} onPointerCancel={() => setArrastre(null)}>
        <defs>
          <marker id={marca} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" fill="#fff" /></marker>
        </defs>
        <g onPointerDown={abajoFondo}><DibujoCampo campo={pizarra.campo} /></g>

        {flechas.map((f) => (
          <g key={f.id} onPointerDown={(e) => { if (!quieto || herramienta) return; e.stopPropagation(); setSeleccion({ tipo: "flecha", id: f.id }); }} className={quieto ? "tocable" : ""}>
            <path d={`M${(f.desde.x / 100) * VW} ${(f.desde.y / 100) * h}L${(f.hasta.x / 100) * VW} ${(f.hasta.y / 100) * h}`} stroke="transparent" strokeWidth="30" />
            <DibujoFlecha f={f} h={h} marca={marca} seleccionada={flechaSel?.id === f.id} opacidad={opacidadFlechas} />
          </g>
        ))}
        {arrastre?.tipo === "nueva-flecha" && herramienta && <DibujoFlecha f={{ id: "nueva", tipo: herramienta, desde: arrastre.desde, hasta: arrastre.hasta }} h={h} marca={marca} opacidad={0.8} />}

        {pizarra.piezas.filter((p) => p.tipo === "porteria" || p.tipo === "cono").concat(pizarra.piezas.filter((p) => p.tipo !== "porteria" && p.tipo !== "cono")).map((p) => {
          const q = posiciones[p.id];
          if (!q) return null;
          return (
            <g key={p.id} transform={`translate(${(q.x / 100) * VW} ${(q.y / 100) * h})`} onPointerDown={(e) => abajoPieza(e, p.id)} className={quieto && !herramienta ? "tocable" : ""}>
              <circle r="46" fill="transparent" />
              {seleccion?.id === p.id && <circle r="44" fill="none" stroke="var(--amarilla)" strokeWidth="5" strokeDasharray="10 7" />}
              <DibujoPieza p={p} color={p.tipo === "rival" ? colorRival : colorEquipo} />
            </g>
          );
        })}

        {flechaSel && quieto && (["desde", "hasta"] as const).map((ex) => (
          <circle key={ex} cx={(flechaSel[ex].x / 100) * VW} cy={(flechaSel[ex].y / 100) * h} r="20" fill="var(--amarilla)" stroke="#000" strokeWidth="3" className="tocable"
            onPointerDown={(e) => { e.stopPropagation(); capturar(e); setArrastre({ tipo: "extremo", id: flechaSel.id, extremo: ex }); }} />
        ))}
      </svg>

      <div className="pizarra-reproductor">
        <button className="btn btn-icono" type="button" onClick={anterior} disabled={pasoActual === 0 && t === 0} aria-label="Paso anterior">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L9 12z" /></svg>
        </button>
        <button className="btn btn-peto boton-reproducir" type="button" onClick={reproducir} disabled={total < 2} aria-label={reproduciendo ? "Pausar" : "Reproducir"}>
          {reproduciendo
            ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
            : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15L19.5 12z" /></svg>}
          {reproduciendo ? "Pausa" : "Reproducir"}
        </button>
        <button className="btn btn-icono" type="button" onClick={siguiente} disabled={pasoActual >= total - 1 || !!reproduciendo} aria-label="Paso siguiente">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 5h2v14h-2zM4 5v14l11-7z" /></svg>
        </button>
        <span className="paso-texto" aria-live="polite">Paso {pasoActual + 1} de {total}</span>
      </div>

      {editable && (
        <>
          <div className="pizarra-pasos" role="tablist" aria-label="Pasos">
            {pizarra.pasos.map((_, i) => (
              <button key={i} type="button" role="tab" aria-selected={i === pasoActual} onClick={() => { setReproduciendo(null); setT(0); setPaso(i); setSeleccion(null); }}>{i + 1}</button>
            ))}
            <button type="button" className="anadir-paso" onClick={anadirPaso}>+ Paso {total + 1}</button>
            {total > 1 && <button type="button" className="borrar-paso" onClick={borrarPaso} aria-label={`Borrar el paso ${pasoActual + 1}`}><IcoPapelera /></button>}
          </div>

          {seleccion && (piezaSel || flechaSel) ? (
            <div className="pizarra-seleccion">
              {piezaSel && (piezaSel.tipo === "jugador" || piezaSel.tipo === "rival") && (
                <label className="campo seleccion-etiqueta">
                  <span>Número o nombre</span>
                  <input className="entrada" value={piezaSel.etiqueta ?? ""} maxLength={12} onChange={(e) => cambiarPieza({ etiqueta: e.target.value })} />
                </label>
              )}
              {piezaSel?.tipo === "porteria" && <button className="btn btn-gris" type="button" onClick={() => cambiarPieza({ giro: ((piezaSel.giro ?? 0) + 90) % 360 })}>Girar portería</button>}
              {flechaSel && (
                <div className="opciones" style={{ gridTemplateColumns: "repeat(3, 1fr)", flex: 1 }}>
                  {FLECHAS.map((f) => (
                    <button key={f.valor} type="button" role="radio" aria-checked={flechaSel.tipo === f.valor} onClick={() => cambiarFlechas((l) => l.map((x) => (x.id === flechaSel.id ? { ...x, tipo: f.valor } : x)))}>{f.texto}</button>
                  ))}
                </div>
              )}
              <button className="btn btn-gris" type="button" onClick={borrarSeleccion}><IcoPapelera /> Borrar</button>
              <button className="btn btn-principal" type="button" onClick={() => setSeleccion(null)}>Listo</button>
            </div>
          ) : (
            <div className="pizarra-herramientas">
              <span className="etiqueta">Añadir al campo</span>
              <div className="herramientas-fila">
                <button type="button" onClick={() => agregar("jugador")}><span className="muestra-pieza" style={{ background: colorEquipo }} />Jugador</button>
                <button type="button" onClick={() => agregar("rival")}><span className="muestra-pieza" style={{ background: colorRival }} />Rival</button>
                <button type="button" onClick={() => agregar("balon")}><span className="muestra-pieza muestra-balon" />Balón</button>
                <button type="button" onClick={() => agregar("cono")}><span className="muestra-cono" />Cono</button>
                <button type="button" onClick={() => agregar("porteria")}><span className="muestra-porteria" />Portería</button>
              </div>
              <span className="etiqueta">Dibujar flecha {herramienta && "· arrastra sobre el campo"}</span>
              <div className="herramientas-fila">
                {FLECHAS.map((f) => (
                  <button key={f.valor} type="button" aria-pressed={herramienta === f.valor} onClick={() => setHerramienta(herramienta === f.valor ? null : f.valor)}>
                    <svg viewBox="0 0 44 16" className="muestra-flecha" aria-hidden="true">
                      <path d={f.valor === "conduccion" ? "M2 8q4-6 8 0t8 0 8 0 6 0" : "M2 8h30"} fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray={f.valor === "movimiento" ? "5 4" : undefined} />
                      <path d="M32 3l9 5-9 5z" fill="currentColor" />
                    </svg>
                    {f.texto}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
