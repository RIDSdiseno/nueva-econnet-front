/**
 * La imagen de un producto, cuando la hay.
 *
 * Hoy el catálogo del 18-09-2026 no trae ni una foto, y eso **no se disimula**:
 * no se pone una imagen de archivo ni la de un modelo parecido, porque quien
 * compra un equipo de un millón de pesos por una foto que no es la suya lo
 * devuelve. Mientras no haya foto se dibuja un equipo genérico, marcado como
 * dibujo.
 *
 * Cuando lleguen las fotos, esto ya está: `loading="lazy"`, `decoding="async"`,
 * proporción fija para no mover la página (CLS), `sizes` para que el móvil no
 * se baje la imagen de escritorio, y `alt` de verdad.
 */
import type { Producto } from "../../services/tipos.js";
import { DibujoEquipo } from "./TarjetaProducto.js";

export function ImagenProducto({
  producto,
  ancho = 640,
  prioritaria = false,
  className = ""
}: {
  producto: Producto;
  ancho?: number;
  /** La de la ficha se carga ya: es el LCP de esa página. */
  prioritaria?: boolean;
  className?: string;
}) {
  const alt = producto.imagenAlt ?? `${producto.marca} ${producto.nombre}`;

  if (!producto.imagenUrl) {
    return (
      <figure className={`grid place-items-center ${className}`} aria-label={`${alt} · sin fotografía disponible`}>
        <DibujoEquipo color={producto.color} />
        <figcaption className="sr-only">Ilustración: este equipo todavía no tiene fotografía.</figcaption>
      </figure>
    );
  }

  return (
    <img
      src={producto.imagenUrl}
      alt={alt}
      width={ancho}
      height={Math.round((ancho * 3) / 4)}
      loading={prioritaria ? "eager" : "lazy"}
      fetchPriority={prioritaria ? "high" : "auto"}
      decoding="async"
      sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
      className={`h-full w-full object-contain ${className}`}
    />
  );
}
