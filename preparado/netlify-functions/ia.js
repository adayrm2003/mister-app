/* =============================================================
   PLANTILLA (NO ACTIVA) · Intermediario con la IA en Netlify
   -------------------------------------------------------------
   Este archivo NO se usa todavía. Está en la carpeta "preparado"
   precisamente para que Netlify no lo publique.

   Para activarlo, cópialo a netlify/functions/ia.js y crea en
   Netlify la variable secreta ANTHROPIC_API_KEY (ver js/ia.js).

   Se ejecuta en el servidor de Netlify, nunca en el móvil, así
   que la clave no la puede ver nadie.
   ============================================================= */

export default async (peticion) => {
  if (peticion.method !== 'POST') return new Response('Método no permitido', { status: 405 });

  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) return Response.json({ error: 'IA no configurada' }, { status: 503 });

  let cuerpo;
  try {
    cuerpo = await peticion.json();
  } catch {
    return Response.json({ error: 'Petición no válida' }, { status: 400 });
  }
  const { instrucciones = '', datos = {} } = cuerpo;
  // Limitamos el tamaño para evitar abusos (y costes)
  const contenido = `${instrucciones}\n\nDatos:\n${JSON.stringify(datos)}`.slice(0, 8000);

  const respuesta = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': clave,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5-5',
      max_tokens: 800,
      messages: [{ role: 'user', content: contenido }],
    }),
  });

  if (!respuesta.ok) return Response.json({ error: 'Error de la IA' }, { status: 502 });
  const json = await respuesta.json();
  const texto = (json.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  return Response.json({ texto });
};
