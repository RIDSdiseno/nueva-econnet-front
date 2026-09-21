/**
 * Ver una cotización y el resultado de aceptarla.
 *
 * Aquí aterriza el enlace firmado del correo (`/api/cotizacion/aceptar`), que
 * redirige con `?n=…&estado=…`. Sin firma válida no se acepta nada: por eso
 * esta página no tiene botón de aceptar, solo cuenta qué pasó.
 */
import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { api, ErrorDeApi } from "../services/api.js";
import type { CotizacionGuardada } from "../services/tipos.js";
import { Boton } from "../components/ui/Boton.js";
import { TablaPropuesta } from "../features/empresas/TablaPropuesta.js";

const MENSAJES: Record<string, [string, string]> = {
  aceptada: ["Aceptada. Ya estamos en ello.", "Ventas te escribe hoy para cerrar plazo de entrega y facturación. No hace falta que hagas nada más."],
  "enlace-caducado": ["Ese enlace ya no vale", "Los enlaces de aceptación caducan. Respóndenos al correo de la cotización y la reemitimos."],
  "no existe": ["No encontramos esa cotización", "Revisa el número, o respóndenos al correo que te mandamos."],
  "no es suya": ["Ese enlace no es de esta cotización", "Por seguridad no la aceptamos. Escríbenos y lo resolvemos."],
  archivada: ["Esa cotización está archivada", "Si sigue en pie, escríbenos y la rehacemos con los precios de hoy."]
};

export function CotizacionPagina() {
  const [parametros] = useSearchParams();
  const numeroUrl = parametros.get("n") ?? "";
  const estado = parametros.get("estado");

  const [numero, setNumero] = useState(numeroUrl);
  const [correo, setCorreo] = useState("");
  const [cotizacion, setCotizacion] = useState<CotizacionGuardada | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  const aviso = estado ? (MENSAJES[estado] ?? ["No pudimos completarlo", "Escríbenos y lo resolvemos a mano."]) : null;

  async function buscar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setBuscando(true);
    try {
      setCotizacion(await api.verCotizacion(numero.trim().toUpperCase(), correo.trim()));
    } catch (e) {
      setCotizacion(null);
      setError(e instanceof ErrorDeApi ? e.message : (e as Error).message);
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="mx-auto max-w-[680px] py-10">
      <h1 className="text-4xl">{aviso ? aviso[0] : "Tu cotización"}</h1>
      <p className="mt-3 text-lg text-tinta-2">
        {aviso ? aviso[1] : "Con el número y el correo con el que la pediste."}
      </p>

      {numeroUrl && <p className="mt-4 text-[14px]">Número: <b className="tabular-nums">{numeroUrl}</b></p>}

      <form className="mt-7 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={buscar}>
        <div>
          <label className="mb-1 block text-[13.5px] text-tinta-2" htmlFor="numero">
            Número
          </label>
          <input
            id="numero"
            className="h-12 w-full rounded-xl border border-linea-fuerte bg-white/5 px-4"
            placeholder="COT-2026-00001"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-[13.5px] text-tinta-2" htmlFor="correo">
            Correo
          </label>
          <input
            id="correo"
            type="email"
            className="h-12 w-full rounded-xl border border-linea-fuerte bg-white/5 px-4"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
          />
        </div>
        <div className="flex items-end">
          <Boton type="submit" disabled={buscando}>
            {buscando ? "Buscando…" : "Ver"}
          </Boton>
        </div>
      </form>

      {error && <p className="mt-4 rounded-xl border border-rojo/40 bg-rojo/10 p-4 text-[13.5px]">{error}</p>}

      {cotizacion && (
        <div className="mt-8">
          {cotizacion.caducada && cotizacion.estado !== "ACEPTADA" && (
            <p className="mb-4 rounded-xl border border-ambar/40 bg-ambar/10 p-4 text-[13.5px] text-[#F0C27A]">
              Los precios de esta cotización vencieron. Escríbenos y la rehacemos con los de hoy — puede subir o bajar.
            </p>
          )}
          <TablaPropuesta
            propuesta={cotizacion.propuesta}
            numero={cotizacion.numero}
            validaHasta={cotizacion.validaHasta}
          />
        </div>
      )}
    </div>
  );
}
