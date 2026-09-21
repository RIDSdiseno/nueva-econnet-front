/** Carga el catálogo una vez y lo comparte entre pantallas. */
import { useEffect, useState } from "react";
import { api } from "../../services/api.js";
import type { Producto } from "../../services/tipos.js";
import { datosIniciales } from "../../services/datosIniciales.js";

let memoria: Producto[] | null = null;

/**
 * Lo que el HTML ya traía. Se lee **dentro del hook**, no al importar el
 * módulo: en el prerenderizado los datos se ponen justo antes de renderizar, y
 * leerlos al importar daba siempre vacío — la tienda se prerenderizaba con un
 * «Cargando el catálogo…» dentro.
 */
const precargado = (): Producto[] | null => memoria ?? datosIniciales().catalogo ?? null;

/**
 * El HTML de la tienda se escribe en el `build`: es una foto del catálogo de
 * ese momento. Si esa foto fuera la última palabra, un equipo dado de alta en
 * el panel no aparecería hasta el siguiente despliegue, y un precio corregido
 * seguiría mintiendo en pantalla.
 *
 * Así que la foto se pinta al instante —sin parpadeo, y es lo que leen Google
 * y los bots— y detrás se pregunta a la API. Si algo cambió, se cambia en
 * pantalla. Si no, no se toca nada y React no vuelve a dibujar.
 */
export function useCatalogo() {
  const inicial = precargado();
  const [productos, setProductos] = useState<Producto[]>(inicial ?? []);
  const [cargando, setCargando] = useState(!inicial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    const traido = precargado();

    api
      .catalogo()
      .then((lista) => {
        memoria = lista;
        if (!vivo) return;
        /* Comparar antes de escribir: sin esto, cada visita a la tienda
           reemplaza el array por otro igual y vuelve a dibujarlo entero. */
        setProductos((antes) => (JSON.stringify(antes) === JSON.stringify(lista) ? antes : lista));
      })
      /* Con catálogo en pantalla, un fallo de red no borra lo que se ve: la
         tienda sigue usable con la foto del build. */
      .catch((e: Error) => vivo && !traido && setError(e.message))
      .finally(() => vivo && setCargando(false));

    return () => {
      vivo = false;
    };
  }, []);

  return { productos, cargando, error };
}

export const olvidarCatalogo = () => {
  memoria = null;
};
