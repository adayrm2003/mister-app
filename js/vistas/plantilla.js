/* =============================================================
   PLANTILLA.JS · Fase 1: jugadores
   -------------------------------------------------------------
   Contiene dos pantallas:
     - "plantilla": la lista de jugadores con filtros
     - "jugador":   la ficha de un jugador con su gráfico
   y las acciones de sus botones (añadir, editar, borrar…).

   PRIVACIDAD: los jugadores son menores. Solo guardamos nombre de
   pila o mote, categoría, edad, altura, peso, posición y dorsal.
   ============================================================= */

/* ---------- PANTALLA: LISTA DE JUGADORES ---------- */
Vistas.plantilla = {
  titulo: 'Plantilla',
  tab: 'plantilla',
  busqueda: '', // lo que se ha escrito en el buscador
  orden: 'nombre',

  // Jugadores que se ven ahora (según categoría, buscador y orden)
  filtrados() {
    let jugadores = DB.jugadoresDe(DB.ajuste('categoria') || 'todas');
    const q = UI.normalizar(this.busqueda);
    if (q) jugadores = jugadores.filter((j) => UI.normalizar(j.nombre + ' ' + j.posicion).includes(q));
    if (this.orden === 'media') jugadores.sort((a, b) => DB.mediaJugador(b) - DB.mediaJugador(a));
    if (this.orden === 'dorsal') jugadores.sort((a, b) => (Number(a.dorsal) || 99) - (Number(b.dorsal) || 99));
    if (this.orden === 'posicion') jugadores.sort((a, b) => DB.POSICIONES.indexOf(a.posicion) - DB.POSICIONES.indexOf(b.posicion));
    return jugadores;
  },

  // Solo la lista (se repinta sola al escribir en el buscador)
  listaHTML() {
    const jugadores = this.filtrados();
    return jugadores.map((j) => this.itemJugador(j)).join('') ||
      UI.vacio('equipo', 'Sin jugadores', this.busqueda ? 'No hay resultados para esa búsqueda.' : 'Añade tu primer jugador con el botón +.');
  },

  pintar() {
    const jugadores = this.filtrados();
    const media = jugadores.length ? jugadores.reduce((s, j) => s + DB.mediaJugador(j), 0) / jugadores.length : 0;

    return `
      ${Vistas.plantilla.bannerEjemplo()}
      <div class="pantalla-cab">
        <div>
          <h1>Plantilla</h1>
          <p>${jugadores.length} jugador${jugadores.length === 1 ? '' : 'es'}${jugadores.length ? ` · media ${media.toFixed(1)}` : ''}</p>
        </div>
        <button class="btn btn-primario" data-accion="nuevo-jugador">${UI.icono('mas')} <span>Añadir</span></button>
      </div>

      ${Vistas.plantilla.chipsCategorias('filtrar-categoria')}

      <div class="barra-filtros">
        <div class="buscador">
          ${UI.icono('buscar')}
          <input type="search" id="buscar-jugador" placeholder="Buscar por nombre o posición" value="${UI.esc(this.busqueda)}" aria-label="Buscar jugador">
        </div>
        <select data-al-cambiar="ordenar-plantilla" aria-label="Ordenar" style="width:auto">
          ${[['nombre', 'A-Z'], ['media', 'Media'], ['dorsal', 'Dorsal'], ['posicion', 'Posición']]
            .map(([v, t]) => `<option value="${v}" ${this.orden === v ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>

      <div class="lista en-rejilla" id="lista-jugadores">${this.listaHTML()}</div>

      <button class="fab solo-movil" data-accion="nuevo-jugador" aria-label="Añadir jugador">${UI.icono('mas')}</button>
    `;
  },

  // Al escribir en el buscador, filtramos sin perder el cursor
  montar() {
    const caja = document.getElementById('buscar-jugador');
    caja.addEventListener('input', () => {
      Vistas.plantilla.busqueda = caja.value;
      document.getElementById('lista-jugadores').innerHTML = Vistas.plantilla.listaHTML();
    });
  },

  // Una fila de la lista
  itemJugador(j) {
    const cat = DB.categoria(j.categoria);
    return `
      <a class="item" href="#/jugador/${j.id}">
        ${UI.avatar(j)}
        <div class="item-cuerpo">
          <div class="item-titulo">${UI.esc(j.nombre)}</div>
          <div class="item-sub">
            <span class="etiqueta" style="background:color-mix(in srgb, ${cat.color} 15%, transparent);color:${cat.color}">${cat.nombre}</span>
            <span title="${UI.esc(j.posicion)}">${UI.posicionCorta(j.posicion)}</span>
            <span>· ${j.edad} años</span>
          </div>
        </div>
        ${UI.media(DB.mediaJugador(j))}
      </a>`;
  },

  // Fila de botones con las categorías y cuántos jugadores tiene cada una
  chipsCategorias(accion, seleccion = DB.ajuste('categoria') || 'todas', conTodas = true) {
    const total = DB.lista('jugadores').length;
    const chips = conTodas ? [`<button class="chip ${seleccion === 'todas' ? 'activo' : ''}" data-accion="${accion}" data-cat="todas">Todas<span class="num">${total}</span></button>`] : [];
    DB.CATEGORIAS.forEach((c) => {
      const n = DB.jugadoresDe(c.id).length;
      chips.push(`<button class="chip ${seleccion === c.id ? 'activo' : ''}" data-accion="${accion}" data-cat="${c.id}">${c.nombre}<span class="num">${n}</span></button>`);
    });
    return `<div class="chips" role="tablist" aria-label="Categorías">${chips.join('')}</div>`;
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
  tab: 'plantilla',
  atras: '#/plantilla',
  titulo: (id) => DB.obtener('jugadores', id)?.nombre || 'Jugador',

  pintar(id) {
    const j = DB.obtener('jugadores', id);
    if (!j) return UI.vacio('equipo', 'Jugador no encontrado', 'Puede que se haya borrado.', '<a class="btn" href="#/plantilla">Volver a la plantilla</a>');
    const cat = DB.categoria(j.categoria);
    const media = DB.mediaJugador(j);

    return `
      <section class="tarjeta-hero">
        <img src="assets/icons/escudo-512.png" class="marca-agua" alt="">
        <div class="ficha-cab">
          ${UI.avatar(j, true)}
          <div>
            <h1>${UI.esc(j.nombre)}</h1>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
              <span class="etiqueta" style="background:rgba(255,255,255,.16);color:#fff">${cat.nombre} · ${cat.edades}</span>
              ${j.posicion ? `<span class="etiqueta" style="background:rgba(255,255,255,.16);color:#fff">${UI.esc(j.posicion)}</span>` : ''}
              ${j.dorsal ? `<span class="etiqueta" style="background:var(--rojo);color:#fff">#${UI.esc(j.dorsal)}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="datos-fila">
          <div class="dato"><b>${j.edad || '—'}</b><span>años</span></div>
          <div class="dato"><b>${j.altura || '—'}</b><span>cm</span></div>
          <div class="dato"><b>${j.peso || '—'}</b><span>kg</span></div>
          <div class="dato"><b>${media.toFixed(1)}</b><span>media</span></div>
        </div>
      </section>

      <div class="fila-botones mt">
        <button class="btn btn-primario" data-accion="editar-jugador" data-id="${j.id}">${UI.icono('editar')} Editar</button>
        <button class="btn btn-peligro" data-accion="borrar-jugador" data-id="${j.id}">${UI.icono('papelera')} Borrar</button>
      </div>

      <div class="rejilla-ficha mt">
        <section class="tarjeta">
          <h2>Valoraciones</h2>
          <p class="texto-suave peq">Del 1 al 10, según el entrenador</p>
          <div style="max-width:300px;margin:0 auto">${Graficos.radar([{ color: cat.color, valores: j.valoraciones || {} }])}</div>
        </section>
        <section class="tarjeta">
          <h2>Detalle</h2>
          <div class="val-lista mt">
            ${DB.ASPECTOS.map((a) => {
              const v = Number(j.valoraciones?.[a.id]) || 0;
              return `<div class="val-fila"><span>${a.nombre}</span><div class="barra"><span style="width:${v * 10}%;background:${a.color}"></span></div><b>${v}</b></div>`;
            }).join('')}
          </div>
          <div class="separador"></div>
          <div class="val-fila"><span>Media</span><div class="barra"><span style="width:${media * 10}%;background:${UI.colorNota(media)}"></span></div><b>${media.toFixed(1)}</b></div>
        </section>
        ${(Vistas.jugador.extras || []).map((fn) => fn(j)).join('')}
      </div>
    `;
  },
};

/* ---------- FORMULARIO DE JUGADOR (nuevo o editar) ---------- */
function formularioJugador(j = {}) {
  const v = j.valoraciones || { defensa: 5, ataque: 5, velocidad: 5, fuerza: 5 };
  const catPorDefecto = j.categoria || (DB.ajuste('categoria') !== 'todas' ? DB.ajuste('categoria') : 'alevin');
  return `
    <div class="aviso-info azul">${UI.icono('candado')}<div><b>Privacidad:</b> son menores. Escribe solo el <b>nombre de pila o un mote</b>. Nada de apellidos, DNI, direcciones ni teléfonos.</div></div>
    <div class="campo">
      <label for="f-nombre">Nombre o mote *</label>
      <input type="text" id="f-nombre" name="nombre" maxlength="20" required value="${UI.esc(j.nombre)}" placeholder="Ej.: Dani, Pablito…" autocomplete="off">
    </div>
    <div class="rejilla-2">
      <div class="campo">
        <label for="f-edad">Edad *</label>
        <input type="number" id="f-edad" name="edad" min="4" max="60" inputmode="numeric" value="${UI.esc(j.edad)}">
      </div>
      <div class="campo">
        <label for="f-categoria">Categoría</label>
        <select id="f-categoria" name="categoria">
          ${DB.CATEGORIAS.map((c) => `<option value="${c.id}" ${catPorDefecto === c.id ? 'selected' : ''}>${c.nombre} (${c.edades})</option>`).join('')}
        </select>
      </div>
      <div class="campo">
        <label for="f-altura">Altura (cm)</label>
        <input type="number" id="f-altura" name="altura" min="80" max="230" inputmode="numeric" value="${UI.esc(j.altura)}">
      </div>
      <div class="campo">
        <label for="f-peso">Peso (kg)</label>
        <input type="number" id="f-peso" name="peso" min="15" max="150" inputmode="decimal" value="${UI.esc(j.peso)}">
      </div>
      <div class="campo">
        <label for="f-posicion">Posición</label>
        <select id="f-posicion" name="posicion">
          ${DB.POSICIONES.map((p) => `<option ${j.posicion === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="campo">
        <label for="f-dorsal">Dorsal</label>
        <input type="number" id="f-dorsal" name="dorsal" min="1" max="99" inputmode="numeric" value="${UI.esc(j.dorsal)}">
      </div>
    </div>
    <div class="separador"></div>
    <h3 style="margin-bottom:12px">Valoraciones (1 a 10)</h3>
    ${DB.ASPECTOS.map((a) => `
      <div class="valoracion">
        <div class="valoracion-cab"><label for="f-${a.id}">${a.nombre}</label><output id="o-${a.id}" style="color:${a.color}">${v[a.id]}</output></div>
        <input type="range" id="f-${a.id}" name="${a.id}" min="1" max="10" step="1" value="${v[a.id]}" style="--p:${(v[a.id] - 1) * 11.11}%">
      </div>`).join('')}
  `;
}

// Hace que los deslizadores muestren su número y que la edad sugiera la categoría
function prepararFormularioJugador(form) {
  form.querySelectorAll('input[type=range]').forEach((r) => {
    r.addEventListener('input', () => {
      form.querySelector('#o-' + r.name).textContent = r.value;
      r.style.setProperty('--p', (r.value - 1) * 11.11 + '%');
    });
  });
  form.querySelector('#f-edad').addEventListener('input', (e) => {
    const cat = DB.categoriaPorEdad(e.target.value);
    if (cat) form.querySelector('#f-categoria').value = cat.id;
  });
}

// Lee el formulario y comprueba que esté bien. Devuelve el jugador o null si hay error.
function leerJugador(form) {
  const d = UI.leerFormulario(form);
  if (!d.nombre) { UI.aviso('Escribe el nombre o mote', 'error'); return null; }
  if (d.nombre.trim().split(/\s+/).length > 2) { UI.aviso('Solo nombre de pila o mote, sin apellidos', 'error'); return null; }
  if (!d.edad || d.edad < 4 || d.edad > 60) { UI.aviso('Indica una edad entre 4 y 60', 'error'); return null; }
  if (d.altura && (d.altura < 80 || d.altura > 230)) { UI.aviso('La altura va en centímetros (80-230)', 'error'); return null; }
  if (d.peso && (d.peso < 15 || d.peso > 150)) { UI.aviso('El peso va en kilos (15-150)', 'error'); return null; }
  return {
    nombre: d.nombre,
    edad: Number(d.edad),
    categoria: d.categoria,
    altura: d.altura ? Number(d.altura) : '',
    peso: d.peso ? Number(d.peso) : '',
    posicion: d.posicion,
    dorsal: d.dorsal,
    valoraciones: Object.fromEntries(DB.ASPECTOS.map((a) => [a.id, Number(d[a.id])])),
  };
}

/* ---------- ACCIONES DE LOS BOTONES ---------- */
Acciones['nuevo-jugador'] = () => {
  const form = UI.modal({
    titulo: 'Nuevo jugador',
    cuerpo: formularioJugador(),
    textoGuardar: 'Añadir',
    alGuardar: (f) => {
      const j = leerJugador(f);
      if (!j) return false;
      j.historial = Evolucion.anotar([], j.valoraciones); // primera valoración
      DB.crear('jugadores', j);
      UI.aviso(`${j.nombre} añadido a la plantilla`);
      App.refrescar();
    },
  });
  prepararFormularioJugador(form);
};

Acciones['editar-jugador'] = (el) => {
  const actual = DB.obtener('jugadores', el.dataset.id);
  const form = UI.modal({
    titulo: `Editar a ${actual.nombre}`,
    cuerpo: formularioJugador(actual),
    alGuardar: (f) => {
      const j = leerJugador(f);
      if (!j) return false;
      // Si han cambiado las valoraciones, las guardamos en el historial con la fecha de hoy
      if (JSON.stringify(j.valoraciones) !== JSON.stringify(actual.valoraciones)) {
        j.historial = Evolucion.anotar(Evolucion.historial(actual), j.valoraciones);
      }
      DB.actualizar('jugadores', actual.id, j);
      UI.aviso('Cambios guardados');
      App.refrescar();
    },
  });
  prepararFormularioJugador(form);
};

Acciones['borrar-jugador'] = async (el) => {
  const j = DB.obtener('jugadores', el.dataset.id);
  if (await UI.confirmar(`Se borrará a ${j.nombre} y todos sus datos. No se puede deshacer.`)) {
    DB.borrar('jugadores', j.id);
    UI.aviso(`${j.nombre} borrado`);
    location.hash = '#/plantilla';
  }
};

Acciones['filtrar-categoria'] = (el) => {
  DB.cambiarAjuste('categoria', el.dataset.cat);
  App.refrescar();
};

Acciones['ordenar-plantilla'] = (el) => {
  Vistas.plantilla.orden = el.value;
  App.refrescar();
};

Acciones['borrar-ejemplo'] = async () => {
  if (await UI.confirmar('Se borrarán todos los datos inventados. Lo que hayas creado tú se mantiene.', 'Borrar ejemplo')) {
    DB.borrarEjemplo();
    UI.aviso('Datos de ejemplo borrados');
    App.refrescar();
  }
};
