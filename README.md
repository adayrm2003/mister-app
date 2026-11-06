# Míster

App para entrenadores de fútbol: plantilla, ejercicios con pizarra, sesiones, calendario, partidos y alineaciones.
Se instala en el móvil desde el navegador (“Añadir a pantalla de inicio”).

## Probarla en el ordenador
1. `npm install` (solo la primera vez)
2. `npm run dev` y abrir http://localhost:5173

Sin Supabase funciona en **modo prueba**: las cuentas y los datos se guardan solo en ese navegador.

## Conectarla a Supabase
1. En Supabase: **SQL Editor → New query**, pegar `supabase/esquema.sql` y pulsar **Run**.
2. Copiar `.env.example` como `.env` y poner la **Project URL** y la clave **anon/publishable**
   (Project Settings → API). En Netlify, las mismas dos variables en Site settings → Environment variables.
3. En Supabase, **Authentication → URL Configuration**: poner la dirección de la app en *Site URL*
   y añadir `https://TU-DIRECCION/nueva-contrasena` en *Redirect URLs*.
4. Dejar activado **Confirm email** (Authentication → Sign In / Providers → Email).

## Estructura
- `src/datos/` — cuentas y datos (`local.ts` modo prueba, `nube.ts` Supabase)
- `src/pantallas/` — pantallas de la app
- `src/componentes/` — iconos, hojas, confirmaciones
- `supabase/esquema.sql` — tablas y seguridad por filas
