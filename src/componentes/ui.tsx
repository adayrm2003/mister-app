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

/** Reduce una imagen elegida por el usuario a un cuadrado de 256 px como máximo, para guardarla ligera. */
export async function reducirImagen(archivo: File, lado = 256): Promise<string> {
  if (!archivo.type.startsWith("image/")) throw new Error("Elige un archivo de imagen (PNG, JPG…).");
  if (archivo.size > 15 * 1024 * 1024) throw new Error("La imagen es demasiado grande. Elige una de menos de 15 MB.");
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => mal(new Error("No se ha podido abrir esa imagen. Prueba con otra."));
      i.src = url;
    });
    const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * escala)), h = Math.max(1, Math.round(img.naturalHeight * escala));
    const lienzo = document.createElement("canvas");
    lienzo.width = w; lienzo.height = h;
    lienzo.getContext("2d")!.drawImage(img, 0, 0, w, h);
    const webp = lienzo.toDataURL("image/webp", 0.9);
    return webp.startsWith("data:image/webp") ? webp : lienzo.toDataURL("image/png");
  } finally { URL.revokeObjectURL(url); }
}
