// Pizarra 2D: se ve, se reproduce por pasos y (si se pasa "cambiar") se edita.
// Edición: fichas (genéricas, de la plantilla o por formación), dibujo libre (lápiz, líneas, flechas,
// círculos, zonas y texto) con color y grosor, y deshacer / rehacer / limpiar.
import { useEffect, useId, useMemo, useRef, useState, type PointerEvent as PE, type ReactNode } from "react";
import {
  ACCESORIOS, COLORES_ACCESORIO, COLORES_DIBUJO, ESTILOS_FLECHA, FLECHAS, GROSORES, completarPasos, duracionPaso, esAccesorio, posicionEn, posicionesAnimadas, siguienteEtiqueta,
  type Dibujo, type EstiloFlecha, type Flecha, type Pieza, type Pizarra as TPizarra, type TipoDibujo, type TipoPieza
} from "../datos/pizarra";
import { PUESTOS, type Jugador, type Punto, type Sistema } from "../datos/modelo";
import { colorTexto } from "./Campo";
import { IcoPapelera } from "./Iconos";
import { Hoja, useUi } from "./ui";
import HojaExportar from "./HojaExportar";
import "./pizarra.css";

const VW = 680;
const alto = (p: TPizarra) => (p.campo === "completo" ? 1050 : 545);

/* ---------- Campo ---------- */
export function DibujoCampo({ campo }: { campo: "completo" | "medio" }) {
  const h = campo === "completo" ? 1050 : 545;
  const franjas = campo === "completo" ? 10 : 5;
  const blanco = "rgba(255,255,255,.9)";
  return (
    <g>
      {Array.from({ length: franjas }, (_, i) => (
        <rect key={i} x="0" y={(i * h) / franjas} width={VW} height={h / franjas} fill={i % 2 ? "var(--campo-b)" : "var(--campo-a)"} />
      ))}
      <g fill="none" stroke={blanco} strokeWidth="4">
        {campo === "completo" ? (
          <>
            <rect x="30" y="30" width="620" height="990" />
            <path d="M30 525h620" />
            <circle cx="340" cy="525" r="80" />
            <rect x="140" y="870" width="400" height="150" /><rect x="240" y="965" width="200" height="55" />
            <path d="M270 870a80 80 0 0 1 140 0" />
            <rect x="290" y="1020" width="100" height="16" />
            {/* Córneres de abajo */}
            <path d="M30 1004a16 16 0 0 1 16 16M650 1004a16 16 0 0 0 -16 16" />
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
        {/* Córneres de arriba */}
        <path d="M30 46a16 16 0 0 0 16 -16M650 46a16 16 0 0 1 -16 -16" />
      </g>
      <g fill={blanco}>
        <circle cx="340" cy="525" r="6" />
        <circle cx="340" cy="140" r="5" />
        {campo === "completo" && <circle cx="340" cy="910" r="5" />}
      </g>
    </g>
  );
}

/* ---------- Geometría de los dibujos ---------- */
type XY = { x: number; y: number };
const aPx = (p: Punto, h: number): XY => ({ x: (p.x / 100) * VW, y: (p.y / 100) * h });

/** Puntos a lo largo de una recta o de una curva (cuadrática con punto de control). */
function muestras(a: XY, b: XY, c: XY | null, n = 32): XY[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    return c ? { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }
      : { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  });
}
const camino = (pts: XY[]) => pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("");

/** Línea ondulada (conducción) siguiendo un recorrido; los últimos 26 px van rectos para que se vea la punta. */
function ondular(pts: XY[]): XY[] {
  const total = pts.reduce((s, p, i) => (i ? s + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);
  if (total < 40) return pts;
  const ondas = Math.max(2, Math.round((total - 26) / 30));
  const r: XY[] = [];
  let recorrido = 0;
  pts.forEach((p, i) => {
    if (i) recorrido += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
    const q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)];
    const dx = q.x - o.x, dy = q.y - o.y, L = Math.hypot(dx, dy) || 1;
    const amp = recorrido < total - 26 ? Math.sin((recorrido / (total - 26)) * ondas * Math.PI * 2) * 8 : 0;
    r.push({ x: p.x - (dy / L) * amp, y: p.y + (dx / L) * amp });
  });
  return r;
}

function punta(fin: XY, antes: XY, tam: number) {
  const ang = Math.atan2(fin.y - antes.y, fin.x - antes.x);
  const p = (a: number, d: number) => `${(fin.x + Math.cos(a) * d).toFixed(1)},${(fin.y + Math.sin(a) * d).toFixed(1)}`;
  return `${p(ang, tam * 0.35)} ${p(ang + 2.6, tam)} ${p(ang - 2.6, tam)}`;
}

const tamTexto = (d: Dibujo) => 24 + d.grosor * 2.2;

/** Recuadro que ocupa un dibujo (para marcarlo cuando está elegido y poder tocarlo). */
function recuadro(d: Dibujo, h: number) {
  const pts = [...d.puntos, ...(d.curva ? [d.curva] : [])].map((p) => aPx(p, h));
  if (d.tipo === "texto") {
    const t = tamTexto(d), w = Math.max(2, (d.texto ?? "").length) * t * 0.56;
    return { x: pts[0].x - w / 2, y: pts[0].y - t * 0.85, w, h: t * 1.1 };
  }
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

export function DibujoLibre({ d, h, opacidad = 1 }: { d: Dibujo; h: number; opacidad?: number }) {
  const pts = d.puntos.map((p) => aPx(p, h));
  const comun = { stroke: d.color, strokeWidth: d.grosor, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  let forma: ReactNode = null;
  if (d.tipo === "lapiz") forma = <path d={camino(pts)} fill="none" {...comun} />;
  else if (d.tipo === "linea" || d.tipo === "flecha") {
    const [a, b] = [pts[0], pts[1] ?? pts[0]];
    let recorrido = muestras(a, b, d.curva ? aPx(d.curva, h) : null);
    const ondulada = d.tipo === "flecha" && d.estilo === "conduccion";
    if (ondulada) recorrido = ondular(recorrido);
    const discontinua = d.tipo === "flecha" ? d.estilo === "desmarque" : !!d.discontinua;
    const tam = 16 + d.grosor * 2;
    forma = (
      <>
        <path d={camino(recorrido)} fill="none" {...comun} strokeDasharray={discontinua ? `${d.grosor * 2.6} ${d.grosor * 2.2}` : undefined} />
        {d.tipo === "flecha" && <polygon points={punta(b, recorrido[recorrido.length - 4] ?? a, tam)} fill={d.color} />}
      </>
    );
  } else if (d.tipo === "circulo" || d.tipo === "zona") {
    const [a, b] = [pts[0], pts[1] ?? pts[0]];
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), alt = Math.abs(b.y - a.y);
    forma = d.tipo === "circulo"
      ? <ellipse cx={x + w / 2} cy={y + alt / 2} rx={w / 2} ry={alt / 2} fill={d.color} fillOpacity=".18" {...comun} />
      : <rect x={x} y={y} width={w} height={alt} rx="6" fill={d.color} fillOpacity=".3" {...comun} strokeDasharray={`${d.grosor * 2.4} ${d.grosor * 1.8}`} />;
  } else if (d.tipo === "texto") {
    forma = (
      <text x={pts[0].x} y={pts[0].y} textAnchor="middle" fontFamily="Barlow, sans-serif" fontWeight="800" fontSize={tamTexto(d)}
        fill={d.color} stroke="rgba(0,0,0,.55)" strokeWidth="5" paintOrder="stroke" strokeLinejoin="round">{d.texto}</text>
    );
  }
  return <g opacity={opacidad}>{forma}</g>;
}

/* ---------- Flechas tácticas de los ejercicios antiguos (se siguen viendo y editando) ---------- */
function DibujoFlecha({ f, h, marca, seleccionada, opacidad = 1 }: { f: Flecha; h: number; marca: string; seleccionada?: boolean; opacidad?: number }) {
  const a = aPx(f.desde, h), b = aPx(f.hasta, h);
  const d = f.tipo === "conduccion" ? camino(ondular(muestras(a, b, null))) : `M${a.x} ${a.y}L${b.x} ${b.y}`;
  return (
    <g opacity={opacidad}>
      {seleccionada && <path d={`M${a.x} ${a.y}L${b.x} ${b.y}`} stroke="var(--amarilla)" strokeWidth="18" strokeLinecap="round" opacity=".55" fill="none" />}
      <path d={d} fill="none" stroke="#fff" strokeWidth={f.tipo === "pase" ? 5 : 4.5} strokeDasharray={f.tipo === "movimiento" ? "14 10" : undefined}
        strokeLinecap="round" strokeLinejoin="round" markerEnd={`url(#${marca})`} />
    </g>
  );
}

/* ---------- Accesorios (vistos desde arriba) ---------- */
const colorDe = (p: Pieza) => p.color ?? ACCESORIOS.find((a) => a.tipo === p.tipo)?.color ?? "#FF6B1A";
function Maniqui({ c }: { c: string }) {
  return <g><path d="M-14 30 -18 -8Q-18 -18 -8 -18H8Q18 -18 18 -8L14 30Z" fill={c} stroke="#111" strokeWidth="2.5" /><circle cy="-28" r="9" fill={c} stroke="#111" strokeWidth="2.5" /></g>;
}
function FormaAccesorio({ p }: { p: Pieza }) {
  const c = colorDe(p);
  switch (p.tipo) {
    case "cono": return <g><path d="M0 -22 18 13H-18Z" fill="#FF9A3C" stroke="#7a3400" strokeWidth="2" strokeLinejoin="round" /><path d="M-9 -3H9" stroke="#fff" strokeWidth="4" /></g>;
    case "chino": return <g><circle r="15" fill={c} stroke="rgba(0,0,0,.45)" strokeWidth="2.5" /><circle r="5" fill="rgba(0,0,0,.35)" /></g>;
    case "pica": return (
      <g><circle r="10" fill="rgba(0,0,0,.25)" /><rect x="-4.5" y="-38" width="9" height="76" rx="4" fill={c} stroke="rgba(0,0,0,.5)" strokeWidth="2" />
        <path d="M-4.5 -18h9M-4.5 2h9M-4.5 22h9" stroke="#fff" strokeWidth="5" /></g>
    );
    case "valla": return <g><path d="M-36 10V-6M36 10V-6" stroke="#333" strokeWidth="5" strokeLinecap="round" /><rect x="-40" y="-10" width="80" height="9" rx="4" fill={c} stroke="rgba(0,0,0,.45)" strokeWidth="2" /></g>;
    case "aro": return <circle r="24" fill="none" stroke={c} strokeWidth="7" />;
    case "escalera": return (
      <g fill="none" stroke={c} strokeWidth="5" strokeLinecap="round">
        <path d="M-20 -84V84M20 -84V84" />
        {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M-20 ${-70 + i * 20}H20`} />)}
      </g>
    );
    case "miniporteria": return (
      <g><path d="M-26 -9H26" stroke="rgba(255,255,255,.35)" strokeWidth="7" /><path d="M-26 10V-9H26V10" fill="none" stroke="#fff" strokeWidth="5" strokeLinejoin="round" /></g>
    );
    case "porteria": return (
      <g><path d="M-44 -14H44" stroke="rgba(255,255,255,.35)" strokeWidth="10" /><path d="M-44 16V-14H44V16" fill="none" stroke="#fff" strokeWidth="6" strokeLinejoin="round" /></g>
    );
    case "maniqui": return <Maniqui c={c} />;
    case "barrera": return <g>{[-54, -18, 18, 54].map((x) => <g key={x} transform={`translate(${x} 0) scale(.85)`}><Maniqui c={c} /></g>)}</g>;
    case "peto": return <path d="M-15 -24-7-27Q0-19 7-27L15-24 23-6 14-2V25H-14V-2L-23-6Z" fill={c} stroke="rgba(0,0,0,.55)" strokeWidth="2.5" strokeLinejoin="round" />;
    default: return null;
  }
}
/** Lo que mide un accesorio, para poder tocarlo bien con el dedo y marcarlo. */
const radioToque = (p: Pieza) => {
  const e = p.escala ?? 1;
  const base = p.tipo === "escalera" ? 86 : p.tipo === "barrera" ? 74 : p.tipo === "porteria" ? 50 : p.tipo === "valla" ? 44 : 40;
  return Math.max(36, base * e);
};

/* ---------- Fichas ---------- */
function DibujoPieza({ p, color }: { p: Pieza; color: string }) {
  if (esAccesorio(p.tipo)) return <g transform={`rotate(${p.giro ?? 0}) scale(${p.escala ?? 1})`}><FormaAccesorio p={p} /></g>;
  if (p.tipo === "balon") return (
    <g><circle r="14" fill="#fff" stroke="#111" strokeWidth="2.5" /><path d="m0 -6 5.7 4.1-2.2 6.7h-7l-2.2-6.7z" fill="#111" /></g>
  );
  const et = p.etiqueta ?? "";
  // Con nombre (ficha de la plantilla): dorsal dentro y nombre debajo. Sin nombre: etiqueta corta dentro o inicial + etiqueta debajo.
  const dentro = p.nombre ? et || p.nombre.slice(0, 1).toUpperCase() : et.length <= 2 ? et : et.slice(0, 1).toUpperCase();
  const debajo = p.nombre ?? (et.length > 2 ? et : "");
  return (
    <g>
      <circle r="24" fill={color} stroke="#fff" strokeWidth="3.5" />
      <text y="10" textAnchor="middle" fontFamily="Big Shoulders Display, Arial Narrow, sans-serif" fontWeight="800" fontSize="28" fill={colorTexto(color)}>{dentro}</text>
      {debajo && (
        <g transform="translate(0 40)">
          <rect x={-Math.max(24, debajo.length * 6)} y="-12" width={Math.max(48, debajo.length * 12)} height="22" rx="11" fill="rgba(0,0,0,.6)" />
          <text y="5" textAnchor="middle" fontFamily="Barlow, sans-serif" fontWeight="700" fontSize="17" fill="#fff">{debajo}</text>
        </g>
      )}
    </g>
  );
}

const ordenPiezas = (piezas: Pieza[]) => [...piezas.filter((p) => esAccesorio(p.tipo)), ...piezas.filter((p) => !esAccesorio(p.tipo))];

/** Vista fija (sin controles) del primer paso: para las tarjetas y los PDF. */
export function PizarraMini({ pizarra, colorEquipo, colorRival }: { pizarra: TPizarra; colorEquipo: string; colorRival: string }) {
  return <PizarraFotograma pizarra={pizarra} colorEquipo={colorEquipo} colorRival={colorRival} />;
}

/** Estelas: el recorrido de cada jugador y del balón por todos los pasos. */
function Estelas({ pizarra, h, colorEquipo, colorRival }: { pizarra: TPizarra; h: number; colorEquipo: string; colorRival: string }) {
  return (
    <>
      {pizarra.piezas.filter((p) => p.tipo === "jugador" || p.tipo === "rival" || p.tipo === "balon").map((p) => {
        const pts = pizarra.pasos.map((_, i) => posicionEn(pizarra, p.id, i)).filter((q): q is Punto => !!q).map((q) => aPx(q, h));
        if (pts.length < 2 || pts.every((q) => Math.hypot(q.x - pts[0].x, q.y - pts[0].y) < 2)) return null;
        const c = p.tipo === "balon" ? "#FFFFFF" : p.tipo === "rival" ? colorRival : colorEquipo;
        return (
          <g key={"estela" + p.id} pointerEvents="none" opacity=".7">
            <path d={camino(pts)} fill="none" stroke={c} strokeWidth="5" strokeDasharray="4 9" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((q, i) => <circle key={i} cx={q.x} cy={q.y} r="6" fill={c} stroke="rgba(0,0,0,.4)" strokeWidth="2" />)}
          </g>
        );
      })}
    </>
  );
}

/**
 * La pizarra en un momento concreto (paso y avance hacia el siguiente, de 0 a 1), sin controles.
 * Sirve para las miniaturas, los PDF, la imagen para compartir y cada fotograma del vídeo.
 */
export function PizarraFotograma({ pizarra, colorEquipo, colorRival, paso = 0, t = 0, estelas = false, sinNombres = false }: {
  pizarra: TPizarra; colorEquipo: string; colorRival: string; paso?: number; t?: number; estelas?: boolean; sinNombres?: boolean;
}) {
  const marca = "m" + useId().replace(/:/g, "");
  const h = alto(pizarra);
  const pos = posicionesAnimadas(pizarra, paso, t);
  const opacidad = t < 0.65 ? 1 : Math.max(0, (1 - t) / 0.35);
  return (
    <svg className="pizarra-mini" viewBox={`0 0 ${VW} ${h}`} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <defs><marker id={marca} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" fill="#fff" /></marker></defs>
      <DibujoCampo campo={pizarra.campo} />
      {(pizarra.pasos[paso]?.dibujos ?? []).map((d) => <DibujoLibre key={d.id} d={d} h={h} opacidad={opacidad} />)}
      {pizarra.pasos[paso]?.flechas.map((f) => <DibujoFlecha key={f.id} f={f} h={h} marca={marca} opacidad={opacidad} />)}
      {estelas && pizarra.pasos.length > 1 && <Estelas pizarra={pizarra} h={h} colorEquipo={colorEquipo} colorRival={colorRival} />}
      {ordenPiezas(pizarra.piezas).map((p) => pos[p.id] && (
        <g key={p.id} transform={`translate(${(pos[p.id].x / 100) * VW} ${(pos[p.id].y / 100) * h})`}>
          <DibujoPieza p={sinNombres && (p.tipo === "jugador" || p.tipo === "rival") ? { ...p, etiqueta: "", nombre: undefined } : p} color={p.tipo === "rival" ? colorRival : colorEquipo} />
        </g>
      ))}
    </svg>
  );
}

/* ---------- Iconos de las herramientas ---------- */
type Herramienta = "mover" | TipoDibujo;
const ICONOS: Record<Herramienta, ReactNode> = {
  mover: <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-1V4.5a1.5 1.5 0 0 1 3 0V10m0-.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-4.6-2.2L4 15.5a1.5 1.5 0 0 1 2.3-1.9L9 16" />,
  lapiz: <path d="M4 20l4-1L19 8a2.1 2.1 0 0 0-3-3L5 16zM14 7l3 3" />,
  linea: <path d="M5 19L19 5" />,
  flecha: <><path d="M5 19C8 9 12 7 18 6" /><path d="M14 4l4 2-2 4" /></>,
  circulo: <circle cx="12" cy="12" r="7.5" />,
  zona: <rect x="4.5" y="6.5" width="15" height="11" rx="1.5" strokeDasharray="3 2.5" />,
  texto: <path d="M6 6h12M12 6v13M9 19h6" />
};
const NOMBRES: Record<Herramienta, string> = { mover: "Mover", lapiz: "Lápiz", linea: "Línea", flecha: "Flecha", circulo: "Círculo", zona: "Zona", texto: "Texto" };
const Icono = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

/* ---------- Pizarra completa ---------- */
const capturar = (e: { currentTarget: EventTarget; pointerId: number }) => {
  try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch { /* algunos navegadores no lo permiten */ }
};
type Seleccion = { tipo: "pieza" | "flecha" | "dibujo"; id: string } | null;
type Arrastre =
  | { tipo: "pieza"; id: string; dx: number; dy: number; marcado: boolean }
  | { tipo: "extremo"; id: string; extremo: "desde" | "hasta"; marcado: boolean }
  | { tipo: "dibujando"; id: string }
  | { tipo: "dibujo"; id: string; inicio: Punto; original: Dibujo; marcado: boolean }
  | { tipo: "punto"; id: string; indice: number | "curva"; marcado: boolean };

const redondo = (n: number) => Math.round(n * 10) / 10;

export default function Pizarra({ pizarra, cambiar, colorEquipo, colorRival, animada = true, jugadores, sistemas, altoMax = "60vh", titulo = "" }: {
  pizarra: TPizarra; cambiar?: (p: TPizarra) => void; colorEquipo: string; colorRival: string;
  /** Con pasos y reproductor (ejercicios, balón parado). Sin animar: pizarra de partido. */
  animada?: boolean;
  /** Plantilla del equipo, para poner fichas con nombre y dorsal. */
  jugadores?: Jugador[];
  /** Sistemas de juego, para colocar una formación. */
  sistemas?: Sistema[];
  altoMax?: string;
  /** Nombre que sale en el vídeo o la imagen al exportar. */
  titulo?: string;
}) {
  const editable = !!cambiar;
  const { confirmar } = useUi();
  const [paso, setPaso] = useState(0);
  const [t, setT] = useState(0);
  const [reproduciendo, setReproduciendo] = useState<"todo" | "uno" | null>(null);
  const [seleccion, setSeleccion] = useState<Seleccion>(null);
  const [herramienta, setHerramienta] = useState<Herramienta>("mover");
  const [color, setColor] = useState("#FFFFFF");
  const [grosor, setGrosor] = useState(7);
  const [estiloFlecha, setEstiloFlecha] = useState<EstiloFlecha>("pase");
  const [discontinua, setDiscontinua] = useState(false);
  const [hoja, setHoja] = useState<"plantilla" | "formacion" | null>(null);
  const [velocidad, setVelocidad] = useState(1);
  const [estelas, setEstelas] = useState(false);
  const [exportar, setExportar] = useState<"video" | "imagen" | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const marca = "m" + useId().replace(/:/g, "");
  const h = alto(pizarra);
  const total = pizarra.pasos.length;
  const pasoActual = animada ? Math.min(paso, total - 1) : 0;

  // La pizarra más reciente, para no perder trazos rápidos del lápiz entre un dibujado y otro
  const actual = useRef(pizarra);
  actual.current = pizarra;
  const aplicar = (n: TPizarra) => { actual.current = n; cambiar!(n); };

  /* Deshacer / rehacer */
  const historial = useRef<{ atras: TPizarra[]; adelante: TPizarra[] }>({ atras: [], adelante: [] });
  const [, setVersion] = useState(0);
  // Texto recién puesto: escribir en él no cuenta como otro paso de «deshacer»
  const textoNuevo = useRef<string | null>(null);
  const marcar = () => {
    const hst = historial.current;
    if (hst.atras[hst.atras.length - 1] === actual.current) return; // nada ha cambiado desde el último paso
    hst.atras.push(actual.current);
    if (hst.atras.length > 60) hst.atras.shift();
    hst.adelante = [];
    setVersion((v) => v + 1);
  };
  const deshacer = () => {
    const hst = historial.current, prev = hst.atras.pop();
    if (!prev) return;
    hst.adelante.push(actual.current); aplicar(prev); setSeleccion(null); setVersion((v) => v + 1);
  };
  const rehacer = () => {
    const hst = historial.current, sig = hst.adelante.pop();
    if (!sig) return;
    hst.atras.push(actual.current); aplicar(sig); setSeleccion(null); setVersion((v) => v + 1);
  };
  useEffect(() => {
    if (!editable) return;
    const tecla = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement)?.closest?.("input, textarea")) return;
      if (e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) rehacer(); else deshacer(); }
      if (e.key.toLowerCase() === "y") { e.preventDefault(); rehacer(); }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

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
      const dur = (duracionPaso(actual.current, pasoRef.current + 1) * 1000) / velocidad;
      const nt = tRef.current + (ahora - ultimo) / dur;
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
  }, [reproduciendo, total, velocidad]);

  /* Barra de tiempo: toda la jugada, de principio a fin */
  const duraciones = pizarra.pasos.map((_, i) => (i === 0 ? 0 : duracionPaso(pizarra, i)));
  const tiempoTotal = Math.round(duraciones.reduce((a, b) => a + b, 0) * 100) / 100;
  const tiempoActual = duraciones.slice(0, pasoActual + 1).reduce((a, b) => a + b, 0) + (pasoActual + 1 < total ? t * duraciones[pasoActual + 1] : 0);
  function irATiempo(seg: number) {
    setReproduciendo(null); setSeleccion(null);
    let acum = 0;
    for (let i = 1; i < total; i++) {
      if (seg <= acum + duraciones[i]) { setPaso(i - 1); setT(Math.max(0, Math.min(1, (seg - acum) / duraciones[i]))); return; }
      acum += duraciones[i];
    }
    setPaso(total - 1); setT(0);
  }

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
  const dibujos = pizarra.pasos[pasoActual]?.dibujos ?? [];
  const opacidadFlechas = t < 0.65 ? 1 : Math.max(0, (1 - t) / 0.35);

  /* Edición */
  const enPunto = (e: { clientX: number; clientY: number }): Punto => {
    const s = svg.current!;
    const pt = s.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(s.getScreenCTM()!.inverse());
    return { x: redondo(Math.min(100, Math.max(0, (q.x / VW) * 100))), y: redondo(Math.min(100, Math.max(0, (q.y / h) * 100))) };
  };
  const quieto = editable && !reproduciendo && t === 0;
  const moviendo = herramienta === "mover";
  const arrastre = useRef<Arrastre | null>(null);

  const conPaso = (fn: (ps: TPizarra["pasos"][number]) => TPizarra["pasos"][number]) => {
    const pz = actual.current;
    return { ...pz, pasos: pz.pasos.map((ps, i) => (i === pasoActual ? fn(ps) : ps)) };
  };
  const moverPieza = (id: string, p: Punto) => aplicar(conPaso((ps) => ({ ...ps, posiciones: { ...ps.posiciones, [id]: p } })));
  const cambiarFlechas = (fn: (l: Flecha[]) => Flecha[]) => aplicar(conPaso((ps) => ({ ...ps, flechas: fn(ps.flechas) })));
  const cambiarDibujos = (fn: (l: Dibujo[]) => Dibujo[]) => aplicar(conPaso((ps) => ({ ...ps, dibujos: fn(ps.dibujos ?? []) })));
  const cambiarDibujo = (id: string, c: Partial<Dibujo>) => cambiarDibujos((l) => l.map((d) => (d.id === id ? { ...d, ...c } : d)));

  function abajoPieza(e: PE<SVGGElement>, id: string) {
    if (!quieto || !moviendo) return;
    e.stopPropagation();
    capturar(e);
    const p = enPunto(e), q = posiciones[id];
    setSeleccion({ tipo: "pieza", id });
    arrastre.current = { tipo: "pieza", id, dx: q.x - p.x, dy: q.y - p.y, marcado: false };
  }
  function abajoDibujo(e: PE<SVGGElement>, d: Dibujo) {
    if (!quieto || !moviendo) return;
    e.stopPropagation();
    capturar(e);
    setSeleccion({ tipo: "dibujo", id: d.id });
    arrastre.current = { tipo: "dibujo", id: d.id, inicio: enPunto(e), original: d, marcado: false };
  }
  function abajoCampo(e: PE<SVGSVGElement>) {
    if (!quieto) return;
    if (moviendo) { setSeleccion(null); return; }
    capturar(e);
    const p = enPunto(e);
    marcar();
    const id = crypto.randomUUID();
    if (herramienta === "texto") {
      cambiarDibujos((l) => [...l, { id, tipo: "texto", puntos: [p], color, grosor, texto: "Texto" }]);
      textoNuevo.current = id;
      setHerramienta("mover");
      setSeleccion({ tipo: "dibujo", id });
      return;
    }
    const nuevo: Dibujo = {
      id, tipo: herramienta, puntos: herramienta === "lapiz" ? [p] : [p, p], color, grosor,
      ...(herramienta === "flecha" ? { estilo: estiloFlecha } : {}), ...(herramienta === "linea" && discontinua ? { discontinua: true } : {})
    };
    cambiarDibujos((l) => [...l, nuevo]);
    arrastre.current = { tipo: "dibujando", id };
  }
  function mover(e: PE<SVGSVGElement>) {
    const a = arrastre.current;
    if (!a) return;
    const p = enPunto(e);
    if ("marcado" in a && !a.marcado) { a.marcado = true; marcar(); }
    if (a.tipo === "pieza") moverPieza(a.id, { x: redondo(p.x + a.dx), y: redondo(p.y + a.dy) });
    else if (a.tipo === "extremo") cambiarFlechas((l) => l.map((f) => (f.id === a.id ? { ...f, [a.extremo]: p } : f)));
    else if (a.tipo === "dibujando") {
      cambiarDibujos((l) => l.map((d) => {
        if (d.id !== a.id) return d;
        if (d.tipo !== "lapiz") return { ...d, puntos: [d.puntos[0], p] };
        const u = d.puntos[d.puntos.length - 1];
        return Math.hypot(p.x - u.x, p.y - u.y) < 0.6 ? d : { ...d, puntos: [...d.puntos, p] };
      }));
    } else if (a.tipo === "dibujo") {
      const dx = p.x - a.inicio.x, dy = p.y - a.inicio.y;
      const mv = (q: Punto) => ({ x: redondo(q.x + dx), y: redondo(q.y + dy) });
      cambiarDibujo(a.id, { puntos: a.original.puntos.map(mv), ...(a.original.curva ? { curva: mv(a.original.curva) } : {}) });
    } else if (a.tipo === "punto") {
      const d = dibujos.find((x) => x.id === a.id) ?? actual.current.pasos[pasoActual].dibujos?.find((x) => x.id === a.id);
      if (!d) return;
      if (a.indice === "curva") cambiarDibujo(a.id, { curva: p });
      else cambiarDibujo(a.id, { puntos: d.puntos.map((q, i) => (i === a.indice ? p : q)) });
    }
  }
  function arriba() {
    const a = arrastre.current;
    arrastre.current = null;
    if (a?.tipo !== "dibujando") return;
    const d = actual.current.pasos[pasoActual].dibujos?.find((x) => x.id === a.id);
    if (!d) return;
    const r = recuadro(d, h);
    const pequeno = d.tipo === "lapiz" ? d.puntos.length < 2 : Math.hypot(r.w, r.h) < 24;
    if (pequeno) {
      // Un toque sin arrastrar no deja nada (y tampoco ocupa un «deshacer»)
      cambiarDibujos((l) => l.filter((x) => x.id !== d.id));
      historial.current.atras.pop();
      setVersion((v) => v + 1);
    }
  }

  function agregarPiezas(nuevas: { pieza: Pieza; pos: Punto }[], quitar: (p: Pieza) => boolean = () => false) {
    marcar();
    const pz = actual.current;
    const fuera = new Set(pz.piezas.filter(quitar).map((p) => p.id));
    const piezas = [...pz.piezas.filter((p) => !fuera.has(p.id)), ...nuevas.map((n) => n.pieza)];
    const pasos = pz.pasos.map((ps, i) => {
      const posiciones = Object.fromEntries(Object.entries(ps.posiciones).filter(([k]) => !fuera.has(k)));
      if (i === pasoActual) for (const n of nuevas) posiciones[n.pieza.id] = n.pos;
      return { ...ps, posiciones };
    });
    aplicar({ ...pz, piezas, pasos });
  }
  function agregar(tipo: TipoPieza) {
    const id = crypto.randomUUID();
    const acc = ACCESORIOS.find((a) => a.tipo === tipo);
    const pieza: Pieza = { id, tipo, etiqueta: tipo === "jugador" || tipo === "rival" ? siguienteEtiqueta(pizarra, tipo) : undefined, ...(acc?.color ? { color: acc.color } : {}) };
    const n = pizarra.piezas.filter((x) => x.tipo === tipo).length;
    const sitios: Partial<Record<TipoPieza, Punto>> = { jugador: { x: 30, y: 62 }, rival: { x: 70, y: 38 }, balon: { x: 50, y: 52 }, porteria: { x: 50, y: 12 }, miniporteria: { x: 50, y: 20 }, escalera: { x: 15, y: 45 }, barrera: { x: 50, y: 30 } };
    // Los accesorios pequeños salen en fila, uno al lado del otro, para que no queden amontonados
    const nAcc = pizarra.piezas.filter((x) => esAccesorio(x.tipo) && !sitios[x.tipo]).length;
    const pos = sitios[tipo]
      ? { x: Math.min(92, sitios[tipo]!.x + (n % 5) * 8), y: Math.min(92, sitios[tipo]!.y + Math.floor(n / 5) * 9) }
      : { x: 14 + (nAcc % 7) * 12, y: Math.min(90, 14 + Math.floor(nAcc / 7) * 12) };
    agregarPiezas([{ pieza, pos }]);
    setSeleccion({ tipo: "pieza", id });
    setHerramienta("mover");
  }
  function borrarSeleccion() {
    if (!seleccion) return;
    marcar();
    if (seleccion.tipo === "flecha") cambiarFlechas((l) => l.filter((f) => f.id !== seleccion.id));
    else if (seleccion.tipo === "dibujo") cambiarDibujos((l) => l.filter((d) => d.id !== seleccion.id));
    else {
      const pz = actual.current;
      const pasos = pz.pasos.map((ps) => { const pos = { ...ps.posiciones }; delete pos[seleccion.id]; return { ...ps, posiciones: pos }; });
      aplicar({ ...pz, piezas: pz.piezas.filter((p) => p.id !== seleccion.id), pasos });
    }
    setSeleccion(null);
  }
  async function limpiar() {
    if (!(await confirmar({ titulo: "¿Limpiar la pizarra?", texto: "Se quitan todas las fichas y los dibujos. Si te arrepientes, pulsa «Deshacer».", boton: "Limpiar" }))) return;
    marcar();
    aplicar({ ...actual.current, piezas: [], pasos: [{ posiciones: {}, flechas: [], dibujos: [] }] });
    setPaso(0); setT(0); setSeleccion(null);
  }
  function anadirPaso() {
    marcar();
    const copia = posicionesAnimadas(pizarra, pasoActual, 0);
    const pasos = [...pizarra.pasos];
    pasos.splice(pasoActual + 1, 0, { posiciones: copia, flechas: [], dibujos: [] });
    aplicar({ ...pizarra, pasos });
    setPaso(pasoActual + 1); setT(0); setSeleccion(null);
  }
  function borrarPaso() {
    if (total <= 1) return;
    marcar();
    // El paso siguiente hereda las posiciones completas para no perder nada
    const pasos = [...pizarra.pasos];
    if (pasoActual + 1 < total) pasos[pasoActual + 1] = { ...pasos[pasoActual + 1], posiciones: posicionesAnimadas(pizarra, pasoActual + 1, 0) };
    pasos.splice(pasoActual, 1);
    aplicar({ ...pizarra, pasos });
    setPaso(Math.max(0, pasoActual - 1)); setT(0); setSeleccion(null);
  }
  function cambiarDuracion(d: number) {
    marcar();
    const v = Math.min(5, Math.max(0.5, Math.round((duracionPaso(pizarra, pasoActual) + d) * 4) / 4));
    aplicar(conPaso((ps) => ({ ...ps, duracion: v })));
  }
  function moverPaso(dir: -1 | 1) {
    const j = pasoActual + dir;
    if (j < 0 || j >= total) return;
    marcar();
    // Primero cada paso con todas sus posiciones, para que al cambiar el orden no se pierda nada
    const completa = completarPasos(actual.current);
    const pasos = [...completa.pasos];
    [pasos[pasoActual], pasos[j]] = [pasos[j], pasos[pasoActual]];
    aplicar({ ...completa, pasos });
    setPaso(j); setT(0); setSeleccion(null);
  }
  function cambiarCampo(c: "completo" | "medio") {
    if (c === pizarra.campo) return;
    marcar();
    // Mantiene el mismo sitio real: medio campo = mitad de arriba del campo completo
    const f = c === "completo" ? (y: number) => y * (545 / 1050) : (y: number) => Math.min(100, y * (1050 / 545));
    const conv = (p: Punto) => ({ x: p.x, y: redondo(f(p.y)) });
    aplicar({
      ...pizarra, campo: c,
      pasos: pizarra.pasos.map((ps) => ({
        ...ps,
        posiciones: Object.fromEntries(Object.entries(ps.posiciones).map(([k, v]) => [k, conv(v)])),
        flechas: ps.flechas.map((fl) => ({ ...fl, desde: conv(fl.desde), hasta: conv(fl.hasta) })),
        dibujos: (ps.dibujos ?? []).map((d) => ({ ...d, puntos: d.puntos.map(conv), ...(d.curva ? { curva: conv(d.curva) } : {}) }))
      }))
    });
  }

  const piezaSel = seleccion?.tipo === "pieza" ? pizarra.piezas.find((p) => p.id === seleccion.id) : undefined;
  const flechaSel = seleccion?.tipo === "flecha" ? flechas.find((f) => f.id === seleccion.id) : undefined;
  const dibujoSel = seleccion?.tipo === "dibujo" ? dibujos.find((d) => d.id === seleccion.id) : undefined;
  const cambiarPieza = (c: Partial<Pieza>) => piezaSel && aplicar({ ...actual.current, piezas: actual.current.piezas.map((p) => (p.id === piezaSel.id ? { ...p, ...c } : p)) });
  const enCampo = new Set(pizarra.piezas.map((p) => p.jugadorId).filter(Boolean));
  const asas = dibujoSel && quieto ? asasDe(dibujoSel, h) : [];
  const elegirHerramienta = (hm: Herramienta) => { setHerramienta(hm); setSeleccion(null); };

  return (
    <div className={"pizarra" + (editable ? " pizarra-editable" : "")}>
      {editable && (
        <div className="pizarra-campo-tipo" role="radiogroup" aria-label="Tamaño del campo">
          {(["medio", "completo"] as const).map((c) => (
            <button key={c} type="button" role="radio" aria-checked={pizarra.campo === c} onClick={() => cambiarCampo(c)}>{c === "medio" ? "Medio campo" : "Campo completo"}</button>
          ))}
        </div>
      )}

      <svg ref={svg} className={"pizarra-svg" + (editable && !moviendo ? " modo-dibujo" : "")} viewBox={`0 0 ${VW} ${h}`} role="img"
        style={{ width: `min(100%, calc(${altoMax} * ${(VW / h).toFixed(3)}))` }}
        aria-label={animada ? `Pizarra, paso ${pasoActual + 1} de ${total}` : "Pizarra"}
        onPointerDown={editable ? abajoCampo : undefined} onPointerMove={mover} onPointerUp={arriba} onPointerCancel={() => { arrastre.current = null; }}>
        <defs>
          <marker id={marca} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" fill="#fff" /></marker>
        </defs>
        <DibujoCampo campo={pizarra.campo} />

        {dibujos.map((d) => (
          <g key={d.id} onPointerDown={(e) => abajoDibujo(e, d)} className={quieto && moviendo ? "tocable" : ""}>
            {editable && moviendo && <ZonaToque d={d} h={h} />}
            {dibujoSel?.id === d.id && (() => { const r = recuadro(d, h); return <rect x={r.x - 12} y={r.y - 12} width={r.w + 24} height={r.h + 24} rx="10" fill="none" stroke="var(--amarilla)" strokeWidth="4" strokeDasharray="10 7" />; })()}
            <DibujoLibre d={d} h={h} opacidad={opacidadFlechas} />
          </g>
        ))}

        {flechas.map((f) => (
          <g key={f.id} onPointerDown={(e) => { if (!quieto || !moviendo) return; e.stopPropagation(); setSeleccion({ tipo: "flecha", id: f.id }); }} className={quieto && moviendo ? "tocable" : ""}>
            <path d={`M${(f.desde.x / 100) * VW} ${(f.desde.y / 100) * h}L${(f.hasta.x / 100) * VW} ${(f.hasta.y / 100) * h}`} stroke="transparent" strokeWidth="30" />
            <DibujoFlecha f={f} h={h} marca={marca} seleccionada={flechaSel?.id === f.id} opacidad={opacidadFlechas} />
          </g>
        ))}

        {animada && estelas && total > 1 && <Estelas pizarra={pizarra} h={h} colorEquipo={colorEquipo} colorRival={colorRival} />}

        {ordenPiezas(pizarra.piezas).map((p) => {
          const q = posiciones[p.id];
          if (!q) return null;
          return (
            <g key={p.id} transform={`translate(${(q.x / 100) * VW} ${(q.y / 100) * h})`} onPointerDown={(e) => abajoPieza(e, p.id)} className={quieto && moviendo ? "tocable" : ""}>
              <circle r={esAccesorio(p.tipo) ? radioToque(p) + 6 : 46} fill="transparent" />
              {seleccion?.id === p.id && <circle r={esAccesorio(p.tipo) ? radioToque(p) + 4 : 34} fill="none" stroke="var(--amarilla)" strokeWidth="5" strokeDasharray="10 7" />}
              <DibujoPieza p={p} color={p.tipo === "rival" ? colorRival : colorEquipo} />
            </g>
          );
        })}

        {flechaSel && quieto && (["desde", "hasta"] as const).map((ex) => (
          <circle key={ex} cx={(flechaSel[ex].x / 100) * VW} cy={(flechaSel[ex].y / 100) * h} r="20" fill="var(--amarilla)" stroke="#000" strokeWidth="3" className="tocable"
            onPointerDown={(e) => { e.stopPropagation(); capturar(e); arrastre.current = { tipo: "extremo", id: flechaSel.id, extremo: ex, marcado: false }; }} />
        ))}
        {asas.map((a) => (
          <circle key={String(a.indice)} cx={a.x} cy={a.y} r={a.indice === "curva" ? 16 : 20} className="tocable"
            fill={a.indice === "curva" ? "#fff" : "var(--amarilla)"} stroke={a.indice === "curva" ? "var(--cesped)" : "#000"} strokeWidth="4"
            onPointerDown={(e) => { e.stopPropagation(); capturar(e); arrastre.current = { tipo: "punto", id: dibujoSel!.id, indice: a.indice, marcado: false }; }} />
        ))}
      </svg>

      {editable && (
        <div className="pizarra-barra" role="toolbar" aria-label="Herramientas de la pizarra">
          <div className="barra-grupo">
            {(Object.keys(ICONOS) as Herramienta[]).map((hm) => (
              <button key={hm} type="button" className="barra-boton" aria-pressed={herramienta === hm} onClick={() => elegirHerramienta(hm)} title={NOMBRES[hm]}>
                <Icono>{ICONOS[hm]}</Icono><span>{NOMBRES[hm]}</span>
              </button>
            ))}
          </div>
          <div className="barra-grupo barra-historial">
            <button type="button" className="barra-boton" onClick={deshacer} disabled={!historial.current.atras.length} title="Deshacer">
              <Icono><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></Icono><span>Deshacer</span>
            </button>
            <button type="button" className="barra-boton" onClick={rehacer} disabled={!historial.current.adelante.length} title="Rehacer">
              <Icono><path d="M15 14l5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" /></Icono><span>Rehacer</span>
            </button>
            <button type="button" className="barra-boton" onClick={limpiar} title="Limpiar">
              <Icono><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></Icono><span>Limpiar</span>
            </button>
          </div>
          {!moviendo && (
            <div className="barra-estilo">
              {herramienta === "flecha" && (
                <div className="barra-opciones" role="radiogroup" aria-label="Tipo de flecha">
                  {ESTILOS_FLECHA.map((x) => <button key={x.valor} type="button" role="radio" aria-checked={estiloFlecha === x.valor} onClick={() => setEstiloFlecha(x.valor)}>{x.texto}</button>)}
                </div>
              )}
              {herramienta === "linea" && (
                <div className="barra-opciones" role="radiogroup" aria-label="Tipo de línea">
                  <button type="button" role="radio" aria-checked={!discontinua} onClick={() => setDiscontinua(false)}>Continua</button>
                  <button type="button" role="radio" aria-checked={discontinua} onClick={() => setDiscontinua(true)}>Discontinua</button>
                </div>
              )}
              <SelectorColorGrosor color={color} grosor={grosor} cambiarColor={setColor} cambiarGrosor={setGrosor} />
              <small className="suave">{herramienta === "texto" ? "Toca el campo donde quieras el texto." : "Dibuja arrastrando el dedo sobre el campo."}</small>
            </div>
          )}
        </div>
      )}


      {!animada && (pizarra.piezas.length > 0 || dibujos.length > 0) && (
        <button className="btn btn-borde boton-exportar boton-imagen" type="button" onClick={() => setExportar("imagen")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" /></svg>
          Compartir imagen
        </button>
      )}

      {animada && (
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
          {total > 1 && (
            <div className="reproductor-extra">
              <input className="barra-tiempo" type="range" min={0} max={tiempoTotal} step={0.01} value={tiempoActual} aria-label="Momento de la jugada"
                onChange={(e) => irATiempo(Number(e.target.value))} />
              <span className="tiempo-texto">{tiempoActual.toFixed(1).replace(".", ",")} / {tiempoTotal.toFixed(1).replace(".", ",")} s</span>
              <div className="barra-opciones velocidades" role="radiogroup" aria-label="Velocidad">
                {[0.5, 1, 2].map((v) => <button key={v} type="button" role="radio" aria-checked={velocidad === v} onClick={() => setVelocidad(v)}>{String(v).replace(".", ",")}x</button>)}
              </div>
              <label className="interruptor interruptor-estelas">
                <input type="checkbox" checked={estelas} onChange={(e) => setEstelas(e.target.checked)} />
                <span><b>Estelas</b></span>
              </label>
              <button className="btn btn-borde boton-exportar" type="button" onClick={() => { setReproduciendo(null); setExportar("video"); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3" /></svg>
                Exportar vídeo
              </button>
            </div>
          )}
        </div>
      )}

      {editable && (
        <>
          {animada && (
            <div className="pizarra-pasos" role="tablist" aria-label="Pasos">
              {pizarra.pasos.map((_, i) => (
                <button key={i} type="button" role="tab" aria-selected={i === pasoActual} onClick={() => { setReproduciendo(null); setT(0); setPaso(i); setSeleccion(null); }}>{i + 1}</button>
              ))}
              <button type="button" className="anadir-paso" onClick={anadirPaso}>+ Paso {total + 1}</button>
              {total > 1 && <button type="button" className="borrar-paso" onClick={borrarPaso} aria-label={`Borrar el paso ${pasoActual + 1}`}><IcoPapelera /></button>}
            </div>
          )}
          {animada && total > 1 && (
            <div className="paso-controles">
              <b>Paso {pasoActual + 1}</b>
              {pasoActual > 0 ? (
                <div className="control-par" role="group" aria-label="Duración del paso">
                  <button type="button" aria-label="Más rápido" disabled={duracionPaso(pizarra, pasoActual) <= 0.5} onClick={() => cambiarDuracion(-0.25)}>−</button>
                  <span>{String(duracionPaso(pizarra, pasoActual)).replace(".", ",")} s</span>
                  <button type="button" aria-label="Más lento" disabled={duracionPaso(pizarra, pasoActual) >= 5} onClick={() => cambiarDuracion(0.25)}>+</button>
                </div>
              ) : <small className="suave">Posición de salida</small>}
              <div className="control-par" role="group" aria-label="Mover el paso">
                <button type="button" aria-label="Mover el paso a la izquierda" disabled={pasoActual === 0} onClick={() => moverPaso(-1)}>◀</button>
                <span>Mover</span>
                <button type="button" aria-label="Mover el paso a la derecha" disabled={pasoActual >= total - 1} onClick={() => moverPaso(1)}>▶</button>
              </div>
            </div>
          )}

          {seleccion && (piezaSel || flechaSel || dibujoSel) ? (
            <div className="pizarra-seleccion">
              {piezaSel && (piezaSel.tipo === "jugador" || piezaSel.tipo === "rival") && (
                <>
                  <label className="campo seleccion-etiqueta">
                    <span>{piezaSel.nombre !== undefined ? "Dorsal" : "Número o nombre"}</span>
                    <input id="pieza-etiqueta" className="entrada" value={piezaSel.etiqueta ?? ""} maxLength={12} onFocus={marcar} onChange={(e) => cambiarPieza({ etiqueta: e.target.value })} />
                  </label>
                  {piezaSel.nombre !== undefined && (
                    <label className="campo seleccion-etiqueta">
                      <span>Nombre</span>
                      <input id="pieza-nombre" className="entrada" value={piezaSel.nombre} maxLength={14} onFocus={marcar} onChange={(e) => cambiarPieza({ nombre: e.target.value })} />
                    </label>
                  )}
                </>
              )}
              {piezaSel && esAccesorio(piezaSel.tipo) && (
                <div className="seleccion-accesorio">
                  <b>{ACCESORIOS.find((a) => a.tipo === piezaSel.tipo)?.texto}</b>
                  <div className="accesorio-controles">
                    {ACCESORIOS.find((a) => a.tipo === piezaSel.tipo)?.gira && (
                      <div className="control-par" role="group" aria-label="Girar">
                        <button type="button" aria-label="Girar a la izquierda" onClick={() => { marcar(); cambiarPieza({ giro: ((piezaSel.giro ?? 0) + 315) % 360 }); }}>↺</button>
                        <span>Girar</span>
                        <button type="button" aria-label="Girar a la derecha" onClick={() => { marcar(); cambiarPieza({ giro: ((piezaSel.giro ?? 0) + 45) % 360 }); }}>↻</button>
                      </div>
                    )}
                    <div className="control-par" role="group" aria-label="Tamaño">
                      <button type="button" aria-label="Más pequeño" disabled={(piezaSel.escala ?? 1) <= 0.6} onClick={() => { marcar(); cambiarPieza({ escala: redondo(Math.max(0.6, (piezaSel.escala ?? 1) - 0.2)) }); }}>−</button>
                      <span>Tamaño</span>
                      <button type="button" aria-label="Más grande" disabled={(piezaSel.escala ?? 1) >= 2} onClick={() => { marcar(); cambiarPieza({ escala: redondo(Math.min(2, (piezaSel.escala ?? 1) + 0.2)) }); }}>+</button>
                    </div>
                  </div>
                  {ACCESORIOS.find((a) => a.tipo === piezaSel.tipo)?.color && (
                    <div className="fila-colores" role="radiogroup" aria-label="Color">
                      {COLORES_ACCESORIO.map((c) => (
                        <button key={c} type="button" role="radio" aria-checked={colorDe(piezaSel) === c} aria-label={`Color ${c}`} className="color-dibujo" style={{ background: c }}
                          onClick={() => { marcar(); cambiarPieza({ color: c }); }} />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {flechaSel && (
                <div className="opciones" style={{ gridTemplateColumns: "repeat(3, 1fr)", flex: 1 }}>
                  {FLECHAS.map((f) => (
                    <button key={f.valor} type="button" role="radio" aria-checked={flechaSel.tipo === f.valor} onClick={() => { marcar(); cambiarFlechas((l) => l.map((x) => (x.id === flechaSel.id ? { ...x, tipo: f.valor } : x))); }}>{f.texto}</button>
                  ))}
                </div>
              )}
              {dibujoSel && (
                <div className="seleccion-dibujo">
                  {dibujoSel.tipo === "texto" && (
                    <label className="campo seleccion-etiqueta">
                      <span>Texto</span>
                      <input id="dibujo-texto" className="entrada" autoFocus value={dibujoSel.texto ?? ""} maxLength={40} onFocus={() => { if (textoNuevo.current !== dibujoSel.id) marcar(); }} onChange={(e) => cambiarDibujo(dibujoSel.id, { texto: e.target.value })} />
                    </label>
                  )}
                  {dibujoSel.tipo === "flecha" && (
                    <div className="barra-opciones" role="radiogroup" aria-label="Tipo de flecha">
                      {ESTILOS_FLECHA.map((x) => <button key={x.valor} type="button" role="radio" aria-checked={dibujoSel.estilo === x.valor} onClick={() => { marcar(); cambiarDibujo(dibujoSel.id, { estilo: x.valor }); }}>{x.texto}</button>)}
                    </div>
                  )}
                  {dibujoSel.tipo === "linea" && (
                    <div className="barra-opciones" role="radiogroup" aria-label="Tipo de línea">
                      <button type="button" role="radio" aria-checked={!dibujoSel.discontinua} onClick={() => { marcar(); cambiarDibujo(dibujoSel.id, { discontinua: false }); }}>Continua</button>
                      <button type="button" role="radio" aria-checked={!!dibujoSel.discontinua} onClick={() => { marcar(); cambiarDibujo(dibujoSel.id, { discontinua: true }); }}>Discontinua</button>
                    </div>
                  )}
                  <SelectorColorGrosor color={dibujoSel.color} grosor={dibujoSel.grosor}
                    cambiarColor={(c) => { marcar(); cambiarDibujo(dibujoSel.id, { color: c }); }} cambiarGrosor={(g) => { marcar(); cambiarDibujo(dibujoSel.id, { grosor: g }); }} />
                  {(dibujoSel.tipo === "linea" || dibujoSel.tipo === "flecha") && (
                    <small className="suave">{dibujoSel.curva ? "Mueve el punto blanco para curvarla." : "Arrastra el punto blanco del centro para curvarla."}</small>
                  )}
                </div>
              )}
              <div className="seleccion-botones">
                <button className="btn btn-gris" type="button" onClick={borrarSeleccion}><IcoPapelera /> Borrar</button>
                <button className="btn btn-principal" type="button" onClick={() => setSeleccion(null)}>Listo</button>
              </div>
            </div>
          ) : (
            <div className="pizarra-herramientas">
              <span className="etiqueta">Añadir al campo</span>
              <div className="herramientas-fila">
                {jugadores && jugadores.length > 0 && <button type="button" onClick={() => setHoja("plantilla")}><span className="muestra-pieza" style={{ background: colorEquipo }} />Mi plantilla</button>}
                {sistemas && sistemas.length > 0 && <button type="button" onClick={() => setHoja("formacion")}><span className="muestra-formacion" aria-hidden="true">⋮⋮⋮</span>Formación</button>}
                <button type="button" onClick={() => agregar("jugador")}><span className="muestra-pieza" style={{ background: colorEquipo }} />Jugador</button>
                <button type="button" onClick={() => agregar("rival")}><span className="muestra-pieza" style={{ background: colorRival }} />Rival</button>
                <button type="button" onClick={() => agregar("balon")}><span className="muestra-pieza muestra-balon" />Balón</button>
              </div>
              <span className="etiqueta">Accesorios</span>
              <div className="herramientas-fila fila-accesorios">
                {ACCESORIOS.map((a) => (
                  <button key={a.tipo} type="button" onClick={() => agregar(a.tipo)}>
                    <svg viewBox="-50 -50 100 100" className="muestra-accesorio" aria-hidden="true">
                      <rect x="-50" y="-50" width="100" height="100" rx="18" fill="var(--campo-a)" />
                      <g transform={`scale(${a.tipo === "escalera" ? 0.5 : a.tipo === "barrera" ? 0.62 : a.tipo === "porteria" ? 0.9 : 1})`}>
                        <FormaAccesorio p={{ id: a.tipo, tipo: a.tipo, color: a.color }} />
                      </g>
                    </svg>
                    {a.texto}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {exportar && (
        <HojaExportar pizarra={pizarra} titulo={titulo || "Pizarra"} colorEquipo={colorEquipo} colorRival={colorRival}
          video={exportar === "video"} alCerrar={() => setExportar(null)} />
      )}
      {hoja === "plantilla" && jugadores && (
        <HojaPlantilla jugadores={jugadores} enCampo={enCampo} alCerrar={() => setHoja(null)}
          alElegir={(js) => {
            const ya = pizarra.piezas.filter((p) => p.tipo === "jugador").length;
            agregarPiezas(js.map((j, i) => ({
              pieza: { id: crypto.randomUUID(), tipo: "jugador", etiqueta: j.dorsal != null ? String(j.dorsal) : "", nombre: j.nombre, jugadorId: j.id },
              pos: { x: Math.min(92, 14 + ((ya + i) % 6) * 14), y: Math.min(94, 78 + Math.floor((ya + i) / 6) * 9) }
            })));
            setHoja(null);
            setHerramienta("mover");
          }} />
      )}
      {hoja === "formacion" && sistemas && (
        <HojaFormacion sistemas={sistemas} jugadores={jugadores ?? []} campo={pizarra.campo} alCerrar={() => setHoja(null)}
          alColocar={(nuevas, conRival) => {
            agregarPiezas(nuevas, (p) => p.tipo === "jugador" || (conRival && p.tipo === "rival"));
            setHoja(null);
            setHerramienta("mover");
          }} />
      )}
    </div>
  );
}

/** Zona invisible y más gruesa para poder tocar bien los dibujos finos con el dedo. */
function ZonaToque({ d, h }: { d: Dibujo; h: number }) {
  if (d.tipo === "circulo" || d.tipo === "zona" || d.tipo === "texto") {
    const r = recuadro(d, h);
    return <rect x={r.x - 10} y={r.y - 10} width={r.w + 20} height={r.h + 20} fill="transparent" />;
  }
  const pts = d.puntos.map((p) => aPx(p, h));
  const recorrido = d.tipo === "lapiz" ? pts : muestras(pts[0], pts[1] ?? pts[0], d.curva ? aPx(d.curva, h) : null);
  return <path d={camino(recorrido)} fill="none" stroke="transparent" strokeWidth={Math.max(34, d.grosor + 26)} strokeLinecap="round" />;
}

/** Puntos que se pueden arrastrar de un dibujo elegido. */
function asasDe(d: Dibujo, h: number): { x: number; y: number; indice: number | "curva" }[] {
  if (d.tipo === "lapiz" || d.tipo === "texto") return [];
  const pts = d.puntos.map((p, i) => ({ ...aPx(p, h), indice: i as number | "curva" }));
  if (d.tipo === "linea" || d.tipo === "flecha") {
    const c = d.curva ? aPx(d.curva, h) : { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    pts.push({ ...c, indice: "curva" });
  }
  return pts;
}

function SelectorColorGrosor({ color, grosor, cambiarColor, cambiarGrosor }: { color: string; grosor: number; cambiarColor: (c: string) => void; cambiarGrosor: (g: number) => void }) {
  return (
    <div className="barra-colores">
      <div className="fila-colores" role="radiogroup" aria-label="Color">
        {COLORES_DIBUJO.map((c) => (
          <button key={c.valor} type="button" role="radio" aria-checked={color === c.valor} aria-label={c.texto} title={c.texto}
            className="color-dibujo" style={{ background: c.valor }} onClick={() => cambiarColor(c.valor)} />
        ))}
      </div>
      <div className="fila-grosores" role="radiogroup" aria-label="Grosor">
        {GROSORES.map((g) => (
          <button key={g.valor} type="button" role="radio" aria-checked={grosor === g.valor} aria-label={g.texto} title={g.texto} onClick={() => cambiarGrosor(g.valor)}>
            <span style={{ height: Math.round(g.valor * 0.7) }} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Hojas: fichas de la plantilla y formación ---------- */
const ORDEN_PUESTO = Object.fromEntries(PUESTOS.map((p, i) => [p.valor, i]));
const ordenarPlantilla = (js: Jugador[]) =>
  [...js].sort((a, b) => (ORDEN_PUESTO[a.posicion] ?? 9) - (ORDEN_PUESTO[b.posicion] ?? 9) || (a.dorsal ?? 999) - (b.dorsal ?? 999) || a.nombre.localeCompare(b.nombre, "es"));

function HojaPlantilla({ jugadores, enCampo, alElegir, alCerrar }: { jugadores: Jugador[]; enCampo: Set<string | undefined>; alElegir: (js: Jugador[]) => void; alCerrar: () => void }) {
  const lista = ordenarPlantilla(jugadores).filter((j) => !enCampo.has(j.id));
  const [elegidos, setElegidos] = useState<Set<string>>(new Set());
  const alternar = (id: string) => setElegidos((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <Hoja titulo="Fichas de mi plantilla" alCerrar={alCerrar}>
      {lista.length === 0 ? <p className="suave">Todos tus jugadores ya están en el campo.</p> : (
        <div className="lista-plantilla-pizarra">
          {lista.map((j) => (
            <button key={j.id} type="button" aria-pressed={elegidos.has(j.id)} onClick={() => alternar(j.id)}>
              <span className="dorsal-ficha">{j.dorsal ?? "–"}</span>
              <b>{j.nombre}</b>
              <small>{PUESTOS.find((p) => p.valor === j.posicion)?.corto}</small>
            </button>
          ))}
        </div>
      )}
      <div className="hoja-acciones">
        <button className="btn btn-gris cerrar-hoja" type="button" onClick={alCerrar}>Cancelar</button>
        <button className="btn btn-principal" type="button" disabled={!elegidos.size} onClick={() => alElegir(lista.filter((j) => elegidos.has(j.id)))}>
          Añadir {elegidos.size || ""}
        </button>
      </div>
    </Hoja>
  );
}

/** Pasa una posición de la formación (portero abajo, en % de un campo entero) a la pizarra. */
function aPizarra(p: Punto, campo: "completo" | "medio", rival: boolean): Punto {
  // Campo completo: mi equipo en su mitad (abajo); el rival, en espejo arriba
  if (campo === "completo") {
    const y = 50 + (p.y / 100) * 48;
    return rival ? { x: 100 - p.x, y: redondo(100 - y) } : { x: p.x, y: redondo(y) };
  }
  // Medio campo: mi equipo atacando hacia la portería de arriba
  const y = Math.min(97, 22 + ((p.y - 30) / 64) * 76);
  return rival ? { x: 100 - p.x, y: redondo(100 - y) } : { x: p.x, y: redondo(y) };
}

function HojaFormacion({ sistemas, jugadores, campo, alColocar, alCerrar }: {
  sistemas: Sistema[]; jugadores: Jugador[]; campo: "completo" | "medio";
  alColocar: (nuevas: { pieza: Pieza; pos: Punto }[], conRival: boolean) => void; alCerrar: () => void;
}) {
  const [sistemaId, setSistemaId] = useState(sistemas[0]?.id ?? "");
  const [conQuien, setConQuien] = useState<"plantilla" | "numeros">(jugadores.length ? "plantilla" : "numeros");
  const [rival, setRival] = useState(false);
  const s = sistemas.find((x) => x.id === sistemaId);

  function colocar() {
    if (!s) return;
    const plantilla = ordenarPlantilla(jugadores);
    const nuevas = s.posiciones.map((pos, i) => {
      const j = conQuien === "plantilla" ? plantilla[i] : undefined;
      const pieza: Pieza = j
        ? { id: crypto.randomUUID(), tipo: "jugador", etiqueta: j.dorsal != null ? String(j.dorsal) : "", nombre: j.nombre, jugadorId: j.id }
        : { id: crypto.randomUUID(), tipo: "jugador", etiqueta: String(i + 1) };
      return { pieza, pos: aPizarra(pos, campo, false) };
    });
    if (rival) s.posiciones.forEach((pos, i) => nuevas.push({ pieza: { id: crypto.randomUUID(), tipo: "rival", etiqueta: String(i + 1) }, pos: aPizarra(pos, campo, true) }));
    alColocar(nuevas, rival);
  }

  return (
    <Hoja titulo="Colocar una formación" alCerrar={alCerrar}>
      <div className="campo"><span>Sistema</span>
        <div className="opciones" role="radiogroup" aria-label="Sistema" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {sistemas.map((x) => (
            <button key={x.id} type="button" role="radio" aria-checked={sistemaId === x.id} onClick={() => setSistemaId(x.id)}>
              {x.nombre}<small>{x.jugadores} jug.</small>
            </button>
          ))}
        </div>
        <small className="suave">¿Te falta alguno, como el 4-2-3-1? Créalo en Ajustes → Sistemas de juego y saldrá aquí.</small>
      </div>
      <div className="campo"><span>Fichas</span>
        <div className="opciones" role="radiogroup" aria-label="Fichas" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <button type="button" role="radio" aria-checked={conQuien === "plantilla"} disabled={!jugadores.length} onClick={() => setConQuien("plantilla")}>Mis jugadores<small>con nombre y dorsal</small></button>
          <button type="button" role="radio" aria-checked={conQuien === "numeros"} onClick={() => setConQuien("numeros")}>Fichas con número<small>1, 2, 3…</small></button>
        </div>
      </div>
      <label className="interruptor">
        <input id="formacion-rival" type="checkbox" checked={rival} onChange={(e) => setRival(e.target.checked)} />
        <span><b>Poner también al rival</b><small className="suave">Con la misma formación, enfrente.</small></span>
      </label>
      <p className="suave">Se quitan las fichas de tu equipo que haya en el campo{rival ? " y las del rival" : ""}. Luego puedes moverlas a tu gusto.</p>
      <div className="hoja-acciones">
        <button className="btn btn-gris cerrar-hoja" type="button" onClick={alCerrar}>Cancelar</button>
        <button className="btn btn-principal" type="button" onClick={colocar} disabled={!s}>Colocar</button>
      </div>
    </Hoja>
  );
}
