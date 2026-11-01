/* =============================================================
   UI.JS · Herramientas de interfaz que usa toda la app
   -------------------------------------------------------------
   Aquí hay funciones pequeñas y reutilizables: mostrar avisos,
   abrir ventanas emergentes, formatear fechas, dibujar iconos…
   Las agrupamos en un objeto llamado "UI" para encontrarlas fácil:
   por ejemplo UI.aviso("Guardado") muestra un mensaje abajo.
   ============================================================= */

/* "Vistas" guarda cada pantalla de la app y "Acciones" lo que hace
   cada botón. Las rellenan los archivos de la carpeta js/vistas. */
const Vistas = {};
const Acciones = {};

const UI = {
  /* Evita que un texto escrito por el usuario "rompa" la página.
     Ejemplo: si alguien escribe <b> en un nombre, se mostrará tal cual. */
  esc(texto) {
    return String(texto ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  /* Quita tildes y mayúsculas para buscar: "Acoidán" -> "acoidan" */
  normalizar(texto) {
    return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  },

  /* Devuelve el código de un icono. Ejemplo: UI.icono('mas') */
  icono(nombre, clase = '') {
    return `<svg class="ico ${clase}"><use href="#i-${nombre}"/></svg>`;
  },

  /* Crea un identificador único para cada cosa que guardamos */
  id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  /* Mensaje corto que aparece abajo unos segundos */
  aviso(mensaje, tipo = 'ok') {
    const caja = document.getElementById('avisos');
    const t = document.createElement('div');
    t.className = 'toast' + (tipo === 'error' ? ' error' : '');
    t.innerHTML = UI.icono(tipo === 'error' ? 'info' : 'check') + `<span>${UI.esc(mensaje)}</span>`;
    caja.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; }, 2400);
    setTimeout(() => t.remove(), 2800);
  },

  /* ---------- VENTANAS EMERGENTES ----------
     UI.modal({ titulo, cuerpo, textoGuardar, alGuardar })
     - cuerpo: el HTML de dentro (normalmente un formulario)
     - alGuardar(formulario): se ejecuta al pulsar "Guardar".
       Si devuelve false, la ventana no se cierra (por ejemplo, si falta un dato). */
  modal({ titulo, cuerpo, textoGuardar = 'Guardar', alGuardar, alCancelar, sinPie = false, extraPie = '' }) {
    const capa = document.getElementById('modal-capa');
    capa.innerHTML = `
      <form class="modal" role="dialog" aria-modal="true" aria-label="${UI.esc(titulo)}" novalidate>
        <div class="modal-cab">
          <h2>${UI.esc(titulo)}</h2>
          <button type="button" class="btn btn-icono" data-cerrar aria-label="Cerrar">${UI.icono('cerrar')}</button>
        </div>
        <div class="modal-cuerpo">${cuerpo}</div>
        ${sinPie ? '' : `
        <div class="modal-pie">
          ${extraPie}
          <button type="button" class="btn btn-borde" data-cerrar>Cancelar</button>
          <button type="submit" class="btn btn-primario">${UI.icono('check')} ${UI.esc(textoGuardar)}</button>
        </div>`}
      </form>`;
    capa.hidden = false;
    document.body.style.overflow = 'hidden';
    const form = capa.querySelector('form');

    // Cerrar al pulsar la X, "Cancelar" o fuera de la ventana
    capa.onclick = (e) => {
      if (e.target === capa || e.target.closest('[data-cerrar]')) {
        UI.cerrarModal();
        if (alCancelar) alCancelar();
      }
    };
    form.onsubmit = (e) => {
      e.preventDefault();
      if (alGuardar && alGuardar(form) === false) return;
      UI.cerrarModal();
    };
    // Pone el cursor en el primer campo para escribir directamente (solo en ordenador)
    if (window.matchMedia('(min-width: 900px)').matches) {
      setTimeout(() => form.querySelector('input:not([type=range]),select,textarea')?.focus(), 60);
    }
    return form;
  },

  cerrarModal() {
    const capa = document.getElementById('modal-capa');
    capa.hidden = true;
    capa.innerHTML = '';
    document.body.style.overflow = '';
  },

  /* Pregunta "¿Seguro?" antes de borrar algo. Devuelve una promesa (respuesta a futuro) */
  confirmar(mensaje, textoBoton = 'Borrar') {
    return new Promise((resolver) => {
      const form = UI.modal({
        titulo: '¿Estás seguro?',
        cuerpo: `<p class="texto-suave">${UI.esc(mensaje)}</p>`,
        textoGuardar: textoBoton,
        alGuardar: () => resolver(true),
        alCancelar: () => resolver(false),
      });
      form.querySelector('[type=submit]').className = 'btn btn-rojo';
    });
  },

  /* Convierte los campos de un formulario en un objeto { nombre: valor } */
  leerFormulario(form) {
    const datos = {};
    new FormData(form).forEach((valor, clave) => { datos[clave] = typeof valor === 'string' ? valor.trim() : valor; });
    return datos;
  },

  /* ---------- FECHAS EN ESPAÑOL ---------- */
  hoyISO() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  },
  // Suma días a una fecha "2026-11-01" y devuelve otra en el mismo formato
  sumarDias(iso, dias) {
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + dias);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  },
  // "2026-11-08" -> "sáb 8 nov"
  fechaCorta(iso) {
    if (!iso) return '';
    return new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
  },
  // "2026-11-08" -> "sábado, 8 de noviembre de 2026"
  fechaLarga(iso) {
    if (!iso) return '';
    return new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  },
  // Pone en mayúscula la primera letra: "sábado" -> "Sábado"
  mayuscula(texto) {
    return texto ? texto[0].toUpperCase() + texto.slice(1) : '';
  },
  // Días que faltan hasta una fecha (0 = hoy, negativo = ya pasó)
  diasHasta(iso) {
    const hoy = new Date(UI.hoyISO() + 'T12:00:00');
    return Math.round((new Date(iso + 'T12:00:00') - hoy) / 86400000);
  },
  cuandoTexto(iso) {
    const d = UI.diasHasta(iso);
    if (d === 0) return 'Hoy';
    if (d === 1) return 'Mañana';
    if (d === -1) return 'Ayer';
    if (d > 1 && d < 7) return `En ${d} días`;
    if (d < -1 && d > -7) return `Hace ${-d} días`;
    return UI.fechaCorta(iso);
  },

  /* ---------- PIEZAS VISUALES DE JUGADORES ---------- */
  // Iniciales del nombre: "Dani" -> "D", "Juan Pablo" -> "JP"
  iniciales(nombre) {
    return String(nombre || '?').split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  },
  // Cuadrado con iniciales, del color de su categoría
  avatar(jugador, grande = false) {
    const cat = DB.categoria(jugador.categoria);
    return `<div class="avatar ${grande ? 'gran' : ''}" style="--c1:${cat.color};--c2:${cat.color2}">
      ${UI.esc(UI.iniciales(jugador.nombre))}
      ${jugador.dorsal && !grande ? `<span class="dorsal">${UI.esc(jugador.dorsal)}</span>` : ''}
    </div>`;
  },
  // Posición abreviada, como en las apps deportivas
  posicionCorta(posicion) {
    return { Portero: 'POR', Defensa: 'DEF', Centrocampista: 'MED', Delantero: 'DEL' }[posicion] || '—';
  },
  // Color según la nota: rojo (baja), amarillo (media), verde (alta)
  colorNota(v) {
    if (v >= 7.5) return 'var(--verde)';
    if (v >= 5) return 'var(--azul)';
    if (v >= 3.5) return 'var(--amarillo)';
    return 'var(--rojo)';
  },
  // Círculo con la media del jugador
  media(valor) {
    const v = Number(valor) || 0;
    return `<div class="media" style="--v:${v};--color-media:${UI.colorNota(v)}" title="Media ${v.toFixed(1)}"><span>${v.toFixed(1)}</span></div>`;
  },

  // Pantalla vacía con mensaje (cuando todavía no hay datos)
  vacio(icono, titulo, texto, boton = '') {
    return `<div class="vacio">${UI.icono(icono)}<h3>${UI.esc(titulo)}</h3><p>${UI.esc(texto)}</p>${boton}</div>`;
  },

  // Descarga un texto como archivo (para las copias de seguridad)
  descargar(nombreArchivo, contenido, tipo = 'application/json') {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombreArchivo;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
