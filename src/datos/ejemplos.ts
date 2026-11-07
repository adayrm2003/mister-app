// 10 ejercicios de ejemplo, sin dibujo y bien explicados, para que la biblioteca no empiece vacía.
// Cada entrenador puede dibujarlos en la pizarra si quiere (Editar).
import { pizarraVacia, type Ejercicio } from "./pizarra";

type Datos = Omit<Ejercicio, "id" | "pizarra" | "actualizado" | "notas">;
const ej = (d: Datos): Ejercicio => ({ ...d, notas: "", id: crypto.randomUUID(), pizarra: pizarraVacia(), actualizado: new Date().toISOString() });

export function ejerciciosDeEjemplo(): Ejercicio[] {
  return [
    ej({
      nombre: "Rondo 4 contra 2", tipo: "calentamiento", duracion: 10, jugadores: 6, material: "4 conos, 1 balón, 2 petos",
      objetivo: "Pase rápido a uno o dos toques y apoyos para dar siempre una línea de pase.",
      explicacion:
        "Organización: cuadrado de 10 × 10 metros marcado con 4 conos. Cuatro jugadores por fuera, uno en cada lado, y dos defensores con peto dentro.\n" +
        "Desarrollo: los de fuera se pasan el balón sin que lo toquen los de dentro. Si un defensor toca el balón o el balón sale del cuadrado, el que falló cambia el puesto con el defensor que lleva más tiempo dentro.\n" +
        "Reglas: máximo dos toques por jugador. Se cuentan los pases seguidos; 10 pases seguidos son un punto.\n" +
        "Variantes: pasar a un toque; agrandar o achicar el cuadrado; 5 contra 2 si hay muchos jugadores.\n" +
        "Consignas: perfilarse antes de recibir, moverse por la línea para ofrecer apoyo y pasar al pie más alejado del defensor."
    }),
    ej({
      nombre: "Conducción en zigzag", tipo: "tecnica", duracion: 10, jugadores: 4, material: "5 conos por fila, 1 balón por jugador, 1 portería",
      objetivo: "Conducir con las dos piernas cambiando de dirección sin perder el control del balón.",
      explicacion:
        "Organización: una fila de 5 conos separados 2 metros, en zigzag. Al final, una portería a 12 metros. Un jugador por fila y los demás esperan detrás del primer cono.\n" +
        "Desarrollo: el jugador conduce rodeando cada cono por el lado contrario al anterior. Al salir del último, tira a portería y vuelve por fuera recogiendo su balón.\n" +
        "Reglas: hay que tocar el balón al menos una vez entre cono y cono. Si un cono se cae, se vuelve a empezar.\n" +
        "Variantes: solo con la pierna mala; solo con el exterior; hacer dos filas y que sea una carrera entre ellas.\n" +
        "Consignas: balón pegado al pie, mirar arriba entre cono y cono y acelerar en la salida del último."
    }),
    ej({
      nombre: "Pared y tiro", tipo: "tecnica", duracion: 15, jugadores: 6, material: "1 portería, balones, 3 conos",
      objetivo: "Combinar con un compañero para superar a un defensor y terminar en gol.",
      explicacion:
        "Organización: frente al área. Un cono en la frontal hace de defensor (o un jugador que solo puede moverse de lado). El atacante 1 sale con balón desde 25 metros; el atacante 2 espera a un lado del cono. Un portero.\n" +
        "Desarrollo: el 1 conduce, pasa al 2 y arranca hacia el espacio por detrás del defensor. El 2 le devuelve de primeras y el 1 remata. Después, el 1 pasa a ser el que devuelve y el 2 hace la fila.\n" +
        "Reglas: la devolución tiene que ser a un toque. El remate, como mucho con dos toques.\n" +
        "Variantes: el defensor puede defender de verdad; terminar con pase atrás a un tercer jugador que entra; cambiar el lado de la pared.\n" +
        "Consignas: pasar fuerte y al pie, arrancar en el momento del pase y rematar mirando la portería."
    }),
    ej({
      nombre: "Activación por carriles", tipo: "calentamiento", duracion: 8, jugadores: 12, material: "8 conos",
      objetivo: "Subir pulsaciones y preparar el cuerpo con carreras cortas y movilidad.",
      explicacion:
        "Organización: 4 carriles de 15 metros marcados con conos al principio y al final. Los jugadores repartidos en filas detrás de cada carril.\n" +
        "Desarrollo: cada jugador hace la ida con un ejercicio y la vuelta trotando suave. Orden: carrera suave, elevación de rodillas, talones al glúteo, desplazamiento lateral, abrir y cerrar cadera, y para terminar dos carreras progresivas.\n" +
        "Reglas: no se sale hasta que el compañero de delante ha llegado a la mitad del carril.\n" +
        "Variantes: añadir un balón por fila y hacer la vuelta conduciendo; terminar con un sprint de 5 metros a la señal.\n" +
        "Consignas: ir de menos a más, cuidar la postura y respirar con calma en la vuelta."
    }),
    ej({
      nombre: "Posesión 4 contra 4", tipo: "tactica", duracion: 15, jugadores: 8, material: "4 conos, petos de 2 colores, balones",
      objetivo: "Mantener el balón ocupando bien el espacio y ofreciendo apoyos al compañero.",
      explicacion:
        "Organización: cuadrado de 20 × 20 metros. Dos equipos de 4 con peto de distinto color. Balones de repuesto fuera del cuadrado.\n" +
        "Desarrollo: el equipo con balón intenta dar el máximo número de pases seguidos. El otro equipo presiona para robar. Si roba, empieza a contar él.\n" +
        "Reglas: 6 pases seguidos son un punto. No vale devolver el balón al jugador que te lo acaba de pasar. Si el balón sale, saca el equipo contrario con el pie.\n" +
        "Variantes: dos toques como máximo; añadir un comodín que juega siempre con el equipo que tiene el balón; jugar 5 contra 5.\n" +
        "Consignas: abrirse para hacer el campo grande, no estar dos jugadores en la misma línea y, al perder el balón, presionar enseguida."
    }),
    ej({
      nombre: "Salida de balón desde el portero", tipo: "tactica", duracion: 20, jugadores: 9, material: "1 portería, petos, balones, 2 miniporterías",
      objetivo: "Sacar el balón jugado desde atrás aunque el rival presione.",
      explicacion:
        "Organización: medio campo. Nuestro portero, dos centrales, dos laterales y un mediocentro contra tres delanteros rivales. Dos miniporterías en la línea del centro del campo, una a cada lado.\n" +
        "Desarrollo: el portero empieza con el balón en las manos y abre a un central. Nuestro equipo tiene que llegar jugando hasta una de las miniporterías y meter gol en ella. Si los rivales roban, atacan nuestra portería.\n" +
        "Reglas: el portero no puede despejar en largo. Los rivales solo pueden presionar cuando el portero suelta el balón.\n" +
        "Variantes: añadir un cuarto rival que presiona al mediocentro; obligar a que el balón pase por el mediocentro antes de marcar.\n" +
        "Consignas: centrales abiertos a la altura del área, laterales altos y por fuera, mediocentro de cara buscando el hueco entre los delanteros y el central que recibe conduce para atraer al rival."
    }),
    ej({
      nombre: "Centro y remate", tipo: "tactica", duracion: 15, jugadores: 7, material: "1 portería, balones, 4 conos",
      objetivo: "Llegar por banda hasta línea de fondo y atacar el área con dos rematadores.",
      explicacion:
        "Organización: medio campo con portero. Un extremo en cada banda con balones. Dos delanteros en la frontal del área. Opcional: un defensor dentro del área.\n" +
        "Desarrollo: el extremo conduce pegado a la banda hasta la línea de fondo y centra. Un delantero ataca el primer palo y el otro el segundo. Luego sale el extremo de la otra banda.\n" +
        "Reglas: el centro se hace antes del cono de línea de fondo. Los delanteros no pueden entrar al área antes de que el extremo pase el cono de tres cuartos de campo.\n" +
        "Variantes: centro raso al punto de penalti; centro desde tres cuartos sin llegar a línea de fondo; añadir un defensor y un tercer rematador que llega desde atrás.\n" +
        "Consignas: el extremo mira antes de centrar; los delanteros cruzan sus carreras y atacan el balón, no esperan a que llegue."
    }),
    ej({
      nombre: "Velocidad de reacción", tipo: "fisico", duracion: 10, jugadores: 8, material: "4 conos, silbato",
      objetivo: "Reaccionar rápido a una señal y acelerar en pocos metros.",
      explicacion:
        "Organización: dos líneas de conos separadas 10 metros. Los jugadores por parejas en la línea de salida.\n" +
        "Desarrollo: los dos jugadores de la pareja se colocan en la posición que diga el entrenador (de espaldas, sentados, tumbados boca abajo...). Al silbato, se levantan o se giran y esprintan hasta la otra línea. Gana el primero en llegar.\n" +
        "Reglas: 6 series por pareja con 45 segundos de descanso entre series, andando de vuelta.\n" +
        "Variantes: la señal es visual (el entrenador levanta un brazo); una palabra significa ir y otra quedarse quieto; terminar la carrera con un tiro.\n" +
        "Consignas: primeros pasos cortos y rápidos, brazos activos y frenar poco a poco después de la línea."
    }),
    ej({
      nombre: "1 contra 1 con portero", tipo: "tecnica", duracion: 15, jugadores: 6, material: "1 portería, balones, 2 conos",
      objetivo: "Superar al defensor con un regate y definir ante el portero.",
      explicacion:
        "Organización: frente al área. Una fila de atacantes con balón a 25 metros y una fila de defensores en la frontal. Un portero.\n" +
        "Desarrollo: el defensor pasa el balón al atacante y sale a defenderle. El atacante intenta superarle y marcar. Si el defensor roba, intenta llevar el balón hasta la línea de salida.\n" +
        "Reglas: cada duelo dura como máximo 10 segundos. Después, el atacante pasa a la fila de defensores y el defensor a la de atacantes.\n" +
        "Variantes: el atacante solo puede marcar después de un regate; el defensor sale desde un lado; jugar 2 contra 1.\n" +
        "Consignas: atacar al defensor con velocidad, cambiar de ritmo en el regate y mirar al portero antes de tirar."
    }),
    ej({
      nombre: "Partido 3 contra 3 a miniporterías", tipo: "partido", duracion: 20, jugadores: 6, material: "2 porterías pequeñas, petos, balones",
      objetivo: "Jugar con muchas acciones de ataque y defensa en poco espacio.",
      explicacion:
        "Organización: campo de 25 × 15 metros con una portería pequeña en cada fondo. Dos equipos de 3. Balones de repuesto en los laterales.\n" +
        "Desarrollo: partido libre. Cuando el balón sale, se saca con el pie desde donde salió y el entrenador mete otro balón enseguida para no parar.\n" +
        "Reglas: partidos de 4 minutos con 1 minuto de descanso. No hay porteros. El gol solo vale desde la mitad del campo rival.\n" +
        "Variantes: el gol después de una pared vale doble; máximo tres toques; jugar 4 contra 4 con un comodín.\n" +
        "Consignas: al perder el balón, presionar todos; al recuperarlo, abrirse para tener líneas de pase."
    })
  ];
}
