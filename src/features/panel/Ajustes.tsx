/**
 * Los ajustes del negocio.
 *
 * Lo que convierte esta pantalla en algo útil y no en un formulario más es la
 * columna «si lo dejas vacío»: cada ajuste dice **qué pasa exactamente** si no
 * se pone. No «se usa un valor por defecto» —que es lo que dicen todos los
 * paneles y no significa nada— sino «no se cobra despacho y el pedido queda
 * por confirmar».
 *
 * Aquí no hay ni un secreto. Las credenciales de pago y las claves siguen en
 * el entorno del servidor, y eso está escrito en pantalla para que nadie las
 * busque aquí ni las pegue por error.
 */
import { useEffect, useMemo, useState } from "react";
import { panel } from "../../services/api.js";
import type { AjusteNegocio } from "../../services/tipos.js";
import { Boton } from "../../components/ui/Boton.js";

const ORIGEN: Record<string, { texto: string; clase: string }> = {
  panel: { texto: "puesto aquí", clase: "text-verde" },
  entorno: { texto: "viene del servidor", clase: "text-azul-claro" },
  "vacío": { texto: "sin poner", clase: "text-ambar" }
};

export function Ajustes() {
  const [ajustes, setAjustes] = useState<AjusteNegocio[]>([]);
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    panel
      .ajustes()
      .then((lista) => {
        setAjustes(lista);
        setBorrador(Object.fromEntries(lista.map((a) => [a.clave, a.valor])));
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  const grupos = useMemo(() => {
    const mapa = new Map<string, AjusteNegocio[]>();
    for (const a of ajustes) mapa.set(a.grupo, [...(mapa.get(a.grupo) ?? []), a]);
    return [...mapa.entries()];
  }, [ajustes]);

  const cambiados = useMemo(
    () => ajustes.filter((a) => (borrador[a.clave] ?? "") !== a.valor).map((a) => a.clave),
    [ajustes, borrador]
  );

  async function guardar() {
    if (!cambiados.length) return;
    setGuardando(true);
    setError(null);
    try {
      const lista = await panel.guardarAjustes(Object.fromEntries(cambiados.map((c) => [c, borrador[c] ?? ""])));
      setAjustes(lista);
      setBorrador(Object.fromEntries(lista.map((a) => [a.clave, a.valor])));
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <p className="py-10 text-tinta-2">Cargando los ajustes…</p>;

  return (
    <>
      <p className="mb-6 rounded-xl border border-linea bg-panel p-4 text-[13.5px] text-tinta-2">
        Lo que se cambie aquí se aplica <b>sin volver a publicar la web</b>: en el siguiente pedido, en la siguiente
        cotización y en la siguiente visita a la página legal.
        <br />
        <span className="text-apagado">
          Las credenciales de pago, los secretos y la clave de este panel no están aquí ni pueden estarlo: viven en el
          servidor. Si alguien te pide que pegues una credencial en esta pantalla, no es de fiar.
        </span>
      </p>

      {error && (
        <p className="mb-4 rounded-xl border border-rojo/40 bg-rojo/10 p-3 text-[13.5px] text-rojo" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-8">
        {grupos.map(([grupo, lista]) => (
          <section key={grupo}>
            <h2 className="mb-4 border-b border-linea pb-2 text-[15px] font-semibold">{grupo}</h2>
            <div className="grid gap-5">
              {lista.map((a) => {
                const origen = ORIGEN[a.origen] ?? ORIGEN["vacío"];
                const vacio = (borrador[a.clave] ?? "").trim() === "";
                return (
                  <div key={a.clave} className="grid gap-2 sm:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
                    <div>
                      <label className="block text-[14px] font-medium" htmlFor={`ajuste-${a.clave}`}>
                        {a.etiqueta}
                      </label>
                      <p className="mt-1 text-[12.5px] text-apagado">{a.ayuda}</p>
                      <p className={`mt-1 text-[11.5px] ${origen?.clase}`}>{origen?.texto}</p>
                    </div>
                    <div>
                      {a.tipo === "tabla" ? (
                        <textarea
                          id={`ajuste-${a.clave}`}
                          rows={4}
                          className="w-full rounded-xl border border-linea-fuerte bg-white/5 px-3 py-2.5 font-mono text-[13.5px] leading-relaxed text-tinta placeholder:text-apagado/70 focus:border-azul-claro focus:outline-none"
                          placeholder={a.ejemplo ?? ""}
                          value={borrador[a.clave] ?? ""}
                          onChange={(e) => setBorrador((b) => ({ ...b, [a.clave]: e.target.value }))}
                        />
                      ) : (
                        <input
                          id={`ajuste-${a.clave}`}
                          type={a.tipo === "numero" ? "number" : "text"}
                          min={a.tipo === "numero" ? 0 : undefined}
                          className="h-11 w-full rounded-xl border border-linea-fuerte bg-white/5 px-3 text-[14.5px] text-tinta placeholder:text-apagado/70 focus:border-azul-claro focus:outline-none"
                          placeholder={a.ejemplo ?? ""}
                          value={borrador[a.clave] ?? ""}
                          onChange={(e) => setBorrador((b) => ({ ...b, [a.clave]: e.target.value }))}
                        />
                      )}
                      {vacio && (
                        <p className="mt-1.5 rounded-lg border border-ambar/30 bg-ambar/5 px-2.5 py-1.5 text-[12px] text-ambar">
                          Si lo dejas vacío: {a.siFalta}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="sticky bottom-0 mt-8 flex items-center gap-3 border-t border-linea bg-fondo/95 py-4 backdrop-blur">
        <Boton onClick={() => void guardar()} disabled={guardando || !cambiados.length}>
          {guardando ? "Guardando…" : cambiados.length ? `Guardar ${cambiados.length} cambio(s)` : "Nada que guardar"}
        </Boton>
        {guardado && <span className="text-[13.5px] text-verde">Guardado. Ya está en la web.</span>}
      </div>
    </>
  );
}
