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
    prebenjamin: [['Bruno', 'Delantero', 9], ['Tino', 'Defensa', 4], ['Vega', 'Centrocampista', 8], ['Lolo', 'Portero', 1]],
    benjamin: [['Elías', 'Centrocampista', 6], ['Noa', 'Delantero', 11], ['Oliver', 'Defensa', 3], ['Gara', 'Portero', 1], ['Dácil', 'Centrocampista', 10]],
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
    cadete: [['Raúl', 'Centrocampista', 8], ['Alexis', 'Delantero', 9], ['Idaira', 'Defensa', 4]],
    juvenil: [['Kike', 'Defensa', 5], ['Samu', 'Delantero', 11], ['Josué', 'Portero', 1]],
    regional: [['Cristo', 'Centrocampista', 10], ['Moisés', 'Defensa', 6], ['Tito', 'Delantero', 9]],
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
        lista.push({
          id: 'ej-j' + n,
          ejemplo: true,
          nombre, posicion, dorsal: String(dorsal),
          categoria: catId,
          edad,
          altura: Math.round(116 + crece * 5.5 + entre(-5, 6)),
          peso: Math.round(21 + crece * 4.2 + entre(-3, 4)),
          valoraciones: valoracionesPara(posicion),
        });
      });
    });
    return lista;
  }

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

  return {
    // Devuelve todos los datos de ejemplo agrupados por colección
    generar() {
      semilla = 7;
      const listaJugadores = jugadores();
      return { jugadores: listaJugadores, sesiones: sesiones(listaJugadores), preparaciones: preparaciones() };
    },
  };
})();
