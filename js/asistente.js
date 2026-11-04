/* =============================================================
   ASISTENTE.JS · Fase 5: el "cerebro" del asistente
   -------------------------------------------------------------
   No usa internet ni inteligencia artificial: funciona con REGLAS
   y PLANTILLAS de texto escritas a mano. Por eso es gratis, rápido
   y funciona sin conexión.

   1. Asistente.generarSesion(): propone un entrenamiento completo
      (5 bloques) eligiendo ejercicios de la biblioteca.
      Asistente.otroEjercicio(): cambia el ejercicio de un bloque.
   2. Asistente.resumenPartido(): redacta la crónica de un partido
      a partir de sus estadísticas.
   ============================================================= */

const Asistente = (() => {
  /* ---------- 1. GENERADOR DE SESIONES ---------- */

  // Qué parte del tiempo va a cada bloque según la edad:
  // los pequeños, más juego; los mayores, más táctica.
  const REPARTOS = {
    pequenos: { calentamiento: 0.15, tecnica: 0.3, tactica: 0.1, juego: 0.35, vuelta: 0.1 },
    medianos: { calentamiento: 0.15, tecnica: 0.25, tactica: 0.2, juego: 0.3, vuelta: 0.1 },
    mayores: { calentamiento: 0.15, tecnica: 0.2, tactica: 0.3, juego: 0.25, vuelta: 0.1 },
  };
  const grupoEdad = (categoria) => (['prebenjamin', 'benjamin'].includes(categoria) ? 'pequenos'
    : ['alevin', 'infantil'].includes(categoria) ? 'medianos' : 'mayores');

  // Espacio habitual según la modalidad del equipo
  const ESPACIO = { 7: 'Medio campo de fútbol 7', 8: 'Medio campo de fútbol 8', 11: 'Medio campo de fútbol 11' };

  // Consigna que se añade a la técnica cuando se trabaja la pierna mala
  const CONSIGNA_PIERNA = 'Hoy, con la pierna mala: los diestros golpean y controlan con la izquierda; los zurdos, con la derecha';

  // Objetivos "primos": si no hay ejercicio exacto, estos también ayudan
  const RELACIONADOS = {
    pase: ['control', 'posesion'], control: ['pase'], conduccion: ['regate', 'coordinacion'],
    regate: ['conduccion', 'finalizacion'], finalizacion: ['regate', 'centros'], presion: ['transicion', 'defensa'],
    defensa: ['presion', 'balon-parado'], posesion: ['pase', 'salida'], transicion: ['presion', 'velocidad'],
    salida: ['posesion', 'pase'], centros: ['finalizacion', 'pase'], 'balon-parado': ['defensa', 'finalizacion'],
    coordinacion: ['velocidad', 'conduccion'], velocidad: ['coordinacion', 'transicion'],
  };

  // Puntos clave que el entrenador debe corregir según el objetivo
  const PUNTOS_CLAVE = {
    pase: ['Pase tenso y a ras de suelo', 'Golpear con el interior, tobillo firme', 'Mirar antes de recibir', 'Pasar al pie bueno del compañero'],
    control: ['Orientar el control hacia el espacio libre', 'Amortiguar con la superficie adecuada', 'Perfilarse antes de recibir'],
    conduccion: ['Balón cerca del pie en espacios reducidos', 'Levantar la cabeza', 'Usar las dos piernas'],
    regate: ['Cambio de ritmo tras la finta', 'Encarar al defensor', 'Proteger el balón con el cuerpo'],
    finalizacion: ['Mirar al portero antes de golpear', 'Elegir precisión antes que fuerza', 'Atacar el rechace'],
    presion: ['Presionar en grupo, no solo', 'Orientar al rival hacia la banda', 'Cerrar líneas de pase', 'Reaccionar rápido tras pérdida'],
    defensa: ['Perfil defensivo: no ponerse de frente', 'Temporizar, no tirarse al suelo', 'Comunicación y coberturas'],
    posesion: ['Ofrecer apoyos constantes', 'Amplitud y profundidad', 'Paciencia: no perder el balón por precipitarse'],
    transicion: ['Los primeros 5 segundos tras robar o perder son clave', 'Atacar rápido el espacio', 'Repliegue por dentro'],
    salida: ['Portero como un jugador más', 'Defensas abiertos', 'Si presionan, buscar al hombre libre'],
    centros: ['Levantar la cabeza antes de centrar', 'Llegadas al primer y segundo palo', 'Centro tenso entre portero y defensas'],
    'balon-parado': ['Cada uno conoce su función', 'Atacar el balón en el punto más alto', 'Vigilar el rechace'],
    coordinacion: ['Apoyos activos, sobre la punta del pie', 'Calidad antes que velocidad', 'Coordinar brazos y piernas'],
    velocidad: ['Pausas completas entre repeticiones', 'Salidas explosivas', 'Calidad máxima, pocas repeticiones'],
  };

  // Consejos según la edad
  const CONSEJOS_EDAD = {
    prebenjamin: ['A esta edad, el juego es el método: mucho balón y poca explicación.', 'Explicaciones de menos de 30 segundos y con demostración.', 'Muchos balones: cada niño debería tocarlo constantemente.'],
    benjamin: ['Prioriza la técnica individual con juegos competitivos.', 'Grupos pequeños para que todos participen.', 'Refuerza en positivo cada intento.'],
    alevin: ['Edad de oro del aprendizaje técnico: aprovecha para corregir gestos.', 'Introduce conceptos tácticos sencillos (apoyos, amplitud).', 'Haz preguntas: «¿dónde estaba el compañero libre?»'],
    infantil: ['Cambios físicos por la pubertad: cuida las cargas y la coordinación.', 'Ya entienden el juego colectivo: trabaja principios tácticos.', 'Fomenta la responsabilidad y el liderazgo.'],
    cadete: ['Combina intensidad con contenido táctico.', 'Trabaja la toma de decisiones bajo presión.', 'Implícales en el análisis del rival.'],
    juvenil: ['Sesiones con intensidad de partido.', 'Táctica colectiva y estrategia.', 'Prepara la transición al fútbol aficionado.'],
    regional: ['Ajusta la carga a la competición del fin de semana.', 'Detalle táctico y balón parado.', 'Gestiona descansos y molestias.'],
  };

  // Carga recomendada según la edad
  const CARGA_EDAD = {
    prebenjamin: 'Juego continuo con pausas para beber cada 15 minutos. Nada de correr sin balón.',
    benjamin: 'Intensidad moderada y mucho balón. Pausas breves entre juegos.',
    alevin: 'Intensidad moderada-alta en juegos reducidos, con series cortas.',
    infantil: 'Controla la carga por el estirón: calidad antes que cantidad.',
    cadete: 'Intensidad alta en tareas cortas. Fuerza con el propio peso.',
    juvenil: 'Intensidad de partido. Más carga a mitad de semana que el día antes del partido.',
    regional: 'Carga alta a mitad de semana y activación suave el día antes del partido.',
  };

  // Generador de números con semilla (para que cada propuesta sea distinta)
  function azarCon(semilla) {
    let s = semilla % 2147483647 || 1;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  // Puntuación de un ejercicio según lo que pide el entrenador
  function puntuar(e, { objetivo, objetivo2, foco, estilos = [] }, parte) {
    const objs = e.objetivos || [];
    let p = 1;
    if (objs[0] === objetivo) p += 12;
    else if (objs.includes(objetivo)) p += 9;
    else if ((RELACIONADOS[objetivo] || []).some((r) => objs.includes(r))) p += 4;
    if (objetivo2 && objs.includes(objetivo2)) p += 5;
    const principal = parte === 'tactica' || parte === 'juego';
    if (foco && principal && objs.includes(foco)) p += 10;
    if (estilos.length && principal) p += 8 * (e.contra || []).filter((c) => estilos.includes(c)).length;
    return p;
  }

  // Minutos de cada bloque (múltiplos de 5; el juego reducido se queda el resto)
  function minutosBloques(categoria, total) {
    const r = REPARTOS[grupoEdad(categoria)];
    const m = {};
    let asignado = 0;
    ['calentamiento', 'tecnica', 'tactica', 'vuelta'].forEach((p) => { m[p] = Math.max(5, Math.round((total * r[p]) / 5) * 5); asignado += m[p]; });
    m.juego = Math.max(5, total - asignado);
    return m;
  }

  // Convierte un ejercicio en un bloque de la sesión. Copiamos su contenido:
  // así el entrenador puede editarlo en SU sesión sin cambiar la biblioteca.
  function bloqueDe(e, parte, minutos) {
    if (!e) return { parte, minutos, ejercicioId: null, nombre: '', descripcion: '', reglas: [], variantes: [], consignas: [], material: '', espacio: '' };
    return {
      parte, minutos, ejercicioId: e.id, nombre: e.nombre, descripcion: e.descripcion || '',
      reglas: [...(e.reglas || [])], variantes: [...(e.variantes || [])], consignas: [...(e.consignas || [])],
      material: e.material || '', espacio: e.espacio || '',
    };
  }

  // Ejercicios posibles para un bloque, del más adecuado al menos
  function candidatos(categoria, parte, opciones, azar) {
    return Biblioteca.para(categoria, parte)
      .map((e) => ({ e, nota: puntuar(e, opciones, parte) + azar() * 3 }))
      .sort((a, b) => b.nota - a.nota)
      .map((x) => x.e);
  }

  // Junta el material de todos los bloques sin repetir.
  // Para comparar quitamos cantidades y plurales: "4 conos", "Conos" y "cono" son lo mismo.
  function juntarMaterial(bloques) {
    const sinCantidad = (x) => x.replace(/^(\d+(-\d+)?|un|una|unos|unas)\s+/i, '').replace(/\s+(por|cada)\s+.*$/i, '').replace(/\s*\(.*\)$/, '').trim();
    // Cada palabra en singular: "conos para 3 zonas" → "cono para 3 zona"
    const clave = (x) => UI.normalizar(sinCantidad(x)).replace(/(es|s)\b/g, '');
    const vistos = new Map();
    bloques.forEach((b) => String(b.material || '').split(/,| y /).map((x) => x.trim())
      .filter((x) => x && !/^(ninguno|portero)$/i.test(x)).forEach((x) => {
        const k = clave(x);
        const texto = UI.mayuscula(sinCantidad(x));
        // Nos quedamos con la forma más larga ("Balones" mejor que "Balón")
        if (!vistos.has(k) || texto.length > vistos.get(k).length) vistos.set(k, texto);
      }));
    // Quitamos lo que ya está incluido en otro ("Petos" si ya hay "Petos de 3 colores")
    const claves = [...vistos.keys()];
    return claves.filter((k) => !claves.some((o) => o !== k && o.startsWith(k + ' '))).map((k) => vistos.get(k)).join(', ');
  }

  /* Genera una sesión completa.
     opciones: { categoria, duracion, modalidad, objetivo ('azar' o un objetivo),
                 objetivo2, foco, preparacionId, piernaMala, jugadores, semilla } */
  function generarSesion(op) {
    const azar = azarCon(op.semilla || 1);
    const categoria = op.categoria;
    const total = Number(op.duracion) || 75;
    let objetivo = op.objetivo;
    if (!objetivo || objetivo === 'azar') {
      const posibles = Biblioteca.objetivosPara(categoria);
      objetivo = posibles[Math.floor(azar() * posibles.length)]?.id || 'pase';
    }
    const prep = op.preparacionId ? DB.obtener('preparaciones', op.preparacionId) : null;
    const opciones = { objetivo, objetivo2: op.objetivo2 || '', foco: op.foco || '', estilos: prep?.estilos || [] };
    const minutos = minutosBloques(categoria, total);
    const usados = new Set();
    const bloques = Biblioteca.PARTES.map((p) => {
      const e = candidatos(categoria, p.id, opciones, azar).find((x) => !usados.has(x.id));
      if (e) usados.add(e.id);
      return bloqueDe(e, p.id, minutos[p.id]);
    });
    if (op.piernaMala) bloques.find((b) => b.parte === 'tecnica').consignas.unshift(CONSIGNA_PIERNA);
    return {
      titulo: Biblioteca.objetivo(objetivo).nombre + (prep ? ' · vs ' + prep.rival : ''),
      objetivo, objetivo2: opciones.objetivo2, foco: opciones.foco, preparacionId: prep?.id || null,
      material: juntarMaterial(bloques), espacio: ESPACIO[op.modalidad] || 'Medio campo',
      jugadores: op.jugadores || '', piernaMala: !!op.piernaMala, bloques,
    };
  }

  // "Otro ejercicio": cambia el de un bloque por el siguiente posible (va rotando).
  // Devuelve el bloque nuevo, o null si no hay alternativa.
  function otroEjercicio(sesion, indice) {
    const b = sesion.bloques[indice];
    const prep = sesion.preparacionId ? DB.obtener('preparaciones', sesion.preparacionId) : null;
    const opciones = { objetivo: sesion.objetivo, objetivo2: sesion.objetivo2, foco: sesion.foco, estilos: prep?.estilos || [] };
    const enUso = new Set(sesion.bloques.filter((x, i) => i !== indice).map((x) => x.ejercicioId).filter(Boolean));
    const libres = candidatos(sesion.categoria, b.parte, opciones, () => 0).filter((e) => !enUso.has(e.id));
    const pos = libres.findIndex((e) => e.id === b.ejercicioId);
    const siguiente = libres[(pos + 1) % libres.length];
    if (!siguiente || siguiente.id === b.ejercicioId) return null;
    const nuevo = bloqueDe(siguiente, b.parte, b.minutos);
    if (sesion.piernaMala && b.parte === 'tecnica') nuevo.consignas.unshift(CONSIGNA_PIERNA);
    return nuevo;
  }

  // Ayuda para la ficha: consejos y carga de la edad, puntos clave del objetivo
  function guia(categoria, objetivo) {
    return { consejos: CONSEJOS_EDAD[categoria] || [], carga: CARGA_EDAD[categoria] || '', puntosClave: PUNTOS_CLAVE[objetivo] || [] };
  }

  // Texto de la sesión para WhatsApp o para copiar (en WhatsApp, *texto* sale en negrita)
  function textoSesion(s, numero) {
    const eq = DB.obtener('equipos', s.equipoId);
    const total = s.bloques.reduce((t, b) => t + (Number(b.minutos) || 0), 0);
    const lista = (titulo, items) => (items?.length ? `${titulo}: ${items.join('; ')}\n` : '');
    let t = `⚽ *C.D. EL TRANVÍA${eq ? ' · ' + eq.nombre.toUpperCase() : ''}*\n`;
    t += `📋 *SESIÓN Nº ${numero}* · ${UI.mayuscula(UI.fechaLarga(s.fecha))}${s.hora ? ' · ' + s.hora : ''}\n`;
    t += `🎯 Objetivo: *${Biblioteca.objetivo(s.objetivo).nombre}*${s.objetivo2 ? ' · Secundario: ' + Biblioteca.objetivo(s.objetivo2).nombre : ''}\n`;
    t += `⏱️ ${total} min${s.jugadores ? ' · 👥 ' + UI.plural(Number(s.jugadores), 'jugador', 'jugadores') : ''}${s.espacio ? ' · 📍 ' + s.espacio : ''}\n`;
    if (s.material) t += `🎒 Material: ${s.material}\n`;
    if (s.piernaMala) t += `🦶 *Hoy, trabajo con la pierna mala*\n`;
    let grupo = '';
    let n = 0;
    s.bloques.forEach((b) => {
      const p = Biblioteca.parte(b.parte);
      if (p.grupo !== grupo) { grupo = p.grupo; n++; t += `\n*${n}. ${grupo.toUpperCase()}*\n`; }
      if (!b.nombre) return;
      t += `${p.grupo === 'Parte principal' ? '_' + p.nombre + '_ · ' : ''}*${b.nombre}* (${b.minutos}')\n`;
      if (b.descripcion) t += `${b.descripcion}\n`;
      t += lista('• Reglas', b.reglas) + lista('• Variantes', b.variantes) + lista('• Consignas', b.consignas);
    });
    return t.trim();
  }

  /* ---------- 2. RESUMEN AUTOMÁTICO DEL PARTIDO ---------- */

  // Elige una frase de una lista, siempre la misma para el mismo partido
  function elegir(lista, clave) {
    let h = 0;
    for (const c of String(clave)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return lista[h % lista.length];
  }

  // "Ana, Luis y Pedro"
  function enumerar(nombres) {
    if (nombres.length <= 1) return nombres.join('');
    return nombres.slice(0, -1).join(', ') + ' y ' + nombres[nombres.length - 1];
  }

  function resumenPartido(p) {
    if (!p.jugado) return null;
    const gf = Number(p.golesFavor) || 0, gc = Number(p.golesContra) || 0;
    const dif = gf - gc;
    const cat = DB.categoria(p.categoria).nombre;
    const donde = p.lugar === 'fuera' ? `en el campo de ${p.rival}` : `en casa ante ${p.rival}`;
    const filas = Object.entries(p.stats || {})
      .map(([id, s]) => ({ j: DB.obtener('jugadores', id), s }))
      .filter((x) => x.j);
    const nombre = (x) => x.j.nombre;
    const parrafos = [];

    // Titular y primer párrafo según el resultado
    let titular;
    if (dif >= 3) titular = elegir(['Exhibición del Tranvía', 'Goleada con sello del Tranvía', 'Recital azul y rojo'], p.id);
    else if (dif > 0) titular = elegir(['Victoria trabajada', 'Tres puntos que valen oro', 'El Tranvía suma de tres'], p.id);
    else if (dif === 0) titular = elegir(['Reparto de puntos', 'Empate con lecciones', 'Tablas en el marcador'], p.id);
    else if (dif >= -2) titular = elegir(['Derrota por la mínima', 'Se escapó el partido', 'Tropiezo para aprender'], p.id);
    else titular = elegir(['Día para aprender', 'Partido duro ante un buen rival'], p.id);

    const inicio = dif > 0
      ? `El ${cat} del C.D. El Tranvía se impuso por ${gf}-${gc} ${donde}.`
      : dif === 0 ? `El ${cat} del C.D. El Tranvía empató a ${gf} ${donde}.`
        : `El ${cat} del C.D. El Tranvía cayó por ${gf}-${gc} ${donde}.`;
    const tono = dif >= 3 ? 'El equipo fue superior de principio a fin y lo reflejó en el marcador.'
      : dif > 0 ? 'Un partido competido en el que el equipo supo sufrir y aprovechar sus ocasiones.'
        : dif === 0 ? 'Partido igualado en el que ninguno de los dos equipos logró imponerse.'
          : dif >= -2 ? 'El equipo compitió, pero no pudo darle la vuelta al marcador.'
            : 'El rival fue mejor, y de estos partidos también se aprende.';
    parrafos.push(`${inicio} ${tono}`);

    // Goles y asistencias
    const goleadores = filas.filter((x) => x.s.goles > 0).sort((a, b) => b.s.goles - a.s.goles);
    const asistentes = filas.filter((x) => x.s.asistencias > 0).sort((a, b) => b.s.asistencias - a.s.asistencias);
    if (gf > 0 && goleadores.length) {
      const lista = goleadores.map((x) => nombre(x) + (x.s.goles > 1 ? ` (${x.s.goles})` : ''));
      let t = `Los goles del Tranvía llevaron la firma de ${enumerar(lista)}.`;
      if (goleadores.length === 1) t = `${nombre(goleadores[0])} firmó ${goleadores[0].s.goles > 1 ? `los ${goleadores[0].s.goles} goles` : 'el gol'} del equipo.`;
      const triplete = goleadores.find((x) => x.s.goles >= 3);
      if (triplete) t += ` Mención especial para ${nombre(triplete)}, que se fue a casa con ${triplete.s.goles === 3 ? 'un hat-trick' : triplete.s.goles + ' goles'}.`;
      if (asistentes.length) t += ` En la creación ${asistentes.length > 1 ? 'destacaron' : 'destacó'} ${enumerar(asistentes.slice(0, 2).map((x) => nombre(x) + (x.s.asistencias > 1 ? ` (${x.s.asistencias} asistencias)` : '')))}.`;
      parrafos.push(t);
    } else if (gf === 0) {
      parrafos.push('El equipo no consiguió ver puerta: toca seguir trabajando la finalización.');
    }

    // Jugador destacado: goles x3 + asistencias x2 + minutos / 30
    const mvp = [...filas].sort((a, b) =>
      (b.s.goles * 3 + b.s.asistencias * 2 + (b.s.minutos || 0) / 30) - (a.s.goles * 3 + a.s.asistencias * 2 + (a.s.minutos || 0) / 30))[0];
    if (mvp && (mvp.s.goles + mvp.s.asistencias) > 0) parrafos.push(`⭐ Jugador destacado: ${nombre(mvp)}.`);

    // Minutos repartidos (importante en fútbol base)
    const conMinutos = filas.filter((x) => x.s.minutos > 0);
    const sinMinutos = (p.convocados || []).map((id) => DB.obtener('jugadores', id)).filter((j) => j && !(p.stats?.[j.id]?.minutos > 0));
    if (conMinutos.length) {
      const media = Math.round(conMinutos.reduce((t, x) => t + x.s.minutos, 0) / conMinutos.length);
      parrafos.push(`Participaron ${conMinutos.length} jugadores, con una media de ${media} minutos.` +
        (sinMinutos.length ? ` Se quedaron sin minutos: ${enumerar(sinMinutos.map((j) => j.nombre))}.` : ' Todos los convocados tuvieron minutos. 👏'));
    }

    // Tarjetas
    const amarillas = filas.filter((x) => x.s.amarillas > 0);
    const rojas = filas.filter((x) => x.s.rojas > 0);
    if (!amarillas.length && !rojas.length) parrafos.push('Partido limpio: ninguna tarjeta para el Tranvía.');
    else {
      let t = '';
      if (amarillas.length) t += `Amarilla${amarillas.length > 1 ? 's' : ''} para ${enumerar(amarillas.map(nombre))}. `;
      if (rojas.length) t += `Roja para ${enumerar(rojas.map(nombre))}: hay que trabajar el control de las emociones.`;
      parrafos.push(t.trim());
    }

    // Coherencia: goles apuntados vs resultado
    const golesApuntados = filas.reduce((t, x) => t + (x.s.goles || 0), 0);
    const aviso = golesApuntados !== gf ? `Ojo: hay ${golesApuntados} goles apuntados a jugadores y el marcador dice ${gf}${golesApuntados < gf ? ' (¿algún gol en propia puerta del rival?)' : ''}.` : null;

    // Siguiente partido
    const siguiente = Partidos.lista(p.equipoId).find((x) => !x.jugado && x.fecha > p.fecha);
    if (siguiente) parrafos.push(`Próxima cita: ${UI.fechaCorta(siguiente.fecha)} ante ${siguiente.rival}. ¡Vamos Tranvía! 🔴🔵`);
    else parrafos.push('¡Vamos Tranvía! 🔴🔵');

    return { titular, parrafos, aviso };
  }

  // Versión en texto plano (para copiar o enviar por WhatsApp)
  function textoResumen(p) {
    const r = resumenPartido(p);
    if (!r) return '';
    return `*${r.titular.toUpperCase()}*\n${DB.categoria(p.categoria).nombre} · C.D. El Tranvía ${p.golesFavor}-${p.golesContra} ${p.rival}\n\n${r.parrafos.join('\n\n')}`;
  }

  return { generarSesion, otroEjercicio, guia, textoSesion, resumenPartido, textoResumen, CONSIGNA_PIERNA };
})();
