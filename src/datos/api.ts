// Elige dónde se guardan los datos: en Supabase si están configurados los dos datos
// del archivo .env (o en Netlify), y si no, en modo prueba dentro de este dispositivo.
import { apiLocal } from "./local";
import { crearApiNube } from "./nube";
import type { Api } from "./tipos";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const api: Api = url && clave ? crearApiNube(url, clave) : apiLocal;
