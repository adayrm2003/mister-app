// 10 ejercicios de ejemplo ya animados para que la biblioteca no empiece vacía.
// Posiciones en % del campo visible (medio campo: la portería rival arriba, el centro abajo).
import type { Ejercicio, Flecha, Pieza, Pizarra, TipoFlecha, TipoPieza } from "./pizarra";

type P = [number, number];
type DefPieza = [TipoPieza, string | null, number, number, number?];
type DefPaso = { mover?: Record<number, P>; flechas?: [TipoFlecha, P, P][] };

function pizarra(campo: "medio" | "completo", piezas: DefPieza[], pasos: DefPaso[]): Pizarra {
  const ids = piezas.map(() => crypto.randomUUID());
  const lista: Pieza[] = piezas.map(([tipo, etiqueta, , , giro], i) => ({ id: ids[i], tipo, ...(etiqueta ? { etiqueta } : {}), ...(giro ? { giro } : {}) }));
  const flechas = (d?: [TipoFlecha, P, P][]): Flecha[] => (d ?? []).map(([tipo, a, b]) => ({ id: crypto.randomUUID(), tipo, desde: { x: a[0], y: a[1] }, hasta: { x: b[0], y: b[1] } }));
  const inicial = Object.fromEntries(piezas.map(([, , x, y], i) => [ids[i], { x, y }]));
  return {
    campo,
    piezas: lista,
    pasos: pasos.map((p, k) => ({
      posiciones: k === 0 ? inicial : Object.fromEntries(Object.entries(p.mover ?? {}).map(([i, [x, y]]) => [ids[Number(i)], { x, y }])),
      flechas: flechas(p.flechas)
    }))
  };
}

type Datos = Omit<Ejercicio, "id" | "pizarra" | "actualizado" | "notas">;
const ej = (d: Datos, p: Pizarra): Ejercicio => ({ ...d, notas: "", id: crypto.randomUUID(), pizarra: p, actualizado: new Date().toISOString() });

export function ejerciciosDeEjemplo(): Ejercicio[] {
  return [
    ej({ nombre: "Rondo 4 contra 2", tipo: "calentamiento", objetivo: "Pase rápido a uno o dos toques y apoyos para dar línea de pase.", duracion: 10, jugadores: 6, material: "4 conos, 1 balón, 2 petos",
      explicacion: "Cuatro jugadores por fuera del cuadrado mueven el balón y dos defienden dentro. Si un defensor toca el balón, cambia con quien perdió el pase." },
      pizarra("medio", [
        ["cono", null, 30, 40], ["cono", null, 70, 40], ["cono", null, 70, 72], ["cono", null, 30, 72],
        ["jugador", "1", 50, 38], ["jugador", "2", 72, 56], ["jugador", "3", 50, 74], ["jugador", "4", 28, 56],
        ["rival", "1", 46, 52], ["rival", "2", 56, 58], ["balon", null, 50, 42]
      ], [
        { flechas: [["pase", [50, 42], [68, 55]]] },
        { mover: { 10: [68, 56], 8: [58, 50], 9: [60, 63] }, flechas: [["pase", [68, 56], [52, 70]]] },
        { mover: { 10: [50, 70], 8: [50, 60], 9: [42, 63] }, flechas: [["pase", [50, 70], [32, 56]]] },
        { mover: { 10: [32, 56], 8: [40, 51], 9: [44, 63] } }
      ])),

    ej({ nombre: "Conducción en zigzag", tipo: "tecnica", objetivo: "Conducir con las dos piernas cambiando de dirección sin perder el balón.", duracion: 10, jugadores: 1, material: "5 conos por fila, 1 balón por jugador",
      explicacion: "Conducir entre los conos usando el interior y el exterior del pie. Al salir del último cono, tiro a portería." },
      pizarra("medio", [
        ["cono", null, 42, 80], ["cono", null, 58, 68], ["cono", null, 42, 56], ["cono", null, 58, 44],
        ["jugador", "1", 50, 93], ["balon", null, 50, 89]
      ], [
        { flechas: [["conduccion", [50, 89], [56, 76]]] },
        { mover: { 4: [55, 80], 5: [56, 76] }, flechas: [["conduccion", [56, 76], [44, 64]]] },
        { mover: { 4: [45, 68], 5: [44, 64] }, flechas: [["conduccion", [44, 64], [56, 52]]] },
        { mover: { 4: [55, 56], 5: [56, 52] }, flechas: [["conduccion", [56, 52], [48, 38]]] },
        { mover: { 4: [49, 42], 5: [48, 38] }, flechas: [["pase", [48, 38], [50, 4]]] },
        { mover: { 5: [50, 4] } }
      ])),

    ej({ nombre: "Pared y tiro", tipo: "tecnica", objetivo: "Combinar con un compañero para superar a un defensor y terminar en gol.", duracion: 15, jugadores: 4, material: "1 portería, balones",
      explicacion: "El 1 pasa al 2 y arranca al espacio. El 2 devuelve de primeras por detrás del defensor y el 1 remata." },
      pizarra("medio", [
        ["jugador", "1", 35, 62], ["jugador", "2", 62, 45], ["rival", "4", 45, 45], ["rival", "P", 50, 8], ["balon", null, 37, 58]
      ], [
        { flechas: [["pase", [37, 58], [59, 47]], ["movimiento", [35, 62], [40, 34]]] },
        { mover: { 4: [59, 47], 0: [40, 34], 2: [44, 50] }, flechas: [["pase", [59, 47], [43, 32]]] },
        { mover: { 4: [43, 32], 2: [42, 44] }, flechas: [["pase", [43, 32], [55, 5]]] },
        { mover: { 4: [56, 4], 3: [43, 8] } }
      ])),

    ej({ nombre: "Activación por carriles", tipo: "calentamiento", objetivo: "Subir pulsaciones y preparar el cuerpo con carreras cortas.", duracion: 8, jugadores: 4, material: "8 conos",
      explicacion: "Cada jugador en su carril: ida en carrera suave, vuelta con desplazamiento lateral. Cada vuelta se sube un poco el ritmo." },
      pizarra("medio", [
        ["cono", null, 20, 86], ["cono", null, 40, 86], ["cono", null, 60, 86], ["cono", null, 80, 86],
        ["cono", null, 20, 40], ["cono", null, 40, 40], ["cono", null, 60, 40], ["cono", null, 80, 40],
        ["jugador", "1", 20, 92], ["jugador", "2", 40, 92], ["jugador", "3", 60, 92], ["jugador", "4", 80, 92]
      ], [
        { flechas: [["movimiento", [20, 88], [20, 46]], ["movimiento", [40, 88], [40, 46]], ["movimiento", [60, 88], [60, 46]], ["movimiento", [80, 88], [80, 46]]] },
        { mover: { 8: [20, 44], 9: [40, 44], 10: [60, 44], 11: [80, 44] }, flechas: [["movimiento", [24, 48], [24, 88]], ["movimiento", [44, 48], [44, 88]], ["movimiento", [64, 48], [64, 88]], ["movimiento", [84, 48], [84, 88]]] },
        { mover: { 8: [20, 92], 9: [40, 92], 10: [60, 92], 11: [80, 92] } }
      ])),

    ej({ nombre: "Posesión 4 contra 4", tipo: "tactica", objetivo: "Mantener el balón ocupando bien el espacio y ofreciendo apoyos.", duracion: 15, jugadores: 8, material: "4 conos, petos de 2 colores, balones",
      explicacion: "Gana un punto el equipo que da 6 pases seguidos. Si roba el otro equipo, empieza a contar él." },
      pizarra("medio", [
        ["cono", null, 15, 25], ["cono", null, 85, 25], ["cono", null, 85, 88], ["cono", null, 15, 88],
        ["jugador", "1", 25, 35], ["jugador", "2", 75, 35], ["jugador", "3", 75, 76], ["jugador", "4", 25, 76],
        ["rival", "1", 40, 45], ["rival", "2", 62, 45], ["rival", "3", 60, 66], ["rival", "4", 40, 66], ["balon", null, 28, 38]
      ], [
        { flechas: [["pase", [28, 38], [72, 36]]] },
        { mover: { 12: [72, 36], 9: [66, 40], 10: [66, 58] }, flechas: [["pase", [72, 36], [74, 72]], ["movimiento", [25, 76], [38, 58]]] },
        { mover: { 12: [74, 72], 7: [38, 58], 10: [68, 66], 11: [48, 66] }, flechas: [["pase", [74, 72], [40, 60]]] },
        { mover: { 12: [40, 60], 11: [44, 64], 8: [36, 50] } }
      ])),

    ej({ nombre: "Salida de balón desde el portero", tipo: "tactica", objetivo: "Sacar el balón jugado desde atrás aunque el rival presione.", duracion: 20, jugadores: 9, material: "1 portería, petos, balones",
      explicacion: "El portero abre a un central, que conduce para atraer al delantero rival. El lateral se ofrece por fuera y recibe para progresar." },
      pizarra("completo", [
        ["jugador", "1", 50, 94], ["jugador", "4", 28, 86], ["jugador", "5", 72, 86], ["jugador", "6", 50, 76], ["jugador", "2", 12, 74], ["jugador", "3", 88, 74],
        ["rival", "9", 40, 80], ["rival", "10", 60, 80], ["rival", "8", 50, 66], ["balon", null, 50, 91]
      ], [
        { flechas: [["pase", [50, 91], [29, 84]]] },
        { mover: { 9: [29, 84], 6: [33, 82] }, flechas: [["conduccion", [29, 84], [29, 72]], ["movimiento", [12, 74], [12, 60]], ["movimiento", [50, 76], [44, 64]]] },
        { mover: { 1: [28, 75], 9: [29, 72], 4: [12, 60], 3: [44, 64], 6: [32, 74], 8: [46, 60] }, flechas: [["pase", [29, 72], [14, 61]]] },
        { mover: { 9: [14, 61], 7: [20, 64] } }
      ])),

    ej({ nombre: "Centro y remate", tipo: "tactica", objetivo: "Llegar por banda y atacar el área con dos rematadores.", duracion: 15, jugadores: 5, material: "1 portería, balones",
      explicacion: "El extremo conduce hasta línea de fondo y centra. Un delantero ataca el primer palo y otro el segundo." },
      pizarra("medio", [
        ["jugador", "7", 85, 46], ["jugador", "9", 45, 40], ["jugador", "11", 62, 50], ["rival", "4", 50, 30], ["rival", "P", 50, 8], ["balon", null, 82, 46]
      ], [
        { flechas: [["conduccion", [82, 46], [86, 18]], ["movimiento", [45, 40], [56, 18]], ["movimiento", [62, 50], [40, 24]]] },
        { mover: { 0: [89, 20], 5: [86, 18], 1: [56, 18], 2: [40, 24], 3: [52, 22] }, flechas: [["pase", [86, 18], [57, 16]]] },
        { mover: { 5: [57, 16], 4: [55, 8] }, flechas: [["pase", [57, 16], [44, 4]]] },
        { mover: { 5: [44, 4], 4: [52, 7] } }
      ])),

    ej({ nombre: "Velocidad de reacción", tipo: "fisico", objetivo: "Reaccionar rápido a una señal y acelerar en pocos metros.", duracion: 10, jugadores: 2, material: "4 conos, silbato",
      explicacion: "Los dos jugadores esperan de espaldas. Al silbato se giran y esprintan hasta la línea de conos. Gana el primero en llegar." },
      pizarra("medio", [
        ["cono", null, 20, 82], ["cono", null, 80, 82], ["cono", null, 20, 32], ["cono", null, 80, 32],
        ["jugador", "1", 38, 86], ["jugador", "2", 62, 86]
      ], [
        { flechas: [["movimiento", [38, 82], [38, 36]], ["movimiento", [62, 82], [62, 36]]] },
        { mover: { 4: [38, 32], 5: [62, 34] } }
      ])),

    ej({ nombre: "1 contra 1 con portero", tipo: "tecnica", objetivo: "Superar al defensor con un regate y definir ante el portero.", duracion: 15, jugadores: 3, material: "1 portería, balones",
      explicacion: "El atacante sale conduciendo y busca superar al defensor por un lado. Si lo supera, termina con tiro. Se cambian los papeles cada vez." },
      pizarra("medio", [
        ["jugador", "9", 50, 62], ["rival", "4", 50, 40], ["rival", "P", 50, 8], ["balon", null, 50, 58]
      ], [
        { flechas: [["conduccion", [50, 58], [38, 38]], ["movimiento", [50, 40], [43, 36]]] },
        { mover: { 0: [39, 42], 3: [38, 38], 1: [44, 35] }, flechas: [["conduccion", [38, 38], [42, 20]]] },
        { mover: { 0: [41, 24], 3: [42, 20], 1: [46, 28], 2: [46, 9] }, flechas: [["pase", [42, 20], [57, 4]]] },
        { mover: { 3: [57, 4], 2: [48, 7] } }
      ])),

    ej({ nombre: "Partido 3 contra 3 a miniporterías", tipo: "partido", objetivo: "Jugar con muchas acciones de ataque y defensa en poco espacio.", duracion: 20, jugadores: 6, material: "2 porterías pequeñas, petos, balones",
      explicacion: "Partido libre en un campo pequeño. Se puede pedir un número máximo de toques o que el gol valga doble tras pared." },
      pizarra("medio", [
        ["porteria", null, 50, 12], ["porteria", null, 50, 92, 180],
        ["jugador", "1", 35, 72], ["jugador", "2", 65, 70], ["jugador", "3", 50, 56],
        ["rival", "1", 35, 30], ["rival", "2", 65, 30], ["rival", "3", 50, 44], ["balon", null, 50, 59]
      ], [
        { flechas: [["pase", [50, 59], [63, 67]]] },
        { mover: { 8: [63, 67], 6: [60, 52], 7: [52, 50] }, flechas: [["conduccion", [63, 67], [66, 40]], ["movimiento", [50, 56], [40, 34]]] },
        { mover: { 3: [66, 44], 8: [66, 40], 4: [40, 34], 6: [62, 36] }, flechas: [["pase", [66, 40], [52, 15]]] },
        { mover: { 8: [52, 14] } }
      ]))
  ];
}
