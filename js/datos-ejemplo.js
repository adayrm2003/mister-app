/* =============================================================
   DATOS-EJEMPLO.JS · Datos inventados para probar la app
   -------------------------------------------------------------
   Todo lo que se crea aquí lleva "ejemplo: true", así el botón
   "Borrar datos de ejemplo" sabe qué quitar sin tocar tus datos.
   Los nombres son inventados (solo nombre de pila o mote).
   ============================================================= */

const DatosEjemplo = (() => {
  /* Generador de números "aleatorios" pero siempre iguales (con semilla),
     para que los datos de ejemplo sean los mismos cada vez. */
  let semilla = 7;
  const azar = () => {
    semilla = (semilla * 9301 + 49297) % 233280;
    return semilla / 233280;
  };
  const entre = (min, max) => Math.round(min + azar() * (max - min));

  // Plantillas por categoría: [nombre, posición, dorsal]
  const PLANTILLAS = {
    alevin: [
      ['Yeray', 'Portero', 1], ['Acoidán', 'Defensa', 2], ['Nayra', 'Defensa', 4], ['Hugo', 'Defensa', 5],
      ['Leo', 'Centrocampista', 6], ['Aythami', 'Centrocampista', 8], ['Sara', 'Centrocampista', 10],
      ['Mateo', 'Delantero', 7], ['Iker', 'Delantero', 9], ['Airam', 'Defensa', 3], ['Daniela', 'Delantero', 11], ['Jonay', 'Portero', 13],
    ],
    infantil: [
      ['Echedey', 'Portero', 1], ['Tanausú', 'Defensa', 2], ['Carla', 'Defensa', 3], ['Dani', 'Defensa', 4], ['Pablo', 'Defensa', 5],
      ['Ancor', 'Centrocampista', 6], ['Beneharo', 'Centrocampista', 8], ['Lucía', 'Centrocampista', 10], ['Iván', 'Delantero', 7],
      ['Kevin', 'Delantero', 9], ['Nauzet', 'Delantero', 11], ['Adrián', 'Centrocampista', 14], ['Fran', 'Defensa', 15], ['Saúl', 'Portero', 13],
    ],
  };

  // Valoraciones según la posición (un portero suele defender mejor que atacar…)
  function valoracionesPara(posicion) {
    const base = { Portero: [7, 3, 5, 6], Defensa: [7, 4, 6, 7], Centrocampista: [5, 6, 6, 5], Delantero: [3, 7, 7, 6] }[posicion];
    const v = base.map((n) => Math.min(10, Math.max(1, n + entre(-2, 2))));
    return { defensa: v[0], ataque: v[1], velocidad: v[2], fuerza: v[3] };
  }

  function jugadores() {
    const lista = [];
    let n = 0;
    Object.entries(PLANTILLAS).forEach(([catId, plantilla]) => {
      const cat = DB.categoria(catId);
      plantilla.forEach(([nombre, posicion, dorsal]) => {
        n++;
        const edad = entre(cat.min, Math.min(cat.max, cat.min + 2));
        const crece = Math.min(edad, 17) - 6; // los niños crecen hasta los 17 aprox.
        const valoraciones = valoracionesPara(posicion);
        lista.push({
          id: 'ej-j' + n,
          ejemplo: true,
          nombre, posicion, dorsal: String(dorsal),
          categoria: catId,
          edad,
          altura: Math.round(116 + crece * 5.5 + entre(-5, 6)),
          peso: Math.round(21 + crece * 4.2 + entre(-3, 4)),
          valoraciones,
          historial: historialHasta(valoraciones),
          notas: NOTAS[nombre] ? NOTAS[nombre].map(([dias, tipo, texto], i) => ({ id: `ej-n${n}-${i}`, fecha: UI.sumarDias(UI.hoyISO(), dias), tipo, texto })) : [],
        });
      });
    });
    return lista;
  }

  /* Historial: 4 valoraciones mensuales que van mejorando hasta la actual */
  function historialHasta(actual) {
    const hoy = UI.hoyISO();
    return [-60, -40, -20, 0].map((dias, i) => {
      const punto = { fecha: UI.sumarDias(hoy, dias) };
      DB.ASPECTOS.forEach((a) => {
        const atras = 3 - i; // cuanto más antiguo, algo más bajo
        punto[a.id] = Math.max(1, Math.min(10, actual[a.id] - Math.round(atras * azar() * 0.9)));
      });
      if (dias === 0) Object.assign(punto, actual);
      return punto;
    });
  }

  /* Algunas notas privadas de ejemplo */
  const NOTAS = {
    Sara: [[-30, 'Actitud', 'Muy buena actitud, anima a sus compañeros.'], [-6, 'Técnica', 'Ha mejorado mucho el pase con la izquierda.']],
    Iker: [[-25, 'Táctica', 'Le cuesta volver a defender tras pérdida. Trabajarlo.'], [-4, 'Físico', 'Muy rápido en los primeros metros.']],
    Lucía: [[-18, 'General', 'Líder en el campo. Candidata a capitana.']],
    Kevin: [[-10, 'Técnica', 'Mejorar el control orientado antes de rematar.']],
  };

  /* Sesiones de entrenamiento (fechas relativas a hoy) */
  const PLANES = [
    { titulo: 'Pase y control orientado', ej: { calentamiento: ['b-c06'], tecnica: ['b-t03', 'b-t08'], tactica: ['b-k02'], vuelta: ['b-v02'] } },
    { titulo: 'Finalización', ej: { calentamiento: ['b-c09'], tecnica: ['b-t10', 'b-t07'], tactica: ['b-k13'], vuelta: ['b-v06'] } },
    { titulo: 'Presión tras pérdida', ej: { calentamiento: ['b-c03'], tecnica: ['b-t06'], tactica: ['b-k04', 'b-k08'], vuelta: ['b-v02'] } },
    { titulo: 'Salida de balón', ej: { calentamiento: ['b-c08'], tecnica: ['b-t08'], tactica: ['b-k03', 'b-k12'], vuelta: ['b-v06'] } },
  ];
  function sesiones(listaJugadores) {
    const hoy = UI.hoyISO();
    const lista = [];
    let n = 0;
    ['alevin', 'infantil'].forEach((cat) => {
      const delEquipo = listaJugadores.filter((j) => j.categoria === cat);
      [-12, -9, -5, -2, 1, 3].forEach((dias, i) => {
        n++;
        const plan = PLANES[i % PLANES.length];
        const partes = {};
        Biblioteca.PARTES.forEach((p) => { partes[p.id] = { duracion: { calentamiento: 15, tecnica: 25, tactica: 25, vuelta: 10 }[p.id], ejercicios: [...plan.ej[p.id]] }; });
        // A las sesiones ya pasadas les ponemos asistencia
        const asistencia = {};
        if (dias < 0) delEquipo.forEach((j) => { const r = azar(); asistencia[j.id] = r < 0.82 ? 'si' : r < 0.92 ? 'just' : 'no'; });
        lista.push({
          id: 'ej-s' + n, ejemplo: true, titulo: plan.titulo, categoria: cat,
          fecha: UI.sumarDias(hoy, dias + (cat === 'infantil' ? 0 : -1)), hora: cat === 'alevin' ? '17:30' : '19:00',
          partes, asistencia, notas: '',
        });
      });
    });
    return lista;
  }

  /* Preparación del partido de la semana (rivales inventados) */
  function preparaciones() {
    const sabado = UI.sumarDias(UI.hoyISO(), (6 - new Date().getDay() + 7) % 7 || 7);
    return [
      { id: 'ej-p1', ejemplo: true, rival: 'U.D. Las Torres', fecha: sabado, categoria: 'alevin', sistema: '1-3-2-1',
        estilos: ['presion-alta', 'contraataque'], ejercicios: ['b-k03', 'b-k04', 'b-k08'],
        fuertes: 'Aprietan muy arriba los primeros 15 minutos. Su extremo izquierdo es muy rápido.',
        debiles: 'Dejan mucho espacio a la espalda de los defensas cuando presionan.',
        vigilar: 'El 7 (extremo izquierdo): no dejarle encarar.', notas: 'Campo de hierba artificial, más rápido.' },
      { id: 'ej-p2', ejemplo: true, rival: 'C.D. Barrio Nuevo', fecha: UI.sumarDias(sabado, 1), categoria: 'infantil', sistema: '1-4-4-2',
        estilos: ['bloque-bajo', 'balon-parado'], ejercicios: ['b-k06', 'b-k10'],
        fuertes: 'Muy ordenados atrás y peligrosos en los córners.', debiles: 'Les cuesta salir jugando.', vigilar: 'Su central (el 4) en los balones parados.', notas: '' },
    ];
  }

  /* Partidos: 3 jugados y 1 próximo por equipo (rivales inventados) */
  function partidos(listaJugadores) {
    const hoy = UI.hoyISO();
    const sabado = UI.sumarDias(hoy, (6 - new Date().getDay() + 7) % 7 || 7);
    const calendario = {
      alevin: [['C.F. Atlántico Sur', -21, 3, 1, 'casa'], ['U.D. Costa Norte', -14, 2, 2, 'fuera'], ['C.D. Las Palmeras', -7, 4, 2, 'casa'], ['U.D. Las Torres', 0, null, null, 'fuera']],
      infantil: [['A.D. Valle Verde', -21, 1, 2, 'fuera'], ['C.F. Puerto Chico', -14, 3, 0, 'casa'], ['U.D. Monte Alto', -7, 2, 1, 'fuera'], ['C.D. Barrio Nuevo', 0, null, null, 'casa']],
    };
    const lista = [];
    let n = 0;
    Object.entries(calendario).forEach(([cat, juegos]) => {
      const equipo = listaJugadores.filter((j) => j.categoria === cat);
      const duracion = DB.categoria(cat).futbol === 7 ? 50 : 70;
      juegos.forEach(([rival, dias, gf, gc, lugar]) => {
        n++;
        const jugado = gf !== null;
        const fecha = UI.sumarDias(sabado, dias + (cat === 'infantil' ? 1 : 0)); // alevín los sábados, infantil los domingos
        // Convocamos a todos menos a dos, que van rotando partido a partido
        const fuera = [(n * 3) % equipo.length, (n * 7 + 2) % equipo.length];
        const convocados = equipo.filter((_, k) => !fuera.includes(k)).map((j) => j.id);
        const stats = {};
        if (jugado) {
          convocados.forEach((id) => { stats[id] = { goles: 0, asistencias: 0, minutos: entre(Math.round(duracion * 0.4), duracion), amarillas: azar() < 0.07 ? 1 : 0, rojas: 0 }; });
          // Repartimos los goles entre delanteros y medios
          const atacantes = equipo.filter((j) => convocados.includes(j.id) && ['Delantero', 'Centrocampista'].includes(j.posicion));
          for (let g = 0; g < gf; g++) {
            const goleador = atacantes[entre(0, atacantes.length - 1)];
            stats[goleador.id].goles++;
            if (azar() < 0.7) {
              const asistente = atacantes[entre(0, atacantes.length - 1)];
              if (asistente.id !== goleador.id) stats[asistente.id].asistencias++;
            }
          }
        }
        // Alineación para el próximo partido del alevín
        let alineacion = null;
        if (!jugado && cat === 'alevin') {
          alineacion = Pizarra.nueva('3-2-1');
          const orden = ['Portero', 'Defensa', 'Centrocampista', 'Delantero'];
          const titulares = equipo.filter((j) => convocados.includes(j.id)).sort((a, b) => orden.indexOf(a.posicion) - orden.indexOf(b.posicion));
          const porteros = titulares.filter((j) => j.posicion === 'Portero');
          const resto = titulares.filter((j) => j.posicion !== 'Portero');
          alineacion.puestos.forEach((p, i) => { p.jugador = (i === 0 ? porteros[0] : resto[i - 1])?.id || null; });
        }
        lista.push({
          id: 'ej-m' + n, ejemplo: true, rival, categoria: cat, competicion: 'Liga', fecha,
          hora: cat === 'alevin' ? '10:00' : '12:00', citacion: cat === 'alevin' ? '09:15' : '11:15', lugar,
          campo: lugar === 'casa' ? 'Campo Municipal (casa)' : 'Campo de ' + rival.replace(/^\S+\s/, ''),
          jugado, golesFavor: gf ?? 0, golesContra: gc ?? 0, convocados, stats, alineacion, notas: '',
        });
      });
    });
    return lista;
  }

  return {
    // Devuelve todos los datos de ejemplo agrupados por colección
    generar() {
      semilla = 7;
      // Dos equipos de ejemplo: uno de fútbol 7 y otro de fútbol 11
      const equipos = [
        { id: 'ej-eq1', ejemplo: true, nombre: 'Alevín A (ejemplo)', categoria: 'alevin', modalidad: 7, duracion: 75 },
        { id: 'ej-eq2', ejemplo: true, nombre: 'Infantil A (ejemplo)', categoria: 'infantil', modalidad: 11, duracion: 90 },
      ];
      const listaJugadores = jugadores();
      const paquete = {
        equipos,
        jugadores: listaJugadores,
        sesiones: sesiones(listaJugadores),
        preparaciones: preparaciones(),
        partidos: partidos(listaJugadores),
      };
      // Cada dato va al equipo de su categoría
      const equipoDe = (categoria) => equipos.find((e) => e.categoria === categoria).id;
      ['jugadores', 'sesiones', 'preparaciones', 'partidos'].forEach((c) => paquete[c].forEach((x) => { x.equipoId = equipoDe(x.categoria); }));
      return paquete;
    },
  };
})();
