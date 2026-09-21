/**
 * Las landings y los metadatos. Lo que se defiende aquí es el tráfico:
 * una página pública sin prerenderizar es una página que Google ve vacía.
 */
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Landing } from "../../src/pages/Landing.js";
import { LANDINGS, landingPorSlug } from "../../src/features/trafico/landings.js";
import { metadatosDe, RUTAS_PUBLICAS, SITIO } from "../../src/app/metadatos.js";
import { rutasApp } from "../../src/app/definicionRutas.js";
import { montarEnRuta, responder, unProducto } from "../ayudas.js";

describe("landings", () => {
  it("cada una tiene slug único, título, descripción y preguntas", () => {
    expect(LANDINGS.length).toBeGreaterThanOrEqual(7);
    expect(new Set(LANDINGS.map((l) => l.slug)).size).toBe(LANDINGS.length);

    for (const landing of LANDINGS) {
      expect(landing.titulo).toContain("Econnet");
      expect(landing.descripcion.length).toBeGreaterThan(70);
      expect(landing.descripcion.length).toBeLessThanOrEqual(165); /* lo que enseña Google */
      expect(landing.pide.length).toBeGreaterThanOrEqual(3);
      expect(landing.preguntas.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("pinta el contenido aunque el catálogo no cargue: es lo que lee un buscador", async () => {
    globalThis.fetch = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;

    montarEnRuta(<Landing />, "/notebooks-para-empresas", "/notebooks-para-empresas");

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Qué pedir")).toBeInTheDocument();
    expect(screen.getByText("Preguntas")).toBeInTheDocument();
  });

  it("lista los equipos del catálogo que sirven para ese uso", async () => {
    responder({
      "/api/catalogo": {
        ok: true,
        productos: [
          unProducto({ id: "p1", slug: "p1", nombre: "Para empresa", usos: ["empresa"], categoria: "Notebook" }),
          unProducto({ id: "p2", slug: "p2", nombre: "Para jugar", usos: ["jugar"], categoria: "Notebook" })
        ]
      }
    });

    montarEnRuta(<Landing />, "/notebooks-para-empresas", "/notebooks-para-empresas");

    expect(await screen.findByText(/Para empresa/)).toBeInTheDocument();
    expect(screen.queryByText(/Para jugar/)).not.toBeInTheDocument();
  });

  it("si no hay nada publicado para esa necesidad, lo dice en vez de dejar un hueco", async () => {
    responder({ "/api/catalogo": { ok: true, productos: [] } });
    montarEnRuta(<Landing />, "/camaras-de-seguridad", "/camaras-de-seguridad");

    expect(await screen.findByText(/no tenemos publicado ningún equipo/)).toBeInTheDocument();
  });

  it("un slug que no existe es un 404, no una landing vacía", () => {
    expect(landingPorSlug("lo-que-sea")).toBeUndefined();

    montarEnRuta(<Landing />, "/lo-que-sea", "/lo-que-sea");
    expect(screen.getByText("Esta página no existe")).toBeInTheDocument();
  });
});

describe("metadatos", () => {
  it("cada ruta pública tiene título y descripción propios", () => {
    for (const ruta of RUTAS_PUBLICAS) {
      const meta = metadatosDe(ruta);
      expect(meta.titulo.length).toBeGreaterThan(10);
      expect(meta.descripcion.length).toBeGreaterThan(50);
    }
  });

  it("los títulos no se repiten entre landings: dos iguales compiten entre sí", () => {
    const titulos = LANDINGS.map((l) => metadatosDe(`/${l.slug}`).titulo);
    expect(new Set(titulos).size).toBe(titulos.length);
  });

  it("una landing lleva migas de pan y sus preguntas como datos estructurados", () => {
    const meta = metadatosDe("/notebooks-para-empresas");
    const tipos = (meta.datos ?? []).map((d) => (d as { "@type": string })["@type"]);
    expect(tipos).toContain("BreadcrumbList");
    expect(tipos).toContain("FAQPage");
  });

  it("el sitio es el dominio de verdad, no localhost", () => {
    expect(SITIO).toBe("https://econnet.cl");
  });

  it("toda ruta pública existe en el mapa de rutas: si no, se prerenderiza un 404", () => {
    const hijas = rutasApp[0]?.children ?? [];
    const caminos = hijas.map((r) => r.path);

    for (const ruta of RUTAS_PUBLICAS) {
      const existe = caminos.some((camino) => {
        if (!camino) return false;
        if (camino === ruta) return true;
        /* `/legal/:slug` cubre `/legal/terminos`. */
        const patron = new RegExp(`^${camino.replace(/:[^/]+/g, "[^/]+")}$`);
        return patron.test(ruta);
      });
      expect(existe, `la ruta pública ${ruta} no está en el mapa de rutas`).toBe(true);
    }
  });

  it("las rutas privadas NO se prerenderizan: carrito, checkout y gracias", () => {
    for (const privada of ["/carrito", "/checkout", "/tienda/gracias", "/cotizacion"]) {
      expect(RUTAS_PUBLICAS).not.toContain(privada);
    }
  });
});
