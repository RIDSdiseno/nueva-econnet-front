/**
 * Los eventos de la tienda, preparados y sin proveedor.
 *
 * Qué hace: empuja los eventos al `dataLayer` estándar. Qué **no** hace:
 * cargar Google Tag Manager, Meta Pixel ni ninguna cookie de terceros. Eso es
 * una decisión de Econnet —y en Chile, con la Ley 21.719 en camino, además una
 * decisión con consecuencias—; el día que se tome, se añade el script y estos
 * eventos ya están puestos en los sitios correctos.
 *
 * Sin `dataLayer` en la página, cada llamada es un no-op silencioso: la tienda
 * no depende de que exista.
 */
import type { Producto } from "../../services/tipos.js";

interface Capa {
  push: (evento: Record<string, unknown>) => void;
}

/** Evita el duplicado clásico: el mismo evento dos veces por un doble render. */
const yaEnviados = new Set<string>();

function capa(): Capa | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { dataLayer?: Capa };
  return w.dataLayer ?? null;
}

export function evento(nombre: string, datos: Record<string, unknown> = {}, huella?: string): void {
  if (huella) {
    if (yaEnviados.has(huella)) return;
    yaEnviados.add(huella);
  }
  capa()?.push({ event: nombre, ...datos });
}

export const olvidarEventos = (): void => yaEnviados.clear();

/** Un producto, con la forma que esperan Google y Meta. */
export const comoItem = (producto: Producto, cantidad = 1) => ({
  item_id: producto.sku ?? producto.id,
  item_name: `${producto.marca} ${producto.nombre}`,
  item_brand: producto.marca,
  item_category: producto.categoria,
  item_variant: producto.condicion ?? undefined,
  price: producto.precio.venta ?? undefined,
  quantity: cantidad
});

export const verProducto = (producto: Producto) =>
  evento("view_item", { currency: "CLP", value: producto.precio.venta ?? undefined, items: [comoItem(producto)] }, `view:${producto.id}`);

export const buscar = (termino: string) => evento("search", { search_term: termino });

export const elegirProducto = (producto: Producto) => evento("select_item", { items: [comoItem(producto)] });

export const agregarAlCarrito = (producto: Producto, cantidad: number) =>
  evento("add_to_cart", {
    currency: "CLP",
    value: (producto.precio.venta ?? 0) * cantidad,
    items: [comoItem(producto, cantidad)]
  });

export const empezarCheckout = (valor: number) => evento("begin_checkout", { currency: "CLP", value: valor });

export const comprar = (numero: string, valor: number) =>
  evento("purchase", { transaction_id: numero, currency: "CLP", value: valor }, `purchase:${numero}`);

export const dejarCorreo = (origen: string) => evento("generate_lead", { origen });

export const clicWhatsapp = (contexto: string) => evento("whatsapp_click", { contexto });

export const pedirCotizacion = (numero: string, valor: number) =>
  evento("quote_request", { transaction_id: numero, currency: "CLP", value: valor }, `quote:${numero}`);

export const empezarTest = () => evento("quiz_start", {}, "quiz:start");
export const terminarTest = (recomendados: string[]) => evento("quiz_complete", { recomendados });
