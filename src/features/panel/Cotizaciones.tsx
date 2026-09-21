/**
 * Las cotizaciones de empresa.
 *
 * Es la pata que más ticket trae y la única que vuelve a comprar, así que lo
 * que manda en esta pantalla es **cuáles están vivas y a cuál le toca algo**.
 * Marcarla como ganada o perdida no es burocracia: para el seguimiento, y
 * seguir persiguiendo a quien ya dijo que no es la forma más rápida de
 * perderlo del todo.
 */
import { useCallback, useEffect, useState } from "react";
import { clp, panel } from "../../services/api.js";
import type { CotizacionPanel } from "../../services/tipos.js";
import { Boton } from "../../components/ui/Boton.js";

const NOMBRE: Record<string, string> = {
  ENVIADA: "Enviada",
  VISTA: "Vista",
  ACEPTADA: "Aceptada",
  PERDIDA: "Perdida",
  CADUCADA: "Caducada"
};

const COLOR: Record<string, string> = {
  ENVIADA: "text-azul-claro",
  VISTA: "text-ambar",
  ACEPTADA: "text-verde",
  PERDIDA: "text-rojo",
  CADUCADA: "text-apagado"
};

/** Las vivas: a estas se les puede cambiar el final. */
const VIVAS = ["ENVIADA", "VISTA"];

const dia = (iso: string) => new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });

const diasPara = (iso: string): number => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);

export function Cotizaciones() {
  const [cotizaciones, setCotizaciones] = useState<CotizacionPanel[]>([]);
  const [cuentas, setCuentas] = useState<Record<string, number>>({});
  const [estado, setEstado] = useState("");
  const [busca, setBusca] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const traer = useCallback(() => {
    setCargando(true);
    panel
      .cotizaciones({ estado: estado || undefined, q: busca.trim() || undefined })
      .then((r) => {
        setCotizaciones(r.cotizaciones);
        setCuentas(r.cuentas);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setCargando(false));
  }, [estado, busca]);

  useEffect(() => {
    const reloj = setTimeout(traer, busca ? 300 : 0);
    return () => clearTimeout(reloj);
  }, [traer, busca]);

  async function mover(numero: string, nuevo: string) {
    setError(null);
    try {
      await panel.moverCotizacion(numero, nuevo);
      traer();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const vivas = (cuentas.ENVIADA ?? 0) + (cuentas.VISTA ?? 0);
  const valorVivo = cotizaciones.filter((c) => VIVAS.includes(c.estado)).reduce((s, c) => s + c.totales.total, 0);

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-linea bg-white/[0.025] px-4 py-3">
          <div className="text-[11.5px] uppercase tracking-[0.08em] text-apagado">Vivas</div>
          <div className="mt-1 text-[22px] tabular-nums">{vivas}</div>
        </div>
        <div className="rounded-xl border border-linea bg-white/[0.025] px-4 py-3">
          <div className="text-[11.5px] uppercase tracking-[0.08em] text-apagado">En juego</div>
          <div className="mt-1 text-[22px] tabular-nums">{valorVivo > 0 ? clp(valorVivo) : "—"}</div>
          <div className="text-[11.5px] text-apagado">suma de las que siguen abiertas</div>
        </div>
        <div className="rounded-xl border border-linea bg-white/[0.025] px-4 py-3">
          <div className="text-[11.5px] uppercase tracking-[0.08em] text-apagado">Ganadas</div>
          <div className="mt-1 text-[22px] tabular-nums">{cuentas.ACEPTADA ?? 0}</div>
          <div className="text-[11.5px] text-apagado">{cuentas.PERDIDA ?? 0} perdidas</div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="h-11 min-w-[240px] flex-1 rounded-xl border border-linea-fuerte bg-white/5 px-3 text-[14.5px] focus:border-azul-claro focus:outline-none"
          placeholder="Buscar por número, empresa o correo"
          value={busca}
          aria-label="Buscar cotizaciones"
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

      {error && (
        <p className="mb-4 rounded-xl border border-rojo/40 bg-rojo/10 p-3 text-[13.5px] text-rojo" role="alert">
          {error}
        </p>
      )}

      <p className="mb-2 text-[12.5px] text-apagado" aria-live="polite">
        {cotizaciones.length} cotización{cotizaciones.length === 1 ? "" : "es"}
        {cargando ? " · actualizando…" : ""}
      </p>

      {cotizaciones.length === 0 && !cargando ? (
        <p className="rounded-marco border border-linea bg-panel px-5 py-10 text-center text-tinta-2">
          Ninguna cotización con ese filtro.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-marco border border-linea bg-panel">
          <table className="w-full min-w-[820px] text-[14px]">
            <thead>
              <tr className="border-b border-linea text-left text-[12px] uppercase tracking-[0.08em] text-apagado">
                <th className="px-3 py-3">Número</th>
                <th className="px-3 py-3">Empresa</th>
                <th className="px-3 py-3 text-right">Equipos</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Validez</th>
                <th className="px-3 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {cotizaciones.map((c) => {
                const quedan = diasPara(c.validaHasta);
                return (
                  <tr key={c.numero} className="border-b border-linea last:border-0">
                    <td className="px-3 py-3 tabular-nums">{c.numero}</td>
                    <td className="px-3 py-3">
                      <div>{c.empresa ?? c.nombre ?? "—"}</div>
                      <div className="text-[12px] text-apagado">{c.correo}</div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{c.equipos}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{clp(c.totales.total)}</td>
                    <td className={`px-3 py-3 ${COLOR[c.estado]}`}>
                      {NOMBRE[c.estado]}
                      {c.seguimiento > 0 && VIVAS.includes(c.estado) && (
                        <div className="text-[11.5px] text-apagado">{c.seguimiento} recordatorio(s)</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[13px]">
                      {VIVAS.includes(c.estado) && quedan <= 3 && quedan >= 0 ? (
                        <span className="text-ambar">caduca en {quedan} día(s)</span>
                      ) : (
                        <span className="text-apagado">{dia(c.validaHasta)}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {VIVAS.includes(c.estado) ? (
                        <div className="flex justify-end gap-2">
                          <Boton tamano="pequeno" onClick={() => void mover(c.numero, "ACEPTADA")}>
                            Ganada
                          </Boton>
                          <Boton tamano="pequeno" tono="fantasma" onClick={() => void mover(c.numero, "PERDIDA")}>
                            Perdida
                          </Boton>
                        </div>
                      ) : (
                        <span className="block text-right text-[12.5px] text-apagado">cerrada</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
