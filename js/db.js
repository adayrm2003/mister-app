/* =============================================================
   DB.JS · El "almacén" de datos de la app
   -------------------------------------------------------------
   Guardamos todo en el navegador con localStorage: una especie de
   cajón que el navegador conserva aunque cierres la app.
   (Ojo: si cambias de móvil o borras los datos del navegador,
   se pierde. Por eso existe la copia de seguridad.)

   Los datos se organizan en "colecciones" (listas):
     jugadores, ejercicios, sesiones, preparaciones, partidos
   y un apartado de "ajustes".

   El resto de la app NUNCA toca localStorage directamente:
   siempre pasa por DB.lista(), DB.crear(), DB.actualizar()…
   Así, en la fase 6, bastará con cambiar este archivo para
   guardar en la nube.
   ============================================================= */

const DB = (() => {
  const CLAVE = 'tranvia-datos-v1'; // nombre del "cajón" en el navegador

  /* Categorías del fútbol base en Tenerife.
     "futbol" indica si juegan fútbol 7 o fútbol 11 (para la pizarra). */
  const CATEGORIAS = [
    { id: 'prebenjamin', nombre: 'Prebenjamín', edades: '6-7',  min: 6,  max: 7,  futbol: 7,  color: '#F2B705', color2: '#C77700' },
    { id: 'benjamin',    nombre: 'Benjamín',    edades: '8-9',  min: 8,  max: 9,  futbol: 7,  color: '#12A150', color2: '#0B6B35' },
    { id: 'alevin',      nombre: 'Alevín',      edades: '10-11', min: 10, max: 11, futbol: 7, color: '#13A8B8', color2: '#0B6470' },
    { id: 'infantil',    nombre: 'Infantil',    edades: '12-13', min: 12, max: 13, futbol: 11, color: '#0272BB', color2: '#0B2545' },
    { id: 'cadete',      nombre: 'Cadete',      edades: '14-15', min: 14, max: 15, futbol: 11, color: '#6C4CD8', color2: '#3A2391' },
    { id: 'juvenil',     nombre: 'Juvenil',     edades: '16-18', min: 16, max: 18, futbol: 11, color: '#CF2633', color2: '#7D1019' },
    { id: 'regional',    nombre: 'Regional',    edades: '19+',  min: 19, max: 99, futbol: 11, color: '#33414F', color2: '#0A0F17' },
  ];

  /* Las 4 valoraciones de cada jugador (del 1 al 10) */
  const ASPECTOS = [
    { id: 'defensa',   nombre: 'Defensa',   color: '#0272BB' },
    { id: 'ataque',    nombre: 'Ataque',    color: '#CF2633' },
    { id: 'velocidad', nombre: 'Velocidad', color: '#12A150' },
    { id: 'fuerza',    nombre: 'Fuerza',    color: '#F2B705' },
  ];

  const POSICIONES = ['Portero', 'Defensa', 'Centrocampista', 'Delantero'];

  // Cómo son los datos cuando la app está recién instalada
  function datosVacios() {
    return {
      version: 1,
      jugadores: [],
      ejercicios: [],     // ejercicios creados por el entrenador (los precargados están en ejercicios.js)
      sesiones: [],       // entrenamientos
      preparaciones: [],  // preparación del partido de la semana
      partidos: [],
      ajustes: { tema: 'auto', categoria: 'todas', entrenador: '' },
    };
  }

  let datos = null;

  // Lee los datos del navegador (o crea unos vacíos la primera vez)
  function cargar() {
    try {
      const texto = localStorage.getItem(CLAVE);
      if (texto) {
        // "Mezclamos" con los datos vacíos por si en versiones nuevas añadimos colecciones
        datos = Object.assign(datosVacios(), JSON.parse(texto));
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
    CATEGORIAS, ASPECTOS, POSICIONES,
    cargar, guardar,

    // Lista completa de una colección. Ej: DB.lista('jugadores')
    lista(coleccion) {
      return datos[coleccion] || [];
    },
    // Busca un elemento por su id
    obtener(coleccion, id) {
      return (datos[coleccion] || []).find((x) => x.id === id);
    },
    // Añade un elemento nuevo y lo devuelve (con su id)
    crear(coleccion, objeto) {
      const nuevo = { id: UI.id(), creado: new Date().toISOString(), ...objeto };
      datos[coleccion].push(nuevo);
      guardar();
      return nuevo;
    },
    // Cambia algunos campos de un elemento
    actualizar(coleccion, id, cambios) {
      const el = this.obtener(coleccion, id);
      if (!el) return null;
      Object.assign(el, cambios);
      guardar();
      return el;
    },
    // Elimina un elemento
    borrar(coleccion, id) {
      datos[coleccion] = datos[coleccion].filter((x) => x.id !== id);
      guardar();
    },

    // Ajustes (tema, categoría elegida…)
    ajuste(clave) { return datos.ajustes[clave]; },
    cambiarAjuste(clave, valor) { datos.ajustes[clave] = valor; guardar(); },

    /* ---------- AYUDAS DE CATEGORÍAS Y JUGADORES ---------- */
    categoria(id) {
      return CATEGORIAS.find((c) => c.id === id) || CATEGORIAS[0];
    },
    // Sugiere la categoría según la edad
    categoriaPorEdad(edad) {
      const e = Number(edad);
      if (!e) return null;
      if (e < 6) return CATEGORIAS[0];
      return CATEGORIAS.find((c) => e >= c.min && e <= c.max) || CATEGORIAS[CATEGORIAS.length - 1];
    },
    // Media de las 4 valoraciones
    mediaJugador(j) {
      const v = j.valoraciones || {};
      const notas = ASPECTOS.map((a) => Number(v[a.id]) || 0);
      return notas.reduce((s, n) => s + n, 0) / ASPECTOS.length;
    },
    // Jugadores filtrados por categoría ('todas' = todos), ordenados por nombre
    jugadoresDe(categoria) {
      return datos.jugadores
        .filter((j) => !categoria || categoria === 'todas' || j.categoria === categoria)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    },

    /* ---------- DATOS DE EJEMPLO ---------- */
    // Todo lo inventado lleva la marca "ejemplo: true"
    hayEjemplo() {
      return ['jugadores', 'sesiones', 'partidos', 'preparaciones', 'ejercicios']
        .some((c) => (datos[c] || []).some((x) => x.ejemplo));
    },
    borrarEjemplo() {
      ['jugadores', 'sesiones', 'partidos', 'preparaciones', 'ejercicios'].forEach((c) => {
        datos[c] = (datos[c] || []).filter((x) => !x.ejemplo);
      });
      guardar();
    },
    // Mete los datos de ejemplo (ver datos-ejemplo.js)
    cargarEjemplo(paquete) {
      Object.keys(paquete).forEach((c) => {
        datos[c] = (datos[c] || []).filter((x) => !x.ejemplo).concat(paquete[c]);
      });
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
      guardar();
    },
    // Borra absolutamente todo
    reiniciar() {
      datos = datosVacios();
      guardar();
    },
  };
})();
