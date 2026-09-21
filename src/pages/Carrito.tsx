import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, clp } from "../services/api.js";
import type { RespuestaTotales } from "../services/tipos.js";
import { Boton } from "../components/ui/Boton.js";
import { useCarrito } from "../features/carrito/useCarrito.js";
import { enlace, mensajeCarrito } from "../features/whatsapp/whatsapp.js";

export function Carrito() {
  const { lineas, cambiar, quitar } = useCarrito();
  const navegar = useNavigate();
  const [cupon, setCupon] = useState("");
  const [cuponAplicado, setCuponAplicado] = useState("");
  const [cuenta, setCuenta] = useState<RespuestaTotales | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lineas.length) {
      setCuenta(null);
      return;
    }
    let vivo = true;
    const id = setTimeout(() => {
      api
        .totales({ items: lineas, despacho: { modo: "RETIRO" }, ...(cuponAplicado ? { cupon: cuponAplicado } : {}) })
        .then((r) => vivo && setCuenta(r))
        .catch((e: Error) => vivo && setError(e.message));
    }, 200);

    return () => {
      vivo = false;
      clearTimeout(id);
    };
  }, [lineas, cuponAplicado]);

  if (!lineas.length) {
    return (
      <div className="rounded-marco border border-dashed border-linea-fuerte py-20 text-center">
        <h1 className="mb-3 text-3xl">Tu carrito está vacío</h1>
        <p className="mb-7 text-tinta-2">Todavía no llevas nada.</p>
        <Link className="rounded-full bg-azul px-6 py-3 font-semibold text-white" to="/tienda">
          Ver los equipos
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-6 text-4xl">Tu carrito</h1>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
        <div>
          {(cuenta?.lineas ?? []).map((linea) => (
            <div key={linea.productoId} className="grid grid-cols-[1fr_auto] gap-4 border-b border-linea py-4">
              <div>
                <h3 className="text-[15px]">{linea.nombre}</h3>
                <p className="text-[13px] text-apagado">
                  {clp(linea.precio)} c/u
                  {linea.condicion ? ` · ${linea.condicion.toLowerCase()}` : " · condición por confirmar"}
                  {linea.stockConocido ? "" : " · stock por confirmar"}
                </p>
                <div className="mt-2 flex w-fit items-center overflow-hidden rounded-xl border border-linea-fuerte">
                  <button type="button" className="h-10 w-10 bg-white/5" onClick={() => cambiar(linea.productoId, linea.cantidad - 1)} aria-label="Menos">
                    −
                  </button>
                  <span className="w-12 text-center tabular-nums">{linea.cantidad}</span>
                  <button type="button" className="h-10 w-10 bg-white/5" onClick={() => cambiar(linea.productoId, linea.cantidad + 1)} aria-label="Más">
                    +
                  </button>
                </div>
              </div>
              <div className="text-right">
                <b>{clp(linea.precio * linea.cantidad)}</b>
                <br />
                <button type="button" className="text-[13px] text-apagado underline" onClick={() => quitar(linea.productoId)}>
                  Quitar
                </button>
              </div>
            </div>
          ))}

          {cuenta?.rechazadas.length ? (
            <p className="mt-4 rounded-xl border border-ambar/40 bg-ambar/10 p-4 text-[13.5px] text-[#F0C27A]">
              Hay equipos que no se pueden comprar en línea todavía: se consultan por WhatsApp.
            </p>
          ) : null}

          {cuenta?.stockPorConfirmar ? (
            <p className="mt-4 rounded-xl border border-ambar/40 bg-ambar/10 p-4 text-[13.5px] text-[#F0C27A]">
              Uno de los equipos tiene el stock por confirmar: tu pedido queda anotado y no te cobramos nada hasta confirmarlo.
            </p>
          ) : null}

          <Link className="mt-6 inline-block text-azul-claro underline" to="/tienda">
            Seguir comprando
          </Link>
        </div>

        <aside className="rounded-marco border border-linea bg-panel p-6 lg:sticky lg:top-24">
          <h2 className="mb-4 text-xl">Resumen</h2>
          {error && <p className="mb-3 text-sm text-rojo">{error}</p>}

          <div className="flex justify-between py-1.5 text-[14.5px] text-tinta-2">
            <span>Subtotal</span>
            <b>{clp(cuenta?.totales.subtotal ?? 0)}</b>
          </div>
          {cuenta?.totales.descuento ? (
            <div className="flex justify-between py-1.5 text-[14.5px] text-tinta-2">
              <span>Descuento</span>
              <b>− {clp(cuenta.totales.descuento)}</b>
            </div>
          ) : null}
          <div className="flex justify-between py-1.5 text-[14.5px] text-tinta-2">
            <span>Despacho</span>
            <b>se calcula en el siguiente paso</b>
          </div>
          <div className="mt-3 flex justify-between border-t border-linea pt-3 text-lg font-semibold">
            <span>Total</span>
            <b>{clp(cuenta?.totales.total ?? 0)}</b>
          </div>

          <div className="mt-4 flex gap-2">
            <input
              className="h-10 min-w-0 flex-1 rounded-xl border border-linea-fuerte bg-white/5 px-3 text-sm"
              placeholder="Cupón"
              value={cupon}
              onChange={(e) => setCupon(e.target.value)}
              aria-label="Cupón"
            />
            <Boton tono="fantasma" tamano="pequeno" onClick={() => setCuponAplicado(cupon.trim().toUpperCase())}>
              Aplicar
            </Boton>
          </div>
          {cuponAplicado && (
            <p className="mt-2 text-[12.5px] text-apagado">{cuenta?.cupon ? "Cupón aplicado." : cuenta?.cuponMotivo}</p>
          )}

          <Boton ancho className="mt-5" onClick={() => navegar("/checkout")}>
            Continuar
          </Boton>

          {/* Preguntar antes de pagar es lo que pasa de verdad con un millón
              de pesos en el carrito. El mensaje va con las líneas dentro. */}
          {cuenta &&
            (() => {
              const url = enlace(
                mensajeCarrito(
                  cuenta.lineas.map((l) => ({ nombre: l.nombre, cantidad: l.cantidad })),
                  cuenta.totales.total
                )
              );
              return url ? (
                <a
                  className="mt-3 block text-center text-[13.5px] font-semibold text-azul-claro"
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ¿Dudas antes de pagar? Pregúntanos →
                </a>
              ) : null;
            })()}
        </aside>
      </div>
    </>
  );
}
