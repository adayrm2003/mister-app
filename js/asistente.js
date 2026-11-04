/* =============================================================
   ASISTENTE.JS · Fase 5: el "cerebro" del asistente
   -------------------------------------------------------------
   No usa internet ni inteligencia artificial: funciona con REGLAS
   y PLANTILLAS de texto escritas a mano. Por eso es gratis, rápido
   y funciona sin conexión.

   1. Asistente.generarSesion(): propone un entrenamiento completo
      eligiendo ejercicios de la biblioteca.
   2. Asistente.resumenPartido(): redacta la crónica de un partido
      a partir de sus estadísticas.
   ============================================================= */

const Asistente = (() => {
  /* ---------- 1. GENERADOR DE SESIONES ---------- */

  // Qué porcentaje del tiempo dedicamos a cada parte
  const REPARTO = { calentamiento: 0.2, tecnica: 0.3, tactica: 0.37, vuelta: 0.13 };

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
    transicion: ['Los primeros 5 segundos tras robar/perder son clave', 'Atacar rápido el espacio', 'Repliegue por dentro'],
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

  // Generador de números con semilla (para que "Otra propuesta" cambie)
  function azarCon(semilla) {
    let s = semilla % 2147483647 || 1;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  // Puntuación de un ejercicio para un objetivo
  function puntuar(e, objetivo) {
    const objs = e.objetivos || [];
    if (objs[0] === objetivo) return 12;
    if (objs.includes(objetivo)) return 9;
    if ((RELACIONADOS[objetivo] || []).some((r) => objs.includes(r))) return 4;
    return 1;
  }

  const redondear5 = (n) => Math.max(5, Math.round(n / 5) * 5);

  function generarSesion({ categoria, objetivo, duracion, semilla = 1 }) {
    const azar = azarCon(semilla);
    const total = Number(duracion);
    const partes = {};
    const usados = new Set();
    const explicacion = [];

    // Minutos de cada parte (la táctica absorbe el redondeo)
    const minutos = {};
    let asignado = 0;
    ['calentamiento', 'tecnica', 'vuelta'].forEach((p) => { minutos[p] = redondear5(total * REPARTO[p]); asignado += minutos[p]; });
    minutos.tactica = Math.max(10, total - asignado);

    Biblioteca.PARTES.forEach((p) => {
      // Candidatos: ejercicios de esa parte y categoría, ordenados por puntuación (+ un poco de azar)
      const candidatos = Biblioteca.para(categoria, p.id)
        .filter((e) => !usados.has(e.id))
        .map((e) => ({ e, nota: puntuar(e, objetivo) + azar() * 3 }))
        .sort((a, b) => b.nota - a.nota);

      const elegidos = [];
      let restante = minutos[p.id];
      for (const { e } of candidatos) {
        if (restante < 5) break;
        // Evitamos meter ejercicios muy largos en huecos pequeños
        if (e.duracion > restante + 5 && elegidos.length) continue;
        const dur = Math.min(e.duracion, restante);
        elegidos.push({ id: e.id, duracion: dur, encaja: puntuar(e, objetivo) >= 9 });
        usados.add(e.id);
        restante -= dur;
        if (p.id === 'calentamiento' || p.id === 'vuelta') break; // un ejercicio basta
        if (elegidos.length >= 3) break;
      }
      partes[p.id] = { duracion: minutos[p.id], ejercicios: elegidos };
    });

    // Explicación de la propuesta
    const obj = Biblioteca.objetivo(objetivo).nombre;
    const cat = DB.categoria(categoria);
    const directos = Object.values(partes).flatMap((x) => x.ejercicios).filter((x) => x.encaja).length;
    explicacion.push(`Sesión de ${total} minutos para ${cat.nombre} centrada en ${obj.toLowerCase()}.`);
    explicacion.push(directos
      ? `${directos} ejercicio${directos > 1 ? 's trabajan' : ' trabaja'} directamente el objetivo; el resto lo complementan.`
      : 'No hay ejercicios específicos de este objetivo para esta edad: he elegido los más parecidos. Puedes crear uno propio en la Biblioteca.');
    explicacion.push('Reparto: ' + Biblioteca.PARTES.map((p) => `${p.nombre.toLowerCase()} ${partes[p.id].duracion}'`).join(', ') + '.');

    return {
      titulo: `${obj} · ${cat.nombre}`,
      categoria, objetivo, duracion: total, partes, explicacion,
      puntosClave: PUNTOS_CLAVE[objetivo] || [],
      consejos: CONSEJOS_EDAD[categoria] || [],
    };
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

  return { generarSesion, resumenPartido, textoResumen, PUNTOS_CLAVE };
})();
