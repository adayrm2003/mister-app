/* =============================================================
   VISTAS/ASISTENTE.JS · Lo que el asistente añade a otras pantallas
   -------------------------------------------------------------
   - Crónica automática en el detalle de cada partido jugado
   - Estado de la IA real en Ajustes (preparada, desactivada)
   (Las sesiones se generan desde "Crear sesión de hoy" y "Nueva
   sesión": ver entrenos.js y asistente.js.)
   ============================================================= */

/* ---------- CRÓNICA AUTOMÁTICA EN EL DETALLE DEL PARTIDO ---------- */
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

/* ---------- IA REAL EN AJUSTES (preparada, desactivada) ---------- */
(Vistas.ajustes.extras = Vistas.ajustes.extras || []).push(() => `
  <section class="tarjeta">
    <div class="parte-cab">
      <div class="icono-parte" style="--c:var(--texto-suave)">${UI.icono('chispa')}</div>
      <div style="flex:1"><h2>IA avanzada</h2><span class="texto-suave peq">${IA.config.activa ? 'Activada' : 'Preparada, pero desactivada'}</span></div>
      <span class="etiqueta ${IA.config.activa ? 'verde' : 'gris'}">${IA.config.activa ? 'ON' : 'OFF'}</span>
    </div>
    <p class="texto-suave peq mt">Las sesiones y las crónicas se generan con reglas, sin internet y sin coste. El código está listo para conectar una IA real (tiene coste por uso). Instrucciones en <code>js/ia.js</code>.</p>
  </section>`);

/* ---------- ACCIONES ---------- */
Acciones['resumen-whatsapp'] = (el) => Compartir.whatsapp(Asistente.textoResumen(DB.obtener('partidos', el.dataset.id)));
Acciones['resumen-copiar'] = (el) => UI.copiar(Asistente.textoResumen(DB.obtener('partidos', el.dataset.id)));
