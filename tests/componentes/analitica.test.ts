/**
 * La capa de eventos. Dos cosas importan: que no rompa nada si no hay
 * `dataLayer` —hoy no lo hay, y no se carga ningún tercero— y que no dispare
 * dos veces la misma compra.
 */
import { afterEach, describe, expect, it } from "vitest";
import { agregarAlCarrito, comprar, olvidarEventos, verProducto } from "../../src/features/analitica/eventos.js";
import { unProducto } from "../ayudas.js";

afterEach(() => {
  olvidarEventos();
  delete (window as unknown as { dataLayer?: unknown[] }).dataLayer;
});

const capa = () => {
  const empujados: Array<Record<string, unknown>> = [];
  (window as unknown as { dataLayer: { push: (e: Record<string, unknown>) => void } }).dataLayer = {
    push: (e) => empujados.push(e)
  };
  return empujados;
};

describe("eventos", () => {
  it("sin dataLayer no pasa nada: la tienda no depende del analytics", () => {
    expect(() => verProducto(unProducto())).not.toThrow();
    expect(() => comprar("ECN-1", 1000)).not.toThrow();
  });

  it("view_item lleva el producto con la forma que esperan Google y Meta", () => {
    const empujados = capa();
    verProducto(unProducto({ sku: "NT104", condicion: "OPENBOX", precio: { lista: null, venta: 299990 } }));

    expect(empujados[0]).toMatchObject({
      event: "view_item",
      currency: "CLP",
      value: 299990,
      items: [{ item_id: "NT104", item_brand: "Lenovo", item_variant: "OPENBOX", price: 299990 }]
    });
  });

  it("sin SKU usa el id: no se inventa un identificador", () => {
    const empujados = capa();
    verProducto(unProducto({ sku: null, id: "p-sin-sku" }));
    expect((empujados[0]!.items as Array<{ item_id: string }>)[0]!.item_id).toBe("p-sin-sku");
  });

  it("la misma compra no se cuenta dos veces", () => {
    const empujados = capa();
    comprar("ECN-2026-00001", 100000);
    comprar("ECN-2026-00001", 100000);
    comprar("ECN-2026-00002", 50000);

    expect(empujados.filter((e) => e.event === "purchase")).toHaveLength(2);
  });

  it("add_to_cart cuenta el valor por la cantidad", () => {
    const empujados = capa();
    agregarAlCarrito(unProducto({ precio: { lista: null, venta: 100000 } }), 3);
    expect(empujados[0]).toMatchObject({ event: "add_to_cart", value: 300000 });
  });
});
