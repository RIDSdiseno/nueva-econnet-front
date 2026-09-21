/**
 * Lo que estas pruebas defienden es una regla del catálogo, no un estilo:
 * cuando un dato no consta, la pantalla lo dice. No lo rellena.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Condicion, Precio, Stock } from "../../src/components/ui/Etiquetas.js";
import { unProducto } from "../ayudas.js";

describe("condición", () => {
  it("la muestra cuando consta", () => {
    render(<Condicion valor="REACONDICIONADO" />);
    expect(screen.getByText("Reacondicionado")).toBeInTheDocument();
  });

  it("dice que está por confirmar cuando no consta, en vez de suponer «Nuevo»", () => {
    render(<Condicion valor={null} />);
    expect(screen.getByText("Condición por confirmar")).toBeInTheDocument();
    expect(screen.queryByText("Nuevo")).not.toBeInTheDocument();
  });
});

describe("stock", () => {
  it("solo canta unidades cuando el stock es conocido", () => {
    const { rerender } = render(<Stock estado="EN_STOCK" unidades={4} />);
    expect(screen.getByText(/Disponible/)).toHaveTextContent("4 unidades");

    rerender(<Stock estado="DESCONOCIDO" unidades={null} />);
    expect(screen.getByText(/Stock por confirmar/)).toBeInTheDocument();
    expect(screen.queryByText(/unidades/)).not.toBeInTheDocument();
  });

  it("no promete existencias cuando no las hay", () => {
    render(<Stock estado="SIN_EXISTENCIAS" unidades={0} />);
    expect(screen.getByText(/Sin existencias/)).toBeInTheDocument();
  });
});

describe("precio", () => {
  it("muestra el precio propio cuando lo hay", () => {
    render(<Precio producto={unProducto()} />);
    expect(screen.getByText(/\$299\.990/)).toBeInTheDocument();
  });

  it("no hace pasar el precio de un marketplace por precio de Econnet", () => {
    render(
      <Precio
        producto={unProducto({
          seVende: false,
          precio: { lista: null, venta: null },
          marketplaces: { falabella: 349990, lider: null },
          referencia: { valor: 349990, propio: false, canal: "falabella" }
        })}
      />
    );
    expect(screen.getByText(/Publicado en falabella/)).toBeInTheDocument();
    expect(screen.getByText(/El precio en econnet\.cl está por confirmar/)).toBeInTheDocument();
  });

  it("cuando no hay ningún precio, lo dice y no pinta un cero", () => {
    render(
      <Precio
        producto={unProducto({
          seVende: false,
          precio: { lista: null, venta: null },
          referencia: { valor: null, propio: false, canal: null }
        })}
      />
    );
    expect(screen.getByText("Precio por confirmar.")).toBeInTheDocument();
    expect(screen.queryByText(/\$0/)).not.toBeInTheDocument();
  });
});
