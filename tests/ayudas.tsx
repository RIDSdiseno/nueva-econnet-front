/** Fábricas y montaje. Un producto de prueba se parece a los de verdad: con huecos. */
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { ReactElement } from "react";
import { ProveedorCarrito } from "../src/features/carrito/ProveedorCarrito.js";
import { ProveedorComparador } from "../src/features/comparador/ProveedorComparador.js";
import type { FilaInventario, Producto } from "../src/services/tipos.js";

export function unProducto(cambios: Partial<Producto> = {}): Producto {
  return {
    id: "p1",
    slug: "lenovo-ideapad-1",
    sku: null,
    marca: "Lenovo",
    nombre: "IdeaPad 1",
    etiqueta: "Para estudiar",
    color: "#2B6BFF",
    categoria: "notebooks",
    subcategoria: null,
    tipoProducto: null,
    modelo: null,
    condicion: "NUEVO",
    garantia: null,
    precio: { lista: null, venta: 299990 },
    marketplaces: { falabella: null, lider: null },
    referencia: { valor: 299990, propio: true, canal: null },
    stock: { estado: "EN_STOCK", unidades: 4, reservadas: 0 },
    specs: { cpu: "Ryzen 5", ram: "16 GB", almacenamiento: "512 GB SSD" },
    usos: ["ofimática"],
    valores: [],
    para: "estudiar y trabajar",
    noPara: "edición de vídeo",
    alerta: null,
    descripcionCorta: null,
    descripcionLarga: null,
    imagenUrl: null,
    imagenAlt: null,
    imagenes: [],
    fuente: "catalogo-2026-09-18",
    fechaDato: "2026-09-18",
    confianza: "ALTA",
    seVende: true,
    publicable: { ok: false, faltas: ["imagen"] },
    ...cambios
  };
}

/**
 * Dobla `fetch` por ruta, no por orden de llamada. Por orden no vale: el
 * checkout recalcula totales cada vez que cambias región o correo, así que el
 * número de llamadas no es predecible y la respuesta del pedido acababa
 * contestando a un total.
 *
 * El valor puede ser un cuerpo, o una lista que se consume en orden y cuyo
 * último elemento se repite.
 */
export function responder(mapa: Record<string, unknown>) {
  const pendientes = new Map(Object.entries(mapa));

  /* `opciones` se declara aunque no se use aquí: hay pruebas que miran el
     cuerpo de lo que se mandó, y sin el parámetro el tipo de `mock.calls` no
     lo tiene. */
  const doble = vi.fn(async (ruta: string | URL | Request, _opciones?: RequestInit) => {
    const direccion = String(typeof ruta === "object" && "url" in ruta ? ruta.url : ruta);
    const clave = [...pendientes.keys()].find((k) => direccion.includes(k));
    if (clave === undefined) throw new Error(`la prueba no preparó una respuesta para ${direccion}`);

    const guardado = pendientes.get(clave);
    const cuerpo = Array.isArray(guardado) ? (guardado.length > 1 ? guardado.shift() : guardado[0]) : guardado;

    return new Response(JSON.stringify(cuerpo), { status: 200, headers: { "Content-Type": "application/json" } });
  });

  vi.stubGlobal("fetch", doble);
  return doble;
}

/** userEvent con temporizadores falsos: el lambda es necesario, `vi.advanceTimersByTime` suelto pierde su `this`. */
export const usuarioConRelojParado = () => userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });

export const montar = (nodo: ReactElement, ruta = "/") =>
  render(
    <ProveedorCarrito>
      <ProveedorComparador>
        <MemoryRouter initialEntries={[ruta]}>{nodo}</MemoryRouter>
      </ProveedorComparador>
    </ProveedorCarrito>
  );

/**
 * Como `montar`, pero con el patrón de ruta: hace falta cuando la página lee
 * `useParams` —una landing o una ficha— o si no `useParams()` viene vacío y el
 * componente cree que no existe.
 */
export const montarEnRuta = (nodo: ReactElement, patron: string, ruta: string) =>
  render(
    <ProveedorCarrito>
      <ProveedorComparador>
        <MemoryRouter initialEntries={[ruta]}>
          <Routes>
            <Route path={patron} element={nodo} />
          </Routes>
        </MemoryRouter>
      </ProveedorComparador>
    </ProveedorCarrito>
  );

/** Una fila del inventario, con huecos como los de verdad. */
export function unaFila(cambios: Partial<FilaInventario> = {}): FilaInventario {
  return {
    id: "p1",
    slug: "lenovo-ideapad-1",
    sku: null,
    marca: "Lenovo",
    nombre: "IdeaPad 1",
    etiqueta: "Para estudiar",
    color: "#2B6BFF",
    categoria: "notebooks",
    subcategoria: null,
    tipoProducto: null,
    modelo: null,
    condicion: "NUEVO",
    garantia: null,
    precioLista: null,
    precioVenta: 299990,
    precioFalabella: null,
    precioLider: null,
    /* Sin coste, como los de verdad hoy: el margen no se puede calcular. */
    costoNeto: null,
    margen: { pesos: null, porcentaje: null, falta: ["coste de compra"] },
    stockEstado: "EN_STOCK",
    stockUnidades: 4,
    reservadas: 0,
    disponibles: 4,
    specs: { cpu: "Ryzen 5" },
    usos: ["ofimática"],
    valores: [],
    para: "estudiar y trabajar",
    noPara: "edición de vídeo",
    alerta: null,
    descripcionCorta: null,
    descripcionLarga: null,
    imagenUrl: null,
    imagenAlt: null,
    imagenes: [],
    fuente: "catalogo-2026-09-18",
    fechaDato: "2026-09-18",
    confianza: "ALTA",
    archivado: null,
    actualizado: "2026-09-18T12:00:00.000Z",
    seVende: true,
    publicable: { ok: false, faltas: ["sin imagen", "sin garantía declarada"] },
    ...cambios
  };
}

export const RESUMEN_VACIO = {
  total: 0,
  enVenta: 0,
  archivados: 0,
  huecos: [],
  sinStockConocido: 0,
  agotados: 0,
  valorInventario: null,
  costeInventario: null,
  margen: {
    conDato: 0,
    sinDato: 0,
    porcentajePonderado: null,
    porcentajeMedio: null,
    gananciaPotencial: null,
    peores: []
  }
};
