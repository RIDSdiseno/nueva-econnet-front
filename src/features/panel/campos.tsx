/**
 * Los campos del panel.
 *
 * Declarados **a nivel de módulo**, nunca dentro del render de la pantalla que
 * los usa: un componente definido dentro de otro es un tipo nuevo en cada
 * dibujo, React desmonta el input y el cursor se pierde a la primera tecla.
 * Ya pasó dos veces en este proyecto (checkout y test de compra).
 *
 * La regla del catálogo también vive aquí: **vacío es `null`, no cero ni "".**
 * Un precio sin poner no es un precio de cero pesos, y un stock sin contar no
 * es un stock de cero unidades.
 */
import type { ReactNode } from "react";

const ETIQUETA = "mb-1.5 block text-[12.5px] font-medium text-tinta-2";
const CAJA =
  "h-11 w-full rounded-xl border border-linea-fuerte bg-white/5 px-3 text-[14.5px] text-tinta placeholder:text-apagado/70 focus:border-azul-claro focus:outline-none";

export function Campo({
  etiqueta,
  valor,
  cambiar,
  ayuda,
  marcador,
  tipo = "text",
  requerido = false,
  id
}: {
  etiqueta: string;
  valor: string;
  cambiar: (v: string) => void;
  ayuda?: string;
  marcador?: string;
  tipo?: string;
  requerido?: boolean;
  id: string;
}) {
  return (
    <div>
      <label className={ETIQUETA} htmlFor={id}>
        {etiqueta}
        {requerido && <span className="ml-1 text-ambar">·obligatorio</span>}
      </label>
      <input
        id={id}
        type={tipo}
        className={CAJA}
        value={valor}
        placeholder={marcador}
        onChange={(e) => cambiar(e.target.value)}
      />
      {ayuda && <p className="mt-1 text-[12px] text-apagado">{ayuda}</p>}
    </div>
  );
}

/**
 * Un número que puede no constar. Se guarda como texto mientras se escribe
 * —si no, borrar el último dígito lo convertiría en 0— y solo al enviarlo se
 * traduce: en blanco → `null`.
 */
export function CampoNumero({
  etiqueta,
  valor,
  cambiar,
  ayuda,
  id,
  minimo = 0
}: {
  etiqueta: string;
  valor: string;
  cambiar: (v: string) => void;
  ayuda?: string;
  id: string;
  minimo?: number;
}) {
  return (
    <div>
      <label className={ETIQUETA} htmlFor={id}>
        {etiqueta}
      </label>
      <input
        id={id}
        type="number"
        min={minimo}
        inputMode="numeric"
        className={CAJA}
        value={valor}
        placeholder="no consta"
        onChange={(e) => cambiar(e.target.value)}
      />
      <p className="mt-1 text-[12px] text-apagado">{ayuda ?? "En blanco = no consta. No se guarda como cero."}</p>
    </div>
  );
}

export function CampoLargo({
  etiqueta,
  valor,
  cambiar,
  ayuda,
  filas = 3,
  id
}: {
  etiqueta: string;
  valor: string;
  cambiar: (v: string) => void;
  ayuda?: string;
  filas?: number;
  id: string;
}) {
  return (
    <div>
      <label className={ETIQUETA} htmlFor={id}>
        {etiqueta}
      </label>
      <textarea
        id={id}
        rows={filas}
        className={`${CAJA} h-auto py-2.5 leading-relaxed`}
        value={valor}
        placeholder="no consta"
        onChange={(e) => cambiar(e.target.value)}
      />
      {ayuda && <p className="mt-1 text-[12px] text-apagado">{ayuda}</p>}
    </div>
  );
}

export function CampoLista({
  etiqueta,
  valor,
  cambiar,
  opciones,
  ayuda,
  id
}: {
  etiqueta: string;
  valor: string;
  cambiar: (v: string) => void;
  opciones: Array<{ valor: string; texto: string }>;
  ayuda?: string;
  id: string;
}) {
  return (
    <div>
      <label className={ETIQUETA} htmlFor={id}>
        {etiqueta}
      </label>
      <select id={id} className={CAJA} value={valor} onChange={(e) => cambiar(e.target.value)}>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
      {ayuda && <p className="mt-1 text-[12px] text-apagado">{ayuda}</p>}
    </div>
  );
}

/** Marcas que se pueden encender y apagar. Usos y valores del catálogo. */
export function CampoEtiquetas({
  etiqueta,
  elegidas,
  disponibles,
  cambiar,
  ayuda
}: {
  etiqueta: string;
  elegidas: string[];
  disponibles: string[];
  cambiar: (v: string[]) => void;
  ayuda?: string;
}) {
  const alternar = (una: string) =>
    cambiar(elegidas.includes(una) ? elegidas.filter((e) => e !== una) : [...elegidas, una]);

  return (
    <div>
      <span className={ETIQUETA}>{etiqueta}</span>
      <div className="flex flex-wrap gap-2">
        {disponibles.map((una) => {
          const puesta = elegidas.includes(una);
          return (
            <button
              key={una}
              type="button"
              aria-pressed={puesta}
              onClick={() => alternar(una)}
              className={`rounded-full border px-3 py-1.5 text-[13px] transition ${
                puesta
                  ? "border-azul-claro bg-azul/25 text-tinta"
                  : "border-linea-fuerte bg-white/5 text-apagado hover:text-tinta"
              }`}
            >
              {una}
            </button>
          );
        })}
        {!disponibles.length && <span className="text-[13px] text-apagado">Todavía no hay ninguna en el catálogo.</span>}
      </div>
      {ayuda && <p className="mt-1.5 text-[12px] text-apagado">{ayuda}</p>}
    </div>
  );
}

export function Seccion({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <section className="border-t border-linea pt-6">
      <h3 className="text-[15px] font-semibold">{titulo}</h3>
      {nota && <p className="mb-4 mt-1 text-[12.5px] text-apagado">{nota}</p>}
      <div className={`grid gap-4 sm:grid-cols-2 ${nota ? "" : "mt-4"}`}>{children}</div>
    </section>
  );
}

/** Lo que falta se dice en ámbar; no se rellena con algo verosímil. */
export function Hueco({ texto }: { texto: string }) {
  return (
    <span className="rounded-full border border-ambar/40 bg-ambar/10 px-2 py-0.5 text-[11.5px] text-ambar">{texto}</span>
  );
}
