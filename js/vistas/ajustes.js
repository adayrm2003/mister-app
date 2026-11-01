/* =============================================================
   AJUSTES.JS · Ajustes, copia de seguridad y datos de ejemplo
   ============================================================= */

Vistas.ajustes = {
  titulo: 'Ajustes',
  atras: '#/inicio',

  pintar() {
    const tema = DB.ajuste('tema') || 'auto';
    const n = (c) => DB.lista(c).length;
    return `
      <div class="pantalla-cab"><div><h1>Ajustes</h1><p>Preferencias y copia de seguridad</p></div></div>

      <section class="tarjeta">
        <h2>Tu perfil</h2>
        <div class="campo mt">
          <label for="a-entrenador">Tu nombre (para el saludo y las convocatorias)</label>
          <input type="text" id="a-entrenador" maxlength="30" value="${UI.esc(DB.ajuste('entrenador'))}" placeholder="Ej.: Míster Juan">
        </div>
        <span class="etiqueta-campo">Apariencia</span>
        <div class="segmentado mt" style="margin-top:6px">
          ${[['auto', 'Automático'], ['claro', 'Claro'], ['oscuro', 'Oscuro']].map(([v, t]) =>
            `<button class="${tema === v ? 'activo' : ''}" data-accion="elegir-tema" data-tema="${v}">${t}</button>`).join('')}
        </div>
      </section>

      <section class="tarjeta">
        <h2>Copia de seguridad</h2>
        <p class="texto-suave peq">Tus datos se guardan solo en este navegador. Descarga una copia de vez en cuando y guárdala (por ejemplo, en tu Drive). Con ella puedes pasar los datos a otro móvil.</p>
        <p class="peq">Ahora mismo: <b>${n('jugadores')}</b> jugadores · <b>${n('sesiones')}</b> sesiones · <b>${n('partidos')}</b> partidos · <b>${n('ejercicios')}</b> ejercicios propios</p>
        <div class="fila-botones mt">
          <button class="btn btn-primario" data-accion="exportar">${UI.icono('descargar')} Descargar copia</button>
          <button class="btn btn-borde" data-accion="importar">${UI.icono('subir')} Restaurar copia</button>
          <input type="file" id="archivo-importar" accept=".json,application/json" hidden>
        </div>
      </section>

      <section class="tarjeta">
        <h2>Datos de ejemplo</h2>
        <p class="texto-suave peq">Jugadores, entrenos y partidos inventados para probar la app.</p>
        <div class="fila-botones mt">
          ${DB.hayEjemplo()
            ? `<button class="btn btn-peligro" data-accion="borrar-ejemplo">${UI.icono('papelera')} Borrar datos de ejemplo</button>`
            : `<button class="btn btn-borde" data-accion="cargar-ejemplo">${UI.icono('mas')} Cargar datos de ejemplo</button>`}
        </div>
      </section>

      ${(Vistas.ajustes.extras || []).map((fn) => fn()).join('')}

      <section class="tarjeta">
        <h2>Privacidad</h2>
        <p class="texto-suave peq">Esta app trata datos de menores. Solo se guarda nombre de pila o mote, categoría, edad, altura, peso, posición y dorsal. No guardes apellidos, DNI, direcciones, teléfonos ni fotos. Los datos no salen de este dispositivo salvo que tú descargues una copia o compartas una convocatoria.</p>
      </section>

      <section class="tarjeta">
        <h2 style="color:var(--rojo)">Zona peligrosa</h2>
        <p class="texto-suave peq">Borra todos los datos de la app en este navegador.</p>
        <button class="btn btn-peligro mt" data-accion="borrar-todo">${UI.icono('papelera')} Borrar todo</button>
      </section>

      <p class="centrado texto-suave peq mt">
        <img src="assets/icons/escudo-512.png" alt="" style="width:44px;opacity:.8"><br>
        C.D. El Tranvía · Santa Cruz de Tenerife<br>App de entrenadores · versión 1.0
      </p>
    `;
  },

  montar() {
    const caja = document.getElementById('a-entrenador');
    caja.addEventListener('change', () => { DB.cambiarAjuste('entrenador', caja.value.trim()); UI.aviso('Nombre guardado'); });

    // Cuando el usuario elige un archivo para restaurar
    document.getElementById('archivo-importar').addEventListener('change', (e) => {
      const archivo = e.target.files[0];
      if (!archivo) return;
      const lector = new FileReader();
      lector.onload = async () => {
        if (!(await UI.confirmar('Se sustituirán TODOS los datos actuales por los de la copia.', 'Restaurar'))) return;
        try {
          DB.importar(lector.result);
          UI.aviso('Copia restaurada');
          App.aplicarTema();
          App.refrescar();
        } catch (err) {
          UI.aviso('Archivo no válido: ' + err.message, 'error');
        }
      };
      lector.readAsText(archivo);
      e.target.value = '';
    });
  },
};

/* ---------- ACCIONES ---------- */
Acciones['elegir-tema'] = (el) => {
  DB.cambiarAjuste('tema', el.dataset.tema);
  App.aplicarTema();
  App.refrescar();
};

Acciones['exportar'] = () => {
  const fecha = UI.hoyISO();
  UI.descargar(`tranvia-copia-${fecha}.json`, DB.exportar());
  UI.aviso('Copia descargada');
};

Acciones['importar'] = () => document.getElementById('archivo-importar').click();

Acciones['cargar-ejemplo'] = () => {
  DB.cargarEjemplo(DatosEjemplo.generar());
  UI.aviso('Datos de ejemplo cargados');
  App.refrescar();
};

Acciones['borrar-todo'] = async () => {
  if (await UI.confirmar('Se borrarán TODOS los datos: jugadores, entrenos, partidos… Descarga antes una copia si la necesitas.', 'Borrar todo')) {
    DB.reiniciar();
    App.aplicarTema();
    UI.aviso('Todos los datos borrados');
    location.hash = '#/inicio';
    App.refrescar();
  }
};
