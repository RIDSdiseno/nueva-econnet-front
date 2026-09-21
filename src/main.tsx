import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { ProveedorCarrito } from "./features/carrito/ProveedorCarrito.js";
import { ProveedorComparador } from "./features/comparador/ProveedorComparador.js";
import { rutas } from "./app/rutas.js";
import "./styles/index.css";

const raiz = document.getElementById("raiz");
if (!raiz) throw new Error("falta #raiz en index.html");

createRoot(raiz).render(
  <StrictMode>
    <ProveedorCarrito>
      <ProveedorComparador>
        <RouterProvider router={rutas} />
      </ProveedorComparador>
    </ProveedorCarrito>
  </StrictMode>
);
