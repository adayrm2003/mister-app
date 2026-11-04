/* =============================================================
   INICIO.JS · Pestaña "Hoy"
   -------------------------------------------------------------
   Lo que necesitas de un vistazo, del equipo activo:
     1. El próximo evento (partido o entrenamiento)
     2. Botón grande "Crear sesión de hoy"
     3. La última sesión
     4. Accesos rápidos
   ============================================================= */

Vistas.inicio = {
  titulo: 'Hoy',
  tab: 'hoy',

  // El próximo partido o entreno (lo que llegue antes)
  proximoEvento() {
    const hoy = UI.hoyISO();
    const clave = (x) => x.fecha + (x.hora || '99:99');
    const partido = Partidos.lista().find((p) => !p.jugado && p.fecha >= hoy);
    const sesion = Entrenos.sesiones().find((s) => s.fecha >= hoy);
    if (partido && (!sesion || clave(partido) <= clave(sesion))) return { tipo: 'partido', dato: partido };
    if (sesion) return { tipo: 'sesion', dato: sesion };
    return null;
  },

  // La sesión más reciente que ya ha pasado o es de hoy (sin repetir la que sale como "Próximo")
  ultimaSesion(proximo) {
    const hoy = UI.hoyISO();
    return [...Entrenos.sesiones()].reverse().find((s) => s.fecha <= hoy && s.id !== proximo?.dato.id) || null;
  },

  pintar() {
    const eq = DB.equipo();
    const cat = DB.categoria(eq.categoria);
    const entrenador = DB.ajuste('entrenador');
    const hora = new Date().getHours();
    const saludo = hora < 13 ? 'Buenos días' : hora < 21 ? 'Buenas tardes' : 'Buenas noches';
    const proximo = this.proximoEvento();
    const ultima = this.ultimaSesion(proximo);
    const sesionHoy = Entrenos.sesiones().find((s) => s.fecha === UI.hoyISO());
    const partidoProximo = proximo?.tipo === 'partido' ? proximo.dato : null;

    return `
      ${Vistas.plantilla.bannerEjemplo()}

      <div class="hoy-cab">
        <p>${UI.mayuscula(UI.fechaLarga(UI.hoyISO()))}</p>
        <h1>${saludo}${entrenador ? ', ' + UI.esc(entrenador) : ''}</h1>
      </div>

      <div class="seccion-titulo"><h2>Próximo</h2><a href="#/calendario">Calendario</a></div>
      ${proximo ? this.tarjetaEvento(proximo) : `
        <a class="tarjeta pulsable evento-vacio" href="#/calendario">${UI.icono('calendario')}<div><b>Nada programado</b><span>Añade entrenos y partidos en el calendario</span></div></a>`}

      <button class="btn-gigante" data-accion="crear-sesion-hoy">
        ${UI.icono('chispa', 'gran')}
        <span><b>Crear sesión de hoy</b><small>${cat.nombre} · ${eq.duracion} min · objetivo al azar</small></span>
      </button>

      <div class="seccion-titulo"><h2>Última sesión</h2><a href="#/sesiones">Todas</a></div>
      ${ultima ? `<div class="lista">${Entrenos.item(ultima)}</div>
        <div class="fila-botones mt">
          <a class="btn btn-borde btn-peq" href="#/sesion/${ultima.id}">${UI.icono('check')} Pasar lista</a>
          <button class="btn btn-borde btn-peq" data-accion="duplicar-sesion" data-id="${ultima.id}">${UI.icono('copiar')} Repetirla</button>
        </div>`
        : '<p class="texto-suave">Todavía no hay sesiones de este equipo.</p>'}

      <div class="accesos mt">
        <a class="acceso-rapido" href="#/jugadores">${UI.icono('equipo')}<b>${DB.jugadoresDe().length}</b><span>Jugadores</span></a>
        ${sesionHoy
          ? `<a class="acceso-rapido" href="#/sesion/${sesionHoy.id}">${UI.icono('check')}<b>Lista</b><span>De hoy</span></a>`
          : `<a class="acceso-rapido" href="#/sesiones/biblioteca">${UI.icono('balon')}<b>${Biblioteca.para(eq.categoria).length}</b><span>Ejercicios</span></a>`}
        ${partidoProximo
          ? `<a class="acceso-rapido" href="#/partido/${partidoProximo.id}">${UI.icono('whatsapp')}<b>${partidoProximo.convocados?.length || 0}</b><span>Convocados</span></a>`
          : `<a class="acceso-rapido" href="#/calendario/lista">${UI.icono('trofeo')}<b>${DB.delEquipo('partidos').length}</b><span>Partidos</span></a>`}
        <a class="acceso-rapido" href="#/pizarra">${UI.icono('pizarra')}<b>F${eq.modalidad}</b><span>Pizarra</span></a>
      </div>
    `;
  },

  // Tarjeta grande del próximo evento
  tarjetaEvento({ tipo, dato }) {
    const dias = UI.diasHasta(dato.fecha);
    const cuenta = `<div class="cuenta ${tipo}"><b>${dias === 0 ? 'HOY' : dias}</b><span>${dias === 0 ? '' : dias === 1 ? 'día' : 'días'}</span></div>`;
    if (tipo === 'partido') {
      return `
        <a class="tarjeta proximo-partido pulsable" href="#/partido/${dato.id}">
          ${cuenta}
          <div style="flex:1;min-width:0">
            <span class="etiqueta roja">Partido</span>
            <div class="item-titulo" style="margin-top:4px">vs ${UI.esc(dato.rival)}</div>
            <div class="item-sub"><span>${UI.fechaCorta(dato.fecha)} ${dato.hora || ''}</span><span>· ${dato.lugar === 'fuera' ? 'Fuera' : 'En casa'}</span></div>
            <div class="item-sub" style="margin-top:4px"><span class="etiqueta ${dato.convocados?.length ? 'verde' : 'amarilla'}">${dato.convocados?.length ? dato.convocados.length + ' convocados' : 'Falta convocatoria'}</span></div>
          </div>${UI.icono('adelante', 'flecha')}
        </a>`;
    }
    return `
      <a class="tarjeta proximo-partido pulsable" href="#/sesion/${dato.id}">
        ${cuenta}
        <div style="flex:1;min-width:0">
          <span class="etiqueta">Entreno</span>
          <div class="item-titulo" style="margin-top:4px">${UI.esc(dato.titulo || 'Entrenamiento')}</div>
          <div class="item-sub"><span>${UI.fechaCorta(dato.fecha)} ${dato.hora || ''}</span><span>· ${Entrenos.duracionTotal(dato)} min</span></div>
        </div>${UI.icono('adelante', 'flecha')}
      </a>`;
  },
};

/* ---------- CREAR SESIÓN DE HOY ----------
   Usa el generador del Asistente con los datos del equipo activo:
   su categoría, su duración habitual y un objetivo al azar. */
Acciones['crear-sesion-hoy'] = async () => {
  const eq = DB.equipo();
  const hoy = UI.hoyISO();
  if (Entrenos.sesiones().some((s) => s.fecha === hoy)
    && !(await UI.confirmar('Ya hay una sesión hoy para este equipo. ¿Crear otra?', 'Crear otra'))) return;
  // Objetivo al azar entre los que tienen ejercicios para esta categoría
  const posibles = Biblioteca.OBJETIVOS.filter((o) => Biblioteca.para(eq.categoria).some((e) => (e.objetivos || [])[0] === o.id));
  const objetivo = posibles[Math.floor(Math.random() * posibles.length)]?.id || 'pase';
  const propuesta = Asistente.generarSesion({ categoria: eq.categoria, objetivo, duracion: eq.duracion, semilla: (Date.now() % 1000) + 1 });
  const partes = {};
  Biblioteca.PARTES.forEach((p) => { partes[p.id] = { duracion: propuesta.partes[p.id].duracion, ejercicios: propuesta.partes[p.id].ejercicios.map((x) => x.id) }; });
  const nueva = DB.crear('sesiones', {
    titulo: Biblioteca.objetivo(objetivo).nombre, fecha: hoy, hora: '18:00', partes, asistencia: {},
    notas: 'Puntos clave:\n- ' + propuesta.puntosClave.join('\n- '),
  });
  UI.aviso(`Sesión de hoy creada: ${Biblioteca.objetivo(objetivo).nombre}`);
  location.hash = '#/sesion/' + nueva.id;
};
