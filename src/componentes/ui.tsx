// Piezas comunes: hoja inferior, confirmación antes de borrar, avisos flotantes y tema.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/* ---------- Hoja inferior (en ordenador se ve como ventana centrada) ---------- */
export function Hoja({ titulo, children, alCerrar }: { titulo: string; children: ReactNode; alCerrar: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") alCerrar(); };
    document.addEventListener("keydown", tecla);
    const anterior = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input, button:not(.cerrar-hoja)")?.focus();
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", tecla); document.body.style.overflow = ""; anterior?.focus?.(); };
  }, [alCerrar]);
  // Se pinta directamente en <body> para que ninguna cabecera ni la barra de pestañas la tape
  return createPortal(
    <div className="velo" onMouseDown={(e) => { if (e.target === e.currentTarget) alCerrar(); }}>
      <div className="hoja" role="dialog" aria-modal="true" aria-label={titulo} ref={ref}>
        <h2>{titulo}</h2>
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ---------- Confirmación y avisos ---------- */
interface PeticionConfirmar { titulo: string; texto?: string; boton?: string; peligro?: boolean; resolver: (ok: boolean) => void }
interface Ui {
  confirmar: (o: Omit<PeticionConfirmar, "resolver">) => Promise<boolean>;
  avisar: (texto: string) => void;
}
const ContextoUi = createContext<Ui | null>(null);
export const useUi = () => useContext(ContextoUi)!;

export function ProveedorUi({ children }: { children: ReactNode }) {
  const [peticion, setPeticion] = useState<PeticionConfirmar | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const temporizador = useRef<number>();

  const confirmar = useCallback<Ui["confirmar"]>((o) => new Promise((resolver) => setPeticion({ ...o, resolver })), []);
  const avisar = useCallback((texto: string) => {
    setAviso(texto);
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => setAviso(null), 2600);
  }, []);
  const responder = useCallback((ok: boolean) => { setPeticion((p) => { p?.resolver(ok); return null; }); }, []);
  const cancelar = useCallback(() => responder(false), [responder]);

  return (
    <ContextoUi.Provider value={{ confirmar, avisar }}>
      {children}
      {peticion && (
        <Hoja titulo={peticion.titulo} alCerrar={cancelar}>
          {peticion.texto && <p className="suave">{peticion.texto}</p>}
          <div className="hoja-acciones">
            <button className="btn btn-gris cerrar-hoja" type="button" onClick={cancelar}>Cancelar</button>
            <button className={"btn " + (peticion.peligro === false ? "btn-principal" : "btn-peligro")} type="button" onClick={() => responder(true)}>
              {peticion.boton ?? "Borrar"}
            </button>
          </div>
        </Hoja>
      )}
      {aviso && <div className="aviso-flotante" role="status">{aviso}</div>}
    </ContextoUi.Provider>
  );
}

/* ---------- Tema claro / oscuro / automático ---------- */
export type Tema = "auto" | "light" | "dark";
export function useTema(): [Tema, (t: Tema) => void] {
  const [tema, setTema] = useState<Tema>(() => {
    try { const t = localStorage.getItem("mister-tema"); return t === "light" || t === "dark" ? t : "auto"; } catch { return "auto"; }
  });
  const cambiar = (t: Tema) => {
    setTema(t);
    try { if (t === "auto") localStorage.removeItem("mister-tema"); else localStorage.setItem("mister-tema", t); } catch { /* nada */ }
    if (t === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
  };
  return [tema, cambiar];
}

/** Iniciales para el escudo de un equipo: "Equipo Rojo" -> "ER". */
export function iniciales(nombre: string) {
  const p = nombre.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2);
  return (p[0][0] + p[p.length - 1][0]);
}

export const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : "Algo ha fallado. Vuelve a intentarlo.");

/** Escudo del club: la imagen si la hay; si no, las iniciales sobre verde. */
export function Escudo({ imagen, nombre, tam = "normal" }: { imagen?: string | null; nombre: string; tam?: "normal" | "grande" | "enorme" }) {
  const clase = "escudo" + (tam === "grande" ? " escudo-grande" : tam === "enorme" ? " escudo-enorme" : "");
  if (imagen) return <img className={clase + " escudo-imagen"} src={imagen} alt={`Escudo de ${nombre}`} />;
  return <span className={clase} aria-hidden="true">{iniciales(nombre)}</span>;
}

/** Abre una imagen elegida por el usuario (PNG, JPG…) para poder prepararla. */
export async function abrirImagen(archivo: File): Promise<HTMLImageElement> {
  if (!archivo.type.startsWith("image/")) throw new Error("Elige un archivo de imagen (PNG, JPG…).");
  if (archivo.size > 15 * 1024 * 1024) throw new Error("La imagen es demasiado grande. Elige una de menos de 15 MB.");
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    await new Promise<void>((ok, mal) => {
      img.onload = () => ok();
      img.onerror = () => mal(new Error("No se ha podido abrir esa imagen. Prueba con otra."));
      img.src = url;
    });
    await img.decode().catch(() => undefined);
    return img;
  } finally { URL.revokeObjectURL(url); }
}

/**
 * Prepara el escudo: si tiene un fondo liso alrededor (normalmente blanco), lo vuelve transparente
 * empezando desde los bordes —así el blanco de dentro del escudo se queda—, recorta lo que sobra
 * y lo reduce a 256 px como máximo. Si el fondo no es liso (una foto), no lo toca.
 */
export type FondoEscudo = "quitado" | "ya-transparente" | "no-liso" | "sin-tocar";
export function prepararEscudo(img: HTMLImageElement, quitarFondo = true, lado = 256): { imagen: string; fondo: FondoEscudo } {
  const trabajo = 512;
  const escala = Math.min(1, trabajo / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * escala)), h = Math.max(1, Math.round(img.naturalHeight * escala));
  const lienzo = document.createElement("canvas");
  lienzo.width = w; lienzo.height = h;
  const ctx = lienzo.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const datos = ctx.getImageData(0, 0, w, h);
  const px = datos.data;
  let fondo: FondoEscudo = quitarFondo ? "no-liso" : "sin-tocar";

  if (quitarFondo) {
    // Píxeles del borde de la imagen
    const borde: number[] = [];
    for (let x = 0; x < w; x++) borde.push(x, (h - 1) * w + x);
    for (let y = 1; y < h - 1; y++) borde.push(y * w, y * w + w - 1);
    const opacos = borde.filter((i) => px[i * 4 + 3] > 200);
    // Si el borde ya es casi todo transparente, no hay fondo que quitar: solo se recorta
    if (opacos.length <= borde.length * 0.5) fondo = "ya-transparente";
    else {
      // Color del fondo: la mediana de cada canal en el borde
      const mediana = (c: number) => { const v = opacos.map((i) => px[i * 4 + c]).sort((a, b) => a - b); return v[v.length >> 1]; };
      const fr = mediana(0), fg = mediana(1), fb = mediana(2);
      const dist = (i: number) => Math.hypot(px[i * 4] - fr, px[i * 4 + 1] - fg, px[i * 4 + 2] - fb);
      const T = 42; // cuánto puede variar el color del fondo (sombras suaves, compresión JPG)
      const parecidos = opacos.filter((i) => dist(i) <= T).length;
      if (parecidos >= borde.length * 0.6) {
        // Relleno desde los bordes: solo se quita el fondo conectado con el exterior
        const esFondo = new Uint8Array(w * h);
        const cola: number[] = [];
        for (const i of borde) if (!esFondo[i] && (px[i * 4 + 3] < 30 || dist(i) <= T)) { esFondo[i] = 1; cola.push(i); }
        for (let k = 0; k < cola.length; k++) {
          const i = cola[k], x = i % w, y = (i / w) | 0;
          const vecinos = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
          for (const j of vecinos) if (j >= 0 && !esFondo[j] && (px[j * 4 + 3] < 30 || dist(j) <= T)) { esFondo[j] = 1; cola.push(j); }
        }
        for (let i = 0; i < w * h; i++) {
          if (esFondo[i]) { px[i * 4 + 3] = 0; continue; }
          // Borde suave: los píxeles del contorno muy parecidos al esFondo quedan medio transparentes
          const x = i % w, y = (i / w) | 0;
          const tocaFondo = (x > 0 && esFondo[i - 1]) || (x < w - 1 && esFondo[i + 1]) || (y > 0 && esFondo[i - w]) || (y < h - 1 && esFondo[i + w]);
          if (tocaFondo) { const d = dist(i); if (d < T * 2) px[i * 4 + 3] = Math.min(px[i * 4 + 3], Math.round(255 * (d - T) / T)); }
        }
        ctx.putImageData(datos, 0, 0);
        fondo = "quitado";
      }
    }
  }

  // Recorte: lo que no es transparente, con un pequeño margen
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (px[(y * w + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1; } // imagen vacía: se deja tal cual
  const margen = Math.round(Math.max(x1 - x0, y1 - y0) * 0.02);
  x0 = Math.max(0, x0 - margen); y0 = Math.max(0, y0 - margen); x1 = Math.min(w - 1, x1 + margen); y1 = Math.min(h - 1, y1 + margen);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const final = Math.min(1, lado / Math.max(cw, ch));
  const salida = document.createElement("canvas");
  salida.width = Math.max(1, Math.round(cw * final)); salida.height = Math.max(1, Math.round(ch * final));
  const sctx = salida.getContext("2d")!;
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(lienzo, x0, y0, cw, ch, 0, 0, salida.width, salida.height);
  const webp = salida.toDataURL("image/webp", 0.92);
  return { imagen: webp.startsWith("data:image/webp") ? webp : salida.toDataURL("image/png"), fondo };
}
