/**
 * La entrada del prerenderizado. Corre en Node, no en el navegador.
 *
 * Por qué existe: una aplicación de React sirve un `<div>` vacío. Google acaba
 * ejecutando el JavaScript, pero los bots de los motores de IA —los que hoy
 * mandan tráfico de recomendación— muchas veces no. Esto escribe el HTML de
 * verdad de cada ruta pública durante el build, con el mismo mapa de rutas que
 * usa el navegador.
 */
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter, useRoutes } from "react-router-dom";
import { ProveedorCarrito } from "./features/carrito/ProveedorCarrito.js";
import { ProveedorComparador } from "./features/comparador/ProveedorComparador.js";
import { rutasApp } from "./app/definicionRutas.js";
import { olvidarPrecarga, precargar, type DatosIniciales } from "./services/datosIniciales.js";

function Aplicacion() {
  return useRoutes(rutasApp);
}

export function render(ruta: string, datos: DatosIniciales = {}): string {
  /* Los datos van antes del render: es lo que hace que el HTML lleve el
     producto dentro en vez de un «Cargando…». */
  precargar(datos);
  const html = renderToString(
    <StrictMode>
      <ProveedorCarrito>
        <ProveedorComparador>
          <StaticRouter location={ruta}>
            <Aplicacion />
          </StaticRouter>
        </ProveedorComparador>
      </ProveedorCarrito>
    </StrictMode>
  );
  olvidarPrecarga();
  return html;
}

export { metadatosDe, negocioLd, RUTAS_PUBLICAS, SITIO } from "./app/metadatos.js";
export { LANDINGS } from "./features/trafico/landings.js";
export { ID_ISLA } from "./services/datosIniciales.js";
