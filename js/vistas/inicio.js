/* =============================================================
   INICIO.JS · Pantalla de inicio (resumen del equipo activo)
   ============================================================= */

Vistas.inicio = {
  titulo: 'Inicio',
  tab: 'inicio',

  pintar() {
    const eq = DB.equipo();
    const cat = DB.categoria(eq.categoria);
    const jugadores = DB.jugadoresDe();
    const entrenador = DB.ajuste('entrenador');
    const hora = new Date().getHours();
    const saludo = hora < 13 ? 'Buenos días' : hora < 21 ? 'Buenas tardes' : 'Buenas noches';

    return `
      ${Vistas.plantilla.bannerEjemplo()}

      <section class="tarjeta-hero">
        <img src="assets/icons/escudo-512.png" class="marca-agua" alt="">
        <p style="opacity:.8;margin:0">${saludo}${entrenador ? ', ' + UI.esc(entrenador) : ''} 👋</p>
        <h1 style="font-size:34px;margin:2px 0 4px">${UI.esc(eq.nombre)}</h1>
        <p style="opacity:.75;margin-bottom:16px">${cat.nombre} (${cat.edades} años) · Fútbol ${eq.modalidad} · ${eq.duracion}' por entreno</p>
        <div class="cifras">
          <div class="cifra"><b>${jugadores.length}</b><span>Jugadores</span></div>
          <div class="cifra"><b>${DB.delEquipo('sesiones').length}</b><span>Sesiones</span></div>
          <div class="cifra"><b>${DB.delEquipo('partidos').length}</b><span>Partidos</span></div>
        </div>
      </section>

      ${jugadores.length ? '' : `
      <section class="tarjeta mt centrado">
        <h2>Añade a tus jugadores</h2>
        <p class="texto-suave">Empieza por la plantilla de ${UI.esc(eq.nombre)}.</p>
        <button class="btn btn-primario" data-accion="nuevo-jugador">${UI.icono('mas')} Añadir jugador</button>
      </section>`}

      ${Vistas.inicio.bloquesExtra()}
    `;
  },

  // Otras partes de la app añaden aquí sus bloques (próximo partido, entrenos…)
  bloquesExtra() {
    return (Vistas.inicio.extras || []).map((fn) => fn()).join('');
  },
};
