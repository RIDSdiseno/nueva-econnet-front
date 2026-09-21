/**
 * El panel de inventario.
 *
 * Lo que se comprueba aquí es lo que distingue este panel de una hoja de
 * cálculo: que un campo en blanco viaje como `null` y no como cero, que no se
 * mande un cambio que no lo fue, y que lo que falta se vea.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Panel } from "../../src/pages/Panel.js";
import { montar, RESUMEN_VACIO, unaFila } from "../ayudas.js";

/** Doble de `fetch` que guarda cada llamada y sabe responder con estado. */
function servidor(rutas: Record<string, { estado?: number; cuerpo: unknown }>) {
  const llamadas: Array<{ url: string; metodo: string; cuerpo: unknown }> = [];

  const doble = vi.fn(async (ruta: string | URL | Request, opciones?: RequestInit) => {
    const url = String(typeof ruta === "object" && "url" in ruta ? ruta.url : ruta);
    llamadas.push({
      url,
      metodo: opciones?.method ?? (opciones?.body ? "POST" : "GET"),
      cuerpo: opciones?.body ? JSON.parse(String(opciones.body)) : null
    });
    const clave = Object.keys(rutas)
      .sort((a, b) => b.length - a.length)
      .find((k) => url.includes(k));
    if (!clave) throw new Error(`la prueba no preparó una respuesta para ${url}`);
    const { estado = 200, cuerpo } = rutas[clave] as { estado?: number; cuerpo: unknown };
    return new Response(JSON.stringify(cuerpo), { status: estado, headers: { "Content-Type": "application/json" } });
  });

  vi.stubGlobal("fetch", doble);
  return llamadas;
}

const SESION_DENTRO = { estado: 200, cuerpo: { ok: true, configurado: true, entrado: true } };

const inventarioCon = (productos: ReturnType<typeof unaFila>[], resumen = RESUMEN_VACIO) => ({
  estado: 200,
  cuerpo: { ok: true, productos, resumen: { ...resumen, total: productos.length }, cambios: [] }
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("la puerta del panel", () => {
  it("sin sesión pide la clave, no enseña el inventario", async () => {
    servidor({ "/api/panel/sesion": { cuerpo: { ok: true, configurado: true, entrado: false } } });
    montar(<Panel />, "/panel");

    expect(await screen.findByLabelText("Clave")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("sin clave configurada en el servidor, explica cómo generarla", async () => {
    servidor({ "/api/panel/sesion": { cuerpo: { ok: true, configurado: false, entrado: false } } });
    montar(<Panel />, "/panel");

    expect(await screen.findByText(/todavía no está abierto/i)).toBeInTheDocument();
    expect(screen.getByText(/npm run clave/)).toBeInTheDocument();
  });
});

describe("la tabla del inventario", () => {
  it("un precio que no consta se enseña vacío, no como cero", async () => {
    servidor({
      "/api/panel/sesion": SESION_DENTRO,
      "/api/panel/inventario": inventarioCon([unaFila({ precioVenta: null, seVende: false })])
    });
    montar(<Panel />, "/panel");

    const precio = await screen.findByLabelText("Precio de Lenovo IdeaPad 1");
    expect(precio).toHaveValue("");
    expect(precio).not.toHaveValue("0");
  });

  it("vaciar el precio manda null, no cero", async () => {
    const llamadas = servidor({
      "/api/panel/sesion": SESION_DENTRO,
      "/api/panel/inventario": inventarioCon([unaFila()]),
      "/api/panel/productos/p1": { cuerpo: { ok: true, producto: unaFila({ precioVenta: null }) } }
    });
    montar(<Panel />, "/panel");

    const precio = await screen.findByLabelText("Precio de Lenovo IdeaPad 1");
    await userEvent.clear(precio);
    await userEvent.tab();

    await waitFor(() => {
      const escritura = llamadas.find((l) => l.metodo === "PATCH");
      expect(escritura).toBeTruthy();
      expect((escritura?.cuerpo as { precioVenta: unknown }).precioVenta).toBeNull();
    });
  });

  it("escribir el mismo precio no manda nada: el historial no se ensucia", async () => {
    const llamadas = servidor({
      "/api/panel/sesion": SESION_DENTRO,
      "/api/panel/inventario": inventarioCon([unaFila()])
    });
    montar(<Panel />, "/panel");

    const precio = await screen.findByLabelText("Precio de Lenovo IdeaPad 1");
    await userEvent.click(precio);
    await userEvent.tab();

    expect(llamadas.filter((l) => l.metodo === "PATCH")).toHaveLength(0);
  });

  it("un precio negativo no se manda: se devuelve el que había", async () => {
    const llamadas = servidor({
      "/api/panel/sesion": SESION_DENTRO,
      "/api/panel/inventario": inventarioCon([unaFila()])
    });
    montar(<Panel />, "/panel");

    const precio = await screen.findByLabelText("Precio de Lenovo IdeaPad 1");
    await userEvent.clear(precio);
    await userEvent.type(precio, "-5");
    await userEvent.tab();

    expect(llamadas.filter((l) => l.metodo === "PATCH")).toHaveLength(0);
    await waitFor(() => expect(precio).toHaveValue("299990"));
  });

  it("cada equipo dice qué le falta para poder venderse", async () => {
    servidor({
      "/api/panel/sesion": SESION_DENTRO,
      "/api/panel/inventario": inventarioCon([unaFila()])
    });
    montar(<Panel />, "/panel");

    const fila = (await screen.findByRole("table")).querySelectorAll("tbody tr")[0];
    expect(within(fila as HTMLElement).getByText("imagen")).toBeInTheDocument();
    expect(within(fila as HTMLElement).getByText("garantía declarada")).toBeInTheDocument();
  });

  it("lo reservado se avisa: no todo lo que hay está disponible", async () => {
    servidor({
      "/api/panel/sesion": SESION_DENTRO,
      "/api/panel/inventario": inventarioCon([unaFila({ stockUnidades: 10, reservadas: 3, disponibles: 7 })])
    });
    montar(<Panel />, "/panel");

    expect(await screen.findByText(/3 reservadas · quedan 7/)).toBeInTheDocument();
  });

  it("sin nada que sumar, el valor en bodega dice «no consta», no $0", async () => {
    servidor({
      "/api/panel/sesion": SESION_DENTRO,
      "/api/panel/inventario": inventarioCon([unaFila()], { ...RESUMEN_VACIO, valorInventario: null })
    });
    montar(<Panel />, "/panel");

    expect(await screen.findByText("no consta")).toBeInTheDocument();
    expect(screen.queryByText("$0")).not.toBeInTheDocument();
  });
});

describe("añadir un equipo", () => {
  it("con marca, nombre y categoría basta, y lo que no se puso viaja como null", async () => {
    const llamadas = servidor({
      "/api/panel/sesion": SESION_DENTRO,
      "/api/panel/inventario": inventarioCon([]),
      "/api/panel/productos": { estado: 201, cuerpo: { ok: true, producto: unaFila() } }
    });
    montar(<Panel />, "/panel");

    await userEvent.click(await screen.findByRole("button", { name: /Añadir equipo/i }));
    await userEvent.type(screen.getByLabelText(/^Marca/), "Lenovo");
    await userEvent.type(screen.getByLabelText(/^Nombre/), "ThinkPad E14");
    await userEvent.type(screen.getByLabelText(/^Categoría/), "Notebook");
    await userEvent.click(screen.getByRole("button", { name: /Añadir al inventario/i }));

    await waitFor(() => {
      const alta = llamadas.find((l) => l.url.endsWith("/api/panel/productos") && l.metodo === "POST");
      expect(alta).toBeTruthy();
      const cuerpo = alta?.cuerpo as Record<string, unknown>;
      expect(cuerpo.marca).toBe("Lenovo");
      expect(cuerpo.precioVenta).toBeNull();
      expect(cuerpo.stockUnidades).toBeNull();
      expect(cuerpo.condicion).toBeNull();
      expect(cuerpo.garantia).toBeNull();
      /* Ni cero, ni cadena vacía: lo que no consta es null. */
      expect(cuerpo.precioVenta).not.toBe(0);
      expect(cuerpo.garantia).not.toBe("");
    });
  });

  it("sin marca ni nombre no se manda nada y se dice por qué", async () => {
    const llamadas = servidor({
      "/api/panel/sesion": SESION_DENTRO,
      "/api/panel/inventario": inventarioCon([])
    });
    montar(<Panel />, "/panel");

    await userEvent.click(await screen.findByRole("button", { name: /Añadir equipo/i }));
    await userEvent.click(screen.getByRole("button", { name: /Añadir al inventario/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/lo mínimo/i);
    expect(llamadas.filter((l) => l.metodo === "POST" && l.url.endsWith("/productos"))).toHaveLength(0);
  });

  it("el formulario no pierde el foco al escribir (campos a nivel de módulo)", async () => {
    servidor({
      "/api/panel/sesion": SESION_DENTRO,
      "/api/panel/inventario": inventarioCon([])
    });
    montar(<Panel />, "/panel");

    await userEvent.click(await screen.findByRole("button", { name: /Añadir equipo/i }));
    const marca = screen.getByLabelText(/^Marca/);
    await userEvent.type(marca, "Lenovo");

    expect(marca).toHaveFocus();
    expect(marca).toHaveValue("Lenovo");
  });
});
