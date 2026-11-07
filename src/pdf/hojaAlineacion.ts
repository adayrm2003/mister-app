// Hoja de alineación para el vestuario: A4 vertical, letra grande y pensada para blanco y negro.
// Se dibuja en un lienzo (canvas) de 2480 × 3508 px (A4 a 300 ppp) y de ahí sale el PDF y la imagen.
import { recorteParaPuntos, yEnCampo } from "../componentes/Campo";
import type { Punto } from "../datos/modelo";

export interface DatosHoja {
  equipo: string;
  rival: string;
  modalidad: string;
  fecha: string;
  hora: string;
  campo: string;
  casa: boolean;
  sistema: string;
  posiciones: Punto[];
  titulares: ({ dorsal: number | null; nombre: string } | null)[];
  suplentes: { dorsal: number | null; nombre: string }[];
  notas: string;
}

const W = 2480, H = 3508, M = 140;
const NEGRO = "#000", GRIS = "#4a4a4a";
const DISPLAY = '"Big Shoulders Display", "Arial Narrow", sans-serif';
const TEXTO = 'Barlow, "Segoe UI", Arial, sans-serif';

export async function cargarFuentes() {
  try {
    await Promise.all([
      document.fonts.load(`900 100px ${DISPLAY}`), document.fonts.load(`800 100px ${DISPLAY}`),
      document.fonts.load(`700 60px ${TEXTO}`), document.fonts.load(`600 60px ${TEXTO}`)
    ]);
  } catch { /* si no hay internet se usa la letra de reserva */ }
}

/** Escribe un texto reduciendo la letra hasta que quepa; si aun así no cabe, lo corta con "…". */
function texto(ctx: CanvasRenderingContext2D, t: string, x: number, y: number, maxW: number, peso: number, tam: number, familia: string, min = tam * 0.55) {
  let s = tam;
  ctx.font = `${peso} ${s}px ${familia}`;
  while (ctx.measureText(t).width > maxW && s > min) { s -= 4; ctx.font = `${peso} ${s}px ${familia}`; }
  let r = t;
  while (ctx.measureText(r).width > maxW && r.length > 1) r = r.slice(0, -2) + "…";
  ctx.fillText(r, x, y);
  return s;
}

function rectRedondo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function dibujarCampo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, hVisible: number, recorte: number) {
  const hTotal = (w * 1050) / 680;
  ctx.save();
  rectRedondo(ctx, x, y, w, hVisible, 24);
  ctx.clip();
  ctx.fillStyle = "#fff";
  ctx.fillRect(x, y, w, hVisible);
  ctx.translate(x, y - recorte * hTotal);
  ctx.scale(w / 680, hTotal / 1050);
  for (let i = 0; i < 10; i++) if (i % 2) { ctx.fillStyle = "#f0f0f0"; ctx.fillRect(0, i * 105, 680, 105); }
  ctx.strokeStyle = NEGRO;
  ctx.lineWidth = 4.5;
  ctx.strokeRect(30, 30, 620, 990);
  ctx.beginPath(); ctx.moveTo(30, 525); ctx.lineTo(650, 525); ctx.stroke();
  ctx.beginPath(); ctx.arc(340, 525, 80, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeRect(140, 30, 400, 150); ctx.strokeRect(240, 30, 200, 55);
  ctx.strokeRect(140, 870, 400, 150); ctx.strokeRect(240, 965, 200, 55);
  ctx.beginPath(); ctx.arc(340, 180, 80, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  ctx.beginPath(); ctx.arc(340, 870, 80, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke();
  ctx.fillStyle = NEGRO;
  ctx.beginPath(); ctx.arc(340, 525, 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.lineWidth = 8;
  ctx.strokeStyle = NEGRO;
  rectRedondo(ctx, x, y, w, hVisible, 24);
  ctx.stroke();
  ctx.restore();
}

function ficha(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, dorsal: number | null, nombre?: string, anchoNombre?: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.lineWidth = r * 0.11;
  ctx.strokeStyle = NEGRO;
  ctx.stroke();
  ctx.fillStyle = NEGRO;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  texto(ctx, dorsal == null ? "–" : String(dorsal), cx, cy + r * 0.06, r * 1.6, 800, r * 1.25, DISPLAY);
  if (nombre && anchoNombre) {
    const tam = r * 0.62;
    ctx.font = `700 ${tam}px ${TEXTO}`;
    const ancho = Math.min(anchoNombre, ctx.measureText(nombre).width + tam * 0.9);
    const alto = tam * 1.45;
    const top = cy + r + r * 0.18;
    rectRedondo(ctx, cx - ancho / 2, top, ancho, alto, alto / 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = NEGRO;
    texto(ctx, nombre, cx, top + alto / 2 + 2, ancho - tam * 0.6, 700, tam, TEXTO);
  }
}

export function dibujarHoja(canvas: HTMLCanvasElement, d: DatosHoja) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = NEGRO;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // Cabecera
  ctx.fillStyle = GRIS;
  ctx.font = `700 50px ${TEXTO}`;
  ctx.fillText(`ALINEACIÓN · ${d.modalidad.toUpperCase()}`, M, M + 40);
  ctx.fillStyle = NEGRO;
  texto(ctx, d.equipo.toUpperCase(), M, M + 210, W - 2 * M, 900, 180, DISPLAY);
  texto(ctx, `VS ${d.rival.toUpperCase()}`, M, M + 350, W - 2 * M, 800, 130, DISPLAY);

  // Datos del partido en recuadros
  const datos: [string, string, number][] = [
    ["FECHA", d.fecha, 1.3], ["HORA", d.hora || "—", 0.75], ["CAMPO", d.campo || "—", 1.6], ["JUGAMOS", d.casa ? "En casa" : "Fuera", 0.9], ["SISTEMA", d.sistema, 0.85]
  ];
  const total = datos.reduce((a, [, , p]) => a + p, 0);
  const hueco = 22, ancho = W - 2 * M - hueco * (datos.length - 1);
  let bx = M;
  const by = M + 420, bh = 190;
  for (const [etq, valor, p] of datos) {
    const bw = (ancho * p) / total;
    rectRedondo(ctx, bx, by, bw, bh, 22);
    ctx.lineWidth = 5;
    ctx.strokeStyle = NEGRO;
    ctx.stroke();
    ctx.fillStyle = GRIS;
    ctx.font = `700 38px ${TEXTO}`;
    ctx.fillText(etq, bx + 28, by + 62);
    ctx.fillStyle = NEGRO;
    texto(ctx, valor, bx + 28, by + 150, bw - 56, 700, 66, TEXTO, 36);
    bx += bw + hueco;
  }

  // Espacio para suplentes y notas
  const filasSup = Math.ceil(d.suplentes.length / 2);
  const altoSup = d.suplentes.length ? 150 + filasSup * 155 : 0;
  const lineasNotas = d.notas.trim() ? (d.notas.length > 70 ? 2 : 1) : 0;
  const altoNotas = lineasNotas ? 60 + lineasNotas * 80 : 0;
  const pie = 70;
  const campoTop = by + bh + 50;
  const campoFin = H - M - pie - (altoSup ? altoSup + 50 : 0) - (altoNotas ? altoNotas + 30 : 0);

  // Campo con los titulares
  const recorte = recorteParaPuntos(d.posiciones.map((p) => p.y));
  const proporcion = 680 / (1050 * (1 - recorte));
  const altoDisponible = campoFin - campoTop;
  const cw = Math.min(W - 2 * M, altoDisponible * proporcion);
  const ch = cw / proporcion;
  const cx0 = (W - cw) / 2;
  dibujarCampo(ctx, cx0, campoTop, cw, ch, recorte);
  const r = Math.max(72, Math.min(120, cw * 0.076));
  d.posiciones.forEach((p, i) => {
    const t = d.titulares[i];
    if (!t) return;
    const x = cx0 + (p.x / 100) * cw;
    const y = campoTop + (yEnCampo(p.y, recorte) / 100) * ch;
    // Que la ficha y su nombre no se salgan del campo por abajo ni por arriba
    const limiteAbajo = campoTop + ch - r * 2.25 - 16;
    const yFicha = Math.max(campoTop + r + 16, Math.min(y - r * 0.4, limiteAbajo));
    ficha(ctx, x, yFicha, r, t.dorsal, t.nombre, Math.min(r * 3.8, cw * 0.25));
  });

  // Recuadro de suplentes (solo los que haya, sin huecos vacíos)
  let y = campoTop + ch + 50;
  if (d.suplentes.length) {
    rectRedondo(ctx, M, y, W - 2 * M, altoSup, 30);
    ctx.lineWidth = 8;
    ctx.strokeStyle = NEGRO;
    ctx.stroke();
    ctx.fillStyle = NEGRO;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = `900 100px ${DISPLAY}`;
    ctx.fillText("SUPLENTES", M + 50, y + 118);
    const colW = (W - 2 * M - 100) / 2;
    d.suplentes.forEach((s, i) => {
      const col = i % 2, fila = Math.floor(i / 2);
      const fx = M + 50 + col * colW, fy = y + 150 + fila * 155 + 64;
      ficha(ctx, fx + 62, fy, 62, s.dorsal);
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = NEGRO;
      texto(ctx, s.nombre, fx + 160, fy + 4, colW - 190, 700, 80, TEXTO, 44);
    });
    y += altoSup + 50;
  }

  // Línea de notas
  if (lineasNotas) {
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = NEGRO;
    ctx.font = `800 62px ${DISPLAY}`;
    ctx.fillText("NOTAS", M, y + 60);
    ctx.font = `600 60px ${TEXTO}`;
    const palabras = d.notas.trim().split(/\s+/);
    const maxW = W - 2 * M - 230;
    let linea = "", n = 0;
    for (const pal of palabras) {
      const prueba = linea ? linea + " " + pal : pal;
      if (ctx.measureText(prueba).width > maxW && linea) {
        ctx.fillText(linea, M + 230, y + 60 + n * 80);
        n++; linea = pal;
        if (n >= 2) break;
      } else linea = prueba;
    }
    if (n < 2 && linea) ctx.fillText(linea, M + 230, y + 60 + n * 80);
  }

  // Pie
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = GRIS;
  ctx.font = `600 34px ${TEXTO}`;
  ctx.fillText("Hecho con Míster", W - M, H - M + 30);
}

const limpio = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
export const nombreArchivo = (d: DatosHoja, ext: string) => `alineacion-${limpio(d.rival) || "partido"}-${limpio(d.fecha)}.${ext}`;

export async function descargarPdf(canvas: HTMLCanvasElement, nombre: string) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297, undefined, "FAST");
  pdf.save(nombre);
}

/** Comparte la hoja como imagen (WhatsApp, etc.). Si el móvil no deja compartir, la descarga. */
export async function compartirImagen(canvas: HTMLCanvasElement, nombre: string, titulo: string): Promise<"compartida" | "descargada" | "cancelada"> {
  const blob: Blob = await new Promise((ok, mal) => canvas.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo crear la imagen"))), "image/png"));
  const archivo = new File([blob], nombre, { type: "image/png" });
  if (navigator.canShare?.({ files: [archivo] })) {
    try { await navigator.share({ files: [archivo], title: titulo }); return "compartida"; }
    catch (e) { if ((e as Error).name === "AbortError") return "cancelada"; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "descargada";
}
