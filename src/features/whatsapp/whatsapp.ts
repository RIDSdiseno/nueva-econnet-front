/**
 * El canal de asesoría. En una tienda chilena de tecnología es donde se cierra
 * media venta: la gente pregunta antes de pagar un millón de pesos.
 *
 * Dos decisiones que no son de estilo:
 *
 * 1. **El mensaje va rellenado con el contexto.** Un `wa.me` vacío obliga a la
 *    persona a explicar qué mira, y a quien contesta a adivinarlo. Con el
 *    modelo, la condición y el precio dentro, la conversación empieza en el
 *    segundo mensaje.
 * 2. **Sin número configurado no se pinta un botón muerto.** Hoy
 *    `VITE_WHATSAPP` está vacío y el marcador de la maqueta era un número que
 *    no existe: un botón verde que no contesta cuesta más que no tenerlo.
 */
import type { Producto } from "../../services/tipos.js";
import { clp } from "../../services/api.js";

/** El número, solo dígitos. Vacío = no hay canal y se dice. */
export const numero = (): string => String(import.meta.env.VITE_WHATSAPP ?? "").replace(/\D/g, "");

export const hayWhatsapp = (): boolean => numero().length >= 8;

export function enlace(mensaje: string): string | null {
  if (!hayWhatsapp()) return null;
  return `https://wa.me/${numero()}?text=${encodeURIComponent(mensaje)}`;
}

const sitio = (): string => (typeof window === "undefined" ? "econnet.cl" : window.location.origin);

/** Mensaje de una ficha: lleva lo que hace falta para responder sin preguntar. */
export function mensajeProducto(producto: Producto): string {
  const precio = producto.precio.venta
    ? clp(producto.precio.venta)
    : producto.referencia.valor
      ? `${clp(producto.referencia.valor)} (publicado en ${producto.referencia.canal})`
      : "precio por confirmar";

  const condicion = producto.condicion ? producto.condicion.toLowerCase() : "condición por confirmar";

  return [
    `Hola Econnet, me interesa el ${producto.marca} ${producto.nombre}.`,
    `Condición: ${condicion}. Precio en la web: ${precio}.`,
    `${sitio()}/tienda/${producto.slug}`
  ].join("\n");
}

export function mensajeAvisoPrecio(producto: Producto): string {
  return [
    `Hola Econnet, el ${producto.marca} ${producto.nombre} no tiene precio publicado en la web.`,
    "¿Me lo pueden cotizar?",
    `${sitio()}/tienda/${producto.slug}`
  ].join("\n");
}

export function mensajeCarrito(lineas: Array<{ nombre: string; cantidad: number }>, total: number | null): string {
  return [
    "Hola Econnet, tengo esto en el carrito y quiero preguntar antes de pagar:",
    ...lineas.map((l) => `· ${l.nombre} × ${l.cantidad}`),
    total ? `Total: ${clp(total)}` : "",
    sitio()
  ]
    .filter(Boolean)
    .join("\n");
}

export const MENSAJE_GENERAL = "Hola Econnet, necesito ayuda para elegir un equipo.";
