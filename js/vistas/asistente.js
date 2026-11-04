/* =============================================================
   VISTAS/ASISTENTE.JS · Fase 5: pantalla del asistente
   -------------------------------------------------------------
   - Generador de sesiones (categoría + objetivo + duración)
   - Resúmenes automáticos de los partidos jugados
   - Estado de la IA real (preparada, desactivada)
   ============================================================= */

Vistas.asistente = {
  titulo: 'Asistente',
  tab: 'asistente',
  // Lo que el entrenador ha elegido en el generador
  eleccion: { categoria: null, objetivo: 'pase', duracion: 75 },
  propuesta: null,
  semilla: 1,
  equipoId: null, // equipo para el que se hizo la última propuesta

  pintar() {
    const e = this.eleccion;
    const eq = DB.equipo();
    // Al cambiar de equipo, el generador toma su categoría y su duración habitual
    if (this.equipoId !== eq.id) {
      this.equipoId = eq.id;
      this.propuesta = null;
      e.duracion = eq.duracion;
    }
    e.categoria = eq.categoria;
    const duraciones = [...new Set([45, 60, 75, 90, eq.duracion])].sort((a, b) => a - b);
    const jugados = Partidos.lista().filter((p) => p.jugado).reverse().slice(0, 6);

    return `
      <section class="tarjeta-hero asistente-hero">
        <img src="assets/icons/escudo-512.png" class="marca-agua" alt="">
        <div class="icono-parte" style="--c:#fff;background:rgba(255,255,255,.15)">${UI.icono('chispa')}</div>
        <h1 style="margin:10px 0 4px">Asistente</h1>
        <p style="opacity:.85;margin:0">Genera entrenamientos completos y crónicas de partidos en un segundo. Funciona sin internet y sin coste.</p>
      </section>

      <div class="seccion-titulo"><h2>Generador de sesiones</h2></div>
      <section class="tarjeta">
        <p class="texto-suave peq" style="margin-bottom:12px">Para ${UI.esc(eq.nombre)} · ${DB.categoria(eq.categoria).nombre}</p>
        <span class="etiqueta-campo">Objetivo principal</span>
        <div class="chips-check" style="margin-top:6px">
          ${Biblioteca.OBJETIVOS.map((o) => `<label class="chip-check"><input type="radio" name="g-obj" value="${o.id}" ${e.objetivo === o.id ? 'checked' : ''}><span>${o.nombre}</span></label>`).join('')}
        </div>
        <span class="etiqueta-campo">Duración</span>
        <div class="segmentado" style="margin-top:6px">
          ${duraciones.map((d) => `<button type="button" class="${e.duracion === d ? 'activo' : ''}" data-accion="g-duracion" data-min="${d}">${d} min</button>`).join('')}
        </div>
        <button class="btn btn-rojo btn-bloque" data-accion="generar-sesion">${UI.icono('chispa')} Generar entrenamiento</button>
      </section>

      <div id="propuesta">${this.propuesta ? this.propuestaHTML(this.propuesta) : ''}</div>

      <div class="seccion-titulo"><h2>Crónicas de partidos</h2><a href="#/partidos">Partidos</a></div>
      <div class="lista">
        ${jugados.map((p) => `<div class="item" data-accion="ver-resumen" data-id="${p.id}">
            <div class="resultado res-${Partidos.resultado(p)}"><b>${p.golesFavor}-${p.golesContra}</b><span>${DB.categoria(p.categoria).nombre}</span></div>
            <div class="item-cuerpo"><div class="item-titulo">${UI.esc(Asistente.resumenPartido(p).titular)}</div>
            <div class="item-sub"><span>vs ${UI.esc(p.rival)}</span><span>· ${UI.fechaCorta(p.fecha)}</span></div></div>
            ${UI.icono('nota')}</div>`).join('') || UI.vacio('trofeo', 'Sin partidos jugados', 'Cuando apuntes un resultado y sus estadísticas, aquí tendrás la crónica.')}
      </div>

      <div class="seccion-titulo"><h2>IA avanzada</h2></div>
      <section class="tarjeta">
        <div class="parte-cab">
          <div class="icono-parte" style="--c:var(--texto-suave)">${UI.icono('nube')}</div>
          <div style="flex:1"><h3>Conexión con IA real</h3><span class="texto-suave peq">${IA.config.activa ? 'Activada' : 'Preparada, pero desactivada'}</span></div>
          <span class="etiqueta ${IA.config.activa ? 'verde' : 'gris'}">${IA.config.activa ? 'ON' : 'OFF'}</span>
        </div>
        <p class="texto-suave peq mt">El código ya está listo para conectar una IA (por ejemplo Claude) mediante un intermediario seguro en Netlify. Tiene coste por uso, así que no está activa. Las instrucciones están en <code>js/ia.js</code>.</p>
      </section>
    `;
  },

  // Pinta la sesión propuesta por el generador
  propuestaHTML(s) {
    return `
      <section class="tarjeta propuesta entrar">
        <div class="parte-cab">
          <div class="icono-parte" style="--c:var(--rojo)">${UI.icono('chispa')}</div>
          <div style="flex:1"><h2>${UI.esc(s.titulo)}</h2><span class="texto-suave peq">${s.duracion} minutos · propuesta del asistente</span></div>
        </div>
        <div class="aviso-info azul mt">${UI.icono('info')}<div>${s.explicacion.map(UI.esc).join(' ')}</div></div>

        ${Biblioteca.PARTES.map((p) => `
          <div class="propuesta-parte" style="--c:${p.color}">
            <div class="propuesta-parte-cab"><b>${p.nombre}</b><span>${s.partes[p.id].duracion}'</span></div>
            ${s.partes[p.id].ejercicios.map((x) => {
              const e = Biblioteca.obtener(x.id);
              return `<div class="ejercicio-fila"><button class="ejercicio-nombre" data-accion="ver-ejercicio" data-id="${e.id}">
                <b>${UI.esc(e.nombre)} ${x.encaja ? '<span class="etiqueta verde">objetivo</span>' : ''}</b>
                <span>${x.duracion} min · ${UI.esc(e.material || '')}</span></button></div>`;
            }).join('') || '<p class="texto-suave peq">Sin ejercicios para esta edad.</p>'}
          </div>`).join('')}

        ${s.puntosClave.length ? `<h3 class="mt">🎯 Puntos clave a corregir</h3><ul class="lista-puntos">${s.puntosClave.map((t) => `<li>${UI.esc(t)}</li>`).join('')}</ul>` : ''}
        ${s.consejos.length ? `<h3 class="mt">💡 Consejos para ${DB.categoria(s.categoria).nombre}</h3><ul class="lista-puntos">${s.consejos.map((t) => `<li>${UI.esc(t)}</li>`).join('')}</ul>` : ''}

        <div class="fila-botones mt">
          <button class="btn btn-primario" data-accion="guardar-propuesta">${UI.icono('check')} Guardar como sesión</button>
          <button class="btn btn-borde" data-accion="otra-propuesta">${UI.icono('chispa')} Otra propuesta</button>
        </div>
      </section>`;
  },
};

/* ---------- RESUMEN AUTOMÁTICO EN EL DETALLE DEL PARTIDO ---------- */
(Vistas.partido.extras = Vistas.partido.extras || []).push((p) => {
  if (!p.jugado) return '';
  const r = Asistente.resumenPartido(p);
  return `
    <section class="tarjeta ancho-total cronica">
      <div class="parte-cab">
        <div class="icono-parte" style="--c:var(--rojo)">${UI.icono('chispa')}</div>
        <div style="flex:1"><span class="texto-suave peq">Crónica automática</span><h3>${UI.esc(r.titular)}</h3></div>
      </div>
      <div class="mt">${r.parrafos.map((t) => `<p>${UI.esc(t)}</p>`).join('')}</div>
      ${r.aviso ? `<div class="aviso-info">${UI.icono('info')}<div>${UI.esc(r.aviso)}</div></div>` : ''}
      <div class="fila-botones">
        <button class="btn btn-whatsapp btn-peq" data-accion="resumen-whatsapp" data-id="${p.id}">${UI.icono('whatsapp')} WhatsApp</button>
        <button class="btn btn-borde btn-peq" data-accion="resumen-copiar" data-id="${p.id}">${UI.icono('copiar')} Copiar</button>
      </div>
    </section>`;
});

/* ---------- ACCIONES ---------- */
// Lee lo elegido en el formulario del generador
function leerEleccion() {
  const e = Vistas.asistente.eleccion;
  e.categoria = DB.equipo().categoria;
  e.objetivo = document.querySelector('input[name="g-obj"]:checked')?.value || 'pase';
}

Acciones['g-duracion'] = (el) => {
  leerEleccion();
  Vistas.asistente.eleccion.duracion = Number(el.dataset.min);
  el.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('activo', b === el));
};

Acciones['generar-sesion'] = () => {
  leerEleccion();
  Vistas.asistente.semilla = 1;
  Vistas.asistente.propuesta = Asistente.generarSesion({ ...Vistas.asistente.eleccion, semilla: 1 });
  document.getElementById('propuesta').innerHTML = Vistas.asistente.propuestaHTML(Vistas.asistente.propuesta);
  document.getElementById('propuesta').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

Acciones['otra-propuesta'] = () => {
  Vistas.asistente.semilla += 7;
  Vistas.asistente.propuesta = Asistente.generarSesion({ ...Vistas.asistente.eleccion, semilla: Vistas.asistente.semilla });
  document.getElementById('propuesta').innerHTML = Vistas.asistente.propuestaHTML(Vistas.asistente.propuesta);
};

// Guarda la propuesta como una sesión normal (en la fecha que elijas)
Acciones['guardar-propuesta'] = () => {
  const s = Vistas.asistente.propuesta;
  UI.modal({
    titulo: 'Guardar sesión',
    textoGuardar: 'Guardar',
    cuerpo: `
      <div class="campo"><label for="gp-titulo">Título</label><input type="text" id="gp-titulo" name="titulo" maxlength="60" value="${UI.esc(s.titulo)}"></div>
      <div class="rejilla-2">
        <div class="campo"><label for="gp-fecha">Fecha</label><input type="date" id="gp-fecha" name="fecha" value="${UI.sumarDias(UI.hoyISO(), 1)}"></div>
        <div class="campo"><label for="gp-hora">Hora</label><input type="time" id="gp-hora" name="hora" value="18:00"></div>
      </div>`,
    alGuardar: (f) => {
      const d = UI.leerFormulario(f);
      const partes = {};
      Biblioteca.PARTES.forEach((p) => { partes[p.id] = { duracion: s.partes[p.id].duracion, ejercicios: s.partes[p.id].ejercicios.map((x) => x.id) }; });
      const nueva = DB.crear('sesiones', {
        titulo: d.titulo || s.titulo, fecha: d.fecha || UI.hoyISO(), hora: d.hora, categoria: s.categoria, partes, asistencia: {},
        notas: 'Puntos clave:\n- ' + s.puntosClave.join('\n- '),
      });
      UI.aviso('Sesión guardada en Entrenos');
      location.hash = '#/sesion/' + nueva.id;
    },
  });
};

Acciones['ver-resumen'] = (el) => {
  const p = DB.obtener('partidos', el.dataset.id);
  const r = Asistente.resumenPartido(p);
  UI.modal({
    titulo: r.titular,
    sinPie: true,
    cuerpo: `
      <p class="texto-suave peq">${DB.categoria(p.categoria).nombre} · ${UI.mayuscula(UI.fechaLarga(p.fecha))}</p>
      <div class="cronica mt">${r.parrafos.map((t) => `<p>${UI.esc(t)}</p>`).join('')}</div>
      ${r.aviso ? `<div class="aviso-info">${UI.icono('info')}<div>${UI.esc(r.aviso)}</div></div>` : ''}
      <div class="fila-botones mt">
        <button type="button" class="btn btn-whatsapp" data-accion="resumen-whatsapp" data-id="${p.id}">${UI.icono('whatsapp')} WhatsApp</button>
        <button type="button" class="btn btn-borde" data-accion="resumen-copiar" data-id="${p.id}">${UI.icono('copiar')} Copiar</button>
        <a class="btn btn-borde" href="#/partido/${p.id}">Ver partido</a>
      </div>`,
  });
};

Acciones['resumen-whatsapp'] = (el) => Compartir.whatsapp(Asistente.textoResumen(DB.obtener('partidos', el.dataset.id)));
Acciones['resumen-copiar'] = (el) => UI.copiar(Asistente.textoResumen(DB.obtener('partidos', el.dataset.id)));
