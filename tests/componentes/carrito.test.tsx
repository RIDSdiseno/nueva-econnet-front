/**
 * El carrito es lo que aguanta la escala: una ráfaga de clics tiene que ser
 * una escritura, no diez. Aquí se comprueba con el reloj parado.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProveedorCarrito } from "../../src/features/carrito/ProveedorCarrito.js";
import { useCarrito } from "../../src/features/carrito/useCarrito.js";
import { responder } from "../ayudas.js";

function Sonda() {
  const { lineas, unidades, agregar, cambiar, quitar, vaciar } = useCarrito();
  return (
    <div>
      <output data-testid="unidades">{unidades}</output>
      <output data-testid="lineas">{JSON.stringify(lineas)}</output>
      <button onClick={() => agregar("p1")}>agregar p1</button>
      <button onClick={() => agregar("p2", 3)}>agregar p2 x3</button>
      <button onClick={() => cambiar("p1", 50)}>p1 a 50</button>
      <button onClick={() => quitar("p1")}>quitar p1</button>
      <button onClick={() => vaciar()}>vaciar</button>
    </div>
  );
}

const montarSonda = () => render(<ProveedorCarrito><Sonda /></ProveedorCarrito>);

describe("carrito", () => {
  it("suma, cambia, quita y vacía", async () => {
    const usuario = userEvent.setup();
    montarSonda();

    await usuario.click(screen.getByText("agregar p1"));
    await usuario.click(screen.getByText("agregar p1"));
    await usuario.click(screen.getByText("agregar p2 x3"));
    expect(screen.getByTestId("unidades")).toHaveTextContent("5");

    await usuario.click(screen.getByText("quitar p1"));
    expect(screen.getByTestId("unidades")).toHaveTextContent("3");
    expect(screen.getByTestId("lineas")).not.toHaveTextContent("p1");

    await usuario.click(screen.getByText("vaciar"));
    expect(screen.getByTestId("unidades")).toHaveTextContent("0");
  });

  it("tope de 20 unidades por línea: nadie se lleva 50 de un equipo desde el navegador", async () => {
    const usuario = userEvent.setup();
    montarSonda();

    await usuario.click(screen.getByText("agregar p1"));
    await usuario.click(screen.getByText("p1 a 50"));
    expect(screen.getByTestId("unidades")).toHaveTextContent("20");
  });

  it("una ráfaga de clics es UNA escritura en el servidor, no una por clic", async () => {
    const doble = responder({ "/api/carrito": { ok: true, carrito: { id: "c1", estado: "ABIERTO", valor: 0 }, avisos: false } });
    const usuario = userEvent.setup();
    montarSonda();

    for (let i = 0; i < 6; i++) await usuario.click(screen.getByText("agregar p1"));
    expect(doble).not.toHaveBeenCalled(); /* todavía dentro del retardo de 1,5 s */

    await waitFor(() => expect(doble).toHaveBeenCalledTimes(1), { timeout: 4000 });

    const [, opciones] = doble.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(opciones.body))).toMatchObject({ items: [{ productoId: "p1", cantidad: 6 }] });
  }, 10_000);

  it("si el servidor no contesta, el carrito sigue funcionando", async () => {
    const doble = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    vi.stubGlobal("fetch", doble);
    const usuario = userEvent.setup();
    montarSonda();

    await usuario.click(screen.getByText("agregar p1"));
    await waitFor(() => expect(doble).toHaveBeenCalled(), { timeout: 4000 });

    expect(screen.getByTestId("unidades")).toHaveTextContent("1");
  }, 10_000);

  it("sobrevive a recargar la página", async () => {
    const usuario = userEvent.setup();
    const primera = montarSonda();
    await usuario.click(screen.getByText("agregar p2 x3"));
    primera.unmount();

    montarSonda();
    expect(screen.getByTestId("unidades")).toHaveTextContent("3");
  });

  it("un almacenamiento bloqueado —ventana privada— no rompe la tienda", async () => {
    const guardar = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    const usuario = userEvent.setup();
    montarSonda();

    await usuario.click(screen.getByText("agregar p1"));
    expect(screen.getByTestId("unidades")).toHaveTextContent("1");
    guardar.mockRestore();
  });
});
