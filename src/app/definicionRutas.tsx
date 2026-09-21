/**
 * El mapa de rutas, una sola vez.
 *
 * Lo usan el navegador (`createBrowserRouter`) y el prerenderizado
 * (`useRoutes` con `StaticRouter`). Escrito dos veces, se añade una página y
 * el buscador nunca la ve.
 */
import { lazy, Suspense, type ReactNode } from "react";
import type { RouteObject } from "react-router-dom";
import { Disposicion } from "./Disposicion.js";
import { Inicio } from "../pages/Inicio.js";
import { Tienda } from "../pages/Tienda.js";
import { Producto } from "../pages/Producto.js";
import { SeguimientoPagina } from "../pages/Seguimiento.js";
import { Empresas } from "../pages/Empresas.js";
import { Guia } from "../pages/Guia.js";
import { Landing } from "../pages/Landing.js";
import { LANDINGS } from "../features/trafico/landings.js";

/**
 * Carrito, checkout, gracias y cotización se cargan aparte.
 *
 * No se prerenderizan —son privadas— y no las necesita quien entra por una
 * landing o por una ficha, que es por donde entra casi todo el tráfico. Sacarlas
 * del paquete inicial es JavaScript que no se descarga hasta que hace falta.
 */
const Carrito = lazy(() => import("../pages/Carrito.js").then((m) => ({ default: m.Carrito })));
const Checkout = lazy(() => import("../pages/Checkout.js").then((m) => ({ default: m.Checkout })));
const Gracias = lazy(() => import("../pages/Gracias.js").then((m) => ({ default: m.Gracias })));
const CotizacionPagina = lazy(() => import("../pages/Cotizacion.js").then((m) => ({ default: m.CotizacionPagina })));

/**
 * El panel de inventario, aparte del todo. Es la puerta de servicio: no la
 * abre ningún cliente, así que su JavaScript no viaja en el paquete que
 * descarga quien entra por una landing o por una ficha.
 */
const Panel = lazy(() => import("../pages/Panel.js").then((m) => ({ default: m.Panel })));

const conEspera = (nodo: ReactNode) => (
  <Suspense fallback={<p className="py-20 text-center text-tinta-2">Un momento…</p>}>{nodo}</Suspense>
);
import { Comparar } from "../pages/Comparar.js";
import { Legal } from "../pages/Legal.js";
import { NoEncontrada } from "../pages/NoEncontrada.js";

export const rutasApp: RouteObject[] = [
  {
    element: <Disposicion />,
    children: [
      { path: "/", element: <Inicio /> },
      { path: "/tienda", element: <Tienda /> },
      { path: "/tienda/:slug", element: <Producto /> },
      { path: "/carrito", element: conEspera(<Carrito />) },
      { path: "/checkout", element: conEspera(<Checkout />) },
      { path: "/tienda/gracias", element: conEspera(<Gracias />) },
      { path: "/seguimiento", element: <SeguimientoPagina /> },
      { path: "/empresas", element: <Empresas /> },
      { path: "/guia-de-compra", element: <Guia /> },
      { path: "/cotizacion", element: conEspera(<CotizacionPagina />) },
      { path: "/comparar", element: <Comparar /> },
      { path: "/panel", element: conEspera(<Panel />) },
      { path: "/legal/:slug", element: <Legal /> },
      /* Una ruta por landing, explícita: así el prerenderizado sabe cuáles son. */
      ...LANDINGS.map((landing) => ({ path: `/${landing.slug}`, element: <Landing /> })),
      { path: "*", element: <NoEncontrada /> }
    ]
  }
];
