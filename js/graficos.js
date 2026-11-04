/* =============================================================
   GRAFICOS.JS · Gráficos dibujados a mano en SVG
   -------------------------------------------------------------
   SVG es un formato de dibujo con "instrucciones": un círculo aquí,
   una línea allá… El navegador lo pinta nítido a cualquier tamaño.
   No usamos ninguna librería externa: así la app es más ligera,
   funciona sin internet y puedes ver cómo se construye un gráfico.
   ============================================================= */

const Graficos = {
  // Leyenda de colores para poner debajo de un gráfico
  leyenda(series) {
    return `<div class="leyenda">${series.map((s) => `<span><i style="background:${s.color}"></i>${UI.esc(s.nombre)}</span>`).join('')}</div>`;
  },

  /* ---------- BARRAS VERTICALES ----------
     datos: [{ etiqueta, valor, color }] */
  barras(datos, { ancho = 520, alto = 200 } = {}) {
    const m = { izq: 10, der: 10, arr: 20, aba: 28 };
    const w = ancho - m.izq - m.der;
    const h = alto - m.arr - m.aba;
    const max = Math.max(1, ...datos.map((d) => d.valor));
    const hueco = w / Math.max(datos.length, 1);
    const barra = Math.min(36, hueco * 0.6);
    let svg = `<svg class="grafico" viewBox="0 0 ${ancho} ${alto}" role="img">`;
    svg += `<line x1="${m.izq}" x2="${ancho - m.der}" y1="${m.arr + h}" y2="${m.arr + h}" class="rejilla"/>`;
    datos.forEach((d, i) => {
      const bh = (d.valor / max) * h;
      const bx = m.izq + i * hueco + (hueco - barra) / 2;
      svg += `<rect x="${bx}" y="${m.arr + h - bh}" width="${barra}" height="${bh}" rx="6" fill="${d.color || 'var(--azul)'}"><title>${UI.esc(d.etiqueta)}: ${d.valor}</title></rect>`;
      svg += `<text x="${bx + barra / 2}" y="${m.arr + h - bh - 6}" text-anchor="middle" style="font-weight:700;fill:var(--texto)">${d.valor}</text>`;
      svg += `<text x="${bx + barra / 2}" y="${alto - 8}" text-anchor="middle">${UI.esc(d.etiqueta)}</text>`;
    });
    return svg + '</svg>';
  },
};
