/**
 * El comparador: hasta tres equipos, elegidos desde la tienda o desde la ficha.
 *
 * Por qué importa en esta tienda: se venden equipos de un millón de pesos y la
 * decisión se toma entre dos o tres modelos parecidos. Sin comparador, esa
 * comparación se hace en otra pestaña — muchas veces en la web de otro.
 *
 * Vive en el navegador (sessionStorage): es una decisión de esta visita, no un
 * dato que haya que guardar en el servidor.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ComparadorContexto, MAXIMO, type EstadoComparador } from "./contexto.js";

const CLAVE = "econnet:comparar";

function leer(): string[] {
  try {
    const crudo = JSON.parse(sessionStorage.getItem(CLAVE) ?? "[]") as unknown;
    return Array.isArray(crudo) ? (crudo as string[]).slice(0, MAXIMO) : [];
  } catch {
    return [];
  }
}

export function ProveedorComparador({ children }: { children: ReactNode }) {
  const [slugs, setSlugs] = useState<string[]>(() => (typeof sessionStorage === "undefined" ? [] : leer()));

  useEffect(() => {
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify(slugs));
    } catch {
      /* Ventana privada: se compara igual, solo que no sobrevive a recargar. */
    }
  }, [slugs]);

  const alternar = useCallback((slug: string) => {
    setSlugs((previos) => {
      if (previos.includes(slug)) return previos.filter((s) => s !== slug);
      /* Con más de tres columnas no se compara: se hace scroll. */
      return previos.length >= MAXIMO ? previos : [...previos, slug];
    });
  }, []);

  const quitar = useCallback((slug: string) => setSlugs((p) => p.filter((s) => s !== slug)), []);
  const vaciar = useCallback(() => setSlugs([]), []);

  const valor = useMemo<EstadoComparador>(
    () => ({ slugs, alternar, quitar, vaciar, lleno: slugs.length >= MAXIMO }),
    [slugs, alternar, quitar, vaciar]
  );

  return <ComparadorContexto.Provider value={valor}>{children}</ComparadorContexto.Provider>;
}
