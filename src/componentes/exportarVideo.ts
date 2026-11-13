// Convierte una pizarra en vídeo (jugadas animadas) o en imagen (pizarras de partido).
// Todo pasa en el propio dispositivo: no se sube nada a ningún servidor.
// Vídeo: se dibuja cada fotograma en un lienzo y se graba con MediaRecorder (MP4 si el navegador lo permite; si no, WebM).
import { createElement } from "react";
import { duracionPaso, type Pizarra } from "../datos/pizarra";
import { PizarraFotograma } from "./Pizarra";

export interface OpcionesExportar {
  titulo: string;
  colorEquipo: string;
  colorRival: string;
  sinNombres: boolean;
  estelas: boolean;
  velocidad: number;
}

const ANCHO = 720;
const CABECERA = 72;
const MARGEN = 16;
const par = (n: number) => Math.round(n / 2) * 2; // los vídeos MP4 necesitan medidas pares

/** Formato de vídeo que puede grabar este navegador (o null si no puede grabar). */
export function formatoVideo(): { mime: string; ext: "mp4" | "webm" } | null {
  if (typeof MediaRecorder === "undefined" || !HTMLCanvasElement.prototype.captureStream) return null;
  const opciones: [string, "mp4" | "webm"][] = [
    ["video/mp4;codecs=avc1.42E01E", "mp4"], ["video/mp4;codecs=avc1", "mp4"], ["video/mp4", "mp4"],
    ["video/webm;codecs=vp9", "webm"], ["video/webm;codecs=vp8", "webm"], ["video/webm", "webm"]
  ];
  for (const [mime, ext] of opciones) if (MediaRecorder.isTypeSupported(mime)) return { mime, ext };
  return null;
}

/** Paso y avance (0 a 1) en un segundo concreto de la jugada. */
export function momento(p: Pizarra, seg: number): { paso: number; t: number } {
  let acum = 0;
  for (let i = 1; i < p.pasos.length; i++) {
    const d = duracionPaso(p, i);
    if (seg < acum + d) return { paso: i - 1, t: Math.max(0, (seg - acum) / d) };
    acum += d;
  }
  return { paso: p.pasos.length - 1, t: 0 };
}
export const duracionTotal = (p: Pizarra) => p.pasos.reduce((s, _, i) => (i ? s + duracionPaso(p, i) : s), 0);

/** Los colores del campo salen de las variables de la app; una imagen suelta no las conoce, así que se ponen a mano. */
function coloresCampo() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string, d: string) => cs.getPropertyValue(n).trim() || d;
  return { a: v("--campo-a", "#3A8C5C"), b: v("--campo-b", "#348053"), amarilla: v("--amarilla", "#F5C518") };
}

let servidor: typeof import("react-dom/server") | null = null;
async function imagenDe(p: Pizarra, o: OpcionesExportar, paso: number, t: number) {
  servidor ??= await import("react-dom/server");
  const c = coloresCampo();
  const svg = servidor.renderToStaticMarkup(createElement(PizarraFotograma, {
    pizarra: p, colorEquipo: o.colorEquipo, colorRival: o.colorRival, paso, t, estelas: o.estelas, sinNombres: o.sinNombres
  })).replace(/var\(--campo-a\)/g, c.a).replace(/var\(--campo-b\)/g, c.b).replace(/var\(--amarilla\)/g, c.amarilla);
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await img.decode();
  return img;
}

function prepararLienzo(p: Pizarra) {
  const altoCampo = Math.round(((ANCHO - MARGEN * 2) * (p.campo === "completo" ? 1050 : 545)) / 680);
  const lienzo = document.createElement("canvas");
  lienzo.width = par(ANCHO);
  lienzo.height = par(CABECERA + altoCampo + MARGEN);
  return { lienzo, ctx: lienzo.getContext("2d")!, altoCampo };
}

function dibujar(ctx: CanvasRenderingContext2D, img: HTMLImageElement, titulo: string, altoCampo: number, w: number, h: number) {
  ctx.fillStyle = "#0E1D16";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#FFFFFF";
  ctx.textBaseline = "middle";
  ctx.font = "800 34px 'Big Shoulders Display', 'Arial Narrow', sans-serif";
  const t = titulo.toUpperCase();
  ctx.fillText(t.length > 34 ? t.slice(0, 33) + "…" : t, MARGEN, CABECERA / 2 + 2);
  ctx.font = "700 18px Barlow, sans-serif";
  ctx.fillStyle = "#4CC88E";
  ctx.textAlign = "right";
  ctx.fillText("MÍSTER", w - MARGEN, CABECERA / 2 + 2);
  ctx.textAlign = "left";
  ctx.drawImage(img, MARGEN, CABECERA, w - MARGEN * 2, altoCampo);
}

/** Imagen PNG de la pizarra (primer paso). */
export async function crearImagen(p: Pizarra, o: OpcionesExportar): Promise<Blob> {
  await document.fonts?.ready;
  const { lienzo, ctx, altoCampo } = prepararLienzo(p);
  dibujar(ctx, await imagenDe(p, o, 0, 0), o.titulo, altoCampo, lienzo.width, lienzo.height);
  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error("No se ha podido crear la imagen."))), "image/png"));
}

/**
 * Graba la jugada en vídeo, en tiempo real (tarda lo mismo que dura la jugada a esa velocidad).
 * Se queda un momento quieta al principio y al final para que se vea bien la colocación y el resultado.
 */
export async function crearVideo(p: Pizarra, o: OpcionesExportar, alProgreso: (n: number) => void, cancelado: () => boolean) {
  const formato = formatoVideo();
  if (!formato) throw new Error("Este navegador no puede grabar vídeo. Prueba con Chrome o con Safari actualizado.");
  await document.fonts?.ready;
  const { lienzo, ctx, altoCampo } = prepararLienzo(p);
  const ESPERA_INICIO = 0.8, ESPERA_FIN = 1.2;
  const total = duracionTotal(p);
  const duracionVideo = ESPERA_INICIO + total / o.velocidad + ESPERA_FIN;

  // Primer fotograma antes de empezar a grabar
  dibujar(ctx, await imagenDe(p, o, 0, 0), o.titulo, altoCampo, lienzo.width, lienzo.height);
  const flujo = lienzo.captureStream(30);
  const grabadora = new MediaRecorder(flujo, { mimeType: formato.mime, videoBitsPerSecond: 4_000_000 });
  const trozos: Blob[] = [];
  grabadora.ondataavailable = (e) => { if (e.data.size) trozos.push(e.data); };
  const terminado = new Promise<void>((ok) => { grabadora.onstop = () => ok(); });
  grabadora.start(250);

  const inicio = performance.now();
  while (true) {
    if (cancelado()) { grabadora.stop(); flujo.getTracks().forEach((t) => t.stop()); throw new Error("cancelado"); }
    const seg = (performance.now() - inicio) / 1000;
    if (seg >= duracionVideo) break;
    const enJugada = Math.min(total, Math.max(0, (seg - ESPERA_INICIO) * o.velocidad));
    const m = momento(p, enJugada);
    dibujar(ctx, await imagenDe(p, o, m.paso, m.t), o.titulo, altoCampo, lienzo.width, lienzo.height);
    alProgreso(Math.min(99, Math.round((seg / duracionVideo) * 100)));
    await new Promise((r) => requestAnimationFrame(() => r(null)));
  }
  grabadora.stop();
  await terminado;
  flujo.getTracks().forEach((t) => t.stop());
  alProgreso(100);
  return { blob: new Blob(trozos, { type: formato.mime.split(";")[0] }), ext: formato.ext };
}

/** Nombre de archivo sin caracteres raros. */
export const nombreArchivo = (titulo: string, ext: string) =>
  `${(titulo || "jugada").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "jugada"}.${ext}`;
