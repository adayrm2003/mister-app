/* =============================================================
   DB.JS · El "almacén" de datos de la app
   -------------------------------------------------------------
   Guardamos todo en el navegador con localStorage: una especie de
   cajón que el navegador conserva aunque cierres la app.
   (Ojo: si cambias de móvil o borras los datos del navegador,
   se pierde. Por eso existe la copia de seguridad.)

   Los datos se organizan en "colecciones" (listas):
     equipos, y de cada equipo: jugadores, ejercicios, sesiones,
     preparaciones y partidos (cada uno lleva el "equipoId" de su equipo)
   y un apartado de "ajustes" (tema, equipo activo…).

   El resto de la app NUNCA toca localStorage directamente:
   siempre pasa por DB.lista(), DB.crear(), DB.actualizar()…
   Así, en la fase 6, bastará con cambiar este archivo para
   guardar en la nube.
   ============================================================= */

const DB = (() => {
  const CLAVE = 'tranvia-datos-v1'; // nombre del "cajón" en el navegador

  /* Categorías del fútbol base en Tenerife.
     "futbol" es la modalidad que se propone al crear un equipo (7 u 11);
     luego cada equipo elige la suya (7, 8 u 11). */
  const CATEGORIAS = [
    { id: 'prebenjamin', nombre: 'Prebenjamín', edades: '6-7',  min: 6,  max: 7,  futbol: 7,  color: '#F2B705', color2: '#C77700' },
    { id: 'benjamin',    nombre: 'Benjamín',    edades: '8-9',  min: 8,  max: 9,  futbol: 7,  color: '#12A150', color2: '#0B6B35' },
    { id: 'alevin',      nombre: 'Alevín',      edades: '10-11', min: 10, max: 11, futbol: 7, color: '#13A8B8', color2: '#0B6470' },
    { id: 'infantil',    nombre: 'Infantil',    edades: '12-13', min: 12, max: 13, futbol: 11, color: '#0272BB', color2: '#0B2545' },
    { id: 'cadete',      nombre: 'Cadete',      edades: '14-15', min: 14, max: 15, futbol: 11, color: '#6C4CD8', color2: '#3A2391' },
    { id: 'juvenil',     nombre: 'Juvenil',     edades: '16-18', min: 16, max: 18, futbol: 11, color: '#CF2633', color2: '#7D1019' },
    { id: 'regional',    nombre: 'Regional',    edades: '19+',  min: 19, max: 99, futbol: 11, color: '#33414F', color2: '#0A0F17' },
  ];

  /* Pierna dominante de cada jugador (es su único dato, junto al nombre) */
  const PIERNAS = [
    { id: 'derecha',   nombre: 'Derecha',   corto: 'D' },
    { id: 'izquierda', nombre: 'Izquierda', corto: 'I' },
    { id: 'ambas',     nombre: 'Ambas',     corto: 'A' },
  ];

  const MODALIDADES = [7, 8, 11];

  // Colecciones cuyos elementos pertenecen a un equipo
  const DEL_EQUIPO = ['jugadores', 'ejercicios', 'sesiones', 'preparaciones', 'partidos'];

  // Cómo son los datos cuando la app está recién instalada
  function datosVacios() {
    return {
      version: 3,
      equipos: [],        // { id, nombre, categoria, modalidad, duracion }
      jugadores: [],      // { id, nombre, pierna } (solo eso: son menores)
      ejercicios: [],     // ejercicios creados por el entrenador (los precargados están en ejercicios.js)
      sesiones: [],       // entrenamientos
      preparaciones: [],  // preparación del partido de la semana
      partidos: [],
      ajustes: { tema: 'auto', equipoActivo: null, entrenador: '' },
    };
  }

  let datos = null;

  /* ---------- PASO A "MIS EQUIPOS" ----------
     Antes los datos se separaban solo por categoría. Si hay datos sin
     equipo, creamos un equipo por cada categoría usada y los metemos
     ahí. Así no se pierde nada. (Lo de ejemplo va a equipos de ejemplo.) */
  function migrarAEquipos() {
    const sinEquipo = DEL_EQUIPO.flatMap((c) => datos[c].filter((x) => !x.equipoId).map((x) => ({ c, x })));
    if (!sinEquipo.length) return;
    const equipoPara = (categoria, ejemplo) => {
      let eq = datos.equipos.find((e) => e.categoria === categoria && !!e.ejemplo === !!ejemplo);
      if (!eq) {
        const cat = CATEGORIAS.find((c) => c.id === categoria) || CATEGORIAS[2];
        eq = { id: UI.id(), creado: new Date().toISOString(), nombre: cat.nombre + (ejemplo ? ' (ejemplo)' : ''),
          categoria: cat.id, modalidad: cat.futbol, duracion: 75, ...(ejemplo ? { ejemplo: true } : {}) };
        datos.equipos.push(eq);
      }
      return eq;
    };
    sinEquipo.forEach(({ x }) => {
      // Los ejercicios propios tenían una lista de categorías: usamos la primera
      const categoria = x.categoria || (x.categorias || [])[0] || 'alevin';
      const eq = equipoPara(categoria, x.ejemplo);
      x.equipoId = eq.id;
      x.categoria = eq.categoria;
    });
    delete datos.ajustes.categoria;
    guardar();
  }

  /* ---------- JUGADORES SIMPLES ----------
     Antes cada jugador tenía edad, altura, peso, posición, dorsal,
     valoraciones, evolución y notas. Ahora solo nombre y pierna:
     conservamos el nombre y borramos todo lo demás. */
  const CAMPOS_VIEJOS = ['edad', 'altura', 'peso', 'posicion', 'dorsal', 'valoraciones', 'historial', 'notas'];
  function simplificarJugadores() {
    let cambiado = false;
    datos.jugadores.forEach((j) => {
      CAMPOS_VIEJOS.forEach((c) => { if (c in j) { delete j[c]; cambiado = true; } });
      if (!PIERNAS.some((p) => p.id === j.pierna)) { j.pierna = 'derecha'; cambiado = true; }
    });
    if (cambiado) guardar();
  }

  // Lee los datos del navegador (o crea unos vacíos la primera vez)
  function cargar() {
    try {
      const texto = localStorage.getItem(CLAVE);
      if (texto) {
        // "Mezclamos" con los datos vacíos por si en versiones nuevas añadimos colecciones
        datos = Object.assign(datosVacios(), JSON.parse(texto));
        migrarAEquipos();
        simplificarJugadores();
        return false; // no es la primera vez
      }
    } catch (e) {
      console.error('No se pudieron leer los datos', e);
    }
    datos = datosVacios();
    return true; // primera vez que se abre la app
  }

  // Escribe los datos en el navegador. Se llama después de cada cambio.
  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(datos));
    } catch (e) {
      UI.aviso('No se pudo guardar (¿memoria llena?)', 'error');
    }
  }

  return {
    CATEGORIAS, PIERNAS, MODALIDADES, DEL_EQUIPO,
    cargar, guardar,

    // Lista completa de una colección. Ej: DB.lista('jugadores')
    lista(coleccion) {
      return datos[coleccion] || [];
    },
    // Lo de una colección que pertenece al equipo activo. Ej: DB.delEquipo('partidos')
    delEquipo(coleccion, equipoId = this.equipo()?.id) {
      return (datos[coleccion] || []).filter((x) => x.equipoId === equipoId);
    },
    // Busca un elemento por su id
    obtener(coleccion, id) {
      return (datos[coleccion] || []).find((x) => x.id === id);
    },
    // Añade un elemento nuevo y lo devuelve (con su id).
    // Si es de un equipo, se apunta al equipo activo y toma su categoría.
    crear(coleccion, objeto) {
      let nuevo = { id: UI.id(), creado: new Date().toISOString(), ...objeto };
      if (DEL_EQUIPO.includes(coleccion)) {
        const eq = this.obtener('equipos', nuevo.equipoId) || this.equipo();
        nuevo = { ...nuevo, equipoId: eq?.id, categoria: eq?.categoria };
      }
      datos[coleccion].push(nuevo);
      guardar();
      this.avisar(coleccion, 'guardar', nuevo);
      return nuevo;
    },
    // Cambia algunos campos de un elemento
    actualizar(coleccion, id, cambios) {
      const el = this.obtener(coleccion, id);
      if (!el) return null;
      Object.assign(el, cambios);
      guardar();
      this.avisar(coleccion, 'guardar', el);
      return el;
    },
    // Elimina un elemento
    borrar(coleccion, id) {
      const el = this.obtener(coleccion, id);
      datos[coleccion] = datos[coleccion].filter((x) => x.id !== id);
      guardar();
      if (el) this.avisar(coleccion, 'borrar', el);
    },

    /* ---------- AVISOS PARA LA NUBE ----------
       Cada cambio se "anuncia" aquí. nube.js se apunta a estos avisos
       para enviar el cambio a Supabase. Sin nube, no pasa nada. */
    alCambiar: null,
    avisar(coleccion, tipo, objeto) {
      if (this.alCambiar && !objeto.ejemplo) this.alCambiar(coleccion, tipo, objeto);
    },
    // Sustituye una colección entera con lo descargado de la nube
    // (sin anunciarlo, para no volver a subirlo). Los datos de ejemplo se conservan.
    reemplazar(coleccion, lista) {
      datos[coleccion] = (datos[coleccion] || []).filter((x) => x.ejemplo).concat(lista);
      guardar();
    },

    // Ajustes (tema, equipo activo…)
    ajuste(clave) { return datos.ajustes[clave]; },
    cambiarAjuste(clave, valor) { datos.ajustes[clave] = valor; guardar(); },

    /* ---------- EQUIPOS ---------- */
    // Lista de equipos, por orden alfabético
    equipos() {
      return [...datos.equipos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    },
    // El equipo activo (si el guardado ya no existe, el primero de la lista)
    equipo() {
      const eq = this.obtener('equipos', datos.ajustes.equipoActivo) || this.equipos()[0] || null;
      if (eq && datos.ajustes.equipoActivo !== eq.id) this.cambiarAjuste('equipoActivo', eq.id);
      return eq;
    },
    cambiarEquipo(id) { this.cambiarAjuste('equipoActivo', id); },
    // Categoría del equipo activo (objeto con nombre, edades…)
    categoriaActiva() {
      return this.categoria(this.equipo()?.categoria);
    },
    // Cambia los datos de un equipo. Si cambia la categoría, sus datos la heredan.
    actualizarEquipo(id, cambios) {
      const eq = this.actualizar('equipos', id, cambios);
      if (eq && cambios.categoria) {
        DEL_EQUIPO.forEach((c) => datos[c].forEach((x) => { if (x.equipoId === id) x.categoria = eq.categoria; }));
        guardar();
      }
      return eq;
    },
    // Borra un equipo y todo lo suyo. En la nube, la base de datos borra
    // lo del equipo sola ("en cascada"), así que aquí solo se avisa del equipo.
    borrarEquipo(id) {
      DEL_EQUIPO.forEach((c) => { datos[c] = datos[c].filter((x) => x.equipoId !== id); });
      this.borrar('equipos', id);
      if (datos.ajustes.equipoActivo === id) this.cambiarAjuste('equipoActivo', this.equipos()[0]?.id || null);
    },
    // Cuántas cosas tiene un equipo (para avisar antes de borrarlo)
    resumenEquipo(id) {
      return { jugadores: this.delEquipo('jugadores', id).length, sesiones: this.delEquipo('sesiones', id).length, partidos: this.delEquipo('partidos', id).length };
    },

    /* ---------- AYUDAS DE CATEGORÍAS Y JUGADORES ---------- */
    categoria(id) {
      return CATEGORIAS.find((c) => c.id === id) || CATEGORIAS[0];
    },
    // Datos de una pierna: DB.pierna('izquierda').nombre -> "Izquierda"
    pierna(id) {
      return PIERNAS.find((p) => p.id === id) || PIERNAS[0];
    },
    // Jugadores de un equipo (por defecto, el activo), ordenados por nombre
    jugadoresDe(equipoId = this.equipo()?.id) {
      return this.delEquipo('jugadores', equipoId).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    },

    /* ---------- DATOS DE EJEMPLO ---------- */
    // Todo lo inventado lleva la marca "ejemplo: true"
    hayEjemplo() {
      return ['equipos', ...DEL_EQUIPO].some((c) => (datos[c] || []).some((x) => x.ejemplo));
    },
    borrarEjemplo() {
      ['equipos', ...DEL_EQUIPO].forEach((c) => {
        datos[c] = (datos[c] || []).filter((x) => !x.ejemplo);
      });
      if (!this.obtener('equipos', datos.ajustes.equipoActivo)) datos.ajustes.equipoActivo = this.equipos()[0]?.id || null;
      guardar();
    },
    // Mete los datos de ejemplo (ver datos-ejemplo.js) y activa el primer equipo de ejemplo
    cargarEjemplo(paquete) {
      Object.keys(paquete).forEach((c) => {
        datos[c] = (datos[c] || []).filter((x) => !x.ejemplo).concat(paquete[c]);
      });
      if (paquete.equipos?.length) datos.ajustes.equipoActivo = paquete.equipos[0].id;
      guardar();
    },

    /* ---------- COPIA DE SEGURIDAD ---------- */
    // Devuelve todos los datos como texto (formato JSON)
    exportar() {
      return JSON.stringify({ app: 'cd-el-tranvia', exportado: new Date().toISOString(), datos }, null, 2);
    },
    // Recibe el texto de una copia y sustituye los datos actuales
    importar(texto) {
      const obj = JSON.parse(texto); // si el archivo no es válido, aquí da error
      if (obj.app !== 'cd-el-tranvia' || !obj.datos || !Array.isArray(obj.datos.jugadores)) {
        throw new Error('El archivo no es una copia de esta app');
      }
      datos = Object.assign(datosVacios(), obj.datos);
      migrarAEquipos(); // las copias antiguas (sin equipos) también se adaptan
      simplificarJugadores();
      guardar();
    },
    // Borra absolutamente todo
    reiniciar() {
      datos = datosVacios();
      guardar();
    },
  };
})();
