/**
 * Importar el catálogo desde un CSV.
 *
 * La pantalla está construida alrededor de una idea: **primero se ve qué va a
 * pasar, y luego se aplica**. El ensayo no es una casilla que haya que
 * acordarse de marcar — es lo que ocurre al soltar el fichero. Aplicar es un
 * segundo botón, y solo aparece cuando hay algo que aplicar.
 *
 * Es la diferencia entre importar y pisar un catálogo vivo sin querer.
 */
import { useRef, useState } from "react";
import { panel } from "../../services/api.js";
import type { InformeImportacion } from "../../services/tipos.js";
import { Boton } from "../../components/ui/Boton.js";

const COLOR: Record<string, string> = {
  alta: "text-verde",
  cambio: "text-azul-claro",
  igual: "text-apagado",
  error: "text-rojo"
};

const ETIQUETA: Record<string, string> = {
  alta: "nuevo",
  cambio: "cambia",
  igual: "igual",
  error: "error"
};

export function Importar({ alTerminar }: { alTerminar: () => void }) {
  const [csv, setCsv] = useState("");
  const [nombre, setNombre] = useState("");
  const [informe, setInforme] = useState<InformeImportacion | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [aplicado, setAplicado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  async function ensayar(texto: string) {
    setTrabajando(true);
    setError(null);
    setAplicado(false);
    try {
      setInforme(await panel.importar(texto, false));
    } catch (e) {
      setError((e as Error).message);
      setInforme(null);
    } finally {
      setTrabajando(false);
    }
  }

  async function aplicar() {
    setTrabajando(true);
    setError(null);
    try {
      setInforme(await panel.importar(csv, true));
      setAplicado(true);
      alTerminar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTrabajando(false);
    }
  }

  function leerFichero(fichero: File) {
    const lector = new FileReader();
    lector.onload = () => {
      const texto = String(lector.result ?? "");
      setCsv(texto);
      setNombre(fichero.name);
      void ensayar(texto);
    };
    lector.readAsText(fichero, "utf-8");
  }

  return (
    <>
      <div className="rounded-marco border border-linea bg-panel p-6">
        <h2 className="text-[17px] font-semibold">Traer el catálogo desde un CSV</h2>
        <p className="mt-2 text-[13.5px] text-tinta-2">
          Vale la exportación de WooCommerce o cualquier hoja con cabecera. Se reconocen las columnas por su nombre en
          castellano o en inglés: <code>sku</code>, <code>marca</code>, <code>nombre</code>, <code>categoría</code>,{" "}
          <code>precio</code>, <code>costo</code>, <code>stock</code>, <code>condición</code>, <code>imagen</code>…
        </p>
        <p className="mt-2 text-[13px] text-apagado">
          Al soltar el fichero <b>no se importa nada</b>: se enseña qué pasaría. Aplicar es el segundo botón.
        </p>
        <p className="mt-2 text-[13px] text-ambar">
          Una celda vacía entra como «no consta», nunca como cero. Y una columna que no venga no borra lo que ya había.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <input
            ref={entrada}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            aria-label="Fichero CSV"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) leerFichero(f);
            }}
          />
          <Boton onClick={() => entrada.current?.click()} disabled={trabajando}>
            {trabajando ? "Leyendo…" : "Elegir fichero CSV"}
          </Boton>
          {nombre && <span className="text-[13.5px] text-tinta-2">{nombre}</span>}
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-rojo/40 bg-rojo/10 p-3 text-[13.5px] text-rojo" role="alert">
          {error}
        </p>
      )}

      {informe && (
        <div className="mt-6">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ["Altas", informe.altas, "text-verde"],
              ["Cambios", informe.cambios, "text-azul-claro"],
              ["Sin tocar", informe.iguales, "text-apagado"],
              ["Errores", informe.errores, informe.errores ? "text-rojo" : "text-apagado"]
            ].map(([titulo, valor, clase]) => (
              <div key={String(titulo)} className="rounded-xl border border-linea bg-white/[0.025] px-4 py-3">
                <div className="text-[11.5px] uppercase tracking-[0.08em] text-apagado">{titulo}</div>
                <div className={`mt-1 text-[22px] tabular-nums ${clase}`}>{valor}</div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[12.5px] text-apagado">
            Columnas entendidas: {informe.columnasReconocidas.join(", ") || "ninguna"}.
            {informe.columnasIgnoradas.length > 0 && (
              <> Ignoradas: <span className="text-ambar">{informe.columnasIgnoradas.join(", ")}</span>.</>
            )}
          </p>

          {aplicado ? (
            <p className="mt-4 rounded-xl border border-verde/40 bg-verde/10 p-3 text-[13.5px] text-verde">
              Importado. Los equipos ya están en el inventario y en la tienda.
            </p>
          ) : (
            informe.altas + informe.cambios > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Boton onClick={() => void aplicar()} disabled={trabajando}>
                  {trabajando ? "Importando…" : `Aplicar: ${informe.altas} alta(s) y ${informe.cambios} cambio(s)`}
                </Boton>
                <span className="text-[12.5px] text-apagado">Esto sí toca el catálogo.</span>
              </div>
            )
          )}

          <div className="mt-5 overflow-x-auto rounded-marco border border-linea bg-panel">
            <table className="w-full min-w-[720px] text-[13.5px]">
              <thead>
                <tr className="border-b border-linea text-left text-[12px] uppercase tracking-[0.08em] text-apagado">
                  <th className="px-3 py-3">Línea</th>
                  <th className="px-3 py-3">Equipo</th>
                  <th className="px-3 py-3">Qué pasa</th>
                  <th className="px-3 py-3">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {informe.filas.slice(0, 200).map((f) => (
                  <tr key={`${f.linea}-${f.id}`} className="border-b border-linea last:border-0">
                    <td className="px-3 py-2.5 tabular-nums text-apagado">{f.linea}</td>
                    <td className="px-3 py-2.5">{f.nombre || <span className="text-apagado">—</span>}</td>
                    <td className={`px-3 py-2.5 ${COLOR[f.accion]}`}>{ETIQUETA[f.accion]}</td>
                    <td className="px-3 py-2.5 text-[12.5px] text-tinta-2">
                      {f.motivo ? (
                        <span className="text-rojo">{f.motivo}</span>
                      ) : (
                        f.diferencias.slice(0, 4).map((d) => (
                          <div key={d.campo}>
                            <span className="text-apagado">{d.campo}:</span>{" "}
                            {f.accion === "alta" ? (
                              <>{d.despues}</>
                            ) : (
                              <>
                                <span className="text-apagado line-through">{d.antes ?? "no constaba"}</span> →{" "}
                                {d.despues ?? "no consta"}
                              </>
                            )}
                          </div>
                        ))
                      )}
                      {f.diferencias.length > 4 && (
                        <div className="text-apagado">y {f.diferencias.length - 4} campo(s) más</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {informe.filas.length > 200 && (
              <p className="border-t border-linea px-3 py-2 text-[12.5px] text-apagado">
                Se enseñan las primeras 200 de {informe.filas.length}. Se importan todas.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
