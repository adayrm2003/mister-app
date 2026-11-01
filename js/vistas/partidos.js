/* =============================================================
   PARTIDOS.JS · Fase 3: partidos, calendario, convocatorias y estadísticas
   -------------------------------------------------------------
   #/partidos             -> lista de partidos
   #/partidos/calendario  -> calendario del mes (partidos y entrenos)
   #/partido/ID           -> detalle: resultado, convocatoria, alineación, estadísticas
   ============================================================= */

/* ---------- AYUDAS DE PARTIDOS ---------- */
const Partidos = {
  COMPETICIONES: ['Liga', 'Copa', 'Torneo', 'Amistoso'],
  STATS: [
    { id: 'goles', nombre: 'Goles', corto: '⚽', max: 20 },
    { id: 'asistencias', nombre: 'Asistencias', corto: 'Asist.', max: 20 },
    { id: 'minutos', nombre: 'Minutos', corto: 'Min', max: 120 },
    { id: 'amarillas', nombre: 'Amarillas', corto: '🟨', max: 2 },
    { id: 'rojas', nombre: 'Rojas', corto: '🟥', max: 1 },
  ],

  lista(categoria = DB.ajuste('categoria')) {
    return DB.lista('partidos')
      .filter((p) => !categoria || categoria === 'todas' || p.categoria === categoria)
      .sort((a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || '')));
  },

  // 'V' victoria, 'E' empate, 'D' derrota, o null si no se ha jugado
  resultado(p) {
    if (!p.jugado) return null;
    const f = Number(p.golesFavor) || 0, c = Number(p.golesContra) || 0;
    return f > c ? 'V' : f === c ? 'E' : 'D';
  },

  // Marcador con el local primero: "Tranvía 2 - 1 Rival"
  marcador(p) {
    const nos = 'C.D. El Tranvía';
    return p.lugar === 'fuera'
      ? { local: p.rival, visitante: nos, gl: p.golesContra, gv: p.golesFavor }
      : { local: nos, visitante: p.rival, gl: p.golesFavor, gv: p.golesContra };
  },

  // Suma de estadísticas de un jugador en todos los partidos
  totalesJugador(jugadorId) {
    const t = { partidos: 0, goles: 0, asistencias: 0, minutos: 0, amarillas: 0, rojas: 0, convocatorias: 0 };
    DB.lista('partidos').forEach((p) => {
      if ((p.convocados || []).includes(jugadorId)) t.convocatorias++;
      const s = p.stats?.[jugadorId];
      if (!s || !p.jugado) return;
      if (Number(s.minutos) > 0) t.partidos++;
      Partidos.STATS.forEach((st) => { t[st.id] += Number(s[st.id]) || 0; });
    });
    return t;
  },

  // Balance de victorias, empates y derrotas
  balance(lista) {
    const b = { V: 0, E: 0, D: 0, gf: 0, gc: 0 };
    lista.filter((p) => p.jugado).forEach((p) => {
      b[Partidos.resultado(p)]++;
      b.gf += Number(p.golesFavor) || 0;
      b.gc += Number(p.golesContra) || 0;
    });
    return b;
  },

  // Fila de un partido en las listas
  item(p) {
    const cat = DB.categoria(p.categoria);
    const r = Partidos.resultado(p);
    const d = new Date(p.fecha + 'T12:00:00');
    const derecha = r
      ? `<div class="resultado res-${r}"><b>${p.golesFavor}-${p.golesContra}</b><span>${{ V: 'Victoria', E: 'Empate', D: 'Derrota' }[r]}</span></div>`
      : `<div class="mini-dato"><b>${UI.diasHasta(p.fecha) <= 0 ? 'Hoy' : UI.diasHasta(p.fecha) + 'd'}</b><span>${p.hora || ''}</span></div>`;
    return `
      <a class="item" href="#/partido/${p.id}">
        <div class="fecha-bloque ${r ? 'pasada' : 'partido'}"><b>${d.getDate()}</b><span>${d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}</span></div>
        <div class="item-cuerpo">
          <div class="item-titulo">vs ${UI.esc(p.rival)}</div>
          <div class="item-sub">
            <span class="etiqueta" style="background:color-mix(in srgb, ${cat.color} 15%, transparent);color:${cat.color}">${cat.nombre}</span>
            <span>${p.lugar === 'fuera' ? 'Fuera' : 'Casa'}</span><span>· ${UI.esc(p.competicion || 'Liga')}</span>
          </div>
        </div>
        ${derecha}
      </a>`;
  },

  /* Mensaje de convocatoria bien formateado para WhatsApp.
     En WhatsApp, *texto* sale en negrita y _texto_ en cursiva. */
  textoConvocatoria(p) {
    const cat = DB.categoria(p.categoria);
    const convocados = (p.convocados || []).map((id) => DB.obtener('jugadores', id)).filter(Boolean)
      .sort((a, b) => (Number(a.dorsal) || 99) - (Number(b.dorsal) || 99));
    const entrenador = DB.ajuste('entrenador');
    let t = `⚽ *C.D. EL TRANVÍA · ${cat.nombre.toUpperCase()}*\n`;
    t += `📋 *CONVOCATORIA*\n\n`;
    t += `🆚 *${p.rival}* ${p.lugar === 'fuera' ? '(fuera)' : '(en casa)'}\n`;
    t += `🏆 ${p.competicion || 'Liga'}\n`;
    t += `📅 ${UI.mayuscula(UI.fechaLarga(p.fecha))}\n`;
    t += `⏰ Partido: *${p.hora || 'por confirmar'}*${p.citacion ? ` · Citación: *${p.citacion}*` : ''}\n`;
    if (p.campo) t += `📍 ${p.campo}\n`;
    t += `\n👥 *Convocados (${convocados.length}):*\n`;
    convocados.forEach((j, i) => { t += `${i + 1}. ${j.nombre}${j.dorsal ? ` (${j.dorsal})` : ''}\n`; });
    t += `\n🎒 Traer: equipación completa, espinilleras, botas y agua.\n`;
    t += `❗ Si alguien no puede venir, avisad cuanto antes.\n\n`;
    t += `¡Vamos Tranvía! 🔴🔵${entrenador ? `\n_${entrenador}_` : ''}`;
    return t;
  },
};

/* ---------- PANTALLA: PARTIDOS ---------- */
Vistas.partidos = {
  titulo: 'Partidos',
  tab: 'partidos',
  mes: null,     // mes que se ve en el calendario ("2026-11")
  diaSel: null,  // día tocado en el calendario

  pintar(seccion = 'lista') {
    const pestañas = [['lista', 'Partidos'], ['calendario', 'Calendario']];
    return `
      <div class="pantalla-cab"><div><h1>Partidos</h1><p>Calendario, convocatorias y estadísticas</p></div>
        <a class="btn btn-borde" href="#/pizarra">${UI.icono('pizarra')} <span>Pizarra</span></a></div>
      <div class="segmentado">${pestañas.map(([id, t]) => `<a href="#/partidos/${id}" class="${seccion === id ? 'activo' : ''}">${t}</a>`).join('')}</div>
      ${Vistas.plantilla.chipsCategorias('filtrar-categoria')}
      ${seccion === 'calendario' ? this.calendario() : this.lista()}
    `;
  },

  lista() {
    const todos = Partidos.lista();
    const hoy = UI.hoyISO();
    const proximos = todos.filter((p) => !p.jugado && p.fecha >= hoy);
    const jugados = todos.filter((p) => p.jugado || p.fecha < hoy).reverse();
    const b = Partidos.balance(todos);
    return `
      ${jugados.length ? `
      <section class="tarjeta balance">
        <div><b class="txt-V">${b.V}</b><span>Victorias</span></div>
        <div><b class="txt-E">${b.E}</b><span>Empates</span></div>
        <div><b class="txt-D">${b.D}</b><span>Derrotas</span></div>
        <div><b>${b.gf}:${b.gc}</b><span>Goles</span></div>
      </section>` : ''}
      <button class="btn btn-primario btn-bloque mt" data-accion="nuevo-partido">${UI.icono('mas')} Nuevo partido</button>
      <div class="seccion-titulo"><h2>Próximos</h2><span class="texto-suave peq">${proximos.length}</span></div>
      <div class="lista en-rejilla">${proximos.map(Partidos.item).join('') || UI.vacio('calendario', 'Sin partidos próximos', 'Añade el siguiente partido para preparar la convocatoria.')}</div>
      ${jugados.length ? `<div class="seccion-titulo"><h2>Jugados</h2><span class="texto-suave peq">${jugados.length}</span></div>
      <div class="lista en-rejilla">${jugados.map(Partidos.item).join('')}</div>` : ''}
      <button class="fab solo-movil" data-accion="nuevo-partido" aria-label="Nuevo partido">${UI.icono('mas')}</button>
    `;
  },

  /* --- Calendario mensual --- */
  calendario() {
    const mes = this.mes || UI.hoyISO().slice(0, 7);
    const [anio, m] = mes.split('-').map(Number);
    const primero = new Date(anio, m - 1, 1);
    const diasMes = new Date(anio, m, 0).getDate();
    const hueco = (primero.getDay() + 6) % 7; // semana empieza en lunes
    const cat = DB.ajuste('categoria');
    const partidos = Partidos.lista(cat).filter((p) => p.fecha.startsWith(mes));
    const sesiones = Entrenos.sesiones(cat).filter((s) => s.fecha.startsWith(mes));
    const hoy = UI.hoyISO();

    let celdas = '';
    for (let i = 0; i < hueco; i++) celdas += '<div></div>';
    for (let d = 1; d <= diasMes; d++) {
      const f = `${mes}-${String(d).padStart(2, '0')}`;
      const hayP = partidos.some((p) => p.fecha === f);
      const hayS = sesiones.some((s) => s.fecha === f);
      celdas += `<button class="cal-dia ${f === hoy ? 'hoy' : ''} ${f === this.diaSel ? 'elegido' : ''}" data-accion="dia-calendario" data-fecha="${f}">
        <span>${d}</span><i>${hayS ? '<em class="punto-s"></em>' : ''}${hayP ? '<em class="punto-p"></em>' : ''}</i></button>`;
    }

    // Lista de eventos: del día elegido o de todo el mes
    const filtro = (x) => !this.diaSel || x.fecha === this.diaSel;
    const eventos = [
      ...partidos.filter(filtro).map((p) => ({ fecha: p.fecha + (p.hora || ''), html: Partidos.item(p) })),
      ...sesiones.filter(filtro).map((s) => ({ fecha: s.fecha + (s.hora || ''), html: Entrenos.item(s) })),
    ].sort((a, b) => a.fecha.localeCompare(b.fecha));

    const nombreMes = primero.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return `
      <section class="tarjeta">
        <div class="cal-cab">
          <button class="btn btn-icono" data-accion="cambiar-mes" data-paso="-1" aria-label="Mes anterior">${UI.icono('atras')}</button>
          <h2>${UI.mayuscula(nombreMes)}</h2>
          <button class="btn btn-icono" data-accion="cambiar-mes" data-paso="1" aria-label="Mes siguiente">${UI.icono('adelante')}</button>
        </div>
        <div class="cal-rejilla cal-semana">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => `<span>${d}</span>`).join('')}</div>
        <div class="cal-rejilla">${celdas}</div>
        <div class="leyenda"><span><i style="background:var(--azul)"></i>Entreno</span><span><i style="background:var(--rojo)"></i>Partido</span></div>
      </section>
      <div class="seccion-titulo"><h2>${this.diaSel ? UI.mayuscula(UI.fechaLarga(this.diaSel)) : 'Este mes'}</h2>
        ${this.diaSel ? '<button class="btn btn-peq btn-borde" data-accion="dia-calendario" data-fecha="">Ver mes</button>' : ''}</div>
      <div class="lista">${eventos.map((e) => e.html).join('') || UI.vacio('calendario', 'Nada programado', this.diaSel ? 'Este día no hay entrenos ni partidos.' : 'Este mes no hay entrenos ni partidos.')}</div>
      ${this.diaSel ? `<div class="fila-botones mt">
        <button class="btn btn-primario" data-accion="nuevo-partido" data-fecha="${this.diaSel}">${UI.icono('trofeo')} Partido este día</button>
        <button class="btn btn-borde" data-accion="nueva-sesion-dia" data-fecha="${this.diaSel}">${UI.icono('pizarra')} Entreno este día</button></div>` : ''}
    `;
  },
};

/* ---------- PANTALLA: DETALLE DEL PARTIDO ---------- */
Vistas.partido = {
  tab: 'partidos',
  atras: '#/partidos',
  titulo: (id) => 'vs ' + (DB.obtener('partidos', id)?.rival || 'Partido'),

  pintar(id) {
    const p = DB.obtener('partidos', id);
    if (!p) return UI.vacio('trofeo', 'Partido no encontrado', '', '<a class="btn" href="#/partidos">Volver</a>');
    const cat = DB.categoria(p.categoria);
    const m = Partidos.marcador(p);
    const r = Partidos.resultado(p);
    const convocados = (p.convocados || []).map((cid) => DB.obtener('jugadores', cid)).filter(Boolean);
    const prep = DB.lista('preparaciones').find((x) => x.categoria === p.categoria && UI.normalizar(x.rival) === UI.normalizar(p.rival) && Math.abs(UI.diasHasta(x.fecha) - UI.diasHasta(p.fecha)) <= 3);
    const enCampo = (p.alineacion?.puestos || []).filter((x) => x.jugador).length;

    return `
      <section class="tarjeta-hero marcador-hero">
        <img src="assets/icons/escudo-512.png" class="marca-agua" alt="">
        <span class="etiqueta" style="background:rgba(255,255,255,.16);color:#fff">${cat.nombre} · ${UI.esc(p.competicion || 'Liga')}</span>
        <div class="marcador">
          <div class="equipo">${m.local === 'C.D. El Tranvía' ? '<img src="assets/icons/escudo-512.png" alt="">' : '<div class="escudo-rival">' + UI.esc(UI.iniciales(m.local)) + '</div>'}<span>${UI.esc(m.local)}</span></div>
          <div class="goles">${p.jugado ? `${m.gl}<small>-</small>${m.gv}` : `<small style="font-size:22px">${p.hora || 'VS'}</small>`}</div>
          <div class="equipo">${m.visitante === 'C.D. El Tranvía' ? '<img src="assets/icons/escudo-512.png" alt="">' : '<div class="escudo-rival">' + UI.esc(UI.iniciales(m.visitante)) + '</div>'}<span>${UI.esc(m.visitante)}</span></div>
        </div>
        ${r ? `<div class="centrado"><span class="etiqueta res-${r}">${{ V: 'Victoria', E: 'Empate', D: 'Derrota' }[r]}</span></div>` : ''}
        <p class="centrado" style="opacity:.85;margin:10px 0 0">${UI.mayuscula(UI.fechaLarga(p.fecha))}${p.campo ? ' · ' + UI.esc(p.campo) : ''}</p>
      </section>

      <div class="fila-botones mt">
        <button class="btn btn-rojo" data-accion="resultado-partido" data-id="${p.id}">${UI.icono('trofeo')} Resultado</button>
        <button class="btn btn-borde" data-accion="editar-partido" data-id="${p.id}">${UI.icono('editar')} Editar</button>
        <button class="btn btn-peligro" data-accion="borrar-partido" data-id="${p.id}">${UI.icono('papelera')}</button>
      </div>

      <div class="rejilla-ficha mt">
        <section class="tarjeta">
          <div class="parte-cab"><div class="icono-parte" style="--c:#25D366">${UI.icono('equipo')}</div>
            <div style="flex:1"><h3>Convocatoria</h3><span class="texto-suave peq">${convocados.length} convocados${p.citacion ? ' · citación ' + p.citacion : ''}</span></div></div>
          <div class="convocados mt">${convocados.map((j) => `<span class="etiqueta gris">${j.dorsal ? j.dorsal + ' · ' : ''}${UI.esc(j.nombre)}</span>`).join('') || '<p class="texto-suave peq">Aún no hay convocados.</p>'}</div>
          <div class="fila-botones mt">
            <button class="btn btn-primario btn-peq" data-accion="convocar" data-id="${p.id}">${UI.icono('check')} Elegir</button>
            ${convocados.length ? `<button class="btn btn-whatsapp btn-peq" data-accion="convocatoria-whatsapp" data-id="${p.id}">${UI.icono('whatsapp')} WhatsApp</button>
            <button class="btn btn-borde btn-peq" data-accion="convocatoria-copiar" data-id="${p.id}">${UI.icono('copiar')} Copiar</button>` : ''}
          </div>
        </section>

        <section class="tarjeta">
          <div class="parte-cab"><div class="icono-parte" style="--c:var(--verde)">${UI.icono('pizarra')}</div>
            <div style="flex:1"><h3>Alineación</h3><span class="texto-suave peq">${p.alineacion ? p.alineacion.formacion + ' · ' + enCampo + ' en el campo' : 'Sin alineación'}</span></div></div>
          ${p.alineacion ? `<div class="mini-campo mt">${p.alineacion.puestos.map((x) => `<i style="left:${x.x}%;top:${x.y}%" class="${x.jugador ? 'lleno' : ''}"></i>`).join('')}</div>` : ''}
          <a class="btn btn-primario btn-peq mt" href="#/pizarra/${p.id}">${UI.icono('pizarra')} Abrir pizarra</a>
        </section>

        <section class="tarjeta">
          <div class="parte-cab"><div class="icono-parte" style="--c:var(--rojo)">${UI.icono('diana')}</div>
            <div style="flex:1"><h3>Rival</h3><span class="texto-suave peq">${prep ? 'Preparación hecha' : 'Sin preparar'}</span></div></div>
          ${prep ? `<p class="peq mt">${(prep.estilos || []).map((e) => `<span class="etiqueta gris">${Biblioteca.estilo(e).nombre}</span>`).join(' ')}</p>
            <a class="btn btn-borde btn-peq mt" href="#/rival/${prep.id}">Ver preparación</a>`
            : `<button class="btn btn-borde btn-peq mt" data-accion="preparar-desde-partido" data-id="${p.id}">${UI.icono('mas')} Preparar este rival</button>`}
        </section>

        ${(Vistas.partido.extras || []).map((fn) => fn(p)).join('')}
      </div>

      <div class="seccion-titulo"><h2>Estadísticas</h2>
        <button class="btn btn-peq btn-primario" data-accion="editar-stats" data-id="${p.id}">${UI.icono('editar')} Editar</button></div>
      ${this.tablaStats(p)}
      ${p.notas ? `<section class="tarjeta mt"><h2>Notas</h2><p class="mt" style="white-space:pre-line">${UI.esc(p.notas)}</p></section>` : ''}
    `;
  },

  // Tabla con las estadísticas de cada jugador
  tablaStats(p) {
    const filas = Object.entries(p.stats || {})
      .map(([jid, s]) => ({ j: DB.obtener('jugadores', jid), s }))
      .filter((x) => x.j && Partidos.STATS.some((st) => Number(x.s[st.id]) > 0))
      .sort((a, b) => (b.s.goles || 0) - (a.s.goles || 0) || (b.s.minutos || 0) - (a.s.minutos || 0));
    if (!filas.length) return `<section class="tarjeta">${UI.vacio('grafica', 'Sin estadísticas', 'Tras el partido, apunta goles, asistencias, minutos y tarjetas.')}</section>`;
    return `<section class="tarjeta tabla-scroll"><table class="tabla">
      <thead><tr><th>Jugador</th>${Partidos.STATS.map((st) => `<th title="${st.nombre}">${st.corto}</th>`).join('')}</tr></thead>
      <tbody>${filas.map(({ j, s }) => `<tr><td><a href="#/jugador/${j.id}">${UI.esc(j.nombre)}</a></td>${Partidos.STATS.map((st) => `<td>${Number(s[st.id]) || '·'}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></section>`;
  },
};

/* ---------- FORMULARIOS ---------- */
function formularioPartido(p = {}) {
  const cat = p.categoria || (DB.ajuste('categoria') !== 'todas' ? DB.ajuste('categoria') : 'alevin');
  const sabado = UI.sumarDias(UI.hoyISO(), (6 - new Date().getDay() + 7) % 7 || 7);
  return `
    <div class="campo"><label for="m-rival">Rival *</label><input type="text" id="m-rival" name="rival" maxlength="40" value="${UI.esc(p.rival)}" placeholder="Ej.: U.D. Las Torres"></div>
    <div class="rejilla-2">
      <div class="campo"><label for="m-cat">Categoría</label>
        <select id="m-cat" name="categoria">${DB.CATEGORIAS.map((c) => `<option value="${c.id}" ${cat === c.id ? 'selected' : ''}>${c.nombre}</option>`).join('')}</select></div>
      <div class="campo"><label for="m-comp">Competición</label>
        <select id="m-comp" name="competicion">${Partidos.COMPETICIONES.map((c) => `<option ${p.competicion === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    </div>
    <div class="rejilla-3">
      <div class="campo"><label for="m-fecha">Fecha *</label><input type="date" id="m-fecha" name="fecha" value="${p.fecha || sabado}"></div>
      <div class="campo"><label for="m-hora">Hora</label><input type="time" id="m-hora" name="hora" value="${p.hora || '10:00'}"></div>
      <div class="campo"><label for="m-cita">Citación</label><input type="time" id="m-cita" name="citacion" value="${p.citacion || '09:15'}"></div>
    </div>
    <div class="rejilla-2">
      <div class="campo"><label for="m-lugar">Jugamos</label>
        <select id="m-lugar" name="lugar"><option value="casa">En casa</option><option value="fuera" ${p.lugar === 'fuera' ? 'selected' : ''}>Fuera</option></select></div>
      <div class="campo"><label for="m-campo">Campo</label><input type="text" id="m-campo" name="campo" maxlength="60" value="${UI.esc(p.campo)}" placeholder="Nombre del campo"></div>
    </div>
    <div class="campo"><label for="m-notas">Notas</label><textarea id="m-notas" name="notas" rows="2">${UI.esc(p.notas)}</textarea></div>
  `;
}

function leerPartido(form) {
  const d = UI.leerFormulario(form);
  if (!d.rival) { UI.aviso('Escribe el nombre del rival', 'error'); return null; }
  if (!d.fecha) { UI.aviso('Indica la fecha', 'error'); return null; }
  return { rival: d.rival, categoria: d.categoria, competicion: d.competicion, fecha: d.fecha, hora: d.hora, citacion: d.citacion, lugar: d.lugar, campo: d.campo, notas: d.notas };
}

/* ---------- ACCIONES ---------- */
Acciones['nuevo-partido'] = (el) => {
  UI.modal({
    titulo: 'Nuevo partido', cuerpo: formularioPartido({ fecha: el.dataset.fecha }), textoGuardar: 'Crear',
    alGuardar: (f) => {
      const datos = leerPartido(f);
      if (!datos) return false;
      const nuevo = DB.crear('partidos', { ...datos, jugado: false, convocados: [], stats: {} });
      UI.aviso('Partido creado');
      location.hash = '#/partido/' + nuevo.id;
    },
  });
};

Acciones['editar-partido'] = (el) => {
  const p = DB.obtener('partidos', el.dataset.id);
  UI.modal({
    titulo: 'Editar partido', cuerpo: formularioPartido(p),
    alGuardar: (f) => {
      const datos = leerPartido(f);
      if (!datos) return false;
      // Si cambia de categoría, la convocatoria y la alineación ya no sirven
      if (datos.categoria !== p.categoria) Object.assign(datos, { convocados: [], alineacion: null, stats: {} });
      DB.actualizar('partidos', p.id, datos);
      UI.aviso('Partido guardado');
      App.refrescar();
    },
  });
};

Acciones['borrar-partido'] = async (el) => {
  if (await UI.confirmar('Se borrará el partido con su convocatoria, alineación y estadísticas.')) {
    DB.borrar('partidos', el.dataset.id);
    UI.aviso('Partido borrado');
    location.hash = '#/partidos';
  }
};

Acciones['resultado-partido'] = (el) => {
  const p = DB.obtener('partidos', el.dataset.id);
  UI.modal({
    titulo: 'Resultado',
    cuerpo: `
      <div class="rejilla-2">
        <div class="campo"><label for="r-f">Goles del Tranvía</label><input type="number" id="r-f" name="golesFavor" min="0" max="50" inputmode="numeric" value="${p.golesFavor ?? 0}"></div>
        <div class="campo"><label for="r-c">Goles de ${UI.esc(p.rival)}</label><input type="number" id="r-c" name="golesContra" min="0" max="50" inputmode="numeric" value="${p.golesContra ?? 0}"></div>
      </div>
      <label class="chip-check"><input type="checkbox" name="jugado" checked><span>Partido jugado</span></label>`,
    alGuardar: (f) => {
      const d = UI.leerFormulario(f);
      const gf = Number(d.golesFavor), gc = Number(d.golesContra);
      if (gf < 0 || gc < 0 || gf > 50 || gc > 50) { UI.aviso('Revisa los goles', 'error'); return false; }
      DB.actualizar('partidos', p.id, { golesFavor: gf, golesContra: gc, jugado: !!d.jugado });
      UI.aviso('Resultado guardado');
      App.refrescar();
    },
  });
};

// Elegir convocados con casillas
Acciones['convocar'] = (el) => {
  const p = DB.obtener('partidos', el.dataset.id);
  const jugadores = DB.jugadoresDe(p.categoria);
  const elegidos = new Set(p.convocados || []);
  const form = UI.modal({
    titulo: 'Convocatoria',
    textoGuardar: 'Guardar convocatoria',
    cuerpo: `
      <p class="texto-suave peq">${DB.categoria(p.categoria).nombre} · <span id="cuenta-conv">${elegidos.size}</span> elegidos</p>
      <div class="fila-botones" style="margin:8px 0 12px">
        <button type="button" class="btn btn-peq btn-borde" id="conv-todos">Todos</button>
        <button type="button" class="btn btn-peq btn-borde" id="conv-ninguno">Ninguno</button>
      </div>
      <div class="lista-check">
        ${jugadores.map((j) => {
          const asis = Entrenos.asistenciaJugador(j.id);
          return `<label class="fila-check">
            <input type="checkbox" name="j-${j.id}" ${elegidos.has(j.id) ? 'checked' : ''}>
            ${UI.avatar(j)}
            <span class="asis-nombre">${UI.esc(j.nombre)}<small class="texto-suave"> · ${UI.posicionCorta(j.posicion)}</small></span>
            ${asis.pct !== null ? `<span class="etiqueta ${asis.pct >= 80 ? 'verde' : asis.pct >= 60 ? 'amarilla' : 'roja'}" title="Asistencia a entrenos">${asis.pct}%</span>` : ''}
            <span class="marca">${UI.icono('check')}</span>
          </label>`;
        }).join('') || '<p class="texto-suave">No hay jugadores en esta categoría.</p>'}
      </div>`,
    alGuardar: (f) => {
      const ids = jugadores.filter((j) => f.querySelector(`[name="j-${j.id}"]`).checked).map((j) => j.id);
      // Quien deja de estar convocado sale también de la alineación
      const al = p.alineacion ? { ...p.alineacion, puestos: p.alineacion.puestos.map((x) => (x.jugador && !ids.includes(x.jugador) ? { ...x, jugador: null } : x)) } : p.alineacion;
      DB.actualizar('partidos', p.id, { convocados: ids, alineacion: al });
      UI.aviso(`${ids.length} convocados`);
      App.refrescar();
    },
  });
  const contar = () => { form.querySelector('#cuenta-conv').textContent = form.querySelectorAll('.lista-check input:checked').length; };
  form.addEventListener('change', contar);
  form.querySelector('#conv-todos').onclick = () => { form.querySelectorAll('.lista-check input').forEach((c) => { c.checked = true; }); contar(); };
  form.querySelector('#conv-ninguno').onclick = () => { form.querySelectorAll('.lista-check input').forEach((c) => { c.checked = false; }); contar(); };
};

Acciones['convocatoria-whatsapp'] = (el) => Compartir.whatsapp(Partidos.textoConvocatoria(DB.obtener('partidos', el.dataset.id)));
Acciones['convocatoria-copiar'] = (el) => UI.copiar(Partidos.textoConvocatoria(DB.obtener('partidos', el.dataset.id)));

// Estadísticas de cada jugador
Acciones['editar-stats'] = (el) => {
  const p = DB.obtener('partidos', el.dataset.id);
  const ids = p.convocados?.length ? p.convocados : DB.jugadoresDe(p.categoria).map((j) => j.id);
  const jugadores = ids.map((id) => DB.obtener('jugadores', id)).filter(Boolean);
  const minDefecto = DB.categoria(p.categoria).futbol === 7 ? 50 : 70;
  UI.modal({
    titulo: 'Estadísticas',
    cuerpo: `
      <p class="texto-suave peq" style="margin-bottom:12px">${p.convocados?.length ? 'Jugadores convocados.' : 'No hay convocatoria: se muestra toda la categoría.'} Deja a 0 lo que no aplique.</p>
      <div class="stats-cab">${Partidos.STATS.map((st) => `<span title="${st.nombre}">${st.corto}</span>`).join('')}</div>
      ${jugadores.map((j) => {
        const s = p.stats?.[j.id] || {};
        return `<div class="stats-fila">
          <span class="asis-nombre">${UI.esc(j.nombre)}</span>
          ${Partidos.STATS.map((st) => `<input type="number" name="${j.id}|${st.id}" min="0" max="${st.max}" inputmode="numeric" aria-label="${st.nombre} de ${UI.esc(j.nombre)}" value="${s[st.id] ?? ''}" placeholder="0">`).join('')}
        </div>`;
      }).join('')}
      <button type="button" class="btn btn-peq btn-borde mt" id="min-todos">Poner ${minDefecto}' a quien no tenga minutos</button>`,
    alGuardar: (f) => {
      const stats = {};
      let error = '';
      f.querySelectorAll('.stats-fila input').forEach((inp) => {
        const [jid, campo] = inp.name.split('|');
        const v = Number(inp.value) || 0;
        const st = Partidos.STATS.find((x) => x.id === campo);
        if (v < 0 || v > st.max) error = `${st.nombre}: valor no válido`;
        (stats[jid] = stats[jid] || {})[campo] = v;
      });
      if (error) { UI.aviso(error, 'error'); return false; }
      const goles = Object.values(stats).reduce((t, s) => t + s.goles, 0);
      DB.actualizar('partidos', p.id, { stats });
      if (p.jugado && goles > (Number(p.golesFavor) || 0)) UI.aviso(`Ojo: hay ${goles} goles apuntados y el resultado dice ${p.golesFavor}`, 'error');
      else UI.aviso('Estadísticas guardadas');
      App.refrescar();
    },
  });
  document.getElementById('min-todos').onclick = () => {
    document.querySelectorAll('.stats-fila input[name$="|minutos"]').forEach((i) => { if (!Number(i.value)) i.value = minDefecto; });
  };
};

// Crea la preparación del rival a partir del partido
Acciones['preparar-desde-partido'] = (el) => {
  const p = DB.obtener('partidos', el.dataset.id);
  const nueva = DB.crear('preparaciones', { rival: p.rival, fecha: p.fecha, categoria: p.categoria, sistema: '', estilos: [], ejercicios: [], fuertes: '', debiles: '', vigilar: '', notas: '' });
  location.hash = '#/rival/' + nueva.id;
  setTimeout(() => Acciones['editar-preparacion']({ dataset: { id: nueva.id } }), 350);
};

Acciones['cambiar-mes'] = (el) => {
  const actual = Vistas.partidos.mes || UI.hoyISO().slice(0, 7);
  const [a, m] = actual.split('-').map(Number);
  const d = new Date(a, m - 1 + Number(el.dataset.paso), 1);
  Vistas.partidos.mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  Vistas.partidos.diaSel = null;
  App.refrescar();
};

Acciones['dia-calendario'] = (el) => {
  Vistas.partidos.diaSel = el.dataset.fecha && el.dataset.fecha !== Vistas.partidos.diaSel ? el.dataset.fecha : null;
  App.refrescar();
};

// Crear un entreno en el día elegido del calendario
Acciones['nueva-sesion-dia'] = (el) => {
  Acciones['nueva-sesion']();
  const campo = document.querySelector('#modal-capa #s-fecha');
  if (campo) campo.value = el.dataset.fecha;
};

/* ---------- BLOQUE EN INICIO: próximo partido ---------- */
(Vistas.inicio.extras = Vistas.inicio.extras || []).unshift(() => {
  const p = Partidos.lista().find((x) => !x.jugado && x.fecha >= UI.hoyISO());
  if (!p) return '';
  const dias = UI.diasHasta(p.fecha);
  return `<div class="seccion-titulo"><h2>Próximo partido</h2><a href="#/partidos">Ver todos</a></div>
    <a class="tarjeta proximo-partido pulsable" href="#/partido/${p.id}">
      <div class="cuenta"><b>${dias === 0 ? 'HOY' : dias}</b><span>${dias === 0 ? '' : dias === 1 ? 'día' : 'días'}</span></div>
      <div style="flex:1;min-width:0">
        <div class="item-titulo">vs ${UI.esc(p.rival)}</div>
        <div class="item-sub"><span>${DB.categoria(p.categoria).nombre}</span><span>· ${UI.fechaCorta(p.fecha)} ${p.hora || ''}</span><span>· ${p.lugar === 'fuera' ? 'Fuera' : 'Casa'}</span></div>
        <div class="item-sub" style="margin-top:4px"><span class="etiqueta ${p.convocados?.length ? 'verde' : 'amarilla'}">${p.convocados?.length ? p.convocados.length + ' convocados' : 'Falta convocatoria'}</span></div>
      </div>${UI.icono('adelante', 'flecha')}
    </a>`;
});
