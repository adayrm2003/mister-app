// Campo de fútbol visto desde arriba, en vertical (atacamos hacia arriba).
// Las fichas se colocan encima con posiciones en % (x, y).
import { forwardRef, type ReactNode } from "react";
import "./campo.css";

export const LineasCampo = ({ franjas = 10 }: { franjas?: number }) => (
  <svg className="cancha-dibujo" viewBox="0 0 680 1050" preserveAspectRatio="none" aria-hidden="true">
    {Array.from({ length: franjas }, (_, i) => (
      <rect key={i} x="0" y={(i * 1050) / franjas} width="680" height={1050 / franjas} fill={i % 2 ? "var(--campo-b)" : "var(--campo-a)"} />
    ))}
    <g fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="4">
      <rect x="30" y="30" width="620" height="990" />
      <path d="M30 525h620" />
      <circle cx="340" cy="525" r="80" />
      <rect x="140" y="30" width="400" height="150" />
      <rect x="240" y="30" width="200" height="55" />
      <path d="M270 180a80 80 0 0 0 140 0" />
      <rect x="140" y="870" width="400" height="150" />
      <rect x="240" y="965" width="200" height="55" />
      <path d="M270 870a80 80 0 0 1 140 0" />
      <rect x="290" y="14" width="100" height="16" />
      <rect x="290" y="1020" width="100" height="16" />
    </g>
    <circle cx="340" cy="525" r="6" fill="rgba(255,255,255,.9)" />
  </svg>
);

/**
 * recorte: parte de arriba del campo (0 a 0.5) que no se dibuja, para que en el móvil
 * la alineación quepa sin tanto desplazamiento. Usa yEnCampo() para colocar las fichas.
 */
export const Campo = forwardRef<HTMLDivElement, { children?: ReactNode; className?: string; recorte?: number }>(function Campo({ children, className, recorte = 0 }, ref) {
  const visible = 1 - recorte;
  return (
    <div className={"cancha " + (className ?? "")} ref={ref} style={{ aspectRatio: `68 / ${105 * visible}` }}>
      <div className="cancha-lienzo" style={{ top: `${(-recorte / visible) * 100}%`, height: `${100 / visible}%` }}>
        <LineasCampo />
      </div>
      {children}
    </div>
  );
});

/** Posición vertical (en %) de una ficha dentro de un campo recortado. */
export const yEnCampo = (y: number, recorte = 0) => ((y / 100 - recorte) / (1 - recorte)) * 100;

/** Recorte que deja ver a todos los jugadores (como mucho, la cuarta parte de arriba). */
export const recorteParaPuntos = (ys: number[]) => Math.max(0, Math.min(0.24, (Math.min(...ys, 100) - 10) / 100));

/** Ficha redonda con el dorsal grande y el nombre debajo. */
export function Ficha({ dorsal, nombre, color, pequena, vacia, seleccionada }: { dorsal?: number | null; nombre?: string; color?: string; pequena?: boolean; vacia?: boolean; seleccionada?: boolean }) {
  return (
    <span className={"ficha" + (pequena ? " ficha-pequena" : "") + (vacia ? " ficha-vacia" : "") + (seleccionada ? " ficha-seleccionada" : "")}>
      <span className="ficha-circulo" style={color ? { background: color, color: colorTexto(color) } : undefined}>
        {vacia ? "+" : dorsal ?? "–"}
      </span>
      {nombre && <span className="ficha-nombre">{nombre}</span>}
    </span>
  );
}

/** Texto blanco o negro según lo claro que sea el color de fondo. */
export function colorTexto(hex: string) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#fff";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 165 ? "#111" : "#fff";
}
