import { describe, expect, it } from "vitest";
import { REGIONES, rutValido } from "../../src/features/checkout/regiones.js";
import { clp, ErrorDeApi, api } from "../../src/services/api.js";
import { responder } from "../ayudas.js";

describe("RUT", () => {
  it("acepta un RUT con dígito verificador correcto", () => {
    expect(rutValido("76.086.428-5")).toBe(true);
    expect(rutValido("76086428-5")).toBe(true);
  });

  it("rechaza el mismo RUT con otro dígito", () => {
    expect(rutValido("76.086.428-6")).toBe(false);
  });

  it("acepta la K como dígito verificador", () => {
    expect(rutValido("17.000.003-K")).toBe(true);
    expect(rutValido("17000003-k")).toBe(true);
  });

  it("rechaza lo que no tiene forma de RUT", () => {
    for (const malo of ["", "76086428", "abc-1", "1-9", "123456789012-3"]) {
      expect(rutValido(malo)).toBe(false);
    }
  });
});

describe("regiones", () => {
  it("son las dieciséis de Chile, sin repetidas", () => {
    expect(REGIONES).toHaveLength(16);
    expect(new Set(REGIONES).size).toBe(16);
  });
});

describe("clp", () => {
  it("formatea pesos sin decimales", () => {
    expect(clp(299990)).toBe("$299.990");
    expect(clp(0)).toBe("$0");
  });

  it("dice «por confirmar» cuando no hay precio, en vez de inventar un cero", () => {
    expect(clp(null)).toBe("por confirmar");
    expect(clp(undefined)).toBe("por confirmar");
  });
});

describe("cliente de la API", () => {
  it("traduce el error del servidor a ErrorDeApi con su código", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ ok: false, error: { codigo: "stock_insuficiente", mensaje: "Quedan 2." } }), {
        status: 409
      })) as typeof fetch;

    await expect(api.catalogo()).rejects.toMatchObject({
      name: "ErrorDeApi",
      codigo: "stock_insuficiente",
      message: "Quedan 2.",
      estado: 409
    });
  });

  it("convierte la caída de red en un mensaje que una persona entiende", async () => {
    globalThis.fetch = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;

    await expect(api.catalogo()).rejects.toMatchObject({ codigo: "sin_conexion" });
    await expect(api.catalogo()).rejects.toBeInstanceOf(ErrorDeApi);
  });

  it("manda el tiempo de formulario en el cuerpo: es la trampa anti-robot del servidor", async () => {
    const doble = responder({ "/api/carrito": { ok: true, carrito: { id: "c1", estado: "ABIERTO", valor: 0 }, avisos: false } });
    await api.guardarCarrito({ items: [{ productoId: "p1", cantidad: 1 }] });

    const [, opciones] = doble.mock.calls[0] as unknown as [string, RequestInit];
    const cuerpo = JSON.parse(String(opciones.body)) as { ms: number };
    expect(typeof cuerpo.ms).toBe("number");
  });

  it("NO manda el tiempo de formulario a /api/totales: su esquema es estricto y lo rechazaría", async () => {
    const doble = responder({
      "/api/totales": {
        ok: true,
        lineas: [],
        rechazadas: [],
        totales: { subtotal: 0, descuento: 0, envio: null, total: 0, neto: 0, iva: 0 },
        envio: { costo: null, porConfirmar: true, nota: "" },
        cupon: null,
        cuponMotivo: "",
        stockPorConfirmar: false,
        sePuedeCobrar: false
      }
    });
    await api.totales({ items: [{ productoId: "p1", cantidad: 1 }] });

    const [, opciones] = doble.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(opciones.body))).not.toHaveProperty("ms");
  });

  it("no manda cuerpo en las lecturas", async () => {
    const doble = responder({ "/api/catalogo": { ok: true, productos: [] } });
    await api.catalogo();
    const [ruta, opciones] = doble.mock.calls[0] as unknown as [string, RequestInit];
    expect(ruta).toContain("/api/catalogo");
    expect(opciones.body).toBeUndefined();
  });
});
