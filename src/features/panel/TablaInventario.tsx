/**
 * La tabla del inventario.
 *
 * Lo que se cambia todos los días —precio y unidades— se edita en la propia
 * fila: dos clics, no un formulario de treinta campos. Lo demás vive en la
 * ficha completa. El precio se guarda al salir del campo o con Enter, y solo
 * si de verdad cambió.
 */
import { useEffect, useState } from "react";
import { clp } from "../../services/api.js";
import type { FilaInventario } from "../../services/tipos.js";
import { Hueco } from "./campos.js";

const CELDA = "px-3 py-3 align-middle";
const MINI =
  "h-9 w-28 rounded-lg border border-linea-fuerte bg-white/5 px-2 text-right text-[14px] tabular-nums text-tinta focus:border-azul-claro focus:outline-none";

const COLOR_ESTADO: Record<string, string> = {
  EN_STOCK: "text-verde",
  LIMITADO: "text-ambar",
  SIN_EXISTENCIAS: "text-rojo",
  DESCONOCIDO: "text-apagado"
};

const TEXTO_ESTADO: Record<string, string> = {
  EN_STOCK: "En stock",
  LIMITADO: "Quedan pocas",
  SIN_EXISTENCIAS: "Agotado",
  DESCONOCIDO: "Sin contar"
};

/**
 * Un número editable que distingue el vacío del cero. El valor vive como
 * texto mientras se escribe; al salir se manda `null` si quedó en blanco.
 */
function Editable({
  valor,
  guardar,
  etiqueta,
  comoPesos = false
}: {
  valor: number | null;
  guardar: (v: number | null) => Promise<void>;
  etiqueta: string;
  /** Enseña debajo el número con puntos: un cero de más se ve, en crudo no. */
  comoPesos?: boolean;
}) {
  const [texto, setTexto] = useState(valor === null ? "" : String(valor));
  const [guardando, setGuardando] = useState(false);

  /* Si el servidor devuelve otra cosa (o alguien edita en otra pestaña), la
     celda se pone al día en vez de quedarse con lo que se tecleó. */
  useEffect(() => {
    setTexto(valor === null ? "" : String(valor));
  }, [valor]);

  const soltar = async () => {
    const limpio = texto.trim();
    const nuevo = limpio === "" ? null : Number(limpio);
    if (nuevo !== null && (!Number.isFinite(nuevo) || nuevo < 0)) {
      setTexto(valor === null ? "" : String(valor));
      return;
    }
    if (nuevo === valor) return;
    setGuardando(true);
    try {
      await guardar(nuevo);
    } finally {
      setGuardando(false);
    }
  };

  const leible = comoPesos && texto.trim() !== "" && Number.isFinite(Number(texto)) ? clp(Number(texto)) : null;

  return (
    <span className="inline-block">
      <input
        className={MINI}
        value={texto}
        aria-label={etiqueta}
        inputMode="numeric"
        placeholder="no consta"
        disabled={guardando}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => void soltar()}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setTexto(valor === null ? "" : String(valor));
        }}
      />
      {leible && <span className="mt-0.5 block text-right text-[11.5px] tabular-nums text-apagado">{leible}</span>}
    </span>
  );
}

export function TablaInventario({
  productos,
  abrir,
  guardarPrecio,
  guardarStock
}: {
  productos: FilaInventario[];
  abrir: (p: FilaInventario) => void;
  guardarPrecio: (id: string, v: number | null) => Promise<void>;
  guardarStock: (id: string, v: number | null) => Promise<void>;
}) {
  if (!productos.length) {
    return (
      <p className="rounded-marco border border-linea bg-panel px-5 py-10 text-center text-tinta-2">
        Ningún equipo cumple ese filtro.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-marco border border-linea bg-panel">
      <table className="w-full min-w-[860px] text-[14px]">
        <thead>
          <tr className="border-b border-linea text-left text-[12px] uppercase tracking-[0.08em] text-apagado">
            <th className={CELDA}>Equipo</th>
            <th className={CELDA}>Precio de venta</th>
            <th className={CELDA}>Margen</th>
            <th className={CELDA}>Unidades</th>
            <th className={CELDA}>Estado</th>
            <th className={CELDA}>Qué le falta</th>
            <th className={CELDA}>
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p) => (
            <tr
              key={p.id}
              className={`border-b border-linea last:border-0 ${p.archivado ? "opacity-55" : ""}`}
            >
              <td className={CELDA}>
                <div className="flex items-center gap-2">
                  <span className="h-8 w-1 rounded-full" style={{ background: p.color }} aria-hidden="true" />
                  <div>
                    <div className="font-medium">
                      {p.marca} {p.nombre}
                    </div>
                    <div className="text-[12px] text-apagado">
                      {p.categoria}
                      {p.sku ? ` · SKU ${p.sku}` : " · sin SKU"}
                      {p.archivado ? " · retirado" : ""}
                    </div>
                  </div>
                </div>
              </td>

              <td className={CELDA}>
                <Editable
                  valor={p.precioVenta}
                  etiqueta={`Precio de ${p.marca} ${p.nombre}`}
                  guardar={(v) => guardarPrecio(p.id, v)}
                  comoPesos
                />
                {!p.seVende && <div className="mt-1 text-[11.5px] text-apagado">sin precio no se vende en línea</div>}
              </td>

              <td className={CELDA}>
                {p.margen.porcentaje === null ? (
                  <span className="text-[12.5px] text-apagado" title={`Falta: ${p.margen.falta.join(" y ")}`}>
                    sin {p.margen.falta.includes("coste de compra") ? "coste" : "precio"}
                  </span>
                ) : (
                  <span className={p.margen.porcentaje < 8 ? "text-rojo" : p.margen.porcentaje < 15 ? "text-ambar" : "text-verde"}>
                    <span className="tabular-nums">{p.margen.porcentaje}%</span>
                    <span className="block text-[11.5px] text-apagado tabular-nums">{clp(p.margen.pesos)}</span>
                  </span>
                )}
              </td>

              <td className={CELDA}>
                <Editable
                  valor={p.stockUnidades}
                  etiqueta={`Unidades de ${p.marca} ${p.nombre}`}
                  guardar={(v) => guardarStock(p.id, v)}
                />
                {p.reservadas > 0 && (
                  <div className="mt-1 text-[11.5px] text-ambar">
                    {p.reservadas} reservada{p.reservadas === 1 ? "" : "s"} · quedan {p.disponibles}
                  </div>
                )}
              </td>

              <td className={`${CELDA} ${COLOR_ESTADO[p.stockEstado]}`}>{TEXTO_ESTADO[p.stockEstado]}</td>

              <td className={CELDA}>
                {p.publicable.ok ? (
                  <span className="text-[12.5px] text-verde">Nada: listo para vender</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {p.publicable.faltas.map((f) => (
                      <Hueco key={f} texto={f.replace(/^sin /, "")} />
                    ))}
                  </div>
                )}
              </td>

              <td className={`${CELDA} text-right`}>
                <button
                  type="button"
                  onClick={() => abrir(p)}
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
  );
}
