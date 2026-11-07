// Iconos propios de Míster: trazo redondeado de 2 px, dibujados para el fútbol.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...p });

export const IcoInicio = (p: P) => <svg {...base(p)}><path d="M3 11 12 4l9 7" /><path d="M5.5 9.5V20h13V9.5" /><circle cx="12" cy="15" r="2.4" /></svg>;
export const IcoPlantilla = (p: P) => <svg {...base(p)}><path d="M8.5 3 4 5 2 9.5l3.2 1.4L6.5 9v12h11V9l1.3 1.9L22 9.5 20 5l-4.5-2c-.6 1.6-1.9 2.6-3.5 2.6S9.1 4.6 8.5 3Z" /></svg>;
export const IcoEjercicios = (p: P) => <svg {...base(p)}><path d="M12 3 5.5 19h13L12 3Z" /><path d="M8.6 11.5h6.8M3 21h18" /></svg>;
export const IcoCalendario = (p: P) => <svg {...base(p)}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /><rect x="7" y="13.5" width="4" height="4" rx="1" fill="currentColor" stroke="none" /></svg>;
export const IcoPartidos = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="m12 8.2 3.4 2.5-1.3 4h-4.2l-1.3-4L12 8.2Z" fill="currentColor" stroke="none" /><path d="M12 3v5.2M15.4 10.7l5-1.6M14.1 14.7l3 4.2M9.9 14.7l-3 4.2M8.6 10.7l-5-1.6" strokeWidth={1.6} /></svg>;
export const IcoAjustes = (p: P) => <svg {...base(p)}><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" /><circle cx="15" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="18" r="2" /></svg>;
export const IcoMas = (p: P) => <svg {...base(p)} strokeWidth={2.4}><path d="M12 5v14M5 12h14" /></svg>;
export const IcoFlechaAbajo = (p: P) => <svg {...base(p)}><path d="m6 9 6 6 6-6" /></svg>;
export const IcoAtras = (p: P) => <svg {...base(p)}><path d="M15 5 8 12l7 7" /></svg>;
export const IcoOjo = (p: P) => <svg {...base(p)}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
export const IcoOjoTachado = (p: P) => <svg {...base(p)}><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>;
export const IcoPapelera = (p: P) => <svg {...base(p)}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;
export const IcoLapiz = (p: P) => <svg {...base(p)}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></svg>;
export const IcoPersona = (p: P) => <svg {...base(p)}><circle cx="12" cy="8.5" r="4" /><path d="M4 20.5c1.4-3.6 4.4-5.5 8-5.5s6.6 1.9 8 5.5" /></svg>;
export const IcoSalir = (p: P) => <svg {...base(p)}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" /></svg>;
export const IcoCheck = (p: P) => <svg {...base(p)} strokeWidth={2.4}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
export const IcoSilbato = (p: P) => <svg {...base(p)}><path d="M3 13a5 5 0 0 0 9.6 2H20a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-9" /><circle cx="8" cy="13" r="5" /><circle cx="8" cy="13" r="1.4" fill="currentColor" /><path d="M14 10V7" /></svg>;
export const IcoSol = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
export const IcoLuna = (p: P) => <svg {...base(p)}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>;
export const IcoAuto = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17Z" fill="currentColor" stroke="none" /></svg>;
export const IcoRecargar = (p: P) => <svg {...base(p)}><path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" /></svg>;
export const IcoCorreo = (p: P) => <svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></svg>;
export const IcoCompartir = (p: P) => <svg {...base(p)}><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>;
export const IcoDescargar = (p: P) => <svg {...base(p)}><path d="M12 3.5V15M7.5 10.5 12 15l4.5-4.5" /><path d="M4 19.5h16" /></svg>;
export const IcoHoja = (p: P) => <svg {...base(p)}><path d="M6 2.5h8l4 4v15H6z" /><path d="M14 2.5v4h4M9 12h6M9 16h6" /></svg>;
export const IcoMover = (p: P) => <svg {...base(p)}><path d="M7 4v14M3.5 7.5 7 4l3.5 3.5M17 20V6M13.5 16.5 17 20l3.5-3.5" /></svg>;

/** Icono de la app (círculo central del campo con el balón naranja). */
export function LogoMister({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <clipPath id="logo-recorte"><rect width="512" height="512" rx="116" /></clipPath>
      <g clipPath="url(#logo-recorte)">
        <rect width="512" height="512" fill="#0F6B45" />
        <rect width="128" height="512" fill="#0C5E3C" />
        <rect x="256" width="128" height="512" fill="#0C5E3C" />
      </g>
      <path d="M256 70v372" stroke="#fff" strokeWidth="22" strokeLinecap="round" />
      <circle cx="256" cy="256" r="108" fill="none" stroke="#fff" strokeWidth="22" />
      <circle cx="256" cy="256" r="40" fill="#FF6B1A" />
    </svg>
  );
}
