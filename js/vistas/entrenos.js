/* =============================================================
   ENTRENOS.JS · Sesiones de entrenamiento profesionales
   -------------------------------------------------------------
   Pantallas:
     #/sesiones             -> historial de sesiones (y crear una nueva)
     #/sesiones/biblioteca  -> biblioteca de ejercicios del equipo
     #/sesiones/rival       -> preparar el partido de la semana
     #/sesion/ID            -> ficha de la sesión, bloques, asistencia y valoración
     #/sesion-pdf/ID        -> ficha limpia para imprimir o guardar en PDF
     #/rival/ID             -> detalle de la preparación de un rival

   Una sesión se guarda así:
     { titulo, fecha, hora, objetivo, objetivo2, foco, material, espacio,
       jugadores, piernaMala, preparacionId,
       bloques: [ { parte, minutos, nombre, descripcion, reglas[],
                    variantes[], consignas[], material, espacio } ],
       asistencia: { idJugador: 'si' | 'no' | 'just' },
       valoracion: { bien, mejorar }, notas }
   ============================================================= */

/* ---------- AYUDAS DE ENTRENAMIENTOS ---------- */
const Entrenos = {
  // Duración total: la suma de los minutos de sus bloques
  duracionTotal(s) {
    return (s.bloques || []).reduce((t, b) => t + (Number(b.minutos) || 0), 0);
  },

  // Número de la sesión dentro de su equipo (la 1ª, la 2ª…), por orden de fecha
  numero(s) {
    return Entrenos.sesiones(s.equipoId).findIndex((x) => x.id === s.id) + 1;
  },

  // Resumen de asistencia de una sesión: { si, no, just, total, pct }
  resumenAsistencia(s) {
    const valores = Object.values(s.asistencia || {});
    const r = { si: 0, no: 0, just: 0 };
    valores.forEach((v) => { if (r[v] !== undefined) r[v]++; });
    r.total = valores.length;
    r.pct = r.total ? Math.round((r.si / r.total) * 100) : null;
    return r;
  },

  // Asistencia de un jugador en todas las sesiones donde se pasó lista
  asistenciaJugador(jugadorId) {
    let total = 0, presentes = 0;
    DB.lista('sesiones').forEach((s) => {
      const v = s.asistencia?.[jugadorId];
      if (v) { total++; if (v === 'si') presentes++; }
    });
    return { total, presentes, pct: total ? Math.round((presentes / total) * 100) : null };
  },

  // Sesiones de un equipo (por defecto, el activo), ordenadas por fecha
  sesiones(equipoId = DB.equipo()?.id) {
    return DB.delEquipo('sesiones', equipoId)
      .sort((a, b) => (a.fecha + (a.hora || '') + (a.creado || '')).localeCompare(b.fecha + (b.hora || '') + (b.creado || '')));
  },

  /* Crea una sesión con el generador y la guarda.
     opciones: lo que devuelve leerAjustar(); cuando: { fecha, hora } */
  crearSesion(opciones, cuando = {}) {
    const eq = DB.equipo();
    const propuesta = Asistente.generarSesion({
      ...opciones,
      categoria: eq.categoria, modalidad: eq.modalidad, jugadores: DB.jugadoresDe().length || '',
      duracion: opciones.duracion || eq.duracion, semilla: (Date.now() % 997) + 1,
    });
    return DB.crear('sesiones', {
      ...propuesta, fecha: cuando.fecha || UI.hoyISO(), hora: cuando.hora || '18:00',
      asistencia: {}, valoracion: { bien: '', mejorar: '' }, notas: '',
    });
  },

  /* ---------- "AJUSTAR": opciones para crear una sesión ----------
     Se usa en "Crear sesión de hoy" (plegado) y en "Nueva sesión". */
  camposAjustar(conFecha = false) {
    const eq = DB.equipo();
    const objetivos = Biblioteca.objetivosPara(eq.categoria);
    const rivales = DB.delEquipo('preparaciones').filter((p) => p.fecha >= UI.hoyISO()).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const opcion = (v, t) => `<option value="${v}">${UI.esc(t)}</option>`;
    return `
      ${conFecha ? `<div class="rejilla-2">
        <div class="campo"><label for="aj-fecha">Fecha</label><input type="date" id="aj-fecha" name="fecha" value="${UI.hoyISO()}"></div>
        <div class="campo"><label for="aj-hora">Hora</label><input type="time" id="aj-hora" name="hora" value="18:00"></div>
      </div>` : ''}
      <div class="rejilla-2">
        <div class="campo"><label for="aj-objetivo">Objetivo principal</label>
          <select id="aj-objetivo" name="objetivo">${opcion('azar', '🎲 Al azar')}${objetivos.map((o) => opcion(o.id, o.nombre)).join('')}</select></div>
        <div class="campo"><label for="aj-objetivo2">Objetivo secundario</label>
          <select id="aj-objetivo2" name="objetivo2">${opcion('', 'Ninguno')}${objetivos.map((o) => opcion(o.id, o.nombre)).join('')}</select></div>
        <div class="campo"><label for="aj-foco">Parte táctica</label>
          <select id="aj-foco" name="foco">${opcion('', 'Según el objetivo')}${Biblioteca.FOCOS_TACTICOS.map((f) => opcion(f, Biblioteca.objetivo(f).nombre)).join('')}</select></div>
        <div class="campo"><label for="aj-rival">Rival</label>
          <select id="aj-rival" name="preparacionId">${opcion('', 'Ninguno')}${rivales.map((p) => opcion(p.id, `vs ${p.rival} (${UI.fechaCorta(p.fecha)})`)).join('')}</select></div>
      </div>
      <div class="campo"><label for="aj-duracion">Duración (minutos)</label>
        <input type="number" id="aj-duracion" name="duracion" min="20" max="240" inputmode="numeric" value="${eq.duracion}"></div>
      <label class="chip-check"><input type="checkbox" name="piernaMala"><span>🦶 Hoy, trabajo con la pierna mala</span></label>
      ${rivales.length ? '' : '<p class="texto-suave peq mt">Para ajustar la sesión a un rival, prepáralo antes en Sesiones → Rival.</p>'}`;
  },

  leerAjustar(form) {
    if (!form) return { objetivo: 'azar' };
    const d = UI.leerFormulario(form);
    const duracion = Number(d.duracion);
    return {
      objetivo: d.objetivo || 'azar', objetivo2: d.objetivo2 || '', foco: d.foco || '',
      preparacionId: d.preparacionId || null, piernaMala: !!d.piernaMala,
      duracion: duracion >= 20 && duracion <= 240 ? duracion : undefined,
      fecha: d.fecha, hora: d.hora,
    };
  },

  // Fila de una sesión en las listas
  item(s) {
    const total = Entrenos.duracionTotal(s) || 1;
    const asis = Entrenos.resumenAsistencia(s);
    const d = new Date(s.fecha + 'T12:00:00');
    const valorada = s.valoracion && (s.valoracion.bien || s.valoracion.mejorar);
    return `
      <a class="item" href="#/sesion/${s.id}">
        <div class="fecha-bloque ${UI.diasHasta(s.fecha) < 0 ? 'pasada' : ''}">
          <b>${d.getDate()}</b><span>${d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}</span>
        </div>
        <div class="item-cuerpo">
          <div class="item-titulo">Nº ${Entrenos.numero(s)} · ${UI.esc(s.titulo || 'Entrenamiento')}</div>
          <div class="item-sub">
            <span>${UI.cuandoTexto(s.fecha)}${s.hora ? ' · ' + s.hora : ''}</span>
            <span>· ${Entrenos.duracionTotal(s)} min</span>
            ${s.piernaMala ? '<span title="Pierna mala">🦶</span>' : ''}
            ${valorada ? `<span title="Entreno valorado">${UI.icono('nota', 'peq')}</span>` : ''}
          </div>
          <div class="barra-partes">${(s.bloques || []).map((b) => `<span style="flex:${(Number(b.minutos) || 0) / total};background:${Biblioteca.parte(b.parte).color}"></span>`).join('')}</div>
        </div>
        ${asis.pct !== null ? `<div class="mini-dato"><b>${asis.pct}%</b><span>asist.</span></div>` : UI.icono('adelante', 'flecha')}
      </a>`;
  },

  // Fila de un ejercicio
  itemEjercicio(e, extra = '') {
    const p = Biblioteca.parte(e.parte);
    return `
      <div class="item" data-accion="ver-ejercicio" data-id="${e.id}">
        <div class="icono-parte" style="--c:${p.color}">${UI.icono(p.icono)}</div>
        <div class="item-cuerpo">
          <div class="item-titulo">${UI.esc(e.nombre)}</div>
          <div class="item-sub">
            <span class="etiqueta gris">${Biblioteca.tipo(e.tipo).nombre}</span>
            <span>${p.nombre}</span><span>· ${e.duracion} min</span>
            ${e.propio ? '<span class="etiqueta roja">Mío</span>' : ''}
          </div>
        </div>
        ${extra}
      </div>`;
  },

  // Lista con viñetas (reglas, variantes, consignas)
  lista(titulo, items, clase = '') {
    if (!items?.length) return '';
    return `<div class="bloque-lista ${clase}"><b>${titulo}</b><ul>${items.map((x) => `<li>${UI.esc(x)}</li>`).join('')}</ul></div>`;
  },
};

/* ---------- PANTALLA: SESIONES (con 3 secciones) ---------- */
Vistas.entrenos = {
  titulo: 'Sesiones',
  tab: 'sesiones',
  tipoFiltro: 'todos',
  busqueda: '',
  busquedaSesion: '',

  // Las 3 secciones de la pestaña Sesiones
  pestañas(activa) {
    const lista = [['sesiones', 'Sesiones'], ['biblioteca', 'Ejercicios'], ['rival', 'Rival']];
    return `<div class="segmentado">${lista.map(([id, t]) => `<a href="#/sesiones/${id}" class="${activa === id ? 'activo' : ''}">${t}</a>`).join('')}</div>`;
  },

  pintar(seccion = 'sesiones') {
    let cuerpo = '';
    if (seccion === 'biblioteca') cuerpo = this.biblioteca();
    else if (seccion === 'rival') cuerpo = this.rivales();
    else cuerpo = this.listaSesiones();
    return `
      <div class="pantalla-cab"><div><h1>Sesiones</h1><p>Entrenos, ejercicios y rival</p></div></div>
      ${this.pestañas(seccion)}
      ${cuerpo}
    `;
  },

  montar() {
    const caja = document.getElementById('buscar-ejercicio');
    if (caja) caja.addEventListener('input', () => {
      Vistas.entrenos.busqueda = caja.value;
      document.getElementById('lista-ejercicios').innerHTML = Vistas.entrenos.listaEjercicios();
    });
    const cajaS = document.getElementById('buscar-sesion');
    if (cajaS) cajaS.addEventListener('input', () => {
      Vistas.entrenos.busquedaSesion = cajaS.value;
      document.getElementById('historial').innerHTML = Vistas.entrenos.historialHTML();
    });
  },

  /* --- Sección: sesiones (próximas e historial) --- */
  listaSesiones() {
    const hoy = UI.hoyISO();
    const proximas = Entrenos.sesiones().filter((s) => s.fecha >= hoy);
    return `
      <button class="btn btn-rojo btn-bloque" data-accion="nueva-sesion">${UI.icono('chispa')} Nueva sesión</button>
      <div class="seccion-titulo"><h2>Próximas</h2><span class="texto-suave peq">${proximas.length}</span></div>
      <div class="lista en-rejilla">${proximas.map(Entrenos.item).join('') || '<p class="texto-suave">No hay sesiones programadas.</p>'}</div>
      <div class="seccion-titulo"><h2>Historial</h2><span class="texto-suave peq">${Entrenos.sesiones().filter((s) => s.fecha < hoy).length}</span></div>
      <div class="buscador">${UI.icono('buscar')}<input type="search" id="buscar-sesion" placeholder="Buscar por objetivo o ejercicio" value="${UI.esc(this.busquedaSesion)}" aria-label="Buscar sesión"></div>
      <div class="lista en-rejilla" id="historial">${this.historialHTML()}</div>
      <button class="fab solo-movil" data-accion="nueva-sesion" aria-label="Nueva sesión">${UI.icono('mas')}</button>
    `;
  },
  historialHTML() {
    const q = UI.normalizar(this.busquedaSesion);
    const pasadas = Entrenos.sesiones().filter((s) => s.fecha < UI.hoyISO()).reverse()
      .filter((s) => !q || UI.normalizar(s.titulo + ' ' + (s.bloques || []).map((b) => b.nombre).join(' ')).includes(q));
    return pasadas.map(Entrenos.item).join('') || `<p class="texto-suave">${q ? 'Ninguna sesión coincide.' : 'Aquí aparecerán las sesiones ya hechas.'}</p>`;
  },

  /* --- Sección: biblioteca --- */
  biblioteca() {
    const chip = (id, t) => `<button class="chip ${this.tipoFiltro === id ? 'activo' : ''}" data-accion="filtrar-tipo" data-tipo="${id}">${t}</button>`;
    return `
      <div class="chips">
        ${chip('todos', 'Todos')}${Biblioteca.TIPOS.map((t) => chip(t.id, t.nombre)).join('')}${chip('mios', 'Mis ejercicios')}
      </div>
      <div class="barra-filtros">
        <div class="buscador">${UI.icono('buscar')}<input type="search" id="buscar-ejercicio" placeholder="Buscar ejercicio u objetivo" value="${UI.esc(this.busqueda)}" aria-label="Buscar ejercicio"></div>
        <button class="btn btn-primario" data-accion="nuevo-ejercicio">${UI.icono('mas')} Crear</button>
      </div>
      <p class="texto-suave peq" style="margin:-4px 0 10px">Ejercicios para ${DB.categoria(DB.equipo().categoria).nombre} y los creados en ${UI.esc(DB.equipo().nombre)}.</p>
      <div class="lista en-rejilla" id="lista-ejercicios">${this.listaEjercicios()}</div>
    `;
  },
  listaEjercicios() {
    const q = UI.normalizar(this.busqueda);
    const lista = Biblioteca.para(DB.equipo().categoria)
      .filter((e) => this.tipoFiltro === 'todos' || (this.tipoFiltro === 'mios' ? e.propio : e.tipo === this.tipoFiltro))
      .filter((e) => !q || UI.normalizar(e.nombre + ' ' + (e.objetivos || []).map((o) => Biblioteca.objetivo(o).nombre).join(' ') + ' ' + e.descripcion).includes(q))
      .sort((a, b) => Biblioteca.PARTES.findIndex((p) => p.id === a.parte) - Biblioteca.PARTES.findIndex((p) => p.id === b.parte));
    return lista.map((e) => Entrenos.itemEjercicio(e)).join('') || UI.vacio('balon', 'Sin ejercicios', this.tipoFiltro === 'mios' ? 'Crea tu primer ejercicio con el botón Crear.' : 'Prueba con otro filtro.');
  },

  /* --- Sección: preparar rival --- */
  rivales() {
    const lista = DB.delEquipo('preparaciones').sort((a, b) => b.fecha.localeCompare(a.fecha));
    return `
      <div class="aviso-info azul">${UI.icono('diana')}<div>Apunta cómo juega el rival. Luego, al crear una sesión, elígelo en <b>Ajustar → Rival</b> y la parte táctica se adaptará para contrarrestarle.</div></div>
      <button class="btn btn-primario btn-bloque" data-accion="nueva-preparacion">${UI.icono('mas')} Preparar partido</button>
      <div class="lista en-rejilla mt">
        ${lista.map((p) => `<a class="item" href="#/rival/${p.id}">
            <div class="icono-parte" style="--c:var(--rojo)">${UI.icono('escudo')}</div>
            <div class="item-cuerpo">
              <div class="item-titulo">vs ${UI.esc(p.rival)}</div>
              <div class="item-sub"><span>${UI.cuandoTexto(p.fecha)}</span>
              ${(p.estilos || []).slice(0, 2).map((e) => `<span class="etiqueta gris">${Biblioteca.estilo(e).nombre}</span>`).join('')}</div>
            </div>${UI.icono('adelante', 'flecha')}</a>`).join('') || UI.vacio('escudo', 'Sin preparaciones', 'Prepara el próximo partido analizando al rival.')}
      </div>`;
  },
};

/* ---------- PANTALLA: FICHA DE LA SESIÓN ---------- */
Vistas.sesion = {
  tab: 'sesiones',
  atras: '#/sesiones',
  titulo: (id) => DB.obtener('sesiones', id)?.titulo || 'Sesión',

  pintar(id) {
    const s = DB.obtener('sesiones', id);
    if (!s) return UI.vacio('pizarra', 'Sesión no encontrada', 'Puede que se haya borrado.', '<a class="btn" href="#/sesiones">Volver</a>');
    const eq = DB.obtener('equipos', s.equipoId);
    const prep = s.preparacionId ? DB.obtener('preparaciones', s.preparacionId) : null;
    const guia = Asistente.guia(s.categoria, s.objetivo);
    const dato = (titulo, valor) => `<div class="ficha-dato"><span>${titulo}</span><b>${valor || '—'}</b></div>`;

    return `
      <section class="tarjeta-hero">
        <img src="assets/icons/escudo-512.png" class="marca-agua" alt="">
        <span class="etiqueta" style="background:rgba(255,255,255,.16);color:#fff">Sesión nº ${Entrenos.numero(s)}${eq ? ' · ' + UI.esc(eq.nombre) : ''}</span>
        <h1 style="margin:8px 0 4px">${UI.esc(s.titulo || 'Entrenamiento')}</h1>
        <p style="opacity:.85;margin:0">${UI.mayuscula(UI.fechaLarga(s.fecha))}${s.hora ? ' · ' + s.hora : ''}</p>
        <div class="ficha-datos">
          ${dato('Objetivo', s.objetivo ? Biblioteca.objetivo(s.objetivo).nombre : '')}
          ${dato('Secundario', s.objetivo2 ? Biblioteca.objetivo(s.objetivo2).nombre : '')}
          ${dato('Duración', Entrenos.duracionTotal(s) + ' min')}
          ${dato('Jugadores', s.jugadores)}
          ${dato('Espacio', UI.esc(s.espacio))}
          <div class="ficha-dato ancho"><span>Material</span><b>${UI.esc(s.material) || '—'}</b></div>
        </div>
        ${prep ? `<p style="margin:10px 0 0"><a href="#/rival/${prep.id}" style="color:#fff;text-decoration:underline">Preparada contra ${UI.esc(prep.rival)}</a></p>` : ''}
      </section>

      ${s.piernaMala ? `<div class="aviso-info mt">🦶<div><b>Hoy, trabajo con la pierna mala.</b> ${this.textoPiernas(s)}</div></div>` : ''}

      <div class="acciones-sesion mt no-imprimir">
        <button class="btn btn-primario btn-peq" data-accion="editar-sesion" data-id="${s.id}">${UI.icono('editar')} Editar</button>
        <button class="btn btn-whatsapp btn-peq" data-accion="sesion-whatsapp" data-id="${s.id}">${UI.icono('whatsapp')} WhatsApp</button>
        <button class="btn btn-borde btn-peq" data-accion="sesion-copiar" data-id="${s.id}">${UI.icono('copiar')} Copiar</button>
        <a class="btn btn-borde btn-peq" href="#/sesion-pdf/${s.id}">${UI.icono('imprimir')} PDF</a>
        <button class="btn btn-borde btn-peq" data-accion="duplicar-sesion" data-id="${s.id}">${UI.icono('copiar')} Duplicar</button>
        <button class="btn btn-peligro btn-peq" data-accion="borrar-sesion" data-id="${s.id}">${UI.icono('papelera')}</button>
      </div>

      ${this.bloquesHTML(s)}

      <details class="tarjeta guia mt">
        <summary><b>Guía del entrenador</b> · ${DB.categoria(s.categoria).nombre}</summary>
        ${guia.carga ? `<p class="mt"><b>Carga recomendada:</b> ${UI.esc(guia.carga)}</p>` : ''}
        ${Entrenos.lista('Puntos clave del objetivo', guia.puntosClave)}
        ${Entrenos.lista('Consejos para esta edad', guia.consejos)}
      </details>

      ${s.notas ? `<section class="tarjeta mt"><h2>Notas</h2><p class="mt" style="white-space:pre-line">${UI.esc(s.notas)}</p></section>` : ''}

      ${this.asistenciaHTML(s)}

      <div class="seccion-titulo"><h2>Valoración del entreno</h2></div>
      <section class="tarjeta valoracion">
        <div class="campo"><label for="v-bien">👍 Qué salió bien</label>
          <textarea id="v-bien" rows="2" maxlength="400" data-al-cambiar="valorar-sesion" data-id="${s.id}" data-campo="bien" placeholder="Ej.: Buena intensidad en el rondo">${UI.esc(s.valoracion?.bien)}</textarea></div>
        <div class="campo" style="margin:0"><label for="v-mejorar">🔧 Qué mejorar</label>
          <textarea id="v-mejorar" rows="2" maxlength="400" data-al-cambiar="valorar-sesion" data-id="${s.id}" data-campo="mejorar" placeholder="Ej.: Explicar más corto el juego reducido">${UI.esc(s.valoracion?.mejorar)}</textarea></div>
      </section>
    `;
  },

  // "8 diestros con la izquierda y 3 zurdos con la derecha"
  textoPiernas(s) {
    const js = DB.jugadoresDe(s.equipoId);
    if (!js.length) return '';
    const n = (p) => js.filter((j) => j.pierna === p).length;
    const partes = [];
    if (n('derecha')) partes.push(`${UI.plural(n('derecha'), 'diestro')} con la izquierda`);
    if (n('izquierda')) partes.push(`${UI.plural(n('izquierda'), 'zurdo')} con la derecha`);
    if (n('ambas')) partes.push(`${UI.plural(n('ambas'), 'jugador', 'jugadores')} de las dos piernas, alternando`);
    return UI.mayuscula(partes.join(', ')) + '.';
  },

  // Los bloques, agrupados en Calentamiento / Parte principal / Vuelta a la calma
  bloquesHTML(s) {
    let html = '';
    let grupo = '';
    let n = 0;
    (s.bloques || []).forEach((b, i) => {
      const p = Biblioteca.parte(b.parte);
      if (p.grupo !== grupo) {
        grupo = p.grupo;
        n++;
        const minutosGrupo = s.bloques.filter((x) => Biblioteca.parte(x.parte).grupo === grupo).reduce((t, x) => t + (Number(x.minutos) || 0), 0);
        html += `<div class="seccion-titulo grupo-bloques"><h2>${n}. ${grupo}</h2><span class="texto-suave peq">${minutosGrupo} min</span></div>`;
      }
      html += this.bloqueHTML(s, b, i);
    });
    return html;
  },

  bloqueHTML(s, b, i) {
    const p = Biblioteca.parte(b.parte);
    const boton = (accion, icono, texto, extra = '') => `<button class="btn btn-borde btn-peq" data-accion="${accion}" data-id="${s.id}" data-i="${i}" ${extra}>${UI.icono(icono)} ${texto}</button>`;
    return `
      <section class="tarjeta bloque" style="--c:${p.color}">
        <div class="bloque-cab">
          <span class="etiqueta" style="background:color-mix(in srgb, ${p.color} 16%, transparent);color:${p.color}">${UI.icono(p.icono, 'peq')} ${p.nombre}</span>
          <b class="bloque-min">${b.minutos}'</b>
        </div>
        ${b.nombre ? `
          <h3 class="bloque-nombre">${UI.esc(b.nombre)}</h3>
          ${b.descripcion ? `<p class="bloque-desc">${UI.esc(b.descripcion)}</p>` : ''}
          ${Entrenos.lista('Reglas', b.reglas)}
          ${Entrenos.lista('Variantes', b.variantes)}
          ${Entrenos.lista('Consignas clave', b.consignas, 'consignas')}
          ${b.espacio || b.material ? `<p class="texto-suave peq">${b.espacio ? '📍 ' + UI.esc(b.espacio) : ''}${b.espacio && b.material ? ' · ' : ''}${b.material ? '🎒 ' + UI.esc(b.material) : ''}</p>` : ''}`
          : '<p class="texto-suave">Bloque vacío. Elige un ejercicio de la biblioteca.</p>'}
        <div class="fila-botones mt no-imprimir">
          ${boton('otro-ejercicio', 'chispa', 'Otro ejercicio')}
          ${boton('elegir-ejercicio', 'lista', 'Biblioteca')}
          ${boton('editar-bloque', 'editar', 'Editar')}
          ${b.nombre ? boton('guardar-bloque', 'descargar', 'A mi biblioteca') : ''}
        </div>
      </section>`;
  },

  // Lista para pasar asistencia (un toque por jugador)
  asistenciaHTML(s) {
    const jugadores = DB.jugadoresDe(s.equipoId);
    const r = Entrenos.resumenAsistencia(s);
    return `
      <div class="seccion-titulo" id="asistencia"><h2>Asistencia</h2>
        <button class="btn btn-peq btn-borde" data-accion="todos-presentes" data-id="${s.id}">${UI.icono('check')} Todos presentes</button></div>
      <section class="tarjeta">
        <p class="peq texto-suave" style="margin-bottom:10px">
          <span class="etiqueta verde">${r.si} presentes</span> <span class="etiqueta roja">${r.no} faltas</span> <span class="etiqueta amarilla">${r.just} justificadas</span>
        </p>
        ${jugadores.map((j) => {
          const v = s.asistencia?.[j.id];
          return `<div class="asis-fila">
            ${UI.avatar(j)}<span class="asis-nombre">${UI.esc(j.nombre)}</span>
            <div class="asis-btns" role="group" aria-label="Asistencia de ${UI.esc(j.nombre)}">
              <button class="${v === 'si' ? 'activo si' : ''}" data-accion="asistencia" data-sesion="${s.id}" data-jugador="${j.id}" data-estado="si" aria-label="Presente">${UI.icono('check')}</button>
              <button class="${v === 'no' ? 'activo no' : ''}" data-accion="asistencia" data-sesion="${s.id}" data-jugador="${j.id}" data-estado="no" aria-label="Falta">${UI.icono('cerrar')}</button>
              <button class="${v === 'just' ? 'activo just' : ''}" data-accion="asistencia" data-sesion="${s.id}" data-jugador="${j.id}" data-estado="just" aria-label="Justificada">J</button>
            </div>
          </div>`;
        }).join('') || '<p class="texto-suave">Añade jugadores en la pestaña Jugadores.</p>'}
      </section>`;
  },
};

/* ---------- PANTALLA: FICHA LIMPIA PARA IMPRIMIR / PDF ---------- */
Vistas['sesion-pdf'] = {
  tab: 'sesiones',
  titulo: 'Ficha de sesión',

  pintar(id) {
    const s = DB.obtener('sesiones', id);
    this.atras = '#/sesion/' + id;
    if (!s) return UI.vacio('pizarra', 'Sesión no encontrada', '');
    const eq = DB.obtener('equipos', s.equipoId);
    const entrenador = DB.ajuste('entrenador');
    let grupo = '';
    let n = 0;
    const bloques = (s.bloques || []).map((b) => {
      const p = Biblioteca.parte(b.parte);
      let cab = '';
      if (p.grupo !== grupo) { grupo = p.grupo; n++; cab = `<h2 class="inf-h2">${n}. ${grupo}</h2>`; }
      return `${cab}
        <div class="pdf-bloque" style="--c:${p.color}">
          <div class="pdf-bloque-cab"><b>${p.grupo === 'Parte principal' ? p.nombre + ' · ' : ''}${UI.esc(b.nombre || '—')}</b><span>${b.minutos}'</span></div>
          ${b.descripcion ? `<p>${UI.esc(b.descripcion)}</p>` : ''}
          <div class="pdf-listas">
            ${Entrenos.lista('Reglas', b.reglas)}${Entrenos.lista('Variantes', b.variantes)}${Entrenos.lista('Consignas clave', b.consignas, 'consignas')}
          </div>
          ${b.espacio || b.material ? `<p class="pdf-mini">${b.espacio ? 'Espacio: ' + UI.esc(b.espacio) : ''}${b.espacio && b.material ? ' · ' : ''}${b.material ? 'Material: ' + UI.esc(b.material) : ''}</p>` : ''}
        </div>`;
    }).join('');

    return `
      <div class="fila-botones no-imprimir" style="margin-bottom:14px">
        <button class="btn btn-primario" data-accion="imprimir">${UI.icono('imprimir')} Imprimir / Guardar PDF</button>
        <a class="btn btn-borde" href="#/sesion/${s.id}">Volver a la sesión</a>
      </div>
      <article class="informe">
        <header class="inf-cab">
          <img src="assets/icons/escudo-512.png" alt="Escudo C.D. El Tranvía">
          <div><div class="inf-club">C.D. EL TRANVÍA</div><div class="inf-sub">${eq ? UI.esc(eq.nombre) + ' · ' : ''}${DB.categoria(s.categoria).nombre}</div></div>
          <div class="inf-temp">SESIÓN Nº<b>${Entrenos.numero(s)}</b></div>
        </header>
        <div class="inf-franja"></div>
        <table class="pdf-ficha">
          <tr><td>Fecha</td><td>${UI.mayuscula(UI.fechaLarga(s.fecha))}${s.hora ? ' · ' + s.hora : ''}</td><td>Duración</td><td>${Entrenos.duracionTotal(s)} min</td></tr>
          <tr><td>Objetivo</td><td>${s.objetivo ? Biblioteca.objetivo(s.objetivo).nombre : '—'}</td><td>Secundario</td><td>${s.objetivo2 ? Biblioteca.objetivo(s.objetivo2).nombre : '—'}</td></tr>
          <tr><td>Jugadores</td><td>${s.jugadores || '—'}</td><td>Espacio</td><td>${UI.esc(s.espacio || '—')}</td></tr>
          <tr><td>Material</td><td colspan="3">${UI.esc(s.material || '—')}</td></tr>
        </table>
        ${s.piernaMala ? '<p class="pdf-aviso">🦶 Hoy, trabajo con la pierna mala.</p>' : ''}
        ${bloques}
        ${s.notas ? `<h2 class="inf-h2">Notas</h2><p style="white-space:pre-line">${UI.esc(s.notas)}</p>` : ''}
        ${s.valoracion?.bien || s.valoracion?.mejorar ? `<h2 class="inf-h2">Valoración del entreno</h2>
          ${s.valoracion.bien ? `<p><b>Salió bien:</b> ${UI.esc(s.valoracion.bien)}</p>` : ''}${s.valoracion.mejorar ? `<p><b>Mejorar:</b> ${UI.esc(s.valoracion.mejorar)}</p>` : ''}` : ''}
        <footer class="inf-pie">
          <div>Entrenador/a: ${entrenador ? UI.esc(entrenador) : '______________________'}</div>
          <div>C.D. El Tranvía · Santa Cruz de Tenerife</div>
        </footer>
      </article>`;
  },
};

/* ---------- PANTALLA: PREPARACIÓN DEL RIVAL ---------- */
Vistas.rival = {
  tab: 'sesiones',
  atras: '#/sesiones/rival',
  titulo: (id) => 'vs ' + (DB.obtener('preparaciones', id)?.rival || 'Rival'),

  pintar(id) {
    const p = DB.obtener('preparaciones', id);
    if (!p) return UI.vacio('escudo', 'Preparación no encontrada', '', '<a class="btn" href="#/sesiones/rival">Volver</a>');
    const cat = DB.categoria(p.categoria);
    const elegidos = (p.ejercicios || []).map((e) => Biblioteca.obtener(e)).filter(Boolean);
    const sugeridos = Biblioteca.contraEstilos(p.estilos || [], p.categoria).filter((e) => !(p.ejercicios || []).includes(e.id));
    const bloque = (titulo, texto, icono) => texto ? `<div class="nota-rival">${UI.icono(icono)}<div><b>${titulo}</b><p>${UI.esc(texto)}</p></div></div>` : '';

    return `
      <section class="tarjeta-hero" style="background:linear-gradient(135deg,#3a0d14,#7d1019 50%,#CF2633)">
        <img src="assets/icons/escudo-512.png" class="marca-agua" alt="">
        <span class="etiqueta" style="background:rgba(255,255,255,.16);color:#fff">${cat.nombre} · Partido de la semana</span>
        <h1 style="margin:8px 0 4px">vs ${UI.esc(p.rival)}</h1>
        <p style="opacity:.85;margin:0">${UI.mayuscula(UI.fechaLarga(p.fecha))}${p.sistema ? ' · Juegan en ' + UI.esc(p.sistema) : ''}</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">
          ${(p.estilos || []).map((e) => `<span class="etiqueta" style="background:rgba(255,255,255,.18);color:#fff">${Biblioteca.estilo(e).nombre}</span>`).join('')}
        </div>
      </section>
      <div class="fila-botones mt">
        <button class="btn btn-primario" data-accion="editar-preparacion" data-id="${p.id}">${UI.icono('editar')} Editar</button>
        <button class="btn btn-peligro" data-accion="borrar-preparacion" data-id="${p.id}">${UI.icono('papelera')} Borrar</button>
      </div>

      <section class="tarjeta mt">
        <h2>Notas sobre el rival</h2>
        <div class="mt">
          ${bloque('Puntos fuertes', p.fuertes, 'rayo')}
          ${bloque('Puntos débiles', p.debiles, 'diana')}
          ${bloque('A vigilar', p.vigilar, 'info')}
          ${bloque('Otras notas', p.notas, 'nota')}
          ${!p.fuertes && !p.debiles && !p.vigilar && !p.notas ? '<p class="texto-suave">Aún no hay notas. Pulsa Editar para añadirlas.</p>' : ''}
        </div>
      </section>

      <button class="btn btn-rojo btn-bloque mt" data-accion="sesion-desde-rival" data-id="${p.id}">${UI.icono('chispa')} Crear sesión contra este rival</button>

      <div class="seccion-titulo"><h2>Ejercicios elegidos</h2><span class="texto-suave peq">${elegidos.length}</span></div>
      <div class="lista">
        ${elegidos.map((e) => Entrenos.itemEjercicio(e, `<button class="btn btn-icono" data-accion="quitar-ej-rival" data-prep="${p.id}" data-ej="${e.id}" aria-label="Quitar">${UI.icono('cerrar')}</button>`)).join('') ||
          '<p class="texto-suave peq">Añade ejercicios de las sugerencias de abajo: se meterán en la sesión.</p>'}
      </div>

      <div class="seccion-titulo"><h2>Sugeridos para contrarrestarle</h2></div>
      <div class="lista">
        ${sugeridos.map((e) => Entrenos.itemEjercicio(e, `<button class="btn btn-icono btn-primario" data-accion="anadir-ej-rival" data-prep="${p.id}" data-ej="${e.id}" aria-label="Añadir">${UI.icono('mas')}</button>`)).join('') ||
          `<p class="texto-suave peq">${(p.estilos || []).length ? 'Ya has añadido todas las sugerencias.' : 'Marca cómo juega el rival (Editar) para recibir sugerencias.'}</p>`}
      </div>
    `;
  },
};

/* ---------- FORMULARIOS ---------- */
// Editar la ficha de la sesión
function formularioFicha(s) {
  const objetivos = Biblioteca.objetivosPara(s.categoria);
  const opciones = (sel, vacio) => `${vacio ? `<option value="">${vacio}</option>` : ''}${objetivos.map((o) => `<option value="${o.id}" ${sel === o.id ? 'selected' : ''}>${o.nombre}</option>`).join('')}`;
  return `
    <div class="campo"><label for="s-titulo">Título</label>
      <input type="text" id="s-titulo" name="titulo" maxlength="60" value="${UI.esc(s.titulo)}"></div>
    <div class="rejilla-2">
      <div class="campo"><label for="s-fecha">Fecha *</label><input type="date" id="s-fecha" name="fecha" value="${s.fecha}"></div>
      <div class="campo"><label for="s-hora">Hora</label><input type="time" id="s-hora" name="hora" value="${s.hora || ''}"></div>
      <div class="campo"><label for="s-obj">Objetivo principal</label><select id="s-obj" name="objetivo">${opciones(s.objetivo)}</select></div>
      <div class="campo"><label for="s-obj2">Objetivo secundario</label><select id="s-obj2" name="objetivo2">${opciones(s.objetivo2, 'Ninguno')}</select></div>
      <div class="campo"><label for="s-jug">Nº de jugadores</label><input type="number" id="s-jug" name="jugadores" min="0" max="40" inputmode="numeric" value="${UI.esc(s.jugadores)}"></div>
      <div class="campo"><label for="s-esp">Espacio</label><input type="text" id="s-esp" name="espacio" maxlength="60" value="${UI.esc(s.espacio)}"></div>
    </div>
    <div class="campo"><label for="s-mat">Material</label><input type="text" id="s-mat" name="material" maxlength="200" value="${UI.esc(s.material)}"></div>
    <label class="chip-check"><input type="checkbox" name="piernaMala" ${s.piernaMala ? 'checked' : ''}><span>🦶 Hoy, trabajo con la pierna mala</span></label>
    <div class="campo mt"><label for="s-notas">Notas</label><textarea id="s-notas" name="notas" rows="2">${UI.esc(s.notas)}</textarea></div>`;
}

// Editar el contenido de un bloque. Las listas: una línea por elemento.
function formularioBloque(b) {
  const lineas = (l) => UI.esc((l || []).join('\n'));
  return `
    <div class="rejilla-2" style="grid-template-columns:1fr 100px">
      <div class="campo"><label for="b-nombre">Ejercicio</label><input type="text" id="b-nombre" name="nombre" maxlength="60" value="${UI.esc(b.nombre)}"></div>
      <div class="campo"><label for="b-min">Minutos</label><input type="number" id="b-min" name="minutos" min="0" max="120" inputmode="numeric" value="${b.minutos}"></div>
    </div>
    <div class="campo"><label for="b-desc">Descripción</label><textarea id="b-desc" name="descripcion" rows="3">${UI.esc(b.descripcion)}</textarea></div>
    <div class="campo"><label for="b-reglas">Reglas <small>(una por línea)</small></label><textarea id="b-reglas" name="reglas" rows="3">${lineas(b.reglas)}</textarea></div>
    <div class="campo"><label for="b-var">Variantes <small>(una por línea)</small></label><textarea id="b-var" name="variantes" rows="2">${lineas(b.variantes)}</textarea></div>
    <div class="campo"><label for="b-cons">Consignas clave <small>(una por línea)</small></label><textarea id="b-cons" name="consignas" rows="3">${lineas(b.consignas)}</textarea></div>
    <div class="rejilla-2">
      <div class="campo"><label for="b-esp">Espacio</label><input type="text" id="b-esp" name="espacio" maxlength="60" value="${UI.esc(b.espacio)}"></div>
      <div class="campo"><label for="b-mat">Material</label><input type="text" id="b-mat" name="material" maxlength="120" value="${UI.esc(b.material)}"></div>
    </div>
    <p class="texto-suave peq">Los cambios son solo para esta sesión. La biblioteca no se toca.</p>`;
}

// Separa un texto en líneas limpias
const enLineas = (texto) => String(texto || '').split('\n').map((x) => x.trim()).filter(Boolean);

function formularioEjercicio(e = {}) {
  const lineas = (l) => UI.esc((l || []).join('\n'));
  return `
    <div class="campo"><label for="e-nombre">Nombre *</label><input type="text" id="e-nombre" name="nombre" maxlength="60" value="${UI.esc(e.nombre)}"></div>
    <div class="rejilla-2">
      <div class="campo"><label for="e-tipo">Tipo</label>
        <select id="e-tipo" name="tipo">${Biblioteca.TIPOS.map((t) => `<option value="${t.id}" ${e.tipo === t.id ? 'selected' : ''}>${t.nombre}</option>`).join('')}</select></div>
      <div class="campo"><label for="e-parte">Bloque de la sesión</label>
        <select id="e-parte" name="parte">${Biblioteca.PARTES.map((p) => `<option value="${p.id}" ${e.parte === p.id ? 'selected' : ''}>${p.nombre}</option>`).join('')}</select></div>
      <div class="campo"><label for="e-objetivo">Objetivo</label>
        <select id="e-objetivo" name="objetivo">${Biblioteca.OBJETIVOS.map((o) => `<option value="${o.id}" ${(e.objetivos || [])[0] === o.id ? 'selected' : ''}>${o.nombre}</option>`).join('')}</select></div>
      <div class="campo"><label for="e-duracion">Duración (min) *</label><input type="number" id="e-duracion" name="duracion" min="1" max="90" inputmode="numeric" value="${e.duracion || 10}"></div>
      <div class="campo"><label for="e-material">Material</label><input type="text" id="e-material" name="material" maxlength="120" value="${UI.esc(e.material)}" placeholder="Conos, petos…"></div>
      <div class="campo"><label for="e-espacio">Espacio</label><input type="text" id="e-espacio" name="espacio" maxlength="60" value="${UI.esc(e.espacio)}" placeholder="Ej.: 20x20 m"></div>
    </div>
    <div class="campo"><label for="e-desc">Descripción</label><textarea id="e-desc" name="descripcion" rows="3">${UI.esc(e.descripcion)}</textarea></div>
    <div class="campo"><label for="e-reglas">Reglas <small>(una por línea)</small></label><textarea id="e-reglas" name="reglas" rows="3">${lineas(e.reglas)}</textarea></div>
    <div class="campo"><label for="e-var">Variantes <small>(una por línea)</small></label><textarea id="e-var" name="variantes" rows="2">${lineas(e.variantes)}</textarea></div>
    <div class="campo"><label for="e-cons">Consignas clave <small>(una por línea)</small></label><textarea id="e-cons" name="consignas" rows="3">${lineas(e.consignas)}</textarea></div>
    <p class="texto-suave peq">Se guarda en la biblioteca de ${UI.esc(DB.equipo().nombre)}.</p>`;
}

function leerEjercicio(form) {
  const d = UI.leerFormulario(form);
  if (!d.nombre) { UI.aviso('Escribe un nombre', 'error'); return null; }
  return {
    nombre: d.nombre, tipo: d.tipo, parte: d.parte, objetivos: [d.objetivo], duracion: Number(d.duracion) || 10,
    material: d.material, espacio: d.espacio, descripcion: d.descripcion,
    reglas: enLineas(d.reglas), variantes: enLineas(d.variantes), consignas: enLineas(d.consignas),
  };
}

function formularioPreparacion(p = {}) {
  // Por defecto, el próximo sábado
  const sabado = UI.sumarDias(UI.hoyISO(), (6 - new Date().getDay() + 7) % 7 || 7);
  return `
    <div class="campo"><label for="p-rival">Rival *</label><input type="text" id="p-rival" name="rival" maxlength="40" value="${UI.esc(p.rival)}" placeholder="Ej.: U.D. Ofra"></div>
    <div class="rejilla-2">
      <div class="campo"><label for="p-fecha">Fecha</label><input type="date" id="p-fecha" name="fecha" value="${p.fecha || sabado}"></div>
      <div class="campo"><label for="p-sistema">Su sistema</label><input type="text" id="p-sistema" name="sistema" maxlength="12" value="${UI.esc(p.sistema)}" placeholder="1-4-4-2"></div>
    </div>
    <span class="etiqueta-campo">¿Cómo juega?</span>
    <div class="chips-check" style="margin:6px 0 14px">
      ${Biblioteca.ESTILOS_RIVAL.map((e) => `<label class="chip-check"><input type="checkbox" name="est-${e.id}" ${(p.estilos || []).includes(e.id) ? 'checked' : ''}><span>${e.nombre}</span></label>`).join('')}
    </div>
    <div class="campo"><label for="p-fuertes">Puntos fuertes</label><textarea id="p-fuertes" name="fuertes" rows="2">${UI.esc(p.fuertes)}</textarea></div>
    <div class="campo"><label for="p-debiles">Puntos débiles</label><textarea id="p-debiles" name="debiles" rows="2">${UI.esc(p.debiles)}</textarea></div>
    <div class="campo"><label for="p-vigilar">A vigilar</label><textarea id="p-vigilar" name="vigilar" rows="2" placeholder="Usa dorsal o posición (ej.: «el 9, muy rápido»), sin nombres de menores">${UI.esc(p.vigilar)}</textarea></div>
    <div class="campo"><label for="p-notas">Otras notas</label><textarea id="p-notas" name="notas" rows="2">${UI.esc(p.notas)}</textarea></div>
  `;
}

function leerPreparacion(form) {
  const d = UI.leerFormulario(form);
  if (!d.rival) { UI.aviso('Escribe el nombre del rival', 'error'); return null; }
  return {
    rival: d.rival, fecha: d.fecha || UI.hoyISO(), sistema: d.sistema,
    estilos: Biblioteca.ESTILOS_RIVAL.filter((e) => d['est-' + e.id]).map((e) => e.id),
    fuertes: d.fuertes, debiles: d.debiles, vigilar: d.vigilar, notas: d.notas,
  };
}

/* ---------- ACCIONES ---------- */
// Guarda un bloque cambiado de una sesión
function guardarBloque(s, i, bloque) {
  const bloques = s.bloques.map((b, k) => (k === i ? bloque : b));
  DB.actualizar('sesiones', s.id, { bloques });
}

Acciones['nueva-sesion'] = () => {
  UI.modal({
    titulo: 'Nueva sesión',
    textoGuardar: 'Crear sesión',
    cuerpo: `<p class="texto-suave peq" style="margin-bottom:12px">Se crea con ${UI.esc(DB.equipo().nombre)} (${DB.categoria(DB.equipo().categoria).nombre}). Después puedes cambiar cualquier ejercicio.</p>${Entrenos.camposAjustar(true)}`,
    alGuardar: (f) => {
      const op = Entrenos.leerAjustar(f);
      if (!op.fecha) { UI.aviso('Indica la fecha', 'error'); return false; }
      const nueva = Entrenos.crearSesion(op, { fecha: op.fecha, hora: op.hora });
      UI.aviso('Sesión creada');
      location.hash = '#/sesion/' + nueva.id;
    },
  });
};

Acciones['editar-sesion'] = (el) => {
  const s = DB.obtener('sesiones', el.dataset.id);
  UI.modal({
    titulo: 'Editar ficha',
    cuerpo: formularioFicha(s),
    alGuardar: (f) => {
      const d = UI.leerFormulario(f);
      if (!d.fecha) { UI.aviso('Indica la fecha', 'error'); return false; }
      const piernaMala = !!d.piernaMala;
      // Al activar o quitar la pierna mala, añadimos o quitamos su consigna en la técnica
      const bloques = s.bloques.map((b) => {
        if (b.parte !== 'tecnica') return b;
        const consignas = b.consignas.filter((c) => c !== Asistente.CONSIGNA_PIERNA);
        return { ...b, consignas: piernaMala ? [Asistente.CONSIGNA_PIERNA, ...consignas] : consignas };
      });
      DB.actualizar('sesiones', s.id, {
        titulo: d.titulo || 'Entrenamiento', fecha: d.fecha, hora: d.hora, objetivo: d.objetivo, objetivo2: d.objetivo2,
        jugadores: d.jugadores ? Number(d.jugadores) : '', espacio: d.espacio, material: d.material, piernaMala, notas: d.notas, bloques,
      });
      UI.aviso('Sesión guardada');
      App.refrescar();
    },
  });
};

Acciones['otro-ejercicio'] = (el) => {
  const s = DB.obtener('sesiones', el.dataset.id);
  const i = Number(el.dataset.i);
  const nuevo = Asistente.otroEjercicio(s, i);
  if (!nuevo) { UI.aviso('No hay más ejercicios de este bloque para esta categoría', 'error'); return; }
  guardarBloque(s, i, nuevo);
  UI.aviso('Nuevo ejercicio: ' + nuevo.nombre);
  App.refrescar();
};

Acciones['editar-bloque'] = (el) => {
  const s = DB.obtener('sesiones', el.dataset.id);
  const i = Number(el.dataset.i);
  const b = s.bloques[i];
  UI.modal({
    titulo: Biblioteca.parte(b.parte).nombre,
    cuerpo: formularioBloque(b),
    alGuardar: (f) => {
      const d = UI.leerFormulario(f);
      guardarBloque(s, i, {
        ...b, nombre: d.nombre, minutos: Math.max(0, Number(d.minutos) || 0), descripcion: d.descripcion,
        reglas: enLineas(d.reglas), variantes: enLineas(d.variantes), consignas: enLineas(d.consignas),
        espacio: d.espacio, material: d.material,
      });
      UI.aviso('Bloque guardado');
      App.refrescar();
    },
  });
};

// Elegir el ejercicio de un bloque desde la biblioteca
Acciones['elegir-ejercicio'] = (el) => {
  const s = DB.obtener('sesiones', el.dataset.id);
  const i = Number(el.dataset.i);
  const parte = s.bloques[i].parte;
  const lista = Biblioteca.para(s.categoria, parte);
  UI.modal({
    titulo: 'Elegir: ' + Biblioteca.parte(parte).nombre,
    sinPie: true,
    cuerpo: `<p class="texto-suave peq" style="margin-bottom:10px">Para ${DB.categoria(s.categoria).nombre}. Toca uno para ponerlo en la sesión.</p>
      <div class="lista">${lista.map((e) => `<button type="button" class="item item-boton" data-accion="poner-ejercicio" data-id="${s.id}" data-i="${i}" data-ej="${e.id}">
        <div class="item-cuerpo"><div class="item-titulo">${UI.esc(e.nombre)}</div>
        <div class="item-sub"><span class="etiqueta gris">${Biblioteca.tipo(e.tipo).nombre}</span><span>${e.duracion} min</span>${e.propio ? '<span class="etiqueta roja">Mío</span>' : ''}</div></div>
        ${s.bloques[i].ejercicioId === e.id ? '<span class="etiqueta verde">Actual</span>' : UI.icono('mas')}</button>`).join('')
        || UI.vacio('balon', 'No hay ejercicios', 'Crea uno propio en Ejercicios.')}</div>`,
  });
};

Acciones['poner-ejercicio'] = (el) => {
  const s = DB.obtener('sesiones', el.dataset.id);
  const i = Number(el.dataset.i);
  const e = Biblioteca.obtener(el.dataset.ej);
  const b = s.bloques[i];
  const consignas = [...(e.consignas || [])];
  if (s.piernaMala && b.parte === 'tecnica') consignas.unshift(Asistente.CONSIGNA_PIERNA);
  guardarBloque(s, i, {
    ...b, ejercicioId: e.id, nombre: e.nombre, descripcion: e.descripcion || '', reglas: [...(e.reglas || [])],
    variantes: [...(e.variantes || [])], consignas, material: e.material || '', espacio: e.espacio || '',
  });
  UI.cerrarModal();
  UI.aviso('Ejercicio cambiado');
  App.refrescar();
};

// Guarda el contenido de un bloque como ejercicio propio del equipo
Acciones['guardar-bloque'] = (el) => {
  const s = DB.obtener('sesiones', el.dataset.id);
  const b = s.bloques[Number(el.dataset.i)];
  const origen = Biblioteca.obtener(b.ejercicioId);
  const yaEsta = DB.delEquipo('ejercicios').some((e) => UI.normalizar(e.nombre) === UI.normalizar(b.nombre));
  const nombre = yaEsta ? `${b.nombre} (mi versión)` : b.nombre;
  DB.crear('ejercicios', {
    nombre, parte: b.parte, tipo: origen?.tipo || (b.parte === 'juego' ? 'juego' : b.parte === 'tactica' ? 'tactico' : 'tecnico'),
    objetivos: origen?.objetivos || [s.objetivo].filter(Boolean), duracion: Number(b.minutos) || 10,
    material: b.material, espacio: b.espacio, descripcion: b.descripcion,
    reglas: b.reglas.filter((c) => c !== Asistente.CONSIGNA_PIERNA), variantes: b.variantes,
    consignas: b.consignas.filter((c) => c !== Asistente.CONSIGNA_PIERNA),
  });
  UI.aviso(`«${nombre}» guardado en tu biblioteca`);
};

Acciones['duplicar-sesion'] = (el) => {
  const s = DB.obtener('sesiones', el.dataset.id);
  const copia = JSON.parse(JSON.stringify(s));
  ['id', 'ejemplo', 'creado', 'nube'].forEach((k) => delete copia[k]);
  copia.fecha = UI.hoyISO(); // para reutilizarla hoy (cámbiala en Editar si quieres)
  copia.asistencia = {};
  copia.valoracion = { bien: '', mejorar: '' };
  const nueva = DB.crear('sesiones', copia);
  UI.aviso('Sesión duplicada para hoy. Cambia la fecha en Editar si hace falta.');
  location.hash = '#/sesion/' + nueva.id;
};

Acciones['borrar-sesion'] = async (el) => {
  if (await UI.confirmar('Se borrará la sesión con su asistencia y su valoración.', 'Borrar sesión')) {
    DB.borrar('sesiones', el.dataset.id);
    UI.aviso('Sesión borrada');
    location.hash = '#/sesiones';
  }
};

Acciones['sesion-whatsapp'] = (el) => {
  const s = DB.obtener('sesiones', el.dataset.id);
  Compartir.whatsapp(Asistente.textoSesion(s, Entrenos.numero(s)));
};
Acciones['sesion-copiar'] = (el) => {
  const s = DB.obtener('sesiones', el.dataset.id);
  UI.copiar(Asistente.textoSesion(s, Entrenos.numero(s)));
};

// La valoración se guarda sola al salir de cada caja de texto
Acciones['valorar-sesion'] = (el) => {
  const s = DB.obtener('sesiones', el.dataset.id);
  DB.actualizar('sesiones', s.id, { valoracion: { ...(s.valoracion || {}), [el.dataset.campo]: el.value.trim() } });
  UI.aviso('Valoración guardada');
};

Acciones['asistencia'] = (el) => {
  const s = DB.obtener('sesiones', el.dataset.sesion);
  const asistencia = { ...(s.asistencia || {}) };
  // Si pulsas el estado que ya tenía, se desmarca
  asistencia[el.dataset.jugador] = asistencia[el.dataset.jugador] === el.dataset.estado ? undefined : el.dataset.estado;
  if (!asistencia[el.dataset.jugador]) delete asistencia[el.dataset.jugador];
  DB.actualizar('sesiones', s.id, { asistencia });
  App.refrescar();
};

Acciones['todos-presentes'] = (el) => {
  const s = DB.obtener('sesiones', el.dataset.id);
  const asistencia = {};
  DB.jugadoresDe(s.equipoId).forEach((j) => { asistencia[j.id] = 'si'; });
  DB.actualizar('sesiones', s.id, { asistencia });
  UI.aviso('Todos marcados como presentes');
  App.refrescar();
};

Acciones['filtrar-tipo'] = (el) => {
  Vistas.entrenos.tipoFiltro = el.dataset.tipo;
  App.refrescar();
};

// Ver un ejercicio con toda su información
Acciones['ver-ejercicio'] = (el, ev) => {
  if (ev.target.closest('[data-accion]') !== el) return; // se pulsó un botón de dentro
  const e = Biblioteca.obtener(el.dataset.id);
  if (!e) return;
  const p = Biblioteca.parte(e.parte);
  UI.modal({
    titulo: e.nombre,
    sinPie: true,
    cuerpo: `
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
        <span class="etiqueta" style="background:color-mix(in srgb, ${p.color} 18%, transparent);color:${p.color}">${p.nombre}</span>
        <span class="etiqueta gris">${Biblioteca.tipo(e.tipo).nombre}</span>
        <span class="etiqueta gris">${UI.icono('reloj', 'peq')} ${e.duracion} min</span>
        ${(e.objetivos || []).map((o) => `<span class="etiqueta">${Biblioteca.objetivo(o).nombre}</span>`).join('')}
        ${e.propio ? '<span class="etiqueta roja">Mío</span>' : ''}
      </div>
      ${e.descripcion ? `<p style="white-space:pre-line">${UI.esc(e.descripcion)}</p>` : ''}
      ${Entrenos.lista('Reglas', e.reglas)}
      ${Entrenos.lista('Variantes', e.variantes)}
      ${Entrenos.lista('Consignas clave', e.consignas, 'consignas')}
      <p class="texto-suave peq">${e.espacio ? '📍 ' + UI.esc(e.espacio) + ' · ' : ''}🎒 ${UI.esc(e.material || '—')}</p>
      ${e.propio ? '' : `<p class="texto-suave peq">Para: ${(e.categorias || Biblioteca.ORDEN).map((c) => DB.categoria(c).nombre).join(', ')}</p>`}
      ${(e.contra || []).length ? `<p class="texto-suave peq">Útil contra rivales que: ${e.contra.map((c) => Biblioteca.estilo(c).nombre.toLowerCase()).join(', ')}</p>` : ''}
      ${e.propio ? `<div class="fila-botones mt">
        <button type="button" class="btn btn-primario" data-accion="editar-ejercicio" data-id="${e.id}">${UI.icono('editar')} Editar</button>
        <button type="button" class="btn btn-peligro" data-accion="borrar-ejercicio" data-id="${e.id}">${UI.icono('papelera')} Borrar</button></div>` : ''}
    `,
  });
};

Acciones['nuevo-ejercicio'] = () => {
  const tipo = ['todos', 'mios'].includes(Vistas.entrenos.tipoFiltro) ? 'tecnico' : Vistas.entrenos.tipoFiltro;
  UI.modal({
    titulo: 'Nuevo ejercicio', cuerpo: formularioEjercicio({ tipo, parte: tipo === 'juego' ? 'juego' : tipo === 'tactico' ? 'tactica' : 'tecnica' }), textoGuardar: 'Crear',
    alGuardar: (f) => {
      const e = leerEjercicio(f);
      if (!e) return false;
      DB.crear('ejercicios', e);
      UI.aviso('Ejercicio guardado en tu biblioteca');
      App.refrescar();
    },
  });
};

Acciones['editar-ejercicio'] = (el) => {
  const e = DB.obtener('ejercicios', el.dataset.id);
  UI.modal({
    titulo: 'Editar ejercicio', cuerpo: formularioEjercicio(e),
    alGuardar: (f) => {
      const datos = leerEjercicio(f);
      if (!datos) return false;
      DB.actualizar('ejercicios', e.id, datos);
      UI.aviso('Ejercicio guardado');
      App.refrescar();
    },
  });
};

Acciones['borrar-ejercicio'] = async (el) => {
  if (await UI.confirmar('Se borrará el ejercicio de tu biblioteca. Las sesiones que ya lo usan lo conservan.', 'Borrar ejercicio')) {
    DB.borrar('ejercicios', el.dataset.id);
    UI.aviso('Ejercicio borrado');
    App.refrescar();
  }
};

Acciones['nueva-preparacion'] = () => {
  UI.modal({
    titulo: 'Preparar partido', cuerpo: formularioPreparacion(), textoGuardar: 'Crear',
    alGuardar: (f) => {
      const p = leerPreparacion(f);
      if (!p) return false;
      // Elegimos de inicio los 3 ejercicios más útiles contra ese rival
      p.ejercicios = Biblioteca.contraEstilos(p.estilos, DB.equipo().categoria).slice(0, 3).map((e) => e.id);
      const nueva = DB.crear('preparaciones', p);
      location.hash = '#/rival/' + nueva.id;
    },
  });
};

Acciones['editar-preparacion'] = (el) => {
  const p = DB.obtener('preparaciones', el.dataset.id);
  UI.modal({
    titulo: 'Editar preparación', cuerpo: formularioPreparacion(p),
    alGuardar: (f) => {
      const datos = leerPreparacion(f);
      if (!datos) return false;
      DB.actualizar('preparaciones', p.id, datos);
      UI.aviso('Preparación guardada');
      App.refrescar();
    },
  });
};

Acciones['borrar-preparacion'] = async (el) => {
  if (await UI.confirmar('Se borrará la preparación de este partido.')) {
    DB.borrar('preparaciones', el.dataset.id);
    location.hash = '#/sesiones/rival';
  }
};

Acciones['anadir-ej-rival'] = (el, ev) => {
  ev.stopPropagation();
  const p = DB.obtener('preparaciones', el.dataset.prep);
  DB.actualizar('preparaciones', p.id, { ejercicios: [...(p.ejercicios || []), el.dataset.ej] });
  App.refrescar();
};

Acciones['quitar-ej-rival'] = (el, ev) => {
  ev.stopPropagation();
  const p = DB.obtener('preparaciones', el.dataset.prep);
  DB.actualizar('preparaciones', p.id, { ejercicios: (p.ejercicios || []).filter((x) => x !== el.dataset.ej) });
  App.refrescar();
};

// Crea una sesión contra el rival: la genera con sus estilos y mete los ejercicios elegidos en su bloque
Acciones['sesion-desde-rival'] = (el) => {
  const p = DB.obtener('preparaciones', el.dataset.id);
  // La sesión, dos días antes del partido (o hoy si ya no da tiempo)
  const fecha = UI.diasHasta(p.fecha) > 2 ? UI.sumarDias(p.fecha, -2) : UI.hoyISO();
  const nueva = Entrenos.crearSesion({ objetivo: 'azar', preparacionId: p.id }, { fecha });
  const usados = new Set();
  const bloques = nueva.bloques.map((b) => {
    const e = (p.ejercicios || []).map((id) => Biblioteca.obtener(id)).find((x) => x && x.parte === b.parte && !usados.has(x.id));
    if (!e) return b;
    usados.add(e.id);
    return { ...b, ejercicioId: e.id, nombre: e.nombre, descripcion: e.descripcion || '', reglas: [...(e.reglas || [])], variantes: [...(e.variantes || [])], consignas: [...(e.consignas || [])], material: e.material || '', espacio: e.espacio || '' };
  });
  DB.actualizar('sesiones', nueva.id, {
    bloques,
    notas: [p.debiles && 'Atacar: ' + p.debiles, p.fuertes && 'Cuidado con: ' + p.fuertes].filter(Boolean).join('\n'),
  });
  UI.aviso('Sesión creada contra ' + p.rival);
  location.hash = '#/sesion/' + nueva.id;
};
