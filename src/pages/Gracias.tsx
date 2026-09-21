import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCarrito } from "../features/carrito/useCarrito.js";

const TEXTOS: Record<string, [string, string]> = {
  pagado: ["¡Listo! Pago recibido.", "Te llegó el comprobante por correo. Ahora lo preparamos."],
  PENDIENTE_PAGO: ["Tu pedido está anotado.", "Falta el pago. Te mandamos el enlace por correo."],
  POR_CONFIRMAR: ["Tu pedido está anotado.", "Todavía no te cobramos nada: te escribimos con el total cerrado."],
  rechazado: ["El pago no se completó.", "No se te cobró nada. Puedes intentarlo otra vez desde el correo que te mandamos."],
  anulado: ["Anulaste el pago.", "Tu pedido sigue guardado por si quieres retomarlo."],
  revisar: ["Estamos revisando tu pago.", "Nos quedó una confirmación a medias. Te escribimos hoy mismo; no vuelvas a pagar."]
};

export function Gracias() {
  const [parametros] = useSearchParams();
  const { vaciar } = useCarrito();
  const numero = parametros.get("n") ?? "";
  const estado = parametros.get("e") ?? "PENDIENTE_PAGO";
  const [titulo, texto] = TEXTOS[estado] ?? TEXTOS.PENDIENTE_PAGO!;

  useEffect(() => {
    if (estado === "pagado" || estado === "POR_CONFIRMAR" || estado === "PENDIENTE_PAGO") vaciar();
  }, [estado, vaciar]);

  return (
    <div className="mx-auto max-w-[620px] py-16">
      <h1 className="mb-3 text-4xl">{titulo}</h1>
      <p className="text-lg text-tinta-2">{texto}</p>
      {numero && (
        <p className="mt-6">
          Número de pedido: <b className="tabular-nums">{numero}</b>
        </p>
      )}
      <p className="mt-2 text-sm text-apagado">Guarda ese número: con él y tu correo puedes ver el estado cuando quieras.</p>
      <div className="mt-8 flex gap-3">
        <Link className="rounded-full bg-azul px-6 py-3 font-semibold text-white" to="/seguimiento">
          Ver el estado
        </Link>
        <Link className="rounded-full border border-linea-fuerte px-6 py-3 font-semibold" to="/tienda">
          Seguir mirando
        </Link>
      </div>
    </div>
  );
}
