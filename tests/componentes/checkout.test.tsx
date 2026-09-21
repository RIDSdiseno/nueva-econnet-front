/**
 * El checkout es donde se pierde el dinero. Se comprueba que avisa antes de
 * enviar, que no promete cobrar lo que no puede, y que la clave de
 * idempotencia se limpia al terminar: si no, el segundo pedido sería el primero.
 */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Checkout } from "../../src/pages/Checkout.js";
import { montar, responder } from "../ayudas.js";

const TOTALES = {
  ok: true,
  lineas: [{ productoId: "p1", nombre: "Lenovo IdeaPad 1", precio: 299990, cantidad: 1, condicion: "NUEVO", stockConocido: true }],
  rechazadas: [],
  totales: { subtotal: 299990, descuento: 0, envio: 6990, total: 306980, neto: 258807, iva: 48173 },
  envio: { costo: 6990, porConfirmar: false, nota: "" },
  cupon: null,
  cuponMotivo: "",
  stockPorConfirmar: false,
  sePuedeCobrar: true
};

const PEDIDO = {
  ok: true,
  numero: "EC-2026-000123",
  estado: "PENDIENTE_PAGO",
  totales: TOTALES.totales,
  porConfirmar: { stock: false, envio: false },
  cuponMotivo: null,
  pago: null
};

/** Deja una línea en el carrito antes de montar: el checkout parte del carrito. */
beforeEach(() => {
  localStorage.setItem("econnet:carrito", JSON.stringify({ id: "c1", lineas: [{ productoId: "p1", cantidad: 1 }] }));
});

async function rellenarLoMinimo(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.type(screen.getByLabelText("Nombre y apellido"), "Omar García");
  await usuario.type(screen.getByLabelText("Correo"), "omar@ejemplo.cl");
  await usuario.selectOptions(screen.getByLabelText("Región"), "Metropolitana de Santiago");
  await usuario.type(screen.getByLabelText("Comuna"), "Providencia");
  await usuario.type(screen.getByLabelText("Dirección"), "La Concepción 65");
  /* Aceptar las condiciones es obligatorio desde que se separó del marketing. */
  await usuario.click(screen.getByRole("checkbox", { name: /términos y condiciones/i }));
}

describe("checkout", () => {
  it("con el carrito vacío no enseña el formulario", () => {
    localStorage.setItem("econnet:carrito", JSON.stringify({ id: null, lineas: [] }));
    montar(<Checkout />, "/checkout");
    expect(screen.getByText("No hay nada que pagar")).toBeInTheDocument();
    expect(screen.queryByLabelText("Correo")).not.toBeInTheDocument();
  });

  it("los campos conservan el foco: se puede escribir un nombre entero de una vez", async () => {
    responder({ "/api/totales": TOTALES });
    const usuario = userEvent.setup();
    montar(<Checkout />, "/checkout");

    const nombre = screen.getByLabelText("Nombre y apellido");
    await usuario.type(nombre, "Omar García");
    expect(nombre).toHaveValue("Omar García");
  });

  it("avisa de lo que falta y no llama a la API", async () => {
    const doble = responder({ "/api/totales": TOTALES });
    const usuario = userEvent.setup();
    montar(<Checkout />, "/checkout");

    await usuario.click(screen.getByRole("button", { name: /Ir a pagar|Reservar mi pedido/ }));

    expect(await screen.findByText("Falta tu nombre.")).toBeInTheDocument();
    expect(screen.getByText("Revisa el correo.")).toBeInTheDocument();
    expect(screen.getByText("Elige una región.")).toBeInTheDocument();
    expect(doble.mock.calls.every(([ruta]) => String(ruta).includes("/api/totales"))).toBe(true);
  });

  it("no deja emitir una factura con un RUT que no pasa el dígito verificador", async () => {
    responder({ "/api/totales": TOTALES });
    const usuario = userEvent.setup();
    montar(<Checkout />, "/checkout");

    await rellenarLoMinimo(usuario);
    await usuario.click(screen.getByRole("radio", { name: /Factura/ }));
    await usuario.type(screen.getByLabelText("RUT de la empresa"), "76.086.428-6");
    await usuario.type(screen.getByLabelText("Razón social"), "Econnet SpA");
    await usuario.type(screen.getByLabelText("Giro"), "Venta de equipos");
    await usuario.click(screen.getByRole("button", { name: /Ir a pagar|Reservar mi pedido/ }));

    expect(await screen.findByText(/no pasa la comprobación del dígito verificador/)).toBeInTheDocument();
  });

  it("con el RUT bueno sí manda la factura completa", async () => {
    const doble = responder({ "/api/totales": TOTALES, "/api/pedido": PEDIDO });
    const usuario = userEvent.setup();
    montar(<Checkout />, "/checkout");

    await rellenarLoMinimo(usuario);
    await usuario.click(screen.getByRole("radio", { name: /Factura/ }));
    await usuario.type(screen.getByLabelText("RUT de la empresa"), "76.086.428-5");
    await usuario.type(screen.getByLabelText("Razón social"), "Econnet SpA");
    await usuario.type(screen.getByLabelText("Giro"), "Venta de equipos");
    await usuario.click(screen.getByRole("button", { name: /Ir a pagar|Reservar mi pedido/ }));

    await waitFor(() => expect(doble.mock.calls.some(([ruta]) => String(ruta).includes("/api/pedido"))).toBe(true));
    const llamada = doble.mock.calls.find(([ruta]) => String(ruta).includes("/api/pedido")) as unknown as [string, RequestInit];
    expect(JSON.parse(String(llamada[1].body))).toMatchObject({
      documento: { tipo: "FACTURA", rut: "76.086.428-5", razonSocial: "Econnet SpA", giro: "Venta de equipos" },
      despacho: { modo: "DESPACHO", region: "Metropolitana de Santiago", comuna: "Providencia" }
    });
  });

  it("en retiro no pide dirección", async () => {
    responder({ "/api/totales": TOTALES });
    const usuario = userEvent.setup();
    montar(<Checkout />, "/checkout");

    await usuario.click(screen.getByRole("radio", { name: /Retiro en oficina/ }));
    expect(screen.queryByLabelText("Dirección")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Región")).not.toBeInTheDocument();
  });

  it("cuando no se puede cobrar lo dice y el botón reserva, no cobra", async () => {
    responder({ "/api/totales": { ...TOTALES, sePuedeCobrar: false, stockPorConfirmar: true } });
    montar(<Checkout />, "/checkout");

    expect(await screen.findByText(/no te cobramos nada ahora/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reservar mi pedido" })).toBeInTheDocument();
  });

  it("el despacho por confirmar no se pinta como gratis", async () => {
    responder({
      "/api/totales": {
        ...TOTALES,
        totales: { ...TOTALES.totales, envio: null, total: 299990 },
        envio: { costo: null, porConfirmar: true, nota: "Te confirmamos el despacho por correo." },
        sePuedeCobrar: false
      }
    });
    montar(<Checkout />, "/checkout");

    expect(await screen.findByText("por confirmar")).toBeInTheDocument();
    expect(screen.getByText(/\+ despacho/)).toBeInTheDocument();
    expect(screen.queryByText("sin costo")).not.toBeInTheDocument();
  });

  it("manda una clave de idempotencia y la borra al terminar: el segundo pedido es otro pedido", async () => {
    const doble = responder({ "/api/totales": TOTALES, "/api/pedido": PEDIDO });
    const usuario = userEvent.setup();
    montar(<Checkout />, "/checkout");

    await rellenarLoMinimo(usuario);
    await usuario.click(screen.getByRole("button", { name: /Ir a pagar|Reservar mi pedido/ }));

    await waitFor(() => expect(doble.mock.calls.some(([ruta]) => String(ruta).includes("/api/pedido"))).toBe(true));
    const llamada = doble.mock.calls.find(([ruta]) => String(ruta).includes("/api/pedido")) as unknown as [string, RequestInit];
    const cuerpo = JSON.parse(String(llamada[1].body)) as { idempotencia: string };
    expect(cuerpo.idempotencia).toMatch(/^[0-9a-f-]{36}$/);
    await waitFor(() => expect(sessionStorage.getItem("econnet:idem")).toBeNull());
  });

  it("manda a Webpay por POST, que es como Webpay lo exige", async () => {
    responder({
      "/api/totales": TOTALES,
      "/api/pedido": {
        ...PEDIDO,
        pago: { tipo: "post", url: "https://webpay3gint.transbank.cl/webpayserver/initTransaction", campos: { token_ws: "01ab" }, referencia: "EC-2026-000123" }
      }
    });
    const enviar = vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(() => undefined);
    const usuario = userEvent.setup();
    montar(<Checkout />, "/checkout");

    await rellenarLoMinimo(usuario);
    await usuario.click(screen.getByRole("button", { name: /Ir a pagar|Reservar mi pedido/ }));

    await waitFor(() => expect(enviar).toHaveBeenCalled());
    const formulario = [...document.querySelectorAll("form")].find((f) => f.method === "post" && f.action.includes("transbank"));
    expect(formulario).toBeDefined();
    expect(formulario?.querySelector<HTMLInputElement>('input[name="token_ws"]')?.value).toBe("01ab");
  });

  it("una respuesta sin número no vacía el carrito ni lleva a una página de gracias vacía", async () => {
    /* Es lo que contesta el servidor cuando le parece un robot: «Listo.» y nada más. */
    responder({ "/api/totales": TOTALES, "/api/pedido": { ok: true, mensaje: "Listo." } });
    const usuario = userEvent.setup();
    montar(<Checkout />, "/checkout");

    await rellenarLoMinimo(usuario);
    await usuario.click(screen.getByRole("button", { name: /Ir a pagar|Reservar mi pedido/ }));

    expect(await screen.findByText(/No pudimos registrar el pedido/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("econnet:carrito") ?? "{}")).toMatchObject({
      lineas: [{ productoId: "p1", cantidad: 1 }]
    });
  });

  it("si el servidor rechaza el pedido, el mensaje se ve y el carrito no se vacía", async () => {
    responder({ "/api/totales": TOTALES, "/api/pedido": { ok: false, error: { codigo: "stock_insuficiente", mensaje: "Quedan 2 unidades." } } });
    const usuario = userEvent.setup();
    montar(<Checkout />, "/checkout");

    await rellenarLoMinimo(usuario);
    await usuario.click(screen.getByRole("button", { name: /Ir a pagar|Reservar mi pedido/ }));

    expect(await screen.findByText("Quedan 2 unidades.")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("econnet:carrito") ?? "{}")).toMatchObject({ lineas: [{ productoId: "p1", cantidad: 1 }] });
  });
});

describe("consentimientos", () => {
  it("son dos casillas distintas: términos obligatorio, publicidad opcional", async () => {
    responder({ "/api/totales": TOTALES });
    montar(<Checkout />, "/checkout");

    expect(screen.getByRole("checkbox", { name: /términos y condiciones/i })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /recibir recomendaciones/i })).not.toBeChecked();
  });

  it("sin aceptar los términos no se manda el pedido", async () => {
    const doble = responder({ "/api/totales": TOTALES, "/api/pedido": PEDIDO });
    const usuario = userEvent.setup();
    montar(<Checkout />, "/checkout");

    await usuario.type(screen.getByLabelText("Nombre y apellido"), "Omar García");
    await usuario.type(screen.getByLabelText("Correo"), "omar@ejemplo.cl");
    await usuario.selectOptions(screen.getByLabelText("Región"), "Metropolitana de Santiago");
    await usuario.type(screen.getByLabelText("Comuna"), "Providencia");
    await usuario.type(screen.getByLabelText("Dirección"), "La Concepción 65");
    await usuario.click(screen.getByRole("button", { name: /Ir a pagar|Reservar mi pedido/ }));

    expect(await screen.findByText(/Hay que aceptar los términos/)).toBeInTheDocument();
    expect(doble.mock.calls.every(([ruta]) => String(ruta).includes("/api/totales"))).toBe(true);
  });

  it("aceptar los términos no suscribe a publicidad", async () => {
    const doble = responder({ "/api/totales": TOTALES, "/api/pedido": PEDIDO });
    const usuario = userEvent.setup();
    montar(<Checkout />, "/checkout");

    await rellenarLoMinimo(usuario);
    await usuario.click(screen.getByRole("button", { name: /Ir a pagar|Reservar mi pedido/ }));

    await waitFor(() => expect(doble.mock.calls.some(([r]) => String(r).includes("/api/pedido"))).toBe(true));
    const llamada = doble.mock.calls.find(([r]) => String(r).includes("/api/pedido")) as unknown as [string, RequestInit];
    expect(JSON.parse(String(llamada[1].body))).toMatchObject({ terminos: true, consentimiento: false });
  });

  it("el resumen enseña qué se compra, con su condición", async () => {
    responder({ "/api/totales": TOTALES });
    montar(<Checkout />, "/checkout");

    expect(await screen.findByText(/Lenovo IdeaPad 1/)).toBeInTheDocument();
    expect(screen.getByText(/Condición: nuevo/)).toBeInTheDocument();
  });
});

/**
 * Lo que encontró la auditoría externa: entre la pantalla y el pedido el total
 * puede subir —un cupón que se agota justo en medio— y antes se creaba el
 * pedido con el total nuevo y se mandaba a pagar sin avisar. En Chile el
 * precio exhibido obliga: eso no es un detalle de experiencia.
 */
describe("el total no cambia a espaldas de nadie", () => {
  it("manda el total que hay en pantalla, para que el servidor pueda frenar", async () => {
    const doble = responder({ "/api/totales": TOTALES, "/api/pedido": PEDIDO });
    const usuario = userEvent.setup();
    montar(<Checkout />, "/checkout");

    await screen.findByLabelText("Correo");
    await rellenarLoMinimo(usuario);
    /* El botón solo dice «Ir a pagar» cuando el total ya llegó. Pulsar antes
       es pulsar sin total en pantalla, que es justo lo que no puede pasar. */
    await usuario.click(await screen.findByRole("button", { name: "Ir a pagar" }));

    await waitFor(() => {
      const envio = doble.mock.calls.find((c) => String(c[0]).includes("/api/pedido"));
      expect(envio).toBeTruthy();
      const cuerpo = JSON.parse(String((envio?.[1] as RequestInit).body)) as { totalEsperado?: number };
      expect(cuerpo.totalEsperado).toBe(TOTALES.totales.total);
    });
  });

  it("si el servidor dice que subió, lo enseña y no manda a pagar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (ruta: string | URL | Request) => {
        const url = String(typeof ruta === "object" && "url" in ruta ? ruta.url : ruta);
        if (url.includes("/api/totales")) {
          return new Response(JSON.stringify(TOTALES), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(
          JSON.stringify({
            ok: false,
            error: {
              codigo: "total_cambio",
              mensaje: "El total cambió antes de cerrar el pedido.",
              detalles: { esperaba: 306980, ahora: 336980, motivo: "El cupón se agotó justo antes de cerrar el pedido." }
            }
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      })
    );

    const usuario = userEvent.setup();
    montar(<Checkout />, "/checkout");

    await screen.findByLabelText("Correo");
    await rellenarLoMinimo(usuario);
    await usuario.click(await screen.findByRole("button", { name: "Ir a pagar" }));

    const aviso = await screen.findByRole("alert");
    expect(aviso).toHaveTextContent(/cupón se agotó/i);
    expect(aviso).toHaveTextContent("$336.980");
    expect(aviso).toHaveTextContent(/vuelve a pulsar para confirmar/i);
  });
});
