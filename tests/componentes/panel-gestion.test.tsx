/**
 * Las pantallas nuevas del panel: pedidos, cotizaciones, ajustes y margen.
 *
 * Lo que se defiende aquí es lo mismo de siempre, aplicado a sitios nuevos:
 * que un dato que no consta se diga y no se rellene, y que la pantalla no
 * ofrezca acciones que el servidor va a rechazar.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Panel } from "../../src/pages/Panel.js";
import { montar, RESUMEN_VACIO, unaFila } from "../ayudas.js";

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

const DENTRO = { estado: 200, cuerpo: { ok: true, configurado: true, entrado: true } };
const inventarioCon = (productos: ReturnType<typeof unaFila>[], resumen = RESUMEN_VACIO) => ({
  estado: 200,
  cuerpo: { ok: true, productos, resumen: { ...resumen, total: productos.length }, cambios: [] }
});

const UN_PEDIDO = {
  numero: "EC-2026-00042",
  estado: "PENDIENTE_PAGO",
  creado: "2026-09-20T12:00:00.000Z",
  actualizado: "2026-09-20T12:00:00.000Z",
  cliente: { nombre: "Ana Pérez", correo: "ana@empresa.cl", telefono: "+56912345678", rut: null, razonSocial: null },
  despacho: { modo: "RETIRO", region: null, comuna: null, direccion: null, notas: null, porConfirmar: false },
  documento: "BOLETA",
  totales: { subtotal: 299990, descuento: 0, envio: null, neto: 252092, iva: 47898, total: 299990 },
  pago: { metodo: null, estado: "pendiente", referencia: null, monto: null, fecha: null },
  stock: { estado: "RESERVADO", porConfirmar: false },
  terminosEn: "2026-09-20T12:00:00.000Z",
  caducaEn: null,
  items: [{ productoId: "p1", nombre: "Lenovo IdeaPad 1", precio: 299990, cantidad: 1, condicion: "NUEVO" }]
};

const UNA_COTIZACION = {
  numero: "COT-2026-00007",
  estado: "ENVIADA",
  creado: "2026-09-20T12:00:00.000Z",
  validaHasta: "2026-10-05T12:00:00.000Z",
  empresa: "Constructora Ejemplo SpA",
  nombre: "Ana Pérez",
  correo: "compras@empresa.cl",
  rut: null,
  telefono: null,
  equipos: 20,
  perfil: "administrativo",
  presupuesto: 1200000,
  accesorios: false,
  totales: { neto: 5000000, iva: 950000, descuento: 0, total: 5950000 },
  seguimiento: 1,
  proximoCorreo: "2026-09-25T12:00:00.000Z"
};

afterEach(() => vi.unstubAllGlobals());

describe("pedidos", () => {
  it("solo se ofrecen los estados a los que de verdad se puede ir", async () => {
    servidor({
      "/api/panel/sesion": DENTRO,
      "/api/panel/inventario": inventarioCon([]),
      "/api/panel/pedidos/EC-2026-00042": {
        cuerpo: {
          ok: true,
          pedido: UN_PEDIDO,
          eventos: [{ estado: "PENDIENTE_PAGO", nota: "creado", fecha: "2026-09-20T12:00:00.000Z" }],
          /* Desde «esperando pago» no se puede saltar a «entregado». */
          siguientes: ["PAGADO", "ANULADO", "REVISAR"]
        }
      },
      "/api/panel/pedidos": { cuerpo: { ok: true, pedidos: [UN_PEDIDO], cuentas: { PENDIENTE_PAGO: 1 }, transiciones: {} } }
    });
    montar(<Panel />, "/panel");

    await userEvent.click(await screen.findByRole("button", { name: "Pedidos" }));
    await userEvent.click(await screen.findByRole("button", { name: "Abrir" }));

    const ficha = await screen.findByRole("dialog");
    expect(within(ficha).getByRole("button", { name: "Pagado" })).toBeInTheDocument();
    expect(within(ficha).getByRole("button", { name: "Anulado" })).toBeInTheDocument();
    /* Y el salto imposible no está ni como opción. */
    expect(within(ficha).queryByRole("button", { name: "Entregado" })).not.toBeInTheDocument();
    expect(within(ficha).queryByRole("button", { name: "Despachado" })).not.toBeInTheDocument();
  });

  it("un despacho sin tarifa se dice «por confirmar», no $0", async () => {
    servidor({
      "/api/panel/sesion": DENTRO,
      "/api/panel/inventario": inventarioCon([]),
      "/api/panel/pedidos/EC-2026-00042": { cuerpo: { ok: true, pedido: UN_PEDIDO, eventos: [], siguientes: [] } },
      "/api/panel/pedidos": { cuerpo: { ok: true, pedidos: [UN_PEDIDO], cuentas: {}, transiciones: {} } }
    });
    montar(<Panel />, "/panel");

    await userEvent.click(await screen.findByRole("button", { name: "Pedidos" }));
    await userEvent.click(await screen.findByRole("button", { name: "Abrir" }));

    const ficha = await screen.findByRole("dialog");
    expect(within(ficha).getByText("por confirmar")).toBeInTheDocument();
    expect(within(ficha).queryByText("$0")).not.toBeInTheDocument();
  });

  it("avisa de los pedidos que esperan algo tuyo", async () => {
    servidor({
      "/api/panel/sesion": DENTRO,
      "/api/panel/inventario": inventarioCon([]),
      "/api/panel/pedidos": {
        cuerpo: { ok: true, pedidos: [UN_PEDIDO], cuentas: { PENDIENTE_PAGO: 1, REVISAR: 2 }, transiciones: {} }
      }
    });
    montar(<Panel />, "/panel");

    await userEvent.click(await screen.findByRole("button", { name: "Pedidos" }));
    expect(await screen.findByText(/3 pedidos esperando algo tuyo/)).toBeInTheDocument();
  });
});

describe("cotizaciones", () => {
  it("se puede marcar ganada o perdida, y eso para el seguimiento", async () => {
    const llamadas = servidor({
      "/api/panel/sesion": DENTRO,
      "/api/panel/inventario": inventarioCon([]),
      "/api/panel/cotizaciones/COT-2026-00007/estado": {
        cuerpo: { ok: true, cotizacion: { ...UNA_COTIZACION, estado: "PERDIDA", proximoCorreo: null } }
      },
      "/api/panel/cotizaciones": { cuerpo: { ok: true, cotizaciones: [UNA_COTIZACION], cuentas: { ENVIADA: 1 } } }
    });
    montar(<Panel />, "/panel");

    await userEvent.click(await screen.findByRole("button", { name: "Cotizaciones" }));
    await userEvent.click(await screen.findByRole("button", { name: "Perdida" }));

    await waitFor(() => {
      const envio = llamadas.find((l) => l.url.includes("/estado") && l.metodo === "POST");
      expect((envio?.cuerpo as { estado: string }).estado).toBe("PERDIDA");
    });
  });

  it("suma lo que hay en juego en las que siguen abiertas", async () => {
    servidor({
      "/api/panel/sesion": DENTRO,
      "/api/panel/inventario": inventarioCon([]),
      "/api/panel/cotizaciones": { cuerpo: { ok: true, cotizaciones: [UNA_COTIZACION], cuentas: { ENVIADA: 1 } } }
    });
    montar(<Panel />, "/panel");

    await userEvent.click(await screen.findByRole("button", { name: "Cotizaciones" }));
    /* Una vez en el marcador «En juego» y otra en su fila de la tabla: son la
       misma cotización, y por eso coinciden. */
    await waitFor(() => expect(screen.getAllByText("$5.950.000")).toHaveLength(2));
  });

  it("una cerrada no ofrece botones de cierre", async () => {
    servidor({
      "/api/panel/sesion": DENTRO,
      "/api/panel/inventario": inventarioCon([]),
      "/api/panel/cotizaciones": {
        cuerpo: { ok: true, cotizaciones: [{ ...UNA_COTIZACION, estado: "ACEPTADA" }], cuentas: { ACEPTADA: 1 } }
      }
    });
    montar(<Panel />, "/panel");

    await userEvent.click(await screen.findByRole("button", { name: "Cotizaciones" }));
    expect(await screen.findByText("cerrada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ganada" })).not.toBeInTheDocument();
  });
});

describe("ajustes del negocio", () => {
  const AJUSTE = {
    clave: "ENVIO_TABLA",
    grupo: "Envíos",
    etiqueta: "Tarifas por región",
    ayuda: "Una región por línea.",
    tipo: "tabla",
    ejemplo: "Valparaíso:7990:3",
    siFalta: "No se cobra despacho y el pedido queda por confirmar.",
    valor: "",
    origen: "vacío"
  };

  it("un ajuste vacío dice exactamente qué pasa por estar vacío", async () => {
    servidor({
      "/api/panel/sesion": DENTRO,
      "/api/panel/inventario": inventarioCon([]),
      "/api/panel/ajustes": { cuerpo: { ok: true, ajustes: [AJUSTE] } }
    });
    montar(<Panel />, "/panel");

    await userEvent.click(await screen.findByRole("button", { name: "Ajustes" }));
    expect(await screen.findByText(/No se cobra despacho y el pedido queda por confirmar/)).toBeInTheDocument();
  });

  it("no se guarda si no cambió nada", async () => {
    servidor({
      "/api/panel/sesion": DENTRO,
      "/api/panel/inventario": inventarioCon([]),
      "/api/panel/ajustes": { cuerpo: { ok: true, ajustes: [{ ...AJUSTE, valor: "Valparaíso:7990" }] } }
    });
    montar(<Panel />, "/panel");

    await userEvent.click(await screen.findByRole("button", { name: "Ajustes" }));
    expect(await screen.findByRole("button", { name: "Nada que guardar" })).toBeDisabled();
  });

  it("avisa de que los secretos no van aquí", async () => {
    servidor({
      "/api/panel/sesion": DENTRO,
      "/api/panel/inventario": inventarioCon([]),
      "/api/panel/ajustes": { cuerpo: { ok: true, ajustes: [AJUSTE] } }
    });
    montar(<Panel />, "/panel");

    await userEvent.click(await screen.findByRole("button", { name: "Ajustes" }));
    expect(await screen.findByText(/no es de fiar/)).toBeInTheDocument();
  });
});

describe("el margen en el inventario", () => {
  it("sin coste no enseña un porcentaje: dice qué falta", async () => {
    servidor({
      "/api/panel/sesion": DENTRO,
      "/api/panel/inventario": inventarioCon([unaFila()])
    });
    montar(<Panel />, "/panel");

    const fila = (await screen.findByRole("table")).querySelectorAll("tbody tr")[0];
    expect(within(fila as HTMLElement).getByText("sin coste")).toBeInTheDocument();
    expect(within(fila as HTMLElement).queryByText(/%$/)).not.toBeInTheDocument();
  });

  it("con coste enseña el porcentaje y los pesos", async () => {
    servidor({
      "/api/panel/sesion": DENTRO,
      "/api/panel/inventario": inventarioCon([
        unaFila({ costoNeto: 200_000, margen: { pesos: 52_093, porcentaje: 20.7, falta: [] } })
      ])
    });
    montar(<Panel />, "/panel");

    const fila = (await screen.findByRole("table")).querySelectorAll("tbody tr")[0];
    expect(within(fila as HTMLElement).getByText("20.7%")).toBeInTheDocument();
    expect(within(fila as HTMLElement).getByText("$52.093")).toBeInTheDocument();
  });

  it("sin ningún coste, el resumen explica qué hacer en vez de enseñar 0%", async () => {
    servidor({
      "/api/panel/sesion": DENTRO,
      "/api/panel/inventario": inventarioCon([unaFila()], {
        ...RESUMEN_VACIO,
        margen: { ...RESUMEN_VACIO.margen, sinDato: 15 }
      })
    });
    montar(<Panel />, "/panel");

    expect(await screen.findByText(/falta el coste de compra de/)).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });
});
