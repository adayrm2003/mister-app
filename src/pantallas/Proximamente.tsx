import type { ComponentType, SVGProps } from "react";

export default function Proximamente({ titulo, fase, texto, Icono }: { titulo: string; fase: number; texto: string; Icono: ComponentType<SVGProps<SVGSVGElement>> }) {
  return (
    <main className="pagina">
      <h1>{titulo}</h1>
      <div className="vacio tarjeta">
        <Icono />
        <span className="pastilla">Llega en la fase {fase}</span>
        <p>{texto}</p>
      </div>
    </main>
  );
}
