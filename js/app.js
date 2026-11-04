/* =============================================================
   APP.JS · El arranque y el "director de orquesta"
   -------------------------------------------------------------
   1. Carga los datos.
   2. Aplica el modo claro/oscuro.
   3. Decide qué pantalla mostrar según la dirección (el "#/…"
      que aparece al final de la URL). Esto se llama "router".
   4. Escucha los toques en botones con data-accion="…".
   5. Registra el "service worker" para que funcione sin internet.
   ============================================================= */

const App = {
  rutaActual: '',

  /* ---------- ARRANQUE ---------- */
  iniciar() {
    const primeraVez = DB.cargar();
    // La primera vez metemos datos de ejemplo para poder probar
    // (con la nube activa no, para no mezclarlos con los datos reales del club)
    if (primeraVez && !Nube.disponible()) DB.cargarEjemplo(DatosEjemplo.generar());

    Nube.iniciar(); // sesión y sincronización con Supabase (fase 6)
    App.aplicarTema();
    App.escucharBotones();

    // Cada vez que cambia el "#/…" de la dirección, pintamos otra pantalla
    window.addEventListener('hashchange', App.pintar);
    App.pintar();

    // Quitamos la pantalla de carga tras un instante
    setTimeout(() => document.getElementById('splash').classList.add('oculto'), 700);

    App.registrarServiceWorker();
  },

  /* ---------- ROUTER: qué pantalla toca ----------
     "#/jugador/abc123" -> pantalla "jugador" con parámetro "abc123" */
  pintar() {
    const hash = location.hash.replace(/^#\/?/, '') || 'inicio';
    const [nombre, ...parametros] = hash.split('/').map(decodeURIComponent);
    let vista = Vistas[nombre] || Vistas.inicio;
    // Con la nube activa, sin sesión iniciada solo se ve la pantalla de acceso
    if (Nube.disponible() && !Nube.conectado()) vista = Vistas.entrar;
    // Sin ningún equipo, lo primero es crear uno
    else if (!DB.equipo()) vista = Vistas.bienvenida;
    else if (vista === Vistas.entrar || vista === Vistas.bienvenida) vista = Vistas.inicio;
    document.body.classList.toggle('sin-menu', !!vista.sinMenu);
    App.rutaActual = hash;

    UI.cerrarModal();
    const main = document.getElementById('vista');
    main.innerHTML = vista.pintar(...parametros);
    main.classList.remove('entrar');
    void main.offsetWidth; // truco para reiniciar la animación de entrada
    main.classList.add('entrar');
    if (vista.montar) vista.montar(...parametros); // cosas que hacer tras pintar (gráficos, arrastrar…)

    // Cabecera: el equipo activo (o el nombre de la pantalla si aún no hay equipo)
    const titulo = typeof vista.titulo === 'function' ? vista.titulo(...parametros) : vista.titulo;
    const eq = DB.equipo();
    const selector = document.getElementById('selector-equipo');
    selector.classList.toggle('sin-equipo', !eq || !!vista.sinMenu);
    document.getElementById('titulo-vista').textContent = eq && !vista.sinMenu ? eq.nombre : titulo || 'C.D. El Tranvía';
    document.getElementById('equipo-detalle').textContent = eq && !vista.sinMenu
      ? `${DB.categoria(eq.categoria).nombre} · Fútbol ${eq.modalidad}` : 'C.D. El Tranvía';
    document.title = `${titulo} · C.D. El Tranvía`;

    // Marca en el menú la pestaña activa
    document.querySelectorAll('.menu a').forEach((a) => a.classList.toggle('activo', a.dataset.tab === vista.tab));

    // Botón "volver" solo en pantallas de detalle
    const atras = document.getElementById('btn-atras');
    atras.hidden = !vista.atras;
    atras.onclick = () => (history.length > 1 ? history.back() : (location.hash = vista.atras));

    // Que el chip de la categoría elegida se vea (si la fila es más ancha que la pantalla)
    document.querySelectorAll('.chips .chip.activo').forEach((c) => {
      c.parentElement.scrollLeft = c.offsetLeft - c.parentElement.clientWidth / 2 + c.clientWidth / 2;
    });

    window.scrollTo({ top: 0 });
  },

  // Vuelve a pintar la pantalla actual (tras guardar algo)
  refrescar() {
    const y = window.scrollY;
    App.pintar();
    window.scrollTo({ top: y });
  },

  /* ---------- BOTONES ----------
     En vez de programar cada botón por separado, escuchamos todos
     los toques de la página. Si el elemento tocado tiene
     data-accion="nombre", ejecutamos Acciones.nombre(elemento). */
  escucharBotones() {
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-accion]');
      if (!el) return;
      const accion = Acciones[el.dataset.accion];
      if (accion) {
        e.preventDefault();
        accion(el, e);
      } else {
        console.warn('Acción no encontrada:', el.dataset.accion);
      }
    });
    // Para listas desplegables y casillas: data-al-cambiar="nombre"
    document.addEventListener('change', (e) => {
      const el = e.target.closest('[data-al-cambiar]');
      if (el && Acciones[el.dataset.alCambiar]) Acciones[el.dataset.alCambiar](el, e);
    });
    document.getElementById('btn-tema').addEventListener('click', App.cambiarTema);
  },

  /* ---------- MODO CLARO / OSCURO ----------
     "auto" sigue al móvil; "claro" y "oscuro" los fuerza. */
  aplicarTema() {
    const tema = DB.ajuste('tema') || 'auto';
    document.documentElement.dataset.theme = tema;
    const icono = { auto: 'auto', claro: 'sol', oscuro: 'luna' }[tema];
    const btn = document.getElementById('btn-tema');
    btn.innerHTML = UI.icono(icono);
    btn.setAttribute('aria-label', `Tema: ${tema}. Pulsa para cambiar`);
    btn.title = { auto: 'Tema automático', claro: 'Modo claro', oscuro: 'Modo oscuro' }[tema];
  },
  cambiarTema() {
    const orden = ['auto', 'claro', 'oscuro'];
    const actual = DB.ajuste('tema') || 'auto';
    const siguiente = orden[(orden.indexOf(actual) + 1) % orden.length];
    DB.cambiarAjuste('tema', siguiente);
    App.aplicarTema();
    UI.aviso({ auto: 'Tema automático (como tu móvil)', claro: 'Modo claro', oscuro: 'Modo oscuro' }[siguiente]);
  },

  /* ---------- FUNCIONAR SIN INTERNET ----------
     El "service worker" (sw.js) es un pequeño programa que guarda
     una copia de la app en el móvil para abrirla sin conexión. */
  registrarServiceWorker() {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service worker no registrado', e));
    }
  },
};


// Cuando el navegador termina de leer la página, arrancamos
document.addEventListener('DOMContentLoaded', App.iniciar);
