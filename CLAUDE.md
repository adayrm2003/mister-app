# Míster — instrucciones para Claude

App web (PWA) en español para entrenadores de fútbol y la directiva de su club. El dueño es Aday,
que **no sabe programar**: explícale todo en lenguaje sencillo, sin jerga, y dile siempre cómo probar lo que cambies.

## Reglas de producto (no romperlas)
- Solo **fútbol 7, fútbol 8 y fútbol 11**. Nada de fútbol 5 ni modalidad "a mano".
- **Ningún nombre de categoría por edad** (Benjamín, Alevín, Infantil, Cadete, Juvenil…), ni como ejemplo, ni en placeholders, ni en datos de prueba. Usa "Equipo A", "Equipo B".
- Jugadores (son menores): solo nombre o mote, pierna buena, posición, dorsal y notas deportivas. Nunca edad, DNI, fotos, teléfono, dirección ni salud.
- Única excepción (la decidió Aday): **vídeos de análisis** del equipo. Solo los ven los entrenadores del equipo, hay que confirmar el permiso de las familias al subirlos y **se borran a los 30 días** (`src/datos/video.ts`, tabla `videos` y almacén privado `videos` en Supabase).
- Todo lo que se cuenta va **por jugador (id), nunca por dorsal**.
- **Antes de borrar cualquier cosa, pedir confirmación** en la app (`useUi().confirmar`).
- Regla de oro: si algo se puede hacer en 1 toque, que no lleve 3. Botones grandes, pensado para usar con una mano en el campo.
- Textos legales (`src/legal/textos.ts`): titular "Aday Román Martín", contacto adayrm.2003@gmail.com. **No poner DNI ni domicilio** (lo pidió expresamente).

## Diseño
- Identidad "césped, cal y peto": verde `--cesped`, naranja `--peto` solo para lo importante, fondo `--cal`.
  Letras Big Shoulders Display (títulos y dorsales) y Barlow (texto). Todo con variables CSS de `src/estilos.css`.
- Modo claro y oscuro: nunca colores sueltos, siempre variables.
- **Comprueba siempre en tamaño móvil (375 px)** antes de dar algo por terminado; que nada se salga por los lados.

## Cómo está hecho
- React 18 + TypeScript + Vite, PWA con vite-plugin-pwa, PDF con jsPDF, Supabase para cuentas y datos.
- `src/datos/` modelo y cálculos (`modelo.ts`, `partido.ts`, `estadisticas.ts`, `calendario.ts`, `pizarra.ts`, `sesion.ts`)
  y guardado: `api.ts` elige `nube.ts` (Supabase, si hay variables `VITE_SUPABASE_*`) o `local.ts` (modo prueba en el navegador).
- `src/ContextoEquipo.tsx`: equipo activo, ajustes, `useColeccion` (datos del equipo) y `useMios` (biblioteca del entrenador).
- `src/pantallas/`, `src/componentes/`, `src/pdf/`, `src/legal/`.
- Comprobar tipos: `npx tsc -p tsconfig.json`. Compilar: `npm run build`. Probar: `npm run dev` (http://localhost:5173).

## Supabase
- Proyecto "adayrm2003's Project", id `fnijrktglgfjokvyyoiv` (UE, Irlanda). Esquema completo en `supabase/esquema.sql`.
- Seguridad por filas en todas las tablas: el entrenador solo ve los equipos asignados a su correo; la directiva, su club.
- Si añades tablas o columnas: añádelas también a `supabase/esquema.sql` (con `if not exists`) y aplícalas con el conector de Supabase.
- **No borres tablas ni datos reales sin preguntar antes a Aday.**
- Las claves `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (publishable) son públicas; están en `.env` (no se sube) y en Netlify.

## Publicar
- Netlify, sitio `cd-el-tranvia` → https://cd-el-tranvia.netlify.app (id `75e13f2a-6017-47d2-9bf8-16392162a48d`).
- Netlify compila con `npm run build` y publica `dist` (ver `netlify.toml`).
- Publica solo cuando Aday lo pida. Sube una copia limpia de lo guardado en git (`git archive HEAD`), con el conector de Netlify.

## Cuentas de prueba
- En modo prueba (sin Supabase): `club@prueba.test` y `mister.dani@prueba.test`, contraseña `prueba1234`.
- No crees cuentas reales en Supabase para probar: usa transacciones que se deshacen al final.
