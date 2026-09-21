/**
 * El contexto, a solas. Separado del proveedor para que el fichero de
 * componentes exporte solo componentes: si no, Fast Refresh recarga entera la
 * página en cada guardado.
 */
import { createContext } from "react";
import type { LineaCarrito } from "../../services/tipos.js";

export interface EstadoCarrito {
  id: string | null;
  lineas: LineaCarrito[];
  unidades: number;
  agregar: (productoId: string, cantidad?: number) => void;
  cambiar: (productoId: string, cantidad: number) => void;
  quitar: (productoId: string) => void;
  vaciar: () => void;
  guardarConCorreo: (correo: string) => Promise<void>;
}

export const CarritoContexto = createContext<EstadoCarrito | null>(null);
