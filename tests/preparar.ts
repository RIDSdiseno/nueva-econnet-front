/**
 * Lo que toda prueba da por hecho: los matchers de jest-dom, un DOM limpio
 * entre pruebas y un `fetch` que nunca sale a la red de verdad.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { olvidarCatalogo } from "../src/features/catalogo/useCatalogo.js";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  olvidarCatalogo(); /* el catálogo se cachea en memoria: cada prueba parte de cero */
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ ok: false, error: { codigo: "sin_doble", mensaje: "la prueba no preparó esta llamada" } }), { status: 500 }))
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
