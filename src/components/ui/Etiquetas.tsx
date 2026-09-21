import type { Condicion, EstadoStock, Producto } from "../../services/tipos.js";
import { clp } from "../../services/api.js";

const NOMBRE_CONDICION: Record<Condicion, string> = {
  NUEVO: "Nuevo",
  OPENBOX: "Openbox",
  REACONDICIONADO: "Reacondicionado",
  SEMINUEVO: "Seminuevo",
  USADO: "Usado"
};

/** La condición va antes del precio. Si no consta, se dice. */
export function Condicion({ valor }: { valor: Condicion | null }) {
  const base = "inline-block rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em]";
  if (!valor) {
    return <span className={`${base} border border-dashed border-white/25 text-apagado`}>Condición por confirmar</span>;
  }
  return <span className={`${base} border border-azul-claro/35 bg-azul/12 text-azul-claro`}>{NOMBRE_CONDICION[valor]}</span>;
}

const TEXTO_STOCK: Record<EstadoStock, string> = {
  EN_STOCK: "Disponible",
  LIMITADO: "Stock limitado",
  SIN_EXISTENCIAS: "Sin existencias",
  DESCONOCIDO: "Stock por confirmar"
};

export function Stock({ estado, unidades }: { estado: EstadoStock; unidades: number | null }) {
  const bueno = estado === "EN_STOCK";
  return (
    <p className="flex items-center gap-2 text-[12.5px] text-tinta-2">
      <span
        className={`h-[7px] w-[7px] rounded-full ${bueno ? "bg-verde shadow-[0_0_0_3px_rgba(50,193,115,0.16)]" : "bg-ambar shadow-[0_0_0_3px_rgba(233,169,63,0.16)]"}`}
      />
      {TEXTO_STOCK[estado]}
      {bueno && unidades ? ` · ${unidades} unidades` : ""}
    </p>
  );
}

/** Precio propio, o el de marketplace dicho como lo que es. */
export function Precio({ producto, grande = false }: { producto: Producto; grande?: boolean }) {
  if (producto.seVende && producto.precio.venta) {
    return (
      <p className={`${grande ? "text-3xl" : "text-xl"} font-semibold tracking-[-0.03em]`}>
        {clp(producto.precio.venta)}
        {producto.precio.lista ? (
          <s className="ml-2 text-[13px] font-normal text-apagado">{clp(producto.precio.lista)}</s>
        ) : null}
      </p>
    );
  }

  if (producto.referencia.valor) {
    return (
      <p className="text-[13.5px] text-tinta-2">
        Publicado en {producto.referencia.canal}: <b>{clp(producto.referencia.valor)}</b>
        <br />
        <span className="text-apagado">El precio en econnet.cl está por confirmar.</span>
      </p>
    );
  }
  return <p className="text-[13.5px] text-tinta-2">Precio por confirmar.</p>;
}
