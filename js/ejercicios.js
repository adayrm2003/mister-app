/* =============================================================
   EJERCICIOS.JS · Biblioteca de ejercicios precargada
   -------------------------------------------------------------
   Cada ejercicio tiene:
     parte:      en qué bloque de la sesión encaja: calentamiento,
                 tecnica, tactica, juego (reducido) o vuelta (a la calma)
     tipo:       tecnico, tactico, fisico o juego (para filtrar)
     objetivos:  qué trabaja (pase, presión, finalización…)
     categorias: para qué edades es adecuado
     espacio, material, duracion (minutos)
     descripcion, reglas, variantes y consignas (lo que dice el entrenador)
     contra:     qué estilo de rival ayuda a contrarrestar
   Los ejercicios que cree el entrenador se guardan en su equipo
   (DB 'ejercicios') con el mismo formato y se juntan con estos.
   ============================================================= */

const Biblioteca = (() => {
  // Los 5 bloques de una sesión. "grupo" agrupa la parte principal.
  const PARTES = [
    { id: 'calentamiento', nombre: 'Calentamiento', grupo: 'Calentamiento', color: '#F2B705', icono: 'rayo' },
    { id: 'tecnica', nombre: 'Técnica', grupo: 'Parte principal', color: '#0272BB', icono: 'balon' },
    { id: 'tactica', nombre: 'Táctica', grupo: 'Parte principal', color: '#CF2633', icono: 'pizarra' },
    { id: 'juego', nombre: 'Juego reducido', grupo: 'Parte principal', color: '#6C4CD8', icono: 'trofeo' },
    { id: 'vuelta', nombre: 'Vuelta a la calma', grupo: 'Vuelta a la calma', color: '#12A150', icono: 'reloj' },
  ];

  const TIPOS = [
    { id: 'tecnico', nombre: 'Técnico' },
    { id: 'tactico', nombre: 'Táctico' },
    { id: 'fisico', nombre: 'Físico' },
    { id: 'juego', nombre: 'Juego' },
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

  // Objetivos que tienen sentido como "foco" de la parte táctica
  const FOCOS_TACTICOS = ['posesion', 'presion', 'defensa', 'transicion', 'salida', 'centros', 'balon-parado'];

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

  // Para escribir cada ejercicio en menos líneas
  const E = (id, parte, tipo, nombre, objetivos, categorias, duracion, material, espacio, descripcion, reglas, variantes, consignas, contra = []) =>
    ({ id, parte, tipo, nombre, objetivos, categorias, duracion, material, espacio, descripcion, reglas, variantes, consignas, contra });

  /* ---------- LA BIBLIOTECA ---------- */
  const PRECARGADOS = [
    // ===== CALENTAMIENTO =====
    E('b-c01', 'calentamiento', 'juego', 'Pilla-pilla con balón', ['conduccion', 'coordinacion'], rango('prebenjamin', 'benjamin'), 10,
      'Un balón por jugador, petos, conos', 'Cuadrado de 20x20 m',
      'Cada niño conduce su balón dentro del cuadrado. Uno o dos "pillan" (con peto) y también conducen.',
      ['Todos conducen su balón dentro del cuadrado', 'El que pilla lleva peto y también conduce', 'Si te pillan, coges el peto'],
      ['Solo se puede conducir con la pierna mala', 'Dos jugadores pillan a la vez'],
      ['Balón pegado al pie', 'Levanta la cabeza para ver al que pilla', 'Cambia de dirección para escapar']),
    E('b-c02', 'calentamiento', 'tecnico', 'Los semáforos', ['conduccion', 'coordinacion'], rango('prebenjamin', 'benjamin'), 8,
      'Un balón por jugador, 3 conos de colores', 'Cuadrado de 20x20 m',
      'Conducen libremente. El entrenador levanta un cono de color y todos cambian su forma de conducir.',
      ['Verde: conducir rápido', 'Amarillo: conducir despacio', 'Rojo: pisar el balón y quedarse quieto'],
      ['Azul: cambiar de pie', 'El entrenador dice el color en lugar de enseñarlo'],
      ['Toques pequeños', 'Mira al entrenador mientras conduces', 'Para el balón con la suela']),
    E('b-c03', 'calentamiento', 'tecnico', 'Rondo 4x1 de activación', ['pase', 'posesion'], rango('alevin'), 10,
      '1 balón cada 5 jugadores, conos, petos', 'Cuadrado de 8x8 m',
      'Cuatro jugadores fuera mantienen el balón; uno dentro intenta robar. Intensidad baja al principio.',
      ['Máximo 2 toques', 'Si el del medio toca el balón, entra quien falló', 'Pase raso'],
      ['A un toque', '5x2 en un cuadrado de 10x10 m'],
      ['Perfil abierto para recibir', 'Pasa al pie más alejado del defensor', 'Muévete para dar línea de pase']),
    E('b-c04', 'calentamiento', 'fisico', 'Movilidad articular dinámica', ['coordinacion'], rango('infantil'), 8,
      'Conos', 'Carriles de 15 m',
      'Skipping, talones al glúteo, apertura de cadera, zancadas con giro y desplazamientos laterales.',
      ['Ida con el ejercicio, vuelta trotando', 'Calidad antes que velocidad'],
      ['Aceleración final de 5 m', 'Por parejas, en espejo'],
      ['Espalda recta', 'Brazos activos', 'Respiración tranquila']),
    E('b-c05', 'calentamiento', 'fisico', 'Circuito de coordinación', ['coordinacion', 'velocidad'], rango('benjamin'), 10,
      'Escalera de agilidad, picas, aros, balones', 'Circuito de 20 m',
      'Escalera, slalom entre picas y salto de aros, terminando con un pase a portería.',
      ['Sale uno cada 5 segundos', 'Se termina con un pase a portería', 'Se vuelve por fuera del circuito'],
      ['Cronometrar cada vuelta', 'Hacerlo con el balón en las manos'],
      ['Apoyos rápidos sobre la punta del pie', 'Brazos coordinados', 'Mirada al frente']),
    E('b-c06', 'calentamiento', 'tecnico', 'Pases por parejas en movimiento', ['pase', 'control'], rango('benjamin'), 10,
      'Un balón por pareja', 'Medio campo',
      'Por parejas a 8-10 m, se pasan el balón mientras se desplazan por el campo.',
      ['Distancia de 8 a 10 m', 'Siempre en movimiento', 'Cambiar de pie cada minuto'],
      ['Pase y cambio de ritmo', 'Control orientado obligatorio'],
      ['Pase tenso y raso', 'Golpea con el interior', 'Comunícate con tu compañero']),
    E('b-c07', 'calentamiento', 'tactico', 'Rondo 5x2 con transición', ['pase', 'presion', 'transicion'], rango('infantil'), 12,
      'Conos, petos, balones', 'Cuadrado de 12x12 m',
      'Cinco mantienen y dos presionan. Si roban, deben sacar el balón del cuadrado conduciendo.',
      ['5 mantienen y 2 presionan', 'Si roban y salen conduciendo del cuadrado: punto', 'Quien pierde, pasa a presionar'],
      ['Máximo 2 toques', '10 pases seguidos: punto'],
      ['Reacciona en 3 segundos tras perder', 'Presión en pareja', 'Apoyos a los lados del que tiene el balón']),
    E('b-c08', 'calentamiento', 'tecnico', 'Juego de los colores', ['pase', 'control'], rango('prebenjamin', 'alevin'), 10,
      'Petos de 3 colores, balones', 'Cuadrado de 20x20 m',
      'Tres equipos mezclados. Cada color solo puede pasar a otro color concreto.',
      ['Rojo pasa a azul, azul a amarillo y amarillo a rojo', 'Sin defensa', 'Pasa y muévete'],
      ['Con dos balones a la vez', 'Cambiar el orden de los colores'],
      ['Mira antes de pasar', 'Llama a tu compañero por su nombre', 'Pase al pie']),
    E('b-c09', 'calentamiento', 'fisico', 'Activación: reacción y sprint', ['velocidad'], rango('alevin'), 8,
      'Conos', 'Carriles de 10 m',
      'Por parejas, uno frente a otro. A la señal, uno huye y el otro persigue hasta una línea.',
      ['Parejas a 1 m', 'A la señal, uno huye y el otro persigue', 'Recuperación completa entre series'],
      ['Señal visual (un color)', 'Salida desde sentados'],
      ['Primer paso explosivo', 'Brazos fuertes', 'Frena con control']),

    // ===== TÉCNICA =====
    E('b-t01', 'tecnica', 'tecnico', 'Conducción por puertas', ['conduccion'], rango('prebenjamin', 'alevin'), 12,
      '10-12 puertas de conos, un balón por jugador', 'Zona de 30x20 m',
      'Cada jugador conduce y cruza el mayor número de puertas posible en 1 minuto.',
      ['Cruza las puertas conduciendo', 'No repitas la misma puerta seguida', 'Rondas de 1 minuto'],
      ['Solo con la pierna mala', 'Por parejas: uno conduce y el otro le sigue'],
      ['Balón cerca del pie', 'Cabeza arriba para ver puertas libres', 'Usa las dos piernas']),
    E('b-t02', 'tecnica', 'juego', 'El zorro y las gallinas (1x1)', ['regate', 'conduccion'], rango('prebenjamin', 'benjamin'), 12,
      'Balones, conos, peto', 'Pasillo de 15x20 m',
      'Las "gallinas" cruzan el pasillo conduciendo; el "zorro" intenta quitarles el balón.',
      ['Las gallinas cruzan conduciendo', 'El zorro intenta robar', 'Quien pierde el balón pasa a ser zorro'],
      ['Dos zorros', 'Quien pierde el balón hace 5 toques para volver'],
      ['Haz una finta antes de llegar al zorro', 'Cambia de ritmo al pasar', 'Protege el balón con el cuerpo']),
    E('b-t03', 'tecnica', 'tecnico', 'Triángulos de pase y control orientado', ['pase', 'control'], rango('benjamin'), 15,
      '3 conos por grupo, 1 balón', 'Triángulo de 8 m',
      'Grupos de 3-4. Pase, control orientado y pase al siguiente cono; cada uno sigue a su pase.',
      ['Pase, control orientado y pase', 'Sigue a tu pase', 'Cambio de sentido cada 2 minutos'],
      ['Control con el pie alejado obligatorio', 'A un toque'],
      ['Perfílate antes de recibir', 'Controla hacia el siguiente cono', 'Pase tenso']),
    E('b-t04', 'tecnica', 'tecnico', 'Pared y finalización', ['pase', 'finalizacion'], rango('benjamin'), 15,
      'Portería, balones, conos, portero', 'Frontal del área',
      'El jugador conduce, hace pared con un compañero en la frontal y remata.',
      ['Conduce, pared con el apoyo y tiro', 'El apoyo pasa a tirar', 'Máximo 2 toques tras la pared'],
      ['Pared con la pierna mala', 'Con un defensor pasivo'],
      ['Pase al pie del apoyo', 'Desmárcate después de pasar', 'Tiro colocado']),
    E('b-t05', 'tecnica', 'tecnico', 'Tiro a portería tras conducción', ['finalizacion', 'conduccion'], rango('prebenjamin'), 12,
      'Portería, balones, 4 conos', 'Slalom y portería',
      'Slalom entre 4 conos y tiro a portería desde fuera del área (8 m en fútbol 7).',
      ['Slalom entre los 4 conos y tiro', 'Se tira desde fuera del área', 'Recoge tu balón y vuelve a la fila'],
      ['Tiro con la pierna mala', 'Elegir el lado según el color que diga el entrenador'],
      ['Mira al portero antes de tirar', 'Pie de apoyo junto al balón', 'Precisión antes que fuerza']),
    E('b-t06', 'tecnica', 'tecnico', '1x1 a miniportería', ['regate', 'defensa'], rango('benjamin'), 15,
      '2 miniporterías, balones, conos', 'Campo de 10x15 m',
      'El defensor pasa al atacante y sale a defender. El atacante debe superarle y marcar.',
      ['El defensor pasa y sale a defender', 'El atacante tiene que marcar', 'Si el defensor roba, puede marcar en la otra'],
      ['6 segundos para marcar', 'Con un compañero de apoyo'],
      ['Encara con velocidad', 'Finta y cambio de ritmo', 'Defensor: de perfil y sin tirarse']),
    E('b-t07', 'tecnica', 'tecnico', 'Centros y remate', ['centros', 'finalizacion'], rango('alevin'), 15,
      'Portería, balones, conos, portero', 'Banda y área',
      'Un extremo conduce por banda y centra; dos rematadores atacan el primer y segundo palo.',
      ['El extremo conduce y centra', 'Dos rematadores: primer y segundo palo', 'Cambio de banda a mitad'],
      ['Centro tras una pared', 'Con un defensor'],
      ['Levanta la cabeza antes de centrar', 'Llega al primer palo de fuera a dentro', 'Remata hacia abajo']),
    E('b-t08', 'tecnica', 'tecnico', 'Rueda de pases en cuadrado', ['pase', 'control'], rango('alevin'), 12,
      '4 conos, 2 balones', 'Cuadrado de 10 m',
      'Jugadores en cada esquina. Pase y sigue tu pase, con dos balones a la vez.',
      ['Pasa y sigue tu pase', 'Dos balones a la vez', 'Pase raso'],
      ['Cambiar de sentido', 'Pase con la pierna mala'],
      ['Pasa al pie bueno del compañero', 'Control orientado', 'Comunicación']),
    E('b-t09', 'tecnica', 'tecnico', 'Control y pase bajo presión', ['control', 'pase'], rango('infantil'), 12,
      'Conos, balones, petos', 'Zona de 15x10 m',
      'Grupos de 3: el del centro recibe con un defensor a la espalda, se perfila y descarga al otro lado.',
      ['Grupos de 3', 'El del centro recibe con un defensor detrás', 'Descarga al lado contrario'],
      ['Defensor activo', 'Descarga a un toque'],
      ['Mira antes de recibir', 'Perfil abierto', 'Protege con el cuerpo']),
    E('b-t10', 'tecnica', 'tactico', 'Finalización en 2x1', ['finalizacion', 'pase'], rango('alevin'), 15,
      'Portería, balones, petos, portero', 'Medio campo',
      'Dos atacantes contra un defensor desde medio campo. Tomar la decisión correcta.',
      ['2 atacantes contra 1 defensor', '8 segundos para finalizar', 'Si el defensor roba, sale conduciendo'],
      ['3 contra 2', 'Gol de primeras vale doble'],
      ['Fija al defensor y pasa', 'Si hay espacio, encara', 'Ataca el rechace']),
    E('b-t11', 'tecnica', 'tecnico', 'Juego de cabeza', ['control', 'finalizacion'], rango('infantil'), 10,
      'Balones blandos', 'Por parejas',
      'Uno lanza con la mano y el otro devuelve de cabeza. Después, remate a portería tras centro.',
      ['Uno lanza con la mano y el otro devuelve de cabeza', '10 repeticiones y cambio', 'Balón blando o poco inflado'],
      ['Remate a portería tras centro con la mano', 'Remate en salto'],
      ['Ojos abiertos', 'Golpea con la frente', 'Cuello firme']),
    E('b-t12', 'tecnica', 'tecnico', 'Golpeo en largo y control', ['pase', 'control'], rango('infantil'), 12,
      'Balones, conos', 'Parejas a 25-30 m',
      'Cambios de orientación con empeine o interior y control con el primer toque.',
      ['Parejas a 25-30 m', 'Golpeo largo', 'Control con un toque'],
      ['Con la pierna mala', 'Balón al espacio para que el compañero corra'],
      ['Pie de apoyo al lado del balón', 'Golpea con el empeine', 'Amortigua el control']),
    E('b-t13', 'tecnica', 'tecnico', 'Porteros: blocajes y caídas', ['defensa'], rango('benjamin'), 15,
      'Balones, portería, colchoneta (opcional)', 'Portería',
      'Específico de porteros: blocajes a media altura, caídas laterales y despejes con los puños.',
      ['Pocas repeticiones y bien hechas', 'Empezar de rodillas', 'Descanso entre series'],
      ['Caída tras desplazamiento', 'Despejes con los puños'],
      ['Manos en W', 'Cae de lado, nunca de frente', 'Ataca el balón']),

    // ===== TÁCTICA =====
    E('b-k02', 'tactica', 'tactico', 'Posesión 4x4 + 2 comodines', ['posesion', 'pase'], rango('alevin'), 15,
      'Conos, petos de 3 colores, balones', 'Cuadrado de 25x25 m',
      'Dos equipos de 4 y dos comodines que juegan con quien tiene el balón.',
      ['10 pases seguidos: punto', 'Los comodines juegan con quien tiene el balón', 'Máximo 3 toques'],
      ['Máximo 2 toques', 'Comodines a un toque'],
      ['Amplitud y profundidad', 'Apoyos cerca y lejos', 'Tras perder, presiona']),
    E('b-k03', 'tactica', 'tactico', 'Salida de balón desde el portero', ['salida', 'pase'], rango('alevin'), 18,
      'Portería, conos, petos, balones', 'Medio campo',
      'El portero inicia; defensas abiertos y un medio de apoyo contra 2-3 presionadores.',
      ['Inicia siempre el portero', '2-3 jugadores presionan', 'Superar la línea conduciendo o pasando: punto'],
      ['Un presionador más', 'Límite de 10 segundos'],
      ['Defensas abiertos', 'El portero es uno más', 'Busca al jugador libre'],
      ['presion-alta']),
    E('b-k04', 'tactica', 'tactico', 'Presión tras pérdida (5 segundos)', ['presion', 'transicion'], rango('alevin'), 15,
      'Conos, petos, balones', 'Campo de 30x25 m',
      'Partido 5x5. Si un equipo pierde el balón y lo recupera en menos de 5 segundos, suma un punto extra.',
      ['Partido 5x5', 'Recuperar en menos de 5 segundos: punto extra', 'Saque de banda con el pie'],
      ['Solo 3 segundos', 'Superioridad para el equipo que presiona'],
      ['Reacciona al instante', 'Cierra las líneas de pase', 'Ve a por el balón en grupo'],
      ['contraataque', 'posesion']),
    E('b-k05', 'tactica', 'tactico', 'Presión alta coordinada', ['presion', 'defensa'], rango('infantil'), 18,
      'Portería, conos, petos', 'Medio campo',
      'El rival saca desde su portero con 4-5 jugadores; nuestros 3-4 atacantes presionan.',
      ['El rival saca desde su portero', 'Presionan 3-4 de los nuestros', 'Robar en campo rival: punto'],
      ['El entrenador da la señal para presionar', 'Un comodín para el rival'],
      ['Orienta hacia la banda', 'Saltad a la vez', 'Cierra al pivote'],
      ['posesion']),
    E('b-k06', 'tactica', 'tactico', 'Ataque contra defensa cerrada', ['posesion', 'finalizacion', 'centros'], rango('alevin'), 18,
      'Portería, conos, petos, balones', 'Área ampliada',
      'Seis atacantes contra cinco defensores encerrados en su área ampliada.',
      ['6 atacantes contra 5 defensores', 'Gol de centro o tras pared vale doble', '30 segundos por ataque'],
      ['Los defensores contraatacan a miniporterías', 'Menos tiempo por ataque'],
      ['Paciencia', 'Cambios de orientación', 'Llegada desde segunda línea'],
      ['bloque-bajo']),
    E('b-k07', 'tactica', 'tactico', 'Defensa de balones largos', ['defensa', 'control'], rango('infantil'), 15,
      'Balones, conos, petos', 'Tercio defensivo',
      'Un lanzador envía balones largos; dos defensores contra un delantero disputan el balón.',
      ['Un lanzador envía balones largos', '2 defensores contra 1 delantero', 'El delantero puntúa si controla'],
      ['2 contra 2', 'Segunda jugada con otro atacante'],
      ['Uno va al choque y el otro cubre', 'Perfil defensivo', 'Comunicación'],
      ['juego-directo', 'fisico']),
    E('b-k08', 'tactica', 'tactico', 'Repliegue y defensa de contraataque', ['defensa', 'transicion'], rango('alevin'), 15,
      'Portería, conos, petos', 'Campo de 40 m',
      'Atacamos 4x3; al perder, el rival sale 3x2 hacia nuestra portería.',
      ['Atacamos 4 contra 3', 'Al perder, el rival sale 3 contra 2', 'Repliegue por dentro'],
      ['El rival sale con un jugador más', 'Límite de tiempo para su ataque'],
      ['Corre hacia tu portería, no hacia el balón', 'Temporiza', 'No te tires al suelo'],
      ['contraataque']),
    E('b-k09', 'tactica', 'tactico', 'Defensa en banda (2x2)', ['defensa', 'centros'], rango('alevin'), 15,
      'Conos, portería, petos', 'Pasillo lateral de 15 m',
      'Extremo y lateral rivales contra nuestro lateral y extremo. Evitar el centro.',
      ['2 contra 2 en el pasillo', 'Si centran, los defensores del área atacan el balón', 'Cambio de roles cada 3 minutos'],
      ['Con un rematador rival', 'Defender en inferioridad'],
      ['Orienta hacia fuera', 'Ayudas', 'No le dejes su perfil bueno'],
      ['bandas']),
    E('b-k10', 'tactica', 'tactico', 'Balón parado defensivo', ['balon-parado', 'defensa'], rango('alevin'), 12,
      'Portería, balones, petos', 'Área',
      'Córners y faltas laterales: marcas asignadas, poste y jugador en el rechace.',
      ['Córners y faltas laterales', 'Cada uno con su marca o su zona', 'Siempre un jugador en el rechace'],
      ['Marcaje por zonas contra individual', 'El rival hace bloqueos'],
      ['Cada uno sabe su sitio', 'Ataca el balón', 'Sal rápido tras despejar'],
      ['balon-parado', 'fisico']),
    E('b-k11', 'tactica', 'tactico', 'Balón parado ofensivo', ['balon-parado', 'finalizacion'], rango('alevin'), 12,
      'Portería, balones, conos', 'Área',
      'Dos jugadas ensayadas de córner y una de falta frontal.',
      ['Dos córners ensayados y una falta', 'Cada jugada tiene un nombre', 'Rotar a los lanzadores'],
      ['Con defensa activa', 'Añadir una jugada de saque de banda'],
      ['Movimientos de arrastre', 'Llega desde atrás', 'Canta la jugada']),
    E('b-k15', 'tactica', 'tactico', 'Tres zonas: superar líneas', ['salida', 'posesion', 'pase'], rango('infantil'), 18,
      'Conos para 3 zonas, petos, balones', 'Campo dividido en 3 zonas',
      'Hay que pasar por la zona media antes de llegar al ataque: nada de pelotazo.',
      ['Pasar por la zona media antes de atacar', 'Prohibido el pelotazo', 'Gol: punto'],
      ['Un jugador puede cambiar de zona', 'Límite de toques'],
      ['Pausa', 'Busca al hombre libre', 'Apoyos entre líneas'],
      ['presion-alta', 'juego-directo']),
    E('b-k16', 'tactica', 'tactico', 'Superioridad 2x1 a portería', ['finalizacion', 'pase'], rango('prebenjamin', 'benjamin'), 12,
      'Portería pequeña, balones, petos', 'Zona de 15x20 m',
      'Dos atacan contra uno. Aprenden cuándo pasar y cuándo conducir.',
      ['Dos atacan contra uno', 'Si el defensor roba, conduce hasta la línea', 'Rotar los papeles'],
      ['3 contra 2', 'Con portero'],
      ['Si te cierran, pasa', 'Si hay espacio, conduce', 'Ayuda a tu compañero']),
    E('b-k17', 'tactica', 'tactico', 'Atacamos juntos, defendemos juntos', ['transicion', 'defensa'], rango('prebenjamin', 'alevin'), 12,
      'Portería, balones, petos', 'Zona de 20x25 m',
      'Oleadas de 3 atacantes contra 2 defensores. Al terminar, los atacantes pasan a defender.',
      ['3 atacantes contra 2 defensores', 'Al acabar, los atacantes defienden la siguiente oleada', 'Gol: punto'],
      ['2 contra 2', 'Con portero'],
      ['Ocupad todo el ancho', 'Defensores: juntos y hacia el balón', 'Termina rápido']),

    // ===== JUEGO REDUCIDO =====
    E('b-k01', 'juego', 'juego', 'Partido 3x3 a 4 porterías', ['posesion', 'transicion'], rango('prebenjamin', 'alevin'), 15,
      '4 miniporterías o puertas de conos, petos, balones', 'Campo de 20x25 m',
      'Dos porterías por equipo. Obliga a cambiar el juego hacia donde hay espacio.',
      ['Dos porterías por equipo', 'Partidos de 3 minutos', 'Saque desde la línea'],
      ['Gol tras cambio de orientación vale doble', 'Con un comodín'],
      ['Ataca la portería libre', 'Amplitud', 'Defended juntos']),
    E('b-t14', 'juego', 'juego', 'Robo de balones (la granja)', ['conduccion', 'defensa'], rango('prebenjamin', 'benjamin'), 10,
      'Muchos balones, 4 aros o zonas', '4 zonas en un cuadrado de 25x25 m',
      'Cuatro equipos llevan balones a su "granja". Cuando no quedan en el centro, roban de otras granjas.',
      ['Lleva los balones conduciendo a tu granja', 'Un balón cada vez', 'Cuando el centro se vacía, se roba de otras granjas'],
      ['Solo con la pierna mala', 'Un defensor protege cada granja'],
      ['Conduce rápido pero controlado', 'Mira dónde hay balones', 'Ayuda a tu equipo']),
    E('b-k12', 'juego', 'juego', 'Partido condicionado a 2 toques', ['pase', 'posesion'], rango('alevin'), 15,
      'Petos, porterías, balones', 'Campo de 40x30 m',
      'Partido normal pero con un máximo de 2 toques por jugador.',
      ['Máximo 2 toques', 'Saque rápido', 'Partidos de 5 minutos'],
      ['Un toque en campo propio', 'Gol de primeras vale doble'],
      ['Apoyos constantes', 'Juega rápido', 'Mira antes de recibir'],
      ['presion-alta', 'fisico']),
    E('b-k13', 'juego', 'juego', 'Partido libre', ['transicion', 'finalizacion'], TODAS, 15,
      'Petos, porterías, balones', 'Formato de la categoría',
      'Partido en el formato de la categoría. El entrenador interviene poco.',
      ['Formato de la categoría', 'El entrenador interviene poco', 'Se refuerza lo trabajado en la sesión'],
      ['Gol con la pierna mala vale doble', 'Un jugador más para quien vaya perdiendo'],
      ['Disfruta', 'Aplica lo entrenado', 'Juego limpio']),
    E('b-k14', 'juego', 'juego', 'Superioridad por bandas', ['centros', 'pase'], rango('alevin'), 15,
      'Portería, conos, petos', 'Campo con dos pasillos laterales',
      'Partido con dos pasillos laterales donde no se puede defender (comodines de banda).',
      ['En los pasillos no se defiende', 'Gol tras centro vale doble', 'Partidos de 4 minutos'],
      ['Comodines de banda a 2 toques', 'Un defensor puede entrar al pasillo tras el pase'],
      ['Busca el 2x1 por fuera', 'Centra al espacio', 'Llegad al área 2 o 3'],
      ['bloque-bajo']),
    E('b-j01', 'juego', 'juego', 'Partido 6x6 con zonas de finalización', ['finalizacion', 'transicion'], rango('infantil'), 18,
      'Porterías, conos, petos', 'Campo de 50x35 m',
      'Solo se puede marcar desde la zona de finalización marcada con conos.',
      ['Gol solo desde la zona de finalización', 'Fuera de la zona, máximo 3 toques', 'Partidos de 6 minutos'],
      ['Gol de cabeza vale doble', 'Comodín ofensivo'],
      ['Llega a la zona con ventaja', 'Desmarques de ruptura', 'Presiona tras pérdida'],
      ['bloque-bajo']),
    E('b-j02', 'juego', 'juego', 'Partido con comodines interiores', ['posesion', 'pase'], rango('alevin'), 15,
      'Porterías, petos de 3 colores', 'Campo de 35x25 m',
      '4x4 con dos comodines dentro que juegan con el equipo que tiene el balón.',
      ['4 contra 4 con 2 comodines dentro', 'Comodines a 2 toques', 'Gol tras pase de un comodín vale doble'],
      ['Comodines a un toque', 'Sin comodines los últimos 3 minutos'],
      ['Encuentra al comodín entre líneas', 'Perfílate', 'Ocupa los espacios'],
      ['posesion']),
    E('b-j03', 'juego', 'juego', 'El rey de la pista (3 equipos)', ['transicion', 'finalizacion'], rango('benjamin'), 15,
      'Porterías, petos de 3 colores', 'Campo de 25x20 m',
      'Juegan dos equipos y el tercero espera. El que marca se queda en la pista.',
      ['Tres equipos', 'El que marca se queda; el que encaja sale', 'Partidos a un gol o 2 minutos'],
      ['Gol con la pierna mala vale doble', 'Equipos de 4'],
      ['Intensidad', 'Transición rápida', 'Anima a tu equipo']),

    // ===== VUELTA A LA CALMA =====
    E('b-v01', 'vuelta', 'fisico', 'Estiramientos guiados', ['coordinacion'], rango('infantil'), 8,
      'Ninguno', 'En círculo',
      'Estiramientos suaves de cuádriceps, isquios, aductores, gemelos y glúteo.',
      ['20-30 segundos por estiramiento', 'Sin rebotes', 'En círculo'],
      ['Por parejas', 'Los dirige un jugador'],
      ['Respira tranquilo', 'Sin dolor', 'Comentamos la sesión']),
    E('b-v02', 'vuelta', 'tecnico', 'Rondo suave y charla', ['pase'], TODAS, 8,
      'Balones', 'Círculo de 10 m',
      'Rondo grande y relajado sin defensor. Después, en círculo, 2-3 preguntas sobre la sesión.',
      ['Rondo grande sin defensor', 'A un toque', 'Al final, 2-3 preguntas sobre la sesión'],
      ['Quien falla responde una pregunta', 'Con la pierna mala'],
      ['Ritmo tranquilo', 'Pase preciso', 'Escucha']),
    E('b-v03', 'vuelta', 'tecnico', 'Juego de puntería', ['pase'], rango('prebenjamin', 'benjamin'), 8,
      'Conos, balones', 'Líneas a 6-8 m',
      'Desde 6-8 m, intentar derribar conos con un pase raso.',
      ['Derribar conos con un pase raso', 'Por turnos', 'Al final, todos recogen el material'],
      ['Más distancia', 'Con la pierna mala'],
      ['Golpea con el interior', 'Mira el objetivo', 'Con calma']),
    E('b-v04', 'vuelta', 'fisico', 'Movilidad y respiración', ['coordinacion'], rango('cadete'), 10,
      'Esterillas (opcional)', 'Zona tranquila',
      'Movilidad de cadera y columna, estiramientos de flexores y respiración diafragmática.',
      ['Movilidad de cadera y columna', 'Respiración diafragmática', 'En silencio'],
      ['Sobre esterilla', 'Lo dirige un jugador'],
      ['Movimientos lentos', 'Respira por la nariz', 'Hombros relajados']),
    E('b-v05', 'vuelta', 'juego', 'La estatua', ['coordinacion'], rango('prebenjamin', 'benjamin'), 6,
      'Ninguno', 'Todo el campo',
      'Caminan por el campo y a la señal se quedan como estatuas imitando una posición de futbolista.',
      ['Caminar por el campo', 'A la señal, estatua de futbolista', 'El entrenador elige la mejor'],
      ['Estatuas por parejas', 'Imitar a un jugador famoso'],
      ['Baja el ritmo', 'Equilibrio', 'Sonríe']),
    E('b-v06', 'vuelta', 'juego', 'Penaltis de despedida', ['finalizacion'], rango('prebenjamin', 'alevin'), 8,
      'Portería, balones', 'Área',
      'Tanda de penaltis tranquila; cada jugador tira uno.',
      ['Cada jugador tira uno', 'Quien marca elige al siguiente', 'Ritmo tranquilo'],
      ['Con la pierna mala', 'El portero va rotando'],
      ['Elige el lado antes', 'Pie de apoyo firme', 'Celebra con el equipo']),
  ];

  // Normaliza un ejercicio propio (por si le faltan listas)
  const propio = (e) => ({ reglas: [], variantes: [], consignas: [], objetivos: [], tipo: 'tecnico', ...e, propio: true });

  return {
    PARTES, TIPOS, OBJETIVOS, FOCOS_TACTICOS, ESTILOS_RIVAL, ORDEN,
    PRECARGADOS,

    // Todos los ejercicios: los precargados + los creados en los equipos
    todos() {
      return PRECARGADOS.concat(DB.lista('ejercicios').map(propio));
    },
    obtener(id) {
      return this.todos().find((e) => e.id === id);
    },
    parte(id) { return PARTES.find((p) => p.id === id) || PARTES[0]; },
    tipo(id) { return TIPOS.find((t) => t.id === id) || TIPOS[0]; },
    objetivo(id) { return OBJETIVOS.find((o) => o.id === id) || { id, nombre: id }; },
    estilo(id) { return ESTILOS_RIVAL.find((o) => o.id === id) || { id, nombre: id }; },

    // Ejercicios adecuados para una categoría (y opcionalmente para un bloque).
    // Los propios: solo los del equipo activo, que ya son de su categoría.
    para(categoria, parte) {
      const equipoId = DB.equipo()?.id;
      return this.todos().filter((e) =>
        (e.propio ? e.equipoId === equipoId : !categoria || (e.categorias || TODAS).includes(categoria)) &&
        (!parte || e.parte === parte));
    },

    // Objetivos que tienen algún ejercicio para esta categoría
    objetivosPara(categoria) {
      const ej = this.para(categoria);
      return OBJETIVOS.filter((o) => ej.some((e) => (e.objetivos || []).includes(o.id)));
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
