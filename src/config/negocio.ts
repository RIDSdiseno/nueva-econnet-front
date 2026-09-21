/**
 * Los datos de la empresa que aparecen en los textos legales y en el pie.
 *
 * ~~Vivían en variables `VITE_`~~ → **desde el 21-09-2026 vienen de la API**,
 * y el motivo es práctico: una variable `VITE_` se hornea en el paquete del
 * navegador, así que corregir una letra del RUT obligaba a reconstruir y
 * volver a publicar la web entera. Ahora se cambian en el panel y se ven a la
 * siguiente visita.
 *
 * Lo que no cambia es la regla: **mientras no los dé Econnet, la página enseña
 * el hueco en vez de inventárselos.** Un RUT inventado en unos términos y
 * condiciones no es un detalle de maquetación: es una declaración falsa.
 */
import { useEffect, useState } from "react";
import { api } from "../services/api.js";
import { datosIniciales } from "../services/datosIniciales.js";

export interface Negocio {
  razonSocial: string | null;
  rut: string | null;
  direccion: string | null;
  telefono: string | null;
  horario: string | null;
  correo: string | null;
  whatsapp: string | null;
}

export const NEGOCIO_VACIO: Negocio = {
  razonSocial: null,
  rut: null,
  direccion: null,
  telefono: null,
  horario: null,
  correo: null,
  whatsapp: null
};

let memoria: Negocio | null = null;

/** Lo que el HTML ya traía, igual que el catálogo: sin parpadeo y con SSR. */
const precargado = (): Negocio | null => memoria ?? datosIniciales().negocio ?? null;

export function useNegocio(): Negocio {
  const [negocio, setNegocio] = useState<Negocio>(precargado() ?? NEGOCIO_VACIO);

  useEffect(() => {
    let vivo = true;
    api
      .negocio()
      .then((n) => {
        memoria = n;
        if (vivo) setNegocio((antes) => (JSON.stringify(antes) === JSON.stringify(n) ? antes : n));
      })
      /* Si la API no contesta, se queda lo que traía el HTML. Peor sería
         borrar de pantalla unos datos legales que sí constaban. */
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  return negocio;
}

export const olvidarNegocio = (): void => {
  memoria = null;
};

/** Qué datos de empresa siguen sin llegar. Lo usa la página legal para avisar. */
export const faltanDatos = (negocio: Negocio): string[] =>
  (
    [
      ["razón social", negocio.razonSocial],
      ["RUT", negocio.rut],
      ["dirección", negocio.direccion],
      ["correo de contacto", negocio.correo]
    ] as Array<[string, string | null]>
  )
    .filter(([, valor]) => !valor)
    .map(([nombre]) => nombre);
