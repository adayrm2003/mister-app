/* =============================================================
   PLANTILLA.JS · Jugadores del equipo activo
   -------------------------------------------------------------
   Contiene dos pantallas:
     - "plantilla": la lista de jugadores
     - "jugador":   la ficha de un jugador (sus números de la temporada)
   y las acciones de sus botones (añadir, editar, borrar…).

   PRIVACIDAD: los jugadores son menores. De cada uno guardamos
   SOLO su nombre de pila (o mote) y su pierna dominante.
   ============================================================= */

/* ---------- PANTALLA: LISTA DE JUGADORES ---------- */
Vistas.plantilla = {
  titulo: 'Plantilla',
  tab: 'jugadores',
  busqueda: '',      // lo que se ha escrito en el buscador
  pierna: 'todas',   // filtro por pierna dominante

  // Jugadores que se ven ahora (según el buscador y el filtro de pierna)
  filtrados() {
    const q = UI.normalizar(this.busqueda);
    return DB.jugadoresDe().filter((j) =>
      (!q || UI.normalizar(j.nombre).includes(q)) && (this.pierna === 'todas' || j.pierna === this.pierna));
  },

  // Solo la lista (se repinta sola al escribir en el buscador)
  listaHTML() {
    const jugadores = this.filtrados();
    return jugadores.map((j) => this.itemJugador(j)).join('') ||
      UI.vacio('equipo', 'Sin jugadores', this.busqueda || this.pierna !== 'todas' ? 'Nadie coincide con la búsqueda.' : 'Añade tu primer jugador con el botón +.');
  },

  pintar() {
    const todos = DB.jugadoresDe();
    const cuantos = (p) => todos.filter((j) => j.pierna === p).length;

    return `
      ${Vistas.plantilla.bannerEjemplo()}
      <div class="pantalla-cab">
        <div>
          <h1>Plantilla</h1>
          <p>${UI.plural(todos.length, 'jugador', 'jugadores')}</p>
        </div>
        <button class="btn btn-primario" data-accion="nuevo-jugador">${UI.icono('mas')} <span>Añadir</span></button>
      </div>

      ${todos.length ? `
      <div class="chips" role="tablist" aria-label="Filtrar por pierna dominante">
        <button class="chip ${this.pierna === 'todas' ? 'activo' : ''}" data-accion="filtrar-pierna" data-pierna="todas">Todos<span class="num">${todos.length}</span></button>
        ${DB.PIERNAS.map((p) => `<button class="chip ${this.pierna === p.id ? 'activo' : ''}" data-accion="filtrar-pierna" data-pierna="${p.id}">${p.nombre}<span class="num">${cuantos(p.id)}</span></button>`).join('')}
      </div>
      <div class="buscador">
        ${UI.icono('buscar')}
        <input type="search" id="buscar-jugador" placeholder="Buscar por nombre" value="${UI.esc(this.busqueda)}" aria-label="Buscar jugador">
      </div>` : ''}

      <div class="lista en-rejilla" id="lista-jugadores">${this.listaHTML()}</div>

      <button class="fab solo-movil" data-accion="nuevo-jugador" aria-label="Añadir jugador">${UI.icono('mas')}</button>
    `;
  },

  // Al escribir en el buscador, filtramos sin perder el cursor
  montar() {
    const caja = document.getElementById('buscar-jugador');
    if (!caja) return;
    caja.addEventListener('input', () => {
      Vistas.plantilla.busqueda = caja.value;
      document.getElementById('lista-jugadores').innerHTML = Vistas.plantilla.listaHTML();
    });
  },

  // Una fila de la lista
  itemJugador(j) {
    return `
      <a class="item" href="#/jugador/${j.id}">
        ${UI.avatar(j)}
        <div class="item-cuerpo">
          <div class="item-titulo">${UI.esc(j.nombre)}</div>
          <div class="item-sub">${UI.etiquetaPierna(j.pierna)}</div>
        </div>
        ${UI.icono('adelante', 'flecha')}
      </a>`;
  },

  // Aviso de que hay datos inventados, con botón para borrarlos
  bannerEjemplo() {
    if (!DB.hayEjemplo()) return '';
    return `<div class="banner-ejemplo">${UI.icono('info', 'peq')}<span>Estás viendo <b>datos de ejemplo</b> para probar la app.</span>
      <button class="btn btn-peq btn-borde" data-accion="borrar-ejemplo">Borrar</button></div>`;
  },
};

/* ---------- PANTALLA: FICHA DEL JUGADOR ---------- */
Vistas.jugador = {
  tab: 'jugadores',
  atras: '#/jugadores',
  titulo: (id) => DB.obtener('jugadores', id)?.nombre || 'Jugador',

  pintar(id) {
    const j = DB.obtener('jugadores', id);
    if (!j) return UI.vacio('equipo', 'Jugador no encontrado', 'Puede que se haya borrado.', '<a class="btn" href="#/jugadores">Volver a la plantilla</a>');
    const eq = DB.obtener('equipos', j.equipoId);

    return `
      <section class="tarjeta-hero">
        <img src="assets/icons/escudo-512.png" class="marca-agua" alt="">
        <div class="ficha-cab">
          ${UI.avatar(j, true)}
          <div>
            <h1>${UI.esc(j.nombre)}</h1>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
              <span class="etiqueta" style="background:rgba(255,255,255,.16);color:#fff">Pierna: ${DB.pierna(j.pierna).nombre}</span>
              ${eq ? `<span class="etiqueta" style="background:rgba(255,255,255,.16);color:#fff">${UI.esc(eq.nombre)}</span>` : ''}
            </div>
          </div>
        </div>
      </section>

      <div class="fila-botones mt">
        <button class="btn btn-primario" data-accion="editar-jugador" data-id="${j.id}">${UI.icono('editar')} Editar</button>
        <button class="btn btn-peligro" data-accion="borrar-jugador" data-id="${j.id}">${UI.icono('papelera')} Borrar</button>
      </div>

      <div class="rejilla-ficha mt">
        ${(Vistas.jugador.extras || []).map((fn) => fn(j)).join('')}
      </div>
    `;
  },
};

/* ---------- FORMULARIO DE JUGADOR (nuevo o editar) ---------- */
function formularioJugador(j = {}) {
  const pierna = j.pierna || 'derecha';
  return `
    <div class="aviso-info azul">${UI.icono('candado')}<div><b>Privacidad:</b> son menores. Escribe solo el <b>nombre de pila o un mote</b>, sin apellidos.</div></div>
    <div class="campo">
      <label for="f-nombre">Nombre o mote *</label>
      <input type="text" id="f-nombre" name="nombre" maxlength="20" required value="${UI.esc(j.nombre)}" placeholder="Ej.: Dani, Pablito…" autocomplete="off">
    </div>
    <span class="etiqueta-campo">Pierna dominante</span>
    <div class="opciones-pierna" role="radiogroup" aria-label="Pierna dominante">
      ${DB.PIERNAS.map((p) => `<label class="opcion-pierna">
        <input type="radio" name="pierna" value="${p.id}" ${pierna === p.id ? 'checked' : ''}>
        <span><b>${p.corto}</b>${p.nombre}</span></label>`).join('')}
    </div>
  `;
}

// Lee el formulario y comprueba que esté bien. Devuelve el jugador o null si hay error.
function leerJugador(form) {
  const d = UI.leerFormulario(form);
  if (!d.nombre) { UI.aviso('Escribe el nombre o mote', 'error'); return null; }
  if (d.nombre.trim().split(/\s+/).length > 2) { UI.aviso('Solo nombre de pila o mote, sin apellidos', 'error'); return null; }
  return { nombre: d.nombre, pierna: DB.pierna(d.pierna).id };
}

/* ---------- ACCIONES DE LOS BOTONES ---------- */
Acciones['nuevo-jugador'] = () => {
  const form = UI.modal({
    titulo: 'Nuevo jugador',
    cuerpo: formularioJugador(),
    textoGuardar: 'Añadir',
    extraPie: `<button type="button" class="btn btn-borde" id="anadir-otro">${UI.icono('mas')} Añadir y otro</button>`,
    alGuardar: (f) => {
      const j = leerJugador(f);
      if (!j) return false;
      DB.crear('jugadores', j);
      UI.aviso(`${j.nombre} añadido a la plantilla`);
      App.refrescar();
    },
  });
  // "Añadir y otro": guarda y deja el formulario listo para el siguiente
  form.querySelector('#anadir-otro').onclick = () => {
    const j = leerJugador(form);
    if (!j) return;
    DB.crear('jugadores', j);
    UI.aviso(`${j.nombre} añadido`);
    const nombre = form.querySelector('#f-nombre');
    nombre.value = '';
    form.querySelector('input[name=pierna][value=derecha]').checked = true; // la más habitual
    nombre.focus();
    // Repintamos la lista de detrás para que se vea el nuevo jugador
    const lista = document.getElementById('lista-jugadores');
    if (lista) lista.innerHTML = Vistas.plantilla.listaHTML();
  };
};

Acciones['editar-jugador'] = (el) => {
  const actual = DB.obtener('jugadores', el.dataset.id);
  UI.modal({
    titulo: `Editar a ${actual.nombre}`,
    cuerpo: formularioJugador(actual),
    alGuardar: (f) => {
      const j = leerJugador(f);
      if (!j) return false;
      DB.actualizar('jugadores', actual.id, j);
      UI.aviso('Cambios guardados');
      App.refrescar();
    },
  });
};

Acciones['borrar-jugador'] = async (el) => {
  const j = DB.obtener('jugadores', el.dataset.id);
  if (await UI.confirmar(`Se borrará a ${j.nombre} de la plantilla. No se puede deshacer.`, 'Borrar jugador')) {
    DB.borrar('jugadores', j.id);
    UI.aviso(`${j.nombre} borrado`);
    location.hash = '#/jugadores';
  }
};

Acciones['filtrar-pierna'] = (el) => {
  Vistas.plantilla.pierna = el.dataset.pierna;
  App.refrescar();
};

Acciones['borrar-ejemplo'] = async () => {
  if (await UI.confirmar('Se borrarán todos los datos inventados. Lo que hayas creado tú se mantiene.', 'Borrar ejemplo')) {
    DB.borrarEjemplo();
    UI.aviso('Datos de ejemplo borrados');
    App.refrescar();
  }
};
