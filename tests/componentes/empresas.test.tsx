/**
 * La venta a empresas en pantalla. Lo que se defiende: que la cotización se
 * vea al momento, que lo que no se sabe salga escrito, y que no vuelva la
 * estimación inventada que había antes (un ±8% sobre una cifra de accesorios
 * que no estaba en ningún catálogo).
 */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Empresas } from "../../src/pages/Empresas.js";
import { montar, responder } from "../ayudas.js";

const PROPUESTA = {
  etiquetaPerfil: "Administración",
  lineas: [
    {
      productoId: "p1",
      slug: "asus-expertbook",
      nombre: "ASUS ExpertBook PM3406",
      condicion: "NUEVO",
      precioUnitario: 1_185_990,
      cantidad: 18,
      importe: 21_347_820,
      stockConocido: true,
      concepto: "equipo",
      porQue: "Oficina y teletrabajo exigente."
    }
  ],
  alternativas: [],
  subtotal: 21_347_820,
  descuento: 0,
  descuentoPorcentaje: 0,
  neto: 17_939_345,
  iva: 3_408_475,
  total: 21_347_820,
  huecos: []
};

const RESPUESTA = {
  ok: true,
  numero: "COT-2026-00007",
  validaHasta: "2026-10-04T00:00:00.000Z",
  propuesta: PROPUESTA
};

async function rellenar(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.click(screen.getByRole("button", { name: "11 — 25" }));
  await usuario.click(screen.getByRole("button", { name: "Administrativo" }));
  await usuario.click(screen.getByRole("button", { name: "$1.200.000" }));
  await usuario.click(screen.getByRole("button", { name: "No, solo el equipo" }));
  await usuario.type(screen.getByLabelText("Tu correo"), "compras@empresa.cl");
  await usuario.click(screen.getByRole("checkbox"));
}

describe("cotizador de empresas", () => {
  it("no enseña ninguna cifra hasta que el servidor la calcula", async () => {
    const usuario = userEvent.setup();
    montar(<Empresas />, "/empresas");

    await usuario.click(screen.getByRole("button", { name: "11 — 25" }));
    await usuario.click(screen.getByRole("button", { name: "Administrativo" }));
    await usuario.click(screen.getByRole("button", { name: "$1.200.000" }));
    await usuario.click(screen.getByRole("button", { name: "No, solo el equipo" }));

    /* La vieja «estimación referencial» pintaba un rango antes de preguntar a
       nadie, sobre 180.000 de accesorios que no salían de ningún catálogo. */
    expect(screen.queryByText(/Estimación referencial/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/—\s*\$/)).not.toBeInTheDocument();
  });

  it("enseña la cotización con número, líneas y desglose de IVA", async () => {
    responder({ "/api/cotizar": RESPUESTA });
    const usuario = userEvent.setup();
    montar(<Empresas />, "/empresas");

    await rellenar(usuario);
    await usuario.click(screen.getByRole("button", { name: "Recibir la propuesta" }));

    expect(await screen.findByText(/Cotización COT-2026-00007/)).toBeInTheDocument();
    expect(screen.getByText(/ASUS ExpertBook PM3406/)).toBeInTheDocument();
    expect(screen.getByText("IVA 19%")).toBeInTheDocument();
    /* El total sale en la línea y en el total: coinciden porque no hay descuento. */
    expect(screen.getAllByText("$21.347.820").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Total con IVA").closest("div")).toHaveTextContent("$21.347.820");
  });

  it("manda las cuatro respuestas y el consentimiento", async () => {
    const doble = responder({ "/api/cotizar": RESPUESTA });
    const usuario = userEvent.setup();
    montar(<Empresas />, "/empresas");

    await rellenar(usuario);
    await usuario.click(screen.getByRole("button", { name: "Recibir la propuesta" }));

    await waitFor(() => expect(doble).toHaveBeenCalled());
    const [, opciones] = doble.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(opciones.body))).toMatchObject({
      correo: "compras@empresa.cl",
      equipos: 18,
      perfil: "administrativo",
      presupuesto: 1_200_000,
      accesorios: false,
      consentimiento: true
    });
  });

  it("los huecos de la propuesta se ven: lo que falta no se esconde", async () => {
    responder({
      "/api/cotizar": {
        ...RESPUESTA,
        propuesta: {
          ...PROPUESTA,
          lineas: [{ ...PROPUESTA.lineas[0], condicion: null, stockConocido: false }],
          huecos: ["El stock de ASUS ExpertBook PM3406 está por confirmar.", "El descuento por volumen no está cargado en el sistema."]
        }
      }
    });
    const usuario = userEvent.setup();
    montar(<Empresas />, "/empresas");

    await rellenar(usuario);
    await usuario.click(screen.getByRole("button", { name: "Recibir la propuesta" }));

    expect(await screen.findByText("Lo que falta por cerrar")).toBeInTheDocument();
    expect(screen.getByText(/El stock de ASUS ExpertBook PM3406 está por confirmar/)).toBeInTheDocument();
    expect(screen.getByText(/Condición por confirmar · stock por confirmar/)).toBeInTheDocument();
  });

  it("si el catálogo no da para ese presupuesto, lo dice y no inventa un total", async () => {
    responder({
      "/api/cotizar": {
        ...RESPUESTA,
        propuesta: { ...PROPUESTA, lineas: [], subtotal: 0, neto: 0, iva: 0, total: 0, huecos: ["Con ese presupuesto no hay nada en el catálogo de hoy."] }
      }
    });
    const usuario = userEvent.setup();
    montar(<Empresas />, "/empresas");

    await rellenar(usuario);
    await usuario.click(screen.getByRole("button", { name: "Recibir la propuesta" }));

    expect(await screen.findByText(/no tenemos hoy nada en catálogo/)).toBeInTheDocument();
    expect(screen.queryByText("Total con IVA")).not.toBeInTheDocument();
  });

  it("sin consentimiento no se manda nada", async () => {
    const doble = responder({ "/api/cotizar": RESPUESTA });
    const usuario = userEvent.setup();
    montar(<Empresas />, "/empresas");

    await usuario.click(screen.getByRole("button", { name: "11 — 25" }));
    await usuario.click(screen.getByRole("button", { name: "Administrativo" }));
    await usuario.click(screen.getByRole("button", { name: "$1.200.000" }));
    await usuario.click(screen.getByRole("button", { name: "No, solo el equipo" }));
    await usuario.type(screen.getByLabelText("Tu correo"), "compras@empresa.cl");
    await usuario.click(screen.getByRole("button", { name: "Recibir la propuesta" }));

    expect(screen.getByText(/aceptes que te contactemos/)).toBeInTheDocument();
    expect(doble).not.toHaveBeenCalled();
  });

  it("una respuesta sin número no finge una cotización", async () => {
    responder({ "/api/cotizar": { ok: true, mensaje: "Listo." } });
    const usuario = userEvent.setup();
    montar(<Empresas />, "/empresas");

    await rellenar(usuario);
    await usuario.click(screen.getByRole("button", { name: "Recibir la propuesta" }));

    expect(await screen.findByText(/No pudimos generar la cotización/)).toBeInTheDocument();
    expect(screen.queryByText(/Cotización COT-/)).not.toBeInTheDocument();
  });
});
