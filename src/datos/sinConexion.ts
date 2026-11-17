// Funcionar sin cobertura (solo en la nube; el modo prueba ya funciona sin internet).
// - Lo que se lee bien se guarda una copia en el móvil; si luego no hay conexión, se usa esa copia.
// - Lo que se apunta sin conexión va a una lista de pendientes (en el móvil) y se sube solo,
//   en el mismo orden, en cuanto vuelve la señal. Mientras, se ve como si ya estuviera guardado.
// La copia y la lista se borran al cerrar sesión.
import { ErrorApp, type Api, type Fila, type Tabla, type TablaUsuario } from "./tipos";

const PREFIJO = "mister-copia:";
const COLA = "mister-pendientes";

type Pendiente =
  | { id: string; tipo: "guardar"; tabla: Tabla; fila: Fila }
  | { id: string; tipo: "borrar"; tabla: Tabla; filaId: string }
  | { id: string; tipo: "guardarMio"; tabla: TablaUsuario; fila: { id: string } }
  | { id: string; tipo: "borrarMio"; tabla: TablaUsuario; filaId: string }
  | { id: string; tipo: "ajustesEquipo"; equipoId: string; datos: Record<string, unknown> }
  | { id: string; tipo: "ajustesUsuario"; datos: Record<string, unknown> };

export interface EstadoConexion { enLinea: boolean; pendientes: number; subiendo: boolean }

const leer = <T,>(k: string): T | undefined => { try { const t = localStorage.getItem(PREFIJO + k); return t ? JSON.parse(t) as T : undefined; } catch { return undefined; } };
const escribir = (k: string, v: unknown) => { try { localStorage.setItem(PREFIJO + k, JSON.stringify(v)); } catch { /* sin espacio: seguimos sin copia */ } };
const leerCola = (): Pendiente[] => { try { return JSON.parse(localStorage.getItem(COLA) ?? "[]"); } catch { return []; } };
const escribirCola = (c: Pendiente[]) => { try { localStorage.setItem(COLA, JSON.stringify(c)); } catch { /* nada */ } };

/** ¿El error es por falta de conexión (y no porque el servidor diga que no)? */
export const esDeConexion = (e: unknown) =>
  (typeof navigator !== "undefined" && navigator.onLine === false) ||
  /no hay conexi|failed to fetch|networkerror|load failed|network request failed|fetch/i.test(e instanceof Error ? e.message : String(e));

export function conSinConexion(real: Api): Api & { estadoConexion: () => EstadoConexion; alCambiarConexion: (cb: (e: EstadoConexion) => void) => () => void; subirPendientes: () => Promise<void> } {
  const oyentes = new Set<(e: EstadoConexion) => void>();
  let subiendo = false;
  let errores: string[] = [];
  const estado = (): EstadoConexion => ({ enLinea: typeof navigator === "undefined" || navigator.onLine !== false, pendientes: leerCola().length, subiendo });
  const avisar = () => { const e = estado(); oyentes.forEach((cb) => cb(e)); };

  // Copia en el móvil de cada lectura, para usarla sin conexión
  async function conCopia<T>(clave: string, leerReal: () => Promise<T>): Promise<T> {
    try {
      const r = await leerReal();
      escribir(clave, r);
      return r;
    } catch (e) {
      const copia = leer<T>(clave);
      if (copia !== undefined && esDeConexion(e)) return copia;
      throw e;
    }
  }

  // Cambios a la copia local para que lo apuntado sin conexión se vea al momento
  function aplicarEnCopia(p: Pendiente) {
    if (p.tipo === "guardar") {
      const k = `listar:${p.tabla}:${p.fila.equipoId}`;
      const l = leer<Fila[]>(k) ?? [];
      escribir(k, l.some((x) => x.id === p.fila.id) ? l.map((x) => (x.id === p.fila.id ? p.fila : x)) : [...l, p.fila]);
    } else if (p.tipo === "borrar") {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k?.startsWith(`${PREFIJO}listar:${p.tabla}:`)) continue;
        const clave = k.slice(PREFIJO.length);
        escribir(clave, (leer<Fila[]>(clave) ?? []).filter((x) => x.id !== p.filaId));
      }
    } else if (p.tipo === "guardarMio") {
      const k = `mios:${p.tabla}`;
      const l = leer<{ id: string }[]>(k) ?? [];
      escribir(k, l.some((x) => x.id === p.fila.id) ? l.map((x) => (x.id === p.fila.id ? p.fila : x)) : [p.fila, ...l]);
    } else if (p.tipo === "borrarMio") {
      const k = `mios:${p.tabla}`;
      escribir(k, (leer<{ id: string }[]>(k) ?? []).filter((x) => x.id !== p.filaId));
    } else if (p.tipo === "ajustesEquipo") escribir(`ajustesEquipo:${p.equipoId}`, p.datos);
    else escribir("ajustesUsuario", p.datos);
  }

  async function hacer(p: Pendiente) {
    if (p.tipo === "guardar") await real.guardar(p.tabla, p.fila);
    else if (p.tipo === "borrar") await real.borrar(p.tabla, p.filaId);
    else if (p.tipo === "guardarMio") await real.guardarMio(p.tabla, p.fila);
    else if (p.tipo === "borrarMio") await real.borrarMio(p.tabla, p.filaId);
    else if (p.tipo === "ajustesEquipo") await real.guardarAjustesEquipo(p.equipoId, p.datos);
    else await real.guardarAjustesUsuario(p.datos);
  }

  /** Escribe: si hay conexión y nada pendiente, directo; si no, a la lista de pendientes. */
  async function escribirOEncolar(p: Pendiente) {
    aplicarEnCopia(p);
    if (leerCola().length === 0 && estado().enLinea) {
      try { await hacer(p); return; } catch (e) { if (!esDeConexion(e)) throw e; }
    }
    const cola = leerCola();
    // Si ya había un cambio pendiente de la misma fila, basta con el último
    const misma = (x: Pendiente) => x.tipo === p.tipo && "fila" in x && "fila" in p && x.fila.id === p.fila.id;
    escribirCola([...cola.filter((x) => !misma(x)), p]);
    avisar();
    void subirPendientes();
  }

  async function subirPendientes() {
    if (subiendo || !estado().enLinea) return;
    subiendo = true; avisar();
    try {
      for (;;) {
        const cola = leerCola();
        if (!cola.length) break;
        const p = cola[0];
        try { await hacer(p); }
        catch (e) {
          if (esDeConexion(e)) break; // sigue sin señal: se reintenta luego
          errores.push(e instanceof Error ? e.message : String(e)); // el servidor dijo que no: se descarta
        }
        escribirCola(leerCola().filter((x) => x.id !== p.id));
        avisar();
      }
    } finally {
      subiendo = false; avisar();
      if (errores.length) { const m = errores[0]; errores = []; window.dispatchEvent(new CustomEvent("mister-error-subida", { detail: m })); }
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener("online", () => { avisar(); void subirPendientes(); });
    window.addEventListener("offline", avisar);
    setInterval(() => { if (leerCola().length) void subirPendientes(); }, 30000);
    setTimeout(() => void subirPendientes(), 3000);
  }

  const nuevoId = () => crypto.randomUUID();
  return {
    ...real,
    estadoConexion: estado,
    alCambiarConexion: (cb) => { oyentes.add(cb); return () => oyentes.delete(cb); },
    subirPendientes,

    async perfilActual() {
      try {
        const p = await real.perfilActual();
        if (p) escribir("perfil", p);
        return p;
      } catch (e) {
        if (esDeConexion(e)) return leer("perfil") ?? null;
        throw e;
      }
    },
    async salir() {
      // Al cerrar sesión se borra la copia del móvil. Si queda algo sin subir, no se deja salir (se perdería).
      if (leerCola().length && estado().enLinea) await subirPendientes();
      const quedan = leerCola().length;
      if (quedan) throw new ErrorApp(`Tienes ${quedan} ${quedan === 1 ? "cambio" : "cambios"} sin subir. Conéctate a internet un momento antes de salir para no perderlos.`);
      await real.salir();
      for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k?.startsWith(PREFIJO)) localStorage.removeItem(k); }
      localStorage.removeItem(COLA);
      avisar();
    },
    misClubes: () => conCopia("misClubes", () => real.misClubes()),
    misEquipos: () => conCopia("misEquipos", () => real.misEquipos()),
    miClub: () => conCopia("miClub", () => real.miClub()),
    listar: <T extends Fila>(tabla: Tabla, equipoId: string) => conCopia<T[]>(`listar:${tabla}:${equipoId}`, () => real.listar<T>(tabla, equipoId)),
    leerAjustesEquipo: (equipoId: string) => conCopia(`ajustesEquipo:${equipoId}`, () => real.leerAjustesEquipo(equipoId)),
    leerAjustesUsuario: () => conCopia("ajustesUsuario", () => real.leerAjustesUsuario()),
    listarMios: <T extends { id: string }>(tabla: TablaUsuario) => conCopia<T[]>(`mios:${tabla}`, () => real.listarMios<T>(tabla)),
    catalogoEjercicios: () => conCopia("catalogo", () => real.catalogoEjercicios()),
    entrenadoresDeMiEquipo: (equipoId: string) => conCopia(`entrenadores:${equipoId}`, () => real.entrenadoresDeMiEquipo(equipoId)),

    async guardar<T extends Fila>(tabla: Tabla, fila: T) { await escribirOEncolar({ id: nuevoId(), tipo: "guardar", tabla, fila }); return fila; },
    async borrar(tabla: Tabla, filaId: string) { await escribirOEncolar({ id: nuevoId(), tipo: "borrar", tabla, filaId }); },
    async guardarMio<T extends { id: string }>(tabla: TablaUsuario, fila: T) { await escribirOEncolar({ id: nuevoId(), tipo: "guardarMio", tabla, fila }); return fila; },
    async borrarMio(tabla: TablaUsuario, filaId: string) { await escribirOEncolar({ id: nuevoId(), tipo: "borrarMio", tabla, filaId }); },
    async guardarAjustesEquipo(equipoId: string, datos: Record<string, unknown>) { await escribirOEncolar({ id: nuevoId(), tipo: "ajustesEquipo", equipoId, datos }); },
    async guardarAjustesUsuario(datos: Record<string, unknown>) { await escribirOEncolar({ id: nuevoId(), tipo: "ajustesUsuario", datos }); }
  };
}

