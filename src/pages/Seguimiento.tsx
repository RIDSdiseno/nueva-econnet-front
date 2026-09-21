import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { api, clp } from "../services/api.js";
import type { Seguimiento } from "../services/tipos.js";
import { Boton } from "../components/ui/Boton.js";

export function SeguimientoPagina() {
  const [parametros] = useSearchParams();
  const token = parametros.get("t");
  const [numero, setNumero] = useState(parametros.get("n") ?? "");
  const [correo, setCorreo] = useState("");
  const [pedido, setPedido] = useState<Seguimiento | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  /* Con el enlace firmado del correo, el pedido se abre solo. */
  useEffect(() => {
    if (!token) return;
    let vivo = true;
    setBuscando(true);
    api
      .seguimientoFirmado(token)
      .then((p) => vivo && setPedido(p))
      .catch((e: Error) => vivo && setError(e.message))
      .finally(() => vivo && setBuscando(false));
    return () => {
      vivo = false;
    };
  }, [token]);

  async function buscar(evento: FormEvent) {
    evento.preventDefault();
    setBuscando(true);
    setError(null);
    setPedido(null);
    try {
      setPedido(await api.seguimiento(numero.trim().toUpperCase(), correo.trim()));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="max-w-[560px]">
      <h1 className="mb-2 text-4xl">Seguir mi pedido</h1>
      <p className="text-tinta-2">Con el número que te llegó por correo y el correo con el que compraste.</p>

      <form className="mt-6" onSubmit={buscar}>
        <label className="mb-1 block text-[13.5px] text-tinta-2" htmlFor="numero">
          Número de pedido
        </label>
        <input
          id="numero"
          className="mb-4 h-12 w-full rounded-xl border border-linea-fuerte bg-white/5 px-4"
          placeholder="ECN-2026-00001"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          required
        />

        <label className="mb-1 block text-[13.5px] text-tinta-2" htmlFor="correo">
          Correo de la compra
        </label>
        <input
          id="correo"
          type="email"
          className="mb-5 h-12 w-full rounded-xl border border-linea-fuerte bg-white/5 px-4"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
        />

        <Boton type="submit" disabled={buscando}>
          {buscando ? "Buscando…" : "Ver el estado"}
        </Boton>
      </form>

      {error && <p className="mt-6 rounded-xl border border-rojo/40 bg-rojo/10 p-4 text-sm">{error}</p>}

      {pedido && (
        <section className="mt-6 rounded-marco border border-linea bg-panel p-6">
          <p className="text-[13px] uppercase tracking-[0.14em] text-azul-claro">Pedido {pedido.numero}</p>
          <h2 className="mt-2 text-2xl">{pedido.estado.replace(/_/g, " ").toLowerCase()}</h2>
          <ul className="mt-4 grid gap-1 text-[14.5px] text-tinta-2">
            {pedido.items.map((i) => (
              <li key={i.nombre}>
                {i.nombre} × {i.cantidad}
              </li>
            ))}
          </ul>
          <p className="mt-4">
            <b>Total:</b>{" "}
            {pedido.totales.envio === null ? `${clp(pedido.totales.total)} + despacho por confirmar` : clp(pedido.totales.total)}
          </p>
          {(pedido.porConfirmar.stock || pedido.porConfirmar.envio) && (
            <p className="mt-3 rounded-xl border border-ambar/40 bg-ambar/10 p-3 text-[13.5px] text-[#F0C27A]">
              Todavía no te cobramos: falta confirmar {pedido.porConfirmar.stock ? "el stock" : ""}
              {pedido.porConfirmar.stock && pedido.porConfirmar.envio ? " y " : ""}
              {pedido.porConfirmar.envio ? "el despacho" : ""}.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
