// Botón de micrófono: el entrenador habla y el texto se escribe solo (reconocimiento de voz del navegador).
// Si el navegador no sabe hacerlo, el botón no aparece.
import { useEffect, useRef, useState } from "react";
import "./dictado.css";

interface Reconocedor {
  lang: string; continuous: boolean; interimResults: boolean;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
type Constructor = new () => Reconocedor;
const ClaseVoz = (): Constructor | null => {
  const w = window as unknown as { SpeechRecognition?: Constructor; webkitSpeechRecognition?: Constructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
export const hayDictado = () => typeof window !== "undefined" && !!ClaseVoz();

/** Añade lo dictado al texto que ya hubiera (con un espacio si hace falta). */
export const juntar = (antes: string, nuevo: string) => {
  const n = nuevo.trim();
  if (!n) return antes;
  const frase = n[0].toUpperCase() + n.slice(1);
  return antes.trim() ? `${antes.replace(/\s+$/, "")}${/[.!?]$/.test(antes.trim()) ? " " : ". "}${frase}` : frase;
};

export default function BotonDictado({ alTexto, etiqueta = "Dictar por voz" }: { alTexto: (texto: string) => void; etiqueta?: string }) {
  const [escuchando, setEscuchando] = useState(false);
  const [error, setError] = useState("");
  const rec = useRef<Reconocedor | null>(null);
  const cb = useRef(alTexto);
  cb.current = alTexto;
  useEffect(() => () => rec.current?.abort(), []);
  if (!hayDictado()) return null;

  function empezar() {
    const C = ClaseVoz();
    if (!C) return;
    setError("");
    const r = new C();
    r.lang = "es-ES"; r.continuous = false; r.interimResults = false;
    r.onresult = (e) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript;
      if (t) cb.current(t);
    };
    r.onerror = (e) => setError(e.error === "not-allowed" || e.error === "service-not-allowed" ? "Da permiso al micrófono para dictar." : e.error === "no-speech" ? "No te he oído. Prueba otra vez." : "No se ha podido dictar.");
    r.onend = () => setEscuchando(false);
    rec.current = r;
    try { r.start(); setEscuchando(true); } catch { setEscuchando(false); }
  }

  return (
    <span className="dictado">
      <button type="button" className={"btn boton-dictado" + (escuchando ? " escuchando" : "")} aria-pressed={escuchando}
        aria-label={escuchando ? "Parar de dictar" : etiqueta} title={etiqueta}
        onClick={() => (escuchando ? rec.current?.stop() : empezar())}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
        {escuchando ? "Escuchando…" : "Dictar"}
      </button>
      {error && <small className="dictado-error">{error}</small>}
    </span>
  );
}
