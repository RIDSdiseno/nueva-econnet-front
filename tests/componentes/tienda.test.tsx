/** La tienda filtra en el navegador: nadie paga una petición por marcar una casilla. */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tienda } from "../../src/pages/Tienda.js";
import { montar, responder, unProducto } from "../ayudas.js";

const catalogo = [
  unProducto({ id: "p1", slug: "lenovo-ideapad-1", marca: "Lenovo", nombre: "IdeaPad 1", precio: { lista: null, venta: 299990 }, usos: ["estudiar"] }),
  unProducto({
    id: "p2", slug: "hp-victus-15", marca: "HP", nombre: "Victus 15", condicion: "OPENBOX",
    precio: { lista: null, venta: 899990 }, usos: ["jugar"], specs: { cpu: "Core i5", ram: "16 GB", almacenamiento: "512 GB SSD" }
  }),
  unProducto({
    id: "p3", slug: "apple-macbook-air", marca: "Apple", nombre: "MacBook Air", condicion: null, seVende: false,
    precio: { lista: null, venta: null }, referencia: { valor: 1199990, propio: false, canal: "falabella" }, usos: ["crear"]
  })
];

describe("tienda", () => {
  it("pinta el catálogo que devuelve la API, con una sola petición", async () => {
    const doble = responder({ "/api/catalogo": { ok: true, productos: catalogo } });
    montar(<Tienda />, "/tienda");

    expect(await screen.findByText(/IdeaPad 1/)).toBeInTheDocument();
    expect(screen.getByText("3 equipos")).toBeInTheDocument();
    expect(doble).toHaveBeenCalledTimes(1);
  });

  it("busca sin volver a llamar al servidor", async () => {
    const doble = responder({ "/api/catalogo": { ok: true, productos: catalogo } });
    const usuario = userEvent.setup();
    montar(<Tienda />, "/tienda");
    await screen.findByText(/IdeaPad 1/);

    await usuario.type(screen.getByLabelText("Buscar"), "victus");

    await waitFor(() => expect(screen.getByText("1 equipo")).toBeInTheDocument());
    expect(screen.queryByText(/IdeaPad 1/)).not.toBeInTheDocument();
    expect(doble).toHaveBeenCalledTimes(1);
  });

  it("filtra por marca", async () => {
    responder({ "/api/catalogo": { ok: true, productos: catalogo } });
    const usuario = userEvent.setup();
    montar(<Tienda />, "/tienda");
    await screen.findByText(/IdeaPad 1/);

    await usuario.click(screen.getByRole("checkbox", { name: /^Apple/ }));
    expect(screen.getByText("1 equipo")).toBeInTheDocument();
    expect(screen.getByText(/MacBook Air/)).toBeInTheDocument();
  });

  it("ordena de barato a caro y deja atrás los que no tienen precio propio", async () => {
    responder({ "/api/catalogo": { ok: true, productos: catalogo } });
    const usuario = userEvent.setup();
    montar(<Tienda />, "/tienda");
    await screen.findByText(/IdeaPad 1/);

    await usuario.selectOptions(screen.getByLabelText("Ordenar"), "barato");
    const titulos = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titulos).toEqual(["Lenovo IdeaPad 1", "HP Victus 15", "Apple MacBook Air"]);
  });

  it("solo ofrece las condiciones que constan: no inventa «Nuevo» para el que no la declara", async () => {
    responder({ "/api/catalogo": { ok: true, productos: catalogo } });
    montar(<Tienda />, "/tienda");
    await screen.findByText(/IdeaPad 1/);

    expect(screen.getByRole("checkbox", { name: /^Nuevo/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /^Openbox/ })).toBeInTheDocument();
    expect(screen.getByText("Condición por confirmar")).toBeInTheDocument();
  });

  it("cuando no queda nada, lo dice en vez de dejar un hueco", async () => {
    responder({ "/api/catalogo": { ok: true, productos: catalogo } });
    const usuario = userEvent.setup();
    montar(<Tienda />, "/tienda");
    await screen.findByText(/IdeaPad 1/);

    await usuario.type(screen.getByLabelText("Buscar"), "zzzz");
    expect(await screen.findByText(/No hay equipos con esos filtros/)).toBeInTheDocument();
  });

  it("si el catálogo no carga, se ve el error y no una página en blanco", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ ok: false, error: { codigo: "interno", mensaje: "Algo se rompió." } }), { status: 500 })) as typeof fetch;
    montar(<Tienda />, "/tienda");

    expect(await screen.findByText("Algo se rompió.")).toBeInTheDocument();
  });

  it("un equipo sin precio propio ofrece consultar, no agregar al carrito", async () => {
    responder({ "/api/catalogo": { ok: true, productos: [catalogo[2]] } });
    montar(<Tienda />, "/tienda");

    expect(await screen.findByText("Consultar precio")).toBeInTheDocument();
    expect(screen.queryByText("Agregar")).not.toBeInTheDocument();
  });
});
