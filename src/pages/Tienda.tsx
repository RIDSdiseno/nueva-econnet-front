/** Catálogo con buscador y filtros. Todo corre en el navegador: sin peticiones. */
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TarjetaProducto } from "../components/ui/TarjetaProducto.js";
import { useCatalogo } from "../features/catalogo/useCatalogo.js";
import type { Producto } from "../services/tipos.js";
import { cumple, facetasDe } from "../features/catalogo/facetas.js";
import { buscar } from "../features/analitica/eventos.js";
import { useComparador } from "../features/comparador/useComparador.js";
import { Link } from "react-router-dom";

const USOS: Array<[string, string]> = [
  ["trabajar", "Trabajar"],
  ["crear", "Crear"],
  ["estudiar", "Estudiar"],
  ["jugar", "Jugar"],
  ["empresa", "Empresa"],
  ["renovados", "Renovados"],
  ["proteger", "Cámaras"]
];

const RANGOS: Array<[string, string, number, number]> = [
  ["0-500000", "Hasta $500.000", 0, 500_000],
  ["500000-1000000", "$500.000 a $1.000.000", 500_000, 1_000_000],
  ["1000000-1500000", "$1.000.000 a $1.500.000", 1_000_000, 1_500_000],
  ["1500000-99000000", "Más de $1.500.000", 1_500_000, 99_000_000]
];

type Orden = "recomendado" | "barato" | "caro";

export function Tienda() {
  const { productos, cargando, error } = useCatalogo();
  const { slugs: comparando } = useComparador();
  const [parametros, setParametros] = useSearchParams();
  const [texto, setTexto] = useState(parametros.get("q") ?? "");
  const [orden, setOrden] = useState<Orden>("recomendado");
  /* Un mapa clave→valores: los filtros salen de los datos, no de una lista fija. */
  const [filtros, setFiltros] = useState<Record<string, string[]>>({});
  const [rango, setRango] = useState<string>("");

  const categoria = parametros.get("c");
  const uso = parametros.get("u");

  const alternar = (clave: string, valor: string) =>
    setFiltros((previos) => {
      const actuales = previos[clave] ?? [];
      const siguientes = actuales.includes(valor) ? actuales.filter((v) => v !== valor) : [...actuales, valor];
      return { ...previos, [clave]: siguientes };
    });

  const visibles = useMemo(() => {
    const buscado = texto.toLowerCase().trim();

    const filtrados = productos.filter((p) => {
      if (categoria && p.categoria !== categoria) return false;
      if (uso && !p.usos.includes(uso)) return false;
      for (const [clave, valores] of Object.entries(filtros)) {
        if (valores.length && !valores.some((v) => cumple(p, clave, v))) return false;
      }
      if (rango) {
        const limites = RANGOS.find((r) => r[0] === rango);
        const precio = p.precio.venta ?? 0;
        if (!limites || !precio || precio < limites[2] || precio > limites[3]) return false;
      }
      if (buscado) {
        /* Se busca también por SKU y por el resto de especificaciones: quien
           escribe «i7», «16gb» o el código del producto espera encontrarlo. */
        const donde = [p.marca, p.nombre, p.sku, p.categoria, p.condicion, ...Object.values(p.specs)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!donde.includes(buscado)) return false;
      }
      return true;
    });

    const precio = (p: Producto) => p.precio.venta ?? Number.POSITIVE_INFINITY;
    if (orden === "barato") return [...filtrados].sort((a, b) => precio(a) - precio(b));
    if (orden === "caro") return [...filtrados].sort((a, b) => precio(b) - precio(a));
    return filtrados;
  }, [productos, texto, filtros, rango, orden, categoria, uso]);

  /* Las facetas se calculan sobre el catálogo: si un dato no consta en ningún
     producto, ese filtro no aparece. */
  const facetas = facetasDe(productos);

  return (
    <>
      <p className="mb-4 text-[13px] text-apagado">Inicio · Tienda</p>
      <h1 className="mb-2 text-4xl">Todos los equipos</h1>
      <p className="max-w-[62ch] text-tinta-2">
        Cada equipo con su condición declarada y con para quién <em>no</em> es, que es lo que no dice ninguna ficha técnica.
      </p>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-marco border border-linea bg-panel p-5">
          {(categoria || uso) && (
            <button
              className="mb-4 text-sm text-azul-claro underline"
              onClick={() => setParametros({})}
              type="button"
            >
              Quitar filtro: {categoria ?? uso}
            </button>
          )}

          {facetas.map((faceta) => (
            <div key={faceta.clave} className="mb-5">
              <h4 className="mb-2 text-xs uppercase tracking-[0.14em] text-apagado">{faceta.nombre}</h4>
              {faceta.opciones.map((opcion) => {
                const etiqueta =
                  faceta.clave === "condicion"
                    ? opcion.valor.charAt(0) + opcion.valor.slice(1).toLowerCase()
                    : opcion.valor;
                return (
                  <label key={opcion.valor} className="flex cursor-pointer items-center gap-2 py-1 text-sm text-tinta-2">
                    <input
                      type="checkbox"
                      className="accent-azul"
                      checked={(filtros[faceta.clave] ?? []).includes(opcion.valor)}
                      onChange={() => alternar(faceta.clave, opcion.valor)}
                    />
                    {etiqueta}
                    <span className="text-[12px] text-apagado">({opcion.cuantos})</span>
                  </label>
                );
              })}
            </div>
          ))}

          <h4 className="mb-2 mt-5 text-xs uppercase tracking-[0.14em] text-apagado">Para qué</h4>
          {USOS.map(([valor, nombre]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setParametros(uso === valor ? {} : { u: valor })}
              className={`mr-1 mt-1 rounded-full border px-3 py-1 text-[13px] ${
                uso === valor ? "border-azul bg-azul text-white" : "border-linea-fuerte text-tinta-2"
              }`}
            >
              {nombre}
            </button>
          ))}

          <h4 className="mb-2 mt-5 text-xs uppercase tracking-[0.14em] text-apagado">Precio</h4>
          {RANGOS.map(([valor, nombre]) => (
            <label key={valor} className="flex cursor-pointer items-center gap-2 py-1 text-sm text-tinta-2">
              <input
                type="radio"
                name="precio"
                className="accent-azul"
                checked={rango === valor}
                onChange={() => setRango(valor)}
              />
              {nombre}
            </label>
          ))}

          <button
            type="button"
            className="mt-5 h-10 w-full rounded-full border border-linea-fuerte text-sm"
            onClick={() => {
              setFiltros({});
              setRango("");
              setTexto("");
              setParametros({});
            }}
          >
            Limpiar filtros
          </button>
        </aside>

        <div>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <input
              className="h-12 min-w-[220px] flex-1 rounded-xl border border-linea-fuerte bg-white/5 px-4 text-[15px]"
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onBlur={(e) => e.target.value.trim() && buscar(e.target.value.trim())}
              placeholder="Buscar por marca, modelo o procesador"
              aria-label="Buscar"
            />
            <select
              className="h-12 rounded-xl border border-linea-fuerte bg-white/5 px-3"
              value={orden}
              onChange={(e) => setOrden(e.target.value as Orden)}
              aria-label="Ordenar"
            >
              <option value="recomendado">Recomendados</option>
              <option value="barato">Precio: de menor a mayor</option>
              <option value="caro">Precio: de mayor a menor</option>
            </select>
            <span className="text-[13.5px] text-apagado">
              {visibles.length} {visibles.length === 1 ? "equipo" : "equipos"}
            </span>
          </div>

          {comparando.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-azul/40 bg-azul/10 px-4 py-3">
              <span className="text-[14px]">
                Comparando <b>{comparando.length}</b> {comparando.length === 1 ? "equipo" : "equipos"}
              </span>
              <Link className="text-[14px] font-semibold text-azul-claro underline" to="/comparar">
                Ver la comparación →
              </Link>
            </div>
          )}

          {cargando && <p className="text-tinta-2">Cargando el catálogo…</p>}
          {error && <p className="rounded-xl border border-rojo/40 bg-rojo/10 p-4 text-sm">{error}</p>}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibles.map((producto) => (
              <TarjetaProducto key={producto.id} producto={producto} />
            ))}
          </div>

          {!cargando && !visibles.length && (
            <p className="rounded-marco border border-dashed border-linea-fuerte p-12 text-center text-tinta-2">
              No hay equipos con esos filtros. Prueba quitando alguno.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
