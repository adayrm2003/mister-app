// Piezas comunes: hoja inferior, confirmación antes de borrar, avisos flotantes y tema.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

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
  return (
    <div className="velo" onMouseDown={(e) => { if (e.target === e.currentTarget) alCerrar(); }}>
      <div className="hoja" role="dialog" aria-modal="true" aria-label={titulo} ref={ref}>
        <h2>{titulo}</h2>
        {children}
      </div>
    </div>
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
