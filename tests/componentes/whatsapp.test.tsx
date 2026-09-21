/**
 * El canal de asesoría. Lo que se defiende: que el mensaje llegue con el
 * contexto dentro, y que sin número configurado no se pinte un botón que no
 * contesta — que es lo que había, con un número de marcador.
 */
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BotonWhatsapp } from "../../src/features/whatsapp/BotonWhatsapp.js";
import { enlace, hayWhatsapp, mensajeAvisoPrecio, mensajeCarrito, mensajeProducto, numero } from "../../src/features/whatsapp/whatsapp.js";
import { unProducto } from "../ayudas.js";

const conNumero = (valor: string) => vi.stubEnv("VITE_WHATSAPP", valor);

afterEach(() => vi.unstubAllEnvs());

describe("configuración", () => {
  it("sin número, no hay canal y no se pinta nada", () => {
    conNumero("");
    expect(hayWhatsapp()).toBe(false);
    expect(enlace("hola")).toBeNull();

    const { container } = render(<BotonWhatsapp />);
    expect(container).toBeEmptyDOMElement();
  });

  it("con número, el botón se pinta y abre en otra pestaña sin filtrar la sesión", () => {
    conNumero("+56 9 1234 5678");
    render(<BotonWhatsapp mensaje="Hola" />);

    const boton = screen.getByRole("link", { name: "Preguntar por WhatsApp" });
    expect(boton).toHaveAttribute("href", "https://wa.me/56912345678?text=Hola");
    expect(boton).toHaveAttribute("target", "_blank");
    expect(boton.getAttribute("rel")).toContain("noopener");
  });

  it("limpia el número: espacios, signos y guiones no llegan a la URL", () => {
    conNumero("+56-9 1234.5678");
    expect(numero()).toBe("56912345678");
  });
});

describe("el mensaje lleva el contexto", () => {
  it("de un equipo con precio propio: modelo, condición y precio", () => {
    const texto = mensajeProducto(unProducto({ condicion: "OPENBOX", precio: { lista: null, venta: 299990 } }));

    expect(texto).toContain("Lenovo IdeaPad 1");
    expect(texto).toContain("Condición: openbox");
    expect(texto).toContain("$299.990");
    expect(texto).toContain("/tienda/lenovo-ideapad-1");
  });

  it("de un equipo sin condición declarada: lo dice, no se la inventa", () => {
    const texto = mensajeProducto(unProducto({ condicion: null }));
    expect(texto).toContain("condición por confirmar");
  });

  it("de un equipo sin precio propio: el de marketplace va marcado como tal", () => {
    const texto = mensajeProducto(
      unProducto({
        precio: { lista: null, venta: null },
        referencia: { valor: 999990, propio: false, canal: "falabella" }
      })
    );

    expect(texto).toContain("$999.990 (publicado en falabella)");
  });

  it("de un equipo sin ningún precio: por confirmar", () => {
    const texto = mensajeProducto(
      unProducto({ precio: { lista: null, venta: null }, referencia: { valor: null, propio: false, canal: null } })
    );
    expect(texto).toContain("precio por confirmar");
  });

  it("el aviso de precio pide cotización del equipo concreto", () => {
    const texto = mensajeAvisoPrecio(unProducto({ marca: "Dell", nombre: "Latitude 7290" }));
    expect(texto).toContain("Dell Latitude 7290");
    expect(texto).toContain("¿Me lo pueden cotizar?");
  });

  it("el del carrito lleva las líneas y el total", () => {
    const texto = mensajeCarrito([{ nombre: "ASUS ExpertBook", cantidad: 2 }], 2_371_980);
    expect(texto).toContain("· ASUS ExpertBook × 2");
    expect(texto).toContain("Total: $2.371.980");
  });

  it("el enlace codifica los saltos de línea: si no, WhatsApp corta el mensaje", () => {
    conNumero("56912345678");
    const url = enlace(mensajeProducto(unProducto())) ?? "";

    expect(url).not.toContain("\n");
    expect(url).toContain("%0A");
    expect(decodeURIComponent(url.split("?text=")[1] ?? "")).toContain("Lenovo IdeaPad 1");
  });
});
