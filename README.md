# C.D. El Tranvía · App de entrenadores

App web (PWA) para los entrenadores del fútbol base del C.D. El Tranvía (Santa Cruz de Tenerife): plantilla, entrenamientos, partidos, evolución de cada jugador y un asistente que propone sesiones y redacta crónicas.

Está hecha con **HTML, CSS y JavaScript**, sin frameworks. La única librería externa es `supabase-js` (la oficial de Supabase), para las cuentas y la nube. Funciona sin internet: los datos se guardan en el navegador y se sincronizan con la nube del club.

---

## 1. Cómo está organizada por dentro

```
index.html            El esqueleto: cabecera, menú inferior y zona central.
manifest.json         Datos para instalarla como app (nombre, iconos, colores).
sw.js                 "Service worker": guarda la app para usarla sin internet.
netlify.toml          Configuración para publicarla en Netlify.
servidor.py           Mini servidor para probarla en tu PC.

css/styles.css        Todo el aspecto: colores del escudo, modo oscuro, tarjetas…

js/ui.js              Herramientas comunes: ventanas, avisos, fechas, compartir.
js/db.js              El almacén de datos (localStorage). Todo pasa por aquí.
js/graficos.js        Gráficos dibujados a mano en SVG (radar, líneas, barras).
js/ejercicios.js      Biblioteca de 44 ejercicios por edad, parte y objetivo.
js/datos-ejemplo.js   Datos inventados para probar (se pueden borrar).
js/asistente.js       El "cerebro" del asistente (reglas y plantillas).
js/ia.js              Conexión con una IA real · preparada, DESACTIVADA.
js/nube.js            Conexión con Supabase: cuentas y sincronización (Fase 6).
js/vistas/cuenta.js   Pantalla de acceso, panel del club y estado de la cuenta.
js/app.js             El arranque y el "router" (qué pantalla mostrar).

js/vistas/            Una pieza por cada pantalla:
  inicio.js           Resumen del club.
  plantilla.js        Lista de jugadores y ficha.            (Fase 1)
  entrenos.js         Sesiones, ejercicios, rival y asistencia. (Fase 2)
  partidos.js         Partidos, calendario, convocatorias, estadísticas. (Fase 3)
  pizarra.js          Alineación arrastrando jugadores.      (Fase 3)
  evolucion.js        Historial, notas privadas e informe.   (Fase 4)
  asistente.js        Generador de sesiones y crónicas.      (Fase 5)
  ajustes.js          Tema, copia de seguridad, datos de ejemplo.

supabase/esquema.sql  Base de datos en la nube con seguridad por filas (Fase 6).
preparado/            Plantillas que NO se publican (intermediario de la IA).
assets/icons/         Escudo e iconos de la app, generados del escudo original.
```

**Cómo funciona una pantalla**, en tres ideas:

1. La dirección termina en algo como `#/jugador/abc123`. El *router* (`app.js`) lee eso y llama a `Vistas.jugador.pintar('abc123')`.
2. `pintar()` devuelve el HTML de la pantalla como texto, usando los datos de `DB`.
3. Los botones llevan `data-accion="nombre"`. Al pulsarlos, se ejecuta `Acciones['nombre']`, que cambia los datos con `DB` y repinta.

## 2. Cómo probarla en tu PC

1. Abre una terminal en esta carpeta (en el Explorador: clic derecho → *Abrir en Terminal*).
2. Ejecuta:
   ```
   python servidor.py
   ```
3. Abre en el navegador **http://localhost:8080**
4. Para pararlo, pulsa `Ctrl + C` en la terminal.

> Puedes abrir `index.html` con doble clic y casi todo funciona, pero el modo sin internet y la instalación necesitan el servidor.

## 3. Publicarla gratis en Netlify

**Opción fácil (arrastrar y soltar):**
1. Entra en https://app.netlify.com y crea una cuenta gratuita.
2. Ve a *Sites* → *Add new site* → *Deploy manually*.
3. Arrastra **la carpeta entera** del proyecto a la zona indicada.
4. En unos segundos tendrás una dirección tipo `https://nombre-raro.netlify.app`.
5. En *Site configuration* → *Change site name* puedes ponerle, por ejemplo, `cd-el-tranvia`.

**Opción recomendada (con GitHub, se actualiza sola):**
1. Crea una cuenta en https://github.com y un repositorio vacío (privado).
2. Sube el proyecto: `git remote add origin <dirección>` y `git push -u origin main`.
3. En Netlify: *Add new site* → *Import an existing project* → GitHub → elige el repositorio.
4. Deja *Build command* vacío y *Publish directory* en `.` → *Deploy*.
5. Cada vez que hagas `git push`, Netlify publica la nueva versión.

> Al cambiar archivos, sube el número de `VERSION` en `sw.js` para que los móviles descarguen lo nuevo.

## 4. Instalarla en el móvil

- **Android (Chrome):** abre la dirección de Netlify → menú ⋮ → *Instalar aplicación* (o *Añadir a pantalla de inicio*).
- **iPhone (Safari):** abre la dirección → botón *Compartir* → *Añadir a pantalla de inicio*.

Aparecerá el escudo del club como icono y se abrirá a pantalla completa, también sin conexión.

**Con la fase 6 activa**, cada entrenador entra con su cuenta y sus datos se sincronizan entre dispositivos. La copia de seguridad sigue disponible en *Ajustes*.

## 5. Todo el club en la nube (fase 6)

La app usa **Supabase** (plan gratuito, servidores en Irlanda). La seguridad está en la propia base de datos (`supabase/esquema.sql`): cada entrenador solo recibe los datos de sus equipos y la directiva, todos.

**Cómo se usa:**
1. Cada entrenador abre la app y pulsa *Crear cuenta* (email y contraseña). Supabase le envía un email para confirmarla.
2. Su cuenta queda **pendiente**: no ve nada hasta que la directiva le asigna un equipo.
3. La directiva entra en *Ajustes → Panel del club*: crea los equipos (ej.: «Alevín A»), asigna entrenadores y puede nombrar a otros directivos.
4. La app funciona igual sin internet: los cambios esperan en una cola y se envían al volver la conexión.

**Límite a tener en cuenta:** en la app se trabaja por categoría. Si un entrenador lleva dos equipos de la *misma* categoría (Alevín A y Alevín B), lo nuevo que cree se guarda en el primero.

**Configuración pendiente en Supabase** (*Authentication → URL Configuration*): pon en *Site URL* la dirección de Netlify y añade `http://localhost:8080` en *Redirect URLs*, para que el enlace del email de confirmación vuelva a la app.

## 6. Privacidad

Los jugadores son menores: la app solo guarda nombre de pila o mote, categoría, edad, altura, peso, posición y dorsal. No guardes apellidos, DNI, direcciones, teléfonos ni fotos. Los datos se guardan en el dispositivo y en la nube del club (servidores en la UE), con acceso restringido por equipo. Las notas privadas las ven los entrenadores del equipo y la directiva.
