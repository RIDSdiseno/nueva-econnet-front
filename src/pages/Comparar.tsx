/**
 * La tabla de comparación.
 *
 * Dos reglas: **la condición va arriba del todo** —es lo que más cambia el
 * precio entre dos equipos parecidos— y **una fila sin dato dice «no consta»**
 * en vez de quedarse en blanco, que es lo que hace pensar que el equipo no lo
 * tiene.
 *
 * En móvil la tabla se desplaza en horizontal con la primera columna fija: es
 * la única forma de comparar tres equipos en 375 px sin mentir sobre el tamaño.
 */
import { Link } from "react-router-dom";
import { clp } from "../services/api.js";
import type { Producto } from "../services/tipos.js";
import { useCatalogo } from "../features/catalogo/useCatalogo.js";
import { useComparador } from "../features/comparador/useComparador.js";
import { useCarrito } from "../features/carrito/useCarrito.js";
import { Boton, BotonEnlace } from "../components/ui/Boton.js";
import { Condicion } from "../components/ui/Etiquetas.js";
import { agregarAlCarrito } from "../features/analitica/eventos.js";

/* `specs` es un diccionario abierto: puede no traer la clave. */
const FILAS: Array<{ nombre: string; valor: (p: Producto) => string | null | undefined }> = [
  { nombre: "Procesador", valor: (p) => p.specs.cpu },
  { nombre: "Memoria", valor: (p) => p.specs.ram },
  { nombre: "Almacenamiento", valor: (p) => p.specs.almacenamiento },
  { nombre: "Gráfica", valor: (p) => p.specs.gpu },
  { nombre: "Pantalla", valor: (p) => p.specs.pantalla },
  { nombre: "Sistema", valor: (p) => p.specs.so },
  { nombre: "Conectividad", valor: (p) => p.specs.conectividad },
  { nombre: "Seguridad", valor: (p) => p.specs.seguridad },
  { nombre: "Batería", valor: (p) => p.specs.bateria },
  { nombre: "Peso", valor: (p) => p.specs.peso },
  { nombre: "Garantía", valor: (p) => p.garantia },
  { nombre: "Para quién es", valor: (p) => p.para },
  { nombre: "Para quién no es", valor: (p) => p.noPara }
];

export function Comparar() {
  const { slugs, quitar, vaciar } = useComparador();
  const { productos, cargando } = useCatalogo();
  const { agregar } = useCarrito();

  const elegidos = slugs.map((slug) => productos.find((p) => p.slug === slug)).filter((p): p is Producto => Boolean(p));

  if (!slugs.length) {
    return (
      <div className="py-20 text-center">
        <h1 className="mb-3 text-3xl">No has elegido nada que comparar</h1>
        <p className="mb-7 text-tinta-2">Marca «Comparar» en hasta tres equipos y vuelve aquí.</p>
        <BotonEnlace to="/tienda">Ver los equipos</BotonEnlace>
      </div>
    );
  }

  if (cargando && !elegidos.length) return <p className="py-20 text-tinta-2">Cargando…</p>;

  return (
    <div className="py-6">
      <h1 className="text-4xl">Comparar equipos</h1>
      <p className="mt-3 max-w-[62ch] text-tinta-2">
        Lo que no consta en la ficha sale como «no consta». No lo rellenamos a ojo: en un equipo de este precio, una
        especificación supuesta es una devolución.
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[14px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-40 bg-fondo p-3 text-left align-top" />
              {elegidos.map((p) => (
                <th key={p.id} className="border-b border-linea p-3 text-left align-top">
                  <Condicion valor={p.condicion} />
                  <Link className="mt-2 block text-[15px] font-semibold hover:text-azul-claro" to={`/tienda/${p.slug}`}>
                    {p.marca} {p.nombre}
                  </Link>
                  <button
                    type="button"
                    className="mt-1 text-[12.5px] text-apagado underline"
                    onClick={() => quitar(p.slug)}
                  >
                    Quitar
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className="sticky left-0 z-10 bg-fondo p-3 text-left font-semibold">
                Precio
              </th>
              {elegidos.map((p) => (
                <td key={p.id} className="border-b border-linea p-3 align-top">
                  {p.seVende && p.precio.venta ? (
                    <b className="text-[17px]">{clp(p.precio.venta)}</b>
                  ) : p.referencia.valor ? (
                    <span className="text-tinta-2">
                      {clp(p.referencia.valor)} <small className="text-apagado">en {p.referencia.canal}</small>
                    </span>
                  ) : (
                    <span className="text-apagado">Por confirmar</span>
                  )}
                </td>
              ))}
            </tr>

            {FILAS.map((fila) => (
              <tr key={fila.nombre}>
                <th scope="row" className="sticky left-0 z-10 bg-fondo p-3 text-left font-semibold text-tinta-2">
                  {fila.nombre}
                </th>
                {elegidos.map((p) => {
                  const valor = fila.valor(p);
                  return (
                    <td key={p.id} className="border-b border-linea p-3 align-top text-tinta-2">
                      {valor ?? <span className="text-apagado">No consta</span>}
                    </td>
                  );
                })}
              </tr>
            ))}

            <tr>
              <th scope="row" className="sticky left-0 z-10 bg-fondo p-3" />
              {elegidos.map((p) => (
                <td key={p.id} className="p-3 align-top">
                  {p.seVende ? (
                    <Boton
                      tamano="pequeno"
                      onClick={() => {
                        agregar(p.id);
                        agregarAlCarrito(p, 1);
                      }}
                    >
                      Agregar
                    </Boton>
                  ) : (
                    <BotonEnlace to={`/tienda/${p.slug}`} tamano="pequeno" tono="fantasma">
                      Consultar
                    </BotonEnlace>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <BotonEnlace to="/tienda" tono="fantasma">
          Seguir mirando
        </BotonEnlace>
        <Boton tono="fantasma" onClick={vaciar}>
          Vaciar la comparación
        </Boton>
      </div>
    </div>
  );
}
