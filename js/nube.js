/* =============================================================
   NUBE.JS · Fase 6: todo el club en la nube (Supabase)
   -------------------------------------------------------------
   Cómo funciona (modelo "primero el móvil"):
   1. La app sigue leyendo y guardando en el navegador (db.js), así
      que va rápida y funciona sin internet.
   2. Cada cambio se apunta en una COLA y se envía a Supabase en
      cuanto hay conexión.
   3. Al abrir la app (o al recuperar la conexión) se DESCARGA lo
      último de la nube: así ves lo que han cambiado otros.

   La seguridad la pone la base de datos (supabase/esquema.sql):
   cada entrenador solo recibe los datos de sus equipos, y la
   directiva todos. Aunque alguien manipulara este código, el
   servidor no le daría nada más.

   LIBRERÍA: usamos supabase-js (la oficial de Supabase) porque
   gestiona el inicio de sesión, renueva la sesión sola y habla
   con la base de datos de forma segura. Se descarga de jsDelivr
   la primera vez y el service worker la guarda para usarla sin
   conexión.
   ============================================================= */

const Nube = {
  config: {
    activa: true,
    url: 'https://fnijrktglgfjokvyyoiv.supabase.co',
    // Clave PÚBLICA: puede ir en la app porque, sin sesión iniciada y sin
    // equipo asignado, las reglas de la base de datos no dejan ver nada.
    // ⚠️ La clave "secret" / "service_role" NUNCA debe ir aquí.
    clavePublica: 'sb_publishable_UfDJ7J6mnFTsMSs6VROVog_vGa0wYvy',
    libreria: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js',
  },

  // Colecciones de db.js que se guardan en la nube (y su tabla)
  // El orden importa: primero los equipos, porque lo demás pertenece a ellos
  TABLAS: { equipos: 'equipos', jugadores: 'jugadores', sesiones: 'sesiones', preparaciones: 'preparaciones', partidos: 'partidos', ejercicios: 'ejercicios' },
  CLAVE: 'tranvia-nube-v1',

  cliente: null,
  sincronizando: false,
  // Lo que recordamos entre visitas: quién eres y los cambios pendientes
  estado: { usuario: null, perfil: null, cola: [], ultimaSync: null },

  /* ---------- ESTADO GUARDADO EN EL NAVEGADOR ---------- */
  leerEstado() {
    try { Object.assign(Nube.estado, JSON.parse(localStorage.getItem(Nube.CLAVE) || '{}')); } catch { /* vacío */ }
  },
  guardarEstado() {
    try { localStorage.setItem(Nube.CLAVE, JSON.stringify(Nube.estado)); } catch { /* sin espacio */ }
  },

  disponible() { return Nube.config.activa; },
  conectado() { return !!Nube.estado.usuario; },
  usuarioId() { return Nube.estado.usuario?.id || null; },
  esDirectiva() { return Nube.estado.perfil?.rol === 'directiva'; },

  /* ---------- ARRANQUE ---------- */
  iniciar() {
    if (!Nube.disponible()) return;
    Nube.leerEstado();
    // Cada cambio en db.js se apunta en la cola
    DB.alCambiar = (coleccion, tipo, objeto) => {
      if (!Nube.TABLAS[coleccion] || !Nube.conectado()) return;
      Nube.encolar(coleccion, tipo, objeto.id);
    };
    // Al recuperar internet o volver a la app, sincronizamos
    window.addEventListener('online', () => Nube.sincronizar());
    document.addEventListener('visibilitychange', () => {
      const hace = Date.now() - new Date(Nube.estado.ultimaSync || 0).getTime();
      if (document.visibilityState === 'visible' && hace > 60000) Nube.sincronizar();
    });
    if (Nube.conectado()) Nube.conectar().then(() => Nube.sincronizar()).catch((e) => console.warn('Nube:', e.message));
  },

  // Carga la librería (una sola vez) y crea el cliente de Supabase
  async conectar() {
    if (Nube.cliente) return Nube.cliente;
    if (!window.supabase) {
      await new Promise((ok, mal) => {
        const s = document.createElement('script');
        s.src = Nube.config.libreria;
        s.onload = ok;
        s.onerror = () => mal(new Error('No se pudo cargar Supabase (¿sin internet?)'));
        document.head.appendChild(s);
      });
    }
    Nube.cliente = window.supabase.createClient(Nube.config.url, Nube.config.clavePublica, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'tranvia-sesion' },
    });
    // Si la sesión caduca o se cierra desde otro sitio
    Nube.cliente.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT' && Nube.conectado()) Nube.olvidar();
    });
    return Nube.cliente;
  },

  /* ---------- CUENTAS ---------- */
  async registrarse(email, contrasena, nombre) {
    await Nube.conectar();
    const { data, error } = await Nube.cliente.auth.signUp({
      email, password: contrasena,
      options: { data: { nombre }, emailRedirectTo: location.origin + location.pathname },
    });
    if (error) throw new Error(Nube.traducir(error));
    // Si Supabase pide confirmar el email, aún no hay sesión
    if (!data.session) return { confirmar: true };
    await Nube.alEntrar(data.user);
    return { confirmar: false };
  },

  async entrar(email, contrasena) {
    await Nube.conectar();
    const { data, error } = await Nube.cliente.auth.signInWithPassword({ email, password: contrasena });
    if (error) throw new Error(Nube.traducir(error));
    await Nube.alEntrar(data.user);
  },

  async recuperarContrasena(email) {
    await Nube.conectar();
    const { error } = await Nube.cliente.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error) throw new Error(Nube.traducir(error));
  },

  async alEntrar(usuario) {
    // Si en este móvil había datos de otra cuenta, se borran (privacidad)
    if (Nube.estado.usuario && Nube.estado.usuario.id !== usuario.id) Nube.vaciarDatosLocales();
    Nube.estado.usuario = { id: usuario.id, email: usuario.email };
    Nube.guardarEstado();
    await Nube.sincronizar();
  },

  async salir() {
    const pendientes = Nube.estado.cola.length + Nube.locales().length;
    if (pendientes && !(await UI.confirmar(`Hay ${pendientes} cambio(s) que no están en la nube. Si sales ahora, se borrarán de este dispositivo.`, 'Salir igualmente'))) return false;
    try { await Nube.conectar(); await Nube.cliente.auth.signOut(); } catch { /* sin conexión: salimos igual */ }
    Nube.olvidar();
    return true;
  },

  // Borra la sesión y los datos del club de este dispositivo
  olvidar() {
    Nube.vaciarDatosLocales();
    Nube.estado = { usuario: null, perfil: null, cola: [], ultimaSync: null };
    Nube.guardarEstado();
    location.hash = '#/entrar';
    App.refrescar();
  },
  vaciarDatosLocales() {
    Object.keys(Nube.TABLAS).forEach((c) => DB.reemplazar(c, []));
  },

  // Mensajes de error de Supabase en español
  traducir(error) {
    const m = String(error?.message || error);
    if (/Invalid login credentials/i.test(m)) return 'Email o contraseña incorrectos';
    if (/Email not confirmed/i.test(m)) return 'Confirma tu email con el enlace que te hemos enviado';
    if (/already registered|already exists/i.test(m)) return 'Ya existe una cuenta con ese email';
    if (/Password should be at least/i.test(m)) return 'La contraseña es demasiado corta';
    if (/rate limit|too many/i.test(m)) return 'Demasiados intentos. Espera unos minutos';
    if (/fetch|network|Load failed/i.test(m)) return 'Sin conexión a internet';
    return m;
  },

  /* ---------- TRADUCCIÓN app <-> base de datos ----------
     La app usa nombres como golesFavor; la base de datos, goles_favor. */
  aFila(coleccion, o) {
    const hora = (h) => (h ? h : null);
    const num = (n) => (n === '' || n === undefined || n === null ? null : Number(n));
    if (coleccion === 'equipos') {
      return { id: o.id, nombre: o.nombre, categoria: o.categoria, modalidad: Number(o.modalidad) || 7, duracion: Number(o.duracion) || 75,
        temporada: o.temporada || Evolucion.temporada() };
    }
    const equipo_id = o.equipoId;
    if (!UI.esUuid(equipo_id)) throw new Error('Dato sin equipo válido');
    if (coleccion === 'ejercicios') {
      return { id: o.id, equipo_id, nombre: o.nombre, parte: o.parte, objetivos: o.objetivos || [], duracion: num(o.duracion) || 10,
        material: o.material || null, descripcion: o.descripcion || null, datos: o.datos || {} };
    }
    if (coleccion === 'jugadores') {
      return { id: o.id, equipo_id, nombre: o.nombre, edad: num(o.edad), altura: num(o.altura), peso: num(o.peso),
        posicion: o.posicion || null, dorsal: o.dorsal || null, valoraciones: o.valoraciones || {}, historial: o.historial || [],
        notas: o.notas || [], comentario_informe: o.comentarioInforme || null };
    }
    if (coleccion === 'sesiones') {
      return { id: o.id, equipo_id, titulo: o.titulo || null, fecha: o.fecha, hora: hora(o.hora), partes: o.partes || {},
        asistencia: o.asistencia || {}, notas: o.notas || null, preparacion_id: UI.esUuid(o.preparacionId) ? o.preparacionId : null };
    }
    if (coleccion === 'preparaciones') {
      return { id: o.id, equipo_id, rival: o.rival, fecha: o.fecha, sistema: o.sistema || null, estilos: o.estilos || [],
        ejercicios: o.ejercicios || [], fuertes: o.fuertes || null, debiles: o.debiles || null, vigilar: o.vigilar || null, notas: o.notas || null };
    }
    // partidos
    return { id: o.id, equipo_id, rival: o.rival, competicion: o.competicion || 'Liga', fecha: o.fecha, hora: hora(o.hora),
      citacion: hora(o.citacion), lugar: o.lugar === 'fuera' ? 'fuera' : 'casa', campo: o.campo || null, jugado: !!o.jugado,
      goles_favor: num(o.golesFavor) || 0, goles_contra: num(o.golesContra) || 0, convocados: (o.convocados || []).filter(UI.esUuid),
      alineacion: o.alineacion || null, stats: o.stats || {}, notas: o.notas || null };
  },

  aLocal(coleccion, f) {
    const hora = (h) => (h ? String(h).slice(0, 5) : '');
    // "nube: true" = este dato ya está guardado en la nube
    const base = { id: f.id, creado: f.creado, nube: true };
    if (coleccion === 'equipos') {
      return { ...base, nombre: f.nombre, categoria: f.categoria, modalidad: f.modalidad, duracion: f.duracion, temporada: f.temporada };
    }
    // La categoría de cada dato es la de su equipo (los equipos se descargan primero)
    const comun = { ...base, equipoId: f.equipo_id, categoria: DB.obtener('equipos', f.equipo_id)?.categoria || 'alevin' };
    if (coleccion === 'ejercicios') {
      return { ...comun, nombre: f.nombre, parte: f.parte, objetivos: f.objetivos, duracion: f.duracion,
        material: f.material || '', descripcion: f.descripcion || '', datos: f.datos || {} };
    }
    if (coleccion === 'jugadores') {
      return { ...comun, nombre: f.nombre, edad: f.edad, altura: f.altura ?? '', peso: f.peso !== null ? Number(f.peso) : '',
        posicion: f.posicion || '', dorsal: f.dorsal || '', valoraciones: f.valoraciones, historial: f.historial, notas: f.notas,
        comentarioInforme: f.comentario_informe || '' };
    }
    if (coleccion === 'sesiones') {
      return { ...comun, titulo: f.titulo || '', fecha: f.fecha, hora: hora(f.hora), partes: f.partes, asistencia: f.asistencia,
        notas: f.notas || '', preparacionId: f.preparacion_id };
    }
    if (coleccion === 'preparaciones') {
      return { ...comun, rival: f.rival, fecha: f.fecha, sistema: f.sistema || '', estilos: f.estilos, ejercicios: f.ejercicios,
        fuertes: f.fuertes || '', debiles: f.debiles || '', vigilar: f.vigilar || '', notas: f.notas || '' };
    }
    return { ...comun, rival: f.rival, competicion: f.competicion, fecha: f.fecha, hora: hora(f.hora), citacion: hora(f.citacion),
      lugar: f.lugar, campo: f.campo || '', jugado: f.jugado, golesFavor: f.goles_favor, golesContra: f.goles_contra,
      convocados: f.convocados, alineacion: f.alineacion, stats: f.stats, notas: f.notas || '' };
  },

  /* ---------- COLA DE CAMBIOS PENDIENTES ---------- */
  encolar(coleccion, tipo, id) {
    // Si ya había un cambio pendiente de ese elemento, nos quedamos con el último
    Nube.estado.cola = Nube.estado.cola.filter((x) => x.id !== id).concat({ coleccion, tipo, id });
    Nube.guardarEstado();
    Nube.enviarPronto();
  },
  // Esperamos un instante para agrupar varios cambios seguidos
  enviarPronto() {
    clearTimeout(Nube._temporizador);
    Nube._temporizador = setTimeout(() => Nube.procesarCola(), 800);
  },

  async procesarCola() {
    if (!Nube.conectado() || !navigator.onLine || !Nube.estado.cola.length) return;
    await Nube.conectar();
    // Orden: primero crear equipos, luego sus datos, y borrar equipos al final
    const peso = (op) => (op.coleccion === 'equipos' ? (op.tipo === 'borrar' ? 2 : 0) : 1);
    const cola = [...Nube.estado.cola].sort((a, b) => peso(a) - peso(b));
    for (const op of cola) {
      const tabla = Nube.TABLAS[op.coleccion];
      let error = null;
      try {
        if (op.tipo === 'borrar') {
          ({ error } = await Nube.cliente.from(tabla).delete().eq('id', op.id));
        } else {
          const obj = DB.obtener(op.coleccion, op.id);
          if (obj) {
            const fila = Nube.aFila(op.coleccion, obj);
            ({ error } = await Nube.cliente.from(tabla).upsert(fila));
            // Marcamos el elemento como "ya está en la nube"
            if (!error) { obj.nube = true; DB.guardar(); }
          }
        }
      } catch (e) {
        error = e;
      }
      if (error && /fetch|network|Load failed/i.test(error.message)) break; // sin conexión: lo intentamos luego
      // Hecho (o rechazado por la base de datos): lo quitamos de la cola
      Nube.estado.cola = Nube.estado.cola.filter((x) => !(x.id === op.id && x.tipo === op.tipo));
      Nube.guardarEstado();
      if (error) {
        console.warn('Nube rechazó un cambio', op, error);
        UI.aviso('La nube no aceptó un cambio: ' + Nube.traducir(error), 'error');
      }
    }
  },

  /* ---------- DESCARGA ---------- */
  async descargar() {
    await Nube.conectar();
    const perfil = await Nube.cliente.from('perfiles').select('*').eq('id', Nube.usuarioId()).maybeSingle();
    if (perfil.error) throw perfil.error;
    if (!perfil.data) { Nube.olvidar(); return; } // la cuenta ya no existe
    Nube.estado.perfil = perfil.data;

    // Un entrenador recibe solo sus equipos (y lo suyo); la directiva, todo el club
    const pendientes = new Set(Nube.estado.cola.map((x) => x.id));
    for (const [coleccion, tabla] of Object.entries(Nube.TABLAS)) {
      const { data, error } = await Nube.cliente.from(tabla).select('*');
      if (error) throw error;
      const deLaNube = data.map((f) => Nube.aLocal(coleccion, f));
      // Se conserva tal cual lo que aún no se ha subido desde este móvil:
      // cambios en cola y datos que nunca llegaron a la nube
      const locales = DB.lista(coleccion).filter((x) => !x.ejemplo && (pendientes.has(x.id) || !x.nube));
      const ids = new Set(locales.map((x) => x.id));
      DB.reemplazar(coleccion, deLaNube.filter((x) => !ids.has(x.id)).concat(locales));
    }
    Nube.estado.ultimaSync = new Date().toISOString();
    Nube.guardarEstado();
  },

  // Sube lo pendiente y baja lo último. Repinta la pantalla al acabar.
  async sincronizar({ avisar = false } = {}) {
    if (!Nube.conectado() || Nube.sincronizando) return;
    if (!navigator.onLine) { if (avisar) UI.aviso('Sin conexión: se sincronizará al volver internet', 'error'); return; }
    Nube.sincronizando = true;
    try {
      await Nube.procesarCola();
      await Nube.descargar();
      if (avisar) UI.aviso('Sincronizado con la nube');
      if (!document.querySelector('#modal-capa:not([hidden])')) App.refrescar();
    } catch (e) {
      console.warn('Error al sincronizar', e);
      if (avisar) UI.aviso('No se pudo sincronizar: ' + Nube.traducir(e), 'error');
    } finally {
      Nube.sincronizando = false;
    }
  },

  /* ---------- SUBIR DATOS QUE YA TENÍAS EN ESTE MÓVIL ----------
     Lo creado antes de usar la nube tiene identificadores antiguos;
     los cambiamos por UUID (también en todas las referencias) y lo
     ponemos en la cola. Los datos de ejemplo no se suben. */
  locales() {
    const pendientes = new Set(Nube.estado.cola.map((x) => x.id));
    return Object.keys(Nube.TABLAS).flatMap((c) => DB.lista(c).filter((x) => !x.ejemplo && !x.nube && !pendientes.has(x.id)).map((x) => ({ c, x })));
  },
  async subirLocales() {
    const items = Nube.locales();
    const cambios = {};
    items.forEach(({ x }) => { if (!UI.esUuid(x.id)) cambios[x.id] = UI.id(); });
    const cambiar = (obj) => {
      let texto = JSON.stringify(obj);
      Object.entries(cambios).forEach(([viejo, nuevo]) => { texto = texto.split(`"${viejo}"`).join(`"${nuevo}"`); });
      return JSON.parse(texto);
    };
    // Las referencias (asistencia, convocados, estadísticas…) pueden estar en cualquier colección
    if (Object.keys(cambios).length) {
      Object.keys(Nube.TABLAS).forEach((c) => DB.reemplazar(c, DB.lista(c).filter((x) => !x.ejemplo).map(cambiar)));
    }
    items.forEach(({ c, x }) => Nube.estado.cola.push({ coleccion: c, tipo: 'guardar', id: cambios[x.id] || x.id }));
    Nube.guardarEstado();
    await Nube.sincronizar({ avisar: true });
    return items.length;
  },

  /* ---------- FUNCIONES DE LA DIRECTIVA (requieren internet) ---------- */
  async club() {
    await Nube.conectar();
    const [perfiles, equipos, asignaciones] = await Promise.all([
      Nube.cliente.from('perfiles').select('*').order('creado'),
      Nube.cliente.from('equipos').select('*').order('categoria'),
      Nube.cliente.from('equipo_entrenadores').select('*'),
    ]);
    const error = perfiles.error || equipos.error || asignaciones.error;
    if (error) throw error;
    return { perfiles: perfiles.data, equipos: equipos.data, asignaciones: asignaciones.data };
  },
  async consulta(promesa) {
    const { error } = await promesa;
    if (error) throw new Error(Nube.traducir(error));
  },
  borrarEquipo(id) { return Nube.consulta(Nube.cliente.from('equipos').delete().eq('id', id)); },
  asignar(equipo_id, entrenador_id) { return Nube.consulta(Nube.cliente.from('equipo_entrenadores').insert({ equipo_id, entrenador_id })); },
  quitar(equipo_id, entrenador_id) { return Nube.consulta(Nube.cliente.from('equipo_entrenadores').delete().eq('equipo_id', equipo_id).eq('entrenador_id', entrenador_id)); },
  cambiarRol(usuario, nuevo_rol) { return Nube.consulta(Nube.cliente.rpc('cambiar_rol', { usuario, nuevo_rol })); },
  cambiarNombre(nombre) { return Nube.consulta(Nube.cliente.from('perfiles').update({ nombre }).eq('id', Nube.usuarioId())); },
};
