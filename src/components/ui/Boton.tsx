import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

type Tono = "primario" | "fantasma";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
const TONOS: Record<Tono, string> = {
  primario: "bg-azul text-white hover:bg-azul-claro",
  fantasma: "border border-linea-fuerte bg-white/5 text-tinta hover:border-white/30"
};
const TAMANOS = { normal: "h-12 px-6 text-[15px]", pequeno: "h-10 px-4 text-sm" };

interface Comun {
  tono?: Tono;
  tamano?: keyof typeof TAMANOS;
  ancho?: boolean;
  children: ReactNode;
}

export function Boton({
  tono = "primario",
  tamano = "normal",
  ancho = false,
  className = "",
  children,
  ...resto
}: Comun & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${BASE} ${TONOS[tono]} ${TAMANOS[tamano]} ${ancho ? "w-full" : ""} ${className}`} {...resto}>
      {children}
    </button>
  );
}

export function BotonEnlace({
  tono = "primario",
  tamano = "normal",
  ancho = false,
  to,
  children
}: Comun & { to: string }) {
  return (
    <Link className={`${BASE} ${TONOS[tono]} ${TAMANOS[tamano]} ${ancho ? "w-full" : ""}`} to={to}>
      {children}
    </Link>
  );
}
