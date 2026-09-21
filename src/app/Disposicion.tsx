import { Outlet, ScrollRestoration } from "react-router-dom";
import { Cabecera } from "../components/layout/Cabecera.js";
import { Pie } from "../components/layout/Pie.js";
import { useTitulo } from "./useTitulo.js";
import { BotonWhatsapp } from "../features/whatsapp/BotonWhatsapp.js";

export function Disposicion() {
  useTitulo();

  return (
    <>
      <a
        href="#principal"
        className="sr-only focus:not-sr-only focus:absolute focus:left-0 focus:top-0 focus:z-50 focus:bg-azul focus:px-4 focus:py-3"
      >
        Saltar al contenido
      </a>
      <Cabecera />
      <main id="principal" className="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-7">
        <Outlet />
      </main>
      <Pie />
      <BotonWhatsapp />
      {/* Necesita el router de datos del navegador: en el prerenderizado no hay. */}
      {!import.meta.env.SSR && <ScrollRestoration />}
    </>
  );
}
