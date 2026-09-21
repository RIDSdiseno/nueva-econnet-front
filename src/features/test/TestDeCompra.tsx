/**
 * El test de 60 segundos, sobre el catálogo real.
 *
 * Puntúa lo que se sabe y nada más: si de la combinación no sale nada con
 * puntuación suficiente, lo dice y ofrece hablar con una persona. Recomendar
 * igualmente algo que no calza es lo que hace que devuelvan el equipo.
 *
 * Es el imán que más rinde, y no es intuición: quien acaba de contestar tres
 * preguntas ya invirtió atención, y lo que pide a cambio ya lo tiene delante.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { clp } from "../../services/api.js";
import type { Producto } from "../../services/tipos.js";
import { puntuar, type Puntuado } from "./puntuar.js";
import { Boton } from "../../components/ui/Boton.js";
import { FormularioCorreo } from "../captacion/FormularioCorreo.js";
import { empezarTest, terminarTest } from "../analitica/eventos.js";

const USOS: Array<[string, string]> = [
  ["trabajar", "Trabajar: oficina, gestión, teletrabajo"],
  ["crear", "Crear: fotografía, contenido, edición"],
  ["estudiar", "Estudiar: universidad y apuntes"],
  ["jugar", "Jugar: gaming y streaming"],
  ["empresa", "Equipar varios puestos de trabajo"]
];

const RANGOS: Array<[string, string]> = [
  ["0-600000", "Hasta $600.000"],
  ["600000-1000000", "$600.000 — $1.000.000"],
  ["1000000-1500000", "$1.000.000 — $1.500.000"],
  ["1500000-99000000", "Más de $1.500.000"]
];

const VALORES: Array<[string, string]> = [
  ["portabilidad", "Que pese poco y aguante el día"],
  ["potencia", "Potencia bruta, aunque pese"],
  ["pantalla", "La pantalla y el tamaño"],
  ["soporte", "Windows Pro, seguridad y soporte"],
  ["precio", "Que el precio rinda al máximo"]
];

/** Fuera del componente: dentro, React lo remontaría en cada respuesta. */
function Pregunta({
  id,
  etiqueta,
  opciones,
  valorActual,
  alCambiar
}: {
  id: string;
  etiqueta: string;
  opciones: Array<[string, string]>;
  valorActual: string;
  alCambiar: (v: string) => void;
}) {
  return (
    <div className="mt-5">
      <label className="mb-2 block text-[13px] font-semibold text-tinta-2" htmlFor={id}>
        {etiqueta}
      </label>
      <select
        id={id}
        className="h-12 w-full rounded-xl border border-linea-fuerte bg-white/5 px-4 text-[15px]"
        value={valorActual}
        onChange={(e) => alCambiar(e.target.value)}
      >
        <option value="">Selecciona una opción</option>
        {opciones.map(([v, texto]) => (
          <option key={v} value={v}>
            {texto}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TestDeCompra({ productos }: { productos: Producto[] }) {
  const [uso, setUso] = useState("");
  const [rango, setRango] = useState("");
  const [valor, setValor] = useState("");
  const [resultado, setResultado] = useState<Puntuado[] | null>(null);
  const [falta, setFalta] = useState(false);

  function calcular() {
    if (!uso || !rango || !valor) {
      setFalta(true);
      setResultado(null);
      return;
    }
    setFalta(false);
    const salida = puntuar(productos, uso, rango, valor);
    setResultado(salida);
    terminarTest(salida.map((x) => x.producto.slug));
  }

  return (
    <section className="border-t border-linea py-12" id="test">
      <div className="rounded-marco border border-linea bg-panel p-6 sm:p-9" onFocusCapture={empezarTest}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-azul-claro">Test de compra</p>
        <h2 className="mt-2 max-w-[16ch] text-3xl sm:text-4xl">Encuentra tu equipo en 60 segundos.</h2>
        <p className="mt-2 max-w-[54ch] text-[15px] text-tinta-2">
          Sobre el catálogo real de Econnet. Sin registro y sin dejar el correo.
        </p>

        <div className="grid gap-x-6 sm:grid-cols-2">
          <Pregunta id="q1" etiqueta="1 · ¿Para qué lo necesitas?" opciones={USOS} valorActual={uso} alCambiar={setUso} />
          <Pregunta id="q2" etiqueta="2 · ¿Cuánto quieres invertir?" opciones={RANGOS} valorActual={rango} alCambiar={setRango} />
          <Pregunta id="q3" etiqueta="3 · ¿Qué valoras más?" opciones={VALORES} valorActual={valor} alCambiar={setValor} />
        </div>

        <div className="mt-7">
          <Boton onClick={calcular}>Ver mis equipos</Boton>
        </div>

        {falta && <p className="mt-5 text-[14.5px] text-tinta-2">Responde las tres preguntas y te mostramos los equipos que calzan.</p>}

        {resultado && resultado.length === 0 && (
          <p className="mt-6 rounded-xl border border-ambar/40 bg-ambar/10 p-4 text-[14.5px]">
            Con esa combinación no tenemos nada que recomendarte con honestidad hoy.{" "}
            <Link className="font-semibold text-azul-claro underline" to="/empresas">
              Escríbenos
            </Link>{" "}
            y lo buscamos.
          </p>
        )}

        {resultado && resultado.length > 0 && (
          <div className="mt-7">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-azul-claro">Tu selección</p>
            <ol className="grid gap-2">
              {resultado.map(({ producto, motivos }, indice) => (
                <li
                  key={producto.id}
                  className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border border-linea bg-white/[0.03] p-4"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-azul/20 text-[13px] font-bold text-azul-claro">
                    {indice + 1}
                  </span>
                  <div>
                    <Link className="text-[15px] font-semibold" to={`/tienda/${producto.slug}`}>
                      {producto.marca} {producto.nombre}
                    </Link>
                    <small className="mt-1 block text-[12.5px] text-apagado">Porque {motivos.join(", ")}.</small>
                    <small className="mt-0.5 block text-[12.5px] text-apagado">No es para ti si: {producto.noPara}</small>
                  </div>
                  <span className="text-right text-[14px] font-semibold tabular-nums">
                    {producto.referencia.valor
                      ? producto.referencia.propio
                        ? clp(producto.referencia.valor)
                        : `${clp(producto.referencia.valor)} en ${producto.referencia.canal}`
                      : "Precio por confirmar"}
                  </span>
                </li>
              ))}
            </ol>

            <p className="mt-3 text-[12px] text-apagado">
              Recomendación calculada sobre el catálogo de la tienda. Si quieres que lo revise una persona, escríbenos.
            </p>

            <div className="mt-5">
              <FormularioCorreo
                origen="test"
                titulo="¿Te los mandamos por correo?"
                texto="Para que no dependa de que te acuerdes. Van los tres, con el motivo de cada uno."
                etiquetaBoton="Mandármelos"
                consentimiento="Acepto recibir este correo y las recomendaciones de Econnet."
                recomendados={resultado.map((x) => `${x.producto.marca} ${x.producto.nombre}`.slice(0, 80))}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
