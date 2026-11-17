// Fechas sencillas que se usan en varias pantallas.
const dos = (n: number) => String(n).padStart(2, "0");
export const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`; };
export const fechaLarga = (f: string) => new Date(f + "T12:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
