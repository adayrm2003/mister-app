/* =============================================================
   INFORME.JS · La temporada de cada jugador
   -------------------------------------------------------------
   - En la ficha del jugador: sus números de la temporada
     (partidos, minutos, goles, asistencia a entrenos…).
   - Informe de temporada imprimible (o en PDF): #/informe/ID
   No hay valoraciones ni notas: solo datos objetivos y un
   comentario del entrenador.
   ============================================================= */

const Informe = {
  // Temporada de fútbol (de agosto a julio): "2026/27"
  temporada(fecha = UI.hoyISO()) {
    const [a, m] = fecha.split('-').map(Number);
    const inicio = m >= 8 ? a : a - 1;
    return `${inicio}/${String(inicio + 1).slice(2)}`;
  },

  // Partidos jugados en los que participó el jugador, con sus números
  partidosDe(jugadorId) {
    return DB.lista('partidos')
      .filter((p) => p.jugado && (p.convocados || []).includes(jugadorId))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((p) => ({ p, s: p.stats?.[jugadorId] || {} }));
  },
};

/* ---------- BLOQUES QUE SE AÑADEN A LA FICHA DEL JUGADOR ---------- */
(Vistas.jugador.extras = Vistas.jugador.extras || []).push(
  // 1. Temporada en números
  (j) => {
    const t = Partidos.totalesJugador(j.id);
    const a = Entrenos.asistenciaJugador(j.id);
    return `
      <section class="tarjeta ancho-total">
        <h2>Temporada ${Informe.temporada()}</h2>
        <div class="cifras mt">
          <div class="cifra"><b>${a.pct ?? '—'}${a.pct !== null ? '%' : ''}</b><span>Asist. entrenos</span></div>
          <div class="cifra"><b>${t.partidos}</b><span>Partidos</span></div>
          <div class="cifra"><b>${t.minutos}</b><span>Minutos</span></div>
          <div class="cifra"><b>${t.goles}</b><span>Goles</span></div>
          <div class="cifra"><b>${t.asistencias}</b><span>Asistencias</span></div>
          <div class="cifra"><b>${t.amarillas + t.rojas}</b><span>Tarjetas</span></div>
        </div>
        ${a.total ? `<p class="texto-suave peq mt">Vino a ${a.presentes} de ${UI.plural(a.total, 'entreno')} con lista pasada.</p>` : ''}
      </section>`;
  },

  // 2. Botón del informe
  (j) => `<a class="btn btn-rojo btn-bloque ancho-total" href="#/informe/${j.id}">${UI.icono('imprimir')} Informe de temporada (PDF)</a>`,
);

/* ---------- PANTALLA: INFORME DE TEMPORADA ----------
   Pensada para imprimir o "Guardar como PDF" desde el navegador. */
Vistas.informe = {
  tab: 'plantilla',
  titulo: 'Informe',

  pintar(id) {
    const j = DB.obtener('jugadores', id);
    this.atras = '#/jugador/' + id;
    if (!j) return UI.vacio('nota', 'Jugador no encontrado', '');
    const eq = DB.obtener('equipos', j.equipoId);
    const cat = DB.categoria(j.categoria);
    const t = Partidos.totalesJugador(j.id);
    const a = Entrenos.asistenciaJugador(j.id);
    const jugados = Informe.partidosDe(j.id);
    const entrenador = DB.ajuste('entrenador');

    return `
      <div class="fila-botones no-imprimir" style="margin-bottom:14px">
        <button class="btn btn-primario" data-accion="imprimir">${UI.icono('imprimir')} Imprimir / Guardar PDF</button>
      </div>
      <p class="texto-suave peq no-imprimir">Consejo: en el diálogo de imprimir, elige «Guardar como PDF» como destino.</p>

      <article class="informe">
        <header class="inf-cab">
          <img src="assets/icons/escudo-512.png" alt="Escudo C.D. El Tranvía">
          <div>
            <div class="inf-club">C.D. EL TRANVÍA</div>
            <div class="inf-sub">Santa Cruz de Tenerife · Fútbol base</div>
          </div>
          <div class="inf-temp">INFORME DE TEMPORADA<b>${Informe.temporada()}</b></div>
        </header>
        <div class="inf-franja"></div>

        <section class="inf-jugador">
          <div class="avatar gran" style="--c1:${cat.color};--c2:${cat.color2}">${UI.esc(UI.iniciales(j.nombre))}</div>
          <div style="flex:1">
            <h1>${UI.esc(j.nombre)}</h1>
            <p>${eq ? UI.esc(eq.nombre) + ' · ' : ''}${cat.nombre} · Pierna ${DB.pierna(j.pierna).nombre.toLowerCase()}</p>
          </div>
        </section>

        <h2 class="inf-h2">Números de la temporada</h2>
        <div class="inf-cifras">
          ${[['Asist. entrenos', a.pct !== null ? a.pct + '%' : '—'], ['Convocatorias', t.convocatorias], ['Partidos', t.partidos], ['Minutos', t.minutos],
            ['Goles', t.goles], ['Asistencias', t.asistencias], ['Amarillas', t.amarillas], ['Rojas', t.rojas]]
            .map(([n, v]) => `<div><b>${v}</b><span>${n}</span></div>`).join('')}
        </div>

        ${jugados.length ? `
        <h2 class="inf-h2">Partido a partido</h2>
        <table class="tabla inf-tabla">
          <thead><tr><th>Fecha</th><th>Rival</th><th>Resultado</th><th>Min</th><th>Goles</th><th>Asist.</th></tr></thead>
          <tbody>${jugados.map(({ p, s }) => `<tr><td>${UI.fechaCorta(p.fecha)}</td><td>${UI.esc(p.rival)}</td><td>${p.golesFavor}-${p.golesContra}</td>
            <td>${Number(s.minutos) || '·'}</td><td>${Number(s.goles) || '·'}</td><td>${Number(s.asistencias) || '·'}</td></tr>`).join('')}</tbody>
        </table>` : ''}

        <h2 class="inf-h2">Valoración del entrenador</h2>
        <textarea class="inf-comentario no-imprimir" data-al-cambiar="comentario-informe" data-id="${j.id}" placeholder="Escribe aquí un comentario para el informe: progresos, actitud, objetivos para la próxima temporada…">${UI.esc(j.comentarioInforme)}</textarea>
        <p class="inf-comentario-impreso">${UI.esc(j.comentarioInforme || '')}</p>

        <footer class="inf-pie">
          <div>Firma: ${entrenador ? UI.esc(entrenador) : '______________________'}<br><small>Entrenador/a</small></div>
          <div>${UI.mayuscula(UI.fechaLarga(UI.hoyISO()))}</div>
        </footer>
      </article>
    `;
  },
};

/* ---------- ACCIONES ---------- */
Acciones['imprimir'] = () => window.print();

Acciones['comentario-informe'] = (el) => {
  DB.actualizar('jugadores', el.dataset.id, { comentarioInforme: el.value.trim() });
  document.querySelector('.inf-comentario-impreso').textContent = el.value.trim();
  UI.aviso('Comentario guardado');
};
