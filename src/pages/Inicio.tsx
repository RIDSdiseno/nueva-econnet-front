/** La portada: la promesa, las puertas por necesidad y la selección. */
import { Link } from "react-router-dom";
import { TarjetaProducto } from "../components/ui/TarjetaProducto.js";
import { useCatalogo } from "../features/catalogo/useCatalogo.js";
import { BotonEnlace } from "../components/ui/Boton.js";
import { TestDeCompra } from "../features/test/TestDeCompra.js";

/**
 * Las puertas de entrada por necesidad.
 *
 * Cada una lleva a un filtro **que tiene productos detrás**: el `uso` es el que
 * viene en el catálogo, no una categoría inventada para la portada. «Diseñar» y
 * «Programar» son formas de decir lo mismo que «crear» y «trabajar» en los
 * datos, y el texto de la tarjeta dice exactamente qué se va a ver.
 */
const PUERTAS = [
  { uso: "trabajar", titulo: "Trabajar", texto: "Oficina, gestión y teletrabajo. Windows 11 Pro, pantalla mate y peso de verdad portátil." },
  { uso: "crear", titulo: "Crear", texto: "Fotografía, contenido y edición. Más memoria, más disco y pantallas de más pulgadas." },
  { uso: "crear", titulo: "Diseñar", texto: "Los mismos equipos de creación: pantalla que respeta el color y memoria para archivos grandes." },
  { uso: "trabajar", titulo: "Programar", texto: "Equipos de trabajo con memoria de sobra: compilar y tener veinte pestañas no es ofimática." },
  { uso: "estudiar", titulo: "Estudiar", texto: "La carrera completa sin quedarse corto al tercer año." },
  { uso: "jugar", titulo: "Jugar", texto: "Gaming y streaming, con gráfica dedicada y pantallas de 144 Hz." },
  { uso: "empresa", titulo: "Equipar mi empresa", texto: "Parques de 5, 20 o 50 puestos: factura, volumen y renovación por tandas." },
  { uso: "renovados", titulo: "Renovados", texto: "Reacondicionados y openbox revisados, con la condición dicha por delante." }
];

export function Inicio() {
  const { productos } = useCatalogo();
  const destacados = productos.filter((p) => p.seVende).slice(0, 4);

  return (
    <>
      <section className="py-10 sm:py-16">
        <p className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-azul-claro">
          <span className="h-px w-6 bg-azul" />
          Equipos profesionales · Providencia, Santiago
        </p>
        <h1 className="max-w-[15ch] text-5xl sm:text-6xl">
          Tecnología elegida <span className="text-azul-claro">con criterio.</span>
        </h1>
        <p className="mt-5 max-w-[46ch] text-lg text-tinta-2">
          No necesitas conocer todas las especificaciones. Necesitas saber cuál es el equipo correcto para ti. Eso es
          exactamente lo que hacemos.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <BotonEnlace to="/tienda">Ver los equipos</BotonEnlace>
          <BotonEnlace to="/guia-de-compra" tono="fantasma">
            Leer la guía de compra
          </BotonEnlace>
          <BotonEnlace to="/empresas" tono="fantasma">
            Comprar para mi empresa
          </BotonEnlace>
        </div>
        <ul className="mt-9 flex flex-wrap gap-x-7 gap-y-2 text-[13.5px] text-tinta-2">
          {["Garantía", "Oficina en Providencia", "Despacho a todo Chile", "Boleta o factura", "Asesoría de un especialista"].map((punto) => (
            <li key={punto} className="flex items-center gap-2">
              <span className="text-azul-claro">✓</span>
              {punto}
            </li>
          ))}
        </ul>
      </section>

      <TestDeCompra productos={productos} />

      <section className="border-t border-linea py-12">
        <h2 className="mb-2 text-3xl">¿Qué necesitas hacer?</h2>
        <p className="mb-7 max-w-[58ch] text-tinta-2">
          La pregunta no es qué marca ni cuántos gigas. Es qué vas a hacer con el equipo todos los días.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PUERTAS.map((puerta) => (
            <Link
              key={puerta.uso}
              to={puerta.uso === "empresa" ? "/empresas" : `/tienda?u=${puerta.uso}`}
              className="rounded-marco border border-linea bg-gradient-to-b from-white/[0.045] to-white/[0.012] p-6 transition hover:-translate-y-1 hover:border-azul-claro/40"
            >
              <h3 className="text-xl">{puerta.titulo}</h3>
              <p className="mt-2 text-[13.5px] text-apagado">{puerta.texto}</p>
              <span className="mt-4 inline-block text-[13px] font-semibold text-azul-claro">Ver equipos →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-linea py-12">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl">Equipos seleccionados</h2>
            <p className="mt-2 max-w-[56ch] text-tinta-2">
              Cada equipo lleva para quién es y para quién <em>no</em> es. Es la parte que ninguna ficha técnica te dice.
            </p>
          </div>
          <Link className="text-[14px] font-semibold text-azul-claro" to="/tienda">
            Ver todos →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {destacados.map((producto) => (
            <TarjetaProducto key={producto.id} producto={producto} />
          ))}
        </div>
      </section>
    </>
  );
}
