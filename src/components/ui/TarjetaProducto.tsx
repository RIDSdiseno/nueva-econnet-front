import { Link } from "react-router-dom";
import { Boton } from "./Boton.js";
import { Condicion, Precio, Stock } from "./Etiquetas.js";
import { useCarrito } from "../../features/carrito/useCarrito.js";
import { useComparador } from "../../features/comparador/useComparador.js";
import type { Producto } from "../../services/tipos.js";
import { ImagenProducto } from "./ImagenProducto.js";

export function DibujoEquipo({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 320 200" fill="none" aria-hidden="true" className="w-4/5">
      <defs>
        <linearGradient id={`g${color.replace("#", "")}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".85" />
          <stop offset="1" stopColor={color} stopOpacity=".12" />
        </linearGradient>
      </defs>
      <rect x="58" y="26" width="204" height="126" rx="9" fill="#0A0E17" stroke="rgba(255,255,255,.14)" />
      <rect x="66" y="34" width="188" height="110" rx="5" fill={`url(#g${color.replace("#", "")})`} />
      <path d="M66 118c34-26 62 10 96-14 28-20 56 4 92-18v58H66z" fill="#0A0E17" opacity=".38" />
      <rect x="26" y="152" width="268" height="12" rx="6" fill="#131A28" stroke="rgba(255,255,255,.12)" />
    </svg>
  );
}

export function TarjetaProducto({ producto }: { producto: Producto }) {
  const { agregar } = useCarrito();
  const { slugs, alternar, lleno } = useComparador();
  const comparando = slugs.includes(producto.slug);
  const descuento =
    producto.precio.lista && producto.precio.venta
      ? Math.round((1 - producto.precio.venta / producto.precio.lista) * 100)
      : null;

  return (
    <article className="flex flex-col overflow-hidden rounded-marco border border-linea bg-gradient-to-b from-white/[0.045] to-white/[0.012] transition hover:-translate-y-[3px] hover:border-azul-claro/40">
      <Link
        to={`/tienda/${producto.slug}`}
        /* El dibujo es decorativo (aria-hidden), así que sin esto el enlace se
           anuncia como «enlace» y ya: un lector de pantalla no dice de qué. */
        aria-label={`Ver ${producto.marca} ${producto.nombre}`}
        className="relative grid aspect-[4/3] place-items-center border-b border-linea bg-[radial-gradient(120%_90%_at_50%_8%,#1A2236,#0C111B)] p-4"
      >
        <ImagenProducto producto={producto} ancho={420} className="w-4/5" />
        {descuento ? (
          <span className="absolute right-3 top-3 rounded-full border border-verde/35 bg-verde/15 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#7FE0AC]">
            {descuento}% menos
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Condicion valor={producto.condicion} />
        <h3 className="text-[15.5px] leading-tight">
          <Link to={`/tienda/${producto.slug}`}>
            {producto.marca} {producto.nombre}
          </Link>
        </h3>
        <p className="text-[12.5px] text-apagado">
          {[producto.specs.cpu, producto.specs.ram, producto.specs.almacenamiento].filter(Boolean).join(" · ") ||
            "Especificaciones por confirmar"}
        </p>
        <Stock estado={producto.stock.estado} unidades={producto.stock.unidades} />
        <div className="mt-auto pt-1">
          <Precio producto={producto} />
        </div>
      </div>

      <div className="flex gap-2 p-4 pt-0">
        {producto.seVende ? (
          <Boton tamano="pequeno" onClick={() => agregar(producto.id)} className="flex-1">
            Agregar
          </Boton>
        ) : (
          <Link
            to={`/tienda/${producto.slug}`}
            className="flex h-10 flex-1 items-center justify-center rounded-full bg-azul px-4 text-sm font-semibold text-white"
          >
            Consultar precio
          </Link>
        )}
        <button
          type="button"
          onClick={() => alternar(producto.slug)}
          disabled={!comparando && lleno}
          aria-pressed={comparando}
          title={!comparando && lleno ? "Ya hay tres equipos en la comparación" : undefined}
          className={`flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
            comparando ? "border-azul bg-azul/15 text-azul-claro" : "border-linea-fuerte bg-white/5"
          }`}
        >
          {comparando ? "Comparando" : "Comparar"}
        </button>
      </div>
    </article>
  );
}
