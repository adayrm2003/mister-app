# Míster

App para entrenadores de fútbol (fútbol 7, 8 y 11): plantilla, alineaciones con hoja para el vestuario,
ejercicios con pizarra animada, sesiones con modo campo, calendario con lista de asistencia, partidos
(goles, cambios, tarjetas, minutos y anotaciones) y estadísticas de temporada.
Se instala en el móvil desde el navegador («Añadir a pantalla de inicio»).

## Probarla en el ordenador
1. `npm install` (solo la primera vez)
2. `npm run dev` y abrir http://localhost:5173

Sin Supabase funciona en **modo prueba**: las cuentas y los datos se guardan solo en ese navegador.

## Conectarla a Supabase (cuentas y datos en la nube)
1. Crea el proyecto en supabase.com (región West EU).
2. **SQL Editor → New query**: pega **todo** el archivo `supabase/esquema.sql` y pulsa **Run**.
   Crea las tablas y la seguridad por filas. Se puede ejecutar otra vez sin romper nada.
3. **Authentication → Sign In / Providers → Email**: deja activado *Confirm email*.
4. **Authentication → URL Configuration**:
   - *Site URL*: la dirección de la app (por ejemplo `https://mister-club.netlify.app`).
   - *Redirect URLs*: añade `https://TU-DIRECCION/nueva-contrasena`.
5. Copia la **Project URL** y la clave **anon / publishable** (Project Settings → API).
   - En tu ordenador: copia `.env.example` como `.env` y pégalas ahí.
   - En Netlify: Site settings → Environment variables → `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
   Nunca uses la clave *service_role*.

## Publicarla en Netlify
- Netlify compila solo con `npm run build` y publica la carpeta `dist` (ya está en `netlify.toml`).
- El proyecto nuevo está en la rama `app-mister`: o la unes a `main`, o en Netlify eliges esa rama
  en Site settings → Build & deploy → Branches.

## Cómo se usa
- **Directiva**: se registra como «Directiva», crea los equipos (nombre libre y fútbol 7, 8 u 11) y asigna
  a cada entrenador con su correo.
- **Entrenador**: se registra como «Entrenador» con ese mismo correo y ve sus equipos.
  Si aún no tiene ninguno, la app se lo dice.

## Estructura
- `src/datos/` — modelo de datos, cálculos (minutos, estadísticas) y guardado (`local.ts` modo prueba, `nube.ts` Supabase)
- `src/pantallas/` — pantallas de la app
- `src/componentes/` — campo, pizarra, iconos, hojas y controles
- `src/pdf/` — hoja de alineación y PDF de sesión
- `supabase/esquema.sql` — tablas y seguridad por filas
