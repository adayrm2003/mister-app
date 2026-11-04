/* =============================================================
   EJERCICIOS.JS · Biblioteca de ejercicios precargada
   -------------------------------------------------------------
   Cada ejercicio tiene:
     parte:       calentamiento, tecnica, tactica o vuelta (a la calma)
     objetivos:   qué trabaja (pase, presión, finalización…)
     categorias:  para qué edades es adecuado
     contra:      qué estilo de rival ayuda a contrarrestar
     duracion:    minutos recomendados
   Los ejercicios que cree el entrenador se guardan aparte (en DB)
   con el mismo formato, y se juntan con estos en Biblioteca.todos().
   ============================================================= */

const Biblioteca = (() => {
  const PARTES = [
    { id: 'calentamiento', nombre: 'Calentamiento', color: '#F2B705', icono: 'rayo' },
    { id: 'tecnica', nombre: 'Técnica', color: '#0272BB', icono: 'balon' },
    { id: 'tactica', nombre: 'Táctica', color: '#CF2633', icono: 'pizarra' },
    { id: 'vuelta', nombre: 'Vuelta a la calma', color: '#12A150', icono: 'reloj' },
  ];

  const OBJETIVOS = [
    { id: 'pase', nombre: 'Pase' },
    { id: 'control', nombre: 'Control' },
    { id: 'conduccion', nombre: 'Conducción' },
    { id: 'regate', nombre: 'Regate (1x1)' },
    { id: 'finalizacion', nombre: 'Finalización' },
    { id: 'presion', nombre: 'Presión' },
    { id: 'defensa', nombre: 'Defensa' },
    { id: 'posesion', nombre: 'Posesión' },
    { id: 'transicion', nombre: 'Transiciones' },
    { id: 'salida', nombre: 'Salida de balón' },
    { id: 'centros', nombre: 'Juego por bandas' },
    { id: 'balon-parado', nombre: 'Balón parado' },
    { id: 'coordinacion', nombre: 'Coordinación' },
    { id: 'velocidad', nombre: 'Velocidad' },
  ];

  // Formas de jugar del rival (para preparar el partido de la semana)
  const ESTILOS_RIVAL = [
    { id: 'presion-alta', nombre: 'Presiona arriba' },
    { id: 'juego-directo', nombre: 'Juega en largo' },
    { id: 'contraataque', nombre: 'Contraataca rápido' },
    { id: 'bloque-bajo', nombre: 'Se encierra atrás' },
    { id: 'bandas', nombre: 'Ataca por bandas' },
    { id: 'balon-parado', nombre: 'Peligroso a balón parado' },
    { id: 'posesion', nombre: 'Mucha posesión' },
    { id: 'fisico', nombre: 'Muy físico' },
  ];

  // Ayuda: lista de categorías desde una hasta otra. rango('benjamin','infantil')
  const ORDEN = ['prebenjamin', 'benjamin', 'alevin', 'infantil', 'cadete', 'juvenil', 'regional'];
  const rango = (desde, hasta = 'regional') => ORDEN.slice(ORDEN.indexOf(desde), ORDEN.indexOf(hasta) + 1);
  const TODAS = ORDEN;

  /* ---------- LA BIBLIOTECA ---------- */
  const PRECARGADOS = [
    // ===== CALENTAMIENTO =====
    { id: 'b-c01', parte: 'calentamiento', nombre: 'Pilla-pilla con balón', objetivos: ['conduccion', 'coordinacion'], categorias: rango('prebenjamin', 'benjamin'), duracion: 10,
      material: 'Un balón por jugador, conos para delimitar', descripcion: 'En un cuadrado de 20x20, cada niño conduce su balón. Uno o dos "pillan" (con peto). Si te pillan, cambias el rol. Variante: solo se puede conducir con la pierna mala.' },
    { id: 'b-c02', parte: 'calentamiento', nombre: 'Los semáforos', objetivos: ['conduccion', 'coordinacion'], categorias: rango('prebenjamin', 'benjamin'), duracion: 8,
      material: 'Balones, 3 conos de colores (verde, amarillo, rojo)', descripcion: 'Conducen libremente. El entrenador levanta un cono: verde = conducir rápido, amarillo = despacio, rojo = pisar el balón y quedarse quieto. Trabaja la atención y el control del balón.' },
    { id: 'b-c03', parte: 'calentamiento', nombre: 'Rondo 4x1 de activación', objetivos: ['pase', 'posesion'], categorias: rango('alevin'), duracion: 10,
      material: 'Conos, 1 balón cada 5 jugadores, petos', descripcion: 'Cuadrado de 8x8 m. Cuatro jugadores fuera mantienen el balón a 1-2 toques; uno dentro intenta robar. Quien pierde el balón, entra. Mantener intensidad baja-media al principio.' },
    { id: 'b-c04', parte: 'calentamiento', nombre: 'Movilidad articular dinámica', objetivos: ['coordinacion'], categorias: rango('infantil'), duracion: 8,
      material: 'Conos', descripcion: 'Carril de 15 m: skipping, talones al glúteo, apertura y cierre de cadera, zancadas con giro de tronco, desplazamientos laterales. Ida trotando y vuelta con el ejercicio.' },
    { id: 'b-c05', parte: 'calentamiento', nombre: 'Circuito de coordinación con escalera', objetivos: ['coordinacion', 'velocidad'], categorias: rango('benjamin'), duracion: 10,
      material: 'Escalera de agilidad, picas, aros, balones', descripcion: 'Escalera (un pie por hueco, dos pies, lateral), slalom entre picas y salto de aros, terminando con un pase a portería. En pequeños, convertirlo en "carrera de obstáculos".' },
    { id: 'b-c06', parte: 'calentamiento', nombre: 'Pases por parejas en movimiento', objetivos: ['pase', 'control'], categorias: rango('benjamin'), duracion: 10,
      material: 'Un balón por pareja', descripcion: 'Por parejas a 8-10 m, se pasan el balón mientras se desplazan por el campo. Control orientado y pase. Variar superficies: interior, exterior, pierna mala.' },
    { id: 'b-c07', parte: 'calentamiento', nombre: 'Rondo 5x2 con transición', objetivos: ['pase', 'presion', 'transicion'], categorias: rango('infantil'), duracion: 12,
      material: 'Conos, petos, balones', descripcion: 'Cuadrado de 12x12. Cinco mantienen, dos presionan. Si los defensores roban, deben sacar el balón del cuadrado conduciendo para puntuar. Activa la reacción tras pérdida.' },
    { id: 'b-c08', parte: 'calentamiento', nombre: 'Juego de los colores', objetivos: ['pase', 'control'], categorias: rango('prebenjamin', 'alevin'), duracion: 10,
      material: 'Petos de 3 colores, balones', descripcion: 'Tres equipos mezclados en un espacio. Los rojos solo pueden pasar a azules, los azules a amarillos y los amarillos a rojos. Obliga a levantar la cabeza antes de pasar.' },
    { id: 'b-c09', parte: 'calentamiento', nombre: 'Activación con reacción y sprint', objetivos: ['velocidad'], categorias: rango('alevin'), duracion: 8,
      material: 'Conos', descripcion: 'Por parejas uno frente a otro. A la señal (palmada, color o número) uno huye y el otro persigue hasta una línea a 10 m. Trabaja la velocidad de reacción. Pausas completas.' },

    // ===== TÉCNICA =====
    { id: 'b-t01', parte: 'tecnica', nombre: 'Conducción por puertas', objetivos: ['conduccion'], categorias: rango('prebenjamin', 'alevin'), duracion: 12,
      material: '10-12 "puertas" de conos, un balón por jugador', descripcion: 'Repartir puertas de 1 m por el campo. Cada jugador conduce y cruza el mayor número de puertas en 1 minuto. Contar puertas y repetir intentando superar su marca.' },
    { id: 'b-t02', parte: 'tecnica', nombre: 'El zorro y las gallinas (1x1)', objetivos: ['regate', 'conduccion'], categorias: rango('prebenjamin', 'benjamin'), duracion: 12,
      material: 'Balones, conos', descripcion: 'Las "gallinas" cruzan un pasillo de 15x20 conduciendo; el "zorro" intenta quitarles el balón. Quien lo pierde se convierte en zorro. Animar a usar fintas y cambios de ritmo.' },
    { id: 'b-t03', parte: 'tecnica', nombre: 'Triángulos de pase y control orientado', objetivos: ['pase', 'control'], categorias: rango('benjamin'), duracion: 15,
      material: '3 conos por grupo, 1 balón', descripcion: 'Grupos de 3-4 en un triángulo de 8 m. Pase, control orientado con el pie alejado y pase al siguiente cono; el jugador sigue a su pase. Cambiar el sentido cada 2 minutos.' },
    { id: 'b-t04', parte: 'tecnica', nombre: 'Pared y finalización', objetivos: ['pase', 'finalizacion'], categorias: rango('benjamin'), duracion: 15,
      material: 'Portería, balones, conos, portero', descripcion: 'El jugador conduce, hace pared con un compañero situado en la frontal y remata a portería. Rotan posiciones. Variante: pared con el pie contrario.' },
    { id: 'b-t05', parte: 'tecnica', nombre: 'Tiro a portería tras conducción', objetivos: ['finalizacion', 'conduccion'], categorias: rango('prebenjamin'), duracion: 12,
      material: 'Portería, balones, conos en slalom', descripcion: 'Slalom entre 4 conos y tiro a portería desde fuera del área (o desde 8 m en F7). Insistir en mirar al portero y golpear con el empeine o el interior según la distancia.' },
    { id: 'b-t06', parte: 'tecnica', nombre: '1x1 a miniportería', objetivos: ['regate', 'defensa'], categorias: rango('benjamin'), duracion: 15,
      material: '2 miniporterías, balones, conos', descripcion: 'Campo de 10x15. El defensor pasa al atacante y sale a defender. El atacante debe superarle y marcar en la miniportería. El defensor, si roba, puede marcar en la contraria.' },
    { id: 'b-t07', parte: 'tecnica', nombre: 'Centros y remate', objetivos: ['centros', 'finalizacion'], categorias: rango('alevin'), duracion: 15,
      material: 'Portería, balones, conos, portero', descripcion: 'Un extremo conduce por banda y centra; dos rematadores atacan el primer y segundo palo. Cambiar de banda a mitad. Corregir la llegada: al primer palo de fuera hacia dentro.' },
    { id: 'b-t08', parte: 'tecnica', nombre: 'Rueda de pases en cuadrado', objetivos: ['pase', 'control'], categorias: rango('alevin'), duracion: 12,
      material: '4 conos, 2 balones', descripcion: 'Cuadrado de 10 m con jugadores en cada esquina. Pase y sigue tu pase. Con dos balones a la vez para exigir velocidad. Pase tenso, a ras de suelo y al pie bueno del compañero.' },
    { id: 'b-t09', parte: 'tecnica', nombre: 'Control y pase bajo presión pasiva', objetivos: ['control', 'pase'], categorias: rango('infantil'), duracion: 12,
      material: 'Conos, balones, petos', descripcion: 'Grupos de 3: el central recibe con un defensor a su espalda (pasivo y luego activo), se perfila y descarga al otro lado. Insistir en mirar antes de recibir.' },
    { id: 'b-t10', parte: 'tecnica', nombre: 'Finalización en 2x1', objetivos: ['finalizacion', 'pase'], categorias: rango('alevin'), duracion: 15,
      material: 'Portería, balones, petos, portero', descripcion: 'Dos atacantes contra un defensor desde medio campo. Tomar la decisión correcta: fijar al defensor y pasar, o encarar si hay espacio. Máximo 8 segundos para finalizar.' },
    { id: 'b-t11', parte: 'tecnica', nombre: 'Juego de cabeza', objetivos: ['control', 'finalizacion'], categorias: rango('infantil'), duracion: 10,
      material: 'Balones blandos o poco inflados', descripcion: 'Por parejas: uno lanza con la mano y el otro devuelve de cabeza (ojos abiertos, golpear con la frente). Progresar a remate de cabeza a portería tras centro con la mano.' },
    { id: 'b-t12', parte: 'tecnica', nombre: 'Golpeo en largo y control', objetivos: ['pase', 'control'], categorias: rango('infantil'), duracion: 12,
      material: 'Balones, conos', descripcion: 'Parejas a 25-30 m. Cambio de orientación con empeine/interior y control con el primer toque. Trabaja la superación de líneas y los cambios de juego.' },
    { id: 'b-t13', parte: 'tecnica', nombre: 'Juego de porteros: blocajes y caídas', objetivos: ['defensa'], categorias: rango('benjamin'), duracion: 15,
      material: 'Balones, portería, colchoneta (opcional)', descripcion: 'Específico para porteros: blocajes a media altura, caídas laterales desde rodillas y luego de pie, despejes con los puños. Pocas repeticiones y bien hechas.' },
    { id: 'b-t14', parte: 'tecnica', nombre: 'Robo de balones (la granja)', objetivos: ['conduccion', 'defensa'], categorias: rango('prebenjamin', 'benjamin'), duracion: 10,
      material: 'Muchos balones, 4 aros o zonas', descripcion: 'Balones en el centro. Cuatro equipos llevan balones conduciendo a su "granja". Cuando no quedan en el centro, pueden robar de otras granjas. Gana quien más tenga al final.' },

    // ===== TÁCTICA =====
    { id: 'b-k01', parte: 'tactica', nombre: 'Partido reducido 3x3 a 4 porterías', objetivos: ['posesion', 'transicion'], categorias: rango('prebenjamin', 'alevin'), duracion: 15,
      material: '4 miniporterías o puertas de conos, petos, balones', descripcion: 'Campo de 20x25 con dos porterías por equipo. Obliga a cambiar el juego hacia donde hay espacio. Partidos cortos de 3 minutos con descanso activo.' },
    { id: 'b-k02', parte: 'tactica', nombre: 'Posesión 4x4+2 comodines', objetivos: ['posesion', 'pase'], categorias: rango('alevin'), duracion: 15,
      material: 'Conos, petos de 3 colores, balones', descripcion: 'Cuadrado de 25x25. Dos equipos de 4 y dos comodines que juegan con quien tiene el balón. 10 pases seguidos = 1 punto. Buscar amplitud y apoyos.' },
    { id: 'b-k03', parte: 'tactica', nombre: 'Salida de balón desde el portero', objetivos: ['salida', 'pase'], categorias: rango('alevin'), duracion: 18,
      contra: ['presion-alta'],
      material: 'Portería, conos, petos, balones', descripcion: 'El portero inicia; defensas abiertos y un medio de apoyo contra 2-3 presionadores. Objetivo: superar la línea de presión conduciendo o pasando a una zona marcada. Enseña a no rifar el balón ante equipos que presionan arriba.' },
    { id: 'b-k04', parte: 'tactica', nombre: 'Presión tras pérdida (5 segundos)', objetivos: ['presion', 'transicion'], categorias: rango('alevin'), duracion: 15,
      contra: ['contraataque', 'posesion'],
      material: 'Conos, petos, balones', descripcion: 'Partido 5x5. Si un equipo pierde el balón y lo recupera en menos de 5 segundos, gana un punto extra. Evita que el rival salga rápido a la contra.' },
    { id: 'b-k05', parte: 'tactica', nombre: 'Presión alta coordinada', objetivos: ['presion', 'defensa'], categorias: rango('infantil'), duracion: 18,
      contra: ['posesion'],
      material: 'Portería, conos, petos', descripcion: 'El equipo rival saca desde su portero con 4-5 jugadores; nuestros 3-4 atacantes presionan orientando hacia la banda y cerrando líneas de pase. Puntúa robar en campo rival.' },
    { id: 'b-k06', parte: 'tactica', nombre: 'Ataque contra defensa cerrada', objetivos: ['posesion', 'finalizacion', 'centros'], categorias: rango('alevin'), duracion: 18,
      contra: ['bloque-bajo'],
      material: 'Portería, conos, petos, balones', descripcion: '6 atacantes contra 5 defensores encerrados en su área ampliada. Gol de centro o tras pared vale doble. Enseña paciencia, amplitud, cambios de orientación y llegada desde segunda línea.' },
    { id: 'b-k07', parte: 'tactica', nombre: 'Defensa de balones largos', objetivos: ['defensa', 'control'], categorias: rango('infantil'), duracion: 15,
      contra: ['juego-directo', 'fisico'],
      material: 'Balones, conos, petos', descripcion: 'Un lanzador envía balones largos; dos defensores contra un delantero disputan: uno va al choque y el otro hace la cobertura para el rechace. Trabaja el perfil y la comunicación.' },
    { id: 'b-k08', parte: 'tactica', nombre: 'Repliegue y defensa de contraataque', objetivos: ['defensa', 'transicion'], categorias: rango('alevin'), duracion: 15,
      contra: ['contraataque'],
      material: 'Portería, conos, petos', descripcion: 'Atacamos en 4x3; al perder, el rival sale en 3x2 hacia nuestra portería. Los nuestros deben replegar rápido por dentro, temporizar y no tirarse al suelo.' },
    { id: 'b-k09', parte: 'tactica', nombre: 'Defensa en banda (2x2 lateral)', objetivos: ['defensa', 'centros'], categorias: rango('alevin'), duracion: 15,
      contra: ['bandas'],
      material: 'Conos, portería, petos', descripcion: 'Pasillo lateral de 15 m: extremo y lateral rivales contra nuestro lateral y extremo. Evitar el centro: orientar hacia fuera, ayudas y no dejar perfil bueno. Si centran, defensores en el área atacan el balón.' },
    { id: 'b-k10', parte: 'tactica', nombre: 'Balón parado defensivo', objetivos: ['balon-parado', 'defensa'], categorias: rango('alevin'), duracion: 12,
      contra: ['balon-parado', 'fisico'],
      material: 'Portería, balones, petos', descripcion: 'Córners y faltas laterales: asignar marcas (al hombre o zona mixta), poste y jugador en el rechace. Repetir con el rival intentando bloqueos. Cada uno debe saber su sitio sin pensar.' },
    { id: 'b-k11', parte: 'tactica', nombre: 'Balón parado ofensivo', objetivos: ['balon-parado', 'finalizacion'], categorias: rango('alevin'), duracion: 12,
      material: 'Portería, balones, conos', descripcion: 'Dos jugadas ensayadas de córner y una de falta frontal. Practicar movimientos de arrastre y llegada desde atrás. Dar nombre a cada jugada para cantarla en el partido.' },
    { id: 'b-k12', parte: 'tactica', nombre: 'Partido condicionado a 2 toques', objetivos: ['pase', 'posesion'], categorias: rango('alevin'), duracion: 15,
      contra: ['presion-alta', 'fisico'],
      material: 'Petos, porterías, balones', descripcion: 'Partido normal pero con máximo 2 toques por jugador. Obliga a jugar rápido y a ofrecer apoyos constantes. Muy útil contra rivales que aprietan o son más físicos.' },
    { id: 'b-k13', parte: 'tactica', nombre: 'Partido libre', objetivos: ['transicion', 'finalizacion'], categorias: TODAS, duracion: 15,
      material: 'Petos, porterías, balones', descripcion: 'Partido en el formato de la categoría (F7 o F11 en espacio reducido). El entrenador interviene poco y solo para reforzar lo trabajado en la sesión.' },
    { id: 'b-k14', parte: 'tactica', nombre: 'Juego de superioridad por bandas', objetivos: ['centros', 'pase'], categorias: rango('alevin'), duracion: 15,
      contra: ['bloque-bajo'],
      material: 'Portería, conos, petos', descripcion: 'Partido con dos pasillos laterales donde no se puede defender (comodines de banda). Buscar el 2x1 por fuera y centrar. Ideal ante rivales que defienden cerrados por dentro.' },
    { id: 'b-k15', parte: 'tactica', nombre: 'Tres zonas: superar líneas', objetivos: ['salida', 'posesion', 'pase'], categorias: rango('infantil'), duracion: 18,
      contra: ['presion-alta', 'juego-directo'],
      material: 'Conos para 3 zonas, petos, balones', descripcion: 'Campo dividido en tres zonas (defensa, medio, ataque). Hay que pasar por la zona media antes de llegar al ataque: nada de pelotazo. Enseña a jugar con pausa y a encontrar al hombre libre.' },

    // ===== VUELTA A LA CALMA =====
    { id: 'b-v01', parte: 'vuelta', nombre: 'Estiramientos guiados', objetivos: ['coordinacion'], categorias: rango('infantil'), duracion: 8,
      material: 'Ninguno', descripcion: 'Estiramientos suaves de cuádriceps, isquios, aductores, gemelos y glúteo, 20-30 segundos cada uno. Respiración tranquila. Aprovechar para comentar la sesión.' },
    { id: 'b-v02', parte: 'vuelta', nombre: 'Rondo suave y charla', objetivos: ['pase'], categorias: TODAS, duracion: 8,
      material: 'Balones', descripcion: 'Rondo grande y relajado sin defensor, a un toque. Después, en círculo, el entrenador pregunta qué han aprendido hoy (2-3 preguntas sencillas).' },
    { id: 'b-v03', parte: 'vuelta', nombre: 'Juego de puntería', objetivos: ['pase'], categorias: rango('prebenjamin', 'benjamin'), duracion: 8,
      material: 'Conos, balones', descripcion: 'Desde 6-8 m, intentar derribar conos con un pase raso. Ritmo tranquilo, por turnos. Terminar recogiendo el material todos juntos.' },
    { id: 'b-v04', parte: 'vuelta', nombre: 'Movilidad y respiración', objetivos: ['coordinacion'], categorias: rango('cadete'), duracion: 10,
      material: 'Esterillas (opcional)', descripcion: 'Movilidad de cadera y columna, estiramientos de flexores y respiración diafragmática. Ayuda a la recuperación tras sesiones intensas.' },
    { id: 'b-v05', parte: 'vuelta', nombre: 'La estatua', objetivos: ['coordinacion'], categorias: rango('prebenjamin', 'benjamin'), duracion: 6,
      material: 'Ninguno', descripcion: 'Caminan por el campo y a la señal se quedan como estatuas imitando una posición de futbolista (portero parando, delantero celebrando…). Baja pulsaciones y termina con una sonrisa.' },
    { id: 'b-v06', parte: 'vuelta', nombre: 'Penaltis de despedida', objetivos: ['finalizacion'], categorias: rango('prebenjamin', 'alevin'), duracion: 8,
      material: 'Portería, balones', descripcion: 'Tanda de penaltis tranquila; cada jugador tira uno. Quien marca elige quién tira después. Cierre divertido de la sesión.' },
  ];

  return {
    PARTES, OBJETIVOS, ESTILOS_RIVAL, ORDEN,
    PRECARGADOS,

    // Todos los ejercicios: los precargados + los creados por el entrenador
    todos() {
      return PRECARGADOS.concat(DB.lista('ejercicios').map((e) => ({ ...e, propio: true })));
    },
    obtener(id) {
      return this.todos().find((e) => e.id === id);
    },
    parte(id) { return PARTES.find((p) => p.id === id) || PARTES[0]; },
    objetivo(id) { return OBJETIVOS.find((o) => o.id === id) || { id, nombre: id }; },
    estilo(id) { return ESTILOS_RIVAL.find((o) => o.id === id) || { id, nombre: id }; },

    // Ejercicios adecuados para una categoría (y opcionalmente para una parte)
    // (los propios: solo los del equipo activo, que ya son de su categoría)
    para(categoria, parte) {
      const equipoId = DB.equipo()?.id;
      return this.todos().filter((e) =>
        (e.propio ? e.equipoId === equipoId : !categoria || (e.categorias || TODAS).includes(categoria)) &&
        (!parte || e.parte === parte));
    },

    // Recomendaciones para contrarrestar unos estilos de rival
    contraEstilos(estilos, categoria) {
      return this.para(categoria)
        .map((e) => ({ e, puntos: (e.contra || []).filter((c) => estilos.includes(c)).length }))
        .filter((x) => x.puntos > 0)
        .sort((a, b) => b.puntos - a.puntos)
        .map((x) => x.e);
    },
  };
})();
