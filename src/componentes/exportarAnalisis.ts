// Exporta un vídeo de análisis con los dibujos: una imagen de un momento, o un vídeo que se
// para en cada momento con los dibujos encima. Todo se hace en el propio dispositivo.
import { createElement } from "react";
import type { Dibujo } from "../datos/pizarra";
import { ordenarMomentos, type MomentoVideo, type VideoAnalisis } from "../datos/video";
import { formatoVideo } from "./exportarVideo";
import { DibujoLibre } from "./Pizarra";

export const VW = 680;
export const altoCapa = (v: Pick<VideoAnalisis, "ancho" | "alto">) => Math.round((VW * (v.alto || 9)) / (v.ancho || 16));

const ANCHO = 720, CABECERA = 64;
const par = (n: number) => Math.round(n / 2) * 2;
/** Segundos que se queda quieto en cada momento con los dibujos. */
export const PAUSA = 4;
/** En «solo los momentos», segundos de vídeo antes de cada momento. */
export const ANTES = 4;

let servidor: typeof import("react-dom/server") | null = null;
async function capaDibujos(dibujos: Dibujo[], h: number): Promise<HTMLImageElement | null> {
  if (!dibujos.length) return null;
  servidor ??= await import("react-dom/server");
  const svg = servidor.renderToStaticMarkup(createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: `0 0 ${VW} ${h}`, width: VW, height: h },
    ...dibujos.map((d) => createElement(DibujoLibre, { key: d.id, d, h }))));
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await img.decode();
  return img;
}

function lienzoPara(v: VideoAnalisis) {
  const ancho = Math.min(ANCHO, Math.max(360, v.ancho || ANCHO));
  const altoVideo = Math.round((ancho * (v.alto || 9)) / (v.ancho || 16));
  const c = document.createElement("canvas");
  c.width = par(ancho); c.height = par(CABECERA + altoVideo);
  return { c, ctx: c.getContext("2d")!, altoVideo };
}

function pintar(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, capa: HTMLImageElement | null, titulo: string, rotulo: string, altoVideo: number) {
  const w = ctx.canvas.width;
  ctx.fillStyle = "#0E1D16";
  ctx.fillRect(0, 0, w, ctx.canvas.height);
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 30px 'Big Shoulders Display', 'Arial Narrow', sans-serif";
  const t = titulo.toUpperCase();
  ctx.fillText(t.length > 30 ? t.slice(0, 29) + "…" : t, 14, CABECERA / 2 + 1);
  ctx.textAlign = "right";
  ctx.font = "700 17px Barlow, sans-serif";
  ctx.fillStyle = "#4CC88E";
  ctx.fillText(rotulo || "MÍSTER", w - 14, CABECERA / 2 + 1);
  ctx.textAlign = "left";
  ctx.drawImage(video, 0, CABECERA, w, altoVideo);
  if (capa) ctx.drawImage(capa, 0, CABECERA, w, altoVideo);
}

function cargar(url: string): Promise<HTMLVideoElement> {
  const v = document.createElement("video");
  v.muted = true; v.playsInline = true; v.crossOrigin = "anonymous"; v.preload = "auto";
  v.setAttribute("playsinline", "");
  Object.assign(v.style, { position: "fixed", left: "-10px", top: "0", width: "2px", height: "2px", opacity: "0", pointerEvents: "none" });
  document.body.appendChild(v);
  v.src = url;
  return new Promise((ok, mal) => {
    v.oncanplay = () => { v.oncanplay = null; ok(v); };
    v.onerror = () => mal(new Error("No se ha podido abrir el vídeo para exportarlo."));
  });
}
const soltar = (v: HTMLVideoElement) => { v.pause(); v.removeAttribute("src"); v.load(); v.remove(); };
function irA(v: HTMLVideoElement, t: number) {
  return new Promise<void>((ok) => {
    if (Math.abs(v.currentTime - t) < 0.01) { ok(); return; }
    v.onseeked = () => { v.onseeked = null; ok(); };
    v.currentTime = t;
  });
}
const fotograma = () => new Promise((r) => requestAnimationFrame(() => r(null)));

function aBlob(c: HTMLCanvasElement) {
  return new Promise<Blob>((ok, mal) => {
    try { c.toBlob((b) => (b ? ok(b) : mal(new Error("No se ha podido crear la imagen."))), "image/png"); }
    catch { mal(new Error("Este navegador no deja crear la imagen de este vídeo.")); }
  });
}

/** Imagen PNG del vídeo en un momento, con sus dibujos. */
export async function imagenMomento(url: string, v: VideoAnalisis, m: MomentoVideo): Promise<Blob> {
  await document.fonts?.ready;
  const video = await cargar(url);
  try {
    await irA(video, m.t);
    const { c, ctx, altoVideo } = lienzoPara(v);
    pintar(ctx, video, await capaDibujos(m.dibujos, altoCapa(v)), v.nombre, m.nombre, altoVideo);
    return await aBlob(c);
  } finally { soltar(video); }
}

interface Tramo { desde: number; hasta: number; momento: MomentoVideo | null }

/** Qué trozos se graban: todo el vídeo parando en cada momento, o solo unos segundos antes de cada momento. */
export function tramos(v: VideoAnalisis, soloMomentos: boolean): Tramo[] {
  const ms = ordenarMomentos(v.momentos).filter((m) => m.t <= v.duracion);
  if (!soloMomentos || !ms.length) {
    const r: Tramo[] = [];
    let desde = 0;
    for (const m of ms) { r.push({ desde, hasta: m.t, momento: m }); desde = m.t; }
    r.push({ desde, hasta: v.duracion, momento: null });
    return r.filter((t) => t.hasta - t.desde > 0.01 || t.momento);
  }
  let fin = 0;
  return ms.map((m) => {
    const desde = Math.max(fin, m.t - ANTES, 0);
    fin = m.t;
    return { desde, hasta: m.t, momento: m };
  });
}
export const duracionExport = (v: VideoAnalisis, soloMomentos: boolean) =>
  tramos(v, soloMomentos).reduce((s, t) => s + (t.hasta - t.desde) + (t.momento ? PAUSA : 0), 0);

/** Graba el vídeo con los dibujos (en tiempo real). */
export async function videoAnalisis(url: string, v: VideoAnalisis, soloMomentos: boolean, alProgreso: (n: number) => void, cancelado: () => boolean) {
  const formato = formatoVideo();
  if (!formato) throw new Error("Este navegador no puede grabar vídeo. Prueba con Chrome o con Safari actualizado.");
  await document.fonts?.ready;
  const video = await cargar(url);
  const { c, ctx, altoVideo } = lienzoPara(v);
  const h = altoCapa(v);
  const lista = tramos(v, soloMomentos);
  const total = duracionExport(v, soloMomentos);
  let hecho = 0;
  const flujo = c.captureStream(30);
  const grabadora = new MediaRecorder(flujo, { mimeType: formato.mime, videoBitsPerSecond: 3_000_000 });
  const trozos: Blob[] = [];
  grabadora.ondataavailable = (e) => { if (e.data.size) trozos.push(e.data); };
  const parado = new Promise<void>((ok) => { grabadora.onstop = () => ok(); });
  const comprobar = () => { if (cancelado()) throw new Error("cancelado"); };
  try {
    await irA(video, lista[0]?.desde ?? 0);
    pintar(ctx, video, null, v.nombre, "", altoVideo);
    grabadora.start(500);
    for (const tr of lista) {
      comprobar();
      if (Math.abs(video.currentTime - tr.desde) > 0.15) await irA(video, tr.desde);
      if (tr.hasta - tr.desde > 0.05) {
        const base = hecho - tr.desde;
        await video.play();
        while (video.currentTime < tr.hasta - 0.02 && !video.ended) {
          comprobar();
          pintar(ctx, video, null, v.nombre, "", altoVideo);
          alProgreso(Math.min(99, Math.round(((base + video.currentTime) / total) * 100)));
          await fotograma();
        }
        video.pause();
        hecho += tr.hasta - tr.desde;
      }
      if (tr.momento) {
        await irA(video, tr.momento.t);
        const capa = await capaDibujos(tr.momento.dibujos, h);
        const inicio = performance.now();
        while (performance.now() - inicio < PAUSA * 1000) {
          comprobar();
          pintar(ctx, video, capa, v.nombre, tr.momento.nombre, altoVideo);
          alProgreso(Math.min(99, Math.round(((hecho + (performance.now() - inicio) / 1000) / total) * 100)));
          await fotograma();
        }
        hecho += PAUSA;
      }
    }
  } catch (e) {
    grabadora.stop(); flujo.getTracks().forEach((t) => t.stop()); soltar(video);
    throw e;
  }
  grabadora.stop();
  await parado;
  flujo.getTracks().forEach((t) => t.stop());
  soltar(video);
  alProgreso(100);
  return { blob: new Blob(trozos, { type: formato.mime.split(";")[0] }), ext: formato.ext };
}
