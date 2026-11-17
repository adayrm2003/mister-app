// Pasa todas las pruebas en el navegador (modo prueba, sin Supabase) y dice si algo falla.
// Uso: con la app en marcha (npm run dev) → npm run probar
// Necesita Playwright con Chromium instalado en el ordenador.
const { spawnSync } = require("child_process");
const path = require("path");

const PRUEBAS = [
  // [archivo, cosas que tienen que salir en el resultado]
  ["partido-y-temporada.cjs", ['"avisoMitad": "Aún no han jugado', "\"etapas\": 6", '"inicioObjetivo": "OBJETIVO DE LA SEMANA']],
  ["cambios-y-ventanas.cjs", ['"c2": "Va en la misma ventana', '"c4": "En el descanso: no gasta ninguna ventana."', '"bloqueado": true', '"c6": "Ya has usado las 3 ventanas']],
  ["resumen-informe-torneo-ayudante.cjs", ['"informeSinValoracion": true', '"daniRenombrar": 0', '"convocadosEnTodos": [\n  10,\n  10,\n  10\n ]']],
  ["estadisticas.cjs", ['"errs": []']]
];

let fallos = 0;
for (const [archivo, esperado] of PRUEBAS) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(__dirname, archivo)], { encoding: "utf8", timeout: 300000 });
  const salida = (r.stdout || "") + (r.stderr || "");
  const faltan = esperado.filter((e) => !salida.includes(e));
  const errores = /"errs": \[\s*"/.test(salida);
  const ok = r.status === 0 && !faltan.length && !errores && !/Error:|TimeoutError/.test(r.stderr || "");
  console.log(`${ok ? "✔" : "✘"} ${archivo} (${Math.round((Date.now() - t0) / 1000)} s)`);
  if (!ok) {
    fallos++;
    if (faltan.length) console.log("   Falta:", faltan.join(" | "));
    console.log(salida.split("\n").slice(-25).join("\n"));
  }
}
console.log(fallos ? `\n${fallos} prueba(s) con fallos` : "\nTodo correcto");
process.exit(fallos ? 1 : 0);
