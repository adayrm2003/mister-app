/* =============================================================
   EVOLUCION.JS · Fase 4: evolución del jugador
   -------------------------------------------------------------
   - Historial de valoraciones con fecha (jugador.historial)
   - Gráfico de evolución
   - Notas privadas del entrenador (jugador.notas)
   - Informe de temporada imprimible: #/informe/ID
   Todo esto se añade a la ficha del jugador (plantilla.js).
   ============================================================= */

const Evolucion = {
  TIPOS_NOTA: ['General', 'Actitud', 'Técnica', 'Táctica', 'Físico'],

  /* Historial ordenado por fecha. Si un jugador antiguo no tiene,
     usamos sus valoraciones actuales como primer punto. */
  historial(j) {
    if (j.historial?.length) return [...j.historial].sort((a, b) => a.fecha.localeCompare(b.fecha));
    return [{ fecha: (j.creado || UI.hoyISO()).slice(0, 10), ...(j.valoraciones || {}) }];
  },

  // Añade una valoración al historial (si ya hay una ese día, la sustituye)
  anotar(historial = [], valoraciones, fecha = UI.hoyISO()) {
    const resto = historial.filter((h) => h.fecha !== fecha);
    return [...resto, { fecha, ...valoraciones }].sort((a, b) => a.fecha.localeCompare(b.fecha));
  },

  media(v) {
    return DB.ASPECTOS.reduce((s, a) => s + (Number(v[a.id]) || 0), 0) / DB.ASPECTOS.length;
  },

  // Temporada de fútbol (de agosto a julio): "2026/27"
  temporada(fecha = UI.hoyISO()) {
    const [a, m] = fecha.split('-').map(Number);
    const inicio = m >= 8 ? a : a - 1;
    return `${inicio}/${String(inicio + 1).slice(2)}`;
  },

  // Gráfico de líneas con las 4 valoraciones y la media
  grafico(j) {
    const h = Evolucion.historial(j);
    const etiquetas = h.map((x) => new Date(x.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', ''));
    const series = [
      ...DB.ASPECTOS.map((a) => ({ nombre: a.nombre, color: a.color, valores: h.map((x) => Number(x[a.id]) || 0) })),
      { nombre: 'Media', color: 'var(--texto)', gruesa: true, valores: h.map((x) => Evolucion.media(x)) },
    ];
    return Graficos.lineas(etiquetas, series) + Graficos.leyenda(series);
  },

  // Diferencia entre la primera y la última valoración: "+1.5"
  progreso(j) {
    const h = Evolucion.historial(j);
    if (h.length < 2) return null;
    return Evolucion.media(h[h.length - 1]) - Evolucion.media(h[0]);
  },
};

/* ---------- BLOQUES QUE SE AÑADEN A LA FICHA DEL JUGADOR ---------- */
(Vistas.jugador.extras = Vistas.jugador.extras || []).push(
  // 1. Temporada en números (partidos, goles, asistencia a entrenos)
  (j) => {
    const t = Partidos.totalesJugador(j.id);
    const a = Entrenos.asistenciaJugador(j.id);
    return `
      <section class="tarjeta ancho-total">
        <h2>Temporada ${Evolucion.temporada()}</h2>
        <div class="cifras mt">
          <div class="cifra"><b>${t.partidos}</b><span>Partidos</span></div>
          <div class="cifra"><b>${t.minutos}</b><span>Minutos</span></div>
          <div class="cifra"><b>${t.goles}</b><span>Goles</span></div>
          <div class="cifra"><b>${t.asistencias}</b><span>Asistencias</span></div>
          <div class="cifra"><b>${t.amarillas + t.rojas}</b><span>Tarjetas</span></div>
          <div class="cifra"><b>${a.pct ?? '—'}${a.pct !== null ? '%' : ''}</b><span>Asist. entrenos</span></div>
        </div>
      </section>`;
  },

  // 2. Evolución de las valoraciones
  (j) => {
    const h = Evolucion.historial(j);
    const prog = Evolucion.progreso(j);
    return `
      <section class="tarjeta ancho-total">
        <div class="parte-cab">
          <div style="flex:1"><h2>Evolución</h2><span class="texto-suave peq">${h.length} valoraci${h.length === 1 ? 'ón' : 'ones'}${prog !== null ? ` · <b style="color:${prog >= 0 ? 'var(--verde)' : 'var(--rojo)'}">${prog >= 0 ? '+' : ''}${prog.toFixed(1)}</b> desde la primera` : ''}</span></div>
          <button class="btn btn-primario btn-peq" data-accion="nueva-valoracion" data-id="${j.id}">${UI.icono('mas')} Valorar</button>
        </div>
        <div class="mt">${h.length > 1 ? Evolucion.grafico(j) : '<p class="texto-suave peq">Cuando valores al jugador en otra fecha, aquí verás su evolución. Pulsa «Valorar» (por ejemplo, una vez al mes).</p>'}</div>
        ${h.length > 1 ? `<details class="mt"><summary class="peq" style="cursor:pointer;font-weight:600">Ver historial</summary>
          <div class="tabla-scroll"><table class="tabla mt">
            <thead><tr><th>Fecha</th>${DB.ASPECTOS.map((a) => `<th>${a.nombre.slice(0, 3)}</th>`).join('')}<th>Media</th><th></th></tr></thead>
            <tbody>${[...h].reverse().map((x) => `<tr><td>${UI.fechaCorta(x.fecha)}</td>${DB.ASPECTOS.map((a) => `<td>${x[a.id]}</td>`).join('')}<td><b>${Evolucion.media(x).toFixed(1)}</b></td>
              <td><button class="btn btn-icono" style="width:32px;min-height:32px;background:none" data-accion="borrar-valoracion" data-id="${j.id}" data-fecha="${x.fecha}" aria-label="Borrar valoración">${UI.icono('papelera', 'peq')}</button></td></tr>`).join('')}</tbody>
          </table></div></details>` : ''}
      </section>`;
  },

  // 3. Notas privadas del entrenador
  (j) => {
    const notas = [...(j.notas || [])].sort((a, b) => b.fecha.localeCompare(a.fecha));
    return `
      <section class="tarjeta ancho-total">
        <div class="parte-cab">
          <div class="icono-parte" style="--c:var(--texto-suave)">${UI.icono('candado')}</div>
          <div style="flex:1"><h2>Notas privadas</h2><span class="texto-suave peq">Solo las ves tú, en este dispositivo</span></div>
          <button class="btn btn-borde btn-peq" data-accion="nueva-nota" data-id="${j.id}">${UI.icono('mas')} Nota</button>
        </div>
        <div class="notas mt">
          ${notas.map((n) => `<div class="nota">
            <div class="nota-cab"><span class="etiqueta gris">${UI.esc(n.tipo || 'General')}</span><span class="texto-suave peq">${UI.fechaCorta(n.fecha)}</span>
              <button class="btn btn-icono" style="width:30px;min-height:30px;background:none;margin-left:auto" data-accion="borrar-nota" data-id="${j.id}" data-nota="${n.id}" aria-label="Borrar nota">${UI.icono('papelera', 'peq')}</button></div>
            <p>${UI.esc(n.texto)}</p></div>`).join('') || '<p class="texto-suave peq">Sin notas. Apunta lo que observes: actitud, mejoras, aspectos a trabajar…</p>'}
        </div>
      </section>`;
  },

  // 4. Botón del informe
  (j) => `<a class="btn btn-rojo btn-bloque ancho-total" href="#/informe/${j.id}">${UI.icono('imprimir')} Informe de temporada (PDF)</a>`,
);

/* ---------- PANTALLA: INFORME DE TEMPORADA ----------
   Pensada para imprimir o "Guardar como PDF" desde el navegador. */
Vistas.informe = {
  tab: 'plantilla',
  titulo: 'Informe',
  conNotas: false,

  pintar(id) {
    const j = DB.obtener('jugadores', id);
    this.atras = '#/jugador/' + id;
    if (!j) return UI.vacio('nota', 'Jugador no encontrado', '');
    const cat = DB.categoria(j.categoria);
    const h = Evolucion.historial(j);
    const primera = h[0], ultima = h[h.length - 1];
    const t = Partidos.totalesJugador(j.id);
    const a = Entrenos.asistenciaJugador(j.id);
    const prog = Evolucion.progreso(j);
    const entrenador = DB.ajuste('entrenador');
    // En el papel, los gráficos usan colores fijos (no dependen del modo oscuro)
    const notas = [...(j.notas || [])].sort((x, y) => x.fecha.localeCompare(y.fecha));

    return `
      <div class="fila-botones no-imprimir" style="margin-bottom:14px">
        <button class="btn btn-primario" data-accion="imprimir">${UI.icono('imprimir')} Imprimir / Guardar PDF</button>
        <label class="chip-check"><input type="checkbox" data-al-cambiar="informe-notas" ${this.conNotas ? 'checked' : ''}><span>Incluir notas privadas</span></label>
      </div>
      <p class="texto-suave peq no-imprimir">Consejo: en el diálogo de imprimir, elige «Guardar como PDF» como destino.</p>

      <article class="informe">
        <header class="inf-cab">
          <img src="assets/icons/escudo-512.png" alt="Escudo C.D. El Tranvía">
          <div>
            <div class="inf-club">C.D. EL TRANVÍA</div>
            <div class="inf-sub">Santa Cruz de Tenerife · Fútbol base</div>
          </div>
          <div class="inf-temp">INFORME DE TEMPORADA<b>${Evolucion.temporada()}</b></div>
        </header>
        <div class="inf-franja"></div>

        <section class="inf-jugador">
          <div class="avatar gran" style="--c1:${cat.color};--c2:${cat.color2}">${UI.esc(UI.iniciales(j.nombre))}</div>
          <div style="flex:1">
            <h1>${UI.esc(j.nombre)}</h1>
            <p>${cat.nombre} (${cat.edades}) · ${UI.esc(j.posicion || '')}${j.dorsal ? ' · Dorsal ' + UI.esc(j.dorsal) : ''}</p>
          </div>
          <table class="inf-datos"><tr><td>Edad</td><td>${j.edad} años</td></tr><tr><td>Altura</td><td>${j.altura || '—'} cm</td></tr><tr><td>Peso</td><td>${j.peso || '—'} kg</td></tr></table>
        </section>

        <h2 class="inf-h2">Números de la temporada</h2>
        <div class="inf-cifras">
          ${[['Partidos', t.partidos], ['Minutos', t.minutos], ['Goles', t.goles], ['Asistencias', t.asistencias], ['Convocatorias', t.convocatorias], ['Asist. entrenos', a.pct !== null ? a.pct + '%' : '—'], ['Amarillas', t.amarillas], ['Rojas', t.rojas]]
            .map(([n, v]) => `<div><b>${v}</b><span>${n}</span></div>`).join('')}
        </div>

        <div class="inf-dos">
          <section>
            <h2 class="inf-h2">Valoración actual</h2>
            ${Graficos.radar([
              ...(h.length > 1 ? [{ color: '#9AA6B2', valores: primera, relleno: false, discontinua: true }] : []),
              { color: '#0272BB', valores: ultima },
            ], { tam: 260 })}
            ${h.length > 1 ? `<div class="leyenda"><span><i style="background:#0272BB"></i>Ahora (${UI.fechaCorta(ultima.fecha)})</span><span><i style="background:#9AA6B2"></i>Inicio (${UI.fechaCorta(primera.fecha)})</span></div>` : ''}
          </section>
          <section>
            <h2 class="inf-h2">Detalle</h2>
            <table class="tabla inf-tabla">
              <thead><tr><th>Aspecto</th>${h.length > 1 ? '<th>Inicio</th>' : ''}<th>Ahora</th>${h.length > 1 ? '<th>Cambio</th>' : ''}</tr></thead>
              <tbody>
                ${DB.ASPECTOS.map((asp) => {
                  const d = (Number(ultima[asp.id]) || 0) - (Number(primera[asp.id]) || 0);
                  return `<tr><td>${asp.nombre}</td>${h.length > 1 ? `<td>${primera[asp.id]}</td>` : ''}<td><b>${ultima[asp.id]}</b></td>${h.length > 1 ? `<td class="${d > 0 ? 'txt-V' : d < 0 ? 'txt-D' : ''}">${d > 0 ? '+' : ''}${d}</td>` : ''}</tr>`;
                }).join('')}
                <tr><td><b>Media</b></td>${h.length > 1 ? `<td>${Evolucion.media(primera).toFixed(1)}</td>` : ''}<td><b>${Evolucion.media(ultima).toFixed(1)}</b></td>${h.length > 1 ? `<td class="${prog >= 0 ? 'txt-V' : 'txt-D'}"><b>${prog >= 0 ? '+' : ''}${prog.toFixed(1)}</b></td>` : ''}</tr>
              </tbody>
            </table>
          </section>
        </div>

        ${h.length > 1 ? `<h2 class="inf-h2">Evolución</h2>${Evolucion.grafico(j)}` : ''}

        <h2 class="inf-h2">Valoración del entrenador</h2>
        <textarea class="inf-comentario no-imprimir" data-al-cambiar="comentario-informe" data-id="${j.id}" placeholder="Escribe aquí un comentario para el informe: progresos, puntos fuertes, objetivos para la próxima temporada…">${UI.esc(j.comentarioInforme)}</textarea>
        <p class="inf-comentario-impreso">${UI.esc(j.comentarioInforme || '')}</p>

        ${this.conNotas && notas.length ? `<h2 class="inf-h2">Observaciones durante la temporada</h2>
          <ul class="inf-notas">${notas.map((n) => `<li><b>${UI.fechaCorta(n.fecha)} · ${UI.esc(n.tipo || 'General')}:</b> ${UI.esc(n.texto)}</li>`).join('')}</ul>` : ''}

        <footer class="inf-pie">
          <div>Firma: ${entrenador ? UI.esc(entrenador) : '______________________'}<br><small>Entrenador/a</small></div>
          <div>${UI.mayuscula(UI.fechaLarga(UI.hoyISO()))}</div>
        </footer>
      </article>
    `;
  },
};

/* ---------- ACCIONES ---------- */
Acciones['nueva-valoracion'] = (el) => {
  const j = DB.obtener('jugadores', el.dataset.id);
  const v = j.valoraciones || {};
  const form = UI.modal({
    titulo: `Valorar a ${j.nombre}`,
    cuerpo: `
      <div class="campo"><label for="v-fecha">Fecha</label><input type="date" id="v-fecha" name="fecha" value="${UI.hoyISO()}" max="${UI.hoyISO()}"></div>
      ${DB.ASPECTOS.map((a) => `
        <div class="valoracion">
          <div class="valoracion-cab"><label for="f-${a.id}">${a.nombre}</label><output id="o-${a.id}" style="color:${a.color}">${v[a.id] || 5}</output></div>
          <input type="range" id="f-${a.id}" name="${a.id}" min="1" max="10" step="1" value="${v[a.id] || 5}" style="--p:${((v[a.id] || 5) - 1) * 11.11}%">
        </div>`).join('')}
      <p class="texto-suave peq">Partimos de su valoración actual: mueve solo lo que haya cambiado.</p>`,
    alGuardar: (f) => {
      const d = UI.leerFormulario(f);
      const valores = Object.fromEntries(DB.ASPECTOS.map((a) => [a.id, Number(d[a.id])]));
      const historial = Evolucion.anotar(Evolucion.historial(j), valores, d.fecha || UI.hoyISO());
      // La valoración "actual" es siempre la más reciente
      const ultima = historial[historial.length - 1];
      DB.actualizar('jugadores', j.id, { historial, valoraciones: Object.fromEntries(DB.ASPECTOS.map((a) => [a.id, ultima[a.id]])) });
      UI.aviso('Valoración guardada');
      App.refrescar();
    },
  });
  form.querySelectorAll('input[type=range]').forEach((r) => r.addEventListener('input', () => {
    form.querySelector('#o-' + r.name).textContent = r.value;
    r.style.setProperty('--p', (r.value - 1) * 11.11 + '%');
  }));
};

Acciones['borrar-valoracion'] = async (el) => {
  const j = DB.obtener('jugadores', el.dataset.id);
  const h = Evolucion.historial(j);
  if (h.length <= 1) { UI.aviso('Debe quedar al menos una valoración', 'error'); return; }
  if (!(await UI.confirmar(`Se borrará la valoración del ${UI.fechaCorta(el.dataset.fecha)}.`))) return;
  const historial = h.filter((x) => x.fecha !== el.dataset.fecha);
  const ultima = historial[historial.length - 1];
  DB.actualizar('jugadores', j.id, { historial, valoraciones: Object.fromEntries(DB.ASPECTOS.map((a) => [a.id, ultima[a.id]])) });
  App.refrescar();
};

Acciones['nueva-nota'] = (el) => {
  const j = DB.obtener('jugadores', el.dataset.id);
  UI.modal({
    titulo: `Nota sobre ${j.nombre}`,
    cuerpo: `
      <div class="aviso-info azul">${UI.icono('candado')}<div>Las notas son privadas. Escribe observaciones deportivas; evita datos de salud o familiares.</div></div>
      <div class="rejilla-2">
        <div class="campo"><label for="n-tipo">Tipo</label><select id="n-tipo" name="tipo">${Evolucion.TIPOS_NOTA.map((t) => `<option>${t}</option>`).join('')}</select></div>
        <div class="campo"><label for="n-fecha">Fecha</label><input type="date" id="n-fecha" name="fecha" value="${UI.hoyISO()}"></div>
      </div>
      <div class="campo"><label for="n-texto">Nota *</label><textarea id="n-texto" name="texto" maxlength="600" placeholder="Ej.: Mejora mucho la orientación del cuerpo al recibir."></textarea></div>`,
    alGuardar: (f) => {
      const d = UI.leerFormulario(f);
      if (!d.texto) { UI.aviso('Escribe la nota', 'error'); return false; }
      DB.actualizar('jugadores', j.id, { notas: [...(j.notas || []), { id: UI.id(), fecha: d.fecha || UI.hoyISO(), tipo: d.tipo, texto: d.texto }] });
      UI.aviso('Nota guardada');
      App.refrescar();
    },
  });
};

Acciones['borrar-nota'] = async (el) => {
  if (!(await UI.confirmar('Se borrará esta nota.'))) return;
  const j = DB.obtener('jugadores', el.dataset.id);
  DB.actualizar('jugadores', j.id, { notas: (j.notas || []).filter((n) => n.id !== el.dataset.nota) });
  App.refrescar();
};

Acciones['imprimir'] = () => window.print();

Acciones['informe-notas'] = (el) => {
  Vistas.informe.conNotas = el.checked;
  App.refrescar();
};

Acciones['comentario-informe'] = (el) => {
  DB.actualizar('jugadores', el.dataset.id, { comentarioInforme: el.value.trim() });
  document.querySelector('.inf-comentario-impreso').textContent = el.value.trim();
  UI.aviso('Comentario guardado');
};
