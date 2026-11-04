/* =============================================================
   ENTRENOS.JS · Fase 2: entrenamientos
   -------------------------------------------------------------
   Pantallas:
     #/sesiones             -> lista de sesiones
     #/sesiones/biblioteca  -> biblioteca de ejercicios
     #/sesiones/rival       -> preparar el partido de la semana
     #/sesion/ID            -> detalle de una sesión (+ asistencia)
     #/rival/ID             -> detalle de la preparación de un rival
   ============================================================= */

/* ---------- AYUDAS DE ENTRENAMIENTOS ---------- */
const Entrenos = {
  // Duración por defecto de cada parte (minutos)
  DURACIONES: { calentamiento: 15, tecnica: 20, tactica: 25, vuelta: 10 },

  // Crea las 4 partes vacías de una sesión
  partesVacias(duraciones = Entrenos.DURACIONES) {
    const partes = {};
    Biblioteca.PARTES.forEach((p) => { partes[p.id] = { duracion: Number(duraciones[p.id]) || 0, ejercicios: [] }; });
    return partes;
  },

  duracionTotal(s) {
    return Biblioteca.PARTES.reduce((t, p) => t + (Number(s.partes?.[p.id]?.duracion) || 0), 0);
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
      .sort((a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || '')));
  },

  // Fila de una sesión en las listas
  item(s) {
    const cat = DB.categoria(s.categoria);
    const total = Entrenos.duracionTotal(s) || 1;
    const asis = Entrenos.resumenAsistencia(s);
    const d = new Date(s.fecha + 'T12:00:00');
    return `
      <a class="item" href="#/sesion/${s.id}">
        <div class="fecha-bloque ${UI.diasHasta(s.fecha) < 0 ? 'pasada' : ''}">
          <b>${d.getDate()}</b><span>${d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}</span>
        </div>
        <div class="item-cuerpo">
          <div class="item-titulo">${UI.esc(s.titulo || 'Entrenamiento')}</div>
          <div class="item-sub">
            <span class="etiqueta" style="background:color-mix(in srgb, ${cat.color} 15%, transparent);color:${cat.color}">${cat.nombre}</span>
            <span>${UI.cuandoTexto(s.fecha)}${s.hora ? ' · ' + s.hora : ''}</span>
            <span>· ${Entrenos.duracionTotal(s)} min</span>
          </div>
          <div class="barra-partes">${Biblioteca.PARTES.map((p) => `<span style="flex:${(s.partes?.[p.id]?.duracion || 0) / total};background:${p.color}"></span>`).join('')}</div>
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
            <span>${p.nombre}</span><span>· ${e.duracion} min</span>
            ${(e.objetivos || []).slice(0, 2).map((o) => `<span class="etiqueta gris">${Biblioteca.objetivo(o).nombre}</span>`).join('')}
            ${e.propio ? '<span class="etiqueta roja">Propio</span>' : ''}
          </div>
        </div>
        ${extra}
      </div>`;
  },
};

/* ---------- PANTALLA: ENTRENOS (con 3 secciones) ---------- */
Vistas.entrenos = {
  titulo: 'Sesiones',
  tab: 'sesiones',
  parteFiltro: 'todas',
  busqueda: '',

  // Las 4 secciones de la pestaña Sesiones (el generador vive en asistente.js)
  pestañas(activa) {
    const lista = [['#/sesiones/sesiones', 'sesiones', 'Sesiones'], ['#/sesiones/biblioteca', 'biblioteca', 'Ejercicios'],
      ['#/sesiones/rival', 'rival', 'Rival'], ['#/asistente', 'generador', 'Generador']];
    return `<div class="segmentado">${lista.map(([href, id, t]) => `<a href="${href}" class="${activa === id ? 'activo' : ''}">${t}</a>`).join('')}</div>`;
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

  montar(seccion) {
    const caja = document.getElementById('buscar-ejercicio');
    if (caja) caja.addEventListener('input', () => {
      Vistas.entrenos.busqueda = caja.value;
      document.getElementById('lista-ejercicios').innerHTML = Vistas.entrenos.listaEjercicios();
    });
  },

  /* --- Sección: sesiones --- */
  listaSesiones() {
    const todas = Entrenos.sesiones();
    const hoy = UI.hoyISO();
    const proximas = todas.filter((s) => s.fecha >= hoy);
    const pasadas = todas.filter((s) => s.fecha < hoy).reverse();
    return `
      <button class="btn btn-primario btn-bloque" data-accion="nueva-sesion">${UI.icono('mas')} Nueva sesión</button>
      <div class="seccion-titulo"><h2>Próximas</h2><span class="texto-suave peq">${proximas.length}</span></div>
      <div class="lista en-rejilla">${proximas.map(Entrenos.item).join('') || UI.vacio('calendario', 'Sin sesiones próximas', 'Crea una sesión o usa el Asistente para generarla.')}</div>
      ${pasadas.length ? `<div class="seccion-titulo"><h2>Anteriores</h2><span class="texto-suave peq">${pasadas.length}</span></div>
      <div class="lista en-rejilla">${pasadas.map(Entrenos.item).join('')}</div>` : ''}
      <button class="fab solo-movil" data-accion="nueva-sesion" aria-label="Nueva sesión">${UI.icono('mas')}</button>
    `;
  },

  /* --- Sección: biblioteca --- */
  biblioteca() {
    return `
      <div class="chips">
        <button class="chip ${this.parteFiltro === 'todas' ? 'activo' : ''}" data-accion="filtrar-parte" data-parte="todas">Todas las partes</button>
        ${Biblioteca.PARTES.map((p) => `<button class="chip ${this.parteFiltro === p.id ? 'activo' : ''}" data-accion="filtrar-parte" data-parte="${p.id}">${p.nombre}</button>`).join('')}
      </div>
      <div class="barra-filtros">
        <div class="buscador">${UI.icono('buscar')}<input type="search" id="buscar-ejercicio" placeholder="Buscar ejercicio u objetivo" value="${UI.esc(this.busqueda)}" aria-label="Buscar ejercicio"></div>
        <button class="btn btn-primario" data-accion="nuevo-ejercicio">${UI.icono('mas')} Crear</button>
      </div>
      <div class="lista en-rejilla" id="lista-ejercicios">${this.listaEjercicios()}</div>
    `;
  },
  listaEjercicios() {
    const q = UI.normalizar(this.busqueda);
    const lista = Biblioteca.para(DB.equipo().categoria, this.parteFiltro === 'todas' ? null : this.parteFiltro)
      .filter((e) => !q || UI.normalizar(e.nombre + ' ' + (e.objetivos || []).map((o) => Biblioteca.objetivo(o).nombre).join(' ') + ' ' + e.descripcion).includes(q));
    return lista.map((e) => Entrenos.itemEjercicio(e)).join('') || UI.vacio('balon', 'Sin ejercicios', 'Prueba con otra categoría o crea uno propio.');
  },

  /* --- Sección: preparar rival --- */
  rivales() {
    const lista = DB.delEquipo('preparaciones')
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    return `
      <div class="aviso-info azul">${UI.icono('diana')}<div>Apunta cómo juega el rival y la app te sugiere <b>ejercicios para contrarrestarlo</b>. Luego puedes convertirlos en una sesión.</div></div>
      <button class="btn btn-primario btn-bloque" data-accion="nueva-preparacion">${UI.icono('mas')} Preparar partido</button>
      <div class="lista en-rejilla mt">
        ${lista.map((p) => {
          const c = DB.categoria(p.categoria);
          return `<a class="item" href="#/rival/${p.id}">
            <div class="icono-parte" style="--c:var(--rojo)">${UI.icono('escudo')}</div>
            <div class="item-cuerpo">
              <div class="item-titulo">vs ${UI.esc(p.rival)}</div>
              <div class="item-sub"><span class="etiqueta" style="background:color-mix(in srgb, ${c.color} 15%, transparent);color:${c.color}">${c.nombre}</span><span>${UI.cuandoTexto(p.fecha)}</span>
              ${(p.estilos || []).slice(0, 2).map((e) => `<span class="etiqueta gris">${Biblioteca.estilo(e).nombre}</span>`).join('')}</div>
            </div>${UI.icono('adelante', 'flecha')}</a>`;
        }).join('') || UI.vacio('escudo', 'Sin preparaciones', 'Prepara el próximo partido analizando al rival.')}
      </div>`;
  },
};

/* ---------- PANTALLA: DETALLE DE SESIÓN ---------- */
Vistas.sesion = {
  tab: 'sesiones',
  atras: '#/sesiones',
  titulo: (id) => DB.obtener('sesiones', id)?.titulo || 'Sesión',

  pintar(id) {
    const s = DB.obtener('sesiones', id);
    if (!s) return UI.vacio('pizarra', 'Sesión no encontrada', 'Puede que se haya borrado.', '<a class="btn" href="#/sesiones">Volver</a>');
    const cat = DB.categoria(s.categoria);
    const prep = s.preparacionId ? DB.obtener('preparaciones', s.preparacionId) : null;

    return `
      <section class="tarjeta-hero">
        <img src="assets/icons/escudo-512.png" class="marca-agua" alt="">
        <span class="etiqueta" style="background:rgba(255,255,255,.16);color:#fff">${cat.nombre}</span>
        <h1 style="margin:8px 0 4px">${UI.esc(s.titulo || 'Entrenamiento')}</h1>
        <p style="opacity:.8;margin:0">${UI.mayuscula(UI.fechaLarga(s.fecha))}${s.hora ? ' · ' + s.hora : ''}</p>
        ${prep ? `<p style="margin:8px 0 0"><a href="#/rival/${prep.id}" style="color:#fff;text-decoration:underline">Preparación vs ${UI.esc(prep.rival)}</a></p>` : ''}
        <div class="cifras mt">
          <div class="cifra"><b>${Entrenos.duracionTotal(s)}</b><span>minutos</span></div>
          <div class="cifra"><b>${Biblioteca.PARTES.reduce((n, p) => n + (s.partes?.[p.id]?.ejercicios?.length || 0), 0)}</b><span>ejercicios</span></div>
          <div class="cifra"><b>${Entrenos.resumenAsistencia(s).pct ?? '—'}${Entrenos.resumenAsistencia(s).pct !== null ? '%' : ''}</b><span>asistencia</span></div>
        </div>
      </section>

      <div class="fila-botones mt">
        <button class="btn btn-primario" data-accion="editar-sesion" data-id="${s.id}">${UI.icono('editar')} Editar</button>
        <button class="btn btn-borde" data-accion="duplicar-sesion" data-id="${s.id}">${UI.icono('copiar')} Duplicar</button>
        <button class="btn btn-peligro" data-accion="borrar-sesion" data-id="${s.id}">${UI.icono('papelera')} Borrar</button>
      </div>

      <div class="rejilla-ficha mt">
        ${Biblioteca.PARTES.map((p) => this.parteHTML(s, p)).join('')}
      </div>

      ${s.notas ? `<section class="tarjeta mt"><h2>Notas</h2><p class="mt" style="white-space:pre-line">${UI.esc(s.notas)}</p></section>` : ''}

      ${this.asistenciaHTML(s)}
    `;
  },

  // Una parte de la sesión (calentamiento, técnica…) con sus ejercicios
  parteHTML(s, p) {
    const parte = s.partes?.[p.id] || { duracion: 0, ejercicios: [] };
    const ejercicios = parte.ejercicios.map((id) => Biblioteca.obtener(id)).filter(Boolean);
    const suma = ejercicios.reduce((t, e) => t + Number(e.duracion || 0), 0);
    return `
      <section class="tarjeta parte" style="--c:${p.color}">
        <div class="parte-cab">
          <div class="icono-parte" style="--c:${p.color}">${UI.icono(p.icono)}</div>
          <div style="flex:1"><h3>${p.nombre}</h3><span class="texto-suave peq">${parte.duracion} min previstos${ejercicios.length ? ` · ${suma} min en ejercicios` : ''}</span></div>
          ${suma > parte.duracion ? '<span class="etiqueta amarilla" title="Los ejercicios suman más tiempo del previsto">+tiempo</span>' : ''}
        </div>
        <div class="lista mt">
          ${ejercicios.map((e, i) => `
            <div class="ejercicio-fila">
              <button class="ejercicio-nombre" data-accion="ver-ejercicio" data-id="${e.id}">
                <b>${UI.esc(e.nombre)}</b><span>${e.duracion} min · ${UI.esc(e.material || '')}</span>
              </button>
              <button class="btn btn-icono" data-accion="quitar-ejercicio" data-sesion="${s.id}" data-parte="${p.id}" data-indice="${i}" aria-label="Quitar ejercicio">${UI.icono('cerrar')}</button>
            </div>`).join('') || '<p class="texto-suave peq">Sin ejercicios todavía.</p>'}
        </div>
        <button class="btn btn-borde btn-peq mt" data-accion="elegir-ejercicio" data-sesion="${s.id}" data-parte="${p.id}">${UI.icono('mas')} Añadir ejercicio</button>
      </section>`;
  },

  // Lista para pasar asistencia
  asistenciaHTML(s) {
    const jugadores = DB.jugadoresDe(s.equipoId);
    const r = Entrenos.resumenAsistencia(s);
    return `
      <div class="seccion-titulo"><h2>Asistencia</h2>
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
        }).join('') || '<p class="texto-suave">No hay jugadores en esta categoría.</p>'}
      </section>`;
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

      <div class="seccion-titulo"><h2>Ejercicios elegidos</h2><span class="texto-suave peq">${elegidos.length}</span></div>
      <div class="lista">
        ${elegidos.map((e) => Entrenos.itemEjercicio(e, `<button class="btn btn-icono" data-accion="quitar-ej-rival" data-prep="${p.id}" data-ej="${e.id}" aria-label="Quitar">${UI.icono('cerrar')}</button>`)).join('') ||
          '<p class="texto-suave peq">Añade ejercicios de las sugerencias de abajo.</p>'}
      </div>
      ${elegidos.length ? `<button class="btn btn-rojo btn-bloque mt" data-accion="sesion-desde-rival" data-id="${p.id}">${UI.icono('pizarra')} Crear sesión con estos ejercicios</button>` : ''}

      <div class="seccion-titulo"><h2>Sugeridos para contrarrestarle</h2></div>
      <div class="lista">
        ${sugeridos.map((e) => Entrenos.itemEjercicio(e, `<button class="btn btn-icono btn-primario" data-accion="anadir-ej-rival" data-prep="${p.id}" data-ej="${e.id}" aria-label="Añadir">${UI.icono('mas')}</button>`)).join('') ||
          `<p class="texto-suave peq">${(p.estilos || []).length ? 'Ya has añadido todas las sugerencias.' : 'Marca cómo juega el rival (Editar) para recibir sugerencias.'}</p>`}
      </div>
    `;
  },
};

/* ---------- FORMULARIOS ---------- */
function formularioSesion(s = {}) {
  const partes = s.partes || Entrenos.partesVacias();
  return `
    <div class="campo"><label for="s-titulo">Título</label>
      <input type="text" id="s-titulo" name="titulo" maxlength="60" value="${UI.esc(s.titulo)}" placeholder="Ej.: Pase y desmarque"></div>
    <div class="rejilla-2">
      <div class="campo"><label for="s-fecha">Fecha *</label><input type="date" id="s-fecha" name="fecha" value="${s.fecha || UI.hoyISO()}"></div>
      <div class="campo"><label for="s-hora">Hora</label><input type="time" id="s-hora" name="hora" value="${s.hora || '18:00'}"></div>
    </div>
    <span class="etiqueta-campo">Duración de cada parte (minutos)</span>
    <div class="rejilla-2 mt" style="margin-top:6px">
      ${Biblioteca.PARTES.map((p) => `<div class="campo"><label for="s-${p.id}" style="color:${p.color}">${p.nombre}</label>
        <input type="number" id="s-${p.id}" name="dur-${p.id}" min="0" max="120" inputmode="numeric" value="${partes[p.id]?.duracion ?? 0}"></div>`).join('')}
    </div>
    <div class="campo"><label for="s-notas">Notas</label><textarea id="s-notas" name="notas" placeholder="Objetivo de la sesión, material, recordatorios…">${UI.esc(s.notas)}</textarea></div>
  `;
}

function leerSesion(form, anterior = {}) {
  const d = UI.leerFormulario(form);
  if (!d.fecha) { UI.aviso('Indica la fecha', 'error'); return null; }
  const partes = anterior.partes ? JSON.parse(JSON.stringify(anterior.partes)) : Entrenos.partesVacias();
  Biblioteca.PARTES.forEach((p) => { partes[p.id].duracion = Number(d['dur-' + p.id]) || 0; });
  return { titulo: d.titulo || 'Entrenamiento', fecha: d.fecha, hora: d.hora, notas: d.notas, partes };
}

function formularioEjercicio(e = {}) {
  return `
    <div class="campo"><label for="e-nombre">Nombre *</label><input type="text" id="e-nombre" name="nombre" maxlength="60" value="${UI.esc(e.nombre)}"></div>
    <div class="rejilla-2">
      <div class="campo"><label for="e-parte">Parte de la sesión</label>
        <select id="e-parte" name="parte">${Biblioteca.PARTES.map((p) => `<option value="${p.id}" ${e.parte === p.id ? 'selected' : ''}>${p.nombre}</option>`).join('')}</select></div>
      <div class="campo"><label for="e-objetivo">Objetivo</label>
        <select id="e-objetivo" name="objetivo">${Biblioteca.OBJETIVOS.map((o) => `<option value="${o.id}" ${(e.objetivos || [])[0] === o.id ? 'selected' : ''}>${o.nombre}</option>`).join('')}</select></div>
      <div class="campo"><label for="e-duracion">Duración (min) *</label><input type="number" id="e-duracion" name="duracion" min="1" max="90" inputmode="numeric" value="${e.duracion || 10}"></div>
      <div class="campo"><label for="e-material">Material</label><input type="text" id="e-material" name="material" maxlength="80" value="${UI.esc(e.material)}" placeholder="Conos, petos…"></div>
    </div>
    <div class="campo"><label for="e-desc">Descripción</label><textarea id="e-desc" name="descripcion" placeholder="Cómo se organiza, reglas, variantes…">${UI.esc(e.descripcion)}</textarea></div>
    <p class="texto-suave peq">Se guarda en la biblioteca de ${UI.esc(DB.equipo().nombre)}.</p>
  `;
}

function leerEjercicio(form) {
  const d = UI.leerFormulario(form);
  if (!d.nombre) { UI.aviso('Escribe un nombre', 'error'); return null; }
  return { nombre: d.nombre, parte: d.parte, objetivos: [d.objetivo], duracion: Number(d.duracion) || 10, material: d.material, descripcion: d.descripcion };
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
Acciones['nueva-sesion'] = () => {
  UI.modal({
    titulo: 'Nueva sesión', cuerpo: formularioSesion(), textoGuardar: 'Crear',
    alGuardar: (f) => {
      const s = leerSesion(f);
      if (!s) return false;
      const nueva = DB.crear('sesiones', { ...s, asistencia: {} });
      UI.aviso('Sesión creada. Añade ejercicios a cada parte.');
      location.hash = '#/sesion/' + nueva.id;
    },
  });
};

Acciones['editar-sesion'] = (el) => {
  const s = DB.obtener('sesiones', el.dataset.id);
  UI.modal({
    titulo: 'Editar sesión', cuerpo: formularioSesion(s),
    alGuardar: (f) => {
      const datos = leerSesion(f, s);
      if (!datos) return false;
      DB.actualizar('sesiones', s.id, datos);
      UI.aviso('Sesión guardada');
      App.refrescar();
    },
  });
};

Acciones['duplicar-sesion'] = (el) => {
  const s = DB.obtener('sesiones', el.dataset.id);
  const copia = JSON.parse(JSON.stringify(s));
  delete copia.id; delete copia.ejemplo; delete copia.creado; delete copia.nube;
  copia.fecha = UI.sumarDias(s.fecha, 7); // la misma sesión, una semana después
  copia.asistencia = {};
  const nueva = DB.crear('sesiones', copia);
  UI.aviso('Sesión duplicada para la semana siguiente');
  location.hash = '#/sesion/' + nueva.id;
};

Acciones['borrar-sesion'] = async (el) => {
  if (await UI.confirmar('Se borrará la sesión y su asistencia.')) {
    DB.borrar('sesiones', el.dataset.id);
    UI.aviso('Sesión borrada');
    location.hash = '#/sesiones';
  }
};

// Abre la lista de ejercicios adecuados para esa parte y categoría
Acciones['elegir-ejercicio'] = (el) => {
  const s = DB.obtener('sesiones', el.dataset.sesion);
  const parte = el.dataset.parte;
  const lista = Biblioteca.para(s.categoria, parte);
  UI.modal({
    titulo: 'Añadir a ' + Biblioteca.parte(parte).nombre,
    sinPie: true,
    cuerpo: `<p class="texto-suave peq" style="margin-bottom:10px">Ejercicios adecuados para ${DB.categoria(s.categoria).nombre}. Toca + para añadir.</p>
      <div class="lista">${lista.map((e) => Entrenos.itemEjercicio(e,
        `<button type="button" class="btn btn-icono btn-primario" data-accion="anadir-ejercicio" data-sesion="${s.id}" data-parte="${parte}" data-ej="${e.id}" aria-label="Añadir">${UI.icono('mas')}</button>`)).join('')
        || UI.vacio('balon', 'No hay ejercicios', 'Crea uno propio en la Biblioteca.')}</div>`,
  });
};

Acciones['anadir-ejercicio'] = (el, ev) => {
  ev.stopPropagation();
  const s = DB.obtener('sesiones', el.dataset.sesion);
  s.partes[el.dataset.parte].ejercicios.push(el.dataset.ej);
  DB.actualizar('sesiones', s.id, { partes: s.partes });
  UI.aviso('Ejercicio añadido');
  App.refrescar();
};

Acciones['quitar-ejercicio'] = (el) => {
  const s = DB.obtener('sesiones', el.dataset.sesion);
  s.partes[el.dataset.parte].ejercicios.splice(Number(el.dataset.indice), 1);
  DB.actualizar('sesiones', s.id, { partes: s.partes });
  App.refrescar();
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

Acciones['filtrar-parte'] = (el) => {
  Vistas.entrenos.parteFiltro = el.dataset.parte;
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
        <span class="etiqueta gris">${UI.icono('reloj', 'peq')} ${e.duracion} min</span>
        ${(e.objetivos || []).map((o) => `<span class="etiqueta">${Biblioteca.objetivo(o).nombre}</span>`).join('')}
        ${e.propio ? '<span class="etiqueta roja">Propio</span>' : ''}
      </div>
      <h3>Descripción</h3><p class="mt" style="margin-top:6px;white-space:pre-line">${UI.esc(e.descripcion || '—')}</p>
      <h3 class="mt">Material</h3><p style="margin-top:6px">${UI.esc(e.material || '—')}</p>
      ${e.propio ? `<p class="texto-suave peq mt">Ejercicio propio de ${UI.esc(DB.obtener('equipos', e.equipoId)?.nombre || 'tu equipo')}.</p>` : `<h3 class="mt">Categorías</h3><p style="margin-top:6px">${(e.categorias || Biblioteca.ORDEN).map((c) => DB.categoria(c).nombre).join(', ')}</p>`}
      ${(e.contra || []).length ? `<h3 class="mt">Útil contra rivales que…</h3><p style="margin-top:6px">${e.contra.map((c) => Biblioteca.estilo(c).nombre.toLowerCase()).join(', ')}</p>` : ''}
      ${e.propio ? `<div class="fila-botones mt">
        <button type="button" class="btn btn-primario" data-accion="editar-ejercicio" data-id="${e.id}">${UI.icono('editar')} Editar</button>
        <button type="button" class="btn btn-peligro" data-accion="borrar-ejercicio" data-id="${e.id}">${UI.icono('papelera')} Borrar</button></div>` : ''}
    `,
  });
};

Acciones['nuevo-ejercicio'] = () => {
  UI.modal({
    titulo: 'Nuevo ejercicio', cuerpo: formularioEjercicio({ parte: Vistas.entrenos.parteFiltro !== 'todas' ? Vistas.entrenos.parteFiltro : 'tecnica' }), textoGuardar: 'Crear',
    alGuardar: (f) => {
      const e = leerEjercicio(f);
      if (!e) return false;
      DB.crear('ejercicios', e);
      UI.aviso('Ejercicio creado');
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
  if (await UI.confirmar('Se borrará el ejercicio. Las sesiones que lo usan dejarán de mostrarlo.')) {
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
      p.ejercicios = Biblioteca.contraEstilos(p.estilos, p.categoria).slice(0, 3).map((e) => e.id);
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

// Convierte los ejercicios elegidos en una sesión, colocando cada uno en su parte
Acciones['sesion-desde-rival'] = (el) => {
  const p = DB.obtener('preparaciones', el.dataset.id);
  const partes = Entrenos.partesVacias();
  (p.ejercicios || []).forEach((id) => {
    const e = Biblioteca.obtener(id);
    if (e) partes[e.parte].ejercicios.push(id);
  });
  // Completamos las partes que hayan quedado vacías
  ['calentamiento', 'tecnica', 'vuelta'].forEach((parte) => {
    if (!partes[parte].ejercicios.length) {
      const e = Biblioteca.para(p.categoria, parte)[0];
      if (e) partes[parte].ejercicios.push(e.id);
    }
  });
  // La sesión, dos días antes del partido (o hoy si ya no da tiempo)
  const fecha = UI.diasHasta(p.fecha) > 2 ? UI.sumarDias(p.fecha, -2) : UI.hoyISO();
  const nueva = DB.crear('sesiones', {
    titulo: 'Preparación vs ' + p.rival, fecha, hora: '18:00', equipoId: p.equipoId,
    partes, asistencia: {}, preparacionId: p.id,
    notas: [p.debiles && 'Atacar: ' + p.debiles, p.fuertes && 'Cuidado con: ' + p.fuertes].filter(Boolean).join('\n'),
  });
  UI.aviso('Sesión creada');
  location.hash = '#/sesion/' + nueva.id;
};
