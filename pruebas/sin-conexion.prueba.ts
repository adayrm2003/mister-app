// Prueba de «funcionar sin cobertura»: con una nube falsa que se puede desconectar.
// Se ejecuta con: npx tsx pruebas/sin-conexion.prueba.ts
import assert from "node:assert/strict";

// Lo mínimo del navegador que usa sinConexion.ts
const almacen = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => almacen.get(k) ?? null, setItem: (k: string, v: string) => void almacen.set(k, v), removeItem: (k: string) => void almacen.delete(k),
  key: (i: number) => [...almacen.keys()][i] ?? null, get length() { return almacen.size; }
};
let enLinea = true;
Object.defineProperty(globalThis, "navigator", { value: { get onLine() { return enLinea; } }, configurable: true });
const eventos = new Map<string, (() => void)[]>();
(globalThis as Record<string, unknown>).window = {
  addEventListener: (n: string, f: () => void) => eventos.set(n, [...(eventos.get(n) ?? []), f]),
  removeEventListener: () => undefined, dispatchEvent: () => true
};
(globalThis as Record<string, unknown>).CustomEvent = class { constructor(public type: string, public init?: unknown) {} };

const { conSinConexion } = await import("../src/datos/sinConexion");

// Nube falsa: guarda en memoria y falla «sin conexión» cuando enLinea es false
const servidor = new Map<string, { id: string; equipoId: string; n?: number }>();
const llamadas: string[] = [];
const sinRed = () => { throw new Error("No hay conexión con el servidor. Revisa tu internet."); };
const nube = {
  modo: "nube",
  async listar() { if (!enLinea) sinRed(); return [...servidor.values()]; },
  async guardar(_t: string, f: { id: string; equipoId: string }) { if (!enLinea) sinRed(); llamadas.push("guardar " + f.id); servidor.set(f.id, f); return f; },
  async borrar(_t: string, id: string) { if (!enLinea) sinRed(); llamadas.push("borrar " + id); servidor.delete(id); },
  async perfilActual() { if (!enLinea) sinRed(); return { id: "u1", email: "mister@prueba.test", rol: "entrenador" }; },
  async salir() { /* nada */ }
} as unknown as Parameters<typeof conSinConexion>[0];
const api = conSinConexion(nube);
const equipo = "eq1";

// 1. Con conexión: se guarda directo y queda copia
await api.guardar("jugadores", { id: "a", equipoId: equipo });
assert.deepEqual((await api.listar("jugadores", equipo)).map((x) => x.id), ["a"]);
assert.equal((await api.perfilActual())?.email, "mister@prueba.test");

// 2. Sin conexión: se lee la copia, se apunta en pendientes y se ve al momento
enLinea = false;
assert.deepEqual((await api.listar("jugadores", equipo)).map((x) => x.id), ["a"], "sin conexión se usa la copia");
assert.equal((await api.perfilActual())?.email, "mister@prueba.test", "la sesión sigue sin conexión");
await api.guardar("jugadores", { id: "b", equipoId: equipo });
await api.guardar("jugadores", { id: "b", equipoId: equipo, n: 2 } as never);
await api.borrar("jugadores", "a");
assert.deepEqual((await api.listar("jugadores", equipo)).map((x) => x.id), ["b"], "lo apuntado sin conexión se ve");
assert.equal(api.estadoConexion().pendientes, 2, "dos cambios de la misma fila cuentan como uno");
assert.equal(servidor.has("b"), false, "aún no ha llegado al servidor");
await assert.rejects(() => api.salir(), /sin subir/, "no deja salir con cambios sin subir");

// 3. Vuelve la señal: se sube todo en orden
enLinea = true;
await api.subirPendientes();
assert.equal(api.estadoConexion().pendientes, 0);
assert.deepEqual([...servidor.keys()], ["b"]);
assert.equal((servidor.get("b") as { n?: number }).n, 2, "se sube la última versión");
assert.deepEqual(llamadas, ["guardar a", "guardar b", "borrar a"]);
await api.salir();
assert.equal([...almacen.keys()].filter((k) => k.startsWith("mister-copia:")).length, 0, "al salir se borra la copia del móvil");
console.log("✔ Sin conexión: todo correcto");
process.exit(0);
