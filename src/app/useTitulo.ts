/**
 * Pone el título y la descripción al cambiar de ruta en el navegador.
 *
 * El HTML prerenderizado ya trae los suyos —eso es lo que lee un buscador—;
 * esto es para que la pestaña diga la verdad cuando se navega sin recargar.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { metadatosDe } from "./metadatos.js";

export function useTitulo(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    const { titulo, descripcion } = metadatosDe(pathname);
    document.title = titulo;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", descripcion);
  }, [pathname]);
}
