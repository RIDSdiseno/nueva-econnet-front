/**
 * Los filtros salen de los datos. La regla que se defiende: no se enseña un
 * filtro que no tenga detrás productos de verdad.
 */
import { describe, expect, it } from "vitest";
import { cumple, facetasDe, gigasDe, sistemaDe, tipoDisco } from "../../src/features/catalogo/facetas.js";
import { unProducto } from "../ayudas.js";

describe("leer especificaciones de texto libre", () => {
  it("saca los GB cuando están escritos", () => {
    expect(gigasDe("16 GB DDR5 · 2 SO-DIMM, ampliable a 64 GB")).toBe(16);
    expect(gigasDe("8GB LPDDR5")).toBe(8);
  });

  it("no adivina cuando no hay número", () => {
    expect(gigasDe("memoria soldada")).toBeNull();
    expect(gigasDe(null)).toBeNull();
    expect(gigasDe(undefined)).toBeNull();
  });

  it("distingue SSD de HDD y no inventa el resto", () => {
    expect(tipoDisco("512 GB SSD NVMe PCIe 4.0")).toBe("SSD");
    expect(tipoDisco("1 TB HDD")).toBe("HDD");
    expect(tipoDisco("almacenamiento ampliable")).toBeNull();
  });

  it("reconoce el sistema declarado, no uno parecido", () => {
    expect(sistemaDe("Windows 11 Pro")).toBe("Windows 11 Pro");
    expect(sistemaDe("Windows 11 Home")).toBe("Windows 11");
    expect(sistemaDe("ChromeOS")).toBe("ChromeOS");
    expect(sistemaDe("sistema por confirmar")).toBeNull();
  });
});

describe("facetas", () => {
  const catalogo = [
    unProducto({ id: "a", marca: "ASUS", condicion: "NUEVO", specs: { ram: "16 GB DDR5", almacenamiento: "512 GB SSD", so: "Windows 11 Pro" } }),
    unProducto({ id: "b", marca: "HP", condicion: "REACONDICIONADO", specs: { ram: "8 GB", almacenamiento: "256 GB SSD", so: "Windows 11 Pro" } }),
    unProducto({ id: "c", marca: "HP", condicion: null, specs: { ram: null, almacenamiento: null, so: null } })
  ];

  it("cuenta cuántos productos tiene cada opción", () => {
    const marca = facetasDe(catalogo).find((f) => f.clave === "marca");
    expect(marca?.opciones).toEqual(
      expect.arrayContaining([
        { valor: "HP", cuantos: 2 },
        { valor: "ASUS", cuantos: 1 }
      ])
    );
  });

  it("no ofrece un filtro con un solo valor: no filtra nada", () => {
    const claves = facetasDe(catalogo).map((f) => f.clave);
    /* Todos los que declaran sistema dicen lo mismo: el filtro sobra. */
    expect(claves).not.toContain("so");
  });

  it("no ofrece un filtro sin datos", () => {
    const sinNada = [unProducto({ id: "x", specs: {} }), unProducto({ id: "y", specs: {} })];
    const claves = facetasDe(sinNada).map((f) => f.clave);
    expect(claves).not.toContain("ram");
    expect(claves).not.toContain("disco");
  });

  it("el producto sin el dato NO entra en el filtro, en vez de colarse", () => {
    const sinRam = catalogo[2]!;
    expect(cumple(sinRam, "ram", "16 GB")).toBe(false);
    expect(cumple(sinRam, "condicion", "NUEVO")).toBe(false);
  });

  it("filtra por lo que de verdad pone", () => {
    expect(cumple(catalogo[0]!, "ram", "16 GB")).toBe(true);
    expect(cumple(catalogo[0]!, "disco", "SSD")).toBe(true);
    expect(cumple(catalogo[1]!, "ram", "16 GB")).toBe(false);
  });
});
