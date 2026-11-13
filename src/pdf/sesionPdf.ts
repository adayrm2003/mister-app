// PDF de una sesión de entrenamiento: A4 vertical, texto claro y apto para imprimir en blanco y negro.
import { createElement } from "react";
import type { Ajustes } from "../datos/modelo";
import type { Ejercicio } from "../datos/pizarra";
import { minutosDe, textoMinutos, type GrupoFase, type Sesion } from "../datos/sesion";

const MM = { margen: 16, ancho: 210, alto: 297 };

/** Dibujo del primer paso de la pizarra como imagen PNG (solo si el ejercicio tiene dibujo). */
async function imagenPizarra(e: Ejercicio, ajustes: Ajustes): Promise<{ datos: string; proporcion: number } | null> {
  if (!e.pizarra.piezas.length) return null;
  const [{ renderToStaticMarkup }, { PizarraMini }] = await Promise.all([import("react-dom/server"), import("../componentes/Pizarra")]);
  let svg = renderToStaticMarkup(createElement(PizarraMini, { pizarra: e.pizarra, colorEquipo: ajustes.colorEquipo, colorRival: ajustes.colorRival }));
  svg = svg.replace(/var\(--campo-a\)/g, "#3A8C5C").replace(/var\(--campo-b\)/g, "#348053").replace(/var\(--amarilla\)/g, "#F5C518");
  if (!svg.includes("xmlns=")) svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  const alto = e.pizarra.campo === "completo" ? 1050 : 545;
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await img.decode();
  const c = document.createElement("canvas");
  c.width = 1000; c.height = Math.round((1000 * alto) / 680);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return { datos: c.toDataURL("image/jpeg", 0.85), proporcion: alto / 680 };
}

export async function descargarPdfSesion(s: Sesion, grupos: GrupoFase[], ejercicios: Map<string, Ejercicio>, equipo: string, ajustes: Ajustes) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const anchoUtil = MM.ancho - 2 * MM.margen;
  let y = MM.margen;

  const espacio = (h: number) => { if (y + h > MM.alto - MM.margen - 8) { pdf.addPage(); y = MM.margen; } };
  const parrafo = (texto: string, tam: number, estilo: "normal" | "bold" = "normal", sangria = 0, color = 0) => {
    pdf.setFont("helvetica", estilo); pdf.setFontSize(tam); pdf.setTextColor(color);
    const lineas: string[] = pdf.splitTextToSize(texto, anchoUtil - sangria);
    const alto = tam * 0.42;
    for (const l of lineas) { espacio(alto); pdf.text(l, MM.margen + sangria, y + alto * 0.8); y += alto; }
  };

  // Cabecera
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor(90);
  pdf.text(`SESIÓN DE ENTRENAMIENTO · ${equipo.toUpperCase()}`, MM.margen, y + 3); y += 7;
  parrafo(s.nombre, 22, "bold");
  y += 1;
  const total = s.bloques.reduce((t, b) => t + minutosDe(b, ejercicios.get(b.ejercicioId)), 0);
  parrafo(`Duración total: ${textoMinutos(total)}  ·  ${s.bloques.length} ejercicios`, 11, "bold", 0, 60);
  if (s.objetivo) { y += 1; parrafo(`Objetivo: ${s.objetivo}`, 11); }
  y += 3;
  pdf.setDrawColor(0); pdf.setLineWidth(0.6); pdf.line(MM.margen, y, MM.ancho - MM.margen, y); y += 5;

  // Fases y ejercicios
  for (const [gi, g] of grupos.entries()) {
    espacio(18);
    pdf.setFillColor(232, 232, 232); pdf.rect(MM.margen, y, anchoUtil, 9, "F");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.setTextColor(0);
    pdf.text(`${gi + 1}. ${g.fase.nombre.toUpperCase()}`, MM.margen + 3, y + 6.3);
    pdf.text(textoMinutos(g.minutos), MM.ancho - MM.margen - 3, y + 6.3, { align: "right" });
    y += 13;

    for (const b of g.bloques) {
      const e = ejercicios.get(b.ejercicioId);
      espacio(20);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.setTextColor(0);
      const titulo: string[] = pdf.splitTextToSize(e?.nombre ?? "Ejercicio borrado", anchoUtil - 22);
      titulo.forEach((l, k) => { pdf.text(l, MM.margen, y + 4.5 + k * 5.5); });
      pdf.text(`${minutosDe(b, e)} min`, MM.ancho - MM.margen, y + 4.5, { align: "right" });
      y += titulo.length * 5.5 + 1.5;
      if (e) {
        const tipo = ajustes.tiposEjercicio.find((t) => t.id === e.tipo)?.nombre;
        const meta = [tipo, e.jugadores ? `${e.jugadores} jugadores` : "", e.material ? `Material: ${e.material}` : ""].filter(Boolean).join("  ·  ");
        if (meta) parrafo(meta, 9.5, "normal", 0, 80);
        if (b.notas) parrafo(`Hoy: ${b.notas}`, 10.5, "bold");
        if (e.objetivo) parrafo(`Objetivo: ${e.objetivo}`, 10.5);
        if (e.explicacion) {
          y += 1;
          for (const linea of e.explicacion.split(/\r?\n/).filter((l) => l.trim())) {
            const m = linea.match(/^([^:]{2,24}):\s*(.*)$/);
            if (m) {
              pdf.setFont("helvetica", "bold"); pdf.setFontSize(10.5);
              const ancho = pdf.getTextWidth(m[1] + ": ");
              const resto: string[] = pdf.splitTextToSize(m[2], anchoUtil - ancho);
              espacio(4.5);
              pdf.setTextColor(0); pdf.text(m[1] + ":", MM.margen, y + 3.6);
              pdf.setFont("helvetica", "normal");
              resto.forEach((l, k) => { if (k) espacio(4.5); pdf.text(l, MM.margen + ancho, y + 3.6); y += 4.5; });
              if (!resto.length) y += 4.5;
              y += 0.8;
            } else parrafo(linea, 10.5);
          }
        }
        const img = await imagenPizarra(e, ajustes).catch(() => null);
        if (img) {
          const w = 70, h = w * img.proporcion;
          espacio(h + 3);
          pdf.addImage(img.datos, "JPEG", MM.margen, y + 1, w, h);
          y += h + 3;
        }
      }
      y += 3;
      pdf.setDrawColor(200); pdf.setLineWidth(0.2); pdf.line(MM.margen, y, MM.ancho - MM.margen, y); y += 4;
    }
  }

  if (s.notas) { espacio(14); parrafo("Notas", 12, "bold"); parrafo(s.notas, 10.5); }

  // Pie con número de página
  const paginas = pdf.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    pdf.setPage(p); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.setTextColor(110);
    pdf.text(`${s.nombre} · Página ${p} de ${paginas}`, MM.ancho / 2, MM.alto - 8, { align: "center" });
  }

  const archivo = s.nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "sesion";
  pdf.save(`sesion-${archivo}.pdf`);
}
