// Genera los iconos PNG de la app a partir de dibujos SVG. Uso: npm run iconos
import sharp from "sharp";

const franjas = (w) => `<rect width="${w}" height="${w}" fill="#0F6B45"/><rect width="${w / 4}" height="${w}" fill="#0C5E3C"/><rect x="${w / 2}" width="${w / 4}" height="${w}" fill="#0C5E3C"/>`;
// Dibujo a sangre (sin esquinas redondeadas): el móvil recorta la forma
const dibujo = (escala) => {
  const c = 256, s = escala;
  return `<path d="M${c} ${c - 186 * s}v${372 * s}" stroke="#fff" stroke-width="${22 * s}" stroke-linecap="round"/><circle cx="${c}" cy="${c}" r="${108 * s}" fill="none" stroke="#fff" stroke-width="${22 * s}"/><circle cx="${c}" cy="${c}" r="${40 * s}" fill="#FF6B1A"/>`;
};
const svg = (escala) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${franjas(512)}${dibujo(escala)}</svg>`);

const salidas = [
  ["public/icons/icono-192.png", 192, 1],
  ["public/icons/icono-512.png", 512, 1],
  ["public/icons/icono-maskable-512.png", 512, 0.78],
  ["public/icons/apple-touch-icon.png", 180, 0.9]
];
for (const [ruta, tam, escala] of salidas) {
  await sharp(svg(escala)).resize(tam, tam).png().toFile(ruta);
  console.log("Creado", ruta);
}
