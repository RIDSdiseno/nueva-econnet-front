import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, clp } from "../services/api.js";
import type { Producto as TipoProducto } from "../services/tipos.js";
import { Boton } from "../components/ui/Boton.js";
import { Condicion, Precio, Stock } from "../components/ui/Etiquetas.js";
import { ImagenProducto } from "../components/ui/ImagenProducto.js";
import { useCarrito } from "../features/carrito/useCarrito.js";
import { FormularioCorreo } from "../features/captacion/FormularioCorreo.js";
import { enlace, mensajeAvisoPrecio, mensajeProducto } from "../features/whatsapp/whatsapp.js";
import { datosIniciales } from "../services/datosIniciales.js";
import { agregarAlCarrito, clicWhatsapp, verProducto } from "../features/analitica/eventos.js";

const ETIQUETAS: Array<[string, string]> = [
  ["cpu", "Procesador"],
  ["gpu", "Gráfica"],
  ["ram", "Memoria"],
  ["almacenamiento", "Almacenamiento"],
  ["pantalla", "Pantalla"],
  ["so", "Sistema operativo"],
  ["conectividad", "Conectividad"],
  ["seguridad", "Seguridad"],
  ["bateria", "Batería"],
  ["peso", "Peso"]
];

const TRADUCE: Record<string, string> = {
  cpu: "Quién hace el trabajo. Manda en render, compilación y planillas enormes.",
  gpu: "Quién dibuja: juego, 3D y edición. Si no haces eso, no la necesitas.",
  ram: "Cuántas cosas puedes tener abiertas a la vez sin que se ponga lento.",
  almacenamiento: "Cuánto cabe y qué tan rápido abre. NVMe es el rápido.",
  pantalla: "Donde miras ocho horas. Se nota más que el procesador."
};

export function Producto() {
  const { slug } = useParams();
  const { agregar } = useCarrito();
  /**
   * Arranca con el producto que el HTML ya traía. Sin esto, el prerenderizado
   * escribía «Cargando…» y eso era lo que leían Google y los bots de IA: una
   * ficha sin nombre, sin precio y sin especificaciones.
   */
  const precargado = datosIniciales().producto;
  const [producto, setProducto] = useState<TipoProducto | null>(
    precargado && precargado.slug === slug ? precargado : null
  );
  const [error, setError] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);

  useEffect(() => {
    if (!slug) return;

    /**
     * La ficha prerenderizada es del último `build`. Si el precio o el stock
     * cambiaron en el panel desde entonces, lo que se ve está caducado, así
     * que siempre se vuelve a preguntar. Lo que sí evita el precargado es el
     * parpadeo: la pantalla no se vacía mientras llega la respuesta.
     */
    const yaEstaba = precargado?.slug === slug;
    let vivo = true;
    if (!yaEstaba) setProducto(null);
    setError(null);

    api
      .producto(slug)
      .then((p) => vivo && setProducto(p))
      /* Con la ficha ya en pantalla, un fallo de red no la sustituye por un
         error: se sigue leyendo lo que el HTML traía. */
      .catch((e: Error) => vivo && !yaEstaba && setError(e.message));
    return () => {
      vivo = false;
    };
  }, [slug, precargado]);

  useEffect(() => {
    if (producto) verProducto(producto);
  }, [producto]);

  if (error) {
    return (
      <div className="py-20 text-center">
        <h1 className="mb-3 text-3xl">No encontramos ese equipo</h1>
        <p className="mb-6 text-tinta-2">{error}</p>
        <Link className="text-azul-claro underline" to="/tienda">
          Volver a la tienda
        </Link>
      </div>
    );
  }

  if (!producto) return <p className="py-20 text-tinta-2">Cargando…</p>;

  const neto = producto.precio.venta ? Math.round(producto.precio.venta / 1.19) : 0;

  return (
    <>
      <p className="mb-4 text-[13px] text-apagado">
        <Link to="/tienda">Tienda</Link> · {producto.categoria} · {producto.marca} {producto.nombre}
      </p>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div>
          <div className="grid place-items-center rounded-marco border border-linea bg-[radial-gradient(120%_90%_at_50%_8%,#1A2236,#0C111B)] p-10">
            <ImagenProducto producto={producto} ancho={760} prioritaria />
          </div>

          <section className="mt-8 border-t border-linea pt-6">
            <h2 className="mb-4 text-2xl">Para quién es, y para quién no</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-linea bg-white/[0.025] p-4">
                <h3 className="mb-2 text-xs uppercase tracking-[0.1em] text-azul-claro">Es para ti si…</h3>
                <p className="text-sm text-tinta-2">{producto.para}</p>
              </div>
              <div className="rounded-xl border border-linea bg-white/[0.025] p-4">
                <h3 className="mb-2 text-xs uppercase tracking-[0.1em] text-apagado">No es para ti si…</h3>
                <p className="text-sm text-tinta-2">{producto.noPara}</p>
              </div>
            </div>
          </section>

          <section className="mt-8 border-t border-linea pt-6">
            <h2 className="mb-4 text-2xl">Qué significa lo que lleva dentro</h2>
            {Object.entries(TRADUCE).map(([clave, explicacion]) =>
              producto.specs[clave] ? (
                <div key={clave} className="mb-4">
                  <b className="text-[14.5px]">{producto.specs[clave]}</b>
                  <p className="mt-1 text-[13.5px] text-apagado">{explicacion}</p>
                </div>
              ) : null
            )}
          </section>

          <section className="mt-8 border-t border-linea pt-6">
            <h2 className="mb-4 text-2xl">Especificaciones</h2>
            <table className="w-full text-[14.5px]">
              <tbody>
                {ETIQUETAS.map(([clave, etiqueta]) => (
                  <tr key={clave} className="border-b border-linea">
                    <th className="w-1/3 py-3 text-left font-normal text-apagado">{etiqueta}</th>
                    <td className="py-3">{producto.specs[clave] ?? <span className="text-apagado">Por confirmar</span>}</td>
                  </tr>
                ))}
                <tr className="border-b border-linea">
                  <th className="py-3 text-left font-normal text-apagado">Condición</th>
                  <td className="py-3">
                    {producto.condicion ?? <span className="text-apagado">Por confirmar</span>}
                  </td>
                </tr>
                <tr className="border-b border-linea">
                  <th className="py-3 text-left font-normal text-apagado">Origen del dato</th>
                  <td className="py-3 text-[12.5px] text-apagado">
                    {producto.fuente} · {producto.fechaDato} · confianza {producto.confianza.toLowerCase()}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        <aside className="rounded-marco border border-linea bg-panel p-6 lg:sticky lg:top-24">
          <Condicion valor={producto.condicion} />
          <h1 className="my-3 text-3xl">
            {producto.marca} {producto.nombre}
          </h1>
          <Stock estado={producto.stock.estado} unidades={producto.stock.unidades} />

          <div className="mt-4">
            <Precio producto={producto} grande />
          </div>

          {producto.seVende ? (
            <>
              <p className="mt-1 text-[13px] text-apagado">
                {/* Sin financiación configurada no se anuncian cuotas: «12 cuotas de X»
                    dividiendo el precio entre doce es una promesa que nadie ha contratado. */}
                Neto {clp(neto)} + IVA {clp((producto.precio.venta ?? 0) - neto)}
              </p>

              <div className="mt-5 flex items-center gap-3">
                <div className="flex items-center overflow-hidden rounded-xl border border-linea-fuerte">
                  <button type="button" className="h-11 w-11 bg-white/5" onClick={() => setCantidad((c) => Math.max(1, c - 1))} aria-label="Menos">
                    −
                  </button>
                  <input
                    className="h-11 w-14 bg-transparent text-center"
                    value={cantidad}
                    onChange={(e) => setCantidad(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                    aria-label="Cantidad"
                  />
                  <button type="button" className="h-11 w-11 bg-white/5" onClick={() => setCantidad((c) => Math.min(20, c + 1))} aria-label="Más">
                    +
                  </button>
                </div>
                <Boton
                  className="flex-1"
                  onClick={() => {
                    agregar(producto.id, cantidad);
                    agregarAlCarrito(producto, cantidad);
                    setAgregado(true);
                    setTimeout(() => setAgregado(false), 1500);
                  }}
                >
                  {agregado ? "Agregado ✓" : "Agregar al carrito"}
                </Boton>
              </div>

              {enlace(mensajeProducto(producto)) && (
                <a
                  className="mt-3 inline-block text-[13.5px] font-semibold text-azul-claro"
                  href={enlace(mensajeProducto(producto)) ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => clicWhatsapp("ficha")}
                >
                  ¿Dudas con este equipo? Pregúntanos por WhatsApp →
                </a>
              )}
            </>
          ) : (
            <>
              {/* Sin número no se pinta un enlace muerto: se ofrece el aviso por correo. */}
              {enlace(mensajeAvisoPrecio(producto)) ? (
                <a
                  className="mt-5 flex h-12 items-center justify-center rounded-full bg-azul font-semibold text-white"
                  href={enlace(mensajeAvisoPrecio(producto)) ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Consultar precio por WhatsApp
                </a>
              ) : (
                <p className="mt-5 rounded-xl border border-linea-fuerte bg-white/5 p-4 text-[13.5px] text-tinta-2">
                  Este equipo todavía no tiene precio publicado en econnet.cl. Déjanos tu correo y te avisamos en
                  cuanto lo tenga.
                </p>
              )}

              {/* El cuarto imán: si hoy no hay precio publicado, avisar cuando lo haya. */}
              <div className="mt-4">
                <FormularioCorreo
                  origen="aviso-precio"
                  titulo="¿Te avisamos cuando tenga precio?"
                  texto="Un solo correo, cuando este equipo tenga precio publicado en econnet.cl."
                  etiquetaBoton="Avísame"
                  consentimiento="Acepto que Econnet me avise sobre este equipo."
                  recomendados={[`${producto.marca} ${producto.nombre}`.slice(0, 80)]}
                />
              </div>
            </>
          )}

          <ul className="mt-6 grid gap-2 text-[13.5px] text-tinta-2">
            {[
              "Garantía y condición declarada",
              "Boleta o factura a nombre de tu empresa",
              "Despacho a todo Chile o retiro en Providencia",
              "Webpay y Mercado Pago",
              "Asesoría antes y después de comprar"
            ].map((linea) => (
              <li key={linea} className="flex gap-2">
                <span className="text-azul-claro">✓</span>
                {linea}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
