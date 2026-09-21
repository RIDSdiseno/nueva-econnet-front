/**
 * Los datos que el HTML ya trae puestos.
 *
 * El problema que resuelve: la ficha de producto y el catálogo cargaban con
 * `useEffect`, así que el HTML prerenderizado decía literalmente «Cargando…».
 * Eso es lo que veía Google y lo que ven los bots de IA que no ejecutan
 * JavaScript — una ficha sin nombre, sin precio y sin especificaciones.
 *
 * Ahora el prerenderizado mete los datos en el HTML dentro de una isla JSON
 * (`<script type="application/json">`, que no se ejecuta y por tanto no rompe
 * la CSP estricta), y el navegador los usa como estado inicial: sin parpadeo,
 * sin espera y con contenido para quien no ejecuta nada.
 */
import type { Negocio, Producto } from "./tipos.js";

export interface DatosIniciales {
  catalogo?: Producto[];
  producto?: Producto;
  /** Razón social, RUT y dirección: van en el HTML para que los lea un bot. */
  negocio?: Negocio;
}

const CLAVE = "datos-iniciales";

/* En el prerenderizado (Node) no hay `document`: los datos se ponen aquí. */
let enMemoria: DatosIniciales = {};

export function precargar(datos: DatosIniciales): void {
  enMemoria = datos;
}

export function olvidarPrecarga(): void {
  enMemoria = {};
}

let leidosDelDocumento: DatosIniciales | null = null;

function delDocumento(): DatosIniciales {
  if (leidosDelDocumento) return leidosDelDocumento;
  if (typeof document === "undefined") return {};

  try {
    const isla = document.getElementById(CLAVE);
    leidosDelDocumento = isla?.textContent ? (JSON.parse(isla.textContent) as DatosIniciales) : {};
  } catch {
    /* Un JSON roto no puede tumbar la tienda: se cae al camino de siempre. */
    leidosDelDocumento = {};
  }
  return leidosDelDocumento;
}

export function datosIniciales(): DatosIniciales {
  return Object.keys(enMemoria).length ? enMemoria : delDocumento();
}

/** El id de la isla, para que el prerenderizado y el navegador no se desalineen. */
export const ID_ISLA = CLAVE;
