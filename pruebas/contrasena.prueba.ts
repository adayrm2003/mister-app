// Prueba de la comprobación de contraseñas filtradas, con el servicio simulado.
// Se ejecuta con: npx tsx pruebas/contrasena.prueba.ts
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { contrasenaFiltrada } from "../src/datos/contrasenaFiltrada";

const filtrada = "password123";
const h = createHash("sha1").update(filtrada).digest("hex").toUpperCase();
let pedido = "";
globalThis.fetch = (async (url: string) => {
  pedido = url;
  return new Response(`0000000000000000000000000000000000A:0\r\n${h.slice(5)}:123456\r\nFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:3`);
}) as typeof fetch;

(async () => {
  assert.equal(await contrasenaFiltrada(filtrada), true, "detecta una contraseña filtrada");
  assert.ok(pedido.endsWith("/range/" + h.slice(0, 5)), "solo envía los 5 primeros caracteres de la huella");
  assert.ok(!pedido.includes(filtrada), "nunca envía la contraseña");
  assert.equal(await contrasenaFiltrada("Una-Muy-Rara-" + Math.random()), false, "una contraseña rara no está");
  globalThis.fetch = (async () => { throw new Error("sin red"); }) as typeof fetch;
  assert.equal(await contrasenaFiltrada(filtrada), false, "sin conexión deja seguir");
  console.log("✔ Contraseñas filtradas: todo correcto");
})();
