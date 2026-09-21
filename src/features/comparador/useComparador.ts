import { useContext } from "react";
import { ComparadorContexto, type EstadoComparador } from "./contexto.js";

export function useComparador(): EstadoComparador {
  const contexto = useContext(ComparadorContexto);
  if (!contexto) throw new Error("useComparador necesita estar dentro de ProveedorComparador");
  return contexto;
}
