// Prepara un vídeo antes de subirlo: lee cuánto dura y, si pesa demasiado, lo reduce a calidad media
// en el propio dispositivo (se reproduce sin sonido en un lienzo y se vuelve a grabar).
import { LIMITE_BYTES, MINUTOS_MAX } from "../datos/video";
import { formatoVideo } from "./exportarVideo";

export interface InfoVideo { duracion: number; ancho: number; alto: number }

const par = (n: number) => Math.max(2, Math.round(n / 2) * 2);

function elementoVideo(src: string) {
  const v = document.createElement("video");
  v.muted = true; v.playsInline = true; v.preload = "auto"; v.crossOrigin = "anonymous";
  v.setAttribute("playsinline", "");
  // Algunos navegadores (Safari) solo reproducen bien si el vídeo está en la página
  Object.assign(v.style, { position: "fixed", left: "-10px", top: "0", width: "2px", height: "2px", opacity: "0", pointerEvents: "none" });
  document.body.appendChild(v);
  v.src = src;
  return v;
}
const quitar = (v: HTMLVideoElement) => { v.pause(); v.removeAttribute("src"); v.load(); v.remove(); };

/** Duración y tamaño de imagen del vídeo. Falla si este navegador no sabe abrirlo. */
export function leerVideo(archivo: Blob): Promise<InfoVideo> {
  const url = URL.createObjectURL(archivo);
  const v = elementoVideo(url);
  return new Promise<InfoVideo>((ok, mal) => {
    const fin = () => { quitar(v); URL.revokeObjectURL(url); };
    v.onloadedmetadata = () => {
      const info = { duracion: v.duration, ancho: v.videoWidth, alto: v.videoHeight };
      fin();
      if (!isFinite(info.duracion) || !info.ancho) mal(new Error("No se ha podido leer este vídeo. Prueba con otro archivo."));
      else ok(info);
    };
    v.onerror = () => { fin(); mal(new Error("Este navegador no sabe abrir ese vídeo. Si lo grabaste con un iPhone, ábrelo desde el iPhone o expórtalo como «Más compatible».")); };
  });
}

export const necesitaReducir = (archivo: Blob) => archivo.size > LIMITE_BYTES * 0.97 || archivo.type === "video/quicktime" || !archivo.type;
export const puedeReducir = (info: InfoVideo) => info.duracion <= MINUTOS_MAX * 60 + 1;

/** Calidad para que unos 4 minutos quepan en 50 MB. */
const BITS = 1_400_000;
const ANCHO_MAX = 854;

/** Vuelve a grabar el vídeo más pequeño (sin sonido). Tarda lo mismo que dura el vídeo. */
export async function reducirVideo(archivo: Blob, info: InfoVideo, alProgreso: (n: number) => void, cancelado: () => boolean): Promise<Blob> {
  const formato = formatoVideo();
  if (!formato) throw new Error("Este navegador no puede preparar el vídeo. Prueba con Chrome o con Safari actualizado.");
  const escala = Math.min(1, ANCHO_MAX / Math.max(info.ancho, info.alto));
  const lienzo = document.createElement("canvas");
  lienzo.width = par(info.ancho * escala); lienzo.height = par(info.alto * escala);
  const ctx = lienzo.getContext("2d")!;
  const url = URL.createObjectURL(archivo);
  const v = elementoVideo(url);
  try {
    await new Promise<void>((ok, mal) => { v.oncanplay = () => ok(); v.onerror = () => mal(new Error("No se ha podido abrir el vídeo.")); });
    const flujo = lienzo.captureStream(30);
    const grabadora = new MediaRecorder(flujo, { mimeType: formato.mime, videoBitsPerSecond: BITS });
    const trozos: Blob[] = [];
    grabadora.ondataavailable = (e) => { if (e.data.size) trozos.push(e.data); };
    const parado = new Promise<void>((ok) => { grabadora.onstop = () => ok(); });
    ctx.drawImage(v, 0, 0, lienzo.width, lienzo.height);
    grabadora.start(500);
    await v.play();
    await new Promise<void>((ok, mal) => {
      const paso = () => {
        if (cancelado()) { mal(new Error("cancelado")); return; }
        ctx.drawImage(v, 0, 0, lienzo.width, lienzo.height);
        alProgreso(Math.min(99, Math.round((v.currentTime / info.duracion) * 100)));
        if (v.ended || v.currentTime >= info.duracion - 0.02) ok();
        else requestAnimationFrame(paso);
      };
      v.onended = () => ok();
      requestAnimationFrame(paso);
    }).finally(() => { grabadora.stop(); flujo.getTracks().forEach((t) => t.stop()); });
    await parado;
    const blob = new Blob(trozos, { type: formato.mime.split(";")[0] });
    if (blob.size > LIMITE_BYTES) throw new Error("Aun reducido, el vídeo es demasiado grande. Recórtalo en el móvil y vuelve a probar.");
    alProgreso(100);
    return blob;
  } finally {
    quitar(v);
    URL.revokeObjectURL(url);
  }
}
