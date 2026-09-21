/**
 * El comparador. Lo que se defiende: que no se pueda comparar más de tres
 * —a partir de ahí se hace scroll, no se compara— y que una especificación que
 * no consta salga como «no consta» en vez de en blanco.
 */
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Comparar } from "../../src/pages/Comparar.js";
import { TarjetaProducto } from "../../src/components/ui/TarjetaProducto.js";
import { montar, responder, unProducto } from "../ayudas.js";

const catalogo = [
  unProducto({ id: "p1", slug: "uno", nombre: "Uno", condicion: "NUEVO", specs: { cpu: "Ryzen 5", ram: "16 GB", gpu: null } }),
  unProducto({ id: "p2", slug: "dos", nombre: "Dos", condicion: "OPENBOX", specs: { cpu: "Core i7", ram: "32 GB", gpu: "RTX 4050" } }),
  unProducto({ id: "p3", slug: "tres", nombre: "Tres", condicion: null, specs: {} }),
  unProducto({ id: "p4", slug: "cuatro", nombre: "Cuatro", specs: {} })
];

describe("elegir qué comparar", () => {
  it("la tarjeta ofrece comparar y recuerda el estado", async () => {
    const usuario = userEvent.setup();
    montar(<TarjetaProducto producto={catalogo[0]!} />);

    const boton = screen.getByRole("button", { name: "Comparar" });
    await usuario.click(boton);

    expect(screen.getByRole("button", { name: "Comparando" })).toHaveAttribute("aria-pressed", "true");
  });

  it("no deja pasar de tres: a partir de ahí no se compara, se hace scroll", async () => {
    sessionStorage.setItem("econnet:comparar", JSON.stringify(["uno", "dos", "tres"]));
    const usuario = userEvent.setup();
    montar(<TarjetaProducto producto={catalogo[3]!} />);

    const boton = screen.getByRole("button", { name: "Comparar" });
    expect(boton).toBeDisabled();
    await usuario.click(boton);
    expect(screen.getByRole("button", { name: "Comparar" })).toBeDisabled();
  });
});

describe("la tabla", () => {
  it("sin nada elegido, lo dice y ofrece la salida", () => {
    montar(<Comparar />, "/comparar");
    expect(screen.getByText("No has elegido nada que comparar")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver los equipos" })).toBeInTheDocument();
  });

  it("compara lo elegido, con la condición arriba", async () => {
    sessionStorage.setItem("econnet:comparar", JSON.stringify(["uno", "dos"]));
    responder({ "/api/catalogo": { ok: true, productos: catalogo } });
    montar(<Comparar />, "/comparar");

    expect(await screen.findByText(/Lenovo Uno/)).toBeInTheDocument();
    expect(screen.getByText("Nuevo")).toBeInTheDocument();
    expect(screen.getByText("Openbox")).toBeInTheDocument();
    expect(screen.getByText("Ryzen 5")).toBeInTheDocument();
    expect(screen.getByText("RTX 4050")).toBeInTheDocument();
  });

  it("una especificación que no consta se dice, no se deja en blanco", async () => {
    sessionStorage.setItem("econnet:comparar", JSON.stringify(["uno", "tres"]));
    responder({ "/api/catalogo": { ok: true, productos: catalogo } });
    montar(<Comparar />, "/comparar");

    await screen.findByText(/Lenovo Uno/);
    expect(screen.getAllByText("No consta").length).toBeGreaterThan(3);
  });

  it("se puede quitar un equipo de la comparación", async () => {
    sessionStorage.setItem("econnet:comparar", JSON.stringify(["uno", "dos"]));
    responder({ "/api/catalogo": { ok: true, productos: catalogo } });
    const usuario = userEvent.setup();
    montar(<Comparar />, "/comparar");

    await screen.findByText(/Lenovo Uno/);
    await usuario.click(screen.getAllByRole("button", { name: "Quitar" })[0]!);

    expect(screen.queryByText(/Lenovo Uno/)).not.toBeInTheDocument();
    expect(screen.getByText(/Lenovo Dos/)).toBeInTheDocument();
  });
});
