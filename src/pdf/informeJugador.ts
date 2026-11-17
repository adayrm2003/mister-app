// Informe de un jugador para su familia: A4 con sus datos del periodo (partidos, minutos, goles,
// asistencias, asistencia a partidos y entrenos) y el comentario que el entrenador escribe en el momento.
// No lleva las valoraciones del entrenador (son privadas).
import type { PartidoJugador } from "../datos/estadisticas";

export interface DatosInforme {
  jugador: string;
  dorsal: number | null;
  posicion: string;
  equipo: string;
  club?: string;
  escudo?: string | null;
  periodo: string;
  cifras: [string, string][];
  partidos: PartidoJugador[];
  comentario: string;
  entrenador: string;
}

const M = 16, ANCHO = 210, ALTO = 297;
const VERDE: [number, number, number] = [26, 127, 83];

export async function crearInformePdf(d: DatosInforme): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const util = ANCHO - 2 * M;
  let y = M;
  const espacio = (h: number) => { if (y + h > ALTO - M - 10) { pdf.addPage(); y = M; } };

  // Cabecera con escudo
  let x = M;
  if (d.escudo) {
    try { pdf.addImage(d.escudo, "PNG", M, y, 22, 22); x = M + 27; } catch { /* sin escudo */ }
  }
  pdf.setTextColor(90); pdf.setFont("helvetica", "bold"); pdf.setFontSize(10);
  pdf.text(`${d.club ? d.club.toUpperCase() + " · " : ""}${d.equipo.toUpperCase()}`, x, y + 5);
  pdf.setTextColor(0); pdf.setFontSize(24);
  pdf.text(`${d.dorsal != null ? d.dorsal + " · " : ""}${d.jugador}`, x, y + 14);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(11); pdf.setTextColor(70);
  pdf.text(`${d.posicion} · Informe de ${d.periodo}`, x, y + 21);
  y += 30;
  pdf.setDrawColor(...VERDE); pdf.setLineWidth(0.8); pdf.line(M, y, ANCHO - M, y); y += 8;

  // Cifras en cajas (2 filas de 4 como mucho)
  const porFila = 4, ancho = (util - (porFila - 1) * 4) / porFila, alto = 20;
  d.cifras.forEach(([k, v], i) => {
    const col = i % porFila;
    if (col === 0 && i) y += alto + 4;
    const cx = M + col * (ancho + 4);
    pdf.setFillColor(240, 245, 242); pdf.roundedRect(cx, y, ancho, alto, 2.5, 2.5, "F");
    pdf.setTextColor(0); pdf.setFont("helvetica", "bold"); pdf.setFontSize(17); pdf.text(String(v), cx + ancho / 2, y + 10, { align: "center" });
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.setTextColor(80); pdf.text(k, cx + ancho / 2, y + 16, { align: "center" });
  });
  y += alto + 10;

  // Partido a partido
  if (d.partidos.length) {
    espacio(16);
    pdf.setTextColor(...VERDE); pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.text("Partido a partido", M, y); y += 6;
    const cols: [string, number, "left" | "center"][] = [["Fecha", 22, "left"], ["Rival", 64, "left"], ["Res.", 18, "center"], ["Jugó", 26, "center"], ["Min", 16, "center"], ["Goles", 16, "center"], ["Asist.", 16, "center"]];
    const fila = (vals: string[], negrita: boolean, fondo: boolean) => {
      espacio(7);
      if (fondo) { pdf.setFillColor(247, 247, 247); pdf.rect(M, y - 4.6, util, 6.6, "F"); }
      pdf.setFont("helvetica", negrita ? "bold" : "normal"); pdf.setFontSize(9.5); pdf.setTextColor(negrita ? 60 : 0);
      let cx = M;
      cols.forEach(([, w, al], i) => {
        const t = pdf.splitTextToSize(vals[i], w - 2)[0] ?? "";
        pdf.text(t, al === "center" ? cx + w / 2 : cx + 1, y, { align: al });
        cx += w;
      });
      y += 6.6;
    };
    fila(cols.map(([t]) => t), true, false);
    d.partidos.forEach((h, i) => {
      const f = new Date(h.partido.fecha + "T12:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" });
      fila([f, `${h.partido.casa ? "" : "@ "}${h.partido.rival}`, `${h.nuestros}-${h.suyos}`, h.convocado ? (h.titular ? "Titular" : h.minutos ? "Suplente" : "Convocado") : "No conv.",
        String(h.minutos), h.goles ? String(h.goles) : "–", h.asistencias ? String(h.asistencias) : "–"], false, i % 2 === 0);
    });
    y += 6;
  }

  // Comentario del entrenador
  if (d.comentario.trim()) {
    espacio(20);
    pdf.setTextColor(...VERDE); pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.text("Comentario del entrenador", M, y); y += 7;
    pdf.setTextColor(0); pdf.setFont("helvetica", "normal"); pdf.setFontSize(11);
    for (const l of pdf.splitTextToSize(d.comentario.trim(), util) as string[]) { espacio(6); pdf.text(l, M, y); y += 5.6; }
    y += 4;
  }

  // Pie
  const total = pdf.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    pdf.setPage(p);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.setTextColor(120);
    pdf.text(`${d.entrenador ? `Entrenador: ${d.entrenador} · ` : ""}Hecho con Míster · ${new Date().toLocaleDateString("es-ES")}`, M, ALTO - 9);
    if (total > 1) pdf.text(`${p}/${total}`, ANCHO - M, ALTO - 9, { align: "right" });
  }
  return pdf.output("blob");
}
