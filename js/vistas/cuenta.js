/* =============================================================
   CUENTA.JS · Fase 6: acceso, panel de la directiva y estado de la nube
   -------------------------------------------------------------
   #/entrar  -> iniciar sesión o crear cuenta
   #/club    -> panel de la directiva: equipos, entrenadores y roles
   ============================================================= */

/* ---------- PANTALLA: ACCESO ---------- */
Vistas.entrar = {
  titulo: 'Acceso',
  sinMenu: true,
  modo: 'entrar', // 'entrar' o 'registro'

  pintar() {
    const registro = this.modo === 'registro';
    return `
      <div class="acceso">
        <img src="assets/icons/escudo-512.png" alt="Escudo C.D. El Tranvía" class="acceso-escudo">
        <h1>Área de entrenadores</h1>
        <p class="texto-suave">C.D. El Tranvía · Santa Cruz de Tenerife</p>

        <section class="tarjeta mt">
          <div class="segmentado">
            <button type="button" class="${registro ? '' : 'activo'}" data-accion="modo-acceso" data-modo="entrar">Entrar</button>
            <button type="button" class="${registro ? 'activo' : ''}" data-accion="modo-acceso" data-modo="registro">Crear cuenta</button>
          </div>
          <form id="form-acceso" novalidate>
            ${registro ? `<div class="campo"><label for="c-nombre">Tu nombre</label>
              <input type="text" id="c-nombre" name="nombre" maxlength="40" autocomplete="name" placeholder="Ej.: Juan (Alevín A)"></div>` : ''}
            <div class="campo"><label for="c-email">Email</label>
              <input type="email" id="c-email" name="email" autocomplete="email" inputmode="email" required></div>
            <div class="campo"><label for="c-pass">Contraseña</label>
              <input type="password" id="c-pass" name="contrasena" minlength="8" required autocomplete="${registro ? 'new-password' : 'current-password'}">
              ${registro ? '<small>Mínimo 8 caracteres.</small>' : ''}</div>
            <button type="submit" class="btn btn-primario btn-bloque">${registro ? 'Crear cuenta' : 'Entrar'}</button>
          </form>
          ${registro
            ? `<p class="texto-suave peq mt">Después de registrarte crearás tu primer equipo.</p>`
            : `<button class="btn btn-peq btn-borde mt" data-accion="olvide-contrasena">¿Has olvidado la contraseña?</button>`}
        </section>
        <p class="texto-suave peq centrado mt">${UI.icono('candado', 'peq')} Cada entrenador solo ve los datos de su equipo.</p>
      </div>`;
  },

  montar() {
    const form = document.getElementById('form-acceso');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = UI.leerFormulario(form);
      if (!/^\S+@\S+\.\S+$/.test(d.email)) { UI.aviso('Escribe un email válido', 'error'); return; }
      if (!d.contrasena || d.contrasena.length < 8) { UI.aviso('La contraseña debe tener al menos 8 caracteres', 'error'); return; }
      const boton = form.querySelector('[type=submit]');
      boton.disabled = true;
      boton.textContent = 'Un momento…';
      try {
        if (Vistas.entrar.modo === 'registro') {
          const r = await Nube.registrarse(d.email, d.contrasena, d.nombre || '');
          if (r.confirmar) {
            UI.modal({ titulo: 'Revisa tu email', sinPie: true, cuerpo: `<p>Te hemos enviado un enlace a <b>${UI.esc(d.email)}</b>. Púlsalo para confirmar tu cuenta y después vuelve aquí para entrar.</p>` });
            Vistas.entrar.modo = 'entrar';
            return;
          }
        } else {
          await Nube.entrar(d.email, d.contrasena);
        }
        UI.aviso('¡Bienvenido/a!');
        location.hash = '#/hoy';
      } catch (err) {
        UI.aviso(err.message, 'error');
      } finally {
        boton.disabled = false;
        boton.textContent = Vistas.entrar.modo === 'registro' ? 'Crear cuenta' : 'Entrar';
      }
    });
  },
};

Acciones['modo-acceso'] = (el) => {
  Vistas.entrar.modo = el.dataset.modo;
  App.refrescar();
};

Acciones['olvide-contrasena'] = () => {
  UI.modal({
    titulo: 'Recuperar contraseña',
    textoGuardar: 'Enviar enlace',
    cuerpo: `<div class="campo"><label for="r-email">Tu email</label><input type="email" id="r-email" name="email" autocomplete="email"></div>`,
    alGuardar: (f) => {
      const email = UI.leerFormulario(f).email;
      if (!email) return false;
      Nube.recuperarContrasena(email)
        .then(() => UI.aviso('Te hemos enviado un enlace por email'))
        .catch((e) => UI.aviso(e.message, 'error'));
    },
  });
};

/* ---------- PANTALLA: PANEL DE LA DIRECTIVA ---------- */
Vistas.club = {
  titulo: 'Club',
  tab: 'ajustes',
  atras: '#/ajustes',

  pintar() {
    if (!Nube.esDirectiva()) return UI.vacio('candado', 'Solo para la directiva', 'Esta sección es para gestionar equipos y entrenadores.');
    return `
      <div class="pantalla-cab"><div><h1>Club</h1><p>Equipos, entrenadores y permisos</p></div></div>
      <div id="club">${UI.vacio('nube', 'Cargando…', 'Consultando la nube.')}</div>`;
  },

  async montar() {
    if (!Nube.esDirectiva()) return;
    const caja = document.getElementById('club');
    try {
      const { perfiles, equipos, asignaciones } = await Nube.club();
      if (!document.getElementById('club')) return; // ya cambiaste de pantalla
      const nombre = (p) => UI.esc(p.nombre || p.email);
      const equiposDe = (uid) => asignaciones.filter((a) => a.entrenador_id === uid).length;

      caja.innerHTML = `
        <div class="seccion-titulo"><h2>Equipos</h2><span class="texto-suave peq">${equipos.length}</span></div>
        <div class="lista en-rejilla">
          ${equipos.map((e) => {
            const cat = DB.categoria(e.categoria);
            const suyos = asignaciones.filter((a) => a.equipo_id === e.id).map((a) => perfiles.find((p) => p.id === a.entrenador_id)).filter(Boolean);
            return `<section class="tarjeta" style="margin:0">
              <div class="parte-cab">
                <div class="icono-parte" style="--c:${cat.color}">${UI.icono('escudo')}</div>
                <div style="flex:1"><h3>${UI.esc(e.nombre)}</h3><span class="texto-suave peq">${cat.nombre} · F${e.modalidad} · ${UI.esc(e.temporada)}</span></div>
                <button class="btn btn-icono" style="background:none" data-accion="club-borrar-equipo" data-id="${e.id}" data-nombre="${UI.esc(e.nombre)}" aria-label="Borrar equipo">${UI.icono('papelera')}</button>
              </div>
              <div class="convocados mt">
                ${suyos.map((p) => `<span class="etiqueta gris">${nombre(p)}
                  <button class="quitar" data-accion="quitar-entrenador" data-equipo="${e.id}" data-usuario="${p.id}" aria-label="Quitar a ${nombre(p)}">×</button></span>`).join('') || '<span class="texto-suave peq">Sin entrenador</span>'}
              </div>
              <button class="btn btn-borde btn-peq mt" data-accion="asignar-entrenador" data-equipo="${e.id}">${UI.icono('mas')} Asignar entrenador</button>
            </section>`;
          }).join('') || UI.vacio('escudo', 'Sin equipos', 'Cada entrenador crea sus equipos desde el selector de arriba.')}
        </div>

        <div class="seccion-titulo"><h2>Usuarios</h2><span class="texto-suave peq">${perfiles.length}</span></div>
        <section class="tarjeta">
          ${perfiles.map((p) => `<div class="asis-fila">
            <div class="icono-parte" style="--c:${p.rol === 'directiva' ? 'var(--rojo)' : 'var(--azul)'}">${UI.icono(p.rol === 'directiva' ? 'escudo' : 'equipo')}</div>
            <div class="asis-nombre">${nombre(p)}<br><small class="texto-suave">${UI.esc(p.email || '')} · ${p.rol === 'directiva' ? 'Directiva' : `${equiposDe(p.id)} equipo(s)`}</small></div>
            ${p.id === Nube.usuarioId() ? '<span class="etiqueta gris">Tú</span>'
              : `<button class="btn btn-peq btn-borde" data-accion="cambiar-rol" data-id="${p.id}" data-rol="${p.rol === 'directiva' ? 'entrenador' : 'directiva'}">${p.rol === 'directiva' ? 'Hacer entrenador' : 'Hacer directiva'}</button>`}
          </div>`).join('')}
        </section>
        <p class="texto-suave peq mt">Cada entrenador se registra y crea sus equipos. Aquí puedes añadir a otro entrenador a un equipo (por ejemplo, un ayudante) o nombrar directivos.</p>`;
      Vistas.club.datos = { perfiles, equipos, asignaciones };
    } catch (e) {
      caja.innerHTML = UI.vacio('nube', 'No se pudo cargar', Nube.traducir(e) + '. El panel del club necesita internet.');
    }
  },
};

// Tras cualquier cambio en el club: recargar el panel y los datos
async function cambioClub(promesa, mensaje) {
  try {
    await promesa;
    UI.aviso(mensaje);
    await Nube.sincronizar();
    App.refrescar();
  } catch (e) {
    UI.aviso(e.message, 'error');
  }
}

Acciones['club-borrar-equipo'] = async (el) => {
  if (await UI.confirmar(`Se borrará «${el.dataset.nombre}» y TODOS sus jugadores, entrenos y partidos de la nube. No se puede deshacer.`, 'Borrar equipo')) {
    cambioClub(Nube.borrarEquipo(el.dataset.id), 'Equipo borrado');
  }
};

Acciones['asignar-entrenador'] = (el) => {
  const { perfiles, asignaciones } = Vistas.club.datos;
  const yaEstan = new Set(asignaciones.filter((a) => a.equipo_id === el.dataset.equipo).map((a) => a.entrenador_id));
  const candidatos = perfiles.filter((p) => !yaEstan.has(p.id));
  if (!candidatos.length) { UI.aviso('No hay más usuarios para asignar', 'error'); return; }
  UI.modal({
    titulo: 'Asignar entrenador',
    textoGuardar: 'Asignar',
    cuerpo: `<div class="campo"><label for="a-usuario">Usuario</label>
      <select id="a-usuario" name="usuario">${candidatos.map((p) => `<option value="${p.id}">${UI.esc(p.nombre || p.email)} · ${UI.esc(p.email || '')}</option>`).join('')}</select></div>`,
    alGuardar: (f) => {
      cambioClub(Nube.asignar(el.dataset.equipo, UI.leerFormulario(f).usuario), 'Entrenador asignado');
    },
  });
};

Acciones['quitar-entrenador'] = async (el) => {
  if (await UI.confirmar('Este entrenador dejará de ver los datos del equipo.', 'Quitar')) {
    cambioClub(Nube.quitar(el.dataset.equipo, el.dataset.usuario), 'Entrenador quitado del equipo');
  }
};

Acciones['cambiar-rol'] = async (el) => {
  const aDirectiva = el.dataset.rol === 'directiva';
  if (await UI.confirmar(aDirectiva ? 'Podrá ver todos los equipos y gestionar el club.' : 'Solo verá los equipos que tenga asignados.', aDirectiva ? 'Hacer directiva' : 'Hacer entrenador')) {
    cambioClub(Nube.cambiarRol(el.dataset.id, el.dataset.rol), 'Rol cambiado');
  }
};

/* ---------- ESTADO DE LA NUBE EN AJUSTES ---------- */
(Vistas.ajustes.extras = Vistas.ajustes.extras || []).push(() => {
  if (!Nube.disponible()) return '';
  const locales = Nube.locales().length;
  const cola = Nube.estado.cola.length;
  return `
    <section class="tarjeta">
      <div class="parte-cab">
        <div class="icono-parte" style="--c:var(--azul)">${UI.icono('nube')}</div>
        <div style="flex:1"><h2>Tu cuenta</h2><span class="texto-suave peq">${UI.esc(Nube.estado.usuario?.email || '')}</span></div>
        <span class="etiqueta ${Nube.esDirectiva() ? 'roja' : ''}">${Nube.esDirectiva() ? 'Directiva' : 'Entrenador'}</span>
      </div>
      <p class="texto-suave peq mt">Última sincronización: ${Nube.estado.ultimaSync ? new Date(Nube.estado.ultimaSync).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : 'nunca'}${cola ? ` · <b>${cola} cambio(s) por enviar</b>` : ''}</p>
      <div class="fila-botones mt">
        <button class="btn btn-primario btn-peq" data-accion="sincronizar">${UI.icono('nube')} Sincronizar ahora</button>
        ${Nube.esDirectiva() ? `<a class="btn btn-borde btn-peq" href="#/club">${UI.icono('escudo')} Panel del club</a>` : ''}
        ${locales ? `<button class="btn btn-borde btn-peq" data-accion="subir-locales">${UI.icono('subir')} Subir ${locales} dato(s) de este móvil</button>` : ''}
        <button class="btn btn-peligro btn-peq" data-accion="cerrar-sesion">Cerrar sesión</button>
      </div>
    </section>`;
});

Acciones['sincronizar'] = () => Nube.sincronizar({ avisar: true });

Acciones['subir-locales'] = async () => {
  if (await UI.confirmar('Se subirán a la nube los equipos, jugadores, entrenos y partidos que creaste en este móvil antes de tener cuenta.', 'Subir')) {
    await Nube.subirLocales();
  }
};

Acciones['cerrar-sesion'] = async () => {
  if (await Nube.salir()) UI.aviso('Sesión cerrada');
};
