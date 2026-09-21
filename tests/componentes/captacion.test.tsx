/**
 * Los imanes de captación. Lo que se comprueba no es el diseño: es que no se
 * manda un correo sin consentimiento —Ley 19.628— y que la recomendación del
 * test sale del catálogo, no de un gusto.
 */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FormularioCorreo } from "../../src/features/captacion/FormularioCorreo.js";
import { TestDeCompra } from "../../src/features/test/TestDeCompra.js";
import { puntuar } from "../../src/features/test/puntuar.js";
import { montar, responder, unProducto } from "../ayudas.js";

const catalogo = [
  unProducto({
    id: "p1", slug: "lenovo-ideapad-1", marca: "Lenovo", nombre: "IdeaPad 1", usos: ["estudiar"], valores: ["precio"],
    precio: { lista: null, venta: 450000 }, referencia: { valor: 450000, propio: true, canal: null }, noPara: "editar vídeo"
  }),
  unProducto({
    id: "p2", slug: "hp-victus-15", marca: "HP", nombre: "Victus 15", usos: ["jugar"], valores: ["potencia"],
    precio: { lista: null, venta: 899990 }, referencia: { valor: 899990, propio: true, canal: null }, noPara: "cargarlo todo el día"
  }),
  unProducto({
    id: "p3", slug: "apple-macbook-air", marca: "Apple", nombre: "MacBook Air", usos: ["crear"], valores: ["portabilidad"],
    seVende: false, precio: { lista: null, venta: null }, referencia: { valor: 1199990, propio: false, canal: "falabella" },
    noPara: "jugar", confianza: "MEDIA"
  })
];

describe("puntuación del test", () => {
  it("premia el uso, el presupuesto y lo que se valora", () => {
    const [primero] = puntuar(catalogo, "estudiar", "0-600000", "precio");
    expect(primero?.producto.id).toBe("p1");
    expect(primero?.motivos).toContain("está pensado para eso");
    expect(primero?.motivos).toContain("entra en tu presupuesto");
  });

  it("no recomienda nada cuando nada calza, en vez de rellenar con lo que haya", () => {
    /* Ninguno es para empresa, ninguno valora la pantalla y los tres cuestan
       muy por debajo del presupuesto: no llegan al mínimo. */
    expect(puntuar(catalogo, "empresa", "1500000-99000000", "pantalla")).toHaveLength(0);
  });

  it("un equipo dentro del presupuesto puntúa aunque no sea para ese uso: es una pista, no un despiste", () => {
    const salida = puntuar(catalogo, "empresa", "0-600000", "pantalla");
    expect(salida).toHaveLength(1);
    expect(salida[0]?.motivos).toEqual(["entra en tu presupuesto"]);
  });

  it("nunca devuelve más de tres", () => {
    const muchos = Array.from({ length: 9 }, (_, i) =>
      unProducto({ id: `x${i}`, slug: `x${i}`, usos: ["estudiar"], valores: ["precio"], referencia: { valor: 450000, propio: true, canal: null } })
    );
    expect(puntuar(muchos, "estudiar", "0-600000", "precio")).toHaveLength(3);
  });
});

describe("test de compra", () => {
  it("pide las tres respuestas antes de recomendar", async () => {
    responder({ "/api/catalogo": { ok: true, productos: catalogo } });
    const usuario = userEvent.setup();
    montar(<TestDeCompra productos={catalogo} />);

    await usuario.click(screen.getByRole("button", { name: "Ver mis equipos" }));
    expect(screen.getByText(/Responde las tres preguntas/)).toBeInTheDocument();
  });

  it("enseña los equipos con su motivo y para quién NO son", async () => {
    const usuario = userEvent.setup();
    montar(<TestDeCompra productos={catalogo} />);

    await usuario.selectOptions(screen.getByLabelText(/¿Para qué lo necesitas\?/), "estudiar");
    await usuario.selectOptions(screen.getByLabelText(/¿Cuánto quieres invertir\?/), "0-600000");
    await usuario.selectOptions(screen.getByLabelText(/¿Qué valoras más\?/), "precio");
    await usuario.click(screen.getByRole("button", { name: "Ver mis equipos" }));

    expect(screen.getByText(/Lenovo IdeaPad 1/)).toBeInTheDocument();
    expect(screen.getByText(/Porque está pensado para eso/)).toBeInTheDocument();
    expect(screen.getByText(/No es para ti si: editar vídeo/)).toBeInTheDocument();
  });

  it("cuando no hay nada honesto que recomendar, lo dice", async () => {
    const usuario = userEvent.setup();
    montar(<TestDeCompra productos={catalogo} />);

    await usuario.selectOptions(screen.getByLabelText(/¿Para qué lo necesitas\?/), "empresa");
    await usuario.selectOptions(screen.getByLabelText(/¿Cuánto quieres invertir\?/), "1500000-99000000");
    await usuario.selectOptions(screen.getByLabelText(/¿Qué valoras más\?/), "pantalla");
    await usuario.click(screen.getByRole("button", { name: "Ver mis equipos" }));

    expect(screen.getByText(/no tenemos nada que recomendarte con honestidad/)).toBeInTheDocument();
  });

  it("manda los tres recomendados con el correo", async () => {
    const doble = responder({ "/api/suscribir": { ok: true, mensaje: "Te lo mandamos." } });
    const usuario = userEvent.setup();
    montar(<TestDeCompra productos={catalogo} />);

    await usuario.selectOptions(screen.getByLabelText(/¿Para qué lo necesitas\?/), "estudiar");
    await usuario.selectOptions(screen.getByLabelText(/¿Cuánto quieres invertir\?/), "0-600000");
    await usuario.selectOptions(screen.getByLabelText(/¿Qué valoras más\?/), "precio");
    await usuario.click(screen.getByRole("button", { name: "Ver mis equipos" }));

    await usuario.type(screen.getByPlaceholderText("Tu correo"), "omar@ejemplo.cl");
    await usuario.click(screen.getByRole("checkbox"));
    await usuario.click(screen.getByRole("button", { name: "Mandármelos" }));

    await waitFor(() => expect(doble).toHaveBeenCalled());
    const [, opciones] = doble.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(opciones.body))).toMatchObject({
      correo: "omar@ejemplo.cl",
      origen: "test",
      consentimiento: true,
      recomendados: ["Lenovo IdeaPad 1"]
    });
  });
});

describe("formulario de correo", () => {
  const montarImanes = () =>
    montar(
      <FormularioCorreo
        origen="boletin"
        titulo="10% en tu primera compra"
        texto="Te mandamos el código."
        consentimiento="Acepto recibir el código."
      />
    );

  it("no manda nada sin consentimiento", async () => {
    const doble = responder({ "/api/suscribir": { ok: true, mensaje: "Listo." } });
    const usuario = userEvent.setup();
    montarImanes();

    await usuario.type(screen.getByPlaceholderText("Tu correo"), "omar@ejemplo.cl");
    await usuario.click(screen.getByRole("button", { name: "Quiero recibirlo" }));

    expect(screen.getByText(/Marca la casilla/)).toBeInTheDocument();
    expect(doble).not.toHaveBeenCalled();
  });

  it("no manda nada con un correo que no lo es", async () => {
    const doble = responder({ "/api/suscribir": { ok: true, mensaje: "Listo." } });
    const usuario = userEvent.setup();
    montarImanes();

    await usuario.type(screen.getByPlaceholderText("Tu correo"), "omar@arroba");
    await usuario.click(screen.getByRole("checkbox"));
    await usuario.click(screen.getByRole("button", { name: "Quiero recibirlo" }));

    expect(screen.getByText("Revisa el correo.")).toBeInTheDocument();
    expect(doble).not.toHaveBeenCalled();
  });

  it("dice desde el principio que la baja es de un clic: lo pide el art. 28 B", () => {
    montarImanes();
    expect(screen.getByText(/de baja en un clic/)).toBeInTheDocument();
  });

  it("lleva la trampa para robots, fuera del recorrido con teclado", () => {
    const { container } = montarImanes();
    const trampa = container.querySelector<HTMLInputElement>('input[name="empresa_web"]');
    expect(trampa).not.toBeNull();
    expect(trampa?.tabIndex).toBe(-1);
    expect(trampa?.getAttribute("aria-hidden")).toBe("true");
  });

  it("con todo en regla, manda el correo y el origen, y da las gracias", async () => {
    const doble = responder({ "/api/suscribir": { ok: true, mensaje: "Te llegó el código al correo." } });
    const usuario = userEvent.setup();
    montarImanes();

    await usuario.type(screen.getByPlaceholderText("Tu correo"), "omar@ejemplo.cl");
    await usuario.click(screen.getByRole("checkbox"));
    await usuario.click(screen.getByRole("button", { name: "Quiero recibirlo" }));

    await waitFor(() => expect(screen.getByText("Te llegó el código al correo.")).toBeInTheDocument());
    const [, opciones] = doble.mock.calls[0] as unknown as [string, RequestInit];
    const cuerpo = JSON.parse(String(opciones.body)) as Record<string, unknown>;
    expect(cuerpo).toMatchObject({ correo: "omar@ejemplo.cl", origen: "boletin", consentimiento: true });
    expect(cuerpo).not.toHaveProperty("empresa_web"); /* vacía no se manda */
    expect(cuerpo.ms).toBeTypeOf("number"); /* el tiempo de formulario sí: aquí el servidor lo mira */
  });

  it("si el servidor la rechaza, se ve el motivo y no se finge un «listo»", async () => {
    responder({ "/api/suscribir": { ok: false, error: { codigo: "correo_rebotado", mensaje: "Ese correo rebota." } } });
    const usuario = userEvent.setup();
    montarImanes();

    await usuario.type(screen.getByPlaceholderText("Tu correo"), "omar@ejemplo.cl");
    await usuario.click(screen.getByRole("checkbox"));
    await usuario.click(screen.getByRole("button", { name: "Quiero recibirlo" }));

    expect(await screen.findByText("Ese correo rebota.")).toBeInTheDocument();
  });
});
