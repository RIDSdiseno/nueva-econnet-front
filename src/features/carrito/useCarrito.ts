import { useContext } from "react";
import { CarritoContexto, type EstadoCarrito } from "./contexto.js";

export function useCarrito(): EstadoCarrito {
  const contexto = useContext(CarritoContexto);
  if (!contexto) throw new Error("useCarrito necesita estar dentro de ProveedorCarrito");
  return contexto;
}
