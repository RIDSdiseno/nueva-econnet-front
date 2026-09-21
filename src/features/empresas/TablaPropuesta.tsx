/** La propuesta en pantalla: las mismas líneas y los mismos huecos del correo. */
import { Link } from "react-router-dom";
import { clp } from "../../services/api.js";
import type { Propuesta } from "../../services/tipos.js";

export function TablaPropuesta({ propuesta, numero, validaHasta }: { propuesta: Propuesta; numero: string; validaHasta: string }) {
  const fecha = new Date(validaHasta).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="rounded-marco border border-linea-fuerte bg-white/[0.028] p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-azul-claro">Cotización {numero}</p>
      <h2 className="mt-1 text-2xl">Perfil {propuesta.etiquetaPerfil}</h2>

      {propuesta.lineas.length > 0 ? (
        <>
          <table className="mt-5 w-full text-[14px]">
            <tbody>
              {propuesta.lineas.map((linea) => (
                <tr key={linea.productoId} className="border-b border-linea align-top">
                  <td className="py-3 pr-3">
                    <Link className="font-semibold hover:text-azul-claro" to={`/tienda/${linea.slug}`}>
                      {linea.nombre}
                    </Link>
                    <span className="text-apagado"> × {linea.cantidad}</span>
                    <br />
                    <small className="text-[12.5px] text-apagado">
                      {linea.condicion ? `Condición: ${linea.condicion.toLowerCase()}` : "Condición por confirmar"}
                      {linea.stockConocido ? "" : " · stock por confirmar"}
                    </small>
                  </td>
                  <td className="py-3 text-right tabular-nums">{clp(linea.importe)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="mt-4 grid gap-1.5 text-[13.5px]">
            <div className="flex justify-between text-tinta-2">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{clp(propuesta.subtotal)}</dd>
            </div>
            {propuesta.descuento > 0 && (
              <div className="flex justify-between text-tinta-2">
                <dt>Descuento por volumen ({propuesta.descuentoPorcentaje}%)</dt>
                <dd className="tabular-nums">− {clp(propuesta.descuento)}</dd>
              </div>
            )}
            <div className="flex justify-between text-tinta-2">
              <dt>Neto</dt>
              <dd className="tabular-nums">{clp(propuesta.neto)}</dd>
            </div>
            <div className="flex justify-between text-tinta-2">
              <dt>IVA 19%</dt>
              <dd className="tabular-nums">{clp(propuesta.iva)}</dd>
            </div>
            <div className="mt-2 flex justify-between border-t border-linea pt-3 text-lg font-semibold">
              <dt>Total con IVA</dt>
              <dd className="tabular-nums">{clp(propuesta.total)}</dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="mt-4 text-tinta-2">
          Con ese presupuesto no tenemos hoy nada en catálogo que podamos proponerte con honestidad. Lo vemos caso a
          caso: te escribimos con alternativas.
        </p>
      )}

      {propuesta.huecos.length > 0 && (
        <div className="mt-5 rounded-xl border border-ambar/40 bg-ambar/10 p-4">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-[#F0C27A]">Lo que falta por cerrar</p>
          <ul className="mt-2 grid gap-1.5">
            {propuesta.huecos.map((hueco) => (
              <li key={hueco} className="text-[13px] text-[#E8CFA0]">
                · {hueco}
              </li>
            ))}
          </ul>
        </div>
      )}

      {propuesta.alternativas.length > 0 && (
        <p className="mt-4 text-[13px] text-apagado">
          Si prefieres otra opción:{" "}
          {propuesta.alternativas.map((alternativa, i) => (
            <span key={alternativa.slug}>
              {i > 0 ? " o " : ""}
              <Link className="text-azul-claro" to={`/tienda/${alternativa.slug}`}>
                {alternativa.nombre}
              </Link>{" "}
              ({clp(alternativa.precioUnitario)} por equipo)
            </span>
          ))}
          . Se cambia con un correo.
        </p>
      )}

      <p className="mt-4 text-[12.5px] text-apagado">
        Precios válidos hasta el <b>{fecha}</b>. Después hay que rehacerla: el dólar manda. Incluye factura y garantía;
        el plazo de entrega se confirma al aceptar.
      </p>
    </div>
  );
}
