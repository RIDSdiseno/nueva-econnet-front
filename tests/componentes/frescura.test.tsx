/**
 * Que el panel esté «conectado a la web» se juega aquí.
 *
 * El HTML de la tienda y de cada ficha se escribe en el `build`: es una foto.
 * Si esa foto fuera la última palabra, un equipo dado de alta en el panel no
 * aparecería hasta el siguiente despliegue y un precio corregido seguiría
 * mintiendo en pantalla. Estas pruebas comprueban que la foto se pinta al
 * instante —para Google y para quien no ejecuta JavaScript— y que detrás
 * siempre se pregunta a la API.
 */
import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Tienda } from "../../src/pages/Tienda.js";
import { Producto } from "../../src/pages/Producto.js";
import { olvidarPrecarga, precargar } from "../../src/services/datosIniciales.js";
import { olvidarCatalogo } from "../../src/features/catalogo/useCatalogo.js";
import { montar, montarEnRuta, responder, unProducto } from "../ayudas.js";

afterEach(() => {
  olvidarPrecarga();
  olvidarCatalogo();
  vi.unstubAllGlobals();
});

describe("la tienda no se queda con la foto del build", () => {
  it("pinta lo precargado al instante y luego trae lo que hay de verdad", async () => {
    const viejo = unProducto({ id: "p1", slug: "uno", nombre: "IdeaPad 1" });
    const nuevo = unProducto({ id: "p2", slug: "dos", marca: "Lenovo", nombre: "ThinkPad recién dado de alta" });

    precargar({ catalogo: [viejo] });
    const doble = responder({ "/api/catalogo": { ok: true, productos: [viejo, nuevo] } });
    montar(<Tienda />, "/tienda");

    /* Lo precargado está en pantalla desde el primer dibujo: sin «Cargando». */
    expect(screen.getByText(/IdeaPad 1/)).toBeInTheDocument();
    expect(screen.queryByText(/Cargando/i)).not.toBeInTheDocument();

    /* Y el equipo nuevo entra solo, sin recargar la página. */
    expect(await screen.findByText(/ThinkPad recién dado de alta/)).toBeInTheDocument();
    expect(doble).toHaveBeenCalledTimes(1);
  });

  it("un precio corregido en el panel sustituye al del HTML", async () => {
    const antiguo = unProducto({ id: "p1", slug: "uno", precio: { lista: null, venta: 299990 } });
    const corregido = unProducto({
      id: "p1",
      slug: "uno",
      precio: { lista: null, venta: 355000 },
      referencia: { valor: 355000, propio: true, canal: null }
    });

    precargar({ catalogo: [antiguo] });
    responder({ "/api/catalogo": { ok: true, productos: [corregido] } });
    montar(<Tienda />, "/tienda");

    expect(await screen.findByText("$355.000")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("$299.990")).not.toBeInTheDocument());
  });

  it("si la API no responde, lo precargado se queda: la tienda no se vacía", async () => {
    precargar({ catalogo: [unProducto({ id: "p1", slug: "uno", nombre: "IdeaPad 1" })] });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("sin red"); }));
    montar(<Tienda />, "/tienda");

    expect(screen.getByText(/IdeaPad 1/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/No pudimos conectar/)).not.toBeInTheDocument());
    expect(screen.getByText(/IdeaPad 1/)).toBeInTheDocument();
  });
});

describe("la ficha tampoco", () => {
  it("arranca con lo del HTML y se pone al día con el stock real", async () => {
    const precargado = unProducto({
      id: "p1",
      slug: "lenovo-ideapad-1",
      stock: { estado: "EN_STOCK", unidades: 4, reservadas: 0 }
    });
    const agotado = unProducto({
      id: "p1",
      slug: "lenovo-ideapad-1",
      stock: { estado: "SIN_EXISTENCIAS", unidades: 0, reservadas: 0 }
    });

    precargar({ producto: precargado });
    responder({ "/api/catalogo/lenovo-ideapad-1": { ok: true, producto: agotado } });
    montarEnRuta(<Producto />, "/tienda/:slug", "/tienda/lenovo-ideapad-1");

    /* Nada de «Cargando…»: el nombre está desde el primer dibujo. */
    expect(screen.getByRole("heading", { level: 1, name: /IdeaPad 1/ })).toBeInTheDocument();
    expect(await screen.findByText(/Agotado|Sin existencias|sin stock/i)).toBeInTheDocument();
  });
});
