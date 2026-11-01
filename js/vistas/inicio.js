/* =============================================================
   INICIO.JS · Pantalla de inicio (resumen del club)
   ============================================================= */

Vistas.inicio = {
  titulo: 'Inicio',
  tab: 'inicio',

  pintar() {
    const jugadores = DB.lista('jugadores');
    const media = jugadores.length ? jugadores.reduce((s, j) => s + DB.mediaJugador(j), 0) / jugadores.length : 0;
    const categoriasConJugadores = DB.CATEGORIAS.filter((c) => DB.jugadoresDe(c.id).length);
    const entrenador = DB.ajuste('entrenador');
    const hora = new Date().getHours();
    const saludo = hora < 13 ? 'Buenos días' : hora < 21 ? 'Buenas tardes' : 'Buenas noches';
    const top = [...jugadores].sort((a, b) => DB.mediaJugador(b) - DB.mediaJugador(a)).slice(0, 5);
    const maxCat = Math.max(1, ...DB.CATEGORIAS.map((c) => DB.jugadoresDe(c.id).length));

    return `
      ${Vistas.plantilla.bannerEjemplo()}

      <section class="tarjeta-hero">
        <img src="assets/icons/escudo-512.png" class="marca-agua" alt="">
        <p style="opacity:.8;margin:0">${saludo}${entrenador ? ', ' + UI.esc(entrenador) : ''} 👋</p>
        <h1 style="font-size:34px;margin:2px 0 4px">Vamos Tranvía</h1>
        <p style="opacity:.75;margin-bottom:16px">${UI.mayuscula(UI.fechaLarga(UI.hoyISO()))}</p>
        <div class="cifras">
          <div class="cifra"><b>${jugadores.length}</b><span>Jugadores</span></div>
          <div class="cifra"><b>${categoriasConJugadores.length}</b><span>Categorías</span></div>
          <div class="cifra"><b>${media.toFixed(1)}</b><span>Media club</span></div>
        </div>
      </section>

      ${jugadores.length ? '' : `
      <section class="tarjeta mt centrado">
        <h2>¡Bienvenido/a!</h2>
        <p class="texto-suave">Empieza añadiendo a los jugadores de tu equipo, o carga datos de ejemplo para ver cómo funciona todo.</p>
        <div class="fila-botones" style="justify-content:center">
          <button class="btn btn-primario" data-accion="nuevo-jugador">${UI.icono('mas')} Añadir jugador</button>
          <button class="btn btn-borde" data-accion="cargar-ejemplo">Ver ejemplo</button>
        </div>
      </section>`}

      ${Vistas.inicio.bloquesExtra()}

      <div class="seccion-titulo"><h2>Jugadores por categoría</h2><a href="#/plantilla">Ver plantilla</a></div>
      <section class="tarjeta">
        <div class="val-lista">
          ${DB.CATEGORIAS.map((c) => {
            const n = DB.jugadoresDe(c.id).length;
            return `<a class="val-fila" style="grid-template-columns:110px 1fr 30px;color:var(--texto)" href="#/plantilla" data-accion="ir-categoria" data-cat="${c.id}">
              <span>${c.nombre}</span><div class="barra"><span style="width:${(n / maxCat) * 100}%;background:${c.color}"></span></div><b>${n}</b></a>`;
          }).join('')}
        </div>
      </section>

      ${top.length ? `
      <div class="seccion-titulo"><h2>Mejores medias</h2></div>
      <div class="lista">${top.map((j) => Vistas.plantilla.itemJugador(j)).join('')}</div>` : ''}
    `;
  },

  // Otras fases añaden aquí sus bloques (próximo partido, entrenos…)
  bloquesExtra() {
    return (Vistas.inicio.extras || []).map((fn) => fn()).join('');
  },
};

// Ir a la plantilla filtrando por una categoría
Acciones['ir-categoria'] = (el) => {
  DB.cambiarAjuste('categoria', el.dataset.cat);
  location.hash = '#/plantilla';
};
