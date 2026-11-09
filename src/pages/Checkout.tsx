/**
 * Compra como invitado. Cada campo que se pide tiene un motivo; los que no lo
 * tienen no están. La validación de aquí es para avisar antes: la que manda es
 * la del servidor.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, clp, ErrorDeApi } from "../services/api.js";
import type { RespuestaTotales } from "../services/tipos.js";
import { Boton } from "../components/ui/Boton.js";
import { useCarrito } from "../features/carrito/useCarrito.js";
import { REGIONES, rutValido } from "../features/checkout/regiones.js";
import { comprar as eventoComprar, empezarCheckout } from "../features/analitica/eventos.js";

type MetodoPago = "webpay" | "mercadopago";

const ETIQUETAS: Record<MetodoPago, { titulo: string; subtitulo: string; logo: string }> = {
  webpay: {
    titulo: "Webpay",
    subtitulo: "Tarjeta de crédito o débito",
    logo: "https://www.webpay.cl/assets/logo-webpay.svg"
  },
  mercadopago: {
    titulo: "Mercado Pago",
    subtitulo: "Tarjeta, débito, cuotas o transferencia",
    logo: "https://http2.mlstatic.com/frontend-assets/mp-web-navigation/ui-navigation/5.21.22/mercadopago/logo__large@2x.png"
  }
};

const clave = () => {
  const guardada = sessionStorage.getItem("econnet:idem");
  if (guardada) return guardada;
  const nueva = crypto.randomUUID();
  sessionStorage.setItem("econnet:idem", nueva);
  return nueva;
};

type Campos = {
  nombre: string; correo: string; telefono: string; region: string; comuna: string;
  direccion: string; notas: string; rut: string; razonSocial: string; giro: string;
  direccionFactura: string; cupon: string;
};

/**
 * Vive fuera de `Checkout` a propósito. Declarado dentro, React lo trataba como
 * un componente nuevo en cada render, desmontaba el `<input>` y el campo perdía
 * el foco a la primera letra: se escribía una y había que volver a pinchar.
 */
function Campo({
  id,
  etiqueta,
  valor,
  error,
  alCambiar,
  tipo = "text",
  opcional = false
}: {
  id: keyof Campos;
  etiqueta: string;
  valor: string;
  error?: string;
  alCambiar: (e: { target: { value: string } }) => void;
  tipo?: string;
  opcional?: boolean;
}) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-[13.5px] text-tinta-2" htmlFor={id}>
        {etiqueta}
        {opcional ? " (opcional)" : ""}
      </label>
      <input
        id={id}
        type={tipo}
        className="h-12 w-full rounded-xl border border-linea-fuerte bg-white/5 px-4 text-[15px]"
        value={valor}
        onChange={alCambiar}
      />
      {error && <span className="mt-1 block text-[12.5px] text-rojo">{error}</span>}
    </div>
  );
}

export function Checkout() {
  const { lineas, id: carritoId, vaciar } = useCarrito();
  const navegar = useNavigate();

  const [modo, setModo] = useState<"DESPACHO" | "RETIRO">("DESPACHO");
  const [documento, setDocumento] = useState<"BOLETA" | "FACTURA">("BOLETA");
  const [campos, setCampos] = useState<Campos>({
    nombre: "", correo: "", telefono: "", region: "", comuna: "", direccion: "", notas: "",
    rut: "", razonSocial: "", giro: "", direccionFactura: "", cupon: ""
  });
  /**
   * Dos consentimientos distintos, y separados a propósito: aceptar las
   * condiciones de la compra es obligatorio; recibir publicidad es opcional.
   * Meterlos en la misma casilla convierte el «sí» comercial en no informado,
   * y eso no es consentimiento (Ley 19.628).
   */
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptaMarketing, setAceptaMarketing] = useState(false);
  const [cuenta, setCuenta] = useState<RespuestaTotales | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [metodoPago, setMetodoPago] = useState<MetodoPago | null>(null);

  useEffect(() => {
    api.pasarelas().then((lista) => {
      setMetodosPago(lista);
      if (lista.length === 1) setMetodoPago(lista[0]);
    }).catch(() => {/* sin selector si falla */});
  }, []);

  const cambiar = (campo: keyof Campos) => (e: { target: { value: string } }) =>
    setCampos((previos) => ({ ...previos, [campo]: e.target.value }));

  /**
   * Pedir el total al servidor. Extraído del efecto porque hace falta también
   * al vuelo: si el pedido se rechaza porque el total subió, hay que volver a
   * preguntarlo y enseñar el de verdad antes de que nadie confirme nada.
   */
  const recalcular = useCallback(async () => {
    if (!lineas.length) return;
    try {
      setCuenta(
        await api.totales({
          items: lineas,
          despacho: { modo, ...(modo === "DESPACHO" && campos.region ? { region: campos.region } : {}) },
          ...(campos.cupon ? { cupon: campos.cupon } : {}),
          ...(campos.correo ? { correo: campos.correo } : {})
        })
      );
    } catch {
      /* Un fallo al recalcular no borra lo que ya hay en pantalla. */
    }
  }, [lineas, modo, campos.region, campos.cupon, campos.correo]);

  useEffect(() => {
    const id = setTimeout(() => void recalcular(), 250);
    return () => clearTimeout(id);
  }, [recalcular]);

  useEffect(() => {
    if (cuenta) empezarCheckout(cuenta.totales.total);
  }, [cuenta?.totales.total]); // eslint-disable-line react-hooks/exhaustive-deps

  const puedeCobrar = cuenta?.sePuedeCobrar ?? false;

  const avisoNoCobro = useMemo(() => {
    if (!cuenta || puedeCobrar) return null;
    if (cuenta.stockPorConfirmar) {
      return "Uno de los equipos tiene el stock por confirmar. Anotamos tu pedido y te escribimos con el total cerrado: no te cobramos nada ahora.";
    }
    return "Todavía no tenemos tarifa para tu región. Anotamos tu pedido y te confirmamos el despacho antes de cobrarte.";
  }, [cuenta, puedeCobrar]);

  if (!lineas.length) {
    return (
      <div className="py-20 text-center">
        <h1 className="mb-3 text-3xl">No hay nada que pagar</h1>
        <Boton onClick={() => navegar("/tienda")}>Ver los equipos</Boton>
      </div>
    );
  }

  function validar(): boolean {
    const nuevos: Record<string, string> = {};
    if (campos.nombre.trim().length < 3) nuevos.nombre = "Falta tu nombre.";
    if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(campos.correo)) nuevos.correo = "Revisa el correo.";
    if (modo === "DESPACHO") {
      if (!campos.region) nuevos.region = "Elige una región.";
      if (!campos.comuna.trim()) nuevos.comuna = "Falta la comuna.";
      if (campos.direccion.trim().length < 5) nuevos.direccion = "Falta la dirección.";
    }
    if (!aceptaTerminos) nuevos.terminos = "Hay que aceptar los términos y la política de privacidad para comprar.";
    if (documento === "FACTURA") {
      if (!rutValido(campos.rut)) nuevos.rut = "Ese RUT no pasa la comprobación del dígito verificador.";
      if (!campos.razonSocial.trim()) nuevos.razonSocial = "Falta la razón social.";
      if (!campos.giro.trim()) nuevos.giro = "Falta el giro.";
    }
    if (metodosPago.length > 1 && !metodoPago) nuevos.metodoPago = "Elige cómo quieres pagar.";
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  }

  async function comprar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    if (!validar()) return;

    setEnviando(true);
    try {
      const respuesta = await api.crearPedido({
        items: lineas,
        nombre: campos.nombre,
        correo: campos.correo,
        ...(campos.telefono ? { telefono: campos.telefono } : {}),
        despacho:
          modo === "RETIRO"
            ? { modo }
            : { modo, region: campos.region, comuna: campos.comuna, direccion: campos.direccion, ...(campos.notas ? { notas: campos.notas } : {}) },
        documento:
          documento === "BOLETA"
            ? { tipo: documento }
            : {
                tipo: documento,
                rut: campos.rut,
                razonSocial: campos.razonSocial,
                giro: campos.giro,
                ...(campos.direccionFactura ? { direccion: campos.direccionFactura } : {})
              },
        ...(campos.cupon ? { cupon: campos.cupon } : {}),
        ...(carritoId ? { carritoId } : {}),
        ...(metodoPago ? { pasarela: metodoPago } : {}),
        idempotencia: clave(),
        terminos: true as const,
        consentimiento: aceptaMarketing,
        /**
         * El total que hay en pantalla ahora mismo. El servidor no lo usa para
         * cobrar —el precio lo sigue poniendo él— sino **para frenar**: si el
         * total real subió entre esta pantalla y el pedido (un cupón que se
         * agotó justo en medio), no crea nada y lo dice. Antes se creaba con
         * el total nuevo y la pasarela pedía un importe que nadie había visto.
         */
        ...(cuenta?.totales.total !== undefined ? { totalEsperado: cuenta.totales.total } : {})
      });

      /**
       * El servidor contesta «Listo.» sin número cuando el formulario se envió
       * en menos de 1,2 s: para él es un robot y no se lo dice. Una persona con
       * autorrelleno puede caer ahí, así que aquí NO se vacía el carrito ni se
       * la manda a una página de gracias sin pedido.
       */
      if (!respuesta.numero) {
        setError("No pudimos registrar el pedido. Revisa los datos y vuelve a intentarlo en un momento.");
        return;
      }

      eventoComprar(respuesta.numero, respuesta.totales.total);
      vaciar();
      sessionStorage.removeItem("econnet:idem");

      if (respuesta.pago?.tipo === "redirect") {
        window.location.href = respuesta.pago.url;
        return;
      }
      if (respuesta.pago?.tipo === "post") {
        /* Webpay exige llegar por POST con token_ws. */
        const formulario = document.createElement("form");
        formulario.method = "POST";
        formulario.action = respuesta.pago.url;
        for (const [nombre, valor] of Object.entries(respuesta.pago.campos ?? {})) {
          const campo = document.createElement("input");
          campo.type = "hidden";
          campo.name = nombre;
          campo.value = valor;
          formulario.appendChild(campo);
        }
        document.body.appendChild(formulario);
        formulario.submit();
        return;
      }

      navegar(`/tienda/gracias?n=${encodeURIComponent(respuesta.numero)}&e=${encodeURIComponent(respuesta.estado)}`);
    } catch (e) {
      /* El total subió mientras estaba en esta pantalla: se recalcula, se
         enseña el nuevo y se pide confirmar. No se cobra a ciegas. */
      if (e instanceof ErrorDeApi && e.codigo === "total_cambio") {
        const detalles = e.detalles as unknown as { ahora?: number; motivo?: string } | undefined;
        await recalcular();
        setError(
          `${detalles?.motivo ?? "El total cambió mientras terminabas."} Ahora son ${clp(detalles?.ahora)}. ` +
            "Revísalo y vuelve a pulsar para confirmar."
        );
        return;
      }
      setError(e instanceof ErrorDeApi ? e.message : (e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <h1 className="mb-2 text-4xl">Finalizar compra</h1>
      <p className="mb-7 text-tinta-2">Sin crear cuenta. Te pedimos lo justo para despacharte y emitir el documento.</p>

      <form className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]" onSubmit={comprar} noValidate>
        <div>
          <fieldset className="mb-4 rounded-marco border border-linea bg-panel p-5">
            <legend className="px-2 text-xs uppercase tracking-[0.1em] text-azul-claro">Tus datos</legend>
            <Campo id="nombre" etiqueta="Nombre y apellido" valor={campos.nombre} error={errores.nombre} alCambiar={cambiar("nombre")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="correo" etiqueta="Correo" tipo="email" valor={campos.correo} error={errores.correo} alCambiar={cambiar("correo")} />
              <Campo id="telefono" etiqueta="Teléfono" tipo="tel" opcional valor={campos.telefono} error={errores.telefono} alCambiar={cambiar("telefono")} />
            </div>
            <label className="flex cursor-pointer items-start gap-3 text-[13px] text-tinta-2">
              <input
                type="checkbox"
                className="mt-1 accent-azul"
                checked={aceptaTerminos}
                onChange={(e) => setAceptaTerminos(e.target.checked)}
                aria-describedby="error-terminos"
              />
              <span>
                He leído y acepto los{" "}
                <Link className="text-azul-claro underline" to="/legal/terminos" target="_blank">
                  términos y condiciones
                </Link>{" "}
                y la{" "}
                <Link className="text-azul-claro underline" to="/legal/privacidad" target="_blank">
                  política de privacidad
                </Link>
                .
              </span>
            </label>
            {errores.terminos && (
              <span id="error-terminos" className="mt-1 block text-[12.5px] text-rojo">
                {errores.terminos}
              </span>
            )}

            <label className="mt-3 flex cursor-pointer items-start gap-3 text-[13px] text-apagado">
              <input
                type="checkbox"
                className="mt-1 accent-azul"
                checked={aceptaMarketing}
                onChange={(e) => setAceptaMarketing(e.target.checked)}
              />
              Quiero recibir recomendaciones de Econnet. Opcional, y me doy de baja en un clic.
            </label>
          </fieldset>

          <fieldset className="mb-4 rounded-marco border border-linea bg-panel p-5">
            <legend className="px-2 text-xs uppercase tracking-[0.1em] text-azul-claro">Entrega</legend>
            {(["DESPACHO", "RETIRO"] as const).map((opcion) => (
              <label
                key={opcion}
                className={`mb-2 flex cursor-pointer gap-3 rounded-xl border p-4 ${modo === opcion ? "border-azul bg-azul/10" : "border-linea-fuerte"}`}
              >
                <input type="radio" name="modo" className="mt-1 accent-azul" checked={modo === opcion} onChange={() => setModo(opcion)} />
                <span>
                  <b className="block text-[14.5px]">{opcion === "DESPACHO" ? "Despacho a domicilio" : "Retiro en oficina"}</b>
                  <small className="text-apagado">
                    {opcion === "DESPACHO"
                      ? "A todo Chile. El costo depende de tu región."
                      : "La Concepción 65, oficina 1003, Providencia · 08:30 a 18:00"}
                  </small>
                </span>
              </label>
            ))}

            {modo === "DESPACHO" && (
              <div className="mt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="mb-4">
                    <label className="mb-1.5 block text-[13.5px] text-tinta-2" htmlFor="region">
                      Región
                    </label>
                    <select
                      id="region"
                      className="h-12 w-full rounded-xl border border-linea-fuerte bg-white/5 px-4 text-[15px]"
                      value={campos.region}
                      onChange={cambiar("region")}
                    >
                      <option value="">Elige una región</option>
                      {REGIONES.map((region) => (
                        <option key={region}>{region}</option>
                      ))}
                    </select>
                    {errores.region && <span className="mt-1 block text-[12.5px] text-rojo">{errores.region}</span>}
                  </div>
                  <Campo id="comuna" etiqueta="Comuna" valor={campos.comuna} error={errores.comuna} alCambiar={cambiar("comuna")} />
                </div>
                <Campo id="direccion" etiqueta="Dirección" valor={campos.direccion} error={errores.direccion} alCambiar={cambiar("direccion")} />
                <Campo id="notas" etiqueta="Indicaciones para la entrega" opcional valor={campos.notas} error={errores.notas} alCambiar={cambiar("notas")} />
              </div>
            )}
          </fieldset>

          <fieldset className="rounded-marco border border-linea bg-panel p-5">
            <legend className="px-2 text-xs uppercase tracking-[0.1em] text-azul-claro">Documento</legend>
            {(["BOLETA", "FACTURA"] as const).map((opcion) => (
              <label
                key={opcion}
                className={`mb-2 flex cursor-pointer gap-3 rounded-xl border p-4 ${documento === opcion ? "border-azul bg-azul/10" : "border-linea-fuerte"}`}
              >
                <input
                  type="radio"
                  name="documento"
                  className="mt-1 accent-azul"
                  checked={documento === opcion}
                  onChange={() => setDocumento(opcion)}
                />
                <span>
                  <b className="block text-[14.5px]">{opcion === "BOLETA" ? "Boleta" : "Factura"}</b>
                  <small className="text-apagado">{opcion === "BOLETA" ? "Compra personal." : "A nombre de tu empresa, con crédito fiscal."}</small>
                </span>
              </label>
            ))}

            {documento === "FACTURA" && (
              <div className="mt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo id="rut" etiqueta="RUT de la empresa" valor={campos.rut} error={errores.rut} alCambiar={cambiar("rut")} />
                  <Campo id="razonSocial" etiqueta="Razón social" valor={campos.razonSocial} error={errores.razonSocial} alCambiar={cambiar("razonSocial")} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo id="giro" etiqueta="Giro" valor={campos.giro} error={errores.giro} alCambiar={cambiar("giro")} />
                  <Campo id="direccionFactura" etiqueta="Dirección de facturación" opcional valor={campos.direccionFactura} error={errores.direccionFactura} alCambiar={cambiar("direccionFactura")} />
                </div>
              </div>
            )}
          </fieldset>
        </div>

        <aside className="rounded-marco border border-linea bg-panel p-6 lg:sticky lg:top-24">
          <h2 className="mb-4 text-xl">Tu pedido</h2>

          {/* Qué se está comprando, con la condición delante: es donde la
              persona confirma que openbox o reacondicionado es lo que quería. */}
          {cuenta?.lineas.length ? (
            <ul className="mb-4 grid gap-3 border-b border-linea pb-4">
              {cuenta.lineas.map((linea) => (
                <li key={linea.productoId} className="flex justify-between gap-3 text-[13.5px]">
                  <span>
                    {linea.nombre} <span className="text-apagado">× {linea.cantidad}</span>
                    <br />
                    <small className="text-[12px] text-apagado">
                      {linea.condicion ? `Condición: ${linea.condicion.toLowerCase()}` : "Condición por confirmar"}
                      {linea.stockConocido ? "" : " · stock por confirmar"}
                    </small>
                  </span>
                  <b className="tabular-nums">{clp(linea.precio * linea.cantidad)}</b>
                </li>
              ))}
            </ul>
          ) : null}

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
            <b>
              {cuenta?.totales.envio === null ? "por confirmar" : cuenta?.totales.envio ? clp(cuenta.totales.envio) : "sin costo"}
              {cuenta?.envio.diasEstimados ? (
                <span className="block text-[12px] font-normal text-apagado">
                  {cuenta.envio.diasEstimados} día{cuenta.envio.diasEstimados === 1 ? "" : "s"} hábil
                  {cuenta.envio.diasEstimados === 1 ? "" : "es"}
                </span>
              ) : null}
            </b>
          </div>
          <div className="mt-3 flex justify-between border-t border-linea pt-3 text-lg font-semibold">
            <span>Total</span>
            <b>{cuenta?.totales.envio === null ? `${clp(cuenta.totales.total)} + despacho` : clp(cuenta?.totales.total ?? 0)}</b>
          </div>
          {cuenta?.envio.nota && <p className="mt-2 text-[12.5px] text-apagado">{cuenta.envio.nota}</p>}

          <div className="mt-4">
            <input
              className="h-10 w-full rounded-xl border border-linea-fuerte bg-white/5 px-3 text-sm"
              placeholder="Cupón"
              value={campos.cupon}
              onChange={cambiar("cupon")}
              aria-label="Cupón"
            />
          </div>

          {metodosPago.length > 1 && (
            <div className="mt-4">
              <p className="mb-2 text-[13px] font-medium text-tinta-2">Método de pago</p>
              <div className="grid gap-2">
                {metodosPago.map((m) => {
                  const info = ETIQUETAS[m];
                  const activo = metodoPago === m;
                  return (
                    <label
                      key={m}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors ${
                        activo ? "border-azul bg-azul/10" : "border-linea-fuerte hover:border-azul/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="metodoPago"
                        className="accent-azul"
                        checked={activo}
                        onChange={() => setMetodoPago(m)}
                      />
                      <img
                        src={info.logo}
                        alt={info.titulo}
                        className="h-6 w-auto object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <span>
                        <b className="block text-[14px]">{info.titulo}</b>
                        <small className="text-[12px] text-apagado">{info.subtitulo}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
              {errores.metodoPago && (
                <span className="mt-1 block text-[12.5px] text-rojo">{errores.metodoPago}</span>
              )}
            </div>
          )}

          {avisoNoCobro && (
            <p className="mt-4 rounded-xl border border-ambar/40 bg-ambar/10 p-3 text-[13.5px] text-[#F0C27A]">{avisoNoCobro}</p>
          )}
          {/* `role="alert"` para que un lector de pantalla lo anuncie: es un
              error que obliga a hacer algo antes de seguir, no un adorno. */}
          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-rojo/40 bg-rojo/10 p-3 text-[13.5px]">
              {error}
            </p>
          )}

          <Boton ancho type="submit" className="mt-5" disabled={enviando}>
            {enviando ? "Procesando…" : puedeCobrar ? "Ir a pagar" : "Reservar mi pedido"}
          </Boton>

          <p className="mt-3 text-[12px] text-apagado">
            Precios con IVA incluido. Emitimos boleta o factura a tu nombre.
          </p>
        </aside>
      </form>
    </>
  );
}
