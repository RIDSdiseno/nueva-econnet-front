/**
 * Los pedidos.
 *
 * Lo que hace útil esta pantalla no es la lista: es que **el cambio de estado
 * pasa por la misma máquina de estados que el resto del sistema**. Los botones
 * que se ven son los estados a los que de verdad se puede ir desde donde está
 * el pedido; no hay un desplegable con los nueve, porque un desplegable con
 * los nueve invita a poner «Entregado» en algo que nadie ha pagado.
 */
import { useCallback, useEffect, useState } from "react";
import { clp, panel } from "../../services/api.js";
import type { EventoPedido, PedidoPanel } from "../../services/tipos.js";
import { Boton } from "../../components/ui/Boton.js";

const COLOR: Record<string, string> = {
  POR_CONFIRMAR: "text-apagado",
  PENDIENTE_PAGO: "text-ambar",
  PAGADO: "text-verde",
  PREPARANDO: "text-azul-claro",
  DESPACHADO: "text-azul-claro",
  ENTREGADO: "text-verde",
  ANULADO: "text-rojo",
  DEVUELTO: "text-rojo",
  REVISAR: "text-ambar"
};

const NOMBRE: Record<string, string> = {
  POR_CONFIRMAR: "Por confirmar",
  PENDIENTE_PAGO: "Esperando pago",
  PAGADO: "Pagado",
  PREPARANDO: "Preparando",
  DESPACHADO: "Despachado",
  ENTREGADO: "Entregado",
  ANULADO: "Anulado",
  DEVUELTO: "Devuelto",
  REVISAR: "Revisar a mano"
};

const fecha = (iso: string) => new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });

function Ficha({ numero, cerrar, recargar }: { numero: string; cerrar: () => void; recargar: () => void }) {
  const [pedido, setPedido] = useState<PedidoPanel | null>(null);
  const [eventos, setEventos] = useState<EventoPedido[]>([]);
  const [siguientes, setSiguientes] = useState<string[]>([]);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [moviendo, setMoviendo] = useState(false);

  const traer = useCallback(() => {
    panel
      .pedido(numero)
      .then((r) => {
        setPedido(r.pedido);
        setEventos(r.eventos);
        setSiguientes(r.siguientes);
      })
      .catch((e: Error) => setError(e.message));
  }, [numero]);

  useEffect(traer, [traer]);

  async function mover(estado: string) {
    setMoviendo(true);
    setError(null);
    try {
      await panel.moverPedido(numero, estado, nota.trim() || undefined);
      setNota("");
      traer();
      recargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMoviendo(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" role="dialog" aria-modal="true" aria-label={`Pedido ${numero}`}>
      <button type="button" className="flex-1 cursor-default" onClick={cerrar} aria-label="Cerrar" />
      <div className="h-full w-full max-w-[640px] overflow-y-auto border-l border-linea bg-fondo-2 p-6 sm:p-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl tabular-nums">{numero}</h2>
            {pedido && (
              <p className={`mt-1 text-[14px] ${COLOR[pedido.estado]}`}>
                {NOMBRE[pedido.estado]} · {fecha(pedido.creado)}
              </p>
            )}
          </div>
          <button type="button" onClick={cerrar} className="text-2xl leading-none text-apagado hover:text-tinta" aria-label="Cerrar">
            ×
          </button>
        </div>

        {!pedido ? (
          <p className="text-tinta-2">Cargando…</p>
        ) : (
          <div className="grid gap-6">
            <section>
              <h3 className="mb-2 text-[15px] font-semibold">Quién</h3>
              <p className="text-[14px] text-tinta-2">
                {pedido.cliente.nombre} · {pedido.cliente.correo}
                {pedido.cliente.telefono ? ` · ${pedido.cliente.telefono}` : ""}
              </p>
              {pedido.documento === "FACTURA" && (
                <p className="mt-1 text-[13px] text-tinta-2">
                  Factura a {pedido.cliente.razonSocial ?? "—"} · RUT {pedido.cliente.rut ?? "—"}
                </p>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-[15px] font-semibold">Qué lleva</h3>
              <table className="w-full text-[14px]">
                <tbody>
                  {pedido.items.map((i) => (
                    <tr key={i.productoId} className="border-b border-linea">
                      <td className="py-2">
                        {i.nombre}
                        {i.condicion && <span className="ml-2 text-[12px] text-apagado">{i.condicion.toLowerCase()}</span>}
                      </td>
                      <td className="py-2 text-right tabular-nums">×{i.cantidad}</td>
                      <td className="py-2 text-right tabular-nums">{clp(i.precio * i.cantidad)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[13.5px]">
                <dt className="text-apagado">Neto</dt>
                <dd className="text-right tabular-nums">{clp(pedido.totales.neto)}</dd>
                <dt className="text-apagado">IVA</dt>
                <dd className="text-right tabular-nums">{clp(pedido.totales.iva)}</dd>
                <dt className="text-apagado">Despacho</dt>
                <dd className="text-right tabular-nums">
                  {pedido.totales.envio === null ? "por confirmar" : clp(pedido.totales.envio)}
                </dd>
                <dt className="font-semibold">Total</dt>
                <dd className="text-right font-semibold tabular-nums">{clp(pedido.totales.total)}</dd>
              </dl>
            </section>

            <section>
              <h3 className="mb-2 text-[15px] font-semibold">A dónde</h3>
              <p className="text-[14px] text-tinta-2">
                {pedido.despacho.modo === "RETIRO"
                  ? "Retiro en tienda"
                  : [pedido.despacho.direccion, pedido.despacho.comuna, pedido.despacho.region].filter(Boolean).join(", ") ||
                    "dirección por confirmar"}
              </p>
              {pedido.despacho.notas && <p className="mt-1 text-[13px] text-apagado">«{pedido.despacho.notas}»</p>}
            </section>

            <section>
              <h3 className="mb-2 text-[15px] font-semibold">Pago</h3>
              <p className="text-[14px] text-tinta-2">
                {pedido.pago.metodo ?? "sin método"} · {pedido.pago.estado ?? "sin estado"}
                {pedido.pago.monto !== null ? ` · ${clp(pedido.pago.monto)}` : ""}
              </p>
              {pedido.pago.referencia && (
                <p className="mt-1 text-[12.5px] text-apagado">Referencia {pedido.pago.referencia}</p>
              )}
              <p className="mt-2 text-[12.5px] text-apagado">
                Stock {pedido.stock.estado.toLowerCase()}
                {pedido.terminosEn ? ` · condiciones aceptadas el ${fecha(pedido.terminosEn)}` : " · sin fecha de aceptación"}
              </p>
            </section>

            <section className="border-t border-linea pt-5">
              <h3 className="text-[15px] font-semibold">Mover el pedido</h3>
              <p className="mb-3 mt-1 text-[12.5px] text-apagado">
                Solo salen los estados a los que se puede ir desde donde está. Lo demás lo impide la máquina de estados,
                no esta pantalla.
              </p>

              <input
                className="mb-3 h-10 w-full rounded-xl border border-linea-fuerte bg-white/5 px-3 text-[14px] focus:border-azul-claro focus:outline-none"
                placeholder="Nota (opcional): queda en el historial"
                value={nota}
                aria-label="Nota del cambio"
                onChange={(e) => setNota(e.target.value)}
              />

              <div className="flex flex-wrap gap-2">
                {siguientes.length === 0 && (
                  <p className="text-[13.5px] text-apagado">Este pedido está cerrado: ya no se mueve a ningún sitio.</p>
                )}
                {siguientes.map((estado) => (
                  <Boton key={estado} tamano="pequeno" tono="fantasma" disabled={moviendo} onClick={() => void mover(estado)}>
                    {NOMBRE[estado] ?? estado}
                  </Boton>
                ))}
              </div>

              {error && (
                <p className="mt-3 rounded-xl border border-rojo/40 bg-rojo/10 p-3 text-[13.5px] text-rojo" role="alert">
                  {error}
                </p>
              )}
            </section>

            <section className="border-t border-linea pt-5">
              <h3 className="mb-3 text-[15px] font-semibold">Qué ha pasado</h3>
              <ul className="grid gap-2 text-[13px]">
                {eventos.map((e, i) => (
                  <li key={`${e.fecha}-${i}`} className="flex flex-wrap gap-x-2 border-b border-linea pb-2 last:border-0">
                    <span className="text-apagado tabular-nums">{fecha(e.fecha)}</span>
                    <span className={COLOR[e.estado]}>{NOMBRE[e.estado] ?? e.estado}</span>
                    {e.nota && <span className="text-tinta-2">· {e.nota}</span>}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export function Pedidos() {
  const [pedidos, setPedidos] = useState<PedidoPanel[]>([]);
  const [cuentas, setCuentas] = useState<Record<string, number>>({});
  const [estado, setEstado] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const traer = useCallback(() => {
    setCargando(true);
    panel
      .pedidos({ estado: estado || undefined, q: busca.trim() || undefined })
      .then((r) => {
        setPedidos(r.pedidos);
        setCuentas(r.cuentas);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setCargando(false));
  }, [estado, busca]);

  /* Se espera a que pare de teclear: un pedido por letra es una petición por letra. */
  useEffect(() => {
    const reloj = setTimeout(traer, busca ? 300 : 0);
    return () => clearTimeout(reloj);
  }, [traer, busca]);

  const pendientes = (cuentas.PENDIENTE_PAGO ?? 0) + (cuentas.REVISAR ?? 0);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="h-11 min-w-[240px] flex-1 rounded-xl border border-linea-fuerte bg-white/5 px-3 text-[14.5px] focus:border-azul-claro focus:outline-none"
          placeholder="Buscar por número, nombre, correo o RUT"
          value={busca}
          aria-label="Buscar pedidos"
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          className="h-11 rounded-xl border border-linea-fuerte bg-white/5 px-3 text-[14.5px] focus:border-azul-claro focus:outline-none"
          value={estado}
          aria-label="Filtrar por estado"
          onChange={(e) => setEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {Object.keys(NOMBRE).map((e) => (
            <option key={e} value={e}>
              {NOMBRE[e]} {cuentas[e] ? `(${cuentas[e]})` : ""}
            </option>
          ))}
        </select>
      </div>

      {pendientes > 0 && (
        <p className="mb-4 rounded-xl border border-ambar/40 bg-ambar/10 p-3 text-[13.5px] text-ambar">
          {pendientes} pedido{pendientes === 1 ? "" : "s"} esperando algo tuyo: pago sin confirmar o revisión a mano.
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-xl border border-rojo/40 bg-rojo/10 p-3 text-[13.5px] text-rojo" role="alert">
          {error}
        </p>
      )}

      <p className="mb-2 text-[12.5px] text-apagado" aria-live="polite">
        {pedidos.length} pedido{pedidos.length === 1 ? "" : "s"}
        {cargando ? " · actualizando…" : ""}
      </p>

      {pedidos.length === 0 && !cargando ? (
        <p className="rounded-marco border border-linea bg-panel px-5 py-10 text-center text-tinta-2">
          Ningún pedido con ese filtro.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-marco border border-linea bg-panel">
          <table className="w-full min-w-[760px] text-[14px]">
            <thead>
              <tr className="border-b border-linea text-left text-[12px] uppercase tracking-[0.08em] text-apagado">
                <th className="px-3 py-3">Número</th>
                <th className="px-3 py-3">Cliente</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3">Cuándo</th>
                <th className="px-3 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.numero} className="border-b border-linea last:border-0">
                  <td className="px-3 py-3 tabular-nums">{p.numero}</td>
                  <td className="px-3 py-3">
                    <div>{p.cliente.nombre}</div>
                    <div className="text-[12px] text-apagado">{p.cliente.correo}</div>
                  </td>
                  <td className={`px-3 py-3 ${COLOR[p.estado]}`}>{NOMBRE[p.estado]}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{clp(p.totales.total)}</td>
                  <td className="px-3 py-3 text-[13px] text-apagado">{fecha(p.creado)}</td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setAbierto(p.numero)}
                      className="rounded-full border border-linea-fuerte px-3 py-1.5 text-[13px] hover:border-white/30"
                    >
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {abierto && <Ficha numero={abierto} cerrar={() => setAbierto(null)} recargar={traer} />}
    </>
  );
}
