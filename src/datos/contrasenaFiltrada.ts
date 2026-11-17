// ¿Esta contraseña ha aparecido en filtraciones de internet? (lista pública de Have I Been Pwned)
// Nunca se envía la contraseña: solo los 5 primeros caracteres de su huella (SHA-1), y la comparación
// se hace en el móvil. Si no hay conexión o el servicio no responde, se deja seguir.
export async function contrasenaFiltrada(contrasena: string): Promise<boolean> {
  try {
    const huella = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-1", new TextEncoder().encode(contrasena))))
      .map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(`https://api.pwnedpasswords.com/range/${huella.slice(0, 5)}`, { signal: ctrl.signal, headers: { "Add-Padding": "true" } });
    clearTimeout(t);
    if (!r.ok) return false;
    const resto = huella.slice(5);
    return (await r.text()).split("\n").some((l) => { const [suf, n] = l.trim().split(":"); return suf === resto && Number(n) > 0; });
  } catch { return false; }
}
export const TEXTO_FILTRADA = "Esa contraseña ha aparecido en filtraciones de datos de internet y no es segura. Elige otra distinta.";
