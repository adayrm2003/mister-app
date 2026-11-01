/* =============================================================
   NUBE.JS · Fase 6: todo el club en la nube (PREPARADA, NO ACTIVA)
   -------------------------------------------------------------
   Hoy los datos viven solo en el navegador (db.js). Cuando se
   active la fase 6, este archivo conectará con Supabase (base de
   datos gratuita en la nube) para que:
     · cada entrenador entre con su cuenta y vea solo su equipo,
     · la directiva vea todo el club,
     · los datos no se pierdan si cambias de móvil.

   La seguridad la pone la base de datos (supabase/esquema.sql),
   no la app: aunque alguien manipule el código, Supabase solo le
   entrega las filas de sus equipos.

   QUÉ FALTA PARA ACTIVARLA (lo haremos juntos cuando confirmes):
   1. Crear el proyecto en supabase.com y ejecutar esquema.sql.
   2. Poner aquí la URL del proyecto y la clave PÚBLICA ("anon" o
      "publishable"). Esa clave sí puede ir en la app: sin sesión
      iniciada no da acceso a nada gracias a las reglas RLS.
      ⚠️ La clave "service_role" / "secret" NUNCA va aquí.
   3. Cambiar activa a true y completar la sincronización.
   ============================================================= */

const Nube = {
  config: {
    activa: false,  // <- desactivada hasta que lo confirmes
    url: '',        // ej.: https://xxxxxxxx.supabase.co
    clavePublica: '',
  },
  cliente: null,
  usuario: null,

  disponible() {
    return Nube.config.activa && Nube.config.url && Nube.config.clavePublica;
  },

  /* Carga la librería oficial de Supabase SOLO si la nube está activa.
     (Es la única librería externa que haría falta: gestiona el inicio
     de sesión y las peticiones seguras a la base de datos.) */
  async conectar() {
    if (!Nube.disponible()) throw new Error('La nube no está activada');
    if (!window.supabase) {
      await new Promise((ok, error) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
        s.onload = ok; s.onerror = () => error(new Error('No se pudo cargar Supabase'));
        document.head.appendChild(s);
      });
    }
    Nube.cliente = window.supabase.createClient(Nube.config.url, Nube.config.clavePublica);
    const { data } = await Nube.cliente.auth.getUser();
    Nube.usuario = data?.user || null;
    return Nube.cliente;
  },

  // Iniciar y cerrar sesión (email y contraseña de cada entrenador)
  async entrar(email, contrasena) {
    await Nube.conectar();
    const { data, error } = await Nube.cliente.auth.signInWithPassword({ email, password: contrasena });
    if (error) throw error;
    Nube.usuario = data.user;
    return data.user;
  },
  async salir() {
    if (Nube.cliente) await Nube.cliente.auth.signOut();
    Nube.usuario = null;
  },

  // Perfil y equipos del usuario conectado (RLS filtra automáticamente)
  async miPerfil() {
    const { data, error } = await Nube.cliente.from('perfiles').select('*').eq('id', Nube.usuario.id).single();
    if (error) throw error;
    return data;
  },
  async misEquipos() {
    const { data, error } = await Nube.cliente.from('equipos').select('*').order('categoria');
    if (error) throw error;
    return data;
  },

  /* PENDIENTE (al activar): sincronizar db.js con estas tablas.
     Plan previsto:
       - Al iniciar sesión: descargar jugadores, sesiones, partidos…
         de mis equipos y guardarlos en el navegador (para seguir
         funcionando sin internet).
       - Al guardar algo: guardarlo en el navegador y enviarlo a la
         nube; si no hay conexión, dejarlo en una cola y reenviarlo
         al recuperar la conexión. */
};

/* ---------- ESTADO EN AJUSTES ---------- */
(Vistas.ajustes.extras = Vistas.ajustes.extras || []).push(() => `
  <section class="tarjeta">
    <div class="parte-cab">
      <div class="icono-parte" style="--c:var(--azul)">${UI.icono('nube')}</div>
      <div style="flex:1"><h2>Todo el club en la nube</h2><span class="texto-suave peq">${Nube.disponible() ? 'Activada' : 'Preparada, pendiente de activar'}</span></div>
      <span class="etiqueta ${Nube.disponible() ? 'verde' : 'gris'}">${Nube.disponible() ? 'ON' : 'OFF'}</span>
    </div>
    <p class="texto-suave peq mt">Cuentas para cada entrenador (solo ven su equipo) y para la directiva (ve todo), con los datos guardados en la nube de forma segura. Requiere crear un proyecto gratuito en Supabase.</p>
  </section>`);
