// Carga la biblioteca de ejercicios de Míster a partir de un JSON con el formato de ejercicios_futbol.json.
// Uso: node scripts/importar-ejercicios.mjs ruta/al/ejercicios.json
// Genera:
//   - src/datos/catalogo.json            (lo usa la app; también en modo prueba)
//   - supabase/catalogo_ejercicios.sql   (para pegar en Supabase o aplicarlo con el conector)
// Se puede ejecutar las veces que haga falta: cada ejercicio se identifica por su "id" y no se duplica.
import { readFileSync, writeFileSync } from "node:fs";

const ruta = process.argv[2];
if (!ruta) { console.error("Falta la ruta del JSON. Uso: node scripts/importar-ejercicios.mjs ruta/al/ejercicios.json"); process.exit(1); }
const entrada = JSON.parse(readFileSync(ruta, "utf8"));
if (!Array.isArray(entrada)) throw new Error("El JSON debe ser una lista de ejercicios.");

// La app no muestra nombres de categorías por edad: se convierten en tres niveles.
const NIVEL_DE = {
  "prebenjamín": "iniciacion", "benjamín": "iniciacion",
  "alevín": "intermedio", "infantil": "intermedio",
  "cadete": "avanzado", "juvenil": "avanzado", "regional": "avanzado"
};
const ORDEN_NIVELES = ["iniciacion", "intermedio", "avanzado"];
const FASES = { "Ataque": "ataque", "Defensa": "defensa", "Transición ataque-defensa": "transicion-ad", "Transición defensa-ataque": "transicion-da", "Global (todas las fases)": "global", "Analítico (sin fase)": "analitico" };
const INTENSIDADES = { "Baja": "baja", "Media": "media", "Alta": "alta" };
// Palabras que no pueden quedar en el texto (reglas de la app)
const PROHIBIDAS = /\b(prebenjam[ií]n|benjam[ií]n|alev[ií]n|infantil|cadete|juvenil)\b|f[uú]tbol ?5/i;
const limpiar = (t) => String(t ?? "").trim().replace(/\bversi[oó]n infantil\b/gi, "Versión para los más pequeños");
const lista = (v) => (Array.isArray(v) ? v : String(v ?? "").split("|")).map(limpiar).filter(Boolean);
const numero = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

const vistos = new Set();
const catalogo = entrada.map((x, i) => {
  const id = String(x.id ?? "").trim();
  if (!/^[A-Z]{3}-\d{2,3}$/.test(id)) throw new Error(`Ejercicio ${i + 1}: id no válido («${id}»)`);
  if (vistos.has(id)) throw new Error(`El id ${id} está repetido`);
  vistos.add(id);
  const niveles = [...new Set(lista(x.categorias).map((c) => {
    const n = NIVEL_DE[c.toLowerCase()];
    if (!n) throw new Error(`${id}: categoría desconocida «${c}»`);
    return n;
  }))].sort((a, b) => ORDEN_NIVELES.indexOf(a) - ORDEN_NIVELES.indexOf(b));
  const fase = FASES[x.fase_juego]; if (!fase) throw new Error(`${id}: fase de juego desconocida «${x.fase_juego}»`);
  const intensidad = INTENSIDADES[x.intensidad]; if (!intensidad) throw new Error(`${id}: intensidad desconocida «${x.intensidad}»`);
  const e = {
    id, nombre: limpiar(x.nombre), tipo: limpiar(x.tipo), objetivo: limpiar(x.objetivo), fase, niveles,
    jugadoresMin: numero(x.jugadores_min), jugadoresMax: numero(x.jugadores_max), espacio: limpiar(x.espacio),
    duracion: numero(x.duracion_min), intensidad, material: limpiar(x.material), descripcion: limpiar(x.descripcion),
    reglas: lista(x.reglas), puntosClave: lista(x.puntos_clave), variantes: lista(x.variantes)
  };
  const texto = JSON.stringify(e);
  if (PROHIBIDAS.test(texto)) throw new Error(`${id}: queda una palabra no permitida en la app: ${texto.match(PROHIBIDAS)[0]}`);
  if (!e.nombre || !e.tipo) throw new Error(`${id}: falta el nombre o el tipo`);
  return e;
}).sort((a, b) => a.id.localeCompare(b.id));

writeFileSync("src/datos/catalogo.json", JSON.stringify(catalogo, null, 1) + "\n");

const sqlTexto = (s) => "'" + s.replace(/'/g, "''") + "'";
const filas = catalogo.map((e) => `(${sqlTexto(e.id)}, ${sqlTexto(JSON.stringify(e))}::jsonb)`);
writeFileSync("supabase/catalogo_ejercicios.sql", `-- Biblioteca de ejercicios de Míster (${catalogo.length} ejercicios).
-- Generado con: node scripts/importar-ejercicios.mjs <json>. Se puede ejecutar más de una vez: no duplica (usa el id).
create table if not exists public.ejercicios_catalogo (
  id          text primary key,
  datos       jsonb not null,
  actualizado timestamptz not null default now()
);
alter table public.ejercicios_catalogo enable row level security;
drop policy if exists "leer biblioteca" on public.ejercicios_catalogo;
create policy "leer biblioteca" on public.ejercicios_catalogo for select to authenticated using (true);
revoke all on public.ejercicios_catalogo from anon, authenticated;
grant select on public.ejercicios_catalogo to authenticated;

insert into public.ejercicios_catalogo (id, datos) values
${filas.join(",\n")}
on conflict (id) do update set datos = excluded.datos, actualizado = now();
`);
console.log(`Listo: ${catalogo.length} ejercicios en src/datos/catalogo.json y supabase/catalogo_ejercicios.sql`);
