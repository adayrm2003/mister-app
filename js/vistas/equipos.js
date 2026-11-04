/* =============================================================
   EQUIPOS.JS · Mis equipos
   -------------------------------------------------------------
   Cada entrenador puede tener varios equipos (ej.: "Benjamín A" y
   "Juvenil"). Cada equipo guarda su categoría, su modalidad
   (fútbol 7, 8 u 11) y la duración habitual del entreno.
   Toda la app muestra solo lo del EQUIPO ACTIVO.

   Pantallas:
     #/bienvenida -> crear el primer equipo (la primera vez)
     #/equipos    -> lista de equipos para editarlos o borrarlos
   Y la ventana "Cambiar de equipo" que se abre desde la cabecera.
   ============================================================= */

const Equipos = {
  DURACIONES: [60, 75, 90],

  // Formulario de equipo (nuevo o editar)
  formulario(eq = {}) {
    const cat = eq.categoria || 'alevin';
    const modalidad = eq.modalidad || DB.categoria(cat).futbol;
    const duracion = eq.duracion || 75;
    return `
      <div class="campo"><label for="eq-nombre">Nombre del equipo *</label>
        <input type="text" id="eq-nombre" name="nombre" maxlength="30" value="${UI.esc(eq.nombre)}" placeholder="Ej.: Benjamín A" autocomplete="off"></div>

      <span class="etiqueta-campo">Categoría</span>
      <div class="opciones-cat">
        ${DB.CATEGORIAS.map((c) => `<label class="opcion-cat" style="--c:${c.color}">
          <input type="radio" name="categoria" value="${c.id}" ${cat === c.id ? 'checked' : ''}>
          <span><b>${c.nombre}</b><small>${c.edades} años</small></span></label>`).join('')}
      </div>

      <span class="etiqueta-campo">Modalidad</span>
      <div class="chips-check" style="margin-top:6px">
        ${DB.MODALIDADES.map((m) => `<label class="chip-check"><input type="radio" name="modalidad" value="${m}" ${modalidad === m ? 'checked' : ''}><span>Fútbol ${m}</span></label>`).join('')}
      </div>

      <span class="etiqueta-campo">Duración habitual del entreno</span>
      <div class="chips-check" style="margin-top:6px">
        ${Equipos.DURACIONES.map((d) => `<label class="chip-check"><input type="radio" name="duracionRapida" value="${d}" ${duracion === d ? 'checked' : ''}><span>${d} min</span></label>`).join('')}
        <input type="number" name="duracion" min="20" max="240" inputmode="numeric" value="${duracion}" aria-label="Minutos" class="duracion-libre">
      </div>`;
  },

  // Hace que el formulario reaccione: al elegir categoría se propone su modalidad
  preparar(form) {
    form.querySelectorAll('input[name=categoria]').forEach((r) => r.addEventListener('change', () => {
      const m = DB.categoria(r.value).futbol;
      form.querySelector(`input[name=modalidad][value="${m}"]`).checked = true;
      const nombre = form.querySelector('#eq-nombre');
      if (!nombre.value || nombre.dataset.auto) { nombre.value = DB.categoria(r.value).nombre; nombre.dataset.auto = '1'; }
    }));
    form.querySelector('#eq-nombre').addEventListener('input', (e) => { delete e.target.dataset.auto; });
    const libre = form.querySelector('input[name=duracion]');
    form.querySelectorAll('input[name=duracionRapida]').forEach((r) => r.addEventListener('change', () => { libre.value = r.value; }));
    libre.addEventListener('input', () => {
      form.querySelectorAll('input[name=duracionRapida]').forEach((r) => { r.checked = r.value === libre.value; });
    });
  },

  leer(form) {
    const d = UI.leerFormulario(form);
    if (!d.nombre) { UI.aviso('Escribe el nombre del equipo', 'error'); return null; }
    const duracion = Number(d.duracion);
    if (!duracion || duracion < 20 || duracion > 240) { UI.aviso('La duración va de 20 a 240 minutos', 'error'); return null; }
    return { nombre: d.nombre, categoria: d.categoria, modalidad: Number(d.modalidad), duracion };
  },

  // Fila de un equipo (en el selector y en la lista)
  fila(eq, extra = '') {
    const cat = DB.categoria(eq.categoria);
    const activo = DB.equipo()?.id === eq.id;
    return `
      <div class="item equipo-fila ${activo ? 'activo' : ''}" data-accion="cambiar-a-equipo" data-id="${eq.id}">
        <div class="icono-parte" style="--c:${cat.color}">${UI.icono('escudo')}</div>
        <div class="item-cuerpo">
          <div class="item-titulo">${UI.esc(eq.nombre)}</div>
          <div class="item-sub"><span>${cat.nombre}</span><span>· F${eq.modalidad}</span><span>· ${eq.duracion}'</span><span>· ${UI.plural(DB.jugadoresDe(eq.id).length, 'jugador', 'jugadores')}</span></div>
        </div>
        ${extra || (activo ? `<span class="etiqueta verde">${UI.icono('check', 'peq')} Activo</span>` : '')}
      </div>`;
  },
};

/* ---------- PANTALLA: BIENVENIDA (primer equipo) ---------- */
Vistas.bienvenida = {
  titulo: 'Bienvenida',
  sinMenu: true,

  pintar() {
    return `
      <div class="acceso">
        <img src="assets/icons/escudo-512.png" alt="Escudo C.D. El Tranvía" class="acceso-escudo">
        <h1>Crea tu primer equipo</h1>
        <p class="texto-suave">La app se adapta a su categoría: ejercicios, sesiones y consejos.</p>
        <section class="tarjeta mt">
          <form id="form-primer-equipo" novalidate>
            ${Equipos.formulario()}
            <button type="submit" class="btn btn-rojo btn-bloque mt">${UI.icono('check')} Crear equipo</button>
          </form>
        </section>
        <button class="btn btn-borde mt" data-accion="cargar-ejemplo">Prefiero ver un ejemplo primero</button>
      </div>`;
  },

  montar() {
    const form = document.getElementById('form-primer-equipo');
    Equipos.preparar(form);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const datos = Equipos.leer(form);
      if (!datos) return;
      const eq = DB.crear('equipos', datos);
      DB.cambiarEquipo(eq.id);
      UI.aviso(`¡${eq.nombre} creado!`);
      location.hash = '#/hoy';
      App.refrescar();
    });
  },
};

/* ---------- PANTALLA: MIS EQUIPOS ---------- */
Vistas.equipos = {
  titulo: 'Mis equipos',
  tab: 'ajustes',
  atras: '#/ajustes',

  pintar() {
    const lista = DB.equipos();
    return `
      <div class="pantalla-cab"><div><h1>Mis equipos</h1><p>Toca uno para activarlo</p></div>
        <button class="btn btn-primario" data-accion="nuevo-equipo">${UI.icono('mas')} <span>Nuevo</span></button></div>
      <div class="lista">
        ${lista.map((eq) => Equipos.fila(eq, `
          <button class="btn btn-icono" style="background:none" data-accion="editar-equipo" data-id="${eq.id}" aria-label="Editar ${UI.esc(eq.nombre)}">${UI.icono('editar')}</button>
          <button class="btn btn-icono" style="background:none;color:var(--rojo)" data-accion="borrar-equipo" data-id="${eq.id}" aria-label="Borrar ${UI.esc(eq.nombre)}">${UI.icono('papelera')}</button>`)).join('')}
      </div>`;
  },
};

/* ---------- AJUSTES: el equipo activo, arriba del todo ---------- */
(Vistas.ajustes.primero = Vistas.ajustes.primero || []).push(() => {
  const eq = DB.equipo();
  if (!eq) return '';
  const cat = DB.categoria(eq.categoria);
  return `
    <section class="tarjeta">
      <div class="parte-cab">
        <div class="icono-parte" style="--c:${cat.color}">${UI.icono('escudo')}</div>
        <div style="flex:1"><span class="texto-suave peq">Equipo activo</span><h2>${UI.esc(eq.nombre)}</h2></div>
        <button class="btn btn-borde btn-peq" data-accion="editar-equipo" data-id="${eq.id}">${UI.icono('editar')} Editar</button>
      </div>
      <div class="campo mt">
        <label for="aj-categoria">Categoría</label>
        <select id="aj-categoria" data-al-cambiar="cambiar-categoria-equipo">
          ${DB.CATEGORIAS.map((c) => `<option value="${c.id}" ${eq.categoria === c.id ? 'selected' : ''}>${c.nombre} (${c.edades} años)</option>`).join('')}
        </select>
        <small>Si la cambias, tus jugadores, sesiones y partidos se mantienen.</small>
      </div>
      <a class="btn btn-borde btn-bloque" href="#/equipos">${UI.icono('equipo')} Mis equipos (${DB.equipos().length})</a>
    </section>`;
});

/* ---------- ACCIONES ---------- */
// Ventana para cambiar de equipo (desde la cabecera)
Acciones['elegir-equipo'] = () => {
  if (!DB.equipo()) return;
  UI.modal({
    titulo: 'Cambiar de equipo',
    sinPie: true,
    cuerpo: `
      <div class="lista">${DB.equipos().map((eq) => Equipos.fila(eq)).join('')}</div>
      <div class="fila-botones mt">
        <button type="button" class="btn btn-primario" data-accion="nuevo-equipo">${UI.icono('mas')} Nuevo equipo</button>
        <a class="btn btn-borde" href="#/equipos">${UI.icono('editar')} Gestionar</a>
      </div>`,
  });
};

Acciones['cambiar-a-equipo'] = (el, ev) => {
  if (ev.target.closest('[data-accion]') !== el) return; // se pulsó editar/borrar
  const eq = DB.obtener('equipos', el.dataset.id);
  if (!eq) return;
  DB.cambiarEquipo(eq.id);
  UI.cerrarModal();
  UI.aviso(`Equipo activo: ${eq.nombre}`);
  App.refrescar();
};

Acciones['nuevo-equipo'] = () => {
  const form = UI.modal({
    titulo: 'Nuevo equipo',
    textoGuardar: 'Crear',
    cuerpo: Equipos.formulario(),
    alGuardar: (f) => {
      const datos = Equipos.leer(f);
      if (!datos) return false;
      const eq = DB.crear('equipos', datos);
      DB.cambiarEquipo(eq.id);
      UI.aviso(`${eq.nombre} creado y activado`);
      App.refrescar();
    },
  });
  Equipos.preparar(form);
};

Acciones['editar-equipo'] = (el) => {
  const eq = DB.obtener('equipos', el.dataset.id);
  const form = UI.modal({
    titulo: `Editar ${eq.nombre}`,
    cuerpo: Equipos.formulario(eq),
    alGuardar: (f) => {
      const datos = Equipos.leer(f);
      if (!datos) return false;
      DB.actualizarEquipo(eq.id, datos);
      UI.aviso('Equipo guardado');
      App.refrescar();
    },
  });
  Equipos.preparar(form);
};

Acciones['borrar-equipo'] = async (el) => {
  const eq = DB.obtener('equipos', el.dataset.id);
  const r = DB.resumenEquipo(eq.id);
  const mensaje = `Se borrará «${eq.nombre}» con ${UI.plural(r.jugadores, 'jugador', 'jugadores')}, ${UI.plural(r.sesiones, 'sesión', 'sesiones')} y ${UI.plural(r.partidos, 'partido')}${eq.nube ? ', también de la nube' : ''}. No se puede deshacer. Si lo necesitas, descarga antes una copia de seguridad.`;
  if (!(await UI.confirmar(mensaje, 'Borrar equipo'))) return;
  DB.borrarEquipo(eq.id);
  UI.aviso(`${eq.nombre} borrado`);
  location.hash = DB.equipo() ? '#/equipos' : '#/bienvenida';
  App.refrescar();
};

Acciones['cambiar-categoria-equipo'] = (el) => {
  const eq = DB.equipo();
  const cat = DB.categoria(el.value);
  DB.actualizarEquipo(eq.id, { categoria: cat.id });
  UI.aviso(`Ahora ${eq.nombre} es ${cat.nombre}`);
  App.refrescar();
};
