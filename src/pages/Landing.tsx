/**
 * Una landing por necesidad. El contenido es estático a propósito: es lo que
 * lee un buscador y lo que extrae un motor de IA, y tiene que estar en el HTML
 * aunque el catálogo tarde en cargar.
 */
import { Link, useLocation } from "react-router-dom";
import { landingPorSlug } from "../features/trafico/landings.js";
import { useCatalogo } from "../features/catalogo/useCatalogo.js";
import { TarjetaProducto } from "../components/ui/TarjetaProducto.js";
import { BotonEnlace } from "../components/ui/Boton.js";
import { NoEncontrada } from "./NoEncontrada.js";

export function Landing() {
  /**
   * El slug sale de la URL, no de un parámetro de ruta: cada landing tiene su
   * propia ruta explícita —para que el prerenderizado sepa cuáles son— y en
   * una ruta sin `:slug` un `useParams()` viene vacío. Con eso, todas las
   * landings eran un 404, también en el navegador.
   */
  const { pathname } = useLocation();
  const landing = landingPorSlug(pathname.replace(/^\//, "").replace(/\/$/, ""));
  const { productos, cargando } = useCatalogo();

  if (!landing) return <NoEncontrada />;

  const suyos = productos.filter((p) => {
    if (landing.categorias?.length && !landing.categorias.includes(p.categoria)) return false;
    return p.usos.includes(landing.uso);
  });

  return (
    <article className="py-6">
      <p className="text-[13px] text-apagado">
        <Link to="/">Inicio</Link> · <Link to="/tienda">Tienda</Link> · {landing.h1}
      </p>

      <h1 className="mt-4 max-w-[18ch] text-4xl sm:text-5xl">{landing.h1}</h1>
      <p className="mt-5 max-w-[62ch] text-lg text-tinta-2">{landing.intro}</p>

      <div className="mt-7 flex flex-wrap gap-3">
        <BotonEnlace to={`/tienda?u=${landing.uso}`}>Ver los equipos</BotonEnlace>
        <BotonEnlace to="/empresas" tono="fantasma">
          Cotizar para mi empresa
        </BotonEnlace>
      </div>

      <h2 className="mt-12 text-3xl">Qué pedir</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {landing.pide.map(([que, porque]) => (
          <div key={que} className="rounded-marco border border-linea bg-white/[0.03] p-5">
            <h3 className="text-[17px]">{que}</h3>
            <p className="mt-1.5 text-[13.5px] text-apagado">{porque}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-3xl">Lo que hay hoy en Econnet</h2>
      {cargando && <p className="mt-3 text-tinta-2">Cargando el catálogo…</p>}
      {!cargando && !suyos.length && (
        <p className="mt-3 max-w-[60ch] text-tinta-2">
          Hoy no tenemos publicado ningún equipo para esto. Escríbenos y lo buscamos: trabajamos con más catálogo del
          que está cargado en la web.
        </p>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {suyos.map((producto) => (
          <TarjetaProducto key={producto.id} producto={producto} />
        ))}
      </div>

      <h2 className="mt-12 text-3xl">Preguntas</h2>
      <div className="mt-3">
        {landing.preguntas.map(([pregunta, respuesta]) => (
          <details key={pregunta} className="border-b border-linea py-4">
            <summary className="cursor-pointer text-[15.5px] font-semibold">{pregunta}</summary>
            <p className="mt-2.5 max-w-[68ch] text-[14.5px] text-tinta-2">{respuesta}</p>
          </details>
        ))}
      </div>

      <div className="mt-12 rounded-marco border border-linea bg-panel p-7">
        <h2 className="mt-0 text-2xl">¿Lo vemos juntos?</h2>
        <p className="mt-2 max-w-[58ch] text-tinta-2">
          Cuéntanos qué vas a hacer con el equipo y con qué presupuesto. Te respondemos con dos o tres opciones
          concretas — y con cuál te sobra.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <BotonEnlace to="/#test">Hacer el test de 60 segundos</BotonEnlace>
          <BotonEnlace to="/guia-de-compra" tono="fantasma">
            Leer la guía de compra
          </BotonEnlace>
        </div>
      </div>
    </article>
  );
}
