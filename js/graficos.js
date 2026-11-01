/* =============================================================
   GRAFICOS.JS · Gráficos dibujados a mano en SVG
   -------------------------------------------------------------
   SVG es un formato de dibujo con "instrucciones": un círculo aquí,
   una línea allá… El navegador lo pinta nítido a cualquier tamaño.
   No usamos ninguna librería externa: así la app es más ligera,
   funciona sin internet y puedes ver cómo se construye un gráfico.
   ============================================================= */

const Graficos = {
  /* ---------- GRÁFICO DE RADAR (tela de araña) ----------
     series: [{ color, valores: { defensa: 7, ataque: 5, ... }, relleno: true }]
     Cada eje es un aspecto (defensa, ataque…). Cuanto más lejos del centro, mejor. */
  radar(series, { tam = 280, max = 10 } = {}) {
    const aspectos = DB.ASPECTOS;
    const c = tam / 2;             // centro del dibujo
    const r = tam / 2 - 46;        // radio (dejamos margen para los textos)
    const n = aspectos.length;

    // Convierte "aspecto número i con valor v" en coordenadas x,y
    const punto = (i, v) => {
      const angulo = (Math.PI * 2 * i) / n - Math.PI / 2; // empezamos arriba
      const d = (v / max) * r;
      return [c + d * Math.cos(angulo), c + d * Math.sin(angulo)];
    };

    let svg = `<svg class="grafico" viewBox="0 0 ${tam} ${tam}" role="img" aria-label="Gráfico de valoraciones">`;

    // Anillos de fondo (2, 4, 6, 8, 10)
    for (let nivel = 2; nivel <= max; nivel += 2) {
      const pts = aspectos.map((_, i) => punto(i, nivel).join(',')).join(' ');
      svg += `<polygon points="${pts}" class="rejilla" stroke-width="1"/>`;
    }
    // Ejes y nombres de cada aspecto
    aspectos.forEach((a, i) => {
      const [x, y] = punto(i, max);
      const [tx, ty] = punto(i, max + 2.6);
      svg += `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" class="rejilla"/>`;
      svg += `<text x="${tx}" y="${ty + 4}" text-anchor="middle" style="font-weight:600;font-size:12px">${a.nombre}</text>`;
    });
    // Las series (normalmente una: el jugador; a veces dos para comparar)
    series.forEach((s) => {
      const pts = aspectos.map((a, i) => punto(i, Number(s.valores[a.id]) || 0));
      svg += `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="${s.color}" fill-opacity="${s.relleno === false ? 0 : 0.22}" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" ${s.discontinua ? 'stroke-dasharray="5 4"' : ''}>
        <animate attributeName="fill-opacity" from="0" to="${s.relleno === false ? 0 : 0.22}" dur=".6s"/></polygon>`;
      if (s.relleno !== false) {
        pts.forEach(([x, y], i) => {
          svg += `<circle cx="${x}" cy="${y}" r="4.5" fill="${s.color}" stroke="var(--superficie)" stroke-width="2"><title>${aspectos[i].nombre}: ${s.valores[aspectos[i].id]}</title></circle>`;
        });
      }
    });
    return svg + '</svg>';
  },

  /* ---------- GRÁFICO DE LÍNEAS (evolución en el tiempo) ----------
     etiquetas: ['1 sep', '15 oct', ...] (eje horizontal)
     series: [{ nombre, color, valores: [6, 7, 7.5, ...], gruesa: true }] */
  lineas(etiquetas, series, { ancho = 520, alto = 240, min = 0, max = 10 } = {}) {
    const m = { izq: 30, der: 14, arr: 14, aba: 30 }; // márgenes
    const w = ancho - m.izq - m.der;
    const h = alto - m.arr - m.aba;
    const nPuntos = Math.max(etiquetas.length, 1);
    const x = (i) => m.izq + (nPuntos === 1 ? w / 2 : (i * w) / (nPuntos - 1));
    const y = (v) => m.arr + h - ((v - min) / (max - min)) * h;

    let svg = `<svg class="grafico" viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="Gráfico de evolución">`;
    // Líneas horizontales de referencia
    for (let v = min; v <= max; v += 2) {
      svg += `<line x1="${m.izq}" x2="${ancho - m.der}" y1="${y(v)}" y2="${y(v)}" class="rejilla" stroke-dasharray="${v === min ? '' : '3 4'}"/>`;
      svg += `<text x="${m.izq - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    }
    // Fechas en el eje de abajo (si hay muchas, mostramos solo algunas)
    const salto = Math.ceil(nPuntos / 6);
    etiquetas.forEach((e, i) => {
      if (i % salto === 0 || i === nPuntos - 1) {
        svg += `<text x="${x(i)}" y="${alto - 8}" text-anchor="middle">${UI.esc(e)}</text>`;
      }
    });
    // Cada serie es una línea con sus puntos
    series.forEach((s) => {
      const camino = s.valores.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');
      if (s.gruesa) {
        // Área sombreada bajo la línea principal
        svg += `<path d="${camino} L${x(s.valores.length - 1)},${y(min)} L${x(0)},${y(min)} Z" fill="${s.color}" fill-opacity=".08"/>`;
      }
      svg += `<path d="${camino}" fill="none" stroke="${s.color}" stroke-width="${s.gruesa ? 3.5 : 2}" stroke-linecap="round" stroke-linejoin="round" ${s.gruesa ? '' : 'opacity=".85"'}/>`;
      s.valores.forEach((v, i) => {
        svg += `<circle cx="${x(i)}" cy="${y(v)}" r="${s.gruesa ? 4.5 : 3}" fill="${s.color}" stroke="var(--superficie)" stroke-width="1.5"><title>${s.nombre}: ${Number(v).toFixed(1)} (${etiquetas[i]})</title></circle>`;
      });
    });
    return svg + '</svg>';
  },

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
