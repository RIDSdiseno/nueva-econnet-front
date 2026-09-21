/**
 * Los filtros que se pueden ofrecer con los datos que hay.
 *
 * Regla: **no se enseña un filtro sin datos detrás**. Un desplegable de «GPU»
 * en un catálogo donde nadie declara la gráfica es una promesa vacía que además
 * deja la rejilla en blanco al usarlo.
 *
 * Las especificaciones vienen como texto libre («16 GB DDR5 · 2 SO-DIMM»), así
 * que aquí se extrae lo que se puede leer con seguridad y **solo eso**: si de
 * un texto no se saca un número de GB, ese producto no entra en el filtro en
 * vez de adivinarlo.
 */
import type { Producto } from "../../services/tipos.js";

export interface Faceta {
  clave: string;
  nombre: string;
  /** Valor → cuántos productos lo tienen. Solo valores con al menos uno. */
  opciones: Array<{ valor: string; cuantos: number }>;
}

/** «16 GB DDR5 · ampliable» → 16. Sin número claro, null. */
export function gigasDe(texto: string | null | undefined): number | null {
  const m = /(\d+)\s*GB/i.exec(String(texto ?? ""));
  return m?.[1] ? Number(m[1]) : null;
}

/** «512 GB SSD NVMe» → "SSD"; «1 TB HDD» → "HDD". Sin tipo claro, null. */
export function tipoDisco(texto: string | null | undefined): string | null {
  const t = String(texto ?? "").toUpperCase();
  if (t.includes("SSD") || t.includes("NVME")) return "SSD";
  if (t.includes("HDD") || t.includes("MECÁNICO")) return "HDD";
  return null;
}

/** «Windows 11 Pro» → "Windows 11 Pro"; se queda con la familia declarada. */
export function sistemaDe(texto: string | null | undefined): string | null {
  const t = String(texto ?? "").trim();
  if (!t) return null;
  for (const familia of ["Windows 11 Pro", "Windows 11", "ChromeOS", "macOS", "Linux"]) {
    if (t.toLowerCase().includes(familia.toLowerCase())) return familia;
  }
  return null;
}

const contar = (valores: Array<string | null>) => {
  const cuenta = new Map<string, number>();
  for (const v of valores) if (v) cuenta.set(v, (cuenta.get(v) ?? 0) + 1);
  return [...cuenta.entries()].map(([valor, cuantos]) => ({ valor, cuantos }));
};

export function facetasDe(productos: Producto[]): Faceta[] {
  const facetas: Faceta[] = [
    { clave: "marca", nombre: "Marca", opciones: contar(productos.map((p) => p.marca)).sort((a, b) => a.valor.localeCompare(b.valor)) },
    { clave: "condicion", nombre: "Condición", opciones: contar(productos.map((p) => p.condicion)) },
    {
      clave: "ram",
      nombre: "Memoria",
      opciones: contar(productos.map((p) => (gigasDe(p.specs.ram) ? `${gigasDe(p.specs.ram)} GB` : null))).sort(
        (a, b) => parseInt(a.valor) - parseInt(b.valor)
      )
    },
    { clave: "disco", nombre: "Almacenamiento", opciones: contar(productos.map((p) => tipoDisco(p.specs.almacenamiento))) },
    { clave: "so", nombre: "Sistema", opciones: contar(productos.map((p) => sistemaDe(p.specs.so))) }
  ];

  /* Un filtro con menos de dos valores no filtra nada: no se enseña. */
  return facetas.filter((f) => f.opciones.length >= 2);
}

/** ¿Este producto pasa el filtro elegido? */
export function cumple(producto: Producto, clave: string, valor: string): boolean {
  switch (clave) {
    case "marca":
      return producto.marca === valor;
    case "condicion":
      return producto.condicion === valor;
    case "ram":
      return gigasDe(producto.specs.ram) === parseInt(valor);
    case "disco":
      return tipoDisco(producto.specs.almacenamiento) === valor;
    case "so":
      return sistemaDe(producto.specs.so) === valor;
    default:
      return true;
  }
}
