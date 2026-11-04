/* =============================================================
   IA.JS · Conexión con una IA real (PREPARADA, PERO DESACTIVADA)
   -------------------------------------------------------------
   Ahora mismo el asistente funciona con reglas (asistente.js).
   Este archivo deja listo el "enchufe" para, en el futuro, pedir
   a una IA real (por ejemplo Claude, de Anthropic) que mejore las
   sesiones o los resúmenes.

   ⚠️ REGLA DE ORO: la clave de la API NUNCA va en este archivo ni
   en ningún archivo de la app. Todo lo que hay aquí lo puede ver
   cualquiera que abra la web. La clave irá en un pequeño programa
   del servidor (una "Netlify Function") que hace de intermediario:

     móvil  ->  /.netlify/functions/ia  ->  API de la IA
                (aquí está la clave, en una variable secreta de Netlify)

   La plantilla de esa función está en: preparado/netlify-functions/ia.js

   PRIVACIDAD: si algún día se activa, envía solo lo imprescindible
   (estadísticas, iniciales) y evita mandar nombres de menores.

   PARA ACTIVARLA (cuando lo decidas):
   1. Copia preparado/netlify-functions/ia.js a netlify/functions/ia.js
   2. En Netlify > Site settings > Environment variables, crea
      ANTHROPIC_API_KEY con tu clave (tiene coste por uso).
   3. Cambia "activa: false" por "activa: true" aquí abajo.
   ============================================================= */

const IA = {
  config: {
    activa: false,                       // <- desactivada a propósito
    endpoint: '/.netlify/functions/ia',  // dirección del intermediario
    modelo: 'claude-sonnet-5-5',         // modelo que usaría el servidor
    tiempoMaximo: 20000,                 // milisegundos antes de rendirse
  },

  disponible() {
    return IA.config.activa && navigator.onLine;
  },

  /* Envía una petición a la IA y devuelve su respuesta en texto.
     Si está desactivada, avisa con un error controlado. */
  async preguntar(instrucciones, datos) {
    if (!IA.disponible()) throw new Error('La IA real no está activada');
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), IA.config.tiempoMaximo);
    try {
      const r = await fetch(IA.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelo: IA.config.modelo, instrucciones, datos }),
        signal: control.signal,
      });
      if (!r.ok) throw new Error('La IA respondió con un error ' + r.status);
      const json = await r.json();
      return json.texto;
    } finally {
      clearTimeout(reloj);
    }
  },

  /* Ejemplo de uso futuro: mejorar la redacción del resumen.
     Si la IA no está disponible, devolvemos el resumen por reglas. */
  async resumenMejorado(partido) {
    const base = Asistente.textoResumen(partido);
    if (!IA.disponible()) return base;
    try {
      return await IA.preguntar(
        'Eres el cronista de un club de fútbol base. Reescribe esta crónica con tono positivo y educativo, en español, sin inventar datos.',
        { cronica: base },
      );
    } catch (e) {
      console.warn('IA no disponible, uso el resumen por reglas', e);
      return base;
    }
  },
};
