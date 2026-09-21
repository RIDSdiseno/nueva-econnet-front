/**
 * El contexto del comparador, a solas: el fichero de componentes exporta solo
 * componentes (si no, Fast Refresh recarga la página entera en cada guardado).
 */
import { createContext } from "react";

export const MAXIMO = 3;

export interface EstadoComparador {
  slugs: string[];
  alternar: (slug: string) => void;
  quitar: (slug: string) => void;
  vaciar: () => void;
  lleno: boolean;
}

export const ComparadorContexto = createContext<EstadoComparador | null>(null);
